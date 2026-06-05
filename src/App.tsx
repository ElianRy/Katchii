import { useState, useCallback, useEffect } from 'react';
import { View, DuelEntry } from './types';
import { BottomNav } from './components/BottomNav';
import { HuntingField } from './components/HuntingField';
import { Collection } from './components/Collection';
import { LurePanel } from './components/LurePanel';
import { QuestPanel } from './components/QuestPanel';
import { DuelPanel } from './components/DuelPanel';
import { VillagePanel } from './components/VillagePanel';
import { SkinsPanel } from './components/SkinsPanel';
import { FusionPanel } from './components/FusionPanel';
import { RaidPanel } from './components/RaidPanel';
import { WrappedPanel } from './components/WrappedPanel';
import { UniverseSelector } from './components/UniverseSelector';
import { BadgeToast } from './components/BadgeToast';
import { AuthScreen } from './components/AuthScreen';
import { HomeScreen } from './components/HomeScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { TeamBuilder } from './components/TeamBuilder';
import { AdminPanel } from './components/AdminPanel';
import { PokeParc } from './components/PokeParc';
import { useGameState } from './hooks/useGameState';
import { supabase } from './lib/supabase';
import { getUsername, logoutUser } from './lib/auth';

export function App() {
  const [view, setView] = useState<View>('auth');
  const [username, setUsername] = useState<string>('Joueur');
  const [authChecked, setAuthChecked] = useState(false);
  const gameState = useGameState();

  // Persist & restore last view
  const persistView = useCallback((v: View) => {
    setView(v);
    if (v !== 'auth' && v !== 'home' && v !== 'universe') {
      localStorage.setItem('katchii_last_view', v);
    }
  }, []);

  // Check auth state on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUsername(getUsername(user));
        const saved = localStorage.getItem('katchii_last_view') as View | null;
        const validViews: View[] = ['hunt','collection','team','lures','quests','duels','village','skins','fusion','raid','wrapped','pokepark'];
        setView(saved && validViews.includes(saved) ? saved : 'hunt');
      } else {
        setView('auth');
      }
      setAuthChecked(true);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUsername(getUsername(session.user));
        const saved = localStorage.getItem('katchii_last_view') as View | null;
        const validViews: View[] = ['hunt','collection','team','lures','quests','duels','village','skins','fusion','raid','wrapped','pokepark'];
        setView(saved && validViews.includes(saved) ? saved : 'hunt');
      } else {
        setView('auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [persistView]);

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

  const showBottomNav = !['auth', 'home', 'universe', 'profile', 'admin', 'wrapped'].includes(view);

  return (
    <div className="w-full bg-slate-900 text-white overflow-hidden" style={{ height: '100dvh', maxHeight: '100dvh' }}>
      {/* Auth screen */}
      {view === 'auth' && (
        <AuthScreen
          onSuccess={() => {
            supabase.auth.getUser().then(({ data: { user } }) => {
              if (user) setUsername(getUsername(user));
            });
            persistView('hunt');
          }}
        />
      )}

      {/* Home screen */}
      {view === 'home' && (
        <HomeScreen
          username={username}
          onPlay={() => setView('universe')}
          onCollection={() => persistView('collection')}
          onProfile={() => setView('profile')}
          onLogout={handleLogout}
          onWrapped={() => persistView('wrapped')}
        />
      )}

      {/* Universe selector */}
      {view === 'universe' && (
        <UniverseSelector
          onSelect={(universe) => {
            gameState.setActiveUniverse(universe);
            persistView('hunt');
          }}
          narutoLocked={!gameState.state.zoneProgress?.bossDefeated?.['ligue']}
          onBack={() => setView('home')}
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
          onOpenVillage={() => persistView('village')}
          onOpenSkins={() => persistView('skins')}
          onOpenFusion={() => persistView('fusion')}
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
          getPokemonLevel={gameState.getPokemonLevel}
          onAddXp={gameState.addPokemonXp}
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

      {view === 'village' && (
        <VillagePanel
          state={gameState.state}
          onClose={() => persistView('hunt')}
          onUpdateVillage={gameState.updateVillage}
          onSpendPoints={gameState.spendPoints}
        />
      )}

      {view === 'skins' && (
        <SkinsPanel
          state={gameState.state}
          onClose={() => persistView('hunt')}
          onUpdateSkins={gameState.updateSkins}
          onSpendPoints={gameState.spendPoints}
        />
      )}

      {view === 'fusion' && (
        <FusionPanel
          state={gameState.state}
          onFuse={gameState.performFusion}
          onClose={() => persistView('hunt')}
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
          onClose={() => persistView('hunt')}
        />
      )}

      {view === 'pokepark' && (
        <PokeParc
          state={gameState.state}
          username={username}
          onClose={() => persistView('hunt')}
          onUpdateVillage={gameState.updateVillage}
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

      {/* Persistent bottom navbar (not on auth/home/universe/profile/admin) */}
      {showBottomNav && (
        <BottomNav
          currentView={view}
          onNavigate={persistView}
          questsCompleted={questsCompleted}
          favoritePokemon={gameState.state.village.favoritePokemon}
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
