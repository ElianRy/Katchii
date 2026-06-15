import { Rarity } from '../types';
import type { PokemonInstanceData } from '../types';
import { TYPE_CHART, POKEMON_TYPE, PokemonType } from './pokemonTypes';
import { GEN1_STATS } from './gen1Stats';
import { natureMult } from './natures';
import type { StatKey } from './natures';
import type { StatBoost } from './gen1Stats';

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

// Stat stage keys used in BattleScreen
export type StageKey = 'attack' | 'defense' | 'spAttack' | 'spDefense' | 'speed';
export type Stages = Record<StageKey, number>;

export function emptyStages(): Stages {
  return { attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 };
}

export type MoveResult = {
  damage: number;
  effectiveness: number;
  moveName: string;
  isCrit: boolean;
  isMiss: boolean;
  moveType: PokemonType;
  recoil: number;
  hits: number;               // number of times damage was dealt (for multi-hit display)
  statusEffect?: { type: string; chance: number };
  statBoost?: StatBoost;      // stat stage change to apply after this move
};

// ── HeartGold damage formula ─────────────────────────────────────────────────
export function calcDamage(
  attackerId: number,
  attackerLevel: number,
  defenderId: number,
  defenderLevel: number,
  moveIndex: number,
  attackerInst?: PokemonInstanceData,
  defenderInst?: PokemonInstanceData,
  attackerStages?: Partial<Stages>,
  defenderStages?: Partial<Stages>,
  customMoves?: ReturnType<typeof getMoveListRaw>,
): MoveResult {
  const movesArr = customMoves ?? getMoveListRaw(attackerId);
  const move = (movesArr[moveIndex] ?? movesArr[0] ?? {
    name: 'Lutte', type: 'normal', category: 'physical',
    power: 50, accuracy: 100, pp: 999, description: 'Attaque de dernier recours.',
  }) as {
    name: string; type: string; category: string; power: number;
    accuracy: number; pp: number; recoil?: number;
    effect?: { type: string; chance: number };
    multiHit?: boolean; highCrit?: boolean;
    statBoost?: StatBoost; description?: string;
  };

  void defenderLevel;

  const moveName     = move.name;
  const movePower    = move.power;
  const moveCategory = move.category;
  const moveType     = move.type as PokemonType;
  const moveAccuracy = move.accuracy ?? 100;
  const recoilFrac   = move.recoil ?? 0;

  // Status-only or statBoost-only moves do 0 damage but may carry a boost
  if (moveCategory === 'status') {
    return {
      damage: 0, effectiveness: 1, moveName, isCrit: false,
      isMiss: false, moveType, recoil: 0, hits: 0,
      statusEffect: move.effect,
      statBoost: move.statBoost,
    };
  }

  // Miss check
  if (Math.random() * 100 >= moveAccuracy) {
    return { damage: 0, effectiveness: 1, moveName, isCrit: false, isMiss: true, moveType, recoil: 0, hits: 0 };
  }

  // Stat selection — use appropriate stage based on category
  const atkStg = moveCategory === 'physical' ? (attackerStages?.attack ?? 0) : (attackerStages?.spAttack ?? 0);
  const defStg = moveCategory === 'physical' ? (defenderStages?.defense ?? 0) : (defenderStages?.spDefense ?? 0);
  const A = moveCategory === 'physical'
    ? applyStage(calcAttack(attackerId, attackerLevel, attackerInst), atkStg)
    : applyStage(calcSpAttack(attackerId, attackerLevel, attackerInst), atkStg);
  const D = moveCategory === 'physical'
    ? applyStage(calcDefense(defenderId, defenderLevel, defenderInst), defStg)
    : applyStage(calcSpDefense(defenderId, defenderLevel, defenderInst), defStg);

  const defenderTypes = (POKEMON_TYPE[defenderId] ?? ['normal']) as PokemonType[];
  const attackerTypes = (POKEMON_TYPE[attackerId] ?? ['normal']) as PokemonType[];
  const effectiveness = getTypeEffectiveness(moveType, defenderTypes);

  if (effectiveness === 0) {
    return { damage: 0, effectiveness: 0, moveName, isCrit: false, isMiss: false, moveType, recoil: 0, hits: 0 };
  }

  // Multi-hit: 2-5 hits (distribution: 2→37.5%, 3→37.5%, 4→12.5%, 5→12.5%)
  const hitCount = move.multiHit ? ([2,2,2,3,3,3,4,5][Math.floor(Math.random() * 8)]) : 1;

  let totalDmg = 0;
  let isCrit = false;

  for (let h = 0; h < hitCount; h++) {
    const L = attackerLevel;
    let dmg = Math.floor(Math.floor(Math.floor((2 * L / 5) + 2) * movePower * (A / D)) / 50) + 2;
    if (attackerTypes.includes(moveType)) dmg = Math.floor(dmg * 1.5);
    dmg = Math.floor(dmg * effectiveness);
    const rng = (85 + Math.floor(Math.random() * 16)) / 100;
    dmg = Math.floor(dmg * rng);
    const critRate = move.highCrit ? 0.30 : 0.15;
    const hitCrit = Math.random() < critRate;
    if (hitCrit) { isCrit = true; dmg = Math.floor(dmg * 1.75); }
    totalDmg += Math.max(1, dmg);
  }

  const finalDmg = Math.max(1, totalDmg);
  const recoil = recoilFrac > 0 ? Math.max(1, Math.floor(finalDmg * recoilFrac)) : 0;

  return {
    damage: finalDmg, effectiveness, moveName, isCrit, isMiss: false,
    moveType, recoil, hits: hitCount,
    statusEffect: move.effect,
    statBoost: move.statBoost,
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
  void defenderLevel; void defenderInst;
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
    recoil: Math.max(1, Math.floor(finalDmg * 0.25)), hits: 1,
  };
}

// ── Get move list (supports custom override from pokemonMoves) ───────────────
export type RawMove = {
  name: string; type: string; category: string; power: number;
  accuracy: number; pp: number; description?: string;
  multiHit?: boolean; highCrit?: boolean;
  statBoost?: StatBoost;
  effect?: { type: string; chance: number };
  recoil?: number;
};

export function getMoveListRaw(pokemonId: number, customIndices?: number[]): RawMove[] {
  const s = GEN1_STATS[pokemonId];
  const pool = (s as unknown as { movepool?: unknown[] })?.movepool ?? s?.moves ?? [];
  if (customIndices && pool.length > 0) {
    return customIndices.map(i => pool[i]).filter(Boolean) as RawMove[];
  }
  return (s?.moves ?? []) as RawMove[];
}

// ── Smart enemy AI ───────────────────────────────────────────────────────────
export function chooseEnemyMoveIndex(
  attackerId: number,
  defenderTypes: PokemonType[],
  currentPP: number[],
  attackerStages: Stages,
  turnNumber: number,
): number {
  const s = GEN1_STATS[attackerId];
  const moves = (s?.moves ?? []) as RawMove[];

  const available = currentPP
    .map((pp, i) => pp > 0 ? i : -1)
    .filter(i => i >= 0);

  if (available.length === 0) return -1; // Struggle

  // Score each available move
  const scored = available.map(i => {
    const move = moves[i];
    if (!move) return { i, score: 0 };
    let score = 1;

    if (move.category === 'status') {
      if (move.statBoost) {
        const { target, stat, stages } = move.statBoost;
        if (target === 'self') {
          const currentStage = attackerStages[stat as StageKey] ?? 0;
          if (currentStage >= 6) {
            score = 0; // already maxed, never use
          } else if (turnNumber <= 2 && currentStage < 4) {
            score = 5; // strongly prefer boost early
          } else {
            score = 2; // moderate use later
          }
        } else {
          // debuff foe
          score = stages < -1 ? 3 : 2; // prefer big debuffs
        }
      } else {
        score = 1; // other status (sleep, poison) — moderate use
      }
    } else {
      // Offensive move
      const moveType = move.type as PokemonType;
      const effectiveness = getTypeEffectiveness(moveType, defenderTypes);
      score = move.power ?? 50;
      score *= effectiveness;
      if (move.highCrit) score *= 1.2;
      if (move.multiHit) score *= 1.1;
      // Normalize vs raw power
      score = score / 10;
    }

    return { i, score };
  }).filter(x => x.score > 0);

  if (scored.length === 0) {
    return available[Math.floor(Math.random() * available.length)];
  }

  // Weighted random selection among top-scoring moves
  const maxScore = Math.max(...scored.map(x => x.score));
  const weighted = scored.map(x => ({ ...x, weight: x.score / maxScore }));

  // Soft selection: top 3 get weight, others get small chance
  weighted.sort((a, b) => b.score - a.score);
  const pool: number[] = [];
  weighted.forEach((x, rank) => {
    const tickets = rank === 0 ? 6 : rank === 1 ? 3 : rank === 2 ? 2 : 1;
    for (let t = 0; t < tickets; t++) pool.push(x.i);
  });

  return pool[Math.floor(Math.random() * pool.length)];
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
