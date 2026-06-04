import { useState, useCallback, useEffect } from 'react';
import { View, DuelEntry } from './types';
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
import { useGameState } from './hooks/useGameState';
import { supabase } from './lib/supabase';
import { getUsername, logoutUser } from './lib/auth';

export function App() {
  const [view, setView] = useState<View>('auth');
  const [username, setUsername] = useState<string>('Joueur');
  const [authChecked, setAuthChecked] = useState(false);
  const gameState = useGameState();

  // Check auth state on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUsername(getUsername(user));
        setView('home');
      } else {
        setView('auth');
      }
      setAuthChecked(true);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUsername(getUsername(session.user));
        setView('home');
      } else {
        setView('auth');
      }
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

  return (
    <div className="w-full h-screen bg-slate-900 text-white overflow-hidden">
      {/* Auth screen */}
      {view === 'auth' && (
        <AuthScreen
          onSuccess={() => {
            supabase.auth.getUser().then(({ data: { user } }) => {
              if (user) setUsername(getUsername(user));
            });
            setView('home');
          }}
        />
      )}

      {/* Home screen */}
      {view === 'home' && (
        <HomeScreen
          username={username}
          onPlay={() => setView('universe')}
          onCollection={() => setView('collection')}
          onProfile={() => setView('profile')}
          onLogout={handleLogout}
        />
      )}

      {/* Universe selector */}
      {view === 'universe' && (
        <UniverseSelector
          onSelect={(universe) => {
            gameState.setActiveUniverse(universe);
            setView('hunt');
          }}
        />
      )}

      {/* Always render HuntingField so spawns continue */}
      <div className={view === 'hunt' ? 'block' : 'hidden'}>
        <HuntingField
          onOpenCollection={() => setView('collection')}
          onOpenLures={() => setView('lures')}
          onOpenQuests={() => setView('quests')}
          onOpenDuels={() => setView('duels')}
          onOpenVillage={() => setView('village')}
          onOpenSkins={() => setView('skins')}
          onOpenFusion={() => setView('fusion')}
          onOpenRaid={() => setView('raid')}
          onOpenWrapped={() => setView('wrapped')}
          onChangeUniverse={() => setView('home')}
          gameState={gameState}
        />
      </div>

      {view === 'collection' && (
        <Collection
          state={gameState.state}
          onClose={() => setView('hunt')}
        />
      )}

      {view === 'lures' && (
        <LurePanel
          state={gameState.state}
          onBuy={gameState.buyLure}
          onActivate={gameState.activateLure}
          onClose={() => setView('hunt')}
        />
      )}

      {view === 'quests' && (
        <QuestPanel
          state={gameState.state}
          onClaim={gameState.claimQuestReward}
          onClose={() => setView('hunt')}
        />
      )}

      {view === 'duels' && (
        <DuelPanel
          state={gameState.state}
          onClose={() => setView('hunt')}
          onDuelResult={handleDuelResult}
        />
      )}

      {view === 'village' && (
        <VillagePanel
          state={gameState.state}
          onClose={() => setView('hunt')}
          onUpdateVillage={gameState.updateVillage}
          onSpendPoints={gameState.spendPoints}
        />
      )}

      {view === 'skins' && (
        <SkinsPanel
          state={gameState.state}
          onClose={() => setView('hunt')}
          onUpdateSkins={gameState.updateSkins}
          onSpendPoints={gameState.spendPoints}
        />
      )}

      {view === 'fusion' && (
        <FusionPanel
          state={gameState.state}
          onFuse={gameState.performFusion}
          onClose={() => setView('hunt')}
        />
      )}

      {view === 'raid' && (
        <RaidPanel
          state={gameState.state}
          onAttack={gameState.attackRaid}
          onClaimReward={gameState.claimRaidReward}
          onStartRaid={gameState.startRaid}
          onClose={() => setView('hunt')}
        />
      )}

      {view === 'wrapped' && (
        <WrappedPanel
          state={gameState.state}
          onClose={() => setView('hunt')}
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
