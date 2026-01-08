import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// PREVIEW-SAFE: Create Supabase client only if env vars are present
// In production, these are always set. In preview (Bolt.new), they may be missing.
const supabaseInstance: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createBrowserClient(supabaseUrl, supabaseAnonKey)
    : null;

// Export with non-null assertion for backward compatibility
// This is safe because:
// 1. Production (Vercel) always has env vars → supabase is always initialized
// 2. Middleware skips auth check when env vars missing → no Supabase calls
// 3. Auth context has explicit null checks before using Supabase
// 4. Protected routes won't execute without valid session
export const supabase = supabaseInstance as SupabaseClient;

// Helper to check if Supabase is available (for explicit checks)
export const isSupabaseAvailable = (): boolean => supabaseInstance !== null;

// Helper for safer access in components that need explicit checking
export const getSupabaseOrNull = (): SupabaseClient | null => supabaseInstance;
