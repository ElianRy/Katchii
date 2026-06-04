import { GameState } from '../types';
import { pickDailyQuests, todayDate } from '../data/quests';

const STORAGE_KEY = 'katchii_state';

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
};

export function loadState(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
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
      duels: parsed.duels ?? {
        wins: 0,
        losses: 0,
        streak: 0,
        rankingPoints: 0,
        history: [],
      },
      village: parsed.village ?? {
        level: 1,
        name: 'Mon Village',
        showcase: [],
        favoritePokemon: null,
      },
      skins: parsed.skins ?? {
        unlockedTerrains: ['foret'],
        activeTerrain: 'foret',
      },
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
      stats: parsed.stats ?? {
        totalPlayTimeMs: 0,
        sessionStartTime: null,
        firstPlayedAt: Date.now(),
      },
      pokemonLevels: parsed.pokemonLevels ?? {},
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
