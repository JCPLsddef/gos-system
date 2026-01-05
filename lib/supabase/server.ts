import { createClient } from '@supabase/supabase-js';

export function createSupabaseServerClient(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Create standard client without SSR dependencies
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return client;
}

export function extractAuthToken(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  try {
    // Supabase auth token cookie pattern: sb-<project-ref>-auth-token
    const cookies = cookieHeader.split('; ');
    const authCookie = cookies.find(c => c.includes('sb-') && c.includes('-auth-token'));

    if (!authCookie) return null;

    const cookieValue = authCookie.split('=')[1];
    if (!cookieValue) return null;

    // Decode and parse the session
    const decoded = decodeURIComponent(cookieValue);
    const session = JSON.parse(decoded);

    return session.access_token || null;
  } catch (e) {
    console.error('Failed to extract auth token:', e);
    return null;
  }
}
