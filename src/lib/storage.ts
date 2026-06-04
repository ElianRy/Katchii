import { GameState } from '../types';

const STORAGE_KEY = 'animeverse_hunt_state';

export const DEFAULT_STATE: GameState = {
  points: 0,
  normalCollection: {},
  shinyCollection: {},
  fragments: {},
  lures: { rare: 0, epique: 0, legendaire: 0, shiny: 0 },
  activeLure: null,
  globalCooldownUntil: null,
  shinyDepleted: [],
};

export function loadState(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw) as Partial<GameState>;
    return {
      points: parsed.points ?? 0,
      normalCollection: parsed.normalCollection ?? {},
      shinyCollection: parsed.shinyCollection ?? {},
      fragments: parsed.fragments ?? {},
      lures: parsed.lures ?? { rare: 0, epique: 0, legendaire: 0, shiny: 0 },
      activeLure: parsed.activeLure ?? null,
      globalCooldownUntil: parsed.globalCooldownUntil ?? null,
      shinyDepleted: parsed.shinyDepleted ?? [],
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveState(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Silently fail if localStorage not available
  }
}
