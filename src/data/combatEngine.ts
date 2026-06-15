import { Rarity } from '../types';
import { TYPE_CHART, POKEMON_TYPE, PokemonType } from './pokemonTypes';
import { GEN1_STATS, AnimationType } from './gen1Stats';

export const LEVEL_RANGE: Record<Rarity, [number, number]> = {
  commun: [1, 10],
  peu_commun: [10, 30],
  rare: [30, 50],
  elite: [50, 70],
  legendaire: [70, 100],
};

export function naturalLevel(rarity: Rarity, maxLevel?: number): number {
  const [min, max] = LEVEL_RANGE[rarity];
  const cap = maxLevel ?? max;
  const effectiveMax = Math.min(max, cap);
  const effectiveMin = Math.min(min, effectiveMax);
  return Math.floor(Math.random() * (effectiveMax - effectiveMin + 1)) + effectiveMin;
}

export function xpToNextLevel(level: number): number {
  return level * level * 5;
}

// ── HeartGold/SoulSilver stat formulas ──────────────────────────────────────

export type PokemonProfile = 'tank' | 'equilibre' | 'attaquant';

export function getPokemonProfile(baseHp: number): PokemonProfile {
  if (baseHp >= 100) return 'tank';
  if (baseHp >= 50)  return 'equilibre';
  return 'attaquant';
}

function hpCoeff(baseHp: number): number {
  if (baseHp >= 100) return 1.7;
  if (baseHp >= 50)  return 2.5;
  return 3.0;
}

export function calcMaxHp(pokemonId: number, level: number): number {
  const s = GEN1_STATS[pokemonId];
  if (!s) return Math.floor((2 * 45 * level) / 100) + level + 10;
  const base = Math.floor((2 * s.hp * level) / 100) + level + 10;
  return Math.floor(base * hpCoeff(s.hp));
}

export function calcAttack(pokemonId: number, level: number): number {
  const s = GEN1_STATS[pokemonId];
  if (!s) return Math.floor((2 * 50 * level) / 100) + 5;
  return Math.floor((2 * s.attack * level) / 100) + 5;
}

export function calcDefense(pokemonId: number, level: number): number {
  const s = GEN1_STATS[pokemonId];
  if (!s) return Math.floor((2 * 50 * level) / 100) + 5;
  return Math.floor((2 * s.defense * level) / 100) + 5;
}

export function calcSpAttack(pokemonId: number, level: number): number {
  const s = GEN1_STATS[pokemonId];
  if (!s) return Math.floor((2 * 50 * level) / 100) + 5;
  return Math.floor((2 * s.spAttack * level) / 100) + 5;
}

export function calcSpDefense(pokemonId: number, level: number): number {
  const s = GEN1_STATS[pokemonId];
  if (!s) return Math.floor((2 * 50 * level) / 100) + 5;
  return Math.floor((2 * s.spDefense * level) / 100) + 5;
}

export function calcSpeed(pokemonId: number, level: number): number {
  const s = GEN1_STATS[pokemonId];
  if (!s) return Math.floor((2 * 50 * level) / 100) + 5;
  return Math.floor((2 * s.speed * level) / 100) + 5;
}

export function getTypeEffectiveness(attackType: PokemonType, defenderTypes: PokemonType[]): number {
  let mult = 1;
  for (const defType of defenderTypes) {
    mult *= TYPE_CHART[attackType]?.[defType] ?? 1;
  }
  return mult;
}

// ── HeartGold damage formula ─────────────────────────────────────────────────
// Dégâts = Floor(Floor(Floor((2*L/5)+2) * Puissance * (A/D)) / 50) + 2
// then STAB × 1.5, then type effectiveness, then random 85-100, then crit ×1.75
export function calcDamage(
  attackerId: number,
  attackerLevel: number,
  defenderId: number,
  defenderLevel: number,
  attackBoostMult = 1,
): {
  damage: number;
  effectiveness: number;
  moveName: string;
  isCrit: boolean;
  isMiss: boolean;
  animationType: AnimationType;
  moveType: PokemonType;
} {
  const move = GEN1_STATS[attackerId]?.move;
  const moveName      = move?.name      ?? 'Charge';
  const movePower     = move?.power     ?? 35;
  const moveCategory  = move?.category  ?? 'physical';
  const moveType      = (move?.type     ?? 'normal') as PokemonType;
  const animationType = (move?.animationType ?? 'normal') as AnimationType;

  // Stat selection based on category
  let A = moveCategory === 'physical'
    ? calcAttack(attackerId, attackerLevel)
    : calcSpAttack(attackerId, attackerLevel);
  if (moveCategory === 'physical' && attackBoostMult > 1) {
    A = Math.floor(A * attackBoostMult);
  }
  const D = moveCategory === 'physical'
    ? calcDefense(defenderId, defenderLevel)
    : calcSpDefense(defenderId, defenderLevel);

  const defenderTypes  = (POKEMON_TYPE[defenderId]  ?? ['normal']) as PokemonType[];
  const attackerTypes  = (POKEMON_TYPE[attackerId]  ?? ['normal']) as PokemonType[];
  const effectiveness  = getTypeEffectiveness(moveType, defenderTypes);

  // 10 % miss chance
  if (Math.random() < 0.10) {
    return { damage: 0, effectiveness, moveName, isCrit: false, isMiss: true, animationType, moveType };
  }

  // Base damage
  const L = attackerLevel;
  let dmg = Math.floor(Math.floor(Math.floor((2 * L / 5) + 2) * movePower * (A / D)) / 50) + 2;

  // STAB
  if (attackerTypes.includes(moveType)) dmg = Math.floor(dmg * 1.5);

  // Type effectiveness (no further calc if immune)
  if (effectiveness === 0) return { damage: 0, effectiveness: 0, moveName, isCrit: false, isMiss: false, animationType, moveType };
  dmg = Math.floor(dmg * effectiveness);

  // Random factor 85–100
  const rng = (85 + Math.floor(Math.random() * 16)) / 100;
  dmg = Math.floor(dmg * rng);

  // Critical hit (15 %, ×1.75)
  const isCrit = Math.random() < 0.15;
  if (isCrit) dmg = Math.floor(dmg * 1.75);

  return { damage: Math.max(1, dmg), effectiveness, moveName, isCrit, isMiss: false, animationType, moveType };
}

// ── HeartGold XP formula ─────────────────────────────────────────────────────
// Gain = floor((a × baseXp × enemyLevel) / 7)
// a = 1.5 for trainer battles, 1 for wild
export function calcXpGain(enemyPokemonId: number, enemyLevel: number, isTrainer = false): number {
  const baseXp = GEN1_STATS[enemyPokemonId]?.baseXp ?? 64;
  const a = isTrainer ? 1.5 : 1;
  return Math.floor((a * baseXp * enemyLevel) / 7);
}

