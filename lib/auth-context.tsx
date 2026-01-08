'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, getSupabaseOrNull } from './supabase';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // PREVIEW-SAFE: If Supabase is not available (missing env vars), skip auth
    if (!getSupabaseOrNull()) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    // PREVIEW-SAFE: Return error if Supabase not available
    if (!getSupabaseOrNull()) {
      return { error: new Error('Supabase not configured') };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error) {
      // Ensure session is fully set before redirect (critical for mobile)
      await supabase.auth.getSession();

      // Sync server-side session state
      router.refresh();

      // Small delay to ensure cookies are written and readable by middleware
      await new Promise(resolve => setTimeout(resolve, 200));

      // Navigate to dashboard
      router.push('/dashboard');
    }

    return { error };
  };

  const signUp = async (email: string, password: string) => {
    // PREVIEW-SAFE: Return error if Supabase not available
    if (!getSupabaseOrNull()) {
      return { error: new Error('Supabase not configured') };
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (!error) {
      const user = (await supabase.auth.getUser()).data.user;
      if (user) {
        await supabase
          .from('user_settings')
          .insert({
            user_id: user.id,
            grand_strategy: '',
          })
          .select()
          .maybeSingle();
      }

      // Ensure session is fully set before redirect (critical for mobile)
      await supabase.auth.getSession();

      // Sync server-side session state
      router.refresh();

      // Small delay to ensure cookies are written and readable by middleware
      await new Promise(resolve => setTimeout(resolve, 200));

      // Navigate to dashboard
      router.push('/dashboard');
    }

    return { error };
  };

  const signOut = async () => {
    // PREVIEW-SAFE: Skip if Supabase not available
    if (!getSupabaseOrNull()) return;

    await supabase.auth.signOut();
    router.push('/');
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
