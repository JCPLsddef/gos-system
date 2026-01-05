import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-api';
import { authenticateRequest } from '@/lib/api-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { battlefrontId, title, attackDate, dueDate, durationMinutes = 60 } = body;

    if (!battlefrontId || !title || !dueDate) {
      return NextResponse.json({
        ok: false,
        error: 'battlefrontId, title, and dueDate are required'
      }, { status: 400 });
    }

    const { userId, error: authError } = await authenticateRequest(request);

    if (authError || !userId) {
      return NextResponse.json({
        ok: false,
        error: authError || 'Authentication required'
      }, { status: 401 });
    }

    const supabase = createServiceClient();

    const { data: mission, error } = await supabase
      .from('missions')
      .insert({
        user_id: userId,
        battlefront_id: battlefrontId,
        title,
        attack_date: attackDate || dueDate,
        due_date: dueDate,
        duration_minutes: durationMinutes,
        status: 'NOT_DONE',
      })
      .select()
      .single();

    if (error) {
      console.error('Create mission error:', error);
      return NextResponse.json({
        ok: false,
        error: error.message
      }, { status: 500 });
    }

    return NextResponse.json({ success: true, ok: true, data: mission });
  } catch (error: any) {
    console.error('Create mission error:', error);
    console.error('Stack:', error.stack);
    return NextResponse.json({
      ok: false,
      error: error.message || 'Failed to create mission',
      details: error.stack
    }, { status: 500 });
  }
}
