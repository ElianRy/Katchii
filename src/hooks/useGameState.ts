import { useState, useCallback } from 'react';
import { GameState, Rarity, LureType, FIRST_CAPTURE_POINTS, LURE_COSTS, RARITY_WEIGHTS } from '../types';
import { loadState, saveState } from '../lib/storage';

const COOLDOWN_MS = 60_000;
const LURE_DURATION_MS = 10 * 60_000;

export function useGameState() {
  const [state, setState] = useState<GameState>(() => loadState());

  const update = useCallback((updater: (prev: GameState) => GameState) => {
    setState(prev => {
      const next = updater(prev);
      saveState(next);
      return next;
    });
  }, []);

  const addCapture = useCallback((pokemonId: number, isShiny: boolean, rarity: Rarity): number => {
    let pointsEarned = 0;

    update(prev => {
      const next = { ...prev };

      if (isShiny) {
        const alreadyCaughtShiny = (prev.shinyCollection[pokemonId] ?? 0) > 0;
        next.shinyCollection = { ...prev.shinyCollection, [pokemonId]: (prev.shinyCollection[pokemonId] ?? 0) + 1 };
        if (!alreadyCaughtShiny) {
          pointsEarned = rarity === 'legendaire' ? 50 : 20;
          next.points = prev.points + pointsEarned;
          next.globalCooldownUntil = Date.now() + COOLDOWN_MS;
          if (!prev.shinyDepleted.includes(pokemonId)) {
            next.shinyDepleted = [...prev.shinyDepleted, pokemonId];
          }
        } else {
          // Dupe shiny = fragments
          next.fragments = { ...prev.fragments, [pokemonId]: (prev.fragments[pokemonId] ?? 0) + 1 };
        }
      } else {
        const alreadyCaught = (prev.normalCollection[pokemonId] ?? 0) > 0;
        next.normalCollection = { ...prev.normalCollection, [pokemonId]: (prev.normalCollection[pokemonId] ?? 0) + 1 };
        if (!alreadyCaught) {
          pointsEarned = FIRST_CAPTURE_POINTS[rarity];
          next.points = prev.points + pointsEarned;
          next.globalCooldownUntil = Date.now() + COOLDOWN_MS;
        } else {
          // Dupe = fragment
          next.fragments = { ...prev.fragments, [pokemonId]: (prev.fragments[pokemonId] ?? 0) + 1 };
        }
      }

      return next;
    });

    return pointsEarned;
  }, [update]);

  const buyLure = useCallback((type: LureType): boolean => {
    let success = false;
    update(prev => {
      if (prev.points < LURE_COSTS[type]) return prev;
      success = true;
      return {
        ...prev,
        points: prev.points - LURE_COSTS[type],
        lures: { ...prev.lures, [type]: prev.lures[type] + 1 },
      };
    });
    return success;
  }, [update]);

  const activateLure = useCallback((type: LureType): boolean => {
    let success = false;
    update(prev => {
      if (prev.lures[type] <= 0) return prev;
      success = true;
      return {
        ...prev,
        lures: { ...prev.lures, [type]: prev.lures[type] - 1 },
        activeLure: { type, expiresAt: Date.now() + LURE_DURATION_MS },
      };
    });
    return success;
  }, [update]);

  const getActiveLureMultipliers = useCallback(() => {
    const defaults = { rare: 1, elite: 1, legendaire: 1, shinyRate: 1 / 250 };
    if (!state.activeLure || Date.now() > state.activeLure.expiresAt) return defaults;
    const { type } = state.activeLure;
    if (type === 'rare')      return { ...defaults, rare: 4 };
    if (type === 'epique')    return { ...defaults, elite: 4 };
    if (type === 'legendaire') return { ...defaults, legendaire: 4 };
    if (type === 'shiny')     return { ...defaults, shinyRate: 1 / 62.5 };
    return defaults;
  }, [state.activeLure]);

  const getEffectiveWeights = useCallback((): Record<Rarity, number> => {
    const mult = getActiveLureMultipliers();
    return {
      commun:     RARITY_WEIGHTS.commun,
      peu_commun: RARITY_WEIGHTS.peu_commun,
      rare:       RARITY_WEIGHTS.rare * mult.rare,
      elite:      RARITY_WEIGHTS.elite * mult.elite,
      legendaire: RARITY_WEIGHTS.legendaire * mult.legendaire,
    };
  }, [getActiveLureMultipliers]);

  const isOnCooldown = useCallback((): boolean => {
    if (!state.globalCooldownUntil) return false;
    return Date.now() < state.globalCooldownUntil;
  }, [state.globalCooldownUntil]);

  const cooldownRemaining = useCallback((): number => {
    if (!state.globalCooldownUntil) return 0;
    return Math.max(0, Math.ceil((state.globalCooldownUntil - Date.now()) / 1000));
  }, [state.globalCooldownUntil]);

  const isCaught = useCallback((id: number) => (state.normalCollection[id] ?? 0) > 0, [state.normalCollection]);
  const isShinyCaught = useCallback((id: number) => (state.shinyCollection[id] ?? 0) > 0, [state.shinyCollection]);

  const totalCaught = Object.keys(state.normalCollection).length;
  const totalShinyCaught = Object.keys(state.shinyCollection).length;

  return {
    state,
    addCapture,
    buyLure,
    activateLure,
    getActiveLureMultipliers,
    getEffectiveWeights,
    isOnCooldown,
    cooldownRemaining,
    isCaught,
    isShinyCaught,
    totalCaught,
    totalShinyCaught,
  };
}
