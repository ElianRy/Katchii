import { useState, useCallback, useEffect } from 'react';
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
import { PlayersPanel } from './components/PlayersPanel';
import { useGameState } from './hooks/useGameState';
import { supabase } from './lib/supabase';
import { getUsername, logoutUser } from './lib/auth';

export function App() {
  const [view, setView] = useState<View>('auth');
  const [username, setUsername] = useState<string>('Joueur');
  const [userId, setUserId] = useState<string>('');
  const [authChecked, setAuthChecked] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showPlayers, setShowPlayers] = useState(false);
  const gameState = useGameState();

  // Persist & restore last view
  const persistView = useCallback((v: View) => {
    setView(v);
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
          onPlay={() => setShowWelcome(true)}
          onProfile={() => setView('profile')}
          onLogout={handleLogout}
          onWrapped={() => persistView('wrapped')}
          onSettings={() => setView('settings')}
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
          onSaveTeam={gameState.saveTeam}
          onDeleteTeam={gameState.deleteTeam}
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
          onAttack={gameState.attackRaid}
          onClaimReward={gameState.claimRaidReward}
          onStartRaid={gameState.startRaid}
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
        />
      )}

      {view === 'profile' && (
        <ProfileScreen
          username={username}
          state={gameState.state}
          onClose={() => setView('home')}
          onLogout={handleLogout}
        />
      )}

      {view === 'settings' && (
        <SettingsPanel onClose={() => setView('home')} />
      )}

      {view === 'clan' && (
        <ClanPanel
          userId={userId}
          username={username}
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

      {showPlayers && <PlayersPanel onClose={() => setShowPlayers(false)} />}

      {/* Welcome animation — first session only */}
      {showWelcome && (
        <WelcomeAnimation
          username={username}
          onDone={() => { setShowWelcome(false); persistView('hunt'); }}
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
