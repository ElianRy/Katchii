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
import { PlayersPanel } from './components/PlayersPanel';
import { BattleScreen } from './components/BattleScreen';
import { TeamMember } from './components/TeamBuilder';
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
  const prevViewRef = useRef<View>('auth');
  const gameState = useGameState();

  // Persist & restore last view
  const persistView = useCallback((v: View) => {
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
        if (event === 'INITIAL_SESSION') {
          const saved = localStorage.getItem('katchii_last_view') as View | null;
          const validViews: View[] = ['hunt','collection','team','lures','quests','duels','raid','pokepark','clan'];
          setView(saved && validViews.includes(saved) ? saved : 'home');
        } else if (event === 'SIGNED_IN') {
          // Restore last view if available (SIGNED_IN can also fire on token refresh)
          const saved = localStorage.getItem('katchii_last_view') as View | null;
          const validViews: View[] = ['hunt','collection','team','lures','quests','duels','raid','pokepark','clan'];
          setView(saved && validViews.includes(saved) ? saved : 'home');
        }
      } else if (event === 'INITIAL_SESSION' || event === 'SIGNED_OUT') {
        setView('auth');
      }
      setAuthChecked(true);
    });

    return () => subscription.unsubscribe();
  }, []);

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

  if (!authChecked) {
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
          onClose={() => persistView('hunt')}
        />
      )}

      {view === 'shop' && (
        <ShopPanel
          state={gameState.state}
          onBuyLure={gameState.buyLure}
          onBuyXpCandy={gameState.buyXpCandy}
          onBuyCooldownBoost={gameState.buyCooldownBoost}
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
          onOpenQuests={() => persistView('quests')}
          onShowPlayers={() => setShowPlayers(true)}
        />
      )}

      {showPlayers && <PlayersPanel onClose={() => setShowPlayers(false)} isAdmin={['admin', 'elian'].includes(username.toLowerCase())} onBattle3v3={handleBattle3v3} />}

      {battle3v3 && (
        <BattleScreen
          playerTeam={battle3v3.playerTeam}
          enemyTeam={battle3v3.enemyTeam}
          bossName={battle3v3.enemyName}
          onBattleEnd={(won, _xp, _team, enemyDmg) => {
            if (battle3v3.onDone) {
              const totalDmg = Object.values(enemyDmg ?? {}).reduce((s, n) => s + n, 0);
              battle3v3.onDone(totalDmg, won);
            }
            setBattle3v3(null);
          }}
          onQuit={() => { battle3v3.onDone?.(0, false); setBattle3v3(null); }}
        />
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

      {/* Achievement toasts */}
      {gameState.achievementToasts.length > 0 && (
        <AchievementToast
          achievementId={gameState.achievementToasts[0]}
          onDismiss={gameState.dismissAchievementToast}
        />
      )}
    </div>
  );
}

const ACHIEVEMENT_LABELS: Record<string, { icon: string; title: string; desc: string }> = {
  pokedex_complete: { icon: '📖', title: 'Pokédex Complet !', desc: 'Tu as capturé les 151 Pokémon !' },
  level_100: { icon: '⭐', title: 'Niveau 100 !', desc: 'Un de tes Pokémon a atteint le niveau 100 !' },
  shiny_100: { icon: '💎', title: '100 Shinys !', desc: 'Tu as capturé 100 Pokémon shiny différents !' },
};

function AchievementToast({ achievementId, onDismiss }: { achievementId: string; onDismiss: () => void }) {
  const info = ACHIEVEMENT_LABELS[achievementId] ?? { icon: '🏆', title: 'Exploit accompli !', desc: achievementId };
  useEffect(() => {
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [achievementId, onDismiss]);

  return (
    <div
      className="fixed inset-0 z-[900] flex items-center justify-center pointer-events-none"
      style={{ animation: 'fadeIn 0.4s ease' }}
    >
      <div
        className="pointer-events-auto bg-gradient-to-br from-yellow-900/90 to-slate-900/90 border-2 border-yellow-400 rounded-3xl px-8 py-6 text-center shadow-2xl"
        style={{ maxWidth: 320 }}
        onClick={onDismiss}
      >
        <div style={{ fontSize: '3rem', lineHeight: 1 }}>{info.icon}</div>
        <div className="text-yellow-300 font-black text-xl mt-2">EXPLOIT DÉBLOQUÉ !</div>
        <div className="text-white font-bold text-lg mt-1">{info.title}</div>
        <div className="text-slate-300 text-sm mt-1">{info.desc}</div>
        <div className="text-yellow-400 font-bold text-sm mt-3">✨ Taux Shiny augmenté !</div>
        <div className="text-slate-400 text-xs mt-1">Appuie pour fermer</div>
      </div>
    </div>
  );
}
