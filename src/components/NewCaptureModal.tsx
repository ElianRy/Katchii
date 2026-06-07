import { useEffect, useRef } from 'react';
import { Rarity, RARITY_COLORS } from '../types';

interface Props {
  pokemonName: string;
  pokemonId: number;
  isShiny: boolean;
  rarity: Rarity;
  onDismiss: () => void;
  level?: number;
  totalCaught?: number;
}

const AUTO_DISMISS_MS = 3000;
const LEGENDARY_DISMISS_MS = 9000;
const SHINY_DISMISS_MS = 6000;

// ── Legendary full-screen ─────────────────────────────────────────────────────

const CONFETTI = Array.from({ length: 36 }, (_, i) => ({
  color: ['#fbbf24','#f472b6','#60a5fa','#4ade80','#fb923c','#c084fc','#fde047','#34d399','#f87171','#38bdf8'][i % 10],
  left: `${(i * 37 + 7) % 100}%`,
  cr: `${(i * 53) % 720 - 360}deg`,
  delay: `${(i * 0.14).toFixed(2)}s`,
  dur: `${3 + (i % 5) * 0.5}s`,
  size: 5 + (i % 5) * 3,
}));

const RAYS = Array.from({ length: 12 }, (_, i) => ({
  angle: i * 30,
  delay: `${(i * 0.12).toFixed(2)}s`,
  width: i % 3 === 0 ? 5 : 3,
  height: i % 2 === 0 ? '55vh' : '40vh',
  opacity: i % 3 === 0 ? 0.7 : 0.4,
}));

const STAR_POSITIONS = Array.from({ length: 20 }, (_, i) => ({
  top: `${(i * 41 + 9) % 85}%`,
  left: `${(i * 53 + 17) % 90}%`,
  size: 8 + (i % 6) * 4,
  delay: `${(i * 0.27).toFixed(2)}s`,
  dur: `${1.2 + (i % 5) * 0.35}s`,
  color: ['#fde047','#f472b6','#60a5fa','#c084fc','#fb923c','#4ade80'][i % 6],
}));

const ORBIT_STARS = [
  { color: '#fde047', dur: '2.8s', delay: '0s' },
  { color: '#f472b6', dur: '2.8s', delay: '-0.56s' },
  { color: '#60a5fa', dur: '2.8s', delay: '-1.12s' },
  { color: '#4ade80', dur: '2.8s', delay: '-1.68s' },
  { color: '#c084fc', dur: '2.8s', delay: '-2.24s' },
];

const RARITY_LABEL: Record<string, string> = {
  commun: 'Commun', peu_commun: 'Peu commun', rare: 'Rare', elite: 'Élite', legendaire: '⭐ Légendaire',
};

function LegendaryCaptureModal({ pokemonId, pokemonName, isShiny, rarity, level, totalCaught, onDismiss }: {
  pokemonId: number; pokemonName: string; isShiny: boolean; rarity: Rarity;
  level?: number; totalCaught?: number; onDismiss: () => void;
}) {
  const ref = useRef(onDismiss); ref.current = onDismiss;
  useEffect(() => { const t = setTimeout(() => ref.current(), LEGENDARY_DISMISS_MS); return () => clearTimeout(t); }, []);

  const src = isShiny
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${pokemonId}.png`
    : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;

  const rarityColor = RARITY_COLORS[rarity];

  return (
    <div className="fixed inset-0 z-[500] overflow-hidden cursor-pointer"
      style={{ background: 'radial-gradient(ellipse at 50% 45%, #1a0830 0%, #080014 55%, #000 100%)' }}
      onClick={onDismiss}>

      {/* Slowly rotating rays */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ animation: 'capture-rays-spin 18s linear infinite' }}>
        {RAYS.map((r, i) => (
          <div key={i} className="absolute" style={{
            top: '50%', left: '50%',
            width: r.width, height: r.height,
            background: `linear-gradient(to top, rgba(251,191,36,${r.opacity}), rgba(168,85,247,0.3), transparent)`,
            transformOrigin: 'bottom center',
            transform: `translateX(-50%) rotate(${r.angle}deg)`,
            animation: `capture-ray-fade 4s ${r.delay} ease-in-out infinite`,
          }} />
        ))}
      </div>

      {/* Confetti */}
      {CONFETTI.map((c, i) => (
        <div key={i} style={{
          position: 'fixed', top: '-12px', left: c.left,
          width: c.size, height: c.size, borderRadius: 2,
          background: c.color, '--cr': c.cr,
          animation: `legendary-confetti ${c.dur} ${c.delay} ease-in both`,
          pointerEvents: 'none', zIndex: 2,
        } as React.CSSProperties} />
      ))}

      {/* Scattered sparkle stars */}
      {STAR_POSITIONS.map((s, i) => (
        <div key={i} className="absolute pointer-events-none" style={{ top: s.top, left: s.left, zIndex: 3 }}>
          <svg viewBox="0 0 10 10" width={s.size} height={s.size}
            style={{ animation: `legendary-sparkle ${s.dur} ${s.delay} ease-in-out infinite` }}>
            <path d="M5 0 L5.6 4.4 L10 5 L5.6 5.6 L5 10 L4.4 5.6 L0 5 L4.4 4.4 Z"
              fill={s.color} style={{ filter: `drop-shadow(0 0 3px ${s.color})` }} />
          </svg>
        </div>
      ))}

      {/* Central glow rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div style={{
          width: 340, height: 340, borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(251,191,36,0.22) 0%, rgba(168,85,247,0.15) 45%, transparent 72%)',
          animation: 'capture-orb-pulse 2.2s ease-in-out infinite',
        }} />
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div style={{
          width: 200, height: 200, borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(251,191,36,0.3) 0%, rgba(168,85,247,0.18) 55%, transparent 80%)',
          animation: 'capture-orb-pulse 1.6s 0.4s ease-in-out infinite',
        }} />
      </div>

      {/* Pokemon + orbiting stars */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ zIndex: 10, gap: 0 }}>
        <div className="relative flex items-center justify-center" style={{ marginBottom: 20 }}>
          {ORBIT_STARS.map((s, i) => (
            <div key={i} style={{ position: 'absolute', width: 0, height: 0,
              animation: `capture-orbit ${s.dur} ${s.delay} linear infinite` }}>
              <svg viewBox="0 0 10 10" width={14} height={14} style={{
                position: 'absolute', left: 72, top: -7,
                filter: `drop-shadow(0 0 4px ${s.color})`,
                animation: `capture-orbit-counter ${s.dur} ${s.delay} linear infinite`,
              }}>
                <path d="M5 0 L5.6 4.4 L10 5 L5.6 5.6 L5 10 L4.4 5.6 L0 5 L4.4 4.4 Z" fill={s.color} />
              </svg>
            </div>
          ))}
          <img src={src} alt="" width={180} height={180} style={{
            imageRendering: 'pixelated', objectFit: 'contain',
            filter: 'drop-shadow(0 0 18px #fbbf24) drop-shadow(0 0 36px #a855f7) drop-shadow(0 0 6px #fde047)',
            animation: 'capture-appear 0.9s cubic-bezier(0.34,1.56,0.64,1) both, capture-float 3s 1s ease-in-out infinite',
          }} />
        </div>

        {/* Info panel */}
        <div className="flex flex-col items-center gap-1" style={{ animation: 'capture-appear 0.9s 0.3s both' }}>
          <div className="font-black text-2xl text-white" style={{ textShadow: `0 0 12px ${rarityColor}` }}>
            {isShiny && <span className="text-yellow-300">✨ </span>}{pokemonName}
          </div>
          <div className="px-3 py-0.5 rounded-full text-xs font-black" style={{
            background: `${rarityColor}22`, color: rarityColor, border: `1px solid ${rarityColor}55`,
          }}>
            {RARITY_LABEL[rarity] ?? rarity}
          </div>
          {level !== undefined && (
            <div className="text-slate-300 text-sm font-bold mt-1">Niv. {level}</div>
          )}
          {totalCaught !== undefined && (
            <div className="text-slate-500 text-xs mt-0.5">#{totalCaught} capturé{totalCaught > 1 ? 's' : ''}</div>
          )}
        </div>
      </div>

      {/* Vignette pulse */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.6) 100%)',
        animation: 'capture-vignette 2s ease-in-out infinite',
      }} />
    </div>
  );
}

// ── Shiny full-screen ─────────────────────────────────────────────────────────

const SHINY_STARS = Array.from({ length: 16 }, (_, i) => ({
  top: `${(i * 47 + 13) % 85}%`,
  left: `${(i * 61 + 11) % 90}%`,
  size: 7 + (i % 5) * 3,
  delay: `${(i * 0.31).toFixed(2)}s`,
  dur: `${1.1 + (i % 4) * 0.35}s`,
  color: ['#fde047','#f472b6','#60a5fa','#4ade80','#fb923c','#c084fc'][i % 6],
}));

const SHINY_ORBIT = [
  { color: '#fde047', dur: '2.2s', delay: '0s' },
  { color: '#f472b6', dur: '2.2s', delay: '-0.44s' },
  { color: '#60a5fa', dur: '2.2s', delay: '-0.88s' },
  { color: '#4ade80', dur: '2.2s', delay: '-1.32s' },
  { color: '#c084fc', dur: '2.2s', delay: '-1.76s' },
];

function ShinyCaptureModal({ pokemonId, pokemonName, rarity, level, totalCaught, onDismiss }: {
  pokemonId: number; pokemonName: string; rarity: Rarity;
  level?: number; totalCaught?: number; onDismiss: () => void;
}) {
  const ref = useRef(onDismiss); ref.current = onDismiss;
  useEffect(() => { const t = setTimeout(() => ref.current(), SHINY_DISMISS_MS); return () => clearTimeout(t); }, []);

  const src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${pokemonId}.png`;
  const rarityColor = RARITY_COLORS[rarity];

  return (
    <div className="fixed inset-0 z-[500] overflow-hidden cursor-pointer"
      style={{ background: 'radial-gradient(ellipse at 50% 45%, #0f1a2a 0%, #050a10 55%, #000 100%)' }}
      onClick={onDismiss}>

      {/* Rainbow rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div style={{
          width: 280, height: 280, borderRadius: '50%',
          background: 'conic-gradient(from 0deg, #f87171, #fb923c, #fde047, #4ade80, #60a5fa, #c084fc, #f472b6, #f87171)',
          animation: 'rainbow-spin 4s linear infinite',
          opacity: 0.18, filter: 'blur(8px)',
        }} />
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div style={{
          width: 180, height: 180, borderRadius: '50%',
          background: 'conic-gradient(from 0deg, #f87171aa, #fde047aa, #60a5faaa, #c084fcaa, #4ade80aa, #f87171aa)',
          animation: 'rainbow-spin 2.5s linear infinite reverse',
          opacity: 0.3, filter: 'blur(4px)',
        }} />
      </div>

      {/* Scattered sparkle stars */}
      {SHINY_STARS.map((s, i) => (
        <div key={i} className="absolute pointer-events-none" style={{ top: s.top, left: s.left, zIndex: 3 }}>
          <svg viewBox="0 0 10 10" width={s.size} height={s.size}
            style={{ animation: `legendary-sparkle ${s.dur} ${s.delay} ease-in-out infinite` }}>
            <path d="M5 0 L5.6 4.4 L10 5 L5.6 5.6 L5 10 L4.4 5.6 L0 5 L4.4 4.4 Z"
              fill={s.color} style={{ filter: `drop-shadow(0 0 3px ${s.color})` }} />
          </svg>
        </div>
      ))}

      {/* Central glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div style={{
          width: 260, height: 260, borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(253,224,71,0.18) 0%, rgba(240,171,252,0.12) 50%, transparent 75%)',
          animation: 'capture-orb-pulse 1.8s ease-in-out infinite',
        }} />
      </div>

      {/* Pokemon + orbiting stars */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ zIndex: 10, gap: 0 }}>
        <div className="relative flex items-center justify-center" style={{ marginBottom: 20 }}>
          {SHINY_ORBIT.map((s, i) => (
            <div key={i} style={{ position: 'absolute', width: 0, height: 0,
              animation: `capture-orbit ${s.dur} ${s.delay} linear infinite` }}>
              <svg viewBox="0 0 10 10" width={12} height={12} style={{
                position: 'absolute', left: 62, top: -6,
                filter: `drop-shadow(0 0 4px ${s.color})`,
                animation: `capture-orbit-counter ${s.dur} ${s.delay} linear infinite`,
              }}>
                <path d="M5 0 L5.6 4.4 L10 5 L5.6 5.6 L5 10 L4.4 5.6 L0 5 L4.4 4.4 Z" fill={s.color} />
              </svg>
            </div>
          ))}
          <img src={src} alt="" width={160} height={160} style={{
            imageRendering: 'pixelated', objectFit: 'contain',
            filter: 'drop-shadow(0 0 12px #fde047) drop-shadow(0 0 24px #f0abfc) drop-shadow(0 0 5px #fff)',
            animation: 'capture-appear 0.9s cubic-bezier(0.34,1.56,0.64,1) both, capture-float 2.5s 1s ease-in-out infinite',
          }} />
        </div>

        {/* Info panel */}
        <div className="flex flex-col items-center gap-1" style={{ animation: 'capture-appear 0.9s 0.3s both' }}>
          <div className="font-black text-2xl text-yellow-300" style={{ textShadow: '0 0 12px #fde047' }}>
            ✨ {pokemonName}
          </div>
          <div className="px-3 py-0.5 rounded-full text-xs font-black" style={{
            background: `${rarityColor}22`, color: rarityColor, border: `1px solid ${rarityColor}55`,
          }}>
            {RARITY_LABEL[rarity] ?? rarity} · Shiny
          </div>
          {level !== undefined && (
            <div className="text-slate-300 text-sm font-bold mt-1">Niv. {level}</div>
          )}
          {totalCaught !== undefined && (
            <div className="text-slate-500 text-xs mt-0.5">#{totalCaught} capturé{totalCaught > 1 ? 's' : ''}</div>
          )}
        </div>
      </div>

      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.55) 100%)',
        animation: 'capture-vignette 2s ease-in-out infinite',
      }} />
    </div>
  );
}

// ── Regular capture ───────────────────────────────────────────────────────────

export function NewCaptureModal({ pokemonName, pokemonId, isShiny, rarity, onDismiss, level, totalCaught }: Props) {
  const onDismissRef = useRef(onDismiss); onDismissRef.current = onDismiss;
  const isLegendary = rarity === 'legendaire';

  useEffect(() => {
    if (isLegendary || isShiny) return;
    const t = setTimeout(() => onDismissRef.current(), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [isLegendary, isShiny]);

  if (isLegendary) return (
    <LegendaryCaptureModal pokemonId={pokemonId} pokemonName={pokemonName} isShiny={isShiny}
      rarity={rarity} level={level} totalCaught={totalCaught} onDismiss={onDismiss} />
  );
  if (isShiny) return (
    <ShinyCaptureModal pokemonId={pokemonId} pokemonName={pokemonName} rarity={rarity}
      level={level} totalCaught={totalCaught} onDismiss={onDismiss} />
  );

  const rarityColor = RARITY_COLORS[rarity];
  const src = pokemonId > 0
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onDismiss}>
      <div
        className="relative flex flex-col items-center gap-3 rounded-2xl border px-8 py-6 max-w-xs w-full mx-4 cursor-pointer"
        style={{ background: 'rgba(10,10,30,0.95)', border: `2px solid ${rarityColor}88`, boxShadow: `0 0 30px ${rarityColor}44` }}
        onClick={onDismiss}
      >
        <button className="absolute top-3 right-3 text-slate-400 hover:text-white text-lg leading-none" onClick={onDismiss}>✕</button>
        <div className="text-center">
          <div className="text-2xl mb-1">✨</div>
          <h2 className="text-white font-black text-xl">Nouveau Pokémon !</h2>
        </div>
        <div className="flex items-center justify-center" style={{ boxShadow: `0 0 20px 8px ${rarityColor}66`, borderRadius: '50%' }}>
          {src
            ? <img src={src} alt={pokemonName} width={128} height={128} style={{ imageRendering: 'pixelated', objectFit: 'contain' }} />
            : <div className="flex items-center justify-center font-bold text-sm" style={{ width: 128, height: 128, color: rarityColor }}>{pokemonName}</div>
          }
        </div>
        <div className="font-black text-xl" style={{ color: rarityColor }}>{pokemonName}</div>
        {level !== undefined && <div className="text-slate-400 text-sm">Niv. {level}</div>}
        <div className="text-slate-400 text-sm">Ajouté à ta collection !</div>
      </div>
    </div>
  );
}
