import { Rarity } from '../types';
import type { PokemonInstanceData } from '../types';
import { TYPE_CHART, POKEMON_TYPE, PokemonType } from './pokemonTypes';
import { GEN1_STATS } from './gen1Stats';
import { natureMult } from './natures';
import type { StatKey } from './natures';

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

function getIV(inst: PokemonInstanceData | undefined, stat: StatKey | 'hp'): number {
  return inst?.iv[stat] ?? 15;
}

function getEV(inst: PokemonInstanceData | undefined, stat: StatKey | 'hp'): number {
  return inst?.ev[stat] ?? 0;
}

function getNatureMult(inst: PokemonInstanceData | undefined, stat: StatKey): number {
  return inst ? natureMult(inst.nature, stat) : 1;
}

// HP formula: floor((2*B + IV + floor(EV/4)) * L / 100) + L + 10
export function calcMaxHp(pokemonId: number, level: number, inst?: PokemonInstanceData): number {
  const s = GEN1_STATS[pokemonId];
  const base = s?.hp ?? 45;
  const iv = getIV(inst, 'hp');
  const ev = getEV(inst, 'hp');
  const raw = Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + level + 10;
  return Math.floor(raw * hpCoeff(base));
}

// Other stat formula: floor((floor((2*B + IV + floor(EV/4)) * L / 100) + 5) * nature)
export function calcAttack(pokemonId: number, level: number, inst?: PokemonInstanceData): number {
  const s = GEN1_STATS[pokemonId];
  const base = s?.attack ?? 50;
  const iv = getIV(inst, 'attack');
  const ev = getEV(inst, 'attack');
  const raw = Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + 5;
  return Math.floor(raw * getNatureMult(inst, 'attack'));
}

export function calcDefense(pokemonId: number, level: number, inst?: PokemonInstanceData): number {
  const s = GEN1_STATS[pokemonId];
  const base = s?.defense ?? 50;
  const iv = getIV(inst, 'defense');
  const ev = getEV(inst, 'defense');
  const raw = Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + 5;
  return Math.floor(raw * getNatureMult(inst, 'defense'));
}

export function calcSpAttack(pokemonId: number, level: number, inst?: PokemonInstanceData): number {
  const s = GEN1_STATS[pokemonId];
  const base = s?.spAttack ?? 50;
  const iv = getIV(inst, 'spAttack');
  const ev = getEV(inst, 'spAttack');
  const raw = Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + 5;
  return Math.floor(raw * getNatureMult(inst, 'spAttack'));
}

export function calcSpDefense(pokemonId: number, level: number, inst?: PokemonInstanceData): number {
  const s = GEN1_STATS[pokemonId];
  const base = s?.spDefense ?? 50;
  const iv = getIV(inst, 'spDefense');
  const ev = getEV(inst, 'spDefense');
  const raw = Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + 5;
  return Math.floor(raw * getNatureMult(inst, 'spDefense'));
}

export function calcSpeed(pokemonId: number, level: number, inst?: PokemonInstanceData): number {
  const s = GEN1_STATS[pokemonId];
  const base = s?.speed ?? 50;
  const iv = getIV(inst, 'speed');
  const ev = getEV(inst, 'speed');
  const raw = Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + 5;
  return Math.floor(raw * getNatureMult(inst, 'speed'));
}

// Combat stage multiplier table (−6 to +6)
const STAGE_MULT: Record<number, number> = {
  [-6]: 2/8, [-5]: 2/7, [-4]: 2/6, [-3]: 2/5, [-2]: 2/4, [-1]: 2/3,
  0: 1, 1: 3/2, 2: 4/2, 3: 5/2, 4: 6/2, 5: 7/2, 6: 8/2,
};

export function applyStage(stat: number, stage: number): number {
  const s = Math.max(-6, Math.min(6, stage));
  return Math.floor(stat * (STAGE_MULT[s] ?? 1));
}

export function getTypeEffectiveness(attackType: PokemonType, defenderTypes: PokemonType[]): number {
  let mult = 1;
  for (const defType of defenderTypes) {
    mult *= TYPE_CHART[attackType]?.[defType] ?? 1;
  }
  return mult;
}

export type MoveResult = {
  damage: number;
  effectiveness: number;
  moveName: string;
  isCrit: boolean;
  isMiss: boolean;
  moveType: PokemonType;
  recoil: number;
  statusEffect?: { type: string; chance: number };
};

// ── HeartGold damage formula ─────────────────────────────────────────────────
// Dégâts = Floor(Floor(Floor((2*L/5)+2) * Puissance * (A/D)) / 50) + 2
// then STAB × 1.5, then type effectiveness, then random 85-100, then crit ×1.75
export function calcDamage(
  attackerId: number,
  attackerLevel: number,
  defenderId: number,
  defenderLevel: number,
  moveIndex: number,
  attackerInst?: PokemonInstanceData,
  defenderInst?: PokemonInstanceData,
  attackStage = 0,
  defenseStage = 0,
): MoveResult {
  const s = GEN1_STATS[attackerId];
  // Support both new format (moves array) and old format (single move)
  const movesArr = (s as unknown as { moves?: unknown[] })?.moves ?? ((s as unknown as { move?: unknown })?.move ? [(s as unknown as { move: unknown }).move] : []);
  const move = (movesArr[moveIndex] ?? movesArr[0] ?? {
    name: 'Lutte', type: 'normal', category: 'physical',
    power: 50, accuracy: 100, pp: 999,
  }) as { name: string; type: string; category: string; power: number; accuracy: number; pp: number; recoil?: number; effect?: { type: string; chance: number } };

  const moveName      = move.name;
  const movePower     = move.power;
  const moveCategory  = move.category;
  const moveType      = move.type as PokemonType;
  const moveAccuracy  = move.accuracy ?? 100;
  const recoilFrac    = (move as { recoil?: number }).recoil ?? 0;

  // Status-only moves do 0 damage
  if (moveCategory === 'status') {
    return {
      damage: 0, effectiveness: 1, moveName, isCrit: false,
      isMiss: false, moveType, recoil: 0,
      statusEffect: (move as { effect?: { type: string; chance: number } }).effect,
    };
  }

  // Miss check
  if (Math.random() * 100 >= moveAccuracy) {
    return { damage: 0, effectiveness: 1, moveName, isCrit: false, isMiss: true, moveType, recoil: 0 };
  }

  // Stat selection based on category
  let A = moveCategory === 'physical'
    ? applyStage(calcAttack(attackerId, attackerLevel, attackerInst), attackStage)
    : applyStage(calcSpAttack(attackerId, attackerLevel, attackerInst), attackStage);
  const D = moveCategory === 'physical'
    ? applyStage(calcDefense(defenderId, defenderLevel, defenderInst), defenseStage)
    : applyStage(calcSpDefense(defenderId, defenderLevel, defenderInst), defenseStage);

  const defenderTypes  = (POKEMON_TYPE[defenderId]  ?? ['normal']) as PokemonType[];
  const attackerTypes  = (POKEMON_TYPE[attackerId]  ?? ['normal']) as PokemonType[];
  const effectiveness  = getTypeEffectiveness(moveType, defenderTypes);

  if (effectiveness === 0) {
    return { damage: 0, effectiveness: 0, moveName, isCrit: false, isMiss: false, moveType, recoil: 0 };
  }

  const L = attackerLevel;
  let dmg = Math.floor(Math.floor(Math.floor((2 * L / 5) + 2) * movePower * (A / D)) / 50) + 2;

  // STAB
  if (attackerTypes.includes(moveType)) dmg = Math.floor(dmg * 1.5);

  dmg = Math.floor(dmg * effectiveness);

  // Random factor 85–100
  const rng = (85 + Math.floor(Math.random() * 16)) / 100;
  dmg = Math.floor(dmg * rng);

  // Critical hit (15 %, ×1.75)
  const isCrit = Math.random() < 0.15;
  if (isCrit) dmg = Math.floor(dmg * 1.75);

  const finalDmg = Math.max(1, dmg);
  const recoil = recoilFrac > 0 ? Math.max(1, Math.floor(finalDmg * recoilFrac)) : 0;

  return {
    damage: finalDmg, effectiveness, moveName, isCrit, isMiss: false, moveType, recoil,
    statusEffect: (move as { effect?: { type: string; chance: number } }).effect,
  };
}

// Struggle: used when all PP are depleted (power 50, 25% recoil)
export function calcStruggle(
  attackerId: number,
  attackerLevel: number,
  defenderId: number,
  defenderLevel: number,
  attackerInst?: PokemonInstanceData,
  defenderInst?: PokemonInstanceData,
): MoveResult {
  const A = calcAttack(attackerId, attackerLevel, attackerInst);
  const D = calcDefense(defenderId, defenderLevel, defenderInst);
  const L = attackerLevel;
  let dmg = Math.floor(Math.floor(Math.floor((2 * L / 5) + 2) * 50 * (A / D)) / 50) + 2;
  const rng = (85 + Math.floor(Math.random() * 16)) / 100;
  dmg = Math.floor(dmg * rng);
  const finalDmg = Math.max(1, dmg);
  return {
    damage: finalDmg, effectiveness: 1, moveName: 'Lutte', isCrit: false,
    isMiss: false, moveType: 'normal' as PokemonType,
    recoil: Math.max(1, Math.floor(finalDmg * 0.25)),
  };
}

// ── HeartGold XP formula ─────────────────────────────────────────────────────
export function calcXpGain(enemyPokemonId: number, enemyLevel: number, isTrainer = false): number {
  const baseXp = GEN1_STATS[enemyPokemonId]?.baseXp ?? 64;
  const a = isTrainer ? 1.5 : 1;
  return Math.floor((a * baseXp * enemyLevel) / 7);
}

// ── EV gain ──────────────────────────────────────────────────────────────────
export function calcEvGain(
  currentEv: PokemonInstanceData['ev'],
  defeatedId: number,
): PokemonInstanceData['ev'] {
  const s = GEN1_STATS[defeatedId];
  if (!s?.evYield) return currentEv;
  const next = { ...currentEv };
  for (const [stat, amount] of Object.entries(s.evYield) as [keyof typeof next, number][]) {
    next[stat] = Math.min(255, next[stat] + amount);
  }
  // Enforce 510 total cap — trim from the newly added stats if over
  let totalAfter = Object.values(next).reduce((a, b) => a + b, 0);
  if (totalAfter > 510) {
    let overflow = totalAfter - 510;
    for (const stat of Object.keys(s.evYield) as (keyof typeof next)[]) {
      const cut = Math.min(next[stat], overflow);
      next[stat] -= cut;
      overflow -= cut;
      if (overflow <= 0) break;
    }
  }
  return next;
}

// ── Random IV generation ──────────────────────────────────────────────────────
export function randomIV(): PokemonInstanceData['iv'] {
  return {
    hp:        Math.floor(Math.random() * 32),
    attack:    Math.floor(Math.random() * 32),
    defense:   Math.floor(Math.random() * 32),
    spAttack:  Math.floor(Math.random() * 32),
    spDefense: Math.floor(Math.random() * 32),
    speed:     Math.floor(Math.random() * 32),
  };
}

export function zeroEV(): PokemonInstanceData['ev'] {
  return { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 };
}
