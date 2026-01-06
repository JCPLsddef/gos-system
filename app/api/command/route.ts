import { NextResponse } from 'next/server';
import { parseCommand, getDateRangeInEST, formatDateInEST } from '@/lib/command-parser';
import { createClient } from '@supabase/supabase-js';
import { chatAIResponse } from '@/lib/chatbot-ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'auto';

export async function GET() {
  return NextResponse.json(
    { ok: true, message: 'API command route reachable' },
    {
      headers: {
        'Allow': 'GET, POST'
      }
    }
  );
}

export async function POST(request: Request) {
  try {
    // Extract auth token from request
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    // Create Supabase client with user's token (uses RLS policies)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    // Verify authentication and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 });
    }

    const userId = user.id;

    // Parse body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { message, conversationId } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

    // Load conversation history for AI context
    let previousMessages: Array<{ role: string; content: string }> = [];
    if (conversationId) {
      const { data: messagesData } = await supabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (messagesData) {
        previousMessages = messagesData.reverse();
      }
    }

    // Use AI to understand the command
    const aiResponse = await chatAIResponse(message, previousMessages);

    // Execute command based on AI function call or fallback to parser
    let response: string = '';
    let data: any = null;

    if (aiResponse.functionCall) {
      const { name, arguments: args } = aiResponse.functionCall;

      try {
        switch (name) {
          case 'create_mission':
            const missionResult = await createMission(supabase, userId, { title: args.title });
            response = `✓ Mission created: "${missionResult.title}"`;
            data = missionResult;
            break;

          case 'create_battlefront':
            const battlefrontResult = await createBattlefront(supabase, userId, { name: args.name });
            response = `✓ Battlefront created: "${battlefrontResult.name}"`;
            data = battlefrontResult;
            break;

          case 'list_missions':
            const missions = await listMissions(supabase, userId);
            if (missions.length === 0) {
              response = 'No missions yet. Create one to get started!';
            } else {
              response = `**Your Missions (${missions.length}):**\n\n` +
                missions.map((m: any) => `• ${m.title} [${m.status}]${m.due_date ? ` - Due: ${formatDateInEST(new Date(m.due_date))}` : ''}`).join('\n');
            }
            data = missions;
            break;

          case 'list_battlefronts':
            const battlefronts = await listBattlefronts(supabase, userId);
            if (battlefronts.length === 0) {
              response = 'No battlefronts yet. Create one to organize your missions!';
            } else {
              response = `**Your Battlefronts (${battlefronts.length}):**\n\n` +
                battlefronts.map((b: any) => `• ${b.name} [${b.status}]`).join('\n');
            }
            data = battlefronts;
            break;

          case 'list_calendar':
            const events = await listCalendarEvents(supabase, userId, args.range || 'today');
            if (events.length === 0) {
              response = args.range === 'today' ? 'No events scheduled today.' : 'No events scheduled this week.';
            } else {
              response = `**${args.range === 'today' ? 'Today' : 'This Week'} (${events.length} events):**\n\n` +
                events.map((e: any) => `• ${e.title} - ${formatDateInEST(new Date(e.start_time))}`).join('\n');
            }
            data = events;
            break;

          default:
            response = aiResponse.message || "I understood your request but couldn't execute it.";
        }
      } catch (error: any) {
        response = `Error executing command: ${error.message}`;
      }
    } else {
      // No function call, just return AI response
      response = aiResponse.message;
    }

    // Save conversation if ID provided
    if (conversationId && response) {
      await saveMessage(supabase, conversationId, userId, 'user', message);
      await saveMessage(supabase, conversationId, userId, 'assistant', response);
    }

    return NextResponse.json({
      success: true,
      message: response,
      data
    });

  } catch (error: any) {
    console.error('Command error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to execute command' },
      { status: 500 }
    );
  }
}

// Database operations
async function createMission(supabase: any, userId: string, params: any) {
  const { data, error } = await supabase
    .from('missions')
    .insert({
      user_id: userId,
      title: params.title,
      status: 'NOT_DONE'
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function createBattlefront(supabase: any, userId: string, params: any) {
  const { data, error } = await supabase
    .from('battlefronts')
    .insert({
      user_id: userId,
      name: params.name,
      status: 'ACTIVE'
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function listMissions(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('missions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

async function listBattlefronts(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('battlefronts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

async function listCalendarEvents(supabase: any, userId: string, range: 'today' | 'week') {
  const { start, end } = getDateRangeInEST(range);

  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', userId)
    .gte('start_time', start.toISOString())
    .lte('start_time', end.toISOString())
    .order('start_time', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

async function saveMessage(supabase: any, conversationId: string, userId: string, role: string, content: string) {
  await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      user_id: userId,
      role,
      content
    });
}
