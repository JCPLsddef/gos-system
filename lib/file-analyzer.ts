import 'server-only';

export type ActionSuggestion = {
  type: 'CREATE_MISSION' | 'CREATE_BATTLEFRONT' | 'SCHEDULE_EVENT' | 'SET_DEADLINE';
  title: string;
  description?: string;
  dueDate?: string;
  startTime?: string;
  duration?: number;
  priority?: number;
};

export type AnalysisResult = {
  summary: string;
  itemCount: number;
  suggestions: ActionSuggestion[];
  rawItems: string[];
  requiresConfirmation: boolean;
};

export async function analyzeExtractedContent(
  extractedText: string,
  fileName: string,
  fileType: string,
  existingContext?: string
): Promise<AnalysisResult> {
  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return createFallbackAnalysis(extractedText);
  }

  const prompt = buildAnalysisPrompt(extractedText, fileName, fileType, existingContext);

  try {
    const response = await callLLMForAnalysis(prompt, apiKey);
    return parseAnalysisResponse(response, extractedText);
  } catch (error: any) {
    console.error('LLM analysis failed:', error);
    return createFallbackAnalysis(extractedText);
  }
}

function buildAnalysisPrompt(
  extractedText: string,
  fileName: string,
  fileType: string,
  existingContext?: string
): string {
  return `You are analyzing content extracted from a user's uploaded file to help them organize their goals and tasks in a Goal Operating System (GOS).

FILE INFO:
- Name: ${fileName}
- Type: ${fileType}

EXTRACTED CONTENT:
${extractedText}

${existingContext ? `USER'S CURRENT CONTEXT:\n${existingContext}\n` : ''}

ANALYZE THIS CONTENT AND IDENTIFY:
1. Tasks or to-do items that should become MISSIONS
2. Projects or goals that should become BATTLEFRONTS (larger initiatives containing multiple tasks)
3. Events, meetings, or appointments that should be SCHEDULED
4. Any deadlines or time-sensitive items

RESPOND IN THIS EXACT JSON FORMAT:
{
  "summary": "Brief description of what you found (1-2 sentences)",
  "itemCount": <number of actionable items found>,
  "suggestions": [
    {
      "type": "CREATE_MISSION" | "CREATE_BATTLEFRONT" | "SCHEDULE_EVENT" | "SET_DEADLINE",
      "title": "Clear, actionable title",
      "description": "Optional additional context",
      "dueDate": "YYYY-MM-DD if applicable",
      "startTime": "YYYY-MM-DDTHH:mm:ss if scheduling an event",
      "duration": <minutes if applicable>,
      "priority": <1-5 where 1 is highest priority>
    }
  ],
  "rawItems": ["Original text of each identified item"]
}

RULES:
- Use CREATE_MISSION for individual tasks
- Use CREATE_BATTLEFRONT only for larger goals/projects that would contain multiple missions
- Use SCHEDULE_EVENT for meetings/appointments with specific times
- Use SET_DEADLINE for time-sensitive items without specific meeting times
- Keep titles concise but descriptive
- Infer reasonable durations (default 60 minutes for tasks)
- If a date like "tomorrow" or "Friday" is mentioned, interpret relative to today's context
- Be thorough - capture every actionable item you can identify`;
}

async function callLLMForAnalysis(prompt: string, apiKey: string): Promise<string> {
  const isGroq = process.env.GROQ_API_KEY === apiKey;
  const endpoint = isGroq
    ? 'https://api.groq.com/openai/v1/chat/completions'
    : 'https://api.openai.com/v1/chat/completions';
  const model = isGroq ? 'llama-3.1-70b-versatile' : 'gpt-4o';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that analyzes documents and extracts actionable items. Always respond with valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 2000,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

function parseAnalysisResponse(response: string, extractedText: string): AnalysisResult {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      summary: parsed.summary || 'Content analyzed',
      itemCount: parsed.itemCount || parsed.suggestions?.length || 0,
      suggestions: (parsed.suggestions || []).map((s: any) => ({
        type: s.type || 'CREATE_MISSION',
        title: s.title || 'Untitled Task',
        description: s.description,
        dueDate: s.dueDate,
        startTime: s.startTime,
        duration: s.duration || 60,
        priority: s.priority || 3,
      })),
      rawItems: parsed.rawItems || [],
      requiresConfirmation: true,
    };
  } catch (error) {
    return createFallbackAnalysis(extractedText);
  }
}

function createFallbackAnalysis(extractedText: string): AnalysisResult {
  const lines = extractedText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 3 && !line.startsWith('#'));

  const suggestions: ActionSuggestion[] = lines.slice(0, 10).map((line) => ({
    type: 'CREATE_MISSION' as const,
    title: line.replace(/^[-*•\d.)\]]\s*/, '').substring(0, 100),
    duration: 60,
    priority: 3,
  }));

  return {
    summary: `Found ${lines.length} potential items in the uploaded content.`,
    itemCount: lines.length,
    suggestions,
    rawItems: lines,
    requiresConfirmation: true,
  };
}

export function formatAnalysisForChat(analysis: AnalysisResult): string {
  if (analysis.itemCount === 0) {
    return "I analyzed the file but couldn't identify any specific tasks, goals, or events. Could you tell me what you'd like to do with this content?";
  }

  let response = `I found **${analysis.itemCount} actionable item${analysis.itemCount > 1 ? 's' : ''}** in your uploaded file.\n\n`;
  response += `${analysis.summary}\n\n`;

  const missions = analysis.suggestions.filter((s) => s.type === 'CREATE_MISSION');
  const battlefronts = analysis.suggestions.filter((s) => s.type === 'CREATE_BATTLEFRONT');
  const events = analysis.suggestions.filter((s) => s.type === 'SCHEDULE_EVENT');
  const deadlines = analysis.suggestions.filter((s) => s.type === 'SET_DEADLINE');

  if (missions.length > 0) {
    response += `**Tasks to create as missions (${missions.length}):**\n`;
    missions.slice(0, 6).forEach((m, i) => {
      response += `${i + 1}. ${m.title}${m.dueDate ? ` (due: ${m.dueDate})` : ''}\n`;
    });
    if (missions.length > 6) {
      response += `   ...and ${missions.length - 6} more\n`;
    }
    response += '\n';
  }

  if (battlefronts.length > 0) {
    response += `**Projects to create as battlefronts (${battlefronts.length}):**\n`;
    battlefronts.forEach((b, i) => {
      response += `${i + 1}. ${b.title}\n`;
    });
    response += '\n';
  }

  if (events.length > 0) {
    response += `**Events to schedule (${events.length}):**\n`;
    events.forEach((e, i) => {
      response += `${i + 1}. ${e.title}${e.startTime ? ` at ${new Date(e.startTime).toLocaleString()}` : ''}\n`;
    });
    response += '\n';
  }

  if (deadlines.length > 0) {
    response += `**Deadlines to track (${deadlines.length}):**\n`;
    deadlines.forEach((d, i) => {
      response += `${i + 1}. ${d.title}${d.dueDate ? ` (${d.dueDate})` : ''}\n`;
    });
    response += '\n';
  }

  response += `Would you like me to **create these in your GOS system**? You can say:\n`;
  response += `• "Yes, create all" to add everything\n`;
  response += `• "Only create the missions" for just the tasks\n`;
  response += `• "Skip [item name]" to exclude specific items\n`;
  response += `• "Add [custom task]" to include something I missed`;

  return response;
}
