import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-api';
import { authenticateRequest } from '@/lib/api-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { action, data, userId: bodyUserId } = await request.json();

    if (!bodyUserId) {
      return NextResponse.json({
        ok: false,
        error: 'User ID required'
      }, { status: 401 });
    }

    const { userId, error: authError } = await authenticateRequest(request);

    if (authError || !userId) {
      return NextResponse.json({
        ok: false,
        error: authError || 'Authentication required'
      }, { status: 401 });
    }

    if (userId !== bodyUserId) {
      return NextResponse.json({
        ok: false,
        error: 'User ID mismatch'
      }, { status: 403 });
    }

    const supabase = createServiceClient();

    switch (action) {
      case 'create_mission': {
        const { battlefrontId, title, attackDate, dueDate, durationMinutes } = data;

        const { data: mission, error } = await supabase
          .from('missions')
          .insert({
            battlefront_id: battlefrontId,
            user_id: userId,
            title,
            attack_date: attackDate,
            due_date: dueDate,
            duration_minutes: durationMinutes,
            status: 'NOT_DONE',
          })
          .select()
          .single();

        if (error) throw error;

        return NextResponse.json({ success: true, ok: true, mission });
      }

      case 'create_calendar_event': {
        const { missionId, battlefrontId, title, startTime, endTime } = data;

        const { data: event, error } = await supabase
          .from('calendar_events')
          .insert({
            user_id: userId,
            mission_id: missionId,
            battlefront_id: battlefrontId,
            title,
            start_time: startTime,
            end_time: endTime,
            locked: false,
          })
          .select()
          .single();

        if (error) throw error;

        return NextResponse.json({ success: true, ok: true, event });
      }

      case 'get_battlefronts': {
        const { data: battlefronts, error } = await supabase
          .from('battlefronts')
          .select('*')
          .eq('user_id', userId);

        if (error) throw error;

        return NextResponse.json({ success: true, ok: true, battlefronts });
      }

      case 'create_mission_and_schedule': {
        const { battlefrontId, title, attackDate, dueDate, durationMinutes, startTime } = data;

        const { data: mission, error: missionError } = await supabase
          .from('missions')
          .insert({
            battlefront_id: battlefrontId,
            user_id: userId,
            title,
            attack_date: attackDate,
            due_date: dueDate,
            duration_minutes: durationMinutes,
            status: 'NOT_DONE',
          })
          .select()
          .single();

        if (missionError) throw missionError;

        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + durationMinutes);

        const { data: event, error: eventError } = await supabase
          .from('calendar_events')
          .insert({
            user_id: userId,
            mission_id: mission.id,
            battlefront_id: battlefrontId,
            title,
            start_time: startTime,
            end_time: endTime.toISOString(),
            locked: false,
          })
          .select()
          .single();

        if (eventError) throw eventError;

        return NextResponse.json({ success: true, ok: true, mission, event });
      }

      default:
        return NextResponse.json({
          ok: false,
          error: 'Unknown action'
        }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Action error:', error);
    console.error('Stack:', error.stack);
    return NextResponse.json({
      ok: false,
      error: error.message || 'Failed to execute action',
      details: error.stack
    }, { status: 500 });
  }
}
