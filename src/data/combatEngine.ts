import { Rarity } from '../types';
import { POKEMON_TYPE, TYPE_CHART, TYPE_MOVES, PokemonType } from './pokemonTypes';
import { POKEMON_BY_ID } from './gen1';

const RARITY_BASE: Record<Rarity, number> = {
  commun: 0, peu_commun: 2, rare: 4, elite: 6, legendaire: 8
};

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

export function calcMaxHp(pokemonId: number, level: number): number {
  const p = POKEMON_BY_ID[pokemonId];
  if (!p) return 50;
  const base = RARITY_BASE[p.rarity];
  return Math.floor(50 + level * 8 + base * 12);
}

export function calcAttack(pokemonId: number, level: number): number {
  const p = POKEMON_BY_ID[pokemonId];
  if (!p) return 10;
  const base = RARITY_BASE[p.rarity];
  return Math.floor(base * 3 + level * 3);
}

export function calcDefense(pokemonId: number, level: number): number {
  const p = POKEMON_BY_ID[pokemonId];
  if (!p) return 5;
  const base = RARITY_BASE[p.rarity];
  return Math.floor(5 + level * 1.5 + base * 3);
}

export function getTypeEffectiveness(attackType: PokemonType, defenderTypes: PokemonType[]): number {
  let mult = 1;
  for (const defType of defenderTypes) {
    mult *= TYPE_CHART[attackType]?.[defType] ?? 1;
  }
  return mult;
}

export function calcDamage(
  attackerId: number,
  attackerLevel: number,
  defenderId: number,
  defenderLevel: number
): { damage: number; effectiveness: number; moveName: string; isCrit: boolean; isMiss: boolean } {
  const attackerTypes = POKEMON_TYPE[attackerId] ?? ['normal'];
  const defenderTypes = POKEMON_TYPE[defenderId] ?? ['normal'];

  const primaryType = attackerTypes[0];
  const move = TYPE_MOVES[primaryType];

  const atk = calcAttack(attackerId, attackerLevel);
  const def = calcDefense(defenderId, defenderLevel);
  const effectiveness = getTypeEffectiveness(primaryType, defenderTypes);

  const roll = Math.random();
  if (roll < 0.10) {
    return { damage: 0, effectiveness, moveName: move.name, isCrit: false, isMiss: true };
  }

  const isCrit = Math.random() < 0.15;
  const randomFactor = 0.85 + Math.random() * 0.15;
  const critMult = isCrit ? 1.75 : 1;
  const damage = Math.max(1, Math.floor((move.power * atk / def) * effectiveness * randomFactor * critMult / 10));

  return { damage, effectiveness, moveName: move.name, isCrit, isMiss: false };
}

export function xpGainedFromBattle(enemyLevel: number, won: boolean, enemyRarity?: Rarity): number {
  const rarityBonus = enemyRarity ? RARITY_BASE[enemyRarity] * 5 : 0;
  return won
    ? Math.floor(10 + enemyLevel * 2 + rarityBonus)
    : Math.floor(3 + enemyLevel * 1);
}
