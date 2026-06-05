import { GameState } from '../types';
import { pickDailyQuests, todayDate } from '../data/quests';

const STORAGE_KEY = 'katchii_state';
const userKey = (userId: string) => `katchii_state_u_${userId}`;

function buildDailyQuests() {
  const date = todayDate();
  const defs = pickDailyQuests(date);
  return {
    date,
    quests: defs.map((d) => ({
      id: d.id,
      label: d.label,
      type: d.type,
      rarity: d.rarity,
      target: d.target,
      progress: 0,
      completed: false,
      reward: d.reward,
      rewardClaimed: false,
    })),
  };
}

export const DEFAULT_STATE: GameState = {
  points: 0,
  normalCollection: {},
  shinyCollection: {},
  fragments: {},
  lures: { rare: 0, epique: 0, legendaire: 0, shiny: 0 },
  activeLure: null,
  globalCooldownUntil: null,
  shinyDepleted: [],
  badges: [],
  dailyQuests: buildDailyQuests(),
  duels: {
    wins: 0,
    losses: 0,
    streak: 0,
    rankingPoints: 0,
    history: [],
  },
  village: {
    level: 1,
    name: 'Mon Village',
    showcase: [],
    favoritePokemon: null,
  },
  skins: {
    unlockedTerrains: ['foret'],
    activeTerrain: 'foret',
  },
  fusions: [],
  raid: null,
  activeUniverse: 'pokemon',
  narutoCollection: {},
  narutoShinyCollection: {},
  narutoShinyDepleted: [],
  zoneProgress: {
    currentZoneId: 'zone1',
    unlockedZones: ['zone1'],
    bossDefeated: {},
    pokemonCaughtInZone: {},
  },
  stats: {
    totalPlayTimeMs: 0,
    sessionStartTime: null,
    firstPlayedAt: Date.now(),
  },
  pokemonLevels: {},
  playerXp: 0,
};

function parseState(raw: string): GameState {
  const parsed = JSON.parse(raw) as Partial<GameState>;
  const today = todayDate();
  let dailyQuests = parsed.dailyQuests ?? null;
  if (!dailyQuests || dailyQuests.date !== today) {
    dailyQuests = buildDailyQuests();
  }
  return {
    points: parsed.points ?? 0,
    normalCollection: parsed.normalCollection ?? {},
    shinyCollection: parsed.shinyCollection ?? {},
    fragments: parsed.fragments ?? {},
    lures: parsed.lures ?? { rare: 0, epique: 0, legendaire: 0, shiny: 0 },
    activeLure: parsed.activeLure ?? null,
    globalCooldownUntil: parsed.globalCooldownUntil ?? null,
    shinyDepleted: parsed.shinyDepleted ?? [],
    badges: parsed.badges ?? [],
    dailyQuests,
    duels: parsed.duels ?? { wins: 0, losses: 0, streak: 0, rankingPoints: 0, history: [] },
    village: parsed.village ?? { level: 1, name: 'Mon Village', showcase: [], favoritePokemon: null },
    skins: parsed.skins ?? { unlockedTerrains: ['foret'], activeTerrain: 'foret' },
    fusions: parsed.fusions ?? [],
    raid: parsed.raid ?? null,
    activeUniverse: parsed.activeUniverse ?? 'pokemon',
    narutoCollection: parsed.narutoCollection ?? {},
    narutoShinyCollection: parsed.narutoShinyCollection ?? {},
    narutoShinyDepleted: parsed.narutoShinyDepleted ?? [],
    zoneProgress: parsed.zoneProgress ?? {
      currentZoneId: 'zone1',
      unlockedZones: ['zone1'],
      bossDefeated: {},
      pokemonCaughtInZone: {},
    },
    stats: parsed.stats ?? { totalPlayTimeMs: 0, sessionStartTime: null, firstPlayedAt: Date.now() },
    pokemonLevels: parsed.pokemonLevels ?? {},
    playerXp: parsed.playerXp ?? 0,
  };
}

/** Load generic (legacy) state — used only for initial useState before userId is known */
export function loadState(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    return parseState(raw);
  } catch {
    return { ...DEFAULT_STATE };
  }
}

/** Load state scoped to a specific user. Returns null if nothing found. */
export function loadUserState(userId: string): GameState | null {
  try {
    const raw = localStorage.getItem(userKey(userId));
    if (raw) return parseState(raw);
    // Last-resort migration: use generic key only if it has real data (>0 pokemon)
    const legacy = localStorage.getItem(STORAGE_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as Partial<GameState>;
      const hasPokemon = Object.values(parsed.normalCollection ?? {}).some(v => v > 0);
      if (hasPokemon) return parseState(legacy);
    }
    return null;
  } catch {
    return null;
  }
}

/** Save state scoped to the current user (+ generic key for backwards compat) */
export function saveUserState(userId: string, state: GameState): void {
  try {
    const json = JSON.stringify(state);
    localStorage.setItem(userKey(userId), json);
    localStorage.setItem(STORAGE_KEY, json); // keep generic in sync as legacy fallback
  } catch {
    // Silently fail if localStorage not available
  }
}

/** Save to generic key only (used before userId is known) */
export function saveState(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('katchii_last_view');
  } catch {}
}
