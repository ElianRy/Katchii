import { useEffect, useState } from 'react';
import { SpawnedPokemon as SpawnedPokemonType, PokemonData, RARITY_COLORS } from '../types';

const CONFETTI_COLORS = ['#f59e0b', '#ec4899', '#3b82f6', '#22c55e', '#a855f7', '#ef4444', '#06b6d4'];
const CONFETTI_COUNT = 14;
const CONFETTI_PARTICLES = Array.from({ length: CONFETTI_COUNT }, (_, i) => {
  const angle = (i / CONFETTI_COUNT) * 360;
  const dist = 50 + Math.random() * 35;
  const rad = (angle * Math.PI) / 180;
  return {
    dx: Math.cos(rad) * dist,
    dy: Math.sin(rad) * dist,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  };
});

function PokeballSVG({ spinning }: { spinning: boolean }) {
  return (
    <div className={spinning ? 'animate-spin-pokeball' : ''} style={{ width: 64, height: 64 }}>
      <svg viewBox="0 0 40 40" width="64" height="64">
        <circle cx="20" cy="20" r="19" fill="white" stroke="#1f2937" strokeWidth="2" />
        <path d="M 1 20 A 19 19 0 0 1 39 20 Z" fill="#ef4444" />
        <rect x="1" y="18.5" width="38" height="3" fill="#1f2937" />
        <circle cx="20" cy="20" r="6" fill="white" stroke="#1f2937" strokeWidth="2" />
        <circle cx="20" cy="20" r="3" fill="#f9fafb" />
      </svg>
    </div>
  );
}

interface Props {
  spawned: SpawnedPokemonType;
  pokemonData: PokemonData;
  onCapture: () => void;
  disabled: boolean;
}

export default function SpawnedPokemon({ spawned, pokemonData, onCapture, disabled }: Props) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (spawned.captured) setShowConfetti(true);
  }, [spawned.captured]);

  const spriteUrl = spawned.isShiny
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${spawned.pokemonId}.png`
    : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${spawned.pokemonId}.png`;

  const borderColor = RARITY_COLORS[pokemonData.rarity];
  const isInteractive = !disabled && !spawned.capturing && !spawned.captured;

  return (
    <div
      className="absolute select-none"
      style={{ left: `${spawned.x}%`, top: `${spawned.y}%`, transform: 'translate(-50%, -50%)' }}
    >
      {/* Confetti explosion */}
      {showConfetti && CONFETTI_PARTICLES.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 8,
            height: 8,
            background: p.color,
            top: '50%',
            left: '50%',
            marginTop: -4,
            marginLeft: -4,
            '--dx': `${p.dx}px`,
            '--dy': `${p.dy}px`,
            animation: 'confetti-fly 0.7s ease-out forwards',
            animationDelay: `${i * 0.02}s`,
          } as React.CSSProperties}
        />
      ))}

      {/* Main container */}
      <div
        className={`relative flex flex-col items-center cursor-pointer animate-appear ${isInteractive ? 'hover:scale-110 transition-transform' : ''}`}
        onClick={isInteractive ? onCapture : undefined}
        style={{ '--float-delay': `${(spawned.x * 0.05).toFixed(1)}s` } as React.CSSProperties}
      >
        {spawned.capturing ? (
          <PokeballSVG spinning />
        ) : spawned.captured ? (
          <PokeballSVG spinning={false} />
        ) : (
          <>
            {/* Shiny halo */}
            {spawned.isShiny && (
              <div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  boxShadow: '0 0 18px 8px rgba(251,191,36,0.55), 0 0 35px 14px rgba(236,72,153,0.25)',
                  borderRadius: '50%',
                  width: 80,
                  height: 80,
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
              />
            )}

            {/* Orbiting stars (shiny) */}
            {spawned.isShiny && (
              <div className="absolute pointer-events-none" style={{ width: 80, height: 80, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}>
                <div className="orbit-star" style={{ background: '#fbbf24' }} />
                <div className="orbit-star" style={{ background: '#f472b6' }} />
                <div className="orbit-star" style={{ background: '#60a5fa' }} />
              </div>
            )}

            {/* Sprite */}
            <div
              className="animate-float-varied relative"
              style={{
                border: `3px solid ${borderColor}`,
                borderRadius: 12,
                boxShadow: `0 0 12px 3px ${borderColor}55`,
                background: 'rgba(0,0,0,0.45)',
                padding: 4,
              }}
            >
              <img
                src={spriteUrl}
                alt={pokemonData.name}
                width={64}
                height={64}
                draggable={false}
                style={{ imageRendering: 'pixelated' }}
              />
            </div>

            {/* Name label */}
            <span
              className="mt-1 text-xs font-bold px-2 py-0.5 rounded"
              style={{
                background: `${borderColor}cc`,
                color: '#fff',
                textShadow: '0 1px 3px #0008',
                fontSize: 10,
              }}
            >
              {spawned.isShiny ? '✨ ' : ''}{pokemonData.name}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
