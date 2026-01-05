import 'server-only';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function createAPIClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'sb-api-temp',
    },
    global: {
      headers: {}
    }
  });
}

export function createServiceClient() {
  const keyToUse = supabaseServiceKey || supabaseAnonKey;

  if (!supabaseServiceKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not found, falling back to anon key. Some operations may be restricted.');
  }

  return createClient(supabaseUrl, keyToUse, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: undefined,
      storageKey: undefined,
    },
    global: {
      headers: {}
    }
  });
}

export async function verifyToken(token: string): Promise<{ userId: string | null; error: string | null }> {
  try {
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storage: undefined,
      },
      global: {
        headers: {}
      }
    });

    const { data, error } = await client.auth.getUser(token);

    if (error || !data.user) {
      return { userId: null, error: error?.message || 'Invalid token' };
    }

    return { userId: data.user.id, error: null };
  } catch (err: any) {
    return { userId: null, error: err.message };
  }
}
