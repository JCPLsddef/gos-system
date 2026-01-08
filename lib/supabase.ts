import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Custom storage that falls back to cookies if localStorage is blocked (mobile)
const createMobileCompatibleStorage = () => {
  if (typeof window === 'undefined') return undefined;

  // Cookie-based storage fallback for mobile
  const cookieStorage = {
    getItem: (key: string): string | null => {
      if (typeof document === 'undefined') return null;
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === key) {
          return decodeURIComponent(value);
        }
      }
      return null;
    },
    setItem: (key: string, value: string): void => {
      if (typeof document === 'undefined') return;
      // Set cookie with 1 year expiration, SameSite=Lax for mobile compatibility
      const expires = new Date();
      expires.setFullYear(expires.getFullYear() + 1);
      document.cookie = `${key}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax; Secure`;
    },
    removeItem: (key: string): void => {
      if (typeof document === 'undefined') return;
      document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    },
  };

  // Try to use localStorage, fall back to cookies if blocked
  try {
    // Test if localStorage is accessible
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, 'test');
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch (e) {
    // localStorage is blocked (private mode, iOS, etc), use cookies
    console.warn('localStorage blocked, using cookie storage for mobile compatibility');
    return cookieStorage;
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'gos-auth-token',
    storage: createMobileCompatibleStorage(),
    flowType: 'pkce', // More secure for mobile
  },
});
