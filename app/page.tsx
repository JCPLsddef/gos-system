import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export default async function Home() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // PREVIEW-SAFE: If env vars missing, redirect to login to show UI
  // Production always has these vars, so this only affects preview environments
  if (!supabaseUrl || !supabaseAnonKey) {
    redirect('/login');
  }

  // Server-side auth check using cookies
  const cookieStore = cookies();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // The `setAll` method is called from Server Components which do not support modifying cookies
        }
      },
    },
  });

  // Check authentication server-side
  const { data: { session } } = await supabase.auth.getSession();

  // Deterministic redirect based on auth state
  if (session) {
    // Authenticated: go directly to war map (skip intermediate /dashboard)
    redirect('/dashboard/warmap');
  } else {
    // Not authenticated: go to login
    redirect('/login');
  }
}
