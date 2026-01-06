/**
 * AI-powered chatbot using OpenAI GPT-4o-mini
 * Understands natural language and executes GOS commands
 */

const SYSTEM_PROMPT = `You are GOS Commander, an AI assistant for the Global Operations System (GOS) - a strategic life management platform.

You help users manage their missions, battlefronts, and calendar events through natural conversation.

**Available Actions:**
- create_mission: Create a new mission/task
- create_battlefront: Create a new battlefront (category/project)
- list_missions: Show all missions
- list_battlefronts: Show all battlefronts
- list_calendar: Show calendar events (today or this week)
- schedule_event: Schedule a calendar event
- delete_mission: Delete a mission by ID
- delete_battlefront: Delete a battlefront by ID
- delete_event: Delete a calendar event by ID

**Guidelines:**
- Be concise and action-oriented
- When users ask to create something, use the appropriate function
- Format responses with markdown when listing items
- Be encouraging and supportive
- If unsure about parameters, ask clarifying questions
- Use emojis sparingly for emphasis

**Examples:**
User: "Create a mission called Buy groceries"
→ Use create_mission with title "Buy groceries"

User: "What are my tasks?"
→ Use list_missions

User: "Schedule gym tomorrow at 2pm for 1 hour"
→ Use schedule_event with appropriate parameters`;

export async function chatAIResponse(
  userMessage: string,
  previousMessages: Array<{ role: string; content: string }> = []
): Promise<{
  message: string;
  functionCall?: {
    name: string;
    arguments: any;
  };
}> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      message: "AI is not configured. Please add OPENAI_API_KEY to environment variables.",
    };
  }

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...previousMessages.slice(-10), // Last 10 messages for context
    { role: "user", content: userMessage },
  ];

  const tools = [
    {
      type: "function",
      function: {
        name: "create_mission",
        description: "Create a new mission or task",
        parameters: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "The mission title",
            },
          },
          required: ["title"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "create_battlefront",
        description: "Create a new battlefront (project/category)",
        parameters: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "The battlefront name",
            },
          },
          required: ["name"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "list_missions",
        description: "List all user missions",
        parameters: {
          type: "object",
          properties: {},
        },
      },
    },
    {
      type: "function",
      function: {
        name: "list_battlefronts",
        description: "List all user battlefronts",
        parameters: {
          type: "object",
          properties: {},
        },
      },
    },
    {
      type: "function",
      function: {
        name: "list_calendar",
        description: "List calendar events",
        parameters: {
          type: "object",
          properties: {
            range: {
              type: "string",
              enum: ["today", "week"],
              description: "Time range for events",
            },
          },
          required: ["range"],
        },
      },
    },
  ];

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        tools,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    if (!choice) {
      throw new Error("No response from OpenAI");
    }

    // Check for function call
    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      const toolCall = choice.message.tool_calls[0];
      return {
        message: choice.message.content || "Executing action...",
        functionCall: {
          name: toolCall.function.name,
          arguments: JSON.parse(toolCall.function.arguments),
        },
      };
    }

    return {
      message: choice.message.content || "I'm not sure how to respond to that.",
    };
  } catch (error: any) {
    console.error("OpenAI API error:", error);
    return {
      message: `I encountered an error: ${error.message}. Please try again.`,
    };
  }
}
