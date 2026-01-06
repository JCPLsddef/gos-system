/**
 * AI-powered chatbot using Google Gemini
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
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      message: "AI is not configured. Please add GEMINI_API_KEY to environment variables.",
    };
  }

  // Build conversation history for Gemini
  let conversationHistory = SYSTEM_PROMPT + "\n\n";
  previousMessages.slice(-10).forEach((msg) => {
    conversationHistory += `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}\n`;
  });
  conversationHistory += `User: ${userMessage}\n\nRespond as GOS Commander. If the user wants to create a mission, start your response with [CREATE_MISSION:title]. If creating a battlefront, use [CREATE_BATTLEFRONT:name]. If listing missions, use [LIST_MISSIONS]. If listing battlefronts, use [LIST_BATTLEFRONTS]. If listing calendar, use [LIST_CALENDAR:range]. Otherwise, just respond naturally.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: conversationHistory,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("No response from Gemini");
    }

    // Parse for function calls
    const createMissionMatch = text.match(/\[CREATE_MISSION:(.+?)\]/);
    const createBattlefrontMatch = text.match(/\[CREATE_BATTLEFRONT:(.+?)\]/);
    const listMissionsMatch = text.match(/\[LIST_MISSIONS\]/);
    const listBattlefrontsMatch = text.match(/\[LIST_BATTLEFRONTS\]/);
    const listCalendarMatch = text.match(/\[LIST_CALENDAR:(.+?)\]/);

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
    console.error("Gemini API error:", error);
    return {
      message: `I encountered an error: ${error.message}. Please try again.`,
    };
  }
}
