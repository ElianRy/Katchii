import { GEN1_POKEMON } from './gen1';
import type { Rarity } from '../types';

export type CardVariant = 'normal' | 'holo';
export type TcgRarity = 'common' | 'uncommon' | 'rare' | 'ultra' | 'secret';

export interface TcgCardDef {
  cardId: string;
  pokemonId: number;
  pokemonName: string;
  gameRarity: Rarity;
  tcgRarity: TcgRarity;
  variant: CardVariant;
  isHolo: boolean;
}

const GAME_RARITY_TO_TCG: Record<Rarity, TcgRarity> = {
  commun: 'common',
  peu_commun: 'uncommon',
  rare: 'rare',
  elite: 'ultra',
  legendaire: 'secret',
};

// Only Gen 1 (IDs 1–151)
const GEN1_ONLY = GEN1_POKEMON.filter(p => p.id >= 1 && p.id <= 151);

// Build all card definitions: normal + holo for rare/ultra/secret
export const ALL_CARDS: TcgCardDef[] = [];
for (const p of GEN1_ONLY) {
  const tcgRarity = GAME_RARITY_TO_TCG[p.rarity];
  ALL_CARDS.push({
    cardId: `${p.id}-normal`,
    pokemonId: p.id,
    pokemonName: p.name,
    gameRarity: p.rarity,
    tcgRarity,
    variant: 'normal',
    isHolo: false,
  });
  if (tcgRarity === 'rare' || tcgRarity === 'ultra' || tcgRarity === 'secret') {
    ALL_CARDS.push({
      cardId: `${p.id}-holo`,
      pokemonId: p.id,
      pokemonName: p.name,
      gameRarity: p.rarity,
      tcgRarity,
      variant: 'holo',
      isHolo: true,
    });
  }
}

export const CARDS_BY_ID: Record<string, TcgCardDef> = Object.fromEntries(
  ALL_CARDS.map(c => [c.cardId, c])
);

const byTcgRarity = (r: TcgRarity) => ALL_CARDS.filter(c => c.tcgRarity === r && !c.isHolo);
const holoByTcgRarity = (r: TcgRarity) => ALL_CARDS.filter(c => c.tcgRarity === r && c.isHolo);

const COMMON_POOL = byTcgRarity('common');
const UNCOMMON_POOL = byTcgRarity('uncommon');
const RARE_NORMAL_POOL = byTcgRarity('rare');
const RARE_HOLO_POOL = holoByTcgRarity('rare');
const ULTRA_NORMAL_POOL = byTcgRarity('ultra');
const ULTRA_HOLO_POOL = holoByTcgRarity('ultra');
const SECRET_POOL = [...byTcgRarity('secret'), ...holoByTcgRarity('secret')];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rollRarePlus(): TcgCardDef {
  const r = Math.random() * 100;
  if (r < 65) return pick(RARE_NORMAL_POOL);
  if (r < 85) return pick(RARE_HOLO_POOL);
  if (r < 92) return pick(ULTRA_NORMAL_POOL);
  if (r < 98) return pick(ULTRA_HOLO_POOL);
  return pick(SECRET_POOL);
}

export function openBooster(): TcgCardDef[] {
  const cards: TcgCardDef[] = [];
  for (let i = 0; i < 6; i++) cards.push(pick(COMMON_POOL));
  for (let i = 0; i < 3; i++) cards.push(pick(UNCOMMON_POOL));
  cards.push(rollRarePlus());
  // Sort: commons first, rarest last
  const order: Record<TcgRarity, number> = { common: 0, uncommon: 1, rare: 2, ultra: 3, secret: 4 };
  cards.sort((a, b) => {
    const d = order[a.tcgRarity] - order[b.tcgRarity];
    if (d !== 0) return d;
    if (a.isHolo && !b.isHolo) return 1;
    if (!a.isHolo && b.isHolo) return -1;
    return 0;
  });
  return cards;
}

export const TCG_RARITY_LABEL: Record<TcgRarity, string> = {
  common: '◆ Commune',
  uncommon: '◆◆ Peu commune',
  rare: '◆◆◆ Rare',
  ultra: '✦✦ Ultra Rare',
  secret: '✦✦✦ Secret Rare',
};

export const TCG_RARITY_COLOR: Record<TcgRarity, string> = {
  common: '#6b7280',
  uncommon: '#22c55e',
  rare: '#3b82f6',
  ultra: '#a855f7',
  secret: '#f59e0b',
};

// Probability for each card to appear in a booster
export function cardProbability(card: TcgCardDef): string {
  let prob = 0;
  if (card.tcgRarity === 'common') {
    prob = (6 / COMMON_POOL.length) * 100;
  } else if (card.tcgRarity === 'uncommon') {
    prob = (3 / UNCOMMON_POOL.length) * 100;
  } else {
    // 1 rare+ slot
    if (card.tcgRarity === 'rare' && !card.isHolo) prob = (0.65 / RARE_NORMAL_POOL.length) * 100;
    else if (card.tcgRarity === 'rare' && card.isHolo) prob = (0.20 / RARE_HOLO_POOL.length) * 100;
    else if (card.tcgRarity === 'ultra' && !card.isHolo) prob = (0.07 / ULTRA_NORMAL_POOL.length) * 100;
    else if (card.tcgRarity === 'ultra' && card.isHolo) prob = (0.06 / ULTRA_HOLO_POOL.length) * 100;
    else prob = (0.02 / SECRET_POOL.length) * 100;
  }
  if (prob >= 1) return `${prob.toFixed(1)}%`;
  return `${prob.toFixed(2)}%`;
}
