import { createClientSupabaseClient } from './supabase-client';
import type { User } from '@supabase/supabase-js';

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

export async function signUp(
  email: string,
  password: string
): Promise<AuthResult> {
  const supabase = createClientSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, user: data.user || undefined };
}

export async function signIn(
  email: string,
  password: string
): Promise<AuthResult> {
  const supabase = createClientSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, user: data.user || undefined };
}

export async function signOut(): Promise<{ success: boolean; error?: string }> {
  const supabase = createClientSupabaseClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function getSession() {
  const supabase = createClientSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  
  if (error) {
    return null;
  }

  return data.session;
}