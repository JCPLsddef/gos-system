import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-api';
import { authenticateRequest } from '@/lib/api-auth';
import { ChatOrchestrator } from '@/lib/chat-orchestrator';
import {
  processFile,
  isValidFileType,
  isValidFileSize,
  getFileCategory,
} from '@/lib/file-processor';
import {
  analyzeExtractedContent,
  formatAnalysisForChat,
  AnalysisResult,
} from '@/lib/file-analyzer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const { userId, error: authError } = await authenticateRequest(request);

    if (!userId || authError) {
      return NextResponse.json(
        { error: authError || 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createServiceClient();
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      return handleFileUpload(request, supabase, userId);
    }

    return handleTextMessage(request, supabase, userId);
  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
}

async function handleTextMessage(
  request: NextRequest,
  supabase: any,
  userId: string
) {
  const body = await request.json();
  const { messages, conversationId, pendingAnalysis } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'Messages required' }, { status: 400 });
  }

  const lastMessage = messages[messages.length - 1];
  const userMessage = lastMessage.content;

  if (pendingAnalysis) {
    return handleAnalysisConfirmation(
      supabase,
      userId,
      userMessage,
      pendingAnalysis
    );
  }

  const orchestrator = new ChatOrchestrator(supabase, userId);
  const context = await orchestrator.getContextForLLM();
  const result = await orchestrator.processMessage(userMessage);

  if (result.actionExecuted || result.message !== orchestrator['getDefaultResponse']()) {
    return NextResponse.json({
      message: result.message,
      actionExecuted: result.actionExecuted,
    });
  }

  const aiResponse = await generateAIResponse(messages, context, userId);

  return NextResponse.json({
    message: aiResponse,
    actionExecuted: false,
  });
}

async function handleFileUpload(
  request: NextRequest,
  supabase: any,
  userId: string
) {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const conversationId = formData.get('conversationId') as string | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (!isValidFileSize(file.size)) {
    return NextResponse.json(
      { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
      { status: 400 }
    );
  }

  if (!isValidFileType(file.type)) {
    return NextResponse.json(
      {
        error: `Unsupported file type: ${file.type}. Supported: PNG, JPG, JPEG, PDF, TXT`,
      },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = file.name;
  const fileType = file.type;
  const fileSize = file.size;

  const timestamp = Date.now();
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `${userId}/${timestamp}-${sanitizedName}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('chat-uploads')
    .upload(storagePath, buffer, {
      contentType: fileType,
      upsert: false,
    });

  let fileUrl = '';
  if (uploadError) {
    console.warn('Storage upload failed (bucket may not exist):', uploadError);
    fileUrl = `local://${storagePath}`;
  } else {
    const { data: urlData } = supabase.storage
      .from('chat-uploads')
      .getPublicUrl(storagePath);
    fileUrl = urlData?.publicUrl || `storage://${storagePath}`;
  }

  const processingResult = await processFile(buffer, fileType, fileName);

  if (!processingResult.success) {
    return NextResponse.json(
      {
        message: `I received your file "${fileName}" but encountered an issue processing it: ${processingResult.error}. Could you try uploading a different file or tell me what it contains?`,
        fileUploaded: true,
        fileName,
        fileType,
        processingError: processingResult.error,
      },
      { status: 200 }
    );
  }

  const orchestrator = new ChatOrchestrator(supabase, userId);
  const context = await orchestrator.getContextForLLM();

  const analysis = await analyzeExtractedContent(
    processingResult.extractedText!,
    fileName,
    processingResult.fileType,
    context
  );

  const { error: dbError } = await supabase.from('chat_files').insert({
    user_id: userId,
    conversation_id: conversationId,
    file_name: fileName,
    file_type: fileType,
    file_url: fileUrl,
    extracted_text: processingResult.extractedText,
    file_size: fileSize,
    analysis_result: analysis,
  });

  if (dbError) {
    console.error('Failed to save file metadata:', dbError);
  }

  const chatResponse = formatAnalysisForChat(analysis);

  return NextResponse.json({
    message: chatResponse,
    fileUploaded: true,
    fileName,
    fileType,
    fileUrl,
    extractedText: processingResult.extractedText,
    analysis,
    pendingAnalysis: analysis.suggestions.length > 0 ? analysis : null,
  });
}

async function handleAnalysisConfirmation(
  supabase: any,
  userId: string,
  userMessage: string,
  analysis: AnalysisResult
) {
  const lowerMessage = userMessage.toLowerCase();

  if (
    lowerMessage.includes('yes') ||
    lowerMessage.includes('create all') ||
    lowerMessage.includes('add all') ||
    lowerMessage.includes('go ahead')
  ) {
    return executeAllSuggestions(supabase, userId, analysis);
  }

  if (lowerMessage.includes('only') && lowerMessage.includes('mission')) {
    const missions = analysis.suggestions.filter((s) => s.type === 'CREATE_MISSION');
    return executeSuggestions(supabase, userId, missions, 'missions');
  }

  if (lowerMessage.includes('only') && lowerMessage.includes('battlefront')) {
    const battlefronts = analysis.suggestions.filter(
      (s) => s.type === 'CREATE_BATTLEFRONT'
    );
    return executeSuggestions(supabase, userId, battlefronts, 'battlefronts');
  }

  if (
    lowerMessage.includes('no') ||
    lowerMessage.includes('cancel') ||
    lowerMessage.includes('skip all')
  ) {
    return NextResponse.json({
      message:
        "No problem! I won't create anything. Let me know if you'd like to do something else with the file content.",
      pendingAnalysis: null,
    });
  }

  return NextResponse.json({
    message: `I'm not sure what you'd like me to do. You can say:\n• "Yes, create all" to add everything\n• "Only create the missions" for just the tasks\n• "No" or "Cancel" to skip\n\nWhat would you prefer?`,
    pendingAnalysis: analysis,
  });
}

async function executeAllSuggestions(
  supabase: any,
  userId: string,
  analysis: AnalysisResult
) {
  const results = {
    missions: 0,
    battlefronts: 0,
    events: 0,
    errors: [] as string[],
  };

  const battlefronts = analysis.suggestions.filter(
    (s) => s.type === 'CREATE_BATTLEFRONT'
  );
  const battlefrontIds: Record<string, string> = {};

  for (const bf of battlefronts) {
    const { data, error } = await supabase
      .from('battlefronts')
      .insert({
        user_id: userId,
        name: bf.title,
        binary_exit_target: bf.description || '',
        status: 'ACTIVE',
      })
      .select()
      .single();

    if (error) {
      results.errors.push(`Failed to create battlefront "${bf.title}"`);
    } else {
      results.battlefronts++;
      battlefrontIds[bf.title] = data.id;
    }
  }

  let defaultBattlefrontId: string | null = null;
  if (Object.keys(battlefrontIds).length > 0) {
    defaultBattlefrontId = Object.values(battlefrontIds)[0];
  } else {
    const { data: existingBf } = await supabase
      .from('battlefronts')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'ACTIVE')
      .limit(1)
      .maybeSingle();

    if (existingBf) {
      defaultBattlefrontId = existingBf.id;
    }
  }

  const missions = analysis.suggestions.filter((s) => s.type === 'CREATE_MISSION');

  for (const mission of missions) {
    const missionData: any = {
      user_id: userId,
      title: mission.title,
      status: 'NOT_DONE',
      duration_minutes: mission.duration || 60,
    };

    if (defaultBattlefrontId) {
      missionData.battlefront_id = defaultBattlefrontId;
    }

    if (mission.dueDate) {
      missionData.due_date = mission.dueDate;
    }

    const { error } = await supabase.from('missions').insert(missionData);

    if (error) {
      results.errors.push(`Failed to create mission "${mission.title}"`);
    } else {
      results.missions++;
    }
  }

  const events = analysis.suggestions.filter(
    (s) => s.type === 'SCHEDULE_EVENT' || s.type === 'SET_DEADLINE'
  );

  for (const event of events) {
    if (event.startTime) {
      const startTime = new Date(event.startTime);
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + (event.duration || 60));

      const { error } = await supabase.from('calendar_events').insert({
        user_id: userId,
        title: event.title,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        battlefront_id: defaultBattlefrontId,
      });

      if (error) {
        results.errors.push(`Failed to schedule "${event.title}"`);
      } else {
        results.events++;
      }
    }
  }

  let message = `Done! I've created:\n`;
  if (results.battlefronts > 0) {
    message += `• ${results.battlefronts} battlefront${results.battlefronts > 1 ? 's' : ''}\n`;
  }
  if (results.missions > 0) {
    message += `• ${results.missions} mission${results.missions > 1 ? 's' : ''}\n`;
  }
  if (results.events > 0) {
    message += `• ${results.events} calendar event${results.events > 1 ? 's' : ''}\n`;
  }

  if (results.errors.length > 0) {
    message += `\nSome items couldn't be created:\n${results.errors.join('\n')}`;
  }

  message += `\nCheck your War Map and Missions pages to see everything!`;

  return NextResponse.json({
    message,
    pendingAnalysis: null,
    actionsExecuted: results,
  });
}

async function executeSuggestions(
  supabase: any,
  userId: string,
  suggestions: any[],
  type: string
) {
  let created = 0;

  for (const item of suggestions) {
    let error;

    if (type === 'missions') {
      const { data: existingBf } = await supabase
        .from('battlefronts')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'ACTIVE')
        .limit(1)
        .maybeSingle();

      const missionData: any = {
        user_id: userId,
        title: item.title,
        status: 'NOT_DONE',
        duration_minutes: item.duration || 60,
      };

      if (existingBf) {
        missionData.battlefront_id = existingBf.id;
      }

      if (item.dueDate) {
        missionData.due_date = item.dueDate;
      }

      ({ error } = await supabase.from('missions').insert(missionData));
    } else if (type === 'battlefronts') {
      ({ error } = await supabase.from('battlefronts').insert({
        user_id: userId,
        name: item.title,
        binary_exit_target: item.description || '',
        status: 'ACTIVE',
      }));
    }

    if (!error) {
      created++;
    }
  }

  return NextResponse.json({
    message: `Created ${created} ${type}! Check your ${type === 'missions' ? 'Missions' : 'War Map'} page.`,
    pendingAnalysis: null,
  });
}

async function generateAIResponse(
  messages: any[],
  context: string,
  userId: string
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return "I'm here to help you organize your goals and tasks. Try commands like 'create battlefront', 'list missions', or 'system status'.";
  }

  const isGroq = process.env.GROQ_API_KEY === apiKey;
  const endpoint = isGroq
    ? 'https://api.groq.com/openai/v1/chat/completions'
    : 'https://api.openai.com/v1/chat/completions';
  const model = isGroq ? 'llama-3.1-70b-versatile' : 'gpt-4o';

  const systemPrompt = `You are the GOS Commander - a strategic AI assistant helping users organize their goals, tasks, and time in a Goal Operating System.

CURRENT USER CONTEXT:
${context || 'No existing data yet.'}

YOUR CAPABILITIES:
- Help users think strategically about their goals
- Break down large objectives into actionable missions
- Organize work into "battlefronts" (major goal areas)
- Suggest time allocations and priorities
- Provide motivation and accountability

RESPONSE STYLE:
- Be concise and direct
- Use military-inspired but accessible language
- Focus on actionable advice
- Ask clarifying questions when needed
- Suggest specific GOS commands when appropriate

Available commands you can suggest:
- "create battlefront" - for new major goal areas
- "create mission" - for individual tasks
- "list battlefronts" / "list missions" - to see current items
- "system status" - for an overview

When users upload files, help them identify tasks and goals from the content.`;

  const apiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m: any) => ({ role: m.role, content: m.content })),
  ];

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: apiMessages,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'How can I help you today?';
  } catch (error) {
    console.error('AI response generation failed:', error);
    return "I'm here to help! Try 'system status' to see your current state, or tell me what you're working on.";
  }
}
