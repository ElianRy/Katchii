import { useState, useEffect, useRef, useCallback } from 'react';
import { SpawnedPokemon, Rarity, RARITY_WEIGHTS } from '../types';
import { GEN1_POKEMON, POKEMON_BY_RARITY, POKEMON_BY_ID } from '../data/gen1';
import { NARUTO_ZONE1, NARUTO_BY_RARITY } from '../data/naruto';
import { ZONE_BY_ID } from '../data/zones';
import { useGameState } from './useGameState';

const MAX_SPAWNED = 3;
const SPAWN_INTERVAL_MS = 300;
const SPAWN_CHANCE = 0.28;
const EXPIRE_INTERVAL_MS = 500;
const MIN_LIFETIME = 9000;
const MAX_LIFETIME = 14000;
const POKEBALL_SPIN_MS = 1350;
const POST_CAPTURE_MS = 400;
const LEAVE_DURATION_MS = 800;

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function weightedRarity(weights: Record<Rarity, number>): Rarity {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const [rarity, weight] of Object.entries(weights) as [Rarity, number][]) {
    r -= weight;
    if (r <= 0) return rarity;
  }
  return 'commun';
}

function pickPokemon(rarity: Rarity, zoneIds: number[]): number {
  const allPool = POKEMON_BY_RARITY[rarity] ?? [];
  const zonePool = zoneIds.length > 0 ? allPool.filter(p => zoneIds.includes(p.id)) : allPool;
  if (zonePool.length === 0) return zoneIds[Math.floor(Math.random() * zoneIds.length)] ?? GEN1_POKEMON[0].id;
  return zonePool[Math.floor(Math.random() * zonePool.length)].id;
}

function getZoneRarities(zoneIds: number[]): Set<Rarity> {
  const rarities = new Set<Rarity>();
  for (const id of zoneIds) {
    const p = POKEMON_BY_ID[id];
    if (p) rarities.add(p.rarity);
  }
  return rarities;
}

function pickNaruto(rarity: Rarity): string {
  const pool = (NARUTO_BY_RARITY as Record<string, typeof NARUTO_ZONE1>)[rarity];
  if (!pool || pool.length === 0) return NARUTO_ZONE1[0].id;
  return pool[Math.floor(Math.random() * pool.length)].id;
}

function getValidPosition(existing: SpawnedPokemon[]): { x: number; y: number } | null {
  for (let attempt = 0; attempt < 10; attempt++) {
    const x = 5 + Math.random() * 80;
    const y = 10 + Math.random() * 60;
    // Avoid HUD zone (top-left)
    if (x < 35 && y < 30) continue;
    // Check distance from existing spawned
    const tooClose = existing.some(s =>
      Math.sqrt(Math.pow(s.x - x, 2) + Math.pow(s.y - y, 2)) < 15
    );
    if (!tooClose) return { x, y };
  }
  return null;
}

let uidCounter = 0;
function nextUid(): string {
  return `spawn_${Date.now()}_${uidCounter++}`;
}

export function useSpawner(
  gameState: ReturnType<typeof useGameState>
) {
  const [spawned, setSpawned] = useState<SpawnedPokemon[]>([]);
  const [leavingUids, setLeavingUids] = useState<Set<string>>(new Set());
  const stateRef = useRef(gameState);
  stateRef.current = gameState;

  const capture = useCallback((uid: string) => {
    setSpawned((prev) =>
      prev.map((s) => (s.uid === uid ? { ...s, capturing: true } : s))
    );

    setTimeout(() => {
      setSpawned((prev) =>
        prev.map((s) => (s.uid === uid ? { ...s, captured: true } : s))
      );

      setTimeout(() => {
        setSpawned((prev) => prev.filter((s) => s.uid !== uid));
      }, POST_CAPTURE_MS);
    }, POKEBALL_SPIN_MS);
  }, []);

  // Spawn interval
  useEffect(() => {
    const id = setInterval(() => {
      setSpawned((prev) => {
        const active = prev.filter((s) => !s.captured);
        if (active.length >= MAX_SPAWNED) return prev;
        if (Math.random() > SPAWN_CHANCE) return prev;

        const gs = stateRef.current;
        const mult = gs.getActiveLureMultipliers();

        const baseWeights: Record<Rarity, number> = {
          commun: RARITY_WEIGHTS.commun,
          peu_commun: RARITY_WEIGHTS.peu_commun,
          rare: RARITY_WEIGHTS.rare * mult.rare,
          elite: RARITY_WEIGHTS.elite * mult.elite,
          legendaire: RARITY_WEIGHTS.legendaire * mult.legendaire,
        };

        const universe = gs.state.activeUniverse;

        let pokemonId: number;
        let characterId: string | undefined;
        let isShiny: boolean;

        const zoneId = gs.state.zoneProgress?.currentZoneId ?? 'zone1';
        const currentZone = ZONE_BY_ID[zoneId];
        const zoneIds = currentZone?.pokemonIds ?? [];
        const zoneRarities = universe === 'naruto' ? null : getZoneRarities(zoneIds);

        // Zero out rarities not present in this zone
        const zoneWeights: Record<Rarity, number> = {
          commun: (!zoneRarities || zoneRarities.has('commun')) ? baseWeights.commun : 0,
          peu_commun: (!zoneRarities || zoneRarities.has('peu_commun')) ? baseWeights.peu_commun : 0,
          rare: (!zoneRarities || zoneRarities.has('rare')) ? baseWeights.rare : 0,
          elite: (!zoneRarities || zoneRarities.has('elite')) ? baseWeights.elite : 0,
          legendaire: (!zoneRarities || zoneRarities.has('legendaire')) ? baseWeights.legendaire : 0,
        };

        const rarity = weightedRarity(zoneWeights);

        if (universe === 'naruto') {
          const nId = pickNaruto(rarity);
          characterId = nId;
          pokemonId = 0;
          const shinyDepleted = gs.state.narutoShinyDepleted;
          const total = NARUTO_ZONE1.length;
          const baseShinyRate = (1 / 250) * (total / Math.max(1, total - shinyDepleted.length));
          const shinyRate = baseShinyRate * mult.shinyRate;
          isShiny = !shinyDepleted.includes(nId) && Math.random() < shinyRate;
        } else {
          pokemonId = pickPokemon(rarity, zoneIds);
          const shinyDepleted = gs.state.shinyDepleted;
          const baseShinyRate = (1 / 250) * (151 / Math.max(1, 151 - shinyDepleted.length));
          const shinyRate = baseShinyRate * mult.shinyRate;
          isShiny = !shinyDepleted.includes(pokemonId) && Math.random() < shinyRate;
        }

        const pos = getValidPosition(active);
        if (!pos) return prev; // skip if no valid position found

        const newSpawn: SpawnedPokemon = {
          uid: nextUid(),
          pokemonId,
          characterId,
          isShiny,
          spawnedAt: Date.now(),
          lifetime: randomBetween(MIN_LIFETIME, MAX_LIFETIME),
          x: pos.x,
          y: pos.y,
          capturing: false,
          captured: false,
        };

        return [...prev, newSpawn];
      });
    }, SPAWN_INTERVAL_MS);

    return () => clearInterval(id);
  }, []);

  // Expire interval — add leaving animation before removal
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      setSpawned((prev) => {
        const toLeave: string[] = [];
        const filtered = prev.filter((s) => {
          if (s.capturing || s.captured) return true;
          const elapsed = now - s.spawnedAt;
          if (elapsed >= s.lifetime) {
            // About to expire
            toLeave.push(s.uid);
            return false;
          }
          return true;
        });

        if (toLeave.length > 0) {
          setLeavingUids((prev) => {
            const next = new Set(prev);
            toLeave.forEach((uid) => next.add(uid));
            return next;
          });
          // After leave animation, remove from leavingUids
          setTimeout(() => {
            setLeavingUids((prev) => {
              const next = new Set(prev);
              toLeave.forEach((uid) => next.delete(uid));
              return next;
            });
          }, LEAVE_DURATION_MS);
        }

        return filtered;
      });
    }, EXPIRE_INTERVAL_MS);

    return () => clearInterval(id);
  }, []);

  return { spawned, capture, leavingUids };
}
