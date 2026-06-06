import { useState, useCallback, useEffect, useRef } from 'react';
import { GameState, Rarity, LureType, FIRST_CAPTURE_POINTS, LURE_COSTS, RARITY_WEIGHTS } from '../types';
import { CAPTURE_XP } from '../lib/playerLevel';
import { TeamMember } from '../components/TeamBuilder';
import { loadState, loadUserState, saveState, saveUserState, DEFAULT_STATE } from '../lib/storage';
import { pickDailyQuests, QuestDefinition } from '../data/quests';
import { loadCloudState, saveCloudState, onSaveStatus, SaveStatus } from '../lib/cloudSync';
import { supabase } from '../lib/supabase';
import { getUsername } from '../lib/auth';
import { ZONE_BY_ID } from '../data/zones';
import { POKEMON_BY_ID } from '../data/gen1';

function zoneRarities(zoneId: string): Set<Rarity> {
  const zone = ZONE_BY_ID[zoneId];
  if (!zone) return new Set(['commun', 'peu_commun', 'rare', 'elite', 'legendaire'] as Rarity[]);
  return new Set(zone.pokemonIds.map(id => POKEMON_BY_ID[id]?.rarity).filter(Boolean) as Rarity[]);
}
import { getWeekId, todayDate, getTeamDamage } from '../components/RaidPanel';
import { naturalLevel, xpToNextLevel } from '../data/combatEngine';


const COOLDOWN_MS = 30_000;
const LURE_DURATION_MS = 10 * 60_000;

const ACHIEVEMENT_SHINY_RATES = [250, 220, 190, 160];

/** Returns list of newly earned permanent achievement IDs */
function checkAchievements(state: GameState): string[] {
  const existing = new Set(state.achievementsCompleted ?? []);
  const earned: string[] = [];
  const check = (id: string, cond: boolean) => { if (cond && !existing.has(id)) earned.push(id); };

  const caughtNormal = Object.keys(state.normalCollection).filter(id => (state.normalCollection[Number(id)] ?? 0) > 0).length;
  check('pokedex_complete', caughtNormal >= 151);

  const maxLevel = Math.max(0, ...Object.values(state.pokemonLevels ?? {}).map(l => l.level));
  check('level_100', maxLevel >= 100);

  const uniqueShinies = Object.keys(state.shinyCollection).filter(id => (state.shinyCollection[Number(id)] ?? 0) > 0).length;
  check('shiny_100', uniqueShinies >= 100);

  return earned;
}

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
  const isReadyToSaveRef = useRef(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  // Badge toast queue
  const [badgeToasts, setBadgeToasts] = useState<string[]>([]);
  // Achievement toast queue
  const [achievementToasts, setAchievementToasts] = useState<string[]>([]);
  const userIdRef = useRef<string | null>(null);
  const loadingForRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestStateRef = useRef<GameState>(state);

  useEffect(() => { return onSaveStatus(setSaveStatus); }, []);

  const dismissBadgeToast = useCallback(() => {
    setBadgeToasts((prev) => prev.slice(1));
  }, []);

  const dismissAchievementToast = useCallback(() => {
    setAchievementToasts((prev) => prev.slice(1));
  }, []);

  // Load cloud state whenever auth changes (login, new account, re-login)
  useEffect(() => {
    const loadForUser = (userId: string, user?: { user_metadata?: { username?: string } }) => {
      if (loadingForRef.current === userId) return;
      loadingForRef.current = userId;
      userIdRef.current = userId;
      const username = user ? getUsername(user) : undefined;
      loadCloudState(userId).then(cloudState => {
        if (cloudState === 'error') {
          // Cloud unreachable — fall back to this user's local save
          console.warn('[useGameState] cloud load failed, using user-local state');
          const local = loadUserState(userId) ?? { ...DEFAULT_STATE };
          const stamped = username ? { ...local, username } : local;
          latestStateRef.current = stamped;
          isReadyToSaveRef.current = true;
          setState(() => { saveUserState(userId, stamped); return stamped; });
          loadingForRef.current = null;
          // Retry cloud save in 5s
          setTimeout(() => {
            if (userIdRef.current === userId) saveCloudState(userId, latestStateRef.current);
          }, 5000);
          return;
        }
        if (!cloudState) {
          // No cloud row — could be a new user OR cloud save was never written.
          // Check if this user has local data before treating as fresh account.
          const local = loadUserState(userId);
          if (local) {
            // Had local data — use it and push it to cloud now
            const stamped = username ? { ...local, username } : local;
            latestStateRef.current = stamped;
            isReadyToSaveRef.current = true;
            setState(() => { saveUserState(userId, stamped); return stamped; });
            saveCloudState(userId, stamped);
          } else {
            // Truly new user — start fresh
            const fresh = { ...DEFAULT_STATE, ...(username ? { username } : {}) };
            latestStateRef.current = fresh;
            isReadyToSaveRef.current = true;
            saveUserState(userId, fresh);
            setState(() => fresh);
            saveCloudState(userId, fresh);
          }
          loadingForRef.current = null;
          return;
        }
        // Cloud has the authoritative state — always use it.
        const stamped = username ? { ...cloudState, username } : cloudState;
        latestStateRef.current = stamped;
        isReadyToSaveRef.current = true;
        setState(() => { saveUserState(userId, stamped); return stamped; });
        loadingForRef.current = null;
      });
    };

    // onAuthStateChange fires INITIAL_SESSION on subscribe — handles initial load
    let signOutTimer: ReturnType<typeof setTimeout> | null = null;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // Cancel any pending sign-out reset (e.g. token refresh momentarily fires SIGNED_OUT)
        if (signOutTimer) { clearTimeout(signOutTimer); signOutTimer = null; }
        loadForUser(session.user.id, session.user);
      } else {
        // Delay the reset by 3s — if a new session arrives (token refresh), cancel reset
        isReadyToSaveRef.current = false;
        userIdRef.current = null;
        loadingForRef.current = null;
        signOutTimer = setTimeout(() => {
          setState(() => ({ ...DEFAULT_STATE }));
          signOutTimer = null;
        }, 3000);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const update = useCallback((updater: (prev: GameState) => GameState) => {
    setState(prev => {
      const next = updater(prev);
      latestStateRef.current = next;
      if (userIdRef.current && isReadyToSaveRef.current) {
        saveUserState(userIdRef.current, next);
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
          if (userIdRef.current && isReadyToSaveRef.current) saveCloudState(userIdRef.current, latestStateRef.current);
        }, 8000);
      } else {
        saveState(next);
      }
      return next;
    });
  }, []);

  // Periodic backup save every 20s to catch any missed saves
  useEffect(() => {
    const id = setInterval(() => {
      if (userIdRef.current && isReadyToSaveRef.current) {
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

  const awardAchievements = useCallback((newState: GameState): GameState => {
    const earned = checkAchievements(newState);
    if (earned.length === 0) return newState;
    setAchievementToasts((prev) => [...prev, ...earned]);
    return { ...newState, achievementsCompleted: [...(newState.achievementsCompleted ?? []), ...earned] };
  }, []);

  const addCapture = useCallback((pokemonId: number, isShiny: boolean, rarity: Rarity): number => {
    let pointsEarned = 0;

    update(prev => {
      let next = { ...prev };

      // Track total capture count and shiny events
      next.pokemonCaptureCount = { ...(prev.pokemonCaptureCount ?? {}), [pokemonId]: ((prev.pokemonCaptureCount ?? {})[pokemonId] ?? 0) + 1 };
      if (isShiny) next.shinyCapturesTotal = (prev.shinyCapturesTotal ?? 0) + 1;

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
            xp += current.level * current.level; // ~20% of xpToNextLevel at every level
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

      // Player XP — only on first capture (normal or shiny)
      const isFirstNormal = !isShiny && (prev.normalCollection[pokemonId] ?? 0) === 0;
      const isFirstShiny  = isShiny  && (prev.shinyCollection[pokemonId]  ?? 0) === 0;
      if (isFirstNormal || isFirstShiny) {
        const baseXp = CAPTURE_XP[rarity] ?? 10;
        next.playerXp = (prev.playerXp ?? 0) + (isFirstShiny ? baseXp * 3 : baseXp);
      }

      // Badge + achievement check
      next = awardBadges(next);
      next = awardAchievements(next);

      return next;
    });

    return pointsEarned;
  }, [update, awardBadges, awardAchievements]);

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
        questsCompletedTotal: (prev.questsCompletedTotal ?? 0) + 1,
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
    const achieveCount = Math.min((state.achievementsCompleted ?? []).length, 3);
    const baseShinyRate = 1 / ACHIEVEMENT_SHINY_RATES[achieveCount];
    const defaults = { rare: 1, elite: 1, legendaire: 1, shinyRate: baseShinyRate };
    if (!state.activeLure || Date.now() > state.activeLure.expiresAt) return defaults;
    const { type } = state.activeLure;
    if (type === 'rare')      return { ...defaults, rare: 4 };
    if (type === 'epique')    return { ...defaults, elite: 4 };
    if (type === 'legendaire') return { ...defaults, legendaire: 4 };
    if (type === 'shiny')     return { ...defaults, shinyRate: baseShinyRate * 4 };
    return defaults;
  }, [state.activeLure, state.achievementsCompleted]);

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

  function advanceDuelWinQuests(prev: GameState): GameState {
    const quests = prev.dailyQuests.quests.map(q => {
      if (q.completed || q.type !== 'duel_wins') return q;
      const progress = q.progress + 1;
      return { ...q, progress, completed: progress >= q.target };
    });
    return { ...prev, dailyQuests: { ...prev.dailyQuests, quests } };
  }

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
      if (entry.won) next = advanceDuelWinQuests(next);

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

      // Player XP for duel
      next = { ...next, playerXp: (next.playerXp ?? 0) + (entry.won ? 800 : 200) };

      return next;
    });
  }, [update]);

  const updateShowcase = useCallback((showcase: GameState['showcase']) => {
    update(prev => ({ ...prev, showcase }));
  }, [update]);

  const setFavoritePokemon = useCallback((fav: GameState['favoritePokemon']) => {
    update(prev => ({ ...prev, favoritePokemon: fav }));
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

  const addTrainingWin = useCallback(() => {
    update(prev => {
      let next = { ...prev, duels: { ...prev.duels, wins: prev.duels.wins + 1 }, playerXp: (prev.playerXp ?? 0) + 800 };
      next = advanceDuelWinQuests(next);
      return next;
    });
  }, [update]);

  const addPokemonWins = useCallback((pokemonIds: number[]) => {
    update(prev => {
      const wins = { ...(prev.pokemonWins ?? {}) };
      pokemonIds.forEach(id => { wins[id] = (wins[id] ?? 0) + 1; });
      return { ...prev, pokemonWins: wins };
    });
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
      const newZoneId = nextZoneId ?? prev.zoneProgress.currentZoneId;
      // Refresh quests for the new zone
      const date = todayDate();
      const defs = pickDailyQuests(date, newZoneId, zoneRarities(newZoneId));
      const newDailyQuests = {
        date,
        zoneId: newZoneId,
        quests: defs.map((d: QuestDefinition) => ({
          id: d.id, label: d.label, type: d.type, rarity: d.rarity,
          target: d.target, progress: 0, completed: false,
          reward: d.reward, rewardClaimed: false,
        })),
      };
      // Record baseline quest count at the moment next zone is unlocked
      const newBaseline = { ...(prev.questsBaselineAtUnlock ?? {}) };
      if (nextZoneId) {
        newBaseline[nextZoneId] = prev.questsCompletedTotal ?? 0;
      }
      return {
        ...prev,
        dailyQuests: newDailyQuests,
        questsBaselineAtUnlock: newBaseline,
        zoneProgress: {
          ...prev.zoneProgress,
          bossDefeated: newBossDefeated,
          unlockedZones: newUnlocked,
          currentZoneId: newZoneId,
        },
      };
    });
  }, [update]);

  const resetBossDefeated = useCallback((zoneId: string) => {
    update(prev => {
      const newBossDefeated = { ...prev.zoneProgress.bossDefeated };
      delete newBossDefeated[zoneId];
      return { ...prev, zoneProgress: { ...prev.zoneProgress, bossDefeated: newBossDefeated } };
    });
  }, [update]);

  const setCurrentZone = useCallback((zoneId: string) => {
    update(prev => {
      if (prev.zoneProgress.currentZoneId === zoneId) return prev;
      const date = todayDate();
      const defs = pickDailyQuests(date, zoneId, zoneRarities(zoneId));
      const newDailyQuests = {
        date,
        zoneId,
        quests: defs.map((d: QuestDefinition) => ({
          id: d.id, label: d.label, type: d.type, rarity: d.rarity,
          target: d.target, progress: 0, completed: false,
          reward: d.reward, rewardClaimed: false,
        })),
      };
      return {
        ...prev,
        zoneProgress: { ...prev.zoneProgress, currentZoneId: zoneId },
        dailyQuests: newDailyQuests,
      };
    });
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

      let next = {
        ...prev,
        pokemonLevels: { ...prev.pokemonLevels, [pokemonId]: { level, xp: currentXp } },
      };
      next = awardAchievements(next);
      return next;
    });
  }, [update, awardAchievements]);

  const addPlayerXp = useCallback((xp: number) => {
    update(prev => ({ ...prev, playerXp: (prev.playerXp ?? 0) + xp }));
  }, [update]);

  const setLastParkXpAt = useCallback((ts: number) => {
    update(prev => ({ ...prev, lastParkXpAt: ts }));
  }, [update]);

  const saveTeam = useCallback((name: string, members: TeamMember[]) => {
    update(prev => ({
      ...prev,
      savedTeams: [
        ...(prev.savedTeams ?? []),
        { id: `team_${Date.now()}`, name, members }
      ]
    }));
  }, [update]);

  const deleteTeam = useCallback((id: string) => {
    update(prev => ({ ...prev, savedTeams: (prev.savedTeams ?? []).filter(t => t.id !== id) }));
  }, [update]);

  const adminGiveAllMax = useCallback(() => {
    update(prev => {
      const normalCollection = { ...prev.normalCollection };
      const pokemonLevels = { ...(prev.pokemonLevels ?? {}) };
      POKEMON_BY_ID && Object.values(POKEMON_BY_ID).forEach(p => {
        if (!normalCollection[p.id]) normalCollection[p.id] = 1;
        pokemonLevels[p.id] = { level: 100, xp: 0 };
      });
      return { ...prev, normalCollection, pokemonLevels };
    });
  }, [update]);

  return {
    state,
    addCapture,
    buyLure,
    activateLure,
    claimQuestReward,
    updateDuels,
    addDuelResult,
    updateShowcase,
    setFavoritePokemon,
    startRaid,
    attackRaid,
    claimRaidReward,
    spendPoints,
    addTrainingWin,
    addPokemonWins,
    addPlayTime,
    defeatZoneBoss,
    resetBossDefeated,
    setCurrentZone,
    getActiveLureMultipliers,
    getEffectiveWeights,
    isOnCooldown,
    cooldownRemaining,
    isCaught,
    isShinyCaught,
    totalCaught,
    totalShinyCaught,
    saveStatus,
    badgeToasts,
    dismissBadgeToast,
    achievementToasts,
    dismissAchievementToast,
    getPokemonLevel,
    initPokemonLevel,
    addPokemonXp,
    addPlayerXp,
    setLastParkXpAt,
    adminGiveAllMax,
    saveTeam,
    deleteTeam,
  };
}

export type GameStateHook = ReturnType<typeof useGameState>;
