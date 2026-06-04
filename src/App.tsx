import { useState, useCallback } from 'react';
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
import { useGameState } from './hooks/useGameState';

export function App() {
  const [view, setView] = useState<View>('universe');
  const gameState = useGameState();

  const handleDuelResult = useCallback((entry: DuelEntry, pointsDelta: number, fragment: { pokemonId: number } | null, lurePrize: boolean) => {
    gameState.addDuelResult(entry, pointsDelta, fragment?.pokemonId ?? null, lurePrize);
  }, [gameState]);

  return (
    <div className="w-full h-screen bg-slate-900 text-white overflow-hidden">
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
          onChangeUniverse={() => setView('universe')}
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
