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
  isShiny?: boolean;
}

// Real TCG HP values (Base Set > Fossil > Jungle priority)
export const TCG_HP: Record<number, number> = {
  1:40, 2:60, 3:100, 4:50, 5:80, 6:120, 7:40, 8:70, 9:100,
  10:40, 11:70, 12:70, 13:40, 14:80, 15:80,
  16:40, 17:60, 18:80, 19:30, 20:60, 21:50, 22:70, 23:40, 24:60,
  25:40, 26:80, 27:40, 28:70, 29:60, 30:70, 31:90, 32:40, 33:60, 34:90,
  35:40, 36:70, 37:50, 38:80, 39:60, 40:80,
  41:40, 42:60, 43:50, 44:60, 45:80, 46:40, 47:60, 48:40, 49:70,
  50:30, 51:70, 52:50, 53:70, 54:50, 55:70, 56:30, 57:70, 58:60, 59:100,
  60:40, 61:60, 62:90, 63:30, 64:60, 65:80, 66:50, 67:80, 68:100,
  69:40, 70:70, 71:80, 72:30, 73:60, 74:50, 75:60, 76:80, 77:40, 78:70,
  79:50, 80:60, 81:40, 82:60, 83:50, 84:50, 85:70, 86:60, 87:80,
  88:50, 89:70, 90:30, 91:50, 92:30, 93:60, 94:80, 95:90, 96:50, 97:90,
  98:50, 99:60, 100:40, 101:80, 102:50, 103:80, 104:40, 105:60,
  106:60, 107:70, 108:90, 109:50, 110:60, 111:70, 112:100,
  113:120, 114:50, 115:90, 116:40, 117:60, 118:40, 119:70,
  120:40, 121:60, 122:40, 123:70, 124:70, 125:70, 126:70, 127:60, 128:60,
  129:30, 130:100, 131:80, 132:50, 133:50, 134:80, 135:70, 136:70, 137:30,
  138:40, 139:70, 140:30, 141:60, 142:60, 143:90,
  144:70, 145:90, 146:70, 147:40, 148:80, 149:100, 150:60, 151:40,
};

const GAME_RARITY_TO_TCG: Record<Rarity, TcgRarity> = {
  commun: 'common',
  peu_commun: 'uncommon',
  rare: 'rare',
  elite: 'ultra',
  legendaire: 'secret',
};

// Only Gen 1 (IDs 1–151)
const GEN1_ONLY = GEN1_POKEMON.filter(p => p.id >= 1 && p.id <= 151);

// Build all card definitions: normal + holo for rare/ultra/secret + shiny holo variants
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
    // Shiny holo variant
    ALL_CARDS.push({
      cardId: `${p.id}-holo-shiny`,
      pokemonId: p.id,
      pokemonName: p.name,
      gameRarity: p.rarity,
      tcgRarity,
      variant: 'holo',
      isHolo: true,
      isShiny: true,
    });
  }
}

export const CARDS_BY_ID: Record<string, TcgCardDef> = Object.fromEntries(
  ALL_CARDS.map(c => [c.cardId, c])
);

// Base shiny rate (1-in-N for no challenge bonuses)
const BASE_SHINY_RATE = 1 / 750;

function baseCardWeight(card: TcgCardDef): number {
  if (card.isShiny) {
    // Shiny weight = non-shiny holo weight × shiny rate (overridden at pull time)
    return 0; // excluded from static pool; added dynamically
  }
  if (card.tcgRarity === 'common' && !card.isHolo)    return 40;
  if (card.tcgRarity === 'uncommon' && !card.isHolo)  return 15;
  if (card.tcgRarity === 'rare' && !card.isHolo)      return 4;
  if (card.tcgRarity === 'rare' && card.isHolo)       return 1.5;
  if (card.tcgRarity === 'ultra' && !card.isHolo)     return 1.5;
  if (card.tcgRarity === 'ultra' && card.isHolo)      return 0.8;
  if (card.tcgRarity === 'secret' && !card.isShiny)   return 0.3;
  return 0;
}

// Build weighted pull pool
interface WeightedCard { card: TcgCardDef; weight: number; }
const BASE_PULL_POOL: WeightedCard[] = ALL_CARDS
  .map(card => ({ card, weight: baseCardWeight(card) }))
  .filter(({ weight }) => weight > 0);

const BASE_TOTAL_WEIGHT = BASE_PULL_POOL.reduce((s, p) => s + p.weight, 0);

// Shiny pool (same cards as holo pool, with tiny weights)
const SHINY_POOL: WeightedCard[] = ALL_CARDS
  .filter(c => c.isShiny)
  .map(c => {
    let holoW = 0;
    if (c.tcgRarity === 'rare')   holoW = 1.5;
    if (c.tcgRarity === 'ultra')  holoW = 0.8;
    if (c.tcgRarity === 'secret') holoW = 0.3;
    return { card: c, weight: holoW * BASE_SHINY_RATE };
  });

function pullOneCard(shinyMultiplier = 1): TcgCardDef {
  const shinyW = SHINY_POOL.reduce((s, p) => s + p.weight * shinyMultiplier, 0);
  const total = BASE_TOTAL_WEIGHT + shinyW;
  let r = Math.random() * total;
  for (const { card, weight } of BASE_PULL_POOL) {
    r -= weight;
    if (r <= 0) return card;
  }
  for (const { card, weight } of SHINY_POOL) {
    r -= weight * shinyMultiplier;
    if (r <= 0) return card;
  }
  return BASE_PULL_POOL[0].card;
}

export function openBooster(shinyMultiplier = 1): TcgCardDef[] {
  const cards: TcgCardDef[] = [];
  for (let i = 0; i < 10; i++) cards.push(pullOneCard(shinyMultiplier));
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
  const w = baseCardWeight(card);
  const prob = (w / BASE_TOTAL_WEIGHT) * 100;
  if (prob >= 1) return `${prob.toFixed(1)}% par carte`;
  if (prob >= 0.1) return `${prob.toFixed(2)}% par carte`;
  return `${prob.toFixed(3)}% par carte`;
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
