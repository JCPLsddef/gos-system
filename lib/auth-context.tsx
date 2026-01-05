'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
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
    console.log('🔐 Attempting login for:', email);
    
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log('📊 Login response:', { 
      hasError: !!error, 
      errorMessage: error?.message,
      hasSession: !!data?.session,
      hasUser: !!data?.user,
      userId: data?.user?.id 
    });

    if (!error && data?.session) {
      console.log('✅ Login successful! Redirecting to dashboard...');
      
      // Force a hard navigation to ensure cookies are sent
      window.location.href = '/dashboard';
    } else {
      console.error('❌ Login failed:', error?.message || 'No session created');
    }

    return { error };
  };

  const signUp = async (email: string, password: string) => {
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

      router.push('/dashboard');
    }

    return { error };
  };

  const signOut = async () => {
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
