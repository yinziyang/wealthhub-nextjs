import { createClientSupabaseClient } from './supabase-client';
import type { UserProfile } from '@/types';

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const supabase = createClientSupabaseClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return data as UserProfile;
}

export async function updateProfile(
  userId: string,
  data: { full_name?: string; avatar_url?: string }
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClientSupabaseClient();
  const { error } = await supabase
    .from('profiles')
    .update(data)
    .eq('id', userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}