import { useEffect, useRef, useState } from 'react';
import { Rarity, RARITY_COLORS } from '../types';

interface Props {
  pokemonName: string;
  pokemonId: number;
  isShiny: boolean;
  rarity: Rarity;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 3000;
const LEGENDARY_DISMISS_MS = 7000;

const CONFETTI_L = Array.from({ length: 28 }, (_, i) => ({
  color: ['#fbbf24','#f472b6','#60a5fa','#4ade80','#fb923c','#c084fc','#fde047','#34d399'][i % 8],
  left: `${(i * 37 + 7) % 100}%`,
  cr: `${(i * 53) % 720 - 360}deg`,
  delay: `${(i * 0.18).toFixed(2)}s`,
  dur: `${2.5 + (i % 5) * 0.4}s`,
  size: 6 + (i % 4) * 3,
}));

const SPARKLES_L = Array.from({ length: 12 }, (_, i) => ({
  top: `${(i * 33 + 11) % 80}%`,
  left: `${(i * 47 + 13) % 90}%`,
  size: 12 + (i % 5) * 4,
  delay: `${(i * 0.22).toFixed(2)}s`,
  dur: `${1.1 + (i % 4) * 0.3}s`,
}));

function LegendaryCaptureModal({ pokemonId, isShiny, onDismiss }: { pokemonId: number; isShiny: boolean; onDismiss: () => void }) {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    const t = setTimeout(() => onDismissRef.current(), LEGENDARY_DISMISS_MS);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const spriteUrl = isShiny
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${pokemonId}.png`
    : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden cursor-pointer"
      style={{ background: 'radial-gradient(ellipse at 50% 50%, #120820 0%, #050008 60%, #000 100%)' }}
      onClick={onDismiss}>

      {/* Confetti */}
      {CONFETTI_L.map((c, i) => (
        <div key={i} style={{
          position: 'fixed', top: '-10px', left: c.left,
          width: c.size, height: c.size, borderRadius: 2,
          background: c.color,
          '--cr': c.cr,
          animation: `legendary-confetti ${c.dur} ${c.delay} ease-in both`,
          pointerEvents: 'none', zIndex: 1,
        } as React.CSSProperties} />
      ))}

      {/* Radial rays */}
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="absolute pointer-events-none"
          style={{
            top: '50%', left: '50%',
            width: 4, height: '60vh',
            background: 'linear-gradient(to top, rgba(251,191,36,0.6), transparent)',
            transformOrigin: 'bottom center',
            '--angle': `${i * 45}deg`,
            transform: `rotate(${i * 45}deg) translateX(-50%)`,
            animation: `legendary-ray 3s ${(i * 0.15).toFixed(2)}s ease-in-out infinite`,
          } as React.CSSProperties} />
      ))}

      {/* Central glow orb */}
      <div className="absolute pointer-events-none"
        style={{
          width: 260, height: 260,
          background: 'radial-gradient(ellipse, rgba(251,191,36,0.35) 0%, rgba(168,85,247,0.2) 50%, transparent 75%)',
          borderRadius: '50%',
          animation: 'legendary-orb-pulse 1.8s ease-in-out infinite',
        }} />

      {/* Sprite */}
      <div className="relative z-10 flex items-center justify-center" style={{ animation: 'legendary-orb-pulse 2.2s 0.4s ease-in-out infinite' }}>
        <img src={spriteUrl} alt="" width={200} height={200}
          style={{ imageRendering: 'pixelated', objectFit: 'contain',
            filter: 'drop-shadow(0 0 20px #fbbf24) drop-shadow(0 0 40px #a855f7) drop-shadow(0 0 8px #fde047)' }} />
      </div>

      {/* Sparkles */}
      {SPARKLES_L.map((s, i) => (
        <div key={i} className="absolute pointer-events-none z-20"
          style={{ top: s.top, left: s.left, width: s.size, height: s.size,
            animation: `legendary-sparkle ${s.dur} ${s.delay} ease-in-out infinite` }}>
          <svg viewBox="0 0 10 10" width={s.size} height={s.size}>
            <path d="M5 0 L5.6 4.4 L10 5 L5.6 5.6 L5 10 L4.4 5.6 L0 5 L4.4 4.4 Z"
              fill="#fde047" stroke="#fbbf24" strokeWidth="0.3"
              style={{ filter: 'drop-shadow(0 0 4px #fde047)' }} />
          </svg>
        </div>
      ))}
    </div>
  );
}

export function NewCaptureModal({ pokemonName, pokemonId, isShiny, rarity, onDismiss }: Props) {
  const [progress, setProgress] = useState(100);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  const isLegendary = rarity === 'legendaire';

  useEffect(() => {
    if (isLegendary) return;
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / AUTO_DISMISS_MS) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        onDismissRef.current();
      }
    }, 50);
    return () => clearInterval(timer);
  }, [isLegendary]);

  if (isLegendary) {
    return <LegendaryCaptureModal pokemonId={pokemonId} isShiny={isShiny} onDismiss={onDismiss} />;
  }

  const rarityColor = RARITY_COLORS[rarity];
  const spriteUrl = pokemonId > 0
    ? isShiny
      ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${pokemonId}.png`
      : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onDismiss}
    >
      <div
        className="relative flex flex-col items-center gap-3 rounded-2xl border px-8 py-6 max-w-xs w-full mx-4 cursor-pointer"
        style={{
          background: 'rgba(10,10,30,0.95)',
          border: `2px solid ${rarityColor}88`,
          boxShadow: `0 0 30px ${rarityColor}44`,
        }}
        onClick={onDismiss}
      >
        <button className="absolute top-3 right-3 text-slate-400 hover:text-white text-lg leading-none"
          onClick={onDismiss} aria-label="Fermer">✕</button>

        <div className="text-center">
          <div className="text-2xl mb-1">✨</div>
          <h2 className="text-white font-black text-xl">Nouveau Pokémon !</h2>
        </div>

        <div className="flex items-center justify-center"
          style={{ boxShadow: `0 0 20px 8px ${rarityColor}66`, borderRadius: '50%' }}>
          {spriteUrl ? (
            <img src={spriteUrl} alt={pokemonName} width={128} height={128}
              style={{ imageRendering: 'pixelated', objectFit: 'contain' }} />
          ) : (
            <div className="flex items-center justify-center font-bold text-sm"
              style={{ width: 128, height: 128, color: rarityColor }}>{pokemonName}</div>
          )}
        </div>

        <div className="text-center">
          <div className="font-black text-xl" style={{ color: rarityColor }}>
            {isShiny ? '✨ ' : ''}{pokemonName}
          </div>
        </div>

        <div className="text-slate-400 text-sm">Ajouté à ta collection !</div>

        <div className="w-full bg-slate-700 rounded-full h-1.5">
          <div className="h-1.5 rounded-full transition-all" style={{ width: `${progress}%`, background: rarityColor }} />
        </div>

        <div className="text-slate-500 text-xs">Appuie pour fermer</div>
      </div>
    </div>
  );
}
