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

export function zoneCaptureLevel(spawnMin: number, spawnMax: number): number {
  return Math.floor(Math.random() * (spawnMax - spawnMin + 1)) + spawnMin;
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

// Combat stage multiplier table (−6 to +6) — Gen 4 values
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

// ── Major Status Conditions (Gen 4) ─────────────────────────────────────────

export type MajorStatus = 'par' | 'brn' | 'psn' | 'tox' | 'slp' | 'frz' | null;

export interface StatusState {
  condition: MajorStatus;
  sleepTurns?: number;    // turns remaining asleep (determined at sleep application)
  parTurns?: number;      // turns remaining paralyzed (2-4 turns)
  toxicCounter?: number;  // N for Toxic (N/16 dmg per turn, resets on switch)
}

export function emptyStatus(): StatusState {
  return { condition: null };
}

/** Apply a new major status. Returns null if already has one (can't stack). */
export function applyMajorStatus(
  current: StatusState,
  newStatus: MajorStatus,
): StatusState | null {
  if (current.condition !== null) return null; // already afflicted
  if (newStatus === null) return null;
  const next: StatusState = { condition: newStatus };
  if (newStatus === 'slp') {
    next.sleepTurns = 1 + Math.floor(Math.random() * 3); // HG/SS: 1-3 turns
  }
  if (newStatus === 'par') {
    next.parTurns = 2 + Math.floor(Math.random() * 3); // 2-4 turns
  }
  if (newStatus === 'tox') {
    next.toxicCounter = 0; // increments at start of each end-of-turn phase
  }
  return next;
}

/**
 * Check if a Pokémon can act this turn. Returns true = can act, false = loses turn.
 * Also returns updated StatusState (sleep counter ticking, etc.)
 */
export function checkCanAct(status: StatusState): { canAct: boolean; nextStatus: StatusState; wokeUp?: boolean; curedPar?: boolean } {
  if (status.condition === null) return { canAct: true, nextStatus: status };

  if (status.condition === 'slp') {
    const remaining = (status.sleepTurns ?? 1) - 1;
    if (remaining <= 0) {
      // Wakes up this turn — can act immediately (HG/SS: no lost turn on wake)
      return { canAct: true, nextStatus: { condition: null }, wokeUp: true };
    }
    return { canAct: false, nextStatus: { ...status, sleepTurns: remaining } };
  }

  if (status.condition === 'frz') {
    if (Math.random() < 0.20) {
      // Defrosts — can act this turn
      return { canAct: true, nextStatus: { condition: null } };
    }
    return { canAct: false, nextStatus: status };
  }

  if (status.condition === 'par') {
    const remaining = (status.parTurns ?? 1) - 1;
    if (remaining <= 0) {
      return { canAct: true, nextStatus: { condition: null }, curedPar: true };
    }
    return { canAct: false, nextStatus: { ...status, parTurns: remaining } };
  }

  // BRN / PSN / TOX: don't prevent action
  return { canAct: true, nextStatus: status };
}

/** Speed modifier from paralysis: ×0.25 */
export function speedStatusMult(status: StatusState): number {
  return status.condition === 'par' ? 0.25 : 1.0;
}

/** Attack modifier from burn: ×0.5 on physical moves */
export function burnAtkMult(status: StatusState, category: string): number {
  return (status.condition === 'brn' && category === 'physical') ? 0.5 : 1.0;
}

/**
 * End-of-turn damage for BRN / PSN / TOX.
 * Returns damage dealt (as integer HP loss) and updated status state.
 */
export function calcEndOfTurnDamage(
  maxHp: number,
  status: StatusState,
): { damage: number; nextStatus: StatusState } {
  if (status.condition === 'brn' || status.condition === 'psn') {
    return {
      damage: Math.max(1, Math.floor(maxHp / 8)),
      nextStatus: status,
    };
  }
  if (status.condition === 'tox') {
    const N = (status.toxicCounter ?? 0) + 1;
    return {
      damage: Math.max(1, Math.floor(maxHp * N / 16)),
      nextStatus: { ...status, toxicCounter: N },
    };
  }
  return { damage: 0, nextStatus: status };
}

/** Label + color for displaying status in UI */
export function statusLabel(status: MajorStatus): { text: string; color: string } | null {
  switch (status) {
    case 'par': return { text: 'PAR', color: '#facc15' };
    case 'brn': return { text: 'BRL', color: '#f97316' };
    case 'psn': return { text: 'PSN', color: '#a855f7' };
    case 'tox': return { text: 'TOX', color: '#7c3aed' };
    case 'slp': return { text: 'SOM', color: '#6b7280' };
    case 'frz': return { text: 'GEL', color: '#38bdf8' };
    default: return null;
  }
}

// ── Turn order (priority + speed + PAR) ─────────────────────────────────────

/**
 * Returns true if the player goes first this turn.
 * Takes into account: move priority, actual speed (with PAR and speed stages), speed tie RNG.
 */
export function playerGoesFirst(
  playerMoveIndex: number,
  enemyMoveIndex: number,
  playerPokemonId: number,
  enemyPokemonId: number,
  playerLevel: number,
  enemyLevel: number,
  playerStages: Stages,
  enemyStages: Stages,
  playerStatus: StatusState,
  enemyStatus: StatusState,
  playerInst?: PokemonInstanceData,
  enemyInst?: PokemonInstanceData,
  playerMoves?: RawMove[],
  enemyMoves?: RawMove[],
): boolean {
  const pMoves = playerMoves ?? getMoveListRaw(playerPokemonId);
  const eMoves = enemyMoves ?? getMoveListRaw(enemyPokemonId);

  const pMove = pMoves[playerMoveIndex] ?? pMoves[0];
  const eMove = eMoves[enemyMoveIndex] ?? eMoves[0];

  const pPriority = pMove?.priority ?? 0;
  const ePriority = eMove?.priority ?? 0;

  if (pPriority !== ePriority) return pPriority > ePriority;

  // Same priority → compare speed
  const pBaseSpd = calcSpeed(playerPokemonId, playerLevel, playerInst);
  const eBaseSpd = calcSpeed(enemyPokemonId, enemyLevel, enemyInst);

  const pSpd = Math.floor(
    applyStage(pBaseSpd, playerStages.speed) * speedStatusMult(playerStatus)
  );
  const eSpd = Math.floor(
    applyStage(eBaseSpd, enemyStages.speed) * speedStatusMult(enemyStatus)
  );

  if (pSpd !== eSpd) return pSpd > eSpd;

  // Speed tie: 50/50
  return Math.random() < 0.5;
}

// ── Move result type ─────────────────────────────────────────────────────────

export type MoveResult = {
  damage: number;
  effectiveness: number;
  moveName: string;
  isCrit: boolean;
  isMiss: boolean;
  moveType: PokemonType;
  recoil: number;
  hits: number;
  statusEffect?: { type: string; chance: number };
  statBoost?: StatBoost;
  appliedStatus?: MajorStatus;  // status actually applied this turn (after chance roll)
  appliedConfusion?: boolean;   // confusion applied this turn (volatile, not major status)
  priority?: number;
  cureDefenderStatus?: boolean; // true when fire move thaws a frozen defender
  allStatBoosted?: boolean;
  appliedSeed?: boolean;
  drainHeal?: number;
  failedSpecial?: string;
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
  attackerStatus?: StatusState,
  defenderStatus?: StatusState,
): MoveResult {
  const movesArr = customMoves ?? getMoveListRaw(attackerId);
  const move = (movesArr[moveIndex] ?? movesArr[0] ?? {
    name: 'Lutte', type: 'normal', category: 'physical',
    power: 50, accuracy: 100, pp: 999, priority: 0,
    description: 'Attaque de dernier recours.',
  }) as RawMove;

  void defenderLevel;

  const moveName     = move.name;
  const movePower    = move.power;
  const moveCategory = move.category;
  const moveType     = move.type as PokemonType;
  const moveAccuracy = move.accuracy ?? 100;
  const recoilFrac   = move.recoil ?? 0;
  const movePriority = move.priority ?? 0;

  // Miss check (alwaysHit moves bypass) — must happen before status block
  if (!move.alwaysHit && moveAccuracy > 0 && Math.random() * 100 >= moveAccuracy) {
    return { damage: 0, effectiveness: 1, moveName, isCrit: false, isMiss: true, moveType, recoil: 0, hits: 0, priority: movePriority };
  }

  // Status-only moves: apply status if applicable
  if (moveCategory === 'status') {
    let appliedStatus: MajorStatus = null;
    let appliedConfusion = false;
    if (move.effect) {
      const roll = Math.random() * 100;
      if (roll < move.effect.chance) {
        if (move.effect.type === 'confusion') {
          appliedConfusion = true;
        } else if (defenderStatus?.condition === null) {
          appliedStatus = effectTypeToStatus(move.effect.type);
        }
      }
    }
    return {
      damage: 0, effectiveness: 1, moveName, isCrit: false,
      isMiss: false, moveType, recoil: 0, hits: 0,
      statusEffect: move.effect,
      statBoost: move.statBoost,
      appliedStatus,
      appliedConfusion: appliedConfusion || undefined,
      appliedSeed: !!(move.isSeed),
      priority: movePriority,
    };
  }

  // Dream-eater: only works on sleeping targets
  if (move.draining && move.id === 'dream-eater' && defenderStatus?.condition !== 'slp') {
    return { damage: 0, effectiveness: 1, moveName, isCrit: false, isMiss: false, moveType, recoil: 0, hits: 0, failedSpecial: 'not-sleeping', priority: movePriority };
  }

  // Frozen defender thaws instantly on fire move (still takes full damage)
  const cureDefenderStatus = defenderStatus?.condition === 'frz' && moveType === 'fire';

  // Stat selection
  const atkStg = moveCategory === 'physical' ? (attackerStages?.attack ?? 0) : (attackerStages?.spAttack ?? 0);
  const defStg = moveCategory === 'physical' ? (defenderStages?.defense ?? 0) : (defenderStages?.spDefense ?? 0);
  let A = moveCategory === 'physical'
    ? applyStage(calcAttack(attackerId, attackerLevel, attackerInst), atkStg)
    : applyStage(calcSpAttack(attackerId, attackerLevel, attackerInst), atkStg);
  const D = moveCategory === 'physical'
    ? applyStage(calcDefense(defenderId, defenderLevel, defenderInst), defStg)
    : applyStage(calcSpDefense(defenderId, defenderLevel, defenderInst), defStg);

  // Burn halves physical attack
  if (attackerStatus) {
    A = Math.floor(A * burnAtkMult(attackerStatus, moveCategory));
  }

  const defenderTypes = (POKEMON_TYPE[defenderId] ?? ['normal']) as PokemonType[];
  const attackerTypes = (POKEMON_TYPE[attackerId] ?? ['normal']) as PokemonType[];
  const effectiveness = getTypeEffectiveness(moveType, defenderTypes);

  if (effectiveness === 0) {
    return { damage: 0, effectiveness: 0, moveName, isCrit: false, isMiss: false, moveType, recoil: 0, hits: 0, priority: movePriority };
  }

  // Multi-hit: 2-5 hits (HGSS distribution: 2→37.5%, 3→37.5%, 4→12.5%, 5→12.5%)
  const hitCount = move.multiHit ? ([2,2,2,3,3,3,4,5][Math.floor(Math.random() * 8)]) : 1;

  let totalDmg = 0;
  let isCrit = false;

  for (let h = 0; h < hitCount; h++) {
    const L = attackerLevel;
    let dmg = Math.floor(Math.floor(Math.floor((2 * L / 5) + 2) * movePower * (A / D)) / 50) + 2;
    if (attackerTypes.includes(moveType)) dmg = Math.floor(dmg * 1.5); // STAB
    dmg = Math.floor(dmg * effectiveness);
    const rng = (85 + Math.floor(Math.random() * 16)) / 100;
    dmg = Math.floor(dmg * rng);
    // Crit: base 6.25%, highCrit = 12.5%
    const critRate = move.highCrit ? 0.125 : 0.0625;
    const hitCrit = Math.random() < critRate;
    if (hitCrit) { isCrit = true; dmg = Math.floor(dmg * 1.5); }
    totalDmg += Math.max(1, dmg);
  }

  const finalDmg = Math.max(1, totalDmg);
  const recoil = recoilFrac > 0 ? Math.max(1, Math.floor(finalDmg * recoilFrac)) : 0;

  // Secondary status effect (chance-based)
  let appliedStatus: MajorStatus = null;
  let appliedConfusion = false;
  if (move.effect && defenderStatus) {
    const roll = Math.random() * 100;
    if (roll < move.effect.chance) {
      if (move.effect.type === 'confusion') {
        appliedConfusion = true;
      } else if (defenderStatus.condition === null) {
        appliedStatus = effectTypeToStatus(move.effect.type);
      }
    }
  }

  const drainHeal = move.draining && finalDmg > 0 ? Math.floor(finalDmg * move.draining) : undefined;
  const allStatBoosted = move.allStatBoost && finalDmg > 0
    ? Math.random() * 100 < move.allStatBoost.chance
    : undefined;

  return {
    damage: finalDmg, effectiveness, moveName, isCrit, isMiss: false,
    moveType, recoil, hits: hitCount,
    statusEffect: move.effect,
    statBoost: move.statBoost,
    appliedStatus,
    appliedConfusion: appliedConfusion || undefined,
    priority: movePriority,
    cureDefenderStatus,
    drainHeal,
    allStatBoosted,
  };
}

function effectTypeToStatus(effectType: string): MajorStatus {
  switch (effectType) {
    case 'burn':      return 'brn';
    case 'poison':    return 'psn';
    case 'toxic':     return 'tox';
    case 'paralysis': return 'par';
    case 'sleep':     return 'slp';
    case 'freeze':    return 'frz';
    default:          return null;
  }
}

/** Self-hit damage from confusion: base power 40, physical, typeless, uses attacker's own Atk/Def */
export function calcConfusionSelfDamage(level: number, attack: number, defense: number): number {
  const dmg = Math.floor(Math.floor(Math.floor((2 * level / 5) + 2) * 40 * (attack / defense)) / 50) + 2;
  const rng = (85 + Math.floor(Math.random() * 16)) / 100;
  return Math.max(1, Math.floor(dmg * rng));
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
    recoil: Math.max(1, Math.floor(finalDmg * 0.25)), hits: 1, priority: 0,
  };
}

// ── Get move list ────────────────────────────────────────────────────────────

export type RawMove = {
  id?: string;
  name: string; type: string; category: string; power: number;
  accuracy: number; pp: number; description?: string;
  multiHit?: boolean; highCrit?: boolean;
  statBoost?: StatBoost;
  effect?: { type: string; chance: number };
  recoil?: number;
  alwaysHit?: boolean;
  priority?: number;
  draining?: number;
  allStatBoost?: { stages: number; chance: number };
  isSeed?: boolean;
};

/**
 * Get the 4 active moves for a Pokémon.
 * Priority order: customSlugs (from gen1Moves) > customIndices (old system) > hardcoded moves in gen1Stats
 */
export function getMoveListRaw(
  pokemonId: number,
  customIndices?: number[],
  customSlugs?: string[],
): RawMove[] {
  // New system: slug-based custom moves from gen1Moves
  if (customSlugs && customSlugs.length > 0) {
    try {
      const movesMap = getMovesBySlug();
      if (movesMap) {
        const resolved = customSlugs.map(slug => movesMap[slug]).filter(Boolean) as RawMove[];
        // Pad to 4 with default moves if some slugs were invalid or fewer than 4 saved
        if (resolved.length < 4) {
          const defaults = (GEN1_STATS[pokemonId]?.moves ?? []) as RawMove[];
          for (const m of defaults) {
            if (resolved.length >= 4) break;
            if (!resolved.find(r => r.name === m.name)) resolved.push(m);
          }
        }
        return resolved;
      }
    } catch {
      // fall through to old system
    }
  }

  const s = GEN1_STATS[pokemonId];
  const pool = (s as unknown as { movepool?: unknown[] })?.movepool ?? s?.moves ?? [];

  if (customIndices && pool.length > 0) {
    return customIndices.map(i => pool[i]).filter(Boolean) as RawMove[];
  }
  return (s?.moves ?? []) as RawMove[];
}

// Registry for gen1Moves — populated at runtime by calling registerMoves()
let _movesCache: Record<string, RawMove> | null = null;
export function registerMoves(moves: Record<string, RawMove>): void {
  _movesCache = moves;
}
export function getMovesBySlug(): Record<string, RawMove> | null {
  return _movesCache;
}

/** Get moves from gen1Moves by slug array */
export function getMovesBySlugList(slugs: string[]): RawMove[] {
  const map = getMovesBySlug();
  if (!map) return [];
  return slugs.map(s => map[s]).filter(Boolean) as RawMove[];
}

// ── Type matchup utilities ────────────────────────────────────────────────────

/** Best offensive effectiveness my types can achieve against enemy types */
export function bestOffenseMult(myTypes: PokemonType[], enemyTypes: PokemonType[]): number {
  let best = 0;
  for (const t of myTypes) {
    const eff = getTypeEffectiveness(t, enemyTypes);
    if (eff > best) best = eff;
  }
  return best === 0 ? 0.25 : best; // immunity treated as very bad
}

/** Worst damage multiplier I take from enemy types */
export function worstDefenseMult(enemyTypes: PokemonType[], myTypes: PokemonType[]): number {
  let worst = 0;
  for (const t of enemyTypes) {
    const eff = getTypeEffectiveness(t, myTypes);
    if (eff > worst) worst = eff;
  }
  return worst === 0 ? 0.25 : worst;
}

/**
 * Overall matchup score for myTypes vs enemyTypes.
 * Higher = better (I hit hard and take little damage).
 */
export function evaluateMatchup(myTypes: PokemonType[], enemyTypes: PokemonType[]): number {
  const offense = bestOffenseMult(myTypes, enemyTypes); // 0.25 … 4
  const defense = worstDefenseMult(enemyTypes, myTypes); // 0.25 … 4 (I take this much)
  return (offense * offense) / defense; // squares offense to strongly reward SE matchup
}

/**
 * Pick the best bench pokemon to send against enemyTypes.
 * Returns index in `bench`, or -1 if nothing available.
 */
export function chooseBestBenchIndex(
  bench: Array<{ pokemonId: number; currentHp: number }>,
  currentIdx: number,
  enemyTypes: PokemonType[],
): number {
  let bestIdx = -1;
  let bestScore = -1;
  for (let i = 0; i < bench.length; i++) {
    if (i === currentIdx || bench[i].currentHp <= 0) continue;
    const myTypes = (POKEMON_TYPE[bench[i].pokemonId] ?? ['normal']) as PokemonType[];
    const score = evaluateMatchup(myTypes, enemyTypes);
    if (score > bestScore) { bestScore = score; bestIdx = i; }
  }
  return bestIdx;
}

// ── Smart AI — move selection ─────────────────────────────────────────────────

export interface ChooseMoveOpts {
  attackerTypes?: PokemonType[];         // for STAB (defaults to POKEMON_TYPE[attackerId])
  defenderStages?: Stages;               // for debuff-cap check
  defenderCurrentHp?: number;            // for KO finisher check
  attackerLevel?: number;                // for KO damage estimate
  defenderLevel?: number;
  defenderPokemonId?: number;
}

export function chooseEnemyMoveIndex(
  attackerId: number,
  defenderTypes: PokemonType[],
  currentPP: number[],
  attackerStages: Stages,
  turnNumber: number,
  defenderStatus?: StatusState,
  _attackerStatus?: StatusState,
  enemyMoves?: RawMove[],
  opts?: ChooseMoveOpts,
): number {
  const moves = enemyMoves ?? (GEN1_STATS[attackerId]?.moves ?? []) as RawMove[];
  const attackerTypes = opts?.attackerTypes ?? ((POKEMON_TYPE[attackerId] ?? ['normal']) as PokemonType[]);

  const available = currentPP
    .map((pp, i) => pp > 0 ? i : -1)
    .filter(i => i >= 0);

  if (available.length === 0) return -1; // Struggle

  // ── Phase 1: KO finisher ─────────────────────────────────────────────────
  const { attackerLevel: aLvl, defenderLevel: dLvl, defenderPokemonId: dId, defenderCurrentHp: dHp } = opts ?? {};
  if (aLvl && dLvl && dId && dHp !== undefined) {
    for (const i of available) {
      const move = moves[i];
      if (!move || move.category === 'status') continue;
      const moveType = move.type as PokemonType;
      const effectiveness = getTypeEffectiveness(moveType, defenderTypes);
      if (effectiveness === 0) continue;
      const stab = attackerTypes.includes(moveType) ? 1.5 : 1;
      const atkStage = move.category === 'physical' ? attackerStages.attack : attackerStages.spAttack;
      const defStage = move.category === 'physical'
        ? (opts?.defenderStages?.defense ?? 0)
        : (opts?.defenderStages?.spDefense ?? 0);
      const atkStat = applyStage(
        move.category === 'physical' ? calcAttack(attackerId, aLvl) : calcSpAttack(attackerId, aLvl),
        atkStage,
      );
      const defStat = applyStage(
        move.category === 'physical' ? calcDefense(dId, dLvl) : calcSpDefense(dId, dLvl),
        defStage,
      );
      const estDmg = Math.floor(
        (Math.floor((2 * aLvl / 5 + 2) * (move.power ?? 50) * atkStat / Math.max(1, defStat) / 50) + 2)
        * effectiveness * stab,
      );
      if (estDmg >= dHp) return i; // guaranteed KO — always take it
    }
  }

  // ── Phase 2: Score each available move ───────────────────────────────────
  const scored = available.map(i => {
    const move = moves[i];
    if (!move) return { i, score: 0 };
    let score = 0;

    if (move.category === 'status') {
      if (move.effect) {
        const effectStatus = effectTypeToStatus(move.effect.type);
        if (effectStatus) {
          // Never apply if target already has a major status
          score = (defenderStatus?.condition !== null)
            ? 0
            : (turnNumber <= 2 ? 70 : 25);
        }
      }
      if (move.statBoost) {
        const { target, stat, stages: boostAmt } = move.statBoost;
        if (target === 'self') {
          const curStage = attackerStages[stat as StageKey] ?? 0;
          // Stop buffing at +2 — switch to dealing damage
          score = curStage >= 2 ? 0 : (turnNumber <= 2 ? 60 : 18);
        } else {
          // Debuff opponent — stop at -2, only useful early
          const foeStage = opts?.defenderStages?.[stat as StageKey] ?? 0;
          score = foeStage <= -2 ? 0 : (turnNumber === 1 ? 40 * Math.abs(boostAmt) : 8);
        }
      }
      // Generic status move with no identified effect gets low priority
      if (!move.effect && !move.statBoost) score = 5;
    } else {
      const moveType = move.type as PokemonType;
      const effectiveness = getTypeEffectiveness(moveType, defenderTypes);
      if (effectiveness === 0) {
        score = 0; // immune — never use
      } else {
        const stab = attackerTypes.includes(moveType) ? 1.5 : 1;
        score = (move.power ?? 50) * effectiveness * stab;
        if (move.highCrit) score *= 1.15;
        if (move.multiHit) score *= 1.3;
        if (effectiveness >= 2) score *= 1.1; // small bonus on top of the raw calc
      }
    }

    return { i, score };
  }).filter(x => x.score > 0);

  if (scored.length === 0) {
    return available[Math.floor(Math.random() * available.length)];
  }

  // ── Phase 3: Deterministic pick — tiny noise only on near-ties ───────────
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  const second = scored[1];
  // If two moves are within 8% of each other, vary slightly to avoid mechanical play
  if (second && second.score >= best.score * 0.92) {
    return Math.random() < 0.72 ? best.i : second.i;
  }
  return best.i;
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
