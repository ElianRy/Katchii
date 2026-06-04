import { useEffect, useState } from 'react';
import { SpawnedPokemon, PokemonData, RARITY_COLORS } from '../types';

interface Props {
  spawned: SpawnedPokemon;
  pokemonData: PokemonData;
  onCapture: () => void;
  disabled: boolean;
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
      {/* Top half - red */}
      <path d="M 32 2 A 30 30 0 0 1 62 32 L 38 32 A 6 6 0 0 0 26 32 L 2 32 A 30 30 0 0 1 32 2 Z" fill="#ef4444" />
      {/* Bottom half - white */}
      <path d="M 2 32 A 30 30 0 0 0 62 32 L 38 32 A 6 6 0 0 1 26 32 Z" fill="white" />
      {/* Black border */}
      <circle cx="32" cy="32" r="30" fill="none" stroke="black" strokeWidth="2.5" />
      {/* Center line */}
      <line x1="2" y1="32" x2="62" y2="32" stroke="black" strokeWidth="2.5" />
      {/* Center button */}
      <circle cx="32" cy="32" r="7" fill="white" stroke="black" strokeWidth="2.5" />
      <circle cx="32" cy="32" r="3.5" fill="#d1d5db" />
    </svg>
  );
}

export function SpawnedPokemonCard({ spawned, pokemonData, onCapture, disabled }: Props) {
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

  const spriteUrl = spawned.isShiny
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${spawned.pokemonId}.png`
    : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${spawned.pokemonId}.png`;

  const handleClick = () => {
    if (disabled || spawned.capturing || spawned.captured) return;
    onCapture();
  };

  return (
    <div
      className="absolute select-none"
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
            className="absolute rounded-full animate-float-up pointer-events-none"
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
        /* Pokéball spinning */
        <div className="flex items-center justify-center w-16 h-16">
          <PokeballSVG spinning />
        </div>
      ) : !spawned.captured ? (
        /* Pokémon sprite */
        <div
          onClick={handleClick}
          className="relative cursor-pointer animate-float"
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

          {/* Rarity border glow */}
          <div
            className="relative rounded-lg p-1"
            style={{
              boxShadow: `0 0 10px 3px ${rarityColor}88`,
              border: `2px solid ${rarityColor}`,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(2px)',
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

            <img
              src={spriteUrl}
              alt={pokemonData.name}
              width={64}
              height={64}
              style={{ imageRendering: 'pixelated' }}
              draggable={false}
            />
          </div>

          {/* Name badge */}
          <div
            className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs font-bold whitespace-nowrap px-1 py-0.5 rounded"
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
