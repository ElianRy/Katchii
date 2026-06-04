import { GameState } from '../types';
import { supabase } from './supabase';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
type StatusListener = (s: SaveStatus) => void;
const listeners = new Set<StatusListener>();
export function onSaveStatus(fn: StatusListener): () => void { listeners.add(fn); return () => { listeners.delete(fn); }; }
function emit(s: SaveStatus) { listeners.forEach(fn => fn(s)); }

export async function loadCloudState(userId: string): Promise<GameState | null> {
  try {
    const { data, error } = await supabase
      .from('game_saves')
      .select('state')
      .eq('user_id', userId)
      .single();
    if (error || !data) return null;
    return data.state as GameState;
  } catch {
    return null;
  }
}

export async function saveCloudState(userId: string, state: GameState): Promise<void> {
  emit('saving');
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      // upsert with primary key conflict — works when user_id is PK
      const { error: upsertError } = await supabase
        .from('game_saves')
        .upsert({ user_id: userId, state, updated_at: new Date().toISOString() });

      if (!upsertError) { emit('saved'); return; }
      console.error('[cloudSync] upsert error:', upsertError.message);

      // Fallback: explicit update then insert
      const { data: updated, error: upErr } = await supabase
        .from('game_saves')
        .update({ state, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .select('user_id');

      if (!upErr && updated && updated.length > 0) { emit('saved'); return; }

      const { error: insErr } = await supabase
        .from('game_saves')
        .insert({ user_id: userId, state, updated_at: new Date().toISOString() });

      if (!insErr) { emit('saved'); return; }
      console.error('[cloudSync] insert error:', insErr.message);
    } catch (e) {
      console.error('[cloudSync] exception:', e);
    }
    await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
  }
  emit('error');
}
