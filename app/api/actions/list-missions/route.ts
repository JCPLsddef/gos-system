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

    const { data: missions, error } = await supabase
      .from('missions')
      .select(`
        *,
        battlefront:battlefronts(id, name, status)
      `)
      .eq('user_id', userId)
      .order('due_date', { ascending: true });

    if (error) {
      console.error('List missions error:', error);
      return NextResponse.json({
        ok: false,
        error: error.message
      }, { status: 500 });
    }

    return NextResponse.json({ success: true, ok: true, data: missions || [] });
  } catch (error: any) {
    console.error('List missions error:', error);
    console.error('Stack:', error.stack);
    return NextResponse.json({
      ok: false,
      error: error.message || 'Failed to list missions',
      details: error.stack
    }, { status: 500 });
  }
}
