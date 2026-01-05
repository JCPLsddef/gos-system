import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// DEV-only diagnostics (NEVER log actual secrets)
if (process.env.NODE_ENV === 'development') {
  if (!supabaseUrl) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL is missing');
  } else {
    console.log('✅ Supabase URL configured:', new URL(supabaseUrl).hostname);
  }
  
  if (!supabaseAnonKey) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is missing');
  } else {
    console.log('✅ Supabase Anon Key configured (length:', supabaseAnonKey.length, ')');
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
