import { useState } from 'react';
import { View } from './types';
import { HuntingField } from './components/HuntingField';
import { Collection } from './components/Collection';
import { LurePanel } from './components/LurePanel';
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
    </div>
  );
}
