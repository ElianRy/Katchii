import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL ?? '';
const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY ?? '';

const adminClient = serviceRoleKey
  ? createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

export async function adminResetPassword(userId: string): Promise<{ error: string | null }> {
  if (!adminClient) return { error: 'Clé service role manquante (VITE_SUPABASE_SERVICE_ROLE_KEY).' };
  const { error } = await adminClient.auth.admin.updateUserById(userId, { password: 'katchii2026' });
  if (error) return { error: error.message };
  return { error: null };
}

export async function adminDeleteUserFully(userId: string): Promise<{ error: string | null }> {
  if (!adminClient) return { error: 'Clé service role manquante (VITE_SUPABASE_SERVICE_ROLE_KEY).' };
  // Delete auth account permanently
  const { error } = await adminClient.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };
  return { error: null };
}

export async function adminBanUser(userId: string): Promise<{ error: string | null }> {
  // Try hard delete first
  const del = await adminDeleteUserFully(userId);
  if (!del.error) return { error: null };
  // Fallback: ban duration so they can't log in
  if (!adminClient) return { error: null };
  const { error } = await adminClient.auth.admin.updateUserById(userId, { ban_duration: '876600h' });
  if (error) return { error: error.message };
  return { error: null };
}
