import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { ChatOrchestrator } from '@/lib/chat-orchestrator';
import { createServiceClient } from '@/lib/supabase-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const supabase = createServiceClient();

  try {
    const { userId, error: authError } = await authenticateRequest(request);

    if (!userId || authError) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages array required' }, { status: 400 });
    }

    // Get user's latest message
    const userMessage = messages[messages.length - 1];
    if (!userMessage || userMessage.role !== 'user') {
      return NextResponse.json({ error: 'Last message must be from user' }, { status: 400 });
    }

    // Initialize orchestrator
    const orchestrator = new ChatOrchestrator(supabase, userId);

    // Get user context for the AI
    const userContext = await orchestrator.getContextForLLM();

    // Call Groq AI
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return NextResponse.json({ error: 'Groq API key not configured' }, { status: 500 });
    }

    const systemPrompt = `You are the GOS Commander - an elite AI assistant for the Goal Operating System.

CRITICAL: You can EXECUTE ACTIONS directly in the system. When the user asks you to create, update, or manage something, you should DO IT, not just explain how.

Your capabilities:
1. CREATE BATTLEFRONTS - When user wants a new goal/project
2. CREATE MISSIONS - When user wants tasks (with dates, durations, etc)
3. UPDATE MISSIONS - Mark as done, change dates, etc
4. LIST & ANALYZE - Show their data with insights
5. SCHEDULE - Add events to calendar
6. PROVIDE GUIDANCE - Strategic advice based on their data

Current user data:
${userContext}

RESPONSE FORMAT:
When user asks you to CREATE something, respond in this EXACT JSON format:
{
  "action": "create_battlefront" | "create_mission" | "create_event",
  "data": {
    // Required fields for the action
  },
  "message": "Friendly confirmation message"
}

When user asks to LIST/SHOW something, respond normally with their data.

EXAMPLES:

User: "Create a battlefront called Learning Spanish"
You respond:
{
  "action": "create_battlefront",
  "data": {
    "name": "Learning Spanish",
    "description": "Master Spanish language",
    "binary_exit_target": "Hold 30min conversation in Spanish"
  },
  "message": "Created 'Learning Spanish' battlefront! What missions should we add?"
}

User: "Add a mission to study Spanish vocab for 30 minutes tomorrow at 2pm"
You respond:
{
  "action": "create_mission",
  "data": {
    "title": "Study Spanish vocab",
    "duration_minutes": 30,
    "due_date": "2026-01-08T14:00:00Z",
    "battlefront_name": "Learning Spanish"
  },
  "message": "Added mission 'Study Spanish vocab' (30min) for tomorrow at 2pm!"
}

User: "What's my status?"
You respond normally (no JSON):
"You have 3 active battlefronts: Learning Spanish (5 missions), Business Growth (3 missions), Health (2 missions). Your completion rate is 67%. You have 2 overdue missions that need attention."

IMPORTANT RULES:
1. When user says "create", "add", "make" → EXECUTE with JSON action format
2. When user says "show", "what", "list" → Respond with data analysis
3. ALWAYS be ready to create missions with proper dates and durations
4. Extract battlefront context from their message or recent data
5. Be proactive - if they mention a new goal area, suggest creating a battlefront`;

    const groqMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-10).map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: groqMessages,
        temperature: 0.7,
        max_tokens: 2048,
        top_p: 1,
        stream: false,
      }),
    });

    if (!groqResponse.ok) {
      const errorData = await groqResponse.json().catch(() => ({}));
      console.error('Groq API error:', errorData);
      return NextResponse.json(
        { error: 'AI service temporarily unavailable' },
        { status: 500 }
      );
    }

    const groqData = await groqResponse.json();
    const aiMessage = groqData.choices[0]?.message?.content;

    if (!aiMessage) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    // Try to parse as JSON action
    let actionResponse;
    try {
      actionResponse = JSON.parse(aiMessage);
      if (actionResponse.action) {
        // Execute the action!
        const result = await orchestrator.processMessage(userMessage.content);

        return NextResponse.json({
          success: true,
          message: actionResponse.message || result.message,
          actionExecuted: true,
        });
      }
    } catch (e) {
      // Not JSON, just a regular text response
    }

    // Regular conversational response
    return NextResponse.json({
      success: true,
      message: aiMessage,
    });

  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
