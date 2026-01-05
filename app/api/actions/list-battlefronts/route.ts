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

    const { data: battlefronts, error } = await supabase
      .from('battlefronts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('List battlefronts error:', error);
      return NextResponse.json({
        ok: false,
        error: error.message
      }, { status: 500 });
    }

    return NextResponse.json({ success: true, ok: true, data: battlefronts || [] });
  } catch (error: any) {
    console.error('List battlefronts error:', error);
    console.error('Stack:', error.stack);
    return NextResponse.json({
      ok: false,
      error: error.message || 'Failed to list battlefronts',
      details: error.stack
    }, { status: 500 });
  }
}
