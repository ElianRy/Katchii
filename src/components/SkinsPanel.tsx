import { GameState } from '../types';

interface Props {
  state: GameState;
  onClose: () => void;
  onUpdateSkins: (updater: (prev: GameState['skins']) => GameState['skins']) => void;
  onSpendPoints: (amount: number) => boolean;
}

export const TERRAIN_SKINS = [
  { id: 'foret', label: 'Forêt (défaut)', unlocked: true, cost: 0, gradient: 'from-slate-900 via-indigo-950 to-slate-900' },
  { id: 'konoha', label: 'Village Konoha', unlocked: false, cost: 150, gradient: 'from-green-950 via-emerald-900 to-green-950' },
  { id: 'dojo', label: 'Dojo', unlocked: false, cost: 200, gradient: 'from-red-950 via-orange-900 to-red-950' },
  { id: 'espace', label: 'Espace', unlocked: false, cost: 300, gradient: 'from-black via-purple-950 to-black' },
  { id: 'ocean', label: 'Océan', unlocked: false, cost: 200, gradient: 'from-blue-950 via-cyan-900 to-blue-950' },
];

export function SkinsPanel({ state, onClose, onUpdateSkins, onSpendPoints }: Props) {
  const isUnlocked = (id: string) =>
    id === 'foret' || state.skins.unlockedTerrains.includes(id);

  const unlock = (id: string, cost: number) => {
    if (isUnlocked(id)) return;
    if (onSpendPoints(cost)) {
      onUpdateSkins(s => ({ ...s, unlockedTerrains: [...s.unlockedTerrains, id] }));
    }
  };

  const setActive = (id: string) => {
    if (!isUnlocked(id)) return;
    onUpdateSkins(s => ({ ...s, activeTerrain: id }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 shrink-0">
        <div>
          <h2 className="text-white font-bold text-xl">🎨 Skins de terrain</h2>
          <p className="text-slate-400 text-sm">Personnalise ton terrain de chasse</p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none px-2">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {TERRAIN_SKINS.map(skin => {
          const unlocked = isUnlocked(skin.id);
          const active = state.skins.activeTerrain === skin.id;
          return (
            <div
              key={skin.id}
              className={`rounded-xl border overflow-hidden transition-all ${
                active ? 'border-yellow-500/60' : unlocked ? 'border-slate-600/40' : 'border-slate-700/40'
              }`}
            >
              {/* Preview */}
              <div className={`h-16 bg-gradient-to-r ${skin.gradient} flex items-center px-4`}>
                {active && <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">Actif</span>}
              </div>
              {/* Controls */}
              <div className="bg-slate-800/60 px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-white font-bold text-sm">{skin.label}</div>
                  {!unlocked && <div className="text-yellow-400 text-xs">{skin.cost} pts pour débloquer</div>}
                  {unlocked && !active && <div className="text-green-400 text-xs">Débloqué</div>}
                </div>
                {unlocked ? (
                  <button
                    onClick={() => setActive(skin.id)}
                    disabled={active}
                    className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    {active ? 'Sélectionné' : 'Choisir'}
                  </button>
                ) : (
                  <button
                    onClick={() => unlock(skin.id, skin.cost)}
                    disabled={state.points < skin.cost}
                    className="bg-yellow-600 hover:bg-yellow-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    {state.points < skin.cost ? `${skin.cost - state.points} pts manquants` : `Débloquer (${skin.cost} pts)`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
