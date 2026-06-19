import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL ?? '';
const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY ?? '';

export const adminClient = serviceRoleKey
  ? createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

// Fixed UUID reserved for the throne row (not a real auth user)
const THRONE_UUID = '00000000-0000-0000-0000-000000000001';

// Throne operations — use service role to bypass RLS, fall back to anon client
export async function throneRead() {
  const { supabase: fallback } = await import('./supabase');
  const client = adminClient ?? fallback;
  const { data } = await client.from('game_saves').select('state').eq('user_id', THRONE_UUID).single();
  return data?.state ?? null;
}

export async function throneWrite(state: unknown): Promise<string | null> {
  const { supabase: fallback } = await import('./supabase');
  const client = adminClient ?? fallback;
  const { error } = await client.from('game_saves').upsert({ user_id: THRONE_UUID, state, updated_at: new Date().toISOString() });
  return error ? error.message : null;
}

export async function throneReadAllPlayers(): Promise<string[]> {
  // Use admin client if available, otherwise fall back to regular client (RLS allows reads for auth'd users)
  const { supabase: fallback } = await import('./supabase');
  const client = adminClient ?? fallback;
  const { data } = await client.from('game_saves').select('state').neq('user_id', THRONE_UUID);
  if (!data) return [];
  return data
    .map(row => {
      const s = row.state as { username?: string } | null;
      return s?.username ?? null;
    })
    .filter((u): u is string => !!u)
    .sort((a, b) => a.localeCompare(b));
}


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
