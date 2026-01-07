import { supabase } from './supabase';
import { addMinutes } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { scheduleNotificationForMission, cancelNotificationForMission } from './notifications';

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

    await scheduleNotificationForMission(
      mission.user_id,
      mission.id,
      mission.title,
      startTime,
      battlefrontName
    );

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

    await scheduleNotificationForMission(
      mission.user_id,
      mission.id,
      mission.title,
      startTime,
      battlefrontName
    );

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
