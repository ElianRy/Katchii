import { GameState, Rarity } from '../types';
import { pickDailyQuests, todayDate } from '../data/quests';
import { ZONE_BY_ID } from '../data/zones';
import { POKEMON_BY_ID } from '../data/gen1';

function zoneRarities(zoneId: string): Set<Rarity> {
  const zone = ZONE_BY_ID[zoneId];
  if (!zone) return new Set(['commun', 'peu_commun', 'rare', 'elite', 'legendaire'] as Rarity[]);
  return new Set(zone.pokemonIds.map(id => POKEMON_BY_ID[id]?.rarity).filter(Boolean) as Rarity[]);
}

const STORAGE_KEY = 'katchii_state';
const userKey = (userId: string) => `katchii_state_u_${userId}`;

function buildDailyQuests(zoneId = 'zone1') {
  const date = todayDate();
  const defs = pickDailyQuests(date, zoneId, zoneRarities(zoneId));
  return {
    date,
    zoneId,
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
  showcase: [],
  favoritePokemon: null,
  raid: null,
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
  pokemonCaptureCount: {},
  shinyCapturesTotal: 0,
  pokemonWins: {},
  trainingBattlesTotal: 0,
  questsCompletedTotal: 0,
  questsBaselineAtUnlock: {},
  achievementsCompleted: [],
  lastParkXpAt: null,
};

function parseState(raw: string): GameState {
  const parsed = JSON.parse(raw) as Partial<GameState>;
  const today = todayDate();
  const currentZoneId = parsed.zoneProgress?.currentZoneId ?? 'zone1';
  let dailyQuests = parsed.dailyQuests ?? null;
  if (!dailyQuests || dailyQuests.date !== today || (dailyQuests as typeof dailyQuests & { zoneId?: string }).zoneId !== currentZoneId) {
    dailyQuests = buildDailyQuests(currentZoneId);
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
    showcase: (parsed as GameState & { village?: { showcase?: GameState['showcase'] } }).showcase ?? (parsed as GameState & { village?: { showcase?: GameState['showcase'] } }).village?.showcase ?? [],
    favoritePokemon: parsed.favoritePokemon ?? (parsed as GameState & { village?: { favoritePokemon?: GameState['favoritePokemon'] } }).village?.favoritePokemon ?? null,
    raid: parsed.raid ?? null,
    zoneProgress: parsed.zoneProgress ?? {
      currentZoneId: 'zone1',
      unlockedZones: ['zone1'],
      bossDefeated: {},
      pokemonCaughtInZone: {},
    },
    stats: parsed.stats ?? { totalPlayTimeMs: 0, sessionStartTime: null, firstPlayedAt: Date.now() },
    pokemonLevels: parsed.pokemonLevels ?? {},
    playerXp: parsed.playerXp ?? 0,
    pokemonCaptureCount: parsed.pokemonCaptureCount ?? {},
    shinyCapturesTotal: parsed.shinyCapturesTotal ?? 0,
    pokemonWins: parsed.pokemonWins ?? {},
    trainingBattlesTotal: parsed.trainingBattlesTotal ?? 0,
    questsCompletedTotal: parsed.questsCompletedTotal ?? 0,
    achievementsCompleted: parsed.achievementsCompleted ?? [],
    lastParkXpAt: parsed.lastParkXpAt ?? null,
    questsBaselineAtUnlock: (() => {
      const baseline = parsed.questsBaselineAtUnlock ?? {};
      // Migration: for already-unlocked zones without a baseline, set baseline to current total
      // so quests completed before this system launched don't incorrectly count
      const total = parsed.questsCompletedTotal ?? 0;
      const unlocked = parsed.zoneProgress?.unlockedZones ?? ['zone1'];
      const migrated = { ...baseline };
      unlocked.forEach(zoneId => {
        if (zoneId !== 'zone1' && migrated[zoneId] === undefined) {
          migrated[zoneId] = total;
        }
      });
      return migrated;
    })(),
  };
}

/** Load generic (legacy) state — tries user-scoped keys first so UI doesn't flash empty on reload */
export function loadState(): GameState {
  try {
    // Try to find any user-scoped save (most recent one with actual pokemon)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('katchii_state_u_')) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<GameState>;
          const hasPokemon = Object.values(parsed.normalCollection ?? {}).some(v => (v as number) > 0);
          if (hasPokemon) return parseState(raw);
        }
      }
    }
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
    // One-time migration: use generic key only if it has real pokemon data,
    // then clear it so a subsequent different user can't inherit it.
    const legacy = localStorage.getItem(STORAGE_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as Partial<GameState>;
      const hasPokemon = Object.values(parsed.normalCollection ?? {}).some(v => v > 0);
      if (hasPokemon) {
        localStorage.removeItem(STORAGE_KEY); // consumed — prevent cross-user contamination
        return parseState(legacy);
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** Save state scoped to the current user only (no generic key to avoid cross-user contamination) */
export function saveUserState(userId: string, state: GameState): void {
  try {
    localStorage.setItem(userKey(userId), JSON.stringify(state));
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
