import { GameState } from '../types';
import { supabase } from './supabase';

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
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      // Try UPDATE first — works even if RLS only allows UPDATE for own rows
      const { data: updated, error: updateError } = await supabase
        .from('game_saves')
        .update({ state, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .select('user_id');

      if (!updateError && updated && updated.length > 0) return; // success

      if (updateError) console.error('[cloudSync] update error:', updateError.message);

      // No row existed — INSERT
      const { error: insertError } = await supabase
        .from('game_saves')
        .insert({ user_id: userId, state, updated_at: new Date().toISOString() });

      if (!insertError) return;
      console.error('[cloudSync] insert error:', insertError.message);
    } catch (e) {
      console.error('[cloudSync] save exception:', e);
    }
    await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
  }
}
