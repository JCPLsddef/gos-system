import { SupabaseClient } from '@supabase/supabase-js';

export type ActionResult<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
};

function formatError(error: any): string {
  if (!error) return 'Unknown error';

  const errorMessage = error.message || String(error);

  if (errorMessage.includes('row-level security')) {
    return 'Authentication error: You are not authorized to access this data. Please sign in again.';
  }

  if (errorMessage.includes('JWT') || errorMessage.includes('auth')) {
    return 'Authentication expired. Please sign in again.';
  }

  if (errorMessage.includes('unique constraint') || errorMessage.includes('duplicate')) {
    return 'This record already exists.';
  }

  if (errorMessage.includes('foreign key')) {
    return 'Cannot complete operation: related record not found.';
  }

  return errorMessage;
}

export class GosActions {
  private supabase: SupabaseClient;
  private userId: string;

  constructor(supabaseClient: SupabaseClient, userId: string) {
    this.supabase = supabaseClient;
    this.userId = userId;
  }

  async createBattlefront(data: {
    name: string;
    status?: 'ACTIVE' | 'WON' | 'COLLAPSING';
    binaryExitTarget?: string;
  }): Promise<ActionResult> {
    try {
      const { data: battlefront, error } = await this.supabase
        .from('battlefronts')
        .insert({
          user_id: this.userId,
          name: data.name,
          status: data.status || 'ACTIVE',
          binary_exit_target: data.binaryExitTarget || '',
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: battlefront };
    } catch (error: any) {
      return { success: false, error: formatError(error) };
    }
  }

  async updateBattlefront(
    battlefrontId: string,
    data: {
      name?: string;
      status?: 'ACTIVE' | 'WON' | 'COLLAPSING';
      binaryExitTarget?: string;
    }
  ): Promise<ActionResult> {
    try {
      const updateData: any = {};
      if (data.name) updateData.name = data.name;
      if (data.status) updateData.status = data.status;
      if (data.binaryExitTarget !== undefined) updateData.binary_exit_target = data.binaryExitTarget;

      const { data: battlefront, error } = await this.supabase
        .from('battlefronts')
        .update(updateData)
        .eq('id', battlefrontId)
        .eq('user_id', this.userId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: battlefront };
    } catch (error: any) {
      return { success: false, error: formatError(error) };
    }
  }

  async deleteBattlefront(battlefrontId: string): Promise<ActionResult> {
    try {
      const { error } = await this.supabase
        .from('battlefronts')
        .delete()
        .eq('id', battlefrontId)
        .eq('user_id', this.userId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      return { success: false, error: formatError(error) };
    }
  }

  async getBattlefronts(): Promise<ActionResult> {
    try {
      const { data: battlefronts, error } = await this.supabase
        .from('battlefronts')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, data: battlefronts };
    } catch (error: any) {
      return { success: false, error: formatError(error) };
    }
  }

  async createCheckpoint(data: {
    battlefrontId: string;
    title: string;
    orderIndex?: number;
  }): Promise<ActionResult> {
    try {
      const { data: checkpoint, error } = await this.supabase
        .from('checkpoints')
        .insert({
          user_id: this.userId,
          battlefront_id: data.battlefrontId,
          title: data.title,
          order_index: data.orderIndex || 0,
          done: false,
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: checkpoint };
    } catch (error: any) {
      return { success: false, error: formatError(error) };
    }
  }

  async updateCheckpoint(
    checkpointId: string,
    data: { title?: string; done?: boolean }
  ): Promise<ActionResult> {
    try {
      const { data: checkpoint, error } = await this.supabase
        .from('checkpoints')
        .update(data)
        .eq('id', checkpointId)
        .eq('user_id', this.userId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: checkpoint };
    } catch (error: any) {
      return { success: false, error: formatError(error) };
    }
  }

  async toggleCheckpointDone(checkpointId: string): Promise<ActionResult> {
    try {
      const { data: checkpoint } = await this.supabase
        .from('checkpoints')
        .select('done')
        .eq('id', checkpointId)
        .eq('user_id', this.userId)
        .single();

      if (!checkpoint) throw new Error('Checkpoint not found');

      const { data: updated, error } = await this.supabase
        .from('checkpoints')
        .update({ done: !checkpoint.done })
        .eq('id', checkpointId)
        .eq('user_id', this.userId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: updated };
    } catch (error: any) {
      return { success: false, error: formatError(error) };
    }
  }

  async deleteCheckpoint(checkpointId: string): Promise<ActionResult> {
    try {
      const { error } = await this.supabase
        .from('checkpoints')
        .delete()
        .eq('id', checkpointId)
        .eq('user_id', this.userId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      return { success: false, error: formatError(error) };
    }
  }

  async createMission(data: {
    battlefrontId: string;
    title: string;
    attackDate: string;
    dueDate: string;
    durationMinutes: number;
  }): Promise<ActionResult> {
    try {
      const { data: mission, error } = await this.supabase
        .from('missions')
        .insert({
          battlefront_id: data.battlefrontId,
          user_id: this.userId,
          title: data.title,
          attack_date: data.attackDate,
          due_date: data.dueDate,
          duration_minutes: data.durationMinutes,
          status: 'NOT_DONE',
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: mission };
    } catch (error: any) {
      return { success: false, error: formatError(error) };
    }
  }

  async updateMission(
    missionId: string,
    data: {
      title?: string;
      attackDate?: string;
      dueDate?: string;
      durationMinutes?: number;
      status?: 'DONE' | 'NOT_DONE';
    }
  ): Promise<ActionResult> {
    try {
      const updateData: any = {};
      if (data.title) updateData.title = data.title;
      if (data.attackDate) updateData.attack_date = data.attackDate;
      if (data.dueDate) updateData.due_date = data.dueDate;
      if (data.durationMinutes) updateData.duration_minutes = data.durationMinutes;
      if (data.status) updateData.status = data.status;

      const { data: mission, error } = await this.supabase
        .from('missions')
        .update(updateData)
        .eq('id', missionId)
        .eq('user_id', this.userId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: mission };
    } catch (error: any) {
      return { success: false, error: formatError(error) };
    }
  }

  async markMissionDone(missionId: string, done: boolean = true): Promise<ActionResult> {
    return this.updateMission(missionId, { status: done ? 'DONE' : 'NOT_DONE' });
  }

  async deleteMission(missionId: string): Promise<ActionResult> {
    try {
      const { error } = await this.supabase
        .from('missions')
        .delete()
        .eq('id', missionId)
        .eq('user_id', this.userId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      return { success: false, error: formatError(error) };
    }
  }

  async getMissions(filters?: { battlefrontId?: string; status?: string }): Promise<ActionResult> {
    try {
      let query = this.supabase
        .from('missions')
        .select('*, battlefront:battlefronts!inner(id, name)')
        .eq('user_id', this.userId);

      if (filters?.battlefrontId) {
        query = query.eq('battlefront_id', filters.battlefrontId);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data: missions, error } = await query.order('attack_date', { ascending: true });

      if (error) throw error;

      return { success: true, data: missions };
    } catch (error: any) {
      return { success: false, error: formatError(error) };
    }
  }

  async scheduleMission(data: {
    missionId: string;
    battlefrontId: string;
    title: string;
    startTime: string;
    endTime: string;
  }): Promise<ActionResult> {
    try {
      const { data: event, error } = await this.supabase
        .from('calendar_events')
        .insert({
          user_id: this.userId,
          mission_id: data.missionId,
          battlefront_id: data.battlefrontId,
          title: data.title,
          start_time: data.startTime,
          end_time: data.endTime,
          locked: false,
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: event };
    } catch (error: any) {
      return { success: false, error: formatError(error) };
    }
  }

  async rescheduleCalendarEvent(
    eventId: string,
    data: { startTime: string; endTime: string }
  ): Promise<ActionResult> {
    try {
      const { data: event, error } = await this.supabase
        .from('calendar_events')
        .update({
          start_time: data.startTime,
          end_time: data.endTime,
        })
        .eq('id', eventId)
        .eq('user_id', this.userId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: event };
    } catch (error: any) {
      return { success: false, error: formatError(error) };
    }
  }

  async unscheduleCalendarEvent(eventId: string): Promise<ActionResult> {
    try {
      const { error } = await this.supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId)
        .eq('user_id', this.userId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      return { success: false, error: formatError(error) };
    }
  }

  async getCalendarEvents(filters?: { startDate?: string; endDate?: string }): Promise<ActionResult> {
    try {
      let query = this.supabase
        .from('calendar_events')
        .select('*, mission:missions(title), battlefront:battlefronts(name)')
        .eq('user_id', this.userId);

      if (filters?.startDate) {
        query = query.gte('start_time', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte('start_time', filters.endDate);
      }

      const { data: events, error } = await query.order('start_time', { ascending: true });

      if (error) throw error;

      return { success: true, data: events };
    } catch (error: any) {
      return { success: false, error: formatError(error) };
    }
  }

  async createDailyLog(data: {
    logDate: string;
    dayStatus?: 'WIN' | 'NEUTRAL' | 'LOSS';
    dailyScore?: number;
    mainObjective?: string;
    reflectionShort?: string;
  }): Promise<ActionResult> {
    try {
      const { data: log, error } = await this.supabase
        .from('daily_logs')
        .insert({
          user_id: this.userId,
          log_date: data.logDate,
          day_status: data.dayStatus || 'NEUTRAL',
          daily_score: data.dailyScore || 0,
          main_objective: data.mainObjective || '',
          reflection_short: data.reflectionShort || '',
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: log };
    } catch (error: any) {
      return { success: false, error: formatError(error) };
    }
  }

  async createWeeklyReview(data: {
    weekStart: string;
    weekEnd: string;
    observe: string;
    orient: string;
    decide: string;
    act: string;
    completionRate?: number;
  }): Promise<ActionResult> {
    try {
      const { data: review, error } = await this.supabase
        .from('weekly_reviews')
        .insert({
          user_id: this.userId,
          week_start: data.weekStart,
          week_end: data.weekEnd,
          observe: data.observe,
          orient: data.orient,
          decide: data.decide,
          act: data.act,
          completion_rate: data.completionRate || 0,
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: review };
    } catch (error: any) {
      return { success: false, error: formatError(error) };
    }
  }

  async getSystemStats(): Promise<ActionResult> {
    try {
      const [battlefrontsRes, missionsRes, eventsRes] = await Promise.all([
        this.getBattlefronts(),
        this.getMissions(),
        this.getCalendarEvents(),
      ]);

      if (!battlefrontsRes.success || !missionsRes.success || !eventsRes.success) {
        throw new Error('Failed to fetch system stats');
      }

      const battlefronts = battlefrontsRes.data || [];
      const missions = missionsRes.data || [];
      const events = eventsRes.data || [];

      const stats = {
        battlefronts: {
          total: battlefronts.length,
          active: battlefronts.filter((b: any) => b.status === 'ACTIVE').length,
          won: battlefronts.filter((b: any) => b.status === 'WON').length,
          collapsing: battlefronts.filter((b: any) => b.status === 'COLLAPSING').length,
        },
        missions: {
          total: missions.length,
          done: missions.filter((m: any) => m.status === 'DONE').length,
          notDone: missions.filter((m: any) => m.status === 'NOT_DONE').length,
          scheduled: missions.filter((m: any) =>
            events.some((e: any) => e.mission_id === m.id)
          ).length,
        },
        calendar: {
          totalEvents: events.length,
        },
      };

      return { success: true, data: stats };
    } catch (error: any) {
      return { success: false, error: formatError(error) };
    }
  }

  async createMultipleMissions(
    missions: Array<{
      title: string;
      battlefrontId?: string;
      dueDate?: string;
      durationMinutes?: number;
    }>
  ): Promise<ActionResult<{ created: number; failed: number; missions: any[] }>> {
    const results = {
      created: 0,
      failed: 0,
      missions: [] as any[],
    };

    let defaultBattlefrontId: string | null = null;

    const { data: existingBf } = await this.supabase
      .from('battlefronts')
      .select('id')
      .eq('user_id', this.userId)
      .eq('status', 'ACTIVE')
      .limit(1)
      .maybeSingle();

    if (existingBf) {
      defaultBattlefrontId = existingBf.id;
    }

    for (const mission of missions) {
      try {
        const missionData: any = {
          user_id: this.userId,
          title: mission.title,
          status: 'NOT_DONE',
          duration_minutes: mission.durationMinutes || 60,
        };

        if (mission.battlefrontId || defaultBattlefrontId) {
          missionData.battlefront_id = mission.battlefrontId || defaultBattlefrontId;
        }

        if (mission.dueDate) {
          missionData.due_date = mission.dueDate;
        }

        const { data, error } = await this.supabase
          .from('missions')
          .insert(missionData)
          .select()
          .single();

        if (error) {
          results.failed++;
        } else {
          results.created++;
          results.missions.push(data);
        }
      } catch {
        results.failed++;
      }
    }

    return { success: true, data: results };
  }

  async createBattlefrontWithMissions(data: {
    battlefrontName: string;
    binaryExitTarget?: string;
    missions: Array<{
      title: string;
      dueDate?: string;
      durationMinutes?: number;
    }>;
  }): Promise<ActionResult<{ battlefront: any; missions: any[]; missionsCreated: number }>> {
    try {
      const { data: battlefront, error: bfError } = await this.supabase
        .from('battlefronts')
        .insert({
          user_id: this.userId,
          name: data.battlefrontName,
          binary_exit_target: data.binaryExitTarget || '',
          status: 'ACTIVE',
        })
        .select()
        .single();

      if (bfError) throw bfError;

      const createdMissions: any[] = [];

      for (const mission of data.missions) {
        const missionData: any = {
          user_id: this.userId,
          battlefront_id: battlefront.id,
          title: mission.title,
          status: 'NOT_DONE',
          duration_minutes: mission.durationMinutes || 60,
        };

        if (mission.dueDate) {
          missionData.due_date = mission.dueDate;
        }

        const { data: missionRecord, error: mError } = await this.supabase
          .from('missions')
          .insert(missionData)
          .select()
          .single();

        if (!mError && missionRecord) {
          createdMissions.push(missionRecord);
        }
      }

      return {
        success: true,
        data: {
          battlefront,
          missions: createdMissions,
          missionsCreated: createdMissions.length,
        },
      };
    } catch (error: any) {
      return { success: false, error: formatError(error) };
    }
  }

  async scheduleMultipleEvents(
    events: Array<{
      title: string;
      startTime: string;
      endTime: string;
      missionId?: string;
      battlefrontId?: string;
    }>
  ): Promise<ActionResult<{ created: number; failed: number; events: any[] }>> {
    const results = {
      created: 0,
      failed: 0,
      events: [] as any[],
    };

    for (const event of events) {
      try {
        const { data, error } = await this.supabase
          .from('calendar_events')
          .insert({
            user_id: this.userId,
            title: event.title,
            start_time: event.startTime,
            end_time: event.endTime,
            mission_id: event.missionId || null,
            battlefront_id: event.battlefrontId || null,
            locked: false,
          })
          .select()
          .single();

        if (error) {
          results.failed++;
        } else {
          results.created++;
          results.events.push(data);
        }
      } catch {
        results.failed++;
      }
    }

    return { success: true, data: results };
  }

  async getOrCreateDefaultBattlefront(): Promise<ActionResult> {
    try {
      const { data: existingBf } = await this.supabase
        .from('battlefronts')
        .select('*')
        .eq('user_id', this.userId)
        .eq('status', 'ACTIVE')
        .limit(1)
        .maybeSingle();

      if (existingBf) {
        return { success: true, data: existingBf };
      }

      const { data: newBf, error } = await this.supabase
        .from('battlefronts')
        .insert({
          user_id: this.userId,
          name: 'General Tasks',
          binary_exit_target: 'Complete all imported tasks',
          status: 'ACTIVE',
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: newBf };
    } catch (error: any) {
      return { success: false, error: formatError(error) };
    }
  }
}
