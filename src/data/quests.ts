import { Rarity } from '../types';

export type QuestType =
  | 'capture_n'
  | 'capture_rarity'
  | 'capture_shiny'
  | 'activate_lure';

export interface QuestDefinition {
  id: string;
  label: string;
  type: QuestType;
  rarity?: Rarity;
  target: number;
  reward: { points: number; fragments?: number };
}

export const QUEST_POOL: QuestDefinition[] = [
  { id: 'capture_5', label: 'Capture 5 Pokémon', type: 'capture_n', target: 5, reward: { points: 30 } },
  { id: 'capture_10', label: 'Capture 10 Pokémon', type: 'capture_n', target: 10, reward: { points: 50 } },
  { id: 'capture_rare_3', label: 'Capture 3 Rares', type: 'capture_rarity', rarity: 'rare', target: 3, reward: { points: 40 } },
  { id: 'capture_elite_1', label: 'Capture 1 Élite', type: 'capture_rarity', rarity: 'elite', target: 1, reward: { points: 35 } },
  { id: 'capture_legendaire_1', label: 'Capture 1 Légendaire', type: 'capture_rarity', rarity: 'legendaire', target: 1, reward: { points: 60 } },
  { id: 'capture_shiny_1', label: "Capture ton premier shiny aujourd'hui", type: 'capture_shiny', target: 1, reward: { points: 50 } },
{ id: 'activate_lure_1', label: 'Active un leurre', type: 'activate_lure', target: 1, reward: { points: 20 } },
  { id: 'capture_commun_10', label: 'Capture 10 Pokémon Communs', type: 'capture_rarity', rarity: 'commun', target: 10, reward: { points: 25 } },
];

// Seeded random from date string
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

export function pickDailyQuests(date: string): QuestDefinition[] {
  const rng = seededRandom(date);
  const pool = [...QUEST_POOL];
  const picked: QuestDefinition[] = [];
  for (let i = 0; i < 3 && pool.length > 0; i++) {
    const idx = Math.floor(rng() * pool.length);
    picked.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return picked;
}

export function todayDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
