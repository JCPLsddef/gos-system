import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Use @supabase/ssr's createBrowserClient for consistency with middleware
// This ensures cookies are managed the same way on both client and server
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
