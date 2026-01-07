import { NextResponse } from 'next/server';
import { parseCommand, getDateRangeInEST, formatDateInEST } from '@/lib/command-parser';
import { authenticateRequest } from '@/lib/api-auth';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  const supabase = getSupabaseClient();
  try {
    const { userId, error: authError } = await authenticateRequest(request);

    if (!userId || authError) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { message, conversationId } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

    const command = parseCommand(message);

    let response: string = 'Command processed';
    let data: any = null;

    switch (command.action) {
      case 'create':
        if (command.entity === 'mission') {
          const result = await createMission(supabase, userId, command.params);
          response = `✓ Mission created: "${result.title}"`;
          data = result;
        } else if (command.entity === 'battlefront') {
          const result = await createBattlefront(supabase, userId, command.params);
          response = `✓ Battlefront created: "${result.name}"`;
          data = result;
        } else {
          response = 'Unknown entity to create.';
        }
        break;

      case 'create_with_calendar':
        if (command.entity === 'mission') {
          const missionResult = await createMission(supabase, userId, { title: command.params.title });
          const eventResult = await scheduleEvent(supabase, userId, {
            title: command.params.title,
            start_time: command.params.start_time,
            end_time: command.params.end_time,
            mission_id: missionResult.id
          });
          response = `✓ Mission "${missionResult.title}" created with calendar event on ${formatDateInEST(new Date(command.params.start_time))} for ${command.params.duration_minutes} minutes`;
          data = { mission: missionResult, event: eventResult };
        }
        break;

      case 'list':
        if (command.entity === 'mission') {
          const missions = await listMissions(supabase, userId);
          if (missions.length === 0) {
            response = 'No missions yet. Create one with: `create mission <title>`';
          } else {
            response = `**Your Missions (${missions.length}):**\n\n` +
              missions.map((m: any) => `• ${m.title} [${m.status}]${m.due_date ? ` - Due: ${formatDateInEST(new Date(m.due_date))}` : ''}`).join('\n');
          }
          data = missions;
        } else if (command.entity === 'battlefront') {
          const battlefronts = await listBattlefronts(supabase, userId);
          if (battlefronts.length === 0) {
            response = 'No battlefronts yet. Create one with: `create battlefront <name>`';
          } else {
            response = `**Your Battlefronts (${battlefronts.length}):**\n\n` +
              battlefronts.map((b: any) => `• ${b.name} [${b.status}]`).join('\n');
          }
          data = battlefronts;
        } else if (command.entity === 'calendar') {
          const events = await listCalendarEvents(supabase, userId, command.params.range);
          if (events.length === 0) {
            response = command.params.range === 'today'
              ? 'No events scheduled today.'
              : 'No events scheduled this week.';
          } else {
            response = `**${command.params.range === 'today' ? 'Today' : 'This Week'} (${events.length} events):**\n\n` +
              events.map((e: any) => `• ${e.title} - ${formatDateInEST(new Date(e.start_time))} to ${formatDateInEST(new Date(e.end_time))}`).join('\n');
          }
          data = events;
        } else {
          response = 'Unknown entity to list.';
        }
        break;

      case 'schedule':
        const event = await scheduleEvent(supabase, userId, command.params);
        response = `✓ Scheduled: "${event.title}" on ${formatDateInEST(new Date(event.start_time))} for ${command.params.duration_minutes} minutes`;
        data = event;
        break;

      case 'delete':
        if (command.entity === 'mission' && command.params.id) {
          await deleteMission(supabase, userId, command.params.id);
          response = `✓ Mission deleted`;
        } else if (command.entity === 'battlefront' && command.params.id) {
          await deleteBattlefront(supabase, userId, command.params.id);
          response = `✓ Battlefront deleted`;
        } else if (command.entity === 'calendar' && command.params.id) {
          await deleteCalendarEvent(supabase, userId, command.params.id);
          response = `✓ Event deleted`;
        } else {
          response = 'ID required for delete operations.';
        }
        break;

      case 'update_duration':
        if (command.entity === 'mission' && command.params.id && command.params.duration) {
          await updateMissionDuration(supabase, userId, command.params.id, command.params.duration);
          response = `✓ Mission duration updated to ${command.params.duration} minutes`;
        } else {
          response = 'Missing mission ID or duration.';
        }
        break;

      case 'link':
        if (command.entity === 'event_to_mission' && command.params.eventId && command.params.missionId) {
          await linkEventToMission(supabase, userId, command.params.eventId, command.params.missionId);
          response = `✓ Event linked to mission`;
        } else {
          response = 'Missing event ID or mission ID.';
        }
        break;

      case 'unknown':
      default:
        response = `I didn't understand that command. Try:\n\n` +
          `• **create mission <title>**\n` +
          `• **build mission <title> tomorrow 2pm for 1 hour**\n` +
          `• **create battlefront <name>**\n` +
          `• **list missions**\n` +
          `• **list battlefronts**\n` +
          `• **schedule <title> tomorrow 10am for 2 hours**\n` +
          `• **show today**\n` +
          `• **show this week**\n` +
          `• **update mission <id> duration 2h**\n` +
          `• **delete mission <id>**`;
    }

    if (conversationId) {
      await saveMessage(supabase, conversationId, userId, 'user', message);
      await saveMessage(supabase, conversationId, userId, 'assistant', response);
    }

    return NextResponse.json({
      success: true,
      message: response,
      data,
      command
    });

  } catch (error: any) {
    console.error('Command error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to execute command' },
      { status: 500 }
    );
  }
}

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

async function scheduleEvent(supabase: any, userId: string, params: any) {
  const { data, error } = await supabase
    .from('calendar_events')
    .insert({
      user_id: userId,
      title: params.title,
      start_time: params.start_time,
      end_time: params.end_time,
      mission_id: params.mission_id || null
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
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

async function deleteMission(supabase: any, userId: string, id: string) {
  const { error } = await supabase
    .from('missions')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
}

async function deleteBattlefront(supabase: any, userId: string, id: string) {
  const { error } = await supabase
    .from('battlefronts')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
}

async function deleteCalendarEvent(supabase: any, userId: string, id: string) {
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
}

async function updateMissionDuration(supabase: any, userId: string, missionId: string, duration: number) {
  const { error } = await supabase
    .from('missions')
    .update({ duration_minutes: duration })
    .eq('id', missionId)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
}

async function linkEventToMission(supabase: any, userId: string, eventId: string, missionId: string) {
  const { error } = await supabase
    .from('calendar_events')
    .update({ mission_id: missionId })
    .eq('id', eventId)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
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
