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
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { error } = await supabase
        .from('game_saves')
        .upsert(
          { user_id: userId, state, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        );
      if (!error) return;
      console.error('[cloudSync] save error:', error.message);
    } catch (e) {
      console.error('[cloudSync] save exception:', e);
    }
    await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
  }
}
