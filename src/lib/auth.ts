// We use Supabase Auth but hide email from user.
// Email = ${username.toLowerCase()}@katchii.internal
// Username stored in user_metadata

import { supabase } from './supabase';

export async function registerUser(username: string, password: string): Promise<{ error: string | null }> {
  const email = `${username.toLowerCase()}@katchii.internal`;
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } }
  });
  if (error) {
    if (error.message.includes('already registered')) return { error: 'Ce pseudo est déjà utilisé.' };
    return { error: error.message };
  }
  return { error: null };
}

export async function loginUser(username: string, password: string): Promise<{ error: string | null }> {
  const email = `${username.toLowerCase()}@katchii.internal`;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: 'Pseudo ou mot de passe incorrect.' };
  return { error: null };
}

export async function logoutUser() {
  // Clear local state so next user starts fresh
  try { localStorage.removeItem('katchii_state'); localStorage.removeItem('katchii_last_view'); } catch { /* ignore */ }
  await supabase.auth.signOut();
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export function getUsername(user: { user_metadata?: { username?: string } } | null): string {
  return user?.user_metadata?.username ?? 'Joueur';
}
