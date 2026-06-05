import { useEffect, useState } from 'react';
import { SpawnedPokemon, PokemonData, RARITY_COLORS } from '../types';

interface Props {
  spawned: SpawnedPokemon;
  pokemonData: PokemonData;
  onCapture: () => void;
  disabled: boolean;
  narutoSpriteUrl?: string;
  leaving?: boolean;
  facingRight?: boolean;
}

interface Particle {
  id: number;
  angle: number;
  color: string;
  distance: number;
}

const CONFETTI_COLORS = ['#f59e0b', '#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#ec4899', '#06b6d4'];

// 5 movement animation styles, assigned by pokemonId
const MOVE_ANIMS = [
  { animation: 'float 2.6s ease-in-out infinite' },
  { animation: 'bounce-pokemon 1.8s ease-in-out infinite' },
  { animation: 'sway 2.2s ease-in-out infinite' },
  { animation: 'hop 3s ease-in-out infinite' },
  { animation: 'wiggle 2.4s ease-in-out infinite' },
];

// Shiny sparkle positions around the sprite
const SPARKLE_POSITIONS = [
  { top: '-12px', left: '50%', color: '#fde047', duration: '1.1s', delay: '0s' },
  { top: '10%', right: '-12px', color: '#f472b6', duration: '1.3s', delay: '0.2s' },
  { bottom: '-10px', left: '50%', color: '#60a5fa', duration: '0.9s', delay: '0.4s' },
  { top: '10%', left: '-12px', color: '#4ade80', duration: '1.4s', delay: '0.6s' },
  { top: '50%', right: '-14px', color: '#fb923c', duration: '1.0s', delay: '0.8s' },
  { top: '50%', left: '-14px', color: '#c084fc', duration: '1.2s', delay: '1.0s' },
];

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

export function SpawnedPokemonCard({ spawned, pokemonData, onCapture, disabled, narutoSpriteUrl, leaving, facingRight = true }: Props) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [showParticles, setShowParticles] = useState(false);

  useEffect(() => {
    if (spawned.captured && !showParticles) {
      const newParticles: Particle[] = Array.from({ length: 14 }, (_, i) => ({
        id: i,
        angle: (i / 14) * 360,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        distance: 40 + Math.random() * 35,
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

  const isEpic = pokemonData.rarity === 'elite';
  const isLegendary = pokemonData.rarity === 'legendaire';

  let spriteFilter: string;
  let spriteAnimation: string | undefined;
  if (isLegendary) {
    spriteFilter = `drop-shadow(0 0 14px #fbbf24) drop-shadow(0 0 28px #f59e0b88) drop-shadow(0 0 42px #d97706aa)`;
    spriteAnimation = 'aura-pulse 1.5s ease-in-out infinite';
  } else if (isEpic) {
    spriteFilter = `drop-shadow(0 0 10px ${rarityColor}) drop-shadow(0 0 20px ${rarityColor}88)`;
    spriteAnimation = 'aura-pulse 2s ease-in-out infinite';
  } else if (spawned.isShiny) {
    spriteFilter = `drop-shadow(0 0 8px #fde047) drop-shadow(0 0 16px #f0abfc88)`;
    spriteAnimation = undefined;
  } else {
    spriteFilter = `drop-shadow(0 0 6px ${rarityColor})`;
    spriteAnimation = undefined;
  }

  // During cooldown: grayscale + dim instead of black overlay
  const cooldownStyle = disabled ? {
    filter: 'grayscale(0.85) brightness(0.55)',
    opacity: 0.7,
    transition: 'filter 0.3s, opacity 0.3s',
  } : {
    transition: 'filter 0.3s, opacity 0.3s',
  };

  // Movement animation — varied by pokemonId
  const moveAnim = MOVE_ANIMS[(spawned.pokemonId || 0) % MOVE_ANIMS.length];
  const moveDelay = `${(spawned.pokemonId % 7) * 0.3}s`;

  const containerClass = `absolute select-none ${leaving ? 'animate-leave' : 'animate-appear'}`;

  return (
    <div
      className={containerClass}
      style={{
        left: `${spawned.x}%`,
        top: `${spawned.y}%`,
        transform: 'translate(-50%, -50%)',
        transition: leaving ? undefined : 'left 0.08s linear, top 0.08s linear',
        ...(!spawned.captured && !leaving ? {
          animation: spawned.pokemonId % 3 === 0 ? 'wander-a 9s ease-in-out infinite' : spawned.pokemonId % 3 === 1 ? 'wander-b 11s ease-in-out infinite' : 'wander-c 13s ease-in-out infinite',
          animationDelay: `${(spawned.pokemonId % 5) * 1.8}s`,
        } : {}),
      }}
    >
      {/* Confetti particles on capture */}
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
              animation: 'confetti-fly 0.9s ease-out forwards',
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
          className="relative flex flex-col items-center"
          style={{
            ...cooldownStyle,
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
          title={pokemonData.name}
        >
          {/* Movement wrapper */}
          <div
            style={{
              animation: moveAnim.animation,
              animationDelay: moveDelay,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0,
            }}
          >
            {/* Shiny — rotating rainbow aura */}
            {spawned.isShiny && (
              <>
                <div
                  className="absolute pointer-events-none"
                  style={{
                    inset: -10,
                    borderRadius: '50%',
                    background: 'conic-gradient(from 0deg, #f87171, #fb923c, #fde047, #4ade80, #60a5fa, #c084fc, #f472b6, #f87171)',
                    animation: 'rainbow-spin 2s linear infinite',
                    opacity: 0.7,
                    filter: 'blur(6px)',
                  }}
                />
                <div
                  className="absolute pointer-events-none"
                  style={{
                    inset: -4,
                    borderRadius: '50%',
                    background: 'conic-gradient(from 0deg, #f87171aa, #fb923caa, #fde047aa, #4ade80aa, #60a5faaa, #c084fcaa, #f472b6aa, #f87171aa)',
                    animation: 'rainbow-spin 2s linear infinite',
                    opacity: 0.5,
                  }}
                />
              </>
            )}

            {/* Sprite + aura */}
            <div
              className="relative flex items-center justify-center"
              style={{ borderRadius: narutoSpriteUrl ? '8px' : '50%', padding: 0 }}
            >
              {/* Shiny sparkles — always visible for shiny */}
              {spawned.isShiny && SPARKLE_POSITIONS.map((sp, i) => (
                <div
                  key={i}
                  className="shiny-sparkle"
                  style={{
                    top: sp.top,
                    left: sp.left,
                    right: (sp as { right?: string }).right,
                    bottom: (sp as { bottom?: string }).bottom,
                    transform: sp.left === '50%' ? 'translateX(-50%)' : undefined,
                    '--sp-color': sp.color,
                    '--sp-duration': sp.duration,
                    '--sp-delay': sp.delay,
                  } as React.CSSProperties}
                />
              ))}

              {/* Legendary — golden pulsing aura */}
              {isLegendary && (
                <>
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      inset: -12,
                      borderRadius: '50%',
                      background: 'radial-gradient(circle, rgba(251,191,36,0.35) 0%, rgba(245,158,11,0.15) 50%, transparent 100%)',
                      animation: 'rainbow-pulse 1.8s ease-in-out infinite',
                    }}
                  />
                  <div
                    className="absolute pointer-events-none rounded-full"
                    style={{
                      inset: -6,
                      animation: 'gold-pulse 1.8s ease-in-out infinite',
                      borderRadius: '50%',
                    }}
                  />
                </>
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
                    transform: facingRight ? undefined : 'scaleX(-1)',
                  }}
                  draggable={false}
                  onError={() => setSpriteError(true)}
                />
              )}
            </div>

            {/* Name badge */}
            <div
              className="font-bold rounded"
              style={{
                background: 'rgba(0,0,0,0.75)',
                color: rarityColor,
                fontSize: '0.62rem',
                padding: '2px 6px',
                lineHeight: 1.3,
                whiteSpace: 'nowrap',
                margin: 0,
              }}
            >
              {pokemonData.name}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
