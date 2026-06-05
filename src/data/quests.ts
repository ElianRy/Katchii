import { Rarity } from '../types';

export type QuestType =
  | 'capture_n'
  | 'capture_rarity'
  | 'capture_shiny'
  | 'activate_lure'
  | 'duel_wins';

export type QuestDifficulty = 'facile' | 'moyen' | 'difficile' | 'tres_difficile';

export interface QuestDefinition {
  id: string;
  label: string;
  type: QuestType;
  rarity?: Rarity;
  target: number;
  difficulty: QuestDifficulty;
  reward: { points: number; fragments?: number };
}

export const QUEST_POOL: QuestDefinition[] = [
  // Facile
  { id: 'capture_5',         label: 'Capture 5 Pokémon',             type: 'capture_n',      target: 5,  difficulty: 'facile',        reward: { points: 20 } },
  { id: 'capture_commun_5',  label: 'Capture 5 Pokémon communs',     type: 'capture_rarity', rarity: 'commun',     target: 5,  difficulty: 'facile',        reward: { points: 15 } },
  { id: 'activate_lure',     label: 'Active un leurre',              type: 'activate_lure',  target: 1,  difficulty: 'facile',        reward: { points: 20 } },
  { id: 'duel_wins_1',       label: 'Gagne 1 duel',                  type: 'duel_wins',      target: 1,  difficulty: 'facile',        reward: { points: 25 } },

  // Moyen
  { id: 'capture_10',        label: 'Capture 10 Pokémon',            type: 'capture_n',      target: 10, difficulty: 'moyen',         reward: { points: 40 } },
  { id: 'capture_commun_15', label: 'Capture 15 Pokémon communs',    type: 'capture_rarity', rarity: 'commun',     target: 15, difficulty: 'moyen',         reward: { points: 35 } },
  { id: 'capture_pc_3',      label: 'Capture 3 Pokémon peu communs', type: 'capture_rarity', rarity: 'peu_commun', target: 3,  difficulty: 'moyen',         reward: { points: 35 } },
  { id: 'duel_wins_3',       label: 'Gagne 3 duels',                 type: 'duel_wins',      target: 3,  difficulty: 'moyen',         reward: { points: 50 } },

  // Difficile
  { id: 'capture_20',        label: 'Capture 20 Pokémon',            type: 'capture_n',      target: 20, difficulty: 'difficile',     reward: { points: 65 } },
  { id: 'capture_pc_5',      label: 'Capture 5 Pokémon peu communs', type: 'capture_rarity', rarity: 'peu_commun', target: 5,  difficulty: 'difficile',     reward: { points: 55 } },
  { id: 'capture_rare_1',    label: 'Capture 1 Pokémon rare',        type: 'capture_rarity', rarity: 'rare',       target: 1,  difficulty: 'difficile',     reward: { points: 50 } },
  { id: 'duel_wins_5',       label: 'Gagne 5 duels',                 type: 'duel_wins',      target: 5,  difficulty: 'difficile',     reward: { points: 70 } },

  // Très difficile
  { id: 'capture_rare_3',    label: 'Capture 3 Pokémon rares',       type: 'capture_rarity', rarity: 'rare',       target: 3,  difficulty: 'tres_difficile', reward: { points: 90 } },
  { id: 'capture_elite_1',   label: 'Capture 1 Pokémon épique',      type: 'capture_rarity', rarity: 'elite',      target: 1,  difficulty: 'tres_difficile', reward: { points: 80 } },
  { id: 'capture_shiny_1',   label: 'Capture 1 Shiny',               type: 'capture_shiny',  target: 1,  difficulty: 'tres_difficile', reward: { points: 80 } },
];

// Seeded random from string seed
function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h ^= h >>> 16;
    return (h >>> 0) / 0x100000000;
  };
}

function pickFrom<T>(pool: T[], rng: () => number): T {
  const idx = Math.floor(rng() * pool.length);
  const item = pool[idx];
  pool.splice(idx, 1);
  return item;
}

export function pickDailyQuests(date: string, zoneId: string): QuestDefinition[] {
  const rng = seededRandom(`${date}__${zoneId}`);
  const pool = [...QUEST_POOL];
  const picked: QuestDefinition[] = [];

  // Zone 2: guarantee at least 1 très difficile quest
  if (zoneId === 'zone2') {
    const hardPool = pool.filter(q => q.difficulty === 'tres_difficile');
    if (hardPool.length > 0) {
      const hard = hardPool[Math.floor(rng() * hardPool.length)];
      pool.splice(pool.findIndex(q => q.id === hard.id), 1);
      picked.push(hard);
    }
  }

  // Fill remaining slots from the rest of the pool
  while (picked.length < 3 && pool.length > 0) {
    picked.push(pickFrom(pool, rng));
  }

  return picked;
}

export function todayDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
