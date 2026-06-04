import { GameState } from '../types';

interface Props {
  points: number;
  activeLure: GameState['activeLure'];
  cooldownRemaining: number;
  isOnCooldown: boolean;
  onOpenCollection: () => void;
  onOpenLures: () => void;
  onOpenQuests: () => void;
  onOpenDuels: () => void;
  onOpenVillage: () => void;
  onOpenSkins: () => void;
  onOpenFusion: () => void;
  onOpenRaid: () => void;
  onOpenWrapped: () => void;
  onChangeUniverse: () => void;
  capturedCount: number;
  totalPokemon: number;
  questsCompleted: number;
  activeUniverse: 'pokemon' | 'naruto';
  currentZoneName?: string;
}

function formatLureRemaining(expiresAt: number): string {
  const ms = Math.max(0, expiresAt - Date.now());
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
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
  onOpenQuests,
  onOpenDuels,
  onOpenVillage,
  onOpenSkins,
  onOpenFusion,
  onOpenRaid,
  onOpenWrapped,
  onChangeUniverse,
  capturedCount,
  totalPokemon,
  questsCompleted,
  activeUniverse,
  currentZoneName,
}: Props) {
  return (
    <>
      {/* Top-left info */}
      <div className="absolute top-0 left-0 z-20 pointer-events-none">
        <div className="flex flex-col gap-1 px-4 pt-3 pointer-events-auto">
          <div className="flex items-center gap-2 bg-black/70 rounded-xl px-3 py-2 border border-yellow-500/40">
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
          <div
            className="bg-black/60 rounded-lg px-3 py-1 border border-slate-600/40 cursor-pointer hover:border-slate-400/60"
            onClick={onChangeUniverse}
          >
            <span className="text-slate-300 text-xs">
              {activeUniverse === 'naruto'
                ? '🍥 Zone 1 — Village de Konoha'
                : `🌲 ${currentZoneName ?? 'Zone 1 — Forêt de Pallet'}`}
            </span>
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
        </div>
      </div>

      {/* Cooldown bar — centered above bottom nav */}
      {isOnCooldown && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 w-64">
          <div className="bg-black/70 rounded-xl px-4 py-2 text-center">
            <div className="text-yellow-400 text-xs font-bold mb-1">⏳ Prochain Personnage</div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className="bg-yellow-400 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(cooldownRemaining / 60) * 100}%` }}
              />
            </div>
            <div className="text-slate-400 text-xs mt-1">{cooldownRemaining}s</div>
          </div>
        </div>
      )}

      {/* Bottom navigation bar */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
        <div className="flex items-center justify-around bg-black/80 border-t border-slate-700/60 backdrop-blur-sm px-2 py-2 pointer-events-auto">
          <button
            onClick={onChangeUniverse}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-slate-400 hover:bg-slate-700/30 transition-colors"
          >
            <span className="text-xl">🏠</span>
            <span className="text-xs font-bold">Accueil</span>
          </button>
          <button
            onClick={onOpenCollection}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-blue-400 hover:bg-blue-900/30 transition-colors"
          >
            <span className="text-xl">📚</span>
            <span className="text-xs font-bold">Collection</span>
          </button>
          <button
            onClick={onOpenLures}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-purple-400 hover:bg-purple-900/30 transition-colors"
          >
            <span className="text-xl">🎣</span>
            <span className="text-xs font-bold">Leurres</span>
          </button>
          <button
            onClick={onOpenQuests}
            className="relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-green-400 hover:bg-green-900/30 transition-colors"
          >
            <span className="text-xl">📋</span>
            <span className="text-xs font-bold">Quêtes</span>
            {questsCompleted > 0 && (
              <span className="absolute top-1 right-1 bg-yellow-500 text-black text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {questsCompleted}
              </span>
            )}
          </button>
          <button
            onClick={onOpenDuels}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-red-400 hover:bg-red-900/30 transition-colors"
          >
            <span className="text-xl">⚔️</span>
            <span className="text-xs font-bold">Duels</span>
          </button>
          <button
            onClick={onOpenVillage}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-yellow-400 hover:bg-yellow-900/30 transition-colors"
          >
            <span className="text-xl">🏘️</span>
            <span className="text-xs font-bold">Village</span>
          </button>
          <button
            onClick={onOpenSkins}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-pink-400 hover:bg-pink-900/30 transition-colors"
          >
            <span className="text-xl">🎨</span>
            <span className="text-xs font-bold">Skins</span>
          </button>
          <button
            onClick={onOpenFusion}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-purple-300 hover:bg-purple-900/30 transition-colors"
          >
            <span className="text-xl">⚗️</span>
            <span className="text-xs font-bold">Fusion</span>
          </button>
          <button
            onClick={onOpenRaid}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-red-300 hover:bg-red-900/30 transition-colors"
          >
            <span className="text-xl">🐉</span>
            <span className="text-xs font-bold">Raid</span>
          </button>
          <button
            onClick={onOpenWrapped}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-yellow-300 hover:bg-yellow-900/30 transition-colors"
          >
            <span className="text-xl">🎁</span>
            <span className="text-xs font-bold">Wrapped</span>
          </button>
        </div>
      </div>
    </>
  );
}
