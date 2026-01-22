'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClientSupabaseClient } from '@/lib/supabase-client';
import { signOut as signOutAuth } from '@/lib/auth';
import { getProfile } from '@/lib/profiles';
import { getCachedProfile, setCachedProfile, clearProfileCache } from '@/lib/profile-cache';
import type { UserProfile } from '@/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<{ success: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;
}

const AuthContextData = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      if (user) {
        // 尝试从缓存获取
        const cached = getCachedProfile();
        if (cached) {
          setProfile({
            id: user.id,
            email: cached.email,
            full_name: cached.full_name,
            created_at: '',
            updated_at: '',
          });
          return;
        }

        const data = await getProfile(user.id);
        if (data) {
          setProfile(data);
          setCachedProfile({ email: data.email, full_name: data.full_name });
        }
      } else {
        setProfile(null);
      }
    };
    loadProfile();
  }, [user?.id]);

  const refreshProfile = async () => {
    if (user) {
      const data = await getProfile(user.id);
      if (data) {
        setProfile(data);
        setCachedProfile({ email: data.email, full_name: data.full_name });
      }
    }
  };

  useEffect(() => {
    const supabase = createClientSupabaseClient();

    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
      
      // 退出时清除缓存
      if (_event === 'SIGNED_OUT' && session === null) {
        clearProfileCache();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const supabase = createClientSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  };

  const signUp = async (email: string, password: string) => {
    const supabase = createClientSupabaseClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: email,
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  };

  return (
    <AuthContextData.Provider value={{ user, session, profile, isLoading, signIn, signUp, signOut: signOutAuth, refreshProfile }}>
      {children}
    </AuthContextData.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContextData);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}