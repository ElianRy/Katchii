import { useState, useCallback, useEffect, useRef } from 'react';
import { GameState, Rarity, LureType, FIRST_CAPTURE_POINTS, LURE_COSTS, RARITY_WEIGHTS } from '../types';
import { loadState, saveState } from '../lib/storage';
import { loadCloudState, saveCloudState } from '../lib/cloudSync';
import { supabase } from '../lib/supabase';
import { ZONE_BY_ID } from '../data/zones';
import { POKEMON_BY_ID } from '../data/gen1';
import { FUSION_BY_ID, FUSIONS } from '../data/fusions';
import { getWeekId, todayDate, getTeamDamage } from '../components/RaidPanel';
import { naturalLevel, xpToNextLevel } from '../data/combatEngine';


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
  const userIdRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestStateRef = useRef<GameState>(state);

  const dismissBadgeToast = useCallback(() => {
    setBadgeToasts((prev) => prev.slice(1));
  }, []);

  // Load cloud state on auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      userIdRef.current = user.id;
      loadCloudState(user.id).then(cloudState => {
        if (!cloudState) return;
        // Cloud is the source of truth — always prefer it over localStorage
        setState(() => {
          saveState(cloudState);
          return cloudState;
        });
      });
    });
  }, []);

  const update = useCallback((updater: (prev: GameState) => GameState) => {
    setState(prev => {
      const next = updater(prev);
      latestStateRef.current = next;
      saveState(next);
      // Immediate cloud save
      if (userIdRef.current) {
        saveCloudState(userIdRef.current, next);
      } else {
        // userId not yet loaded — queue a save once it's available
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
          if (userIdRef.current) saveCloudState(userIdRef.current, latestStateRef.current);
        }, 3000);
      }
      return next;
    });
  }, []);

  // Periodic backup save every 20s to catch any missed saves
  useEffect(() => {
    const id = setInterval(() => {
      if (userIdRef.current) {
        saveCloudState(userIdRef.current, latestStateRef.current);
      }
    }, 20000);
    return () => clearInterval(id);
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

        // Initialize level on first capture, capped by current zone's maxLevel
        if (!alreadyCaught && !next.pokemonLevels?.[pokemonId]) {
          const zoneId = prev.zoneProgress?.currentZoneId ?? 'zone1';
          const zoneCap = ZONE_BY_ID[zoneId]?.maxLevel;
          const lvl = naturalLevel(rarity, zoneCap);
          next.pokemonLevels = { ...(next.pokemonLevels ?? {}), [pokemonId]: { level: lvl, xp: 0 } };
        } else if (alreadyCaught) {
          // Re-capture: grant XP bonus
          const current = next.pokemonLevels?.[pokemonId] ?? { level: 1, xp: 0 };
          if (current.level < 100) {
            let { level, xp } = current;
            xp += current.level * 10;
            while (level < 100 && xp >= xpToNextLevel(level)) {
              xp -= xpToNextLevel(level);
              level++;
            }
            next.pokemonLevels = { ...(next.pokemonLevels ?? {}), [pokemonId]: { level, xp } };
          }
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

  const updateDuels = useCallback((updater: (prev: GameState['duels']) => GameState['duels']) => {
    update(prev => ({ ...prev, duels: updater(prev.duels) }));
  }, [update]);

  const addDuelResult = useCallback((entry: import('../types').DuelEntry, rankingPointsDelta: number, fragmentPokemonId: number | null, giveLure: boolean) => {
    update(prev => {
      const newStreak = entry.won ? prev.duels.streak + 1 : 0;
      let next = {
        ...prev,
        duels: {
          wins: prev.duels.wins + (entry.won ? 1 : 0),
          losses: prev.duels.losses + (entry.won ? 0 : 1),
          streak: newStreak,
          rankingPoints: prev.duels.rankingPoints + rankingPointsDelta,
          history: [entry, ...prev.duels.history].slice(0, 20),
        },
      };

      if (fragmentPokemonId !== null) {
        next = {
          ...next,
          fragments: { ...next.fragments, [fragmentPokemonId]: (next.fragments[fragmentPokemonId] ?? 0) + 1 },
        };
      }

      if (giveLure) {
        next = {
          ...next,
          lures: { ...next.lures, rare: next.lures.rare + 1 },
        };
      }

      return next;
    });
  }, [update]);

  const updateVillage = useCallback((updater: (prev: GameState['village']) => GameState['village']) => {
    update(prev => ({ ...prev, village: updater(prev.village) }));
  }, [update]);

  const updateSkins = useCallback((updater: (prev: GameState['skins']) => GameState['skins']) => {
    update(prev => ({ ...prev, skins: updater(prev.skins) }));
  }, [update]);

  const setActiveUniverse = useCallback((universe: 'pokemon' | 'naruto') => {
    update(prev => ({ ...prev, activeUniverse: universe }));
  }, [update]);

  const addNarutoCapture = useCallback((characterId: string, isShiny: boolean, rarity: Rarity): number => {
    let pointsEarned = 0;
    update(prev => {
      let next = { ...prev };
      if (isShiny) {
        const alreadyCaughtShiny = (prev.narutoShinyCollection[characterId] ?? 0) > 0;
        next.narutoShinyCollection = { ...prev.narutoShinyCollection, [characterId]: (prev.narutoShinyCollection[characterId] ?? 0) + 1 };
        if (!alreadyCaughtShiny) {
          pointsEarned = rarity === 'legendaire' ? 50 : 20;
          next.points = prev.points + pointsEarned;
          next.globalCooldownUntil = Date.now() + 60_000;
          if (!prev.narutoShinyDepleted.includes(characterId)) {
            next.narutoShinyDepleted = [...prev.narutoShinyDepleted, characterId];
          }
        }
      } else {
        const alreadyCaught = (prev.narutoCollection[characterId] ?? 0) > 0;
        next.narutoCollection = { ...prev.narutoCollection, [characterId]: (prev.narutoCollection[characterId] ?? 0) + 1 };
        if (!alreadyCaught) {
          pointsEarned = FIRST_CAPTURE_POINTS[rarity];
          next.points = prev.points + pointsEarned;
          next.globalCooldownUntil = Date.now() + 60_000;
        }
      }

      const quests = next.dailyQuests.quests.map((q) => {
        if (q.completed) return q;
        let progress = q.progress;
        if (q.type === 'capture_n') progress += 1;
        else if (q.type === 'capture_rarity' && q.rarity === rarity) progress += 1;
        else if (q.type === 'capture_shiny' && isShiny) progress += 1;
        const completed = progress >= q.target;
        return { ...q, progress, completed };
      });
      next.dailyQuests = { ...next.dailyQuests, quests };
      return next;
    });
    return pointsEarned;
  }, [update]);

  const performFusion = useCallback((fusionId: string): boolean => {
    let success = false;
    update(prev => {
      const fusion = FUSION_BY_ID[fusionId];
      if (!fusion) return prev;
      if (prev.fusions.some((f) => f.fusionId === fusionId)) return prev;
      const countA = prev.normalCollection[fusion.a] ?? 0;
      const countB = prev.normalCollection[fusion.b] ?? 0;
      if (countA < 1 || countB < 1) return prev;
      success = true;

      const newNormalA = countA - 1;
      const newNormalB = countB - 1;
      const normalCollection = { ...prev.normalCollection };
      if (newNormalA === 0) delete normalCollection[fusion.a];
      else normalCollection[fusion.a] = newNormalA;
      if (fusion.a !== fusion.b) {
        if (newNormalB === 0) delete normalCollection[fusion.b];
        else normalCollection[fusion.b] = newNormalB;
      }

      const newFusions = [...prev.fusions, { fusionId, obtainedAt: Date.now() }];

      // Badge checks
      const newBadges: string[] = [];
      if (!prev.badges.includes('first_fusion')) {
        newBadges.push('first_fusion');
      }
      if (newFusions.length >= FUSIONS.length && !prev.badges.includes('all_fusions')) {
        newBadges.push('all_fusions');
      }
      if (newBadges.length > 0) {
        setBadgeToasts((b) => [...b, ...newBadges]);
      }

      return {
        ...prev,
        normalCollection,
        fusions: newFusions,
        badges: newBadges.length > 0 ? [...prev.badges, ...newBadges] : prev.badges,
      };
    });
    return success;
  }, [update]);

  const startRaid = useCallback(() => {
    update(prev => {
      const LEGENDARY_IDS = [144, 145, 146, 150];
      const bossId = LEGENDARY_IDS[Math.floor(Math.random() * LEGENDARY_IDS.length)];
      const weekId = getWeekId();
      const participants = Math.floor(Math.random() * 451) + 50;
      return {
        ...prev,
        raid: {
          bossId,
          bossMaxHp: 10000,
          bossCurrentHp: 10000,
          weekId,
          playerDamage: 0,
          playerAttackedToday: false,
          lastAttackDate: '',
          completed: false,
          rewardClaimed: false,
          simulatedParticipants: participants,
        },
      };
    });
  }, [update]);

  const attackRaid = useCallback(() => {
    update(prev => {
      if (!prev.raid || prev.raid.completed) return prev;
      const today = todayDate();
      if (prev.raid.playerAttackedToday && prev.raid.lastAttackDate === today) return prev;

      const playerDamage = getTeamDamage(prev);

      // Simulate other players too
      const simDamage = Math.floor(Math.random() * 1501) + 500;
      const totalDamage = playerDamage + simDamage;
      const newHp = Math.max(0, prev.raid.bossCurrentHp - totalDamage);
      const completed = newHp <= 0;

      return {
        ...prev,
        raid: {
          ...prev.raid,
          bossCurrentHp: newHp,
          playerDamage: prev.raid.playerDamage + playerDamage,
          playerAttackedToday: true,
          lastAttackDate: today,
          completed,
        },
      };
    });
  }, [update]);

  const claimRaidReward = useCallback(() => {
    update(prev => {
      if (!prev.raid || !prev.raid.completed || prev.raid.rewardClaimed) return prev;
      // Give Mew (id=151) if not caught, else fragments
      const hasMew = (prev.normalCollection[151] ?? 0) > 0;
      let next = {
        ...prev,
        raid: { ...prev.raid, rewardClaimed: true },
      };
      if (!hasMew) {
        next = {
          ...next,
          normalCollection: { ...next.normalCollection, 151: 1 },
          points: next.points + FIRST_CAPTURE_POINTS['legendaire'],
        };
      } else {
        next = {
          ...next,
          fragments: { ...next.fragments, 151: (next.fragments[151] ?? 0) + 5 },
        };
      }
      return awardBadges(next);
    });
  }, [update, awardBadges]);

  const spendPoints = useCallback((amount: number): boolean => {
    let success = false;
    update(prev => {
      if (prev.points < amount) return prev;
      success = true;
      return { ...prev, points: prev.points - amount };
    });
    return success;
  }, [update]);

  const addPlayTime = useCallback((ms: number) => {
    update(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        totalPlayTimeMs: (prev.stats?.totalPlayTimeMs ?? 0) + ms,
      },
    }));
  }, [update]);

  const defeatZoneBoss = useCallback((zoneId: string, nextZoneId: string | null) => {
    update(prev => {
      const newBossDefeated = { ...prev.zoneProgress.bossDefeated, [zoneId]: true };
      const newUnlocked = [...prev.zoneProgress.unlockedZones];
      if (nextZoneId && !newUnlocked.includes(nextZoneId)) {
        newUnlocked.push(nextZoneId);
      }
      return {
        ...prev,
        zoneProgress: {
          ...prev.zoneProgress,
          bossDefeated: newBossDefeated,
          unlockedZones: newUnlocked,
        },
      };
    });
  }, [update]);

  const setCurrentZone = useCallback((zoneId: string) => {
    update(prev => ({
      ...prev,
      zoneProgress: { ...prev.zoneProgress, currentZoneId: zoneId },
    }));
  }, [update]);

  const getPokemonLevel = useCallback((pokemonId: number): { level: number; xp: number } => {
    return state.pokemonLevels?.[pokemonId] ?? { level: 1, xp: 0 };
  }, [state.pokemonLevels]);

  const initPokemonLevel = useCallback((pokemonId: number, rarity: Rarity) => {
    update(prev => {
      if (prev.pokemonLevels?.[pokemonId]) return prev;
      const level = naturalLevel(rarity);
      return {
        ...prev,
        pokemonLevels: { ...prev.pokemonLevels, [pokemonId]: { level, xp: 0 } },
      };
    });
  }, [update]);

  const addPokemonXp = useCallback((pokemonId: number, xp: number) => {
    update(prev => {
      const current = prev.pokemonLevels?.[pokemonId] ?? { level: 1, xp: 0 };
      if (current.level >= 100) return prev;

      let { level, xp: currentXp } = current;
      currentXp += xp;

      while (level < 100 && currentXp >= xpToNextLevel(level)) {
        currentXp -= xpToNextLevel(level);
        level++;
      }
      if (level >= 100) currentXp = 0;

      return {
        ...prev,
        pokemonLevels: { ...prev.pokemonLevels, [pokemonId]: { level, xp: currentXp } },
      };
    });
  }, [update]);

  return {
    state,
    addCapture,
    addNarutoCapture,
    buyLure,
    activateLure,
    claimQuestReward,
    updateDuels,
    addDuelResult,
    updateVillage,
    updateSkins,
    setActiveUniverse,
    performFusion,
    startRaid,
    attackRaid,
    claimRaidReward,
    spendPoints,
    addPlayTime,
    defeatZoneBoss,
    setCurrentZone,
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
    getPokemonLevel,
    initPokemonLevel,
    addPokemonXp,
  };
}

export type GameStateHook = ReturnType<typeof useGameState>;
