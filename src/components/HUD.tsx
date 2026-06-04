import { GameState } from '../types';

interface Props {
  points: number;
  activeLure: GameState['activeLure'];
  cooldownRemaining: number;
  isOnCooldown: boolean;
  onOpenCollection: () => void;
  onOpenLures: () => void;
  capturedCount: number;
  totalPokemon: number;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatLureRemaining(expiresAt: number): string {
  const ms = Math.max(0, expiresAt - Date.now());
  const totalSec = Math.ceil(ms / 1000);
  return formatTime(totalSec);
}

const LURE_LABELS_HUD: Record<string, string> = {
  rare: 'Leurre Rare',
  epique: 'Leurre Épique',
  legendaire: 'Leurre Légendaire',
  shiny: 'Leurre Shiny',
};

export function HUD({
  points,
  activeLure,
  cooldownRemaining,
  isOnCooldown,
  onOpenCollection,
  onOpenLures,
  capturedCount,
  totalPokemon,
}: Props) {
  return (
    <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
      <div className="flex items-start justify-between px-4 pt-3 gap-3">
        {/* Left: Points + Zone */}
        <div className="flex flex-col gap-1 pointer-events-auto">
          <div className="flex items-center gap-2 bg-black/70 rounded-xl px-3 py-2 border border-yellow-500/40">
            {/* Pokéball icon */}
            <svg width="20" height="20" viewBox="0 0 64 64">
              <path d="M 32 2 A 30 30 0 0 1 62 32 L 38 32 A 6 6 0 0 0 26 32 L 2 32 A 30 30 0 0 1 32 2 Z" fill="#ef4444" />
              <path d="M 2 32 A 30 30 0 0 0 62 32 L 38 32 A 6 6 0 0 1 26 32 Z" fill="white" />
              <circle cx="32" cy="32" r="30" fill="none" stroke="black" strokeWidth="3" />
              <line x1="2" y1="32" x2="62" y2="32" stroke="black" strokeWidth="3" />
              <circle cx="32" cy="32" r="7" fill="white" stroke="black" strokeWidth="3" />
            </svg>
            <span className="text-yellow-400 font-bold text-lg">{points}</span>
            <span className="text-gray-400 text-sm">pts</span>
          </div>
          <div className="bg-black/60 rounded-lg px-3 py-1 border border-slate-600/40">
            <span className="text-slate-300 text-xs">🌲 Zone 1 — Forêt de Pallet</span>
          </div>
          <div className="bg-black/60 rounded-lg px-3 py-1 border border-slate-600/40">
            <span className="text-slate-300 text-xs">
              📋 {capturedCount}/{totalPokemon} capturés
            </span>
          </div>
          {activeLure && Date.now() < activeLure.expiresAt && (
            <div className="bg-purple-900/70 rounded-lg px-3 py-1 border border-purple-500/60">
              <span className="text-purple-300 text-xs font-bold">
                ✨ {LURE_LABELS_HUD[activeLure.type]} — {formatLureRemaining(activeLure.expiresAt)}
              </span>
            </div>
          )}
          {isOnCooldown && (
            <div className="bg-red-900/70 rounded-lg px-3 py-1 border border-red-500/60">
              <span className="text-red-300 text-xs font-bold">
                ⏳ Cooldown : {formatTime(cooldownRemaining)}
              </span>
            </div>
          )}
        </div>

        {/* Right: Buttons */}
        <div className="flex flex-col gap-2 pointer-events-auto">
          <button
            onClick={onOpenCollection}
            className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-sm shadow-lg border border-blue-400/40 transition-colors"
          >
            📚 Ma Collection
          </button>
          <button
            onClick={onOpenLures}
            className="bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white font-bold px-4 py-2 rounded-xl text-sm shadow-lg border border-purple-400/40 transition-colors"
          >
            🎣 Leurres
          </button>
        </div>
      </div>
    </div>
  );
}
