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
  try {
    await supabase
      .from('game_saves')
      .upsert(
        { user_id: userId, state, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
  } catch {
    // fail silently — localStorage is the fallback
  }
}
