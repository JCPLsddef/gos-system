import { supabase } from './supabase';
import { scheduleNotificationForMission, cancelNotificationForMission } from './notifications';
import { format, startOfDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const TIMEZONE = 'America/Toronto';

export type Mission = {
  id: string;
  user_id: string;
  title: string;
  battlefront_id?: string | null;
  calendar_event_id?: string | null;
  start_at?: string | null;
  due_date?: string | null;
  duration_minutes: number;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  is_recurring?: boolean;
  recurrence_days?: string | null;
  recurrence_time?: string | null;
  last_reset_date?: string | null;
  battlefront?: {
    id: string;
    name: string;
    color?: string;
  } | null;
};

function getTodayDateString(): string {
  const now = toZonedTime(new Date(), TIMEZONE);
  return format(startOfDay(now), 'yyyy-MM-dd');
}

async function resetDailyMissionsIfNeeded(missions: Mission[]): Promise<Mission[]> {
  const today = getTodayDateString();
  const missionsToReset: string[] = [];

  for (const mission of missions) {
    if (mission.is_recurring && mission.last_reset_date !== today) {
      missionsToReset.push(mission.id);
    }
  }

  if (missionsToReset.length > 0) {
    await supabase
      .from('missions')
      .update({
        completed_at: null,
        last_reset_date: today,
        updated_at: new Date().toISOString(),
      })
      .in('id', missionsToReset);

    return missions.map((m) => {
      if (missionsToReset.includes(m.id)) {
        return { ...m, completed_at: null, last_reset_date: today };
      }
      return m;
    });
  }

  return missions;
}

export async function getMissions(userId: string): Promise<Mission[]> {
  const { data, error } = await supabase
    .from('missions')
    .select(`
      *,
      battlefront:battlefronts(id, name, color)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const missions = data || [];
  return await resetDailyMissionsIfNeeded(missions);
}

export async function getMissionsForWeek(userId: string, weekStart: Date, weekEnd: Date): Promise<Mission[]> {
  const { data, error } = await supabase
    .from('missions')
    .select(`
      *,
      battlefront:battlefronts(id, name, color)
    `)
    .eq('user_id', userId)
    .or(`and(start_at.gte.${weekStart.toISOString()},start_at.lte.${weekEnd.toISOString()}),and(due_date.gte.${weekStart.toISOString().split('T')[0]},due_date.lte.${weekEnd.toISOString().split('T')[0]}),is_recurring.eq.true`)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const missions = data || [];
  return await resetDailyMissionsIfNeeded(missions);
}

export async function createMission(userId: string, data: Partial<Mission>): Promise<Mission> {
  const today = getTodayDateString();

  const { data: mission, error } = await supabase
    .from('missions')
    .insert({
      user_id: userId,
      title: data.title || 'New Mission',
      battlefront_id: data.battlefront_id,
      start_at: data.start_at,
      due_date: data.due_date,
      duration_minutes: data.duration_minutes || 60,
      is_recurring: data.is_recurring || false,
      recurrence_days: data.recurrence_days,
      recurrence_time: data.recurrence_time,
      last_reset_date: data.is_recurring ? today : null,
    })
    .select(`
      *,
      battlefront:battlefronts(id, name, color)
    `)
    .single();

  if (error) throw error;

  if (mission.start_at && !mission.is_recurring) {
    await scheduleNotificationForMission(
      userId,
      mission.id,
      mission.title,
      new Date(mission.start_at),
      mission.battlefront?.name
    );
  }

  return mission;
}

export async function updateMission(missionId: string, updates: Partial<Mission>): Promise<Mission> {
  const cleanUpdates: any = { ...updates, updated_at: new Date().toISOString() };

  if (cleanUpdates.battlefront_id === undefined || cleanUpdates.battlefront_id === null) {
    cleanUpdates.battlefront_id = null;
  }

  if (cleanUpdates.due_date === undefined || cleanUpdates.due_date === null || cleanUpdates.due_date === '') {
    cleanUpdates.due_date = null;
  }

  const { data: mission, error } = await supabase
    .from('missions')
    .update(cleanUpdates)
    .eq('id', missionId)
    .select(`
      *,
      battlefront:battlefronts(id, name, color)
    `)
    .single();

  if (error) {
    console.error('Update mission error:', error);
    throw error;
  }

  if (updates.start_at || updates.title || updates.battlefront_id) {
    const userId = mission.user_id;
    await cancelNotificationForMission(missionId);

    if (mission.start_at && !mission.completed_at && !mission.is_recurring) {
      await scheduleNotificationForMission(
        userId,
        mission.id,
        mission.title,
        new Date(mission.start_at),
        mission.battlefront?.name
      );
    }
  }

  return mission;
}

export async function completeMission(missionId: string): Promise<Mission> {
  const now = new Date().toISOString();
  const today = getTodayDateString();

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('You must be logged in to complete missions');
  }

  await cancelNotificationForMission(missionId);

  const { data, error } = await supabase
    .from('missions')
    .update({
      completed_at: now,
      updated_at: now,
      last_reset_date: today,
    })
    .eq('id', missionId)
    .select(`
      *,
      battlefront:battlefronts(id, name, color)
    `)
    .single();

  if (error) {
    console.error('completeMission DB error:', error.message);
    throw error;
  }

  return data;
}

export async function uncompleteMission(missionId: string): Promise<Mission> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('You must be logged in to uncomplete missions');
  }

  const { data: mission, error } = await supabase
    .from('missions')
    .update({
      completed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', missionId)
    .select(`
      *,
      battlefront:battlefronts(id, name, color)
    `)
    .single();

  if (error) {
    console.error('uncompleteMission DB error:', error.message);
    throw error;
  }

  if (mission.start_at && !mission.is_recurring) {
    await scheduleNotificationForMission(
      mission.user_id,
      mission.id,
      mission.title,
      new Date(mission.start_at),
      mission.battlefront?.name
    );
  }

  return mission;
}

export async function deleteMission(missionId: string): Promise<void> {
  await cancelNotificationForMission(missionId);

  const { error } = await supabase
    .from('missions')
    .delete()
    .eq('id', missionId);

  if (error) throw error;
}
