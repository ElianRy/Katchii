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
