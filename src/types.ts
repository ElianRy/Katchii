export type Rarity = 'commun' | 'peu_commun' | 'rare' | 'elite' | 'legendaire';
export type LureType = 'rare' | 'epique' | 'legendaire' | 'shiny';
export type View = 'auth' | 'home' | 'hunt' | 'collection' | 'team' | 'admin' | 'lures' | 'quests' | 'duels' | 'raid' | 'wrapped' | 'profile' | 'zones' | 'pokepark' | 'settings' | 'clan' | 'backpack' | 'shop';

export type XpCandySize = 'petit' | 'moyen' | 'grand';

export type QuestType =
  | 'capture_n'
  | 'capture_rarity'
  | 'capture_shiny'
  | 'activate_lure'
  | 'duel_wins';

export interface DuelEntry {
  id: string;
  won: boolean;
  opponentName: string;
  opponentTeam: Array<{ pokemonId: number; isShiny: boolean }>;
  myTeam: Array<{ pokemonId: number; isShiny: boolean }>;
  myScore: number;
  opponentScore: number;
  date: string;
}

export interface DailyQuest {
  id: string;
  label: string;
  type: QuestType;
  rarity?: Rarity;
  target: number;
  progress: number;
  completed: boolean;
  reward: { points: number; fragments?: number };
  rewardClaimed: boolean;
}

export interface PokemonData {
  id: number;
  name: string; // French name
  rarity: Rarity;
}

export interface SpawnedPokemon {
  uid: string;
  pokemonId: number;
  characterId?: string; // for non-pokemon universes (e.g. 'n001')
  isShiny: boolean;
  spawnedAt: number;
  lifetime: number;
  x: number; // percentage 5-85
  y: number; // percentage 10-70
  vx: number; // wander velocity
  vy: number;
  capturing: boolean;
  captured: boolean;
}

export interface GameState {
  username?: string; // stored in cloud for leaderboard
  points: number;
  normalCollection: Record<number, number>; // pokemonId -> times caught
  shinyCollection: Record<number, number>;  // pokemonId -> times caught shiny
  fragments: Record<number, number>;        // pokemonId -> available fragments (dupes beyond 1st)
  lures: Record<LureType, number>;          // inventory count
  xpCandies?: Record<XpCandySize, number>;     // xp candy inventory
  cooldownReducers?: number;
  activeCooldownBoost?: { expiresAt: number };
  spawnNets?: number;
  activeSpawnBoost?: { expiresAt: number };
  attackBoostCharges?: number;
  mysteryCases?: number;
  activeLure: { type: LureType; expiresAt: number } | null;
  globalCooldownUntil: number | null;       // timestamp ms
  shinyDepleted: number[];                  // pokemonIds caught as shiny
  badges: string[];                         // earned badge IDs
  dailyQuests: {
    date: string;
    quests: DailyQuest[];
  };
  duels: {
    wins: number;
    losses: number;
    streak: number;
    rankingPoints: number;
    history: DuelEntry[];
  };
  showcase: Array<{ pokemonId: number; isShiny: boolean }>;
  favoritePokemon: { pokemonId: number; isShiny: boolean } | null;
  raid: {
    bossId: number;
    bossMaxHp: number;
    bossCurrentHp: number;
    weekId: string;
    playerDamage: number;
    playerAttackedToday: boolean;
    lastAttackDate: string;
    completed: boolean;
    rewardClaimed: boolean;
    simulatedParticipants: number;
  } | null;
  zoneProgress: {
    currentZoneId: string;
    unlockedZones: string[];
    bossDefeated: Record<string, boolean>;
    pokemonCaughtInZone: Record<string, number[]>;
  };
  stats: {
    totalPlayTimeMs: number;
    sessionStartTime: number | null;
    firstPlayedAt: number;
  };
  pokemonLevels: Record<number, { level: number; xp: number }>;
  savedTeams?: Array<{ id: string; name: string; members: Array<{ pokemonId: number; isShiny?: boolean; level: number; xp: number; currentHp: number; maxHp: number }> }>;
  favoriteTeamId?: string;
  playerXp: number;
  pokemonCaptureCount: Record<number, number>;
  shinyCapturesTotal: number;
  pokemonWins?: Record<number, number>;
  trainingBattlesTotal?: number;
  trainingBattlesByZone?: Record<string, number>;
  questsCompletedTotal?: number;
  questsBaselineAtUnlock?: Record<string, number>;
  achievementsCompleted?: string[];
  lastParkXpAt?: number | null;
  parkElo?: number;
  parkDuelRecord?: { totalWins: number; totalLosses: number };
  // key = "YYYY-MM-DD:userId", value = fight count today
  parkFightLog?: Record<string, number>;
  forcePasswordChange?: string; // temp password set by admin — forces change on next login
}

export type ZoneUnlockCondition =
  | { type: 'total_pokemon'; count: number }
  | { type: 'daily_quests_completed'; count: number }
  | { type: 'capture_n_times'; pokemonId: number; count: number }
  | { type: 'duel_wins'; count: number }
  | { type: 'training_battles'; count: number }
  | { type: 'pokemon_level_in_team'; level: number }
  | { type: 'shiny_captures'; count: number };

export const RARITY_COLORS: Record<Rarity, string> = {
  commun: '#6b7280',
  peu_commun: '#22c55e',
  rare: '#3b82f6',
  elite: '#a855f7',
  legendaire: '#f59e0b',
};

export const RARITY_LABELS: Record<Rarity, string> = {
  commun: 'Niveau 1 — Commun',
  peu_commun: 'Niveau 2 — Peu commun',
  rare: 'Niveau 3 — Rare',
  elite: 'Niveau 4 — Épique',
  legendaire: 'Niveau 5 — Légendaire',
};

export const RARITY_WEIGHTS: Record<Rarity, number> = {
  commun: 50,
  peu_commun: 8,
  rare: 2,
  elite: 1,
  legendaire: 0.3,
};

// PokéCoins earned on first capture
export const FIRST_CAPTURE_POINTS: Record<Rarity, number> = {
  commun:      15,
  peu_commun:  35,
  rare:        70,
  elite:       120,
  legendaire:  250,
};

// PokéCoins earned on duplicate capture
export const DUPLICATE_CAPTURE_POINTS: Record<Rarity, number> = {
  commun:     5,
  peu_commun: 10,
  rare:       20,
  elite:      35,
  legendaire: 75,
};

// Shiny multiplier on first shiny capture coins
export const SHINY_COINS_MULT = 3;

// PokéCoins earned from various actions
export const COINS_TRAINING_WIN = 10;
export const COINS_BOSS_DEFEAT  = 80;
export const COINS_BOSS_ATTEMPT = 20; // even on loss

export const LURE_COSTS: Record<LureType, number> = {
  rare:       150,
  epique:     300,
  legendaire: 600,
  shiny:      450,
};

export const XP_CANDY_COSTS: Record<XpCandySize, number> = {
  petit: 60,
  moyen: 200,
  grand: 800,
};

export const COOLDOWN_REDUCER_COST  = 250;
export const SPAWN_NET_COST         = 200;
export const SPAWN_NET_DURATION_MS  = 5 * 60_000;
export const ATTACK_BOOST_COST      = 300;
export const MYSTERY_CASE_COST      = 600;
export const COOLDOWN_REDUCED_MS   = 10_000; // 10 seconds
export const COOLDOWN_BOOST_DURATION_MS = 10 * 60_000; // 10 min

export const LURE_LABELS: Record<LureType, string> = {
  rare: 'Leurre Rare',
  epique: 'Leurre Épique',
  legendaire: 'Leurre Légendaire',
  shiny: 'Leurre Shiny',
};
