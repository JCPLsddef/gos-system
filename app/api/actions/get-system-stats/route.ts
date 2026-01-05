import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-api';
import { authenticateRequest } from '@/lib/api-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { userId, error: authError } = await authenticateRequest(request);

    if (authError || !userId) {
      return NextResponse.json({
        ok: false,
        error: authError || 'Authentication required'
      }, { status: 401 });
    }

    const supabase = createServiceClient();

    const [battlefrontsRes, missionsRes, eventsRes] = await Promise.all([
      supabase.from('battlefronts').select('*').eq('user_id', userId),
      supabase.from('missions').select('*').eq('user_id', userId),
      supabase.from('calendar_events').select('*').eq('user_id', userId),
    ]);

    if (battlefrontsRes.error) throw battlefrontsRes.error;
    if (missionsRes.error) throw missionsRes.error;
    if (eventsRes.error) throw eventsRes.error;

    const battlefronts = battlefrontsRes.data || [];
    const missions = missionsRes.data || [];
    const events = eventsRes.data || [];

    const stats = {
      battlefronts: {
        total: battlefronts.length,
        active: battlefronts.filter(b => b.status === 'ACTIVE').length,
        won: battlefronts.filter(b => b.status === 'WON').length,
        collapsing: battlefronts.filter(b => b.status === 'COLLAPSING').length,
      },
      missions: {
        total: missions.length,
        done: missions.filter(m => m.status === 'DONE').length,
        notDone: missions.filter(m => m.status === 'NOT_DONE').length,
        scheduled: missions.filter(m => events.some(e => e.mission_id === m.id)).length,
      },
      calendar: {
        totalEvents: events.length,
      },
    };

    return NextResponse.json({ success: true, ok: true, data: stats });
  } catch (error: any) {
    console.error('Get system stats error:', error);
    console.error('Stack:', error.stack);
    return NextResponse.json({
      ok: false,
      error: error.message || 'Failed to get system stats',
      details: error.stack
    }, { status: 500 });
  }
}
