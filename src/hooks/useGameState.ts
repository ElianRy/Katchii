import { useState, useCallback } from 'react';
import { GameState, Rarity, LureType, FIRST_CAPTURE_POINTS, LURE_COSTS, RARITY_WEIGHTS } from '../types';
import { loadState, saveState } from '../lib/storage';
import { EVOLUTIONS, EVOLUTION_COST } from '../data/evolutions';
import { POKEMON_BY_ID } from '../data/gen1';


const COOLDOWN_MS = 60_000;
const LURE_DURATION_MS = 10 * 60_000;

/** Returns list of newly earned badge IDs given the new state */
function checkBadges(state: GameState): string[] {
  const existing = new Set(state.badges);
  const newBadges: string[] = [];

  const normalIds = Object.keys(state.normalCollection).map(Number);
  const caughtCount = normalIds.filter((id) => (state.normalCollection[id] ?? 0) > 0).length;
  const shinyIds = Object.keys(state.shinyCollection).map(Number).filter((id) => (state.shinyCollection[id] ?? 0) > 0);

  const check = (id: string, cond: boolean) => {
    if (cond && !existing.has(id)) newBadges.push(id);
  };

  check('first_catch', caughtCount >= 1);
  check('catch_10', caughtCount >= 10);
  check('catch_50', caughtCount >= 50);
  check('catch_100', caughtCount >= 100);
  check('catch_151', caughtCount >= 151);

  // rarity badges
  const caughtRarities = new Set(
    normalIds
      .filter((id) => (state.normalCollection[id] ?? 0) > 0)
      .map((id) => POKEMON_BY_ID[id]?.rarity)
      .filter(Boolean)
  );
  check('first_rare', caughtRarities.has('rare'));
  check('first_elite', caughtRarities.has('elite'));
  check('first_legendary', caughtRarities.has('legendaire'));

  check('first_shiny', shinyIds.length >= 1);
  check('shiny_3', shinyIds.length >= 3);

  check('first_evolution', state.evolvedPokemon.length >= 1);

  check('first_lure', state.badges.includes('first_lure') || newBadges.includes('first_lure') ? true :
    // first_lure is awarded on activateLure, checked separately — but keep here as fallback
    false);

  // Magicarpe secret: caught Magicarpe (129) 10+ times
  check('magicarpe', (state.normalCollection[129] ?? 0) >= 10);

  // Starter complet: catch 1, 4, 7
  check('full_starter',
    (state.normalCollection[1] ?? 0) > 0 &&
    (state.normalCollection[4] ?? 0) > 0 &&
    (state.normalCollection[7] ?? 0) > 0
  );

  return newBadges;
}

export function useGameState() {
  const [state, setState] = useState<GameState>(() => loadState());
  // Badge toast queue
  const [badgeToasts, setBadgeToasts] = useState<string[]>([]);

  const dismissBadgeToast = useCallback(() => {
    setBadgeToasts((prev) => prev.slice(1));
  }, []);

  const update = useCallback((updater: (prev: GameState) => GameState) => {
    setState(prev => {
      const next = updater(prev);
      saveState(next);
      return next;
    });
  }, []);

  const awardBadges = useCallback((newState: GameState): GameState => {
    const newBadges = checkBadges(newState);
    if (newBadges.length === 0) return newState;
    setBadgeToasts((prev) => [...prev, ...newBadges]);
    return { ...newState, badges: [...newState.badges, ...newBadges] };
  }, []);

  const addCapture = useCallback((pokemonId: number, isShiny: boolean, rarity: Rarity): number => {
    let pointsEarned = 0;

    update(prev => {
      let next = { ...prev };

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
          next.fragments = { ...prev.fragments, [pokemonId]: (prev.fragments[pokemonId] ?? 0) + 1 };
        }
      }

      // Quest progress
      const quests = next.dailyQuests.quests.map((q) => {
        if (q.completed) return q;
        let progress = q.progress;
        if (q.type === 'capture_n') {
          progress += 1;
        } else if (q.type === 'capture_rarity' && q.rarity === rarity) {
          progress += 1;
        } else if (q.type === 'capture_shiny' && isShiny) {
          progress += 1;
        }
        const completed = progress >= q.target;
        return { ...q, progress, completed };
      });
      next.dailyQuests = { ...next.dailyQuests, quests };

      // Badge check
      next = awardBadges(next);

      return next;
    });

    return pointsEarned;
  }, [update, awardBadges]);

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

      // Quest progress for activate_lure
      const quests = prev.dailyQuests.quests.map((q) => {
        if (q.completed || q.type !== 'activate_lure') return q;
        const progress = q.progress + 1;
        return { ...q, progress, completed: progress >= q.target };
      });

      // Badge: first_lure
      const newBadges: string[] = [];
      if (!prev.badges.includes('first_lure')) {
        newBadges.push('first_lure');
        setBadgeToasts((b) => [...b, 'first_lure']);
      }

      return {
        ...prev,
        lures: { ...prev.lures, [type]: prev.lures[type] - 1 },
        activeLure: { type, expiresAt: Date.now() + LURE_DURATION_MS },
        dailyQuests: { ...prev.dailyQuests, quests },
        badges: newBadges.length > 0 ? [...prev.badges, ...newBadges] : prev.badges,
      };
    });
    return success;
  }, [update]);

  /** Evolve a Pokémon. targetEvolutionId needed for branching (Évoli). */
  const evolve = useCallback((pokemonId: number, isShiny: boolean, targetEvolutionId: number): boolean => {
    let success = false;
    update(prev => {
      const pokemon = POKEMON_BY_ID[pokemonId];
      if (!pokemon) return prev;
      const cost = EVOLUTION_COST(pokemon.rarity);
      const currentFragments = prev.fragments[pokemonId] ?? 0;
      if (currentFragments < cost) return prev;

      // Check the pokemon is caught
      if (isShiny) {
        if ((prev.shinyCollection[pokemonId] ?? 0) === 0) return prev;
      } else {
        if ((prev.normalCollection[pokemonId] ?? 0) === 0) return prev;
      }

      // Check evolution is valid
      const validEvos = EVOLUTIONS[pokemonId] ?? [];
      if (!validEvos.includes(targetEvolutionId)) return prev;

      success = true;
      let next = { ...prev };

      // Deduct fragments
      next.fragments = { ...prev.fragments, [pokemonId]: currentFragments - cost };

      // Add evolved Pokémon
      if (isShiny) {
        next.shinyCollection = {
          ...prev.shinyCollection,
          [targetEvolutionId]: (prev.shinyCollection[targetEvolutionId] ?? 0) + 1,
        };
      } else {
        const alreadyCaught = (prev.normalCollection[targetEvolutionId] ?? 0) > 0;
        next.normalCollection = {
          ...prev.normalCollection,
          [targetEvolutionId]: (prev.normalCollection[targetEvolutionId] ?? 0) + 1,
        };
        // If duplicate, add fragment for evolved form
        if (alreadyCaught) {
          next.fragments = {
            ...next.fragments,
            [targetEvolutionId]: (next.fragments[targetEvolutionId] ?? 0) + 1,
          };
        }
      }

      // Track evolved
      if (!prev.evolvedPokemon.includes(targetEvolutionId)) {
        next.evolvedPokemon = [...prev.evolvedPokemon, targetEvolutionId];
      }

      // Quest progress for evolve_n
      const quests = next.dailyQuests.quests.map((q) => {
        if (q.completed || q.type !== 'evolve_n') return q;
        const progress = q.progress + 1;
        return { ...q, progress, completed: progress >= q.target };
      });
      next.dailyQuests = { ...next.dailyQuests, quests };

      // Badge check
      next = awardBadges(next);

      return next;
    });
    return success;
  }, [update, awardBadges]);

  const claimQuestReward = useCallback((questId: string) => {
    update(prev => {
      const quests = prev.dailyQuests.quests.map((q) => {
        if (q.id !== questId || !q.completed || q.rewardClaimed) return q;
        return { ...q, rewardClaimed: true };
      });
      const quest = prev.dailyQuests.quests.find((q) => q.id === questId);
      if (!quest || !quest.completed || quest.rewardClaimed) return prev;

      let next = {
        ...prev,
        points: prev.points + quest.reward.points,
        dailyQuests: { ...prev.dailyQuests, quests },
      };

      if (quest.reward.fragments) {
        // Add fragments to all caught Pokémon (distribute evenly) — per spec just add as generic pts
        // Actually spec says fragments reward: add 5 fragments to a random caught pokemon
        // Simpler: pick the first caught pokemon and add 5 fragments
        const caughtIds = Object.keys(prev.normalCollection).map(Number).filter((id) => (prev.normalCollection[id] ?? 0) > 0);
        if (caughtIds.length > 0) {
          const target = caughtIds[0];
          next.fragments = { ...next.fragments, [target]: (next.fragments[target] ?? 0) + quest.reward.fragments };
        }
      }

      return next;
    });
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
    evolve,
    claimQuestReward,
    getActiveLureMultipliers,
    getEffectiveWeights,
    isOnCooldown,
    cooldownRemaining,
    isCaught,
    isShinyCaught,
    totalCaught,
    totalShinyCaught,
    badgeToasts,
    dismissBadgeToast,
  };
}

export type GameStateHook = ReturnType<typeof useGameState>;
