/**
 * AI-powered chatbot using Groq (Llama 3)
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
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return {
      message: "AI is not configured. Please add GROQ_API_KEY to environment variables.",
    };
  }

  // Build messages array for Groq (OpenAI-compatible format)
  const messages = [
    {
      role: "system",
      content: SYSTEM_PROMPT + `\n\nCRITICAL INSTRUCTIONS - You MUST follow this format exactly:

When users ask you to perform actions, you MUST start your response with ONE of these markers:

1. Create a mission: [CREATE_MISSION:exact title here]
   Example: User says "create mission buy groceries"
   You respond: "[CREATE_MISSION:buy groceries] I'll create that mission for you!"

2. Create battlefront: [CREATE_BATTLEFRONT:exact name]
   Example: [CREATE_BATTLEFRONT:Work Projects] Creating that battlefront!

3. List missions: [LIST_MISSIONS]
4. List battlefronts: [LIST_BATTLEFRONTS]
5. List calendar: [LIST_CALENDAR:today] or [LIST_CALENDAR:week]
6. Update mission date: [UPDATE_MISSION_DATE:mission_id:new_date]
   Example: [UPDATE_MISSION_DATE:123:2026-01-10] Updating the mission date!

The text inside the brackets is CRITICAL - it will be used as the actual title/name.
Always extract the exact title/name from user's message.
Otherwise, respond naturally without markers.`
    },
    ...previousMessages.slice(-10).map((msg) => ({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content,
    })),
    { role: "user", content: userMessage },
  ];

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;

    if (!text) {
      throw new Error("No response from Groq");
    }

    // Parse for function calls
    const createMissionMatch = text.match(/\[CREATE_MISSION:(.+?)\]/);
    const createBattlefrontMatch = text.match(/\[CREATE_BATTLEFRONT:(.+?)\]/);
    const listMissionsMatch = text.match(/\[LIST_MISSIONS\]/);
    const listBattlefrontsMatch = text.match(/\[LIST_BATTLEFRONTS\]/);
    const listCalendarMatch = text.match(/\[LIST_CALENDAR:(.+?)\]/);
    const updateMissionDateMatch = text.match(/\[UPDATE_MISSION_DATE:(.+?):(.+?)\]/);

    if (createMissionMatch) {
      return {
        message: text.replace(/\[CREATE_MISSION:.+?\]/, "").trim(),
        functionCall: {
          name: "create_mission",
          arguments: { title: createMissionMatch[1].trim() },
        },
      };
    }

    if (createBattlefrontMatch) {
      return {
        message: text.replace(/\[CREATE_BATTLEFRONT:.+?\]/, "").trim(),
        functionCall: {
          name: "create_battlefront",
          arguments: { name: createBattlefrontMatch[1].trim() },
        },
      };
    }

    if (updateMissionDateMatch) {
      return {
        message: text.replace(/\[UPDATE_MISSION_DATE:.+?\]/, "").trim(),
        functionCall: {
          name: "update_mission_date",
          arguments: {
            missionId: updateMissionDateMatch[1].trim(),
            newDate: updateMissionDateMatch[2].trim()
          },
        },
      };
    }

    if (listMissionsMatch) {
      return {
        message: text.replace(/\[LIST_MISSIONS\]/, "").trim(),
        functionCall: {
          name: "list_missions",
          arguments: {},
        },
      };
    }

    if (listBattlefrontsMatch) {
      return {
        message: text.replace(/\[LIST_BATTLEFRONTS\]/, "").trim(),
        functionCall: {
          name: "list_battlefronts",
          arguments: {},
        },
      };
    }

    if (listCalendarMatch) {
      return {
        message: text.replace(/\[LIST_CALENDAR:.+?\]/, "").trim(),
        functionCall: {
          name: "list_calendar",
          arguments: { range: listCalendarMatch[1].trim() },
        },
      };
    }

    return {
      message: text || "I'm not sure how to respond to that.",
    };
  } catch (error: any) {
    console.error("Groq API error:", error);
    return {
      message: `I encountered an error: ${error.message}. Please try again.`,
    };
  }
}
