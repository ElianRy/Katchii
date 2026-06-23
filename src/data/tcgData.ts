import { GEN1_POKEMON } from './gen1';
import { GEN1_STATS } from './gen1Stats';
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

// Build weighted pull pool
interface WeightedCard { card: TcgCardDef; weight: number; }
const PULL_POOL: WeightedCard[] = [];
for (const card of ALL_CARDS) {
  let w = 0;
  if (card.tcgRarity === 'common' && !card.isHolo)    w = 40;
  else if (card.tcgRarity === 'uncommon' && !card.isHolo) w = 15;
  else if (card.tcgRarity === 'rare' && !card.isHolo)    w = 4;
  else if (card.tcgRarity === 'rare' && card.isHolo)     w = 1.5;
  else if (card.tcgRarity === 'ultra' && !card.isHolo)   w = 1.5;
  else if (card.tcgRarity === 'ultra' && card.isHolo)    w = 0.8;
  else if (card.tcgRarity === 'secret')                  w = 0.3;
  if (w > 0) PULL_POOL.push({ card, weight: w });
}
const TOTAL_WEIGHT = PULL_POOL.reduce((s, p) => s + p.weight, 0);

function pullOneCard(): TcgCardDef {
  let r = Math.random() * TOTAL_WEIGHT;
  for (const { card, weight } of PULL_POOL) {
    r -= weight;
    if (r <= 0) return card;
  }
  return PULL_POOL[0].card;
}

export function openBooster(): TcgCardDef[] {
  const cards: TcgCardDef[] = [];
  for (let i = 0; i < 10; i++) cards.push(pullOneCard());
  const order: Record<TcgRarity, number> = { common: 0, uncommon: 1, rare: 2, ultra: 3, secret: 4 };
  cards.sort((a, b) => {
    const d = order[a.tcgRarity] - order[b.tcgRarity];
    if (d !== 0) return d;
    return (a.isHolo ? 1 : -1) - (b.isHolo ? 1 : -1);
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
  let w = 0;
  if (card.tcgRarity === 'common' && !card.isHolo)    w = 40;
  else if (card.tcgRarity === 'uncommon' && !card.isHolo) w = 15;
  else if (card.tcgRarity === 'rare' && !card.isHolo)    w = 4;
  else if (card.tcgRarity === 'rare' && card.isHolo)     w = 1.5;
  else if (card.tcgRarity === 'ultra' && !card.isHolo)   w = 1.5;
  else if (card.tcgRarity === 'ultra' && card.isHolo)    w = 0.8;
  else if (card.tcgRarity === 'secret')                  w = 0.3;
  const prob = (w / TOTAL_WEIGHT) * 100;
  if (prob >= 1) return `${prob.toFixed(1)}% par carte`;
  return `${prob.toFixed(2)}% par carte`;
}

export interface TcgMove {
  name: string;
  type: string;
  damage: number;
  description: string;
}

function tcgDamage(power: number): number {
  if (power <= 0) return 0;
  if (power <= 40) return 10;
  if (power <= 60) return 20;
  if (power <= 80) return 30;
  if (power <= 100) return 40;
  return 60;
}

function moveShortDesc(m: { name: string; type: string; category: string; power: number; effect?: { type: string; chance: number }; statBoost?: { stat: string; target: string; stages: number }; highCrit?: boolean; recoil?: number; description?: string }): string {
  const dmg = tcgDamage(m.power);
  const parts: string[] = [];
  if (dmg > 0) parts.push(`Inflige ${dmg} dégâts.`);
  if (m.effect) {
    const names: Record<string, string> = { burn: 'brûlé', paralysis: 'paralysé', poison: 'empoisonné', sleep: 'endormi', freeze: 'gelé' };
    const s = names[m.effect.type] ?? m.effect.type;
    parts.push(m.effect.chance < 100 ? `${m.effect.chance}% : Adversaire ${s}.` : `Adversaire ${s}.`);
  }
  if (dmg === 0 && !m.effect) {
    if (m.statBoost) {
      const sn: Record<string, string> = { attack: 'Attaque', defense: 'Défense', spAttack: 'Attq.Spé.', spDefense: 'Déf.Spé.', speed: 'Vitesse', evasion: 'Esquive', accuracy: 'Précision' };
      const dir = m.statBoost.stages > 0 ? '▲' : '▼';
      const tgt = m.statBoost.target === 'self' ? "Soi" : "Adverse";
      parts.push(`${tgt} : ${sn[m.statBoost.stat] ?? m.statBoost.stat} ${dir}${Math.abs(m.statBoost.stages)}.`);
    } else {
      parts.push((m.description ?? '').slice(0, 35) || 'Effet spécial.');
    }
  }
  if (m.highCrit && dmg > 0) parts.push('Crit. élevé.');
  if (m.recoil && dmg > 0) parts.push(`Recul ${Math.round(m.recoil * 100)}%.`);
  return parts.join(' ');
}

export function getTcgMoves(pokemonId: number): TcgMove[] {
  const stats = GEN1_STATS[pokemonId];
  if (!stats) return [];
  return (stats.moves ?? []).slice(0, 2).map((m: { name: string; type: string; category: string; power: number; effect?: { type: string; chance: number }; statBoost?: { stat: string; target: string; stages: number }; highCrit?: boolean; recoil?: number; description?: string }) => ({
    name: m.name,
    type: m.type,
    damage: tcgDamage(m.power),
    description: moveShortDesc(m),
  }));
}
