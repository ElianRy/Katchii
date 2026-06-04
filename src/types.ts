export type Rarity = 'commun' | 'peu_commun' | 'rare' | 'elite' | 'legendaire';
export type LureType = 'rare' | 'epique' | 'legendaire' | 'shiny';
export type View = 'hunt' | 'collection' | 'lures';

export interface PokemonData {
  id: number;
  name: string; // French name
  rarity: Rarity;
}

export interface SpawnedPokemon {
  uid: string;
  pokemonId: number;
  isShiny: boolean;
  spawnedAt: number;
  lifetime: number;
  x: number; // percentage 5-85
  y: number; // percentage 10-70
  capturing: boolean;
  captured: boolean;
}

export interface GameState {
  points: number;
  normalCollection: Record<number, number>; // pokemonId -> times caught
  shinyCollection: Record<number, number>;  // pokemonId -> times caught shiny
  fragments: Record<number, number>;        // pokemonId -> available fragments (dupes beyond 1st)
  lures: Record<LureType, number>;          // inventory count
  activeLure: { type: LureType; expiresAt: number } | null;
  globalCooldownUntil: number | null;       // timestamp ms
  shinyDepleted: number[];                  // pokemonIds caught as shiny
}

export const RARITY_COLORS: Record<Rarity, string> = {
  commun: '#9ca3af',
  peu_commun: '#22c55e',
  rare: '#3b82f6',
  elite: '#a855f7',
  legendaire: '#f59e0b',
};

export const RARITY_LABELS: Record<Rarity, string> = {
  commun: 'Commun',
  peu_commun: 'Peu commun',
  rare: 'Rare',
  elite: 'Élite',
  legendaire: 'Légendaire',
};

export const RARITY_WEIGHTS: Record<Rarity, number> = {
  commun: 50,
  peu_commun: 28,
  rare: 14,
  elite: 6,
  legendaire: 1,
};

export const FIRST_CAPTURE_POINTS: Record<Rarity, number> = {
  commun: 10,
  peu_commun: 20,
  rare: 20,
  elite: 30,
  legendaire: 50,
};

export const LURE_COSTS: Record<LureType, number> = {
  rare: 30,
  epique: 50,
  legendaire: 100,
  shiny: 75,
};

export const LURE_LABELS: Record<LureType, string> = {
  rare: 'Leurre Rare',
  epique: 'Leurre Épique',
  legendaire: 'Leurre Légendaire',
  shiny: 'Leurre Shiny',
};
