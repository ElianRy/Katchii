import { GameState } from '../types';
import type { SaveStatus } from '../lib/cloudSync';

interface Props {
  points: number;
  activeLure: GameState['activeLure'];
  cooldownRemaining: number;
  isOnCooldown: boolean;
  saveStatus?: SaveStatus;
  onOpenCollection: () => void;
  onOpenTeam: () => void;
  onOpenLures: () => void;
  onOpenQuests: () => void;
  onOpenDuels: () => void;
  onOpenVillage: () => void;
  onOpenSkins: () => void;
  onOpenFusion: () => void;
  onOpenRaid: () => void;
  onOpenWrapped: () => void;
  onChangeUniverse: () => void;
  onOpenZoneInfo?: () => void;
  onOpenAdmin?: () => void;
  isAdmin?: boolean;
  capturedCount: number;
  totalPokemon: number;
  questsCompleted: number;
  activeUniverse: 'pokemon' | 'naruto';
  currentZoneName?: string;
  missingInZone?: number[];
  zoneCaughtCount?: number;
  zoneTotal?: number;
  zoneNeeded?: number;
  bossName?: string;
  bossUnlocked?: boolean;
  bossDefeated?: boolean;
  onFightBoss?: () => void;
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
  onOpenTeam,
  onOpenLures,
  onOpenQuests,
  onOpenDuels,
  onOpenVillage,
  onOpenSkins,
  onOpenFusion,
  onOpenRaid,
  onOpenWrapped,
  onChangeUniverse,
  onOpenZoneInfo,
  onOpenAdmin,
  isAdmin = false,
  capturedCount,
  totalPokemon,
  questsCompleted,
  activeUniverse,
  currentZoneName,
  missingInZone = [],
  zoneCaughtCount = 0,
  zoneTotal = 0,
  zoneNeeded = 0,
  bossName,
  bossUnlocked = false,
  bossDefeated = false,
  onFightBoss,
  saveStatus = 'idle',
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
            <span
              title={saveStatus === 'error' ? 'Erreur sauvegarde cloud !' : saveStatus === 'saving' ? 'Sauvegarde...' : 'Sauvegardé'}
              style={{ fontSize: '0.65rem', marginLeft: 2 }}
            >
              {saveStatus === 'saving' ? '🔄' : saveStatus === 'error' ? '⚠️' : '☁️'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div
              className="bg-black/60 rounded-lg px-3 py-1 border border-slate-600/40 cursor-pointer hover:border-slate-400/60 flex-1"
              onClick={onChangeUniverse}
            >
              <span className="text-slate-300 text-xs">
                {activeUniverse === 'naruto'
                  ? '🍥 Zone 1 — Village de Konoha'
                  : `🌲 ${currentZoneName ?? 'Zone 1 — Forêt de Pallet'}`}
              </span>
            </div>
            {onOpenZoneInfo && (
              <button
                onClick={onOpenZoneInfo}
                className="bg-black/60 rounded-lg px-2 py-1 border border-slate-600/40 hover:border-slate-400/60 text-slate-300 hover:text-white text-xs"
                title="Info zone"
              >
                ℹ️
              </button>
            )}
          </div>
          <div className="bg-black/60 rounded-lg px-3 py-1 border border-slate-600/40">
            <span className="text-slate-300 text-xs">
              📋 {capturedCount}/{totalPokemon} capturés
            </span>
          </div>
          {activeUniverse === 'pokemon' && zoneTotal > 0 && !bossDefeated && (
            <div className="bg-black/60 rounded-lg px-2 py-1.5 border border-slate-600/40 flex flex-col gap-1.5">
              {missingInZone.length > 0 && (
                <>
                  <div className="text-slate-500 text-xs">Manquants dans la zone :</div>
                  <div className="flex gap-1 items-center flex-wrap">
                    {missingInZone.slice(0, 6).map(id => (
                      <img
                        key={id}
                        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`}
                        width={28}
                        height={28}
                        style={{ imageRendering: 'pixelated', filter: 'grayscale(1) brightness(0.55) opacity(0.75)' }}
                        draggable={false}
                      />
                    ))}
                    {missingInZone.length > 6 && (
                      <span className="text-slate-500 text-xs">+{missingInZone.length - 6}</span>
                    )}
                  </div>
                </>
              )}
              {bossName && (
                <>
                  <div className="flex justify-between text-xs">
                    <span className="text-yellow-400/80 font-bold">🏆 {bossName}</span>
                    <span className="text-slate-500">{zoneCaughtCount}/{zoneNeeded}</span>
                  </div>
                  <div className="w-full bg-slate-700/60 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-1.5 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(1, zoneNeeded > 0 ? zoneCaughtCount / zoneNeeded : 0) * 100}%`,
                        background: 'linear-gradient(90deg, #f59e0b, #ef4444)',
                      }}
                    />
                  </div>
                  {bossUnlocked && onFightBoss && (
                    <button
                      onClick={onFightBoss}
                      className="w-full text-xs font-black py-1 rounded-lg mt-0.5 animate-pulse"
                      style={{ background: 'linear-gradient(90deg, #f59e0b, #ef4444)', color: '#000' }}
                    >
                      ⚔️ Combat contre le maître !
                    </button>
                  )}
                </>
              )}
            </div>
          )}
          {activeLure && Date.now() < activeLure.expiresAt && (
            <div className="bg-purple-900/70 rounded-lg px-3 py-1 border border-purple-500/60">
              <span className="text-purple-300 text-xs font-bold">
                ✨ {LURE_LABELS_HUD[activeLure.type]} — {formatLureRemaining(activeLure.expiresAt)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Top-right buttons */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
        {isAdmin && onOpenAdmin && (
          <button
            onClick={onOpenAdmin}
            className="bg-red-900/80 rounded-xl px-2 py-2 flex items-center gap-1 text-red-300 hover:text-white border border-red-700/60 hover:border-red-400 text-sm font-bold"
            title="Panneau Admin"
          >
            🔧
          </button>
        )}
        <button
          onClick={onChangeUniverse}
          className="bg-black/70 rounded-xl px-3 py-2 flex items-center gap-1 text-slate-300 hover:text-white border border-slate-600/40 hover:border-slate-400/60 text-sm font-bold"
        >
          🏠 <span className="text-xs">Menu</span>
        </button>
      </div>

      {/* Cooldown — pokeball drawn progressively, disappears when ready */}
      {isOnCooldown && (() => {
        const cx = 32; const cy = 32; const r = 30;
        // How much of the pokeball is revealed: 0 at start of cooldown, 1 at end
        const elapsed = 1 - (cooldownRemaining / 60);
        const angle = elapsed * 2 * Math.PI; // 0 → 2π
        // Pie-slice clip: from 12 o'clock clockwise
        const ex = cx + r * Math.sin(angle);
        const ey = cy - r * Math.cos(angle);
        const largeArc = angle > Math.PI ? 1 : 0;
        const clipId = 'pb-reveal';
        // When almost done (< 2s), add a "glowing ready" feel
        const nearlyDone = cooldownRemaining <= 2;
        return (
          <div className="absolute right-3 z-20" style={{ bottom: '84px' }}>
            <svg width="56" height="70" viewBox={`0 0 56 80`} style={{ overflow: 'visible' }}>
              <defs>
                <clipPath id={clipId}>
                  {elapsed >= 1
                    ? <circle cx={cx-4} cy={cy-4} r={r} />
                    : <path d={`M ${cx-4} ${cy-4} L ${cx-4} ${cy-4-r} A ${r} ${r} 0 ${largeArc} 1 ${ex-4} ${ey-4} Z`} />
                  }
                </clipPath>
              </defs>
              {/* Ghost outline — always visible so player sees what's being drawn */}
              <circle cx={cx-4} cy={cy-4} r={r} fill="none" stroke="#ffffff18" strokeWidth="1.5" />
              {/* Pokeball revealed progressively via clip */}
              <g clipPath={`url(#${clipId})`}
                style={nearlyDone ? { filter: 'drop-shadow(0 0 6px #fbbf24cc)' } : undefined}>
                <path d={`M ${cx-4} ${cy-4-r} A ${r} ${r} 0 0 1 ${cx-4+r} ${cy-4} L ${cx-4+6} ${cy-4} A 6 6 0 0 0 ${cx-4-6} ${cy-4} L ${cx-4-r} ${cy-4} A ${r} ${r} 0 0 1 ${cx-4} ${cy-4-r} Z`} fill="#ef4444" />
                <path d={`M ${cx-4-r} ${cy-4} A ${r} ${r} 0 0 0 ${cx-4+r} ${cy-4} L ${cx-4+6} ${cy-4} A 6 6 0 0 1 ${cx-4-6} ${cy-4} Z`} fill="white" />
                <circle cx={cx-4} cy={cy-4} r={r} fill="none" stroke="#111" strokeWidth="2" />
                <line x1={cx-4-r} y1={cy-4} x2={cx-4+r} y2={cy-4} stroke="#111" strokeWidth="2" />
                <circle cx={cx-4} cy={cy-4} r="6" fill="white" stroke="#111" strokeWidth="2" />
                <circle cx={cx-4} cy={cy-4} r="3" fill="#d1d5db" />
              </g>
              {/* Countdown text below */}
              <text x={cx-4} y={cy+r+16} textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="bold">
                {cooldownRemaining}s
              </text>
            </svg>
          </div>
        );
      })()}

      {/* Bottom navigation bar — kept for hunt view, BottomNav in App overlays this */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none" style={{ display: 'none' }}>
        <div className="flex items-center justify-around bg-black/80 border-t border-slate-700/60 backdrop-blur-sm px-2 py-2 pointer-events-auto">
          <button
            onClick={onOpenCollection}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-blue-400 hover:bg-blue-900/30 transition-colors"
          >
            <span className="text-xl">📚</span>
            <span className="text-xs font-bold">Collection</span>
          </button>
          <button
            onClick={onOpenTeam}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-emerald-400 hover:bg-emerald-900/30 transition-colors"
          >
            <span className="text-xl">⚔️</span>
            <span className="text-xs font-bold">Équipe</span>
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
