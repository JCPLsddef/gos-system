import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-api';
import { authenticateRequest } from '@/lib/api-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { battlefrontId, title } = body;

    if (!battlefrontId || !title) {
      return NextResponse.json({
        ok: false,
        error: 'battlefrontId and title are required'
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

    const { data: checkpoint, error } = await supabase
      .from('checkpoints')
      .insert({
        user_id: userId,
        battlefront_id: battlefrontId,
        title,
        completed: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Create checkpoint error:', error);
      return NextResponse.json({
        ok: false,
        error: error.message
      }, { status: 500 });
    }

    return NextResponse.json({ success: true, ok: true, data: checkpoint });
  } catch (error: any) {
    console.error('Create checkpoint error:', error);
    console.error('Stack:', error.stack);
    return NextResponse.json({
      ok: false,
      error: error.message || 'Failed to create checkpoint',
      details: error.stack
    }, { status: 500 });
  }
}
