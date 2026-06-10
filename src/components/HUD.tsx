import { useState, useEffect, useRef } from 'react';
import { GameState } from '../types';
interface Props {
  points: number;
  activeLure: GameState['activeLure'];
  cooldownRemaining: number;
  isOnCooldown: boolean;
  onOpenCollection: () => void;
  onOpenTeam: () => void;
  onOpenLures: () => void;
  onOpenQuests: () => void;
  onOpenDuels: () => void;
  onOpenRaid: () => void;
  onOpenWrapped: () => void;
  onChangeUniverse: () => void;
  onOpenSettings?: () => void;
  onOpenZoneInfo?: () => void;
  onOpenAdmin?: () => void;
  isAdmin?: boolean;
  capturedCount: number;
  totalPokemon: number;
  questsCompleted: number;
  currentZoneName?: string;
  missingInZone?: number[];
  zoneCaughtCount?: number;
  zoneTotal?: number;
  zoneNeeded?: number;
  bossName?: string;
  bossUnlocked?: boolean;
  bossDefeated?: boolean;
  conditionLabel?: string;
  conditionProgress?: number;
  conditionDescription?: string;
  onFightBoss?: () => void;
}

function zoneEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('mer') || n.includes('bord') || n.includes('eau') || n.includes('côte')) return '🌊';
  if (n.includes('électr') || n.includes('electr') || n.includes('central')) return '⚡';
  if (n.includes('fleur') || n.includes('bois') || n.includes('plaine')) return '🌸';
  if (n.includes('fantôme') || n.includes('tour') || n.includes('spectre')) return '👻';
  if (n.includes('sylphe') || n.includes('corp') || n.includes('usine') || n.includes('sarl')) return '🏢';
  if (n.includes('cramois') || n.includes('île') || n.includes('volcan')) return '🌋';
  if (n.includes('arène') || n.includes('jadiel') || n.includes('ville')) return '🏙️';
  if (n.includes('ligue') || n.includes('champion')) return '🏆';
  if (n.includes('grotte') || n.includes('mont') || n.includes('roche') || n.includes('pic')) return '⛰️';
  if (n.includes('forêt') || n.includes('foret') || n.includes('pallet') || n.includes('bois')) return '🌲';
  return '🗺️';
}

function formatLureRemaining(expiresAt: number): string {
  const ms = Math.max(0, expiresAt - Date.now());
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const LURE_EMOJI: Record<string, string> = {
  rare: '🔮', epique: '💜', legendaire: '⚡', shiny: '✨',
};
const LURE_NAME: Record<string, string> = {
  rare: 'Leurre Rare', epique: 'Leurre Épique', legendaire: 'Leurre Légendaire', shiny: 'Leurre Shiny',
};
const LURE_DESC: Record<string, string> = {
  rare: 'Multiplie ×4 les chances de rencontrer un Pokémon Rare',
  epique: 'Multiplie ×4 les chances de rencontrer un Pokémon Élite',
  legendaire: 'Multiplie ×4 les chances de rencontrer un Légendaire',
  shiny: 'Multiplie ×4 les chances d\'apparition d\'un Shiny',
};

export function HUD({
  activeLure,
  cooldownRemaining,
  isOnCooldown,
  onOpenCollection,
  onOpenTeam,
  onOpenLures,
  onOpenQuests,
  onOpenDuels,
  onOpenRaid,
  onOpenWrapped,
  onChangeUniverse,
  onOpenSettings,
  onOpenZoneInfo,
  onOpenAdmin,
  isAdmin = false,
  currentZoneName,
  bossName,
  bossUnlocked = false,
  bossDefeated = false,
  conditionLabel,
  conditionProgress = 0,
  conditionDescription,
  onFightBoss,
}: Props) {
  const [showConditionDetail, setShowConditionDetail] = useState(false);
  const [showLureInfo, setShowLureInfo] = useState(false);
  // Impact animation when cooldown just finishes
  const [showImpact, setShowImpact] = useState(false);
  const prevCooldown = useRef(cooldownRemaining);
  useEffect(() => {
    if (prevCooldown.current > 0 && cooldownRemaining === 0 && !isOnCooldown) {
      setShowImpact(true);
      const t = setTimeout(() => setShowImpact(false), 750);
      return () => clearTimeout(t);
    }
    prevCooldown.current = cooldownRemaining;
  }, [cooldownRemaining, isOnCooldown]);

  return (
    <>
      {/* HUD strip — zone, boss progress, lure */}
      <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex items-center gap-2 px-3 pt-2 pb-1 pointer-events-auto">
          {/* Zone name */}
          <div className="flex items-center gap-1 flex-1 min-w-0 bg-black/60 rounded-xl px-3 py-1.5 border border-slate-700/50">
            <span className="text-slate-300 text-xs truncate">
              {`${zoneEmoji(currentZoneName ?? '')} ${currentZoneName ?? 'Zone 1'}`}
            </span>
          </div>

          {/* Zone info button — standalone so it's always visible */}
          {onOpenZoneInfo && (
            <button
              onClick={onOpenZoneInfo}
              className="shrink-0 rounded-xl px-2.5 py-1.5 text-sm font-black border border-blue-500/60 bg-blue-900/70 hover:bg-blue-800 text-blue-200 hover:text-white"
            >
              ℹ️
            </button>
          )}

          {/* Lure indicator */}
          {activeLure && Date.now() < activeLure.expiresAt && (
            <div className="relative shrink-0">
              <button
                onClick={() => setShowLureInfo(v => !v)}
                className="bg-purple-900/80 rounded-xl px-2 py-1.5 border border-purple-500/50 active:opacity-80"
              >
                <span className="text-purple-300 text-xs font-bold">
                  {LURE_EMOJI[activeLure.type] ?? '✨'} {formatLureRemaining(activeLure.expiresAt)}
                </span>
              </button>
              {showLureInfo && (
                <div className="absolute top-10 right-0 z-50 bg-slate-900 border border-purple-500/50 rounded-2xl p-3 shadow-2xl w-56 pointer-events-auto"
                  onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{LURE_EMOJI[activeLure.type]}</span>
                    <span className="text-white font-black text-sm">{LURE_NAME[activeLure.type]}</span>
                    <button onClick={() => setShowLureInfo(false)} className="ml-auto text-slate-500 text-lg leading-none">✕</button>
                  </div>
                  <p className="text-slate-300 text-xs mb-2">{LURE_DESC[activeLure.type]}</p>
                  <div className="text-purple-300 font-bold text-xs">
                    ⏱ Expire dans {formatLureRemaining(activeLure.expiresAt)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Admin */}
          {isAdmin && onOpenAdmin && (
            <button onClick={onOpenAdmin} className="bg-red-900/80 rounded-xl px-2 py-1.5 border border-red-700/60 text-red-300 text-sm shrink-0">🔧</button>
          )}

          {/* Settings */}
          {onOpenSettings && (
            <button onClick={onOpenSettings} className="bg-black/70 rounded-xl px-2 py-1.5 border border-slate-600/40 text-slate-300 hover:text-white text-sm shrink-0">⚙️</button>
          )}

          {/* Menu */}
          <button onClick={onChangeUniverse} className="bg-black/70 rounded-xl px-2 py-1.5 border border-slate-600/40 text-slate-300 hover:text-white text-xs font-bold shrink-0">
            🏠
          </button>
        </div>

        {/* Boss progress bar — only when relevant */}
        {bossName && conditionLabel && !bossDefeated && (
          <div className="px-3 pb-1 pointer-events-auto">
            <button
              className="w-full bg-black/70 rounded-xl px-3 py-2 border border-yellow-700/50 flex flex-col gap-1.5 text-left active:opacity-80"
              onClick={() => setShowConditionDetail(v => !v)}
            >
              <div className="flex justify-between items-center w-full">
                <span className="text-yellow-400 text-xs font-bold">⚔️ {bossName}</span>
                <span className="text-slate-300 text-xs font-semibold">{conditionLabel}</span>
              </div>
              <div className="w-full bg-slate-700/60 rounded-full h-2 overflow-hidden">
                <div className="h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(1, conditionProgress) * 100}%`, background: 'linear-gradient(90deg,#f59e0b,#ef4444)' }} />
              </div>
              {showConditionDetail && conditionDescription && (
                <p className="text-xs text-slate-400 mt-0.5">{conditionDescription}</p>
              )}
            </button>
            {bossUnlocked && onFightBoss && (
              <button onClick={onFightBoss} className="w-full text-xs font-black py-1.5 rounded-xl mt-1 animate-pulse" style={{ background: 'linear-gradient(90deg,#f59e0b,#ef4444)', color: '#000' }}>
                🏆 Lancer le Défi de la Ligue !
              </button>
            )}
          </div>
        )}
      </div>

      {/* Cooldown — pokeball drawn stroke by stroke, disappears when ready */}
      {isOnCooldown && (() => {
        const cx = 32, cy = 34, r = 26;
        const circumference = 2 * Math.PI * r; // ~163
        const lineLen = r * 2; // 52
        const elapsed = Math.min(1, Math.max(0, (30 - cooldownRemaining) / 30));
        // Phase 1 (0→50%): outer circle arc from top clockwise
        const p1 = Math.min(1, elapsed / 0.50);
        // Phase 2 (45%→72%): horizontal divider line
        const p2 = Math.min(1, Math.max(0, (elapsed - 0.45) / 0.27));
        // Phase 3 (68%→85%): center button pops in
        const p3 = Math.min(1, Math.max(0, (elapsed - 0.68) / 0.17));
        // Phase 4 (83%→100%): fill with red/black
        const p4 = Math.min(1, Math.max(0, (elapsed - 0.83) / 0.17));
        return (
          <div className="absolute right-3 z-20" style={{ top: '128px' }}>
            <svg width="64" height="82" viewBox="0 0 64 82"
              style={{ transition: 'filter 0.5s ease', filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.9)) drop-shadow(0 2px 6px rgba(0,0,0,0.8))' }}>
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

      {/* Impact animation after cooldown ends */}
      {showImpact && (
        <div className="absolute right-3 z-20 animate-pokeball-impact" style={{ top: '128px' }}>
          <svg width="64" height="82" viewBox="0 0 64 82"
            style={{}}>
            <path d="M 32 8 A 26 26 0 0 1 58 34 L 38 34 A 6 6 0 0 0 26 34 L 6 34 A 26 26 0 0 1 32 8 Z" fill="#dc2626" />
            <path d="M 6 34 A 26 26 0 0 0 58 34 L 38 34 A 6 6 0 0 1 26 34 Z" fill="white" />
            <circle cx="32" cy="34" r="26" fill="none" stroke="#000" strokeWidth="2.5" />
            <line x1="6" y1="34" x2="58" y2="34" stroke="#000" strokeWidth="2.5" />
            <circle cx="32" cy="34" r="7" fill="white" stroke="#000" strokeWidth="2" />
            <circle cx="32" cy="34" r="3" fill="#9ca3af" />
          </svg>
        </div>
      )}

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
          </button>
          <button
            onClick={onOpenDuels}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-red-400 hover:bg-red-900/30 transition-colors"
          >
            <span className="text-xl">⚔️</span>
            <span className="text-xs font-bold">Duels</span>
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
