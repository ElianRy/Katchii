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

export function naturalLevel(rarity: Rarity): number {
  const [min, max] = LEVEL_RANGE[rarity];
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function xpToNextLevel(level: number): number {
  return level * level * 5;
}

export function calcMaxHp(pokemonId: number, level: number): number {
  const p = POKEMON_BY_ID[pokemonId];
  if (!p) return 50;
  const base = RARITY_BASE[p.rarity];
  return Math.floor(50 + level * 5 + base * 10);
}

export function calcAttack(pokemonId: number, level: number): number {
  const p = POKEMON_BY_ID[pokemonId];
  if (!p) return 10;
  const base = RARITY_BASE[p.rarity];
  return Math.floor(10 + level * 2 + base * 5);
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
): { damage: number; effectiveness: number; moveName: string } {
  const attackerTypes = POKEMON_TYPE[attackerId] ?? ['normal'];
  const defenderTypes = POKEMON_TYPE[defenderId] ?? ['normal'];

  // Use primary type's move
  const primaryType = attackerTypes[0];
  const move = TYPE_MOVES[primaryType];

  const atk = calcAttack(attackerId, attackerLevel);
  const def = calcDefense(defenderId, defenderLevel);
  const effectiveness = getTypeEffectiveness(primaryType, defenderTypes);

  const randomFactor = 0.85 + Math.random() * 0.15;
  const damage = Math.max(1, Math.floor((move.power * atk / def) * effectiveness * randomFactor / 10));

  return { damage, effectiveness, moveName: move.name };
}

export function xpGainedFromBattle(enemyLevel: number, won: boolean): number {
  return won ? Math.floor(enemyLevel * 5) : Math.floor(enemyLevel * 1);
}
