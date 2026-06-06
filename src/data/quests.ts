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
  // ── Facile (récompense 20–30 pts) ────────────────────────────────────────
  { id: 'capture_5',         label: 'Capture 5 Pokémon',              type: 'capture_n',      target: 5,  difficulty: 'facile',         reward: { points: 25 } },
  { id: 'capture_commun_5',  label: 'Capture 5 Pokémon communs',      type: 'capture_rarity', rarity: 'commun',     target: 5,  difficulty: 'facile',         reward: { points: 20 } },
  { id: 'activate_lure',     label: 'Active un leurre',               type: 'activate_lure',  target: 1,  difficulty: 'facile',         reward: { points: 25 } },
  { id: 'duel_wins_1',       label: 'Gagne 1 duel',                   type: 'duel_wins',      target: 1,  difficulty: 'facile',         reward: { points: 30 } },

  // ── Moyen (récompense 50–65 pts) ─────────────────────────────────────────
  { id: 'capture_10',        label: 'Capture 10 Pokémon',             type: 'capture_n',      target: 10, difficulty: 'moyen',          reward: { points: 55 } },
  { id: 'capture_commun_15', label: 'Capture 15 Pokémon communs',     type: 'capture_rarity', rarity: 'commun',     target: 15, difficulty: 'moyen',          reward: { points: 50 } },
  { id: 'capture_pc_3',      label: 'Capture 3 Pokémon peu communs',  type: 'capture_rarity', rarity: 'peu_commun', target: 3,  difficulty: 'moyen',          reward: { points: 55 } },
  { id: 'duel_wins_3',       label: 'Gagne 3 duels',                  type: 'duel_wins',      target: 3,  difficulty: 'moyen',          reward: { points: 60 } },

  // ── Difficile (récompense 80–100 pts) ────────────────────────────────────
  { id: 'capture_20',        label: 'Capture 20 Pokémon',             type: 'capture_n',      target: 20, difficulty: 'difficile',      reward: { points: 90 } },
  { id: 'capture_pc_5',      label: 'Capture 5 Pokémon peu communs',  type: 'capture_rarity', rarity: 'peu_commun', target: 5,  difficulty: 'difficile',      reward: { points: 80 } },
  { id: 'capture_rare_1',    label: 'Capture 1 Pokémon rare',         type: 'capture_rarity', rarity: 'rare',       target: 1,  difficulty: 'difficile',      reward: { points: 85 } },
  { id: 'duel_wins_5',       label: 'Gagne 5 duels',                  type: 'duel_wins',      target: 5,  difficulty: 'difficile',      reward: { points: 95 } },

  // ── Très difficile (récompense 130–160 pts) ───────────────────────────────
  { id: 'capture_rare_3',    label: 'Capture 3 Pokémon rares',        type: 'capture_rarity', rarity: 'rare',       target: 3,  difficulty: 'tres_difficile', reward: { points: 140 } },
  { id: 'capture_elite_1',   label: 'Capture 1 Pokémon épique',       type: 'capture_rarity', rarity: 'elite',      target: 1,  difficulty: 'tres_difficile', reward: { points: 130 } },
  { id: 'capture_shiny_1',   label: 'Capture 1 Shiny',                type: 'capture_shiny',  target: 1,  difficulty: 'tres_difficile', reward: { points: 160 } },
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


export function pickDailyQuests(date: string, zoneId: string, availableRarities?: Set<Rarity>): QuestDefinition[] {
  const rng = seededRandom(`${date}__${zoneId}`);

  // Filter pool to only include quests achievable in this zone
  const eligible = (diff: QuestDifficulty) => QUEST_POOL.filter(q => {
    if (q.difficulty !== diff) return false;
    if (!q.rarity || !availableRarities) return true;
    return availableRarities.has(q.rarity);
  }).map(q => ({ ...q }));

  const easyPool   = eligible('facile');
  const medPool    = eligible('moyen');
  const hardPool   = eligible('difficile');
  const vhardPool  = eligible('tres_difficile');

  const pickRandom = <T,>(pool: T[]): T | null => {
    if (!pool.length) return null;
    const i = Math.floor(rng() * pool.length);
    return pool.splice(i, 1)[0];
  };

  const picked: QuestDefinition[] = [];

  // Slot 1: always facile
  const easy = pickRandom(easyPool);
  if (easy) picked.push(easy);

  // Slot 2: always moyen
  const med = pickRandom(medPool);
  if (med) picked.push(med);

  // Slot 3: très difficile in advanced zones, difficile in zone1
  const advancedZones = ['zone2','zone3','zone4','zone5','zone6','zone7','zone8','ligue','zone_libre'];
  const hard = advancedZones.includes(zoneId)
    ? (pickRandom(vhardPool) ?? pickRandom(hardPool))
    : pickRandom(hardPool);
  if (hard) picked.push(hard);

  return picked;
}

export function todayDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
