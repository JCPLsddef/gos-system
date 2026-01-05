import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-api';
import { authenticateRequest } from '@/lib/api-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, binaryExitTarget, status = 'ACTIVE' } = body;

    if (!name) {
      return NextResponse.json({
        ok: false,
        error: 'Name is required'
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

    const { data: battlefront, error } = await supabase
      .from('battlefronts')
      .insert({
        user_id: userId,
        name,
        binary_exit_target: binaryExitTarget,
        status,
      })
      .select()
      .single();

    if (error) {
      console.error('Create battlefront error:', error);
      return NextResponse.json({
        ok: false,
        error: error.message
      }, { status: 500 });
    }

    return NextResponse.json({ success: true, ok: true, data: battlefront });
  } catch (error: any) {
    console.error('Create battlefront error:', error);
    console.error('Stack:', error.stack);
    return NextResponse.json({
      ok: false,
      error: error.message || 'Failed to create battlefront',
      details: error.stack
    }, { status: 500 });
  }
}
