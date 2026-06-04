import { useState } from 'react';
import { View } from './types';
import { HuntingField } from './components/HuntingField';
import { Collection } from './components/Collection';
import { LurePanel } from './components/LurePanel';
import { QuestPanel } from './components/QuestPanel';
import { BadgeToast } from './components/BadgeToast';
import { useGameState } from './hooks/useGameState';

export function App() {
  const [view, setView] = useState<View>('hunt');
  const gameState = useGameState();

  return (
    <div className="w-full h-screen bg-slate-900 text-white overflow-hidden">
      {/* Always render HuntingField so spawns continue */}
      <div className={view === 'hunt' ? 'block' : 'hidden'}>
        <HuntingField
          onOpenCollection={() => setView('collection')}
          onOpenLures={() => setView('lures')}
          onOpenQuests={() => setView('quests')}
          gameState={gameState}
        />
      </div>

      {view === 'collection' && (
        <Collection
          state={gameState.state}
          onClose={() => setView('hunt')}
          onEvolve={gameState.evolve}
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
