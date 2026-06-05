import { GameState, LureType, LURE_COSTS, LURE_LABELS } from '../types';

interface Props {
  state: GameState;
  onBuy: (type: LureType) => void;
  onActivate: (type: LureType) => void;
  onClose: () => void;
}

const LURE_DESCRIPTIONS: Record<LureType, string> = {
  rare: 'Augmente les apparitions Rare ×4 pendant 10 min',
  epique: 'Augmente les apparitions Élite ×4 pendant 10 min',
  legendaire: 'Augmente les apparitions Légendaires ×4 pendant 10 min',
  shiny: 'Augmente le taux Shiny ×4 (1/62.5) pendant 10 min',
};

const LURE_ICONS: Record<LureType, string> = {
  rare: '💎',
  epique: '🔮',
  legendaire: '⚡',
  shiny: '✨',
};

const LURE_COLORS: Record<LureType, string> = {
  rare: 'border-blue-500/50 bg-blue-900/20',
  epique: 'border-purple-500/50 bg-purple-900/20',
  legendaire: 'border-yellow-500/50 bg-yellow-900/20',
  shiny: 'border-pink-500/50 bg-pink-900/20',
};

function formatLureRemaining(expiresAt: number): string {
  const ms = Math.max(0, expiresAt - Date.now());
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const LURE_TYPES: LureType[] = ['rare', 'epique', 'legendaire', 'shiny'];

export function LurePanel({ state, onBuy, onActivate, onClose }: Props) {
  const isLureActive = state.activeLure && Date.now() < state.activeLure.expiresAt;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700">
        <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl px-1">←</button>
        <div>
          <h2 className="text-white font-bold text-xl">🎣 Leurres</h2>
          <p className="text-slate-400 text-sm">{state.points} pts disponibles</p>
        </div>
      </div>

      {/* Active lure banner */}
      {isLureActive && state.activeLure && (
        <div className="mx-4 mt-4 bg-green-900/40 border border-green-500/50 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{LURE_ICONS[state.activeLure.type]}</span>
            <div>
              <div className="text-green-400 font-bold">{LURE_LABELS[state.activeLure.type]} ACTIF</div>
              <div className="text-green-300 text-sm">
                Expire dans {formatLureRemaining(state.activeLure.expiresAt)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lure cards */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {LURE_TYPES.map((type) => {
          const cost = LURE_COSTS[type];
          const count = state.lures[type];
          const canAfford = state.points >= cost;
          const isThisLureActive = isLureActive && state.activeLure?.type === type;

          return (
            <div
              key={type}
              className={`rounded-xl border p-4 ${LURE_COLORS[type]}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-3xl">{LURE_ICONS[type]}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-bold">{LURE_LABELS[type]}</h3>
                      {isThisLureActive && (
                        <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                          ACTIF
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 text-sm mt-0.5">{LURE_DESCRIPTIONS[type]}</p>
                    <p className="text-yellow-400 text-sm font-bold mt-1">
                      Coût : {cost} pts
                    </p>
                    <p className="text-slate-300 text-sm">
                      Inventaire : <span className="font-bold text-white">{count}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => onBuy(type)}
                    disabled={!canAfford}
                    className={`px-3 py-2 rounded-lg text-sm font-bold transition-colors ${
                      canAfford
                        ? 'bg-yellow-500 hover:bg-yellow-400 text-black'
                        : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    Acheter
                  </button>
                  <button
                    onClick={() => onActivate(type)}
                    disabled={count === 0 || !!isLureActive}
                    className={`px-3 py-2 rounded-lg text-sm font-bold transition-colors ${
                      count > 0 && !isLureActive
                        ? 'bg-blue-600 hover:bg-blue-500 text-white'
                        : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    Activer
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
