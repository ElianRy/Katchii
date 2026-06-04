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

      {/* Cooldown — pokeball drawn stroke by stroke, disappears when ready */}
      {isOnCooldown && (() => {
        const cx = 32, cy = 34, r = 26;
        const circumference = 2 * Math.PI * r; // ~163
        const lineLen = r * 2; // 52
        const elapsed = Math.min(1, Math.max(0, (60 - cooldownRemaining) / 60));
        // Phase 1 (0→50%): outer circle arc from top clockwise
        const p1 = Math.min(1, elapsed / 0.50);
        // Phase 2 (45%→72%): horizontal divider line
        const p2 = Math.min(1, Math.max(0, (elapsed - 0.45) / 0.27));
        // Phase 3 (68%→85%): center button pops in
        const p3 = Math.min(1, Math.max(0, (elapsed - 0.68) / 0.17));
        // Phase 4 (83%→100%): fill with red/black
        const p4 = Math.min(1, Math.max(0, (elapsed - 0.83) / 0.17));
        const nearlyDone = cooldownRemaining <= 5;
        return (
          <div className="absolute right-3 z-20" style={{ bottom: '84px' }}>
            <svg width="64" height="82" viewBox="0 0 64 82"
              style={nearlyDone ? { filter: 'drop-shadow(0 0 8px #fbbf24cc)', transition: 'filter 0.5s ease' } : { transition: 'filter 0.5s ease' }}>
              {/* Ghost — full pokeball shape in gray so player sees what's being drawn */}
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="#374151" strokeWidth="2" />
              <line x1={cx-r} y1={cy} x2={cx+r} y2={cy} stroke="#374151" strokeWidth="2" />
              <circle cx={cx} cy={cy} r={6} fill="none" stroke="#374151" strokeWidth="2" />

              {/* Phase 4: color fills */}
              <path
                d={`M ${cx} ${cy-r} A ${r} ${r} 0 0 1 ${cx+r} ${cy} L ${cx+6} ${cy} A 6 6 0 0 0 ${cx-6} ${cy} L ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx} ${cy-r} Z`}
                fill="#dc2626" opacity={p4} style={{ transition: 'opacity 0.3s ease' }}
              />
              <path
                d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 0 ${cx+r} ${cy} L ${cx+6} ${cy} A 6 6 0 0 1 ${cx-6} ${cy} Z`}
                fill="white" opacity={p4} style={{ transition: 'opacity 0.3s ease' }}
              />

              {/* Phase 1: outer circle arc drawn from top clockwise (black stroke on top) */}
              <circle
                cx={cx} cy={cy} r={r}
                fill="none" stroke="#000" strokeWidth="2.5"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - p1)}
                transform={`rotate(-90, ${cx}, ${cy})`}
                style={{ transition: 'stroke-dashoffset 0.5s linear' }}
              />

              {/* Phase 2: divider line from left to right */}
              <line
                x1={cx-r} y1={cy} x2={cx+r} y2={cy}
                stroke="#000" strokeWidth="2.5"
                strokeDasharray={lineLen}
                strokeDashoffset={lineLen * (1 - p2)}
                style={{ transition: 'stroke-dashoffset 0.5s linear' }}
              />

              {/* Phase 3: center button scales in */}
              <g style={{
                transformOrigin: `${cx}px ${cy}px`,
                transform: `scale(${p3})`,
                transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
              }}>
                <circle cx={cx} cy={cy} r={7} fill={p4 > 0.3 ? 'white' : '#1e293b'} stroke="#000" strokeWidth="2" style={{ transition: 'fill 0.3s ease' }} />
                <circle cx={cx} cy={cy} r={3} fill="#9ca3af" />
              </g>

              {/* Black outline on top of fills */}
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="#000" strokeWidth="2" opacity={p4} />

              {/* Countdown text — always white so it's visible */}
              <text x={cx} y={cy + r + 16} textAnchor="middle" fill="white" fontSize="11" fontWeight="bold"
                style={{ textShadow: '0 1px 3px #000' }}>
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
