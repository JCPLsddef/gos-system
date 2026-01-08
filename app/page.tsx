import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { isPreviewMode, logCurrentMode } from '@/lib/preview-mode';

export default async function Home() {
  // PREVIEW MODE: Rediriger directement vers dashboard pour afficher l'UI
  // Le mock user dans auth-context + le bypass middleware permettent l'accès
  if (isPreviewMode()) {
    logCurrentMode('RootPage');
    console.log('🎨 Preview Mode - Redirect vers /dashboard/warmap');
    redirect('/dashboard/warmap');
  }

  // PRODUCTION MODE: Auth check normale
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
