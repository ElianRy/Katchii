import { useEffect, useState } from 'react';
import { SpawnedPokemon, PokemonData, RARITY_COLORS } from '../types';

interface Props {
  spawned: SpawnedPokemon;
  pokemonData: PokemonData;
  onCapture: () => void;
  disabled: boolean;
  narutoSpriteUrl?: string;
  leaving?: boolean;
}

interface Particle {
  id: number;
  angle: number;
  color: string;
  distance: number;
}

const CONFETTI_COLORS = ['#f59e0b', '#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#ec4899', '#06b6d4'];

function PokeballSVG({ spinning }: { spinning: boolean }) {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      className={spinning ? 'animate-spin-pokeball' : ''}
    >
      <path d="M 32 2 A 30 30 0 0 1 62 32 L 38 32 A 6 6 0 0 0 26 32 L 2 32 A 30 30 0 0 1 32 2 Z" fill="#ef4444" />
      <path d="M 2 32 A 30 30 0 0 0 62 32 L 38 32 A 6 6 0 0 1 26 32 Z" fill="white" />
      <circle cx="32" cy="32" r="30" fill="none" stroke="black" strokeWidth="2.5" />
      <line x1="2" y1="32" x2="62" y2="32" stroke="black" strokeWidth="2.5" />
      <circle cx="32" cy="32" r="7" fill="white" stroke="black" strokeWidth="2.5" />
      <circle cx="32" cy="32" r="3.5" fill="#d1d5db" />
    </svg>
  );
}

export function SpawnedPokemonCard({ spawned, pokemonData, onCapture, disabled, narutoSpriteUrl, leaving }: Props) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [showParticles, setShowParticles] = useState(false);

  useEffect(() => {
    if (spawned.captured && !showParticles) {
      const newParticles: Particle[] = Array.from({ length: 12 }, (_, i) => ({
        id: i,
        angle: (i / 12) * 360,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        distance: 40 + Math.random() * 30,
      }));
      setParticles(newParticles);
      setShowParticles(true);
    }
  }, [spawned.captured, showParticles]);

  const rarityColor = RARITY_COLORS[pokemonData.rarity];

  const [spriteError, setSpriteError] = useState(false);
  const spriteUrl = narutoSpriteUrl
    ? narutoSpriteUrl
    : spawned.isShiny
      ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${spawned.pokemonId}.png`
      : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${spawned.pokemonId}.png`;

  const handleClick = () => {
    if (disabled || spawned.capturing || spawned.captured) return;
    onCapture();
  };

  // Build aura glow styles based on rarity
  const isEpic = pokemonData.rarity === 'elite';
  const isLegendary = pokemonData.rarity === 'legendaire';

  let spriteFilter: string;
  let spriteAnimation: string | undefined;
  if (isLegendary) {
    spriteFilter = `drop-shadow(0 0 14px ${rarityColor}) drop-shadow(0 0 28px ${rarityColor}88) drop-shadow(0 0 42px ${rarityColor}55)`;
    spriteAnimation = 'aura-pulse 1.5s ease-in-out infinite';
  } else if (isEpic) {
    spriteFilter = `drop-shadow(0 0 10px ${rarityColor}) drop-shadow(0 0 20px ${rarityColor}88)`;
    spriteAnimation = 'aura-pulse 2s ease-in-out infinite';
  } else {
    spriteFilter = `drop-shadow(0 0 6px ${rarityColor})`;
    spriteAnimation = undefined;
  }

  const containerClass = `absolute select-none ${leaving ? 'animate-leave' : 'animate-appear'}`;

  return (
    <div
      className={containerClass}
      style={{ left: `${spawned.x}%`, top: `${spawned.y}%`, transform: 'translate(-50%, -50%)' }}
    >
      {/* Confetti particles */}
      {showParticles && particles.map((p) => {
        const rad = (p.angle * Math.PI) / 180;
        const dx = Math.cos(rad) * p.distance;
        const dy = Math.sin(rad) * p.distance;
        return (
          <div
            key={p.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 8,
              height: 8,
              background: p.color,
              top: '50%',
              left: '50%',
              marginTop: -4,
              marginLeft: -4,
              '--dx': `${dx}px`,
              '--dy': `${dy}px`,
              animation: 'confetti-fly 0.8s ease-out forwards',
            } as React.CSSProperties}
          />
        );
      })}

      {spawned.capturing ? (
        <div className="flex items-center justify-center w-16 h-16">
          <PokeballSVG spinning />
        </div>
      ) : !spawned.captured ? (
        <div
          onClick={handleClick}
          className="relative cursor-pointer animate-float flex flex-col items-center"
          style={{ animationDelay: `${(spawned.pokemonId % 5) * 0.3}s` }}
          title={pokemonData.name}
        >
          {/* Shiny halo */}
          {spawned.isShiny && (
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                boxShadow: '0 0 20px 8px rgba(253,224,71,0.6), 0 0 40px 16px rgba(236,72,153,0.3)',
                borderRadius: '50%',
              }}
            />
          )}

          {/* Aura glow wrapper */}
          <div
            className="relative flex items-center justify-center"
            style={{
              borderRadius: narutoSpriteUrl ? '8px' : '50%',
              background: 'rgba(0,0,0,0.0)',
              padding: 0,
            }}
          >
            {/* Orbiting shiny stars */}
            {spawned.isShiny && (
              <div className="absolute inset-0 pointer-events-none" style={{ borderRadius: '50%' }}>
                <div className="orbit-star" style={{ background: '#fde047' }} />
                <div className="orbit-star" style={{ background: '#f9a8d4', animationDelay: '-0.53s' }} />
                <div className="orbit-star" style={{ background: '#93c5fd', animationDelay: '-1.06s' }} />
              </div>
            )}

            {/* Legendary rays */}
            {isLegendary && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  borderRadius: '50%',
                  background: `radial-gradient(ellipse, ${rarityColor}22 0%, transparent 70%)`,
                  animation: 'legendary-rays 4s linear infinite',
                }}
              />
            )}

            {spriteError ? (
              <div
                className="flex flex-col items-center justify-center gap-0.5"
                style={{
                  width: 64, height: 64,
                  background: `linear-gradient(135deg, ${rarityColor}33, ${rarityColor}11)`,
                  border: `1px solid ${rarityColor}66`,
                  borderRadius: 8,
                  filter: spriteFilter,
                  animation: spriteAnimation,
                }}
              >
                <span style={{ fontSize: 26 }}>忍</span>
                <span className="font-black text-center leading-none" style={{ color: rarityColor, fontSize: '0.5rem', maxWidth: 58 }}>
                  {pokemonData.name.split(' ')[0]}
                </span>
              </div>
            ) : (
              <img
                src={spriteUrl}
                alt={pokemonData.name}
                width={64}
                height={64}
                style={{
                  imageRendering: narutoSpriteUrl ? 'auto' : 'pixelated',
                  objectFit: narutoSpriteUrl ? 'cover' : 'contain',
                  objectPosition: narutoSpriteUrl ? 'top center' : undefined,
                  borderRadius: narutoSpriteUrl ? '8px' : undefined,
                  filter: spriteFilter,
                  animation: spriteAnimation,
                }}
                draggable={false}
                onError={() => setSpriteError(true)}
              />
            )}
          </div>

          {/* Name badge */}
          <div
            className="mt-1 text-xs font-bold whitespace-nowrap px-1 py-0.5 rounded"
            style={{ background: 'rgba(0,0,0,0.75)', color: rarityColor, fontSize: '0.65rem' }}
          >
            {spawned.isShiny ? '✨ ' : ''}{pokemonData.name}
          </div>

          {/* Disabled overlay */}
          {disabled && (
            <div className="absolute inset-0 rounded-lg bg-black/50 flex items-center justify-center">
              <span className="text-yellow-400 text-xs font-bold">⏳</span>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
