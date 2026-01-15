import { supabase } from './supabase';
import { addMinutes, addDays } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { cancelNotificationForMission } from './notifications';

const TIMEZONE = 'America/Toronto';

export type MissionWithCalendar = {
  id: string;
  user_id: string;
  title: string;
  start_at?: string | null;
  duration_minutes: number;
  calendar_event_id?: string | null;
  battlefront_id?: string | null;
};

export async function syncMissionToCalendar(mission: MissionWithCalendar): Promise<string | null> {
  let battlefrontName: string | undefined;
  if (mission.battlefront_id) {
    const { data: bf } = await supabase
      .from('battlefronts')
      .select('name')
      .eq('id', mission.battlefront_id)
      .maybeSingle();
    battlefrontName = bf?.name;
  }

  if (mission.start_at && !mission.calendar_event_id) {
    const startTime = new Date(mission.start_at);
    const endTime = addMinutes(startTime, mission.duration_minutes || 60);

    const { data: event, error: createError } = await supabase
      .from('calendar_events')
      .insert({
        user_id: mission.user_id,
        title: mission.title,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        mission_id: mission.id,
        battlefront_id: mission.battlefront_id,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating calendar event:', createError);
      return null;
    }

    const { error: updateError } = await supabase
      .from('missions')
      .update({ calendar_event_id: event.id })
      .eq('id', mission.id);

    if (updateError) {
      console.error('Error updating mission with calendar_event_id:', updateError);
    }

    // Notification will be created automatically by Edge Function 15 minutes before start
    // No need to schedule notification here anymore

    return event.id;
  }

  if (mission.start_at && mission.calendar_event_id) {
    const startTime = new Date(mission.start_at);
    const endTime = addMinutes(startTime, mission.duration_minutes || 60);

    const { error } = await supabase
      .from('calendar_events')
      .update({
        title: mission.title,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        battlefront_id: mission.battlefront_id,
      })
      .eq('id', mission.calendar_event_id);

    if (error) {
      console.error('Error updating calendar event:', error);
    }

    // Notification will be created automatically by Edge Function 15 minutes before start
    // No need to schedule notification here anymore

    return mission.calendar_event_id;
  }

  if (!mission.start_at && mission.calendar_event_id) {
    const { error: deleteError } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', mission.calendar_event_id);

    if (deleteError) {
      console.error('Error deleting calendar event:', deleteError);
    }

    const { error: updateError } = await supabase
      .from('missions')
      .update({ calendar_event_id: null })
      .eq('id', mission.id);

    if (updateError) {
      console.error('Error clearing calendar_event_id from mission:', updateError);
    }

    await cancelNotificationForMission(mission.id);

    return null;
  }

  return mission.calendar_event_id || null;
}

export async function updateMissionFromCalendarEvent(
  eventId: string,
  newStartTime: string,
  newEndTime: string
): Promise<void> {
  const { data: event, error: fetchError } = await supabase
    .from('calendar_events')
    .select('mission_id')
    .eq('id', eventId)
    .maybeSingle();

  if (fetchError || !event?.mission_id) {
    return;
  }

  const startTime = new Date(newStartTime);
  const endTime = new Date(newEndTime);
  const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

  const { error: updateError } = await supabase
    .from('missions')
    .update({
      start_at: newStartTime,
      duration_minutes: durationMinutes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', event.mission_id);

  if (updateError) {
    console.error('Error updating mission from calendar:', updateError);
  }
}

export async function deleteMissionCalendarEvent(missionId: string): Promise<void> {
  const { data: mission, error: fetchError } = await supabase
    .from('missions')
    .select('calendar_event_id')
    .eq('id', missionId)
    .maybeSingle();

  if (fetchError || !mission?.calendar_event_id) {
    return;
  }

  const { error: deleteError } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', mission.calendar_event_id);

  if (deleteError) {
    console.error('Error deleting calendar event for mission:', deleteError);
  }
}

export async function createCalendarEventForMission(
  userId: string,
  missionId: string,
  title: string,
  startAt: string,
  durationMinutes: number,
  battlefrontId?: string | null
): Promise<string | null> {
  const startTime = new Date(startAt);
  const endTime = addMinutes(startTime, durationMinutes);

  const { data: event, error: createError } = await supabase
    .from('calendar_events')
    .insert({
      user_id: userId,
      title,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      mission_id: missionId,
      battlefront_id: battlefrontId,
    })
    .select()
    .single();

  if (createError) {
    console.error('Error creating calendar event for mission:', createError);
    return null;
  }

  const { error: updateError } = await supabase
    .from('missions')
    .update({ calendar_event_id: event.id })
    .eq('id', missionId);

  if (updateError) {
    console.error('Error updating mission with calendar_event_id:', updateError);
  }

  return event.id;
}

/**
 * Clean up orphaned calendar events:
 * 1. Events with mission_id that doesn't exist in missions table
 * 2. Events with NULL mission_id (created without a mission - these are orphans!)
 * Call this periodically or on page load to ensure data integrity
 */
export async function cleanupOrphanedCalendarEvents(userId: string): Promise<number> {
  console.log('🔍 Starting orphan cleanup for user:', userId);

  // PART 1: Delete calendar events with NULL mission_id (orphans from direct calendar creation)
  const { data: nullMissionEvents, error: nullError } = await supabase
    .from('calendar_events')
    .select('id, title, start_time')
    .eq('user_id', userId)
    .is('mission_id', null);

  let deletedCount = 0;

  if (!nullError && nullMissionEvents && nullMissionEvents.length > 0) {
    console.log(`🗑️ Found ${nullMissionEvents.length} calendar events with NULL mission_id:`);
    nullMissionEvents.forEach(e => {
      console.log(`   - "${e.title}" at ${e.start_time}`);
    });

    const nullEventIds = nullMissionEvents.map(e => e.id);
    const { error: deleteNullError } = await supabase
      .from('calendar_events')
      .delete()
      .in('id', nullEventIds);

    if (!deleteNullError) {
      deletedCount += nullMissionEvents.length;
      console.log(`✅ Deleted ${nullMissionEvents.length} events with NULL mission_id`);
    } else {
      console.error('Error deleting NULL mission_id events:', deleteNullError);
    }
  }

  // PART 2: Delete calendar events where mission_id exists but mission doesn't
  const { data: calendarEvents, error: fetchError } = await supabase
    .from('calendar_events')
    .select('id, title, start_time, mission_id')
    .eq('user_id', userId)
    .not('mission_id', 'is', null);

  if (fetchError || !calendarEvents || calendarEvents.length === 0) {
    console.log(`📊 Cleanup complete: ${deletedCount} total orphaned events deleted`);
    return deletedCount;
  }

  // Get all mission IDs for this user
  const { data: missions, error: missionsError } = await supabase
    .from('missions')
    .select('id')
    .eq('user_id', userId);

  if (missionsError) {
    console.error('Error fetching missions for cleanup:', missionsError);
    return deletedCount;
  }

  const missionIds = new Set((missions || []).map(m => m.id));
  console.log(`📋 User has ${missionIds.size} missions in database`);

  // Find orphaned calendar events (mission_id doesn't exist in missions)
  const orphanedEvents = calendarEvents.filter(event => event.mission_id && !missionIds.has(event.mission_id));

  if (orphanedEvents.length > 0) {
    console.log(`🗑️ Found ${orphanedEvents.length} calendar events with invalid mission_id:`);
    orphanedEvents.forEach(e => {
      console.log(`   - "${e.title}" at ${e.start_time} (mission_id: ${e.mission_id})`);
    });

    const orphanedEventIds = orphanedEvents.map(e => e.id);
    const { error: deleteError } = await supabase
      .from('calendar_events')
      .delete()
      .in('id', orphanedEventIds);

    if (!deleteError) {
      deletedCount += orphanedEvents.length;
      console.log(`✅ Deleted ${orphanedEvents.length} events with invalid mission_id`);
    } else {
      console.error('Error deleting orphaned calendar events:', deleteError);
    }
  }

  console.log(`📊 Cleanup complete: ${deletedCount} total orphaned events deleted`);
  return deletedCount;
}

export async function syncRecurringMissionToCalendar(
  mission: MissionWithCalendar,
  recurrenceDays: number,
  occurrences: number = 30
): Promise<string[]> {
  if (!mission.start_at) return [];

  console.log('🔄 Syncing recurring mission:', {
    missionId: mission.id,
    title: mission.title,
    startAt: mission.start_at,
    recurrenceDays,
    occurrences
  });

  // First, delete any existing calendar events for this mission
  const { data: deletedEvents, error: deleteError } = await supabase
    .from('calendar_events')
    .delete()
    .eq('mission_id', mission.id)
    .select();

  console.log('🗑️ Deleted existing events:', deletedEvents?.length || 0);

  if (deleteError) {
    console.error('Error deleting old events:', deleteError);
  }

  const eventIds: string[] = [];
  const baseStartDate = new Date(mission.start_at);

  console.log('📅 Base start date:', baseStartDate.toISOString());

  // Create calendar events for the next N occurrences
  for (let i = 0; i < occurrences; i++) {
    // Add days using date-fns for reliable date arithmetic
    const occurrenceStart = addDays(baseStartDate, i * recurrenceDays);
    const occurrenceEnd = addMinutes(occurrenceStart, mission.duration_minutes || 60);

    console.log(`📍 Creating occurrence ${i}:`, {
      dayOffset: i * recurrenceDays,
      startTime: occurrenceStart.toISOString(),
      endTime: occurrenceEnd.toISOString()
    });

    const { data: event, error } = await supabase
      .from('calendar_events')
      .insert({
        user_id: mission.user_id,
        title: mission.title,
        start_time: occurrenceStart.toISOString(),
        end_time: occurrenceEnd.toISOString(),
        mission_id: mission.id,
        battlefront_id: mission.battlefront_id,
      })
      .select()
      .single();

    if (error) {
      console.error(`❌ Error creating calendar event for occurrence ${i}:`, error);
      continue;
    }

    console.log(`✅ Created event ${i}:`, event.id);
    eventIds.push(event.id);

    // Update mission with the first calendar_event_id
    if (i === 0 && event.id) {
      await supabase
        .from('missions')
        .update({ calendar_event_id: event.id })
        .eq('id', mission.id);
    }
  }

  console.log(`✅ Created ${eventIds.length} calendar events for recurring mission`);
  return eventIds;
}
