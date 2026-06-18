import { useState, useCallback, useEffect, useRef } from 'react';
import { View, DuelEntry } from './types';
import { BottomNav } from './components/BottomNav';
import { HuntingField } from './components/HuntingField';
import { Collection } from './components/Collection';
import { LurePanel } from './components/LurePanel';
import { QuestPanel } from './components/QuestPanel';
import { DuelPanel } from './components/DuelPanel';
import { RaidPanel } from './components/RaidPanel';
import { WrappedPanel } from './components/WrappedPanel';
import { BadgeToast } from './components/BadgeToast';
import { WelcomeAnimation } from './components/WelcomeAnimation';
import { AuthScreen } from './components/AuthScreen';
import { HomeScreen } from './components/HomeScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { TeamBuilder } from './components/TeamBuilder';
import { AdminPanel } from './components/AdminPanel';
import { PokeParc } from './components/PokeParc';
import { SettingsPanel } from './components/SettingsPanel';
import { ClanPanel } from './components/ClanPanel';
import { BackpackPanel } from './components/BackpackPanel';
import { ShopPanel } from './components/ShopPanel';
import { CaseOpenScreen } from './components/CaseOpenScreen';
import { PlayersPanel } from './components/PlayersPanel';
import { BattleScreen } from './components/BattleScreen';
import { ThroneScreen } from './components/ThroneScreen';
import { TeamMember } from './components/TeamBuilder';
import { PvpChallengePopup } from './components/PvpChallengePopup';
import { PvpTeamSelect } from './components/PvpTeamSelect';
import { PvpBattleScreen } from './components/PvpBattleScreen';
import {
  sendChallenge, acceptChallenge, declineChallenge, cancelChallenge,
  subscribeToIncomingChallenges, subscribeToChallengeStatus, subscribeToSession, submitTeam,
} from './lib/pvp';
import type { PvpChallenge, PvpSession } from './lib/pvp';
import { useGameState } from './hooks/useGameState';
import { supabase } from './lib/supabase';
import { getUsername, logoutUser } from './lib/auth';
import { calcMaxHp } from './data/combatEngine';
import { POKEMON_BY_ID } from './data/gen1';
import { playMenuMusic, stopMusic, playZoneMusic, playSfxConfirm, pauseCurrentMusic, resumeCurrentMusic } from './lib/audio';

export function App() {
  const [view, setView] = useState<View>('auth');
  const [username, setUsername] = useState<string>('Joueur');
  const [userId, setUserId] = useState<string>('');
  const [authChecked, setAuthChecked] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showPlayers, setShowPlayers] = useState(false);
  const [previousView, setPreviousView] = useState<View>('home');
  const [battle3v3, setBattle3v3] = useState<{ playerTeam: TeamMember[]; enemyTeam: TeamMember[]; enemyName: string; onDone?: (dmg: number, won: boolean) => void } | null>(null);
  const [openingCase, setOpeningCase] = useState(false);
  const [forcePwChange, setForcePwChange] = useState<{ tempPw: string } | null>(null);
  const [forcePwInput, setForcePwInput] = useState('');
  const [forcePwConfirm, setForcePwConfirm] = useState('');
  const [forcePwError, setForcePwError] = useState('');
  const [forcePwLoading, setForcePwLoading] = useState(false);
  const prevViewRef = useRef<View>('auth');
  const gameState = useGameState();

  // ── PvP state ────────────────────────────────────────────────────────────────
  const [pvpIncoming, setPvpIncoming] = useState<PvpChallenge | null>(null);
  const [pvpSession, setPvpSession] = useState<PvpSession | null>(null);
  const [pvpPhase, setPvpPhase] = useState<'idle' | 'team_select' | 'battle'>('idle');
  const [pvpIsHost, setPvpIsHost] = useState(false);
  const [pvpMyTeam, setPvpMyTeam] = useState<TeamMember[]>([]);
  const [pvpOpponentTeam, setPvpOpponentTeam] = useState<TeamMember[]>([]);
  const [pvpOpponentName, setPvpOpponentName] = useState('');
  const pvpCleanupRef = useRef<(() => void) | null>(null);
  const [pvpWaiting, setPvpWaiting] = useState<{ name: string; cancel: () => void } | null>(null);

  // Persist & restore last view — throttled to prevent rapid-tap page bugs
  const lastNavRef = useRef(0);
  const persistView = useCallback((v: View) => {
    const now = Date.now();
    if (now - lastNavRef.current < 600) return; // throttle rapid taps
    lastNavRef.current = now;
    setView(prev => {
      if (v === 'profile') setPreviousView(prev);
      return v;
    });
    setShowPlayers(false);
    if (v !== 'auth' && v !== 'home') {
      localStorage.setItem('katchii_last_view', v);
    }
  }, []);

  // Check auth state on mount
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUsername(getUsername(session.user));
        setUserId(session.user.id);
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
          // Stay on 'loading' — App will navigate once stateLoaded is true
          setView('loading');
        }
      } else if (event === 'INITIAL_SESSION' || event === 'SIGNED_OUT') {
        setView('auth');
      }
      setAuthChecked(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Navigate once game state has loaded — check forcePasswordChange before showing home
  useEffect(() => {
    if (!gameState.stateLoaded || view !== 'loading') return;
    if (gameState.state.forcePasswordChange) {
      setForcePwChange({ tempPw: 'katchii2026' });
      setView('home');
    } else {
      const saved = localStorage.getItem('katchii_last_view') as View | null;
      const validViews: View[] = ['hunt','collection','team','lures','quests','duels','raid','pokepark','clan','throne'];
      setView(saved && validViews.includes(saved) ? saved : 'home');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.stateLoaded, view]);

  // Home/menu music + zone music when entering hunt
  useEffect(() => {
    if (view === 'home') { playMenuMusic(); prevViewRef.current = view; return; }
    if (view === 'hunt' && prevViewRef.current !== 'hunt' && !battle3v3) {
      const zoneId = gameState.state.zoneProgress?.currentZoneId ?? 'zone1';
      playZoneMusic(zoneId);
    }
    prevViewRef.current = view;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // Global UI sounds — every click except inputs, 150 ms debounce
  useEffect(() => {
    let last = 0;
    const handler = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      const tag = el.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (el.closest('[data-no-sfx]')) return;
      const now = Date.now();
      if (now - last > 150) { playSfxConfirm(); last = now; }
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, []);

  // Visibility: pause music instantly when app goes to background, resume on return
  useEffect(() => {
    const cutMusic = () => pauseCurrentMusic();
    const onReturn = () => {
      if (document.hidden) return;
      if (battle3v3) return;
      resumeCurrentMusic();
    };
    const onVisibility = () => { if (document.hidden) cutMusic(); else onReturn(); };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', cutMusic);   // iOS background / tab close
    window.addEventListener('pageshow', onReturn);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', cutMusic);
      window.removeEventListener('pageshow', onReturn);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battle3v3]);

  // Stop music when battle starts; resume zone music after battle ends
  useEffect(() => {
    if (battle3v3) {
      stopMusic(0.3);
    } else if (view === 'hunt') {
      const zoneId = gameState.state.zoneProgress?.currentZoneId ?? 'zone1';
      const t = setTimeout(() => playZoneMusic(zoneId), 2200);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battle3v3]);

  // Play time tracking
  useEffect(() => {
    const startTime = Date.now();
    const id = setInterval(() => {
      gameState.addPlayTime(60000);
    }, 60000);
    return () => {
      clearInterval(id);
      // Add partial time when unmounting
      const elapsed = Date.now() - startTime;
      if (elapsed > 5000) gameState.addPlayTime(elapsed);
    };
  }, []);

  const handleDuelResult = useCallback((entry: DuelEntry, pointsDelta: number, fragment: { pokemonId: number } | null, lurePrize: boolean) => {
    gameState.addDuelResult(entry, pointsDelta, fragment?.pokemonId ?? null, lurePrize);
  }, [gameState]);

  const handleBattle3v3 = useCallback((
    enemyPokemon: Array<{ pokemonId: number; level: number; isShiny?: boolean }>,
    enemyName: string
  ) => {
    // Build enemy team
    const enemyTeam: TeamMember[] = enemyPokemon.map(p => ({
      pokemonId: p.pokemonId, isShiny: p.isShiny, level: p.level, xp: 0,
      currentHp: calcMaxHp(p.pokemonId, p.level), maxHp: calcMaxHp(p.pokemonId, p.level),
    }));
    // Build player team: use favorite saved team if set, otherwise top 3 by level
    let playerTop3: TeamMember[];
    const favTeam = gameState.state.favoriteTeamId
      ? gameState.state.savedTeams?.find(t => t.id === gameState.state.favoriteTeamId)
      : null;
    if (favTeam && favTeam.members.length > 0) {
      playerTop3 = favTeam.members.slice(0, 3).map(m => {
        const level = gameState.state.pokemonLevels?.[m.pokemonId]?.level ?? m.level;
        const xp = gameState.state.pokemonLevels?.[m.pokemonId]?.xp ?? m.xp;
        return { pokemonId: m.pokemonId, isShiny: m.isShiny, level, xp, currentHp: calcMaxHp(m.pokemonId, level), maxHp: calcMaxHp(m.pokemonId, level) };
      });
    } else {
      const RARITY_ORDER_MAP: Record<string, number> = { commun: 0, peu_commun: 1, rare: 2, elite: 3, legendaire: 4 };
      playerTop3 = Object.entries(gameState.state.normalCollection)
        .filter(([, c]) => (c as number) > 0)
        .map(([id]) => Number(id))
        .sort((a, b) => {
          const la = gameState.state.pokemonLevels?.[a]?.level ?? 1;
          const lb = gameState.state.pokemonLevels?.[b]?.level ?? 1;
          if (lb !== la) return lb - la;
          const ra = RARITY_ORDER_MAP[POKEMON_BY_ID[a]?.rarity ?? 'commun'] ?? 0;
          const rb = RARITY_ORDER_MAP[POKEMON_BY_ID[b]?.rarity ?? 'commun'] ?? 0;
          return rb - ra;
        })
        .slice(0, 3)
        .map(id => {
          const level = gameState.state.pokemonLevels?.[id]?.level ?? 1;
          const xp = gameState.state.pokemonLevels?.[id]?.xp ?? 0;
          const isShiny = (gameState.state.shinyCollection[id] ?? 0) > 0;
          return { pokemonId: id, isShiny, level, xp, currentHp: calcMaxHp(id, level), maxHp: calcMaxHp(id, level) };
        });
    }
    if (playerTop3.length === 0) return;
    setBattle3v3({ playerTeam: playerTop3, enemyTeam, enemyName });
    setShowPlayers(false);
  }, [gameState.state]);

  const handleLogout = useCallback(async () => {
    await logoutUser();
    setView('auth');
    setUsername('Joueur');
  }, []);

  const handlePvpAccept = useCallback(async (challenge: PvpChallenge) => {
    // Guest accepts: create session (host=challenger, guest=me)
    const session = await acceptChallenge(challenge.id, challenge.challenger_id, userId);
    if (!session) return;
    setPvpIncoming(null);
    setPvpSession(session);
    setPvpIsHost(false);
    setPvpOpponentName(challenge.challenger_name);
    // Fetch opponent team from their saved state
    const { data } = await supabase.from('game_states').select('state').eq('user_id', challenge.challenger_id).maybeSingle();
    if (data?.state) {
      const gs = data.state as { savedTeams?: Array<{ id: string; members: TeamMember[] }>; favoriteTeamId?: string };
      const fav = gs.favoriteTeamId ? gs.savedTeams?.find(t => t.id === gs.favoriteTeamId) : null;
      const members = (fav ?? gs.savedTeams?.[0])?.members?.slice(0, 3) ?? [];
      setPvpOpponentTeam(members);
    }
    setPvpPhase('team_select');
  }, [userId]);

  const handlePvpDecline = useCallback(async (challenge: PvpChallenge) => {
    await declineChallenge(challenge.id);
    setPvpIncoming(null);
  }, []);

  // ── PvP: listen for incoming challenges ──────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    const chan = subscribeToIncomingChallenges(userId, c => setPvpIncoming(c));
    return () => { supabase.removeChannel(chan); };
  }, [userId]);

  const cleanupPvp = useCallback(() => {
    pvpCleanupRef.current?.();
    pvpCleanupRef.current = null;
    setPvpIncoming(null);
    setPvpSession(null);
    setPvpPhase('idle');
    setPvpMyTeam([]);
    setPvpOpponentTeam([]);
    setPvpOpponentName('');
    setPvpWaiting(null);
  }, []);

  // Called when user clicks "Défier en 3v3 PvP" on another player's profile
  const handlePvpChallenge = useCallback(async (
    challengedId: string, challengedName: string, opponentTeam: TeamMember[],
  ) => {
    if (!userId) return;
    const { challenge, errorMsg } = await sendChallenge(userId, username, challengedId);
    if (!challenge) {
      alert(`Impossible d'envoyer le défi.\n\nErreur Supabase : ${errorMsg ?? 'inconnue'}\n\nVérifie que les tables pvp_challenges et pvp_sessions existent et que les permissions sont configurées.`);
      return;
    }
    setPvpOpponentName(challengedName);
    setPvpOpponentTeam(opponentTeam);
    setPvpIsHost(true);
    setShowPlayers(false);

    // Subscribe to challenge status changes
    const statusChan = subscribeToChallengeStatus(challenge.id, async updated => {
      if (updated.status === 'accepted') {
        supabase.removeChannel(statusChan);
        setPvpWaiting(null);
        // Retry a few times — session is created just before challenge flips to 'accepted'
        let data = null;
        for (let attempt = 0; attempt < 5 && !data; attempt++) {
          if (attempt > 0) await new Promise(r => setTimeout(r, 400));
          const res = await supabase.from('pvp_sessions').select().eq('challenge_id', challenge.id).maybeSingle();
          data = res.data;
        }
        if (!data) return;
        setPvpSession(data as PvpSession);
        setPvpPhase('team_select');
      } else if (updated.status === 'declined' || updated.status === 'cancelled') {
        supabase.removeChannel(statusChan);
        setPvpWaiting(null);
        cleanupPvp();
      }
    });

    const doCancel = () => {
      supabase.removeChannel(statusChan);
      cancelChallenge(challenge.id);
      setPvpWaiting(null);
      cleanupPvp();
    };
    setPvpWaiting({ name: challengedName, cancel: doCancel });
    pvpCleanupRef.current = doCancel;
  }, [userId, username, cleanupPvp]);

  // Host submitted team — wait for guest + session to go active
  const handlePvpTeamConfirm = useCallback(async (team: TeamMember[]) => {
    if (!pvpSession) return;
    setPvpMyTeam(team);
    await submitTeam(pvpSession.id, pvpIsHost, team);
    // Subscribe to session updates to detect when both teams ready
    const sessChan = subscribeToSession(pvpSession.id, updated => {
      if (updated.host_ready && updated.guest_ready) {
        supabase.removeChannel(sessChan);
        // Resolve opponent's team from session
        const oppRaw = pvpIsHost ? updated.guest_team : updated.host_team;
        if (oppRaw) {
          setPvpOpponentTeam(oppRaw as TeamMember[]);
        }
        setPvpPhase('battle');
      }
    });
  }, [pvpSession, pvpIsHost]);

  // Listen for ban broadcast — log out immediately if current user is banned
  useEffect(() => {
    if (!userId) return;
    const chan = supabase.channel('katchii_moderation')
      .on('broadcast', { event: 'user_banned' }, ({ payload }) => {
        const { userId: bannedId } = payload as { userId: string };
        if (bannedId === userId) handleLogout();
      })
      .subscribe();
    return () => { supabase.removeChannel(chan); };
  }, [userId, handleLogout]);

  if (!authChecked || view === 'loading') {
    return (
      <div className="w-full h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-yellow-400 text-2xl font-black animate-pulse">KATCHII</div>
      </div>
    );
  }

  const questsCompleted = gameState.state.dailyQuests.quests.filter(
    (q) => q.completed && !q.rewardClaimed
  ).length;

  const showBottomNav = !['auth', 'home', 'profile', 'admin', 'wrapped', 'settings'].includes(view);

  return (
    <div className="w-full bg-slate-900 text-white overflow-hidden" style={{ height: '100dvh', maxHeight: '100dvh' }}>
      {/* Auth screen */}
      {view === 'auth' && (
        <AuthScreen onSuccess={() => {}} />
      )}

      {/* Home screen */}
      {view === 'home' && !showWelcome && (
        <HomeScreen
          username={username}
          onPlay={() => { stopMusic(0.4); setShowWelcome(true); }}
          onProfile={() => setView('profile')}
          onLogout={handleLogout}
          onWrapped={() => persistView('wrapped')}
          onSettings={() => { setPreviousView('home'); setView('settings'); }}
          onPvpChallenge={handlePvpChallenge}
        />
      )}

      {/* Always render HuntingField so spawns continue */}
      <div className={view === 'hunt' ? 'block' : 'hidden'}>
        <HuntingField
          onOpenCollection={() => persistView('collection')}
          onOpenTeam={() => persistView('team')}
          onOpenAdmin={() => setView('admin')}
          isAdmin={['admin', 'elian'].includes(username.toLowerCase())}
          onOpenLures={() => persistView('lures')}
          onOpenQuests={() => persistView('quests')}
          onOpenDuels={() => persistView('duels')}
          onOpenRaid={() => persistView('raid')}
          onOpenWrapped={() => persistView('wrapped')}
          onChangeUniverse={() => setView('home')}
          onOpenSettings={() => { setPreviousView(view as typeof previousView); setView('settings'); }}
          gameState={gameState}
        />
      </div>

      {view === 'collection' && (
        <Collection
          state={gameState.state}
          onClose={() => persistView('hunt')}
          onMarkTutorialDone={() => gameState.update(s => ({ ...s, completedTutorials: [...(s.completedTutorials ?? []), 'collection'] }))}
          onSaveCustomMoves={(pokemonId, slugs) => gameState.update(s => ({ ...s, pokemonCustomMoves: { ...(s.pokemonCustomMoves ?? {}), [pokemonId]: slugs } }))}
        />
      )}

      {view === 'admin' && ['admin', 'elian'].includes(username.toLowerCase()) && (
        <AdminPanel
          gameState={gameState}
          onClose={() => persistView('hunt')}
        />
      )}

      {view === 'team' && (
        <TeamBuilder
          state={gameState.state}
          currentZoneId={gameState.state.zoneProgress?.currentZoneId ?? 'zone1'}
          getPokemonLevel={gameState.getPokemonLevel}
          onAddXp={gameState.addPokemonXp}
          onBattleWin={gameState.addPokemonWins}
          onTrainingBattle={gameState.addTrainingWin}
          onClose={() => persistView('hunt')}
          savedTeams={gameState.state.savedTeams}
          favoriteTeamId={gameState.state.favoriteTeamId}
          onSaveTeam={gameState.saveTeam}
          onDeleteTeam={gameState.deleteTeam}
          onSetFavoriteTeamId={gameState.setFavoriteTeamId}
          onMarkTutorialDone={() => gameState.update(s => ({ ...s, completedTutorials: [...(s.completedTutorials ?? []), 'team'] }))}
        />
      )}

      {view === 'lures' && (
        <LurePanel
          state={gameState.state}
          onBuy={gameState.buyLure}
          onActivate={gameState.activateLure}
          onClose={() => persistView('hunt')}
        />
      )}

      {view === 'quests' && (
        <QuestPanel
          state={gameState.state}
          onClaim={gameState.claimQuestReward}
          onClose={() => persistView('hunt')}
        />
      )}

      {view === 'duels' && (
        <DuelPanel
          state={gameState.state}
          onClose={() => persistView('hunt')}
          onDuelResult={handleDuelResult}
          onMarkTutorialDone={() => gameState.update(s => ({ ...s, completedTutorials: [...(s.completedTutorials ?? []), 'duels'] }))}
        />
      )}

      {view === 'raid' && (
        <RaidPanel
          state={gameState.state}
          userId={userId}
          username={username}
          isAdmin={['admin', 'elian'].includes(username.toLowerCase())}
          onStartBattle={(playerTeam, bossTeam, bossName, onDone) => {
            setBattle3v3({ playerTeam, enemyTeam: bossTeam, enemyName: bossName, onDone });
            setShowPlayers(false);
          }}
          onRewardXp={gameState.addPokemonXp}
          onRewardLure={(type, count) => gameState.grantLure(type, count)}
          onClose={() => persistView('hunt')}
        />
      )}

      {view === 'wrapped' && (
        <WrappedPanel
          state={gameState.state}
          onClose={() => setView('home')}
        />
      )}

      {view === 'pokepark' && (
        <PokeParc
          state={gameState.state}
          username={username}
          isAdmin={['admin', 'elian'].includes(username.toLowerCase())}
          onClose={() => persistView('hunt')}
          onSetFavoritePokemon={gameState.setFavoritePokemon}
          onAddPlayerXp={gameState.addPlayerXp}
          onAddPokemonXp={gameState.addPokemonXp}
          onSetLastParkXpAt={gameState.setLastParkXpAt}
          onTrainingWin={gameState.addTrainingWin}
          onParkDuelResult={gameState.addParkDuelResult}
          currentZoneId={gameState.state.zoneProgress?.currentZoneId ?? 'zone1'}
          onMarkTutorialDone={() => gameState.update(s => ({ ...s, completedTutorials: [...(s.completedTutorials ?? []), 'pokepark'] }))}
        />
      )}

      {view === 'profile' && (
        <ProfileScreen
          username={username}
          state={gameState.state}
          onClose={() => setView(previousView)}
          onLogout={handleLogout}
        />
      )}

      {view === 'settings' && (
        <SettingsPanel onClose={() => setView(previousView)} />
      )}

      {view === 'clan' && (
        <ClanPanel
          userId={userId}
          username={username}
          onClose={() => persistView('hunt')}
        />
      )}

      {view === 'backpack' && (
        <BackpackPanel
          state={gameState.state}
          onActivateLure={gameState.activateLure}
          onActivateCooldownBoost={gameState.activateCooldownBoost}
          onActivateSpawnNet={gameState.activateSpawnNet}
          onOpenCase={() => setOpeningCase(true)}
          onClose={() => persistView('hunt')}
        />
      )}

      {view === 'shop' && (
        <ShopPanel
          state={gameState.state}
          onBuyLure={gameState.buyLure}
          onBuyXpCandy={gameState.buyXpCandy}
          onBuyCooldownBoost={gameState.buyCooldownBoost}
          onBuySpawnNet={gameState.buySpawnNet}
          onBuyAttackBoost={gameState.buyAttackBoost}
          onBuyMysteryCase={gameState.buyMysteryCase}
          onClose={() => persistView('hunt')}
        />
      )}

      {/* Persistent bottom navbar (not on auth/home/universe/profile/admin) */}
      {showBottomNav && (
        <BottomNav
          currentView={view}
          onNavigate={persistView}
          questsCompleted={questsCompleted}
          favoritePokemon={gameState.state.favoritePokemon}
          onShowPlayers={() => setShowPlayers(true)}
        />
      )}

      {view === 'throne' && (
        <ThroneScreen
          state={gameState.state}
          username={username}
          onClose={() => persistView('hunt')}
          onChallenge={(playerTeam, enemyTeam, enemyName, onResult) => {
            setBattle3v3({ playerTeam, enemyTeam, enemyName, onDone: (_dmg, won) => onResult(won) });
          }}
          onClaimCoins={(amount) => gameState.update(s => ({ ...s, points: (s.points ?? 0) + amount }))}
        />
      )}

      {showPlayers && <PlayersPanel onClose={() => setShowPlayers(false)} isAdmin={['admin', 'elian'].includes(username.toLowerCase())} onBattle3v3={handleBattle3v3} onPvpChallenge={handlePvpChallenge} />}

      {battle3v3 && (() => {
        const hasAttackBoost = (gameState.state.attackBoostCharges ?? 0) > 0;
        const damageMult = hasAttackBoost ? 1.25 : 1;
        if (hasAttackBoost) gameState.consumeAttackBoost();
        return (
          <BattleScreen
            playerTeam={battle3v3.playerTeam}
            enemyTeam={battle3v3.enemyTeam}
            bossName={battle3v3.enemyName}
            playerDamageMult={damageMult}
            onBattleEnd={(won, _xp, _team, enemyDmg) => {
              if (battle3v3.onDone) {
                const totalDmg = Object.values(enemyDmg ?? {}).reduce((s, n) => s + n, 0);
                battle3v3.onDone(totalDmg, won);
              }
              setBattle3v3(null);
            }}
            onQuit={() => { battle3v3.onDone?.(0, false); setBattle3v3(null); }}
          />
        );
      })()}

      {openingCase && (
        <CaseOpenScreen
          onClose={result => {
            setOpeningCase(false);
            if (result) {
              // Consume 1 case and add the pokemon to collection
              gameState.openMysteryCase?.(result.pokemonId, result.isShiny, result.rarity);
            }
          }}
        />
      )}

      {/* ── PvP overlays ── */}
      {pvpWaiting && (
        <div className="fixed inset-0 z-[750] flex items-center justify-center bg-black/80 px-6">
          <div className="w-full max-w-xs rounded-2xl p-6 text-center"
            style={{ background: '#1e1b4b', border: '2px solid #7c3aed', boxShadow: '0 0 32px #7c3aed55' }}>
            <div className="text-4xl mb-3" style={{ animation: 'pvp-blink 1.2s ease-in-out infinite' }}>⚔️</div>
            <div className="text-white font-black text-base mb-1">Défi envoyé !</div>
            <div className="text-purple-300 text-sm mb-4">
              En attente de réponse de <span className="text-yellow-300 font-bold">{pvpWaiting.name}</span>…
            </div>
            <button
              onClick={() => pvpWaiting.cancel()}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-slate-300"
              style={{ background: '#374151', border: '1px solid #4b5563' }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      <PvpChallengePopup
        challenge={pvpIncoming}
        onAccept={handlePvpAccept}
        onDecline={handlePvpDecline}
        onDismiss={() => setPvpIncoming(null)}
      />

      {pvpPhase === 'team_select' && pvpSession && (
        <div className="fixed inset-0 z-[700]">
          <PvpTeamSelect
            ownedPokemon={Object.entries(gameState.state.normalCollection)
              .filter(([, c]) => (c as number) > 0)
              .map(([id]) => {
                const numId = Number(id);
                const lvl = gameState.state.pokemonLevels?.[numId]?.level ?? 1;
                return {
                  pokemonId: numId,
                  isShiny: (gameState.state.shinyCollection[numId] ?? 0) > 0,
                  level: lvl,
                  xp: gameState.state.pokemonLevels?.[numId]?.xp ?? 0,
                  instance: gameState.state.pokemonData?.[numId],
                };
              })}
            savedTeams={gameState.state.savedTeams ?? []}
            favoriteTeamId={gameState.state.favoriteTeamId}
            opponentName={pvpOpponentName}
            onConfirm={handlePvpTeamConfirm}
            onCancel={cleanupPvp}
            pokemonCustomMoves={gameState.state.pokemonCustomMoves ?? {}}
            onSaveCustomMoves={(id, slugs) => gameState.update(s => ({ ...s, pokemonCustomMoves: { ...(s.pokemonCustomMoves ?? {}), [id]: slugs } }))}
            sessionId={pvpSession.id}
            isHost={pvpIsHost}
          />
        </div>
      )}

      {pvpPhase === 'battle' && pvpSession && pvpMyTeam.length > 0 && (
        <div className="fixed inset-0 z-[700]">
          <PvpBattleScreen
            session={pvpSession}
            isHost={pvpIsHost}
            myTeam={pvpMyTeam}
            opponentTeam={pvpOpponentTeam}
            opponentName={pvpOpponentName}
            userId={userId}
            onBattleEnd={_won => { cleanupPvp(); }}
            onQuit={cleanupPvp}
          />
        </div>
      )}

      {/* Forced password change modal (set by admin) */}
      {forcePwChange && (
        <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/90 px-4">
          <div className="w-full max-w-xs bg-slate-900 border-2 border-blue-500/60 rounded-2xl p-6 shadow-2xl">
            <div className="text-3xl text-center mb-2">🔑</div>
            <h2 className="text-white font-black text-lg text-center mb-1">Changement de mot de passe requis</h2>
            <p className="text-slate-400 text-xs text-center mb-4">Un administrateur a réinitialisé ton mot de passe. Tu dois en choisir un nouveau pour continuer.</p>
            <div className="flex flex-col gap-3">
              <input
                type="password"
                placeholder="Nouveau mot de passe (min. 6 caractères)"
                value={forcePwInput}
                onChange={e => { setForcePwInput(e.target.value); setForcePwError(''); }}
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
              />
              <input
                type="password"
                placeholder="Confirmer le mot de passe"
                value={forcePwConfirm}
                onChange={e => { setForcePwConfirm(e.target.value); setForcePwError(''); }}
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
              />
              {forcePwError && <p className="text-red-400 text-xs text-center">{forcePwError}</p>}
              <button
                disabled={forcePwLoading}
                onClick={async () => {
                  if (forcePwInput.length < 6) { setForcePwError('Le mot de passe doit faire au moins 6 caractères.'); return; }
                  if (forcePwInput !== forcePwConfirm) { setForcePwError('Les mots de passe ne correspondent pas.'); return; }
                  setForcePwLoading(true);
                  const { error } = await supabase.auth.updateUser({ password: forcePwInput });
                  if (error) { setForcePwError('Erreur : ' + error.message); setForcePwLoading(false); return; }
                  gameState.clearForcePasswordChange?.();
                  setForcePwChange(null);
                  setForcePwInput('');
                  setForcePwConfirm('');
                  setForcePwLoading(false);
                }}
                className="w-full py-3 rounded-xl font-black text-sm text-white transition-all active:scale-95 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)' }}>
                {forcePwLoading ? 'Mise à jour…' : 'Valider le nouveau mot de passe'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Welcome animation — first session only */}
      {showWelcome && (
        <WelcomeAnimation
          username={username}
          onDone={() => {
            setShowWelcome(false);
            persistView('hunt');
            const zoneId = gameState.state.zoneProgress?.currentZoneId ?? 'zone1';
            playZoneMusic(zoneId);
          }}
        />
      )}

      {/* Badge toasts */}
      {gameState.badgeToasts.length > 0 && (
        <BadgeToast
          badgeId={gameState.badgeToasts[0]}
          onDismiss={gameState.dismissBadgeToast}
        />
      )}

    </div>
  );
}

