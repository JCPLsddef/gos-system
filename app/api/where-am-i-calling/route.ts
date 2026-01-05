import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  let supabaseHost = null;
  try {
    if (supabaseUrl) {
      const url = new URL(supabaseUrl);
      supabaseHost = url.hostname;
    }
  } catch (e) {
    supabaseHost = 'INVALID_URL_FORMAT';
  }

  return NextResponse.json({
    ok: true,
    supabaseUrlPresent: !!supabaseUrl,
    supabaseHost,
    anonKeyPresent: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    environment: process.env.NODE_ENV,
    // DO NOT LOG ACTUAL SECRETS
    diagnostics: {
      message: supabaseUrl 
        ? 'Supabase URL is configured' 
        : '⚠️ NEXT_PUBLIC_SUPABASE_URL is missing',
    }
  });
}
