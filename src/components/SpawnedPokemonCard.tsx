import { useEffect, useRef, useState } from 'react';
import { SpawnedPokemon, PokemonData, RARITY_COLORS } from '../types';

interface Props {
  spawned: SpawnedPokemon;
  pokemonData: PokemonData;
  onCapture: () => void;
  disabled: boolean;
  narutoSpriteUrl?: string;
  leaving?: boolean;
  facingRight?: boolean;
  alreadyCaught?: boolean;
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

// Stars use elliptical "perspective" orbits — different tilt per star so they
// appear to orbit in 3D planes, passing in front AND behind the sprite.
// anim = one of the shiny-persp-* keyframes defined in index.css
// layer: 'back' renders behind the sprite, 'front' renders in front
const SHINY_ORBIT_STARS: { color: string; dur: string; delay: string; sym: string; size: number; anim: string; layer: 'front' | 'back' }[] = [
  { color: '#fde047', dur: '3.2s', delay: '0s',    sym: '✦', size: 22, anim: 'shiny-persp-a', layer: 'front' },
  { color: '#f472b6', dur: '2.6s', delay: '-0.9s', sym: '★', size: 20, anim: 'shiny-persp-b', layer: 'back'  },
  { color: '#60a5fa', dur: '4.0s', delay: '-1.7s', sym: '✦', size: 22, anim: 'shiny-persp-c', layer: 'front' },
  { color: '#fbbf24', dur: '2.2s', delay: '-0.4s', sym: '✧', size: 18, anim: 'shiny-persp-d', layer: 'back'  },
  { color: '#ffffff', dur: '3.6s', delay: '-2.1s', sym: '★', size: 20, anim: 'shiny-persp-e', layer: 'front' },
  { color: '#4ade80', dur: '2.9s', delay: '-1.3s', sym: '✦', size: 21, anim: 'shiny-persp-a', layer: 'back'  },
  { color: '#a5f3fc', dur: '3.4s', delay: '-0.7s', sym: '✧', size: 19, anim: 'shiny-persp-c', layer: 'front' },
  { color: '#c084fc', dur: '2.4s', delay: '-1.5s', sym: '★', size: 20, anim: 'shiny-persp-d', layer: 'back'  },
  { color: '#fb923c', dur: '3.8s', delay: '-2.8s', sym: '✦', size: 21, anim: 'shiny-persp-b', layer: 'front' },
  { color: '#34d399', dur: '2.8s', delay: '-0.6s', sym: '✧', size: 18, anim: 'shiny-persp-e', layer: 'back'  },
  { color: '#f87171', dur: '3.0s', delay: '-1.1s', sym: '★', size: 20, anim: 'shiny-persp-a', layer: 'front' },
  { color: '#fde68a', dur: '2.5s', delay: '-2.4s', sym: '✦', size: 19, anim: 'shiny-persp-c', layer: 'back'  },
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

export function SpawnedPokemonCard({ spawned, pokemonData, onCapture, disabled, narutoSpriteUrl, leaving, facingRight = true, alreadyCaught }: Props) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [showParticles, setShowParticles] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [showStars, setShowStars] = useState(false);
  const [showSpecial, setShowSpecial] = useState(false);
  const [throwPhase, setThrowPhase] = useState<'idle' | 'throwing' | 'spinning'>('idle');
  const prevCapturing = useRef(false);

  useEffect(() => {
    if (!prevCapturing.current && spawned.capturing) {
      setThrowPhase('throwing');
      const t = setTimeout(() => setThrowPhase('spinning'), 550);
      return () => clearTimeout(t);
    }
    prevCapturing.current = spawned.capturing;
  }, [spawned.capturing]);

  useEffect(() => {
    if (spawned.captured && !showParticles) {
      const newParticles: Particle[] = Array.from({ length: 28 }, (_, i) => ({
        id: i,
        angle: (i / 28) * 360,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        distance: 60 + Math.random() * 40, // 60-100px
      }));
      setParticles(newParticles);
      setShowParticles(true);
      setShowFlash(true);
      setShowStars(true);
      setTimeout(() => setShowFlash(false), 600);
      setTimeout(() => setShowStars(false), 1200);
      if (pokemonData.rarity === 'legendaire' || spawned.isShiny) {
        setShowSpecial(true);
        setTimeout(() => setShowSpecial(false), 1600);
      }
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
    spriteFilter = undefined;
    spriteAnimation = 'shiny-img-rainbow 2.5s linear infinite';
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

  const containerClass = 'absolute select-none';

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
    <div className={leaving ? 'animate-leave-inner' : 'animate-appear-inner'}>
      {/* Capture flash overlay */}
      {showFlash && (
        <div className="absolute pointer-events-none" style={{
          inset: -30, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 70%)',
          animation: 'capture-flash 0.5s ease-out forwards',
          zIndex: 20,
        }} />
      )}

      {/* Star emojis on capture */}
      {showStars && Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * 360;
        const rad = (angle * Math.PI) / 180;
        const dist = 50 + Math.random() * 30;
        const dx = Math.cos(rad) * dist;
        const dy = Math.sin(rad) * dist;
        return (
          <div
            key={i}
            className="absolute pointer-events-none"
            style={{
              top: '50%',
              left: '50%',
              marginTop: -8,
              marginLeft: -8,
              fontSize: 16,
              '--dx': `${dx}px`,
              '--dy': `${dy}px`,
              animation: 'confetti-fly 1.0s ease-out forwards',
              zIndex: 21,
            } as React.CSSProperties}
          >⭐</div>
        );
      })}

      {/* Special overlay for legendary/shiny */}
      {showSpecial && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center" style={{ zIndex: 50 }}>
          <div style={{
            fontSize: isLegendary ? '4rem' : '3rem',
            animation: 'special-capture 1.5s ease-out forwards',
            textShadow: isLegendary ? '0 0 30px #fbbf24, 0 0 60px #f59e0b' : '0 0 30px #f0abfc, 0 0 60px #c084fc',
          }}>
            {isLegendary ? '🌟 LÉGENDAIRE ! 🌟' : '✨ SHINY ! ✨'}
          </div>
        </div>
      )}

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
              width: 12,
              height: 12,
              background: p.color,
              top: '50%',
              left: '50%',
              marginTop: -6,
              marginLeft: -6,
              '--dx': `${dx}px`,
              '--dy': `${dy}px`,
              animation: 'confetti-fly 0.9s ease-out forwards',
            } as React.CSSProperties}
          />
        );
      })}

      {spawned.capturing ? (
        <div className="flex items-center justify-center w-16 h-16" style={{ position: 'relative' }}>
          <div style={{
            animation: throwPhase === 'throwing' ? 'pokeball-throw 0.55s cubic-bezier(0.25,0.46,0.45,0.94) forwards' : 'pokeball-land 0.3s ease-out forwards',
          }}>
            <PokeballSVG spinning={throwPhase === 'spinning'} />
          </div>
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

            {/* Sprite + aura */}
            <div
              className="relative flex items-center justify-center"
              style={{ borderRadius: narutoSpriteUrl ? '8px' : '50%', padding: 0 }}
            >
              {/* Shiny stars BEHIND sprite */}
              {spawned.isShiny && SHINY_ORBIT_STARS.filter(s => s.layer === 'back').map((star, i) => (
                <div key={`b${i}`} className="absolute pointer-events-none" style={{
                  left: '50%', top: '50%', width: 0, height: 0, zIndex: 0,
                  animation: `${star.anim} ${star.dur} ${star.delay} linear infinite`,
                } as React.CSSProperties}>
                  <span style={{
                    position: 'absolute', transform: 'translate(-50%,-50%)',
                    color: star.color, fontSize: star.size, fontWeight: 900,
                    textShadow: `0 0 8px ${star.color}, 0 0 18px ${star.color}, 0 0 30px ${star.color}88`,
                    lineHeight: 1, userSelect: 'none',
                  }}>{star.sym}</span>
                </div>
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

              {/* Shiny stars IN FRONT of sprite */}
              {spawned.isShiny && SHINY_ORBIT_STARS.filter(s => s.layer === 'front').map((star, i) => (
                <div key={`f${i}`} className="absolute pointer-events-none" style={{
                  left: '50%', top: '50%', width: 0, height: 0, zIndex: 5,
                  animation: `${star.anim} ${star.dur} ${star.delay} linear infinite`,
                } as React.CSSProperties}>
                  <span style={{
                    position: 'absolute', transform: 'translate(-50%,-50%)',
                    color: star.color, fontSize: star.size, fontWeight: 900,
                    textShadow: `0 0 8px ${star.color}, 0 0 18px ${star.color}, 0 0 30px ${star.color}88`,
                    lineHeight: 1, userSelect: 'none',
                  }}>{star.sym}</span>
                </div>
              ))}
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
                display: 'flex',
                alignItems: 'center',
                gap: 3,
              }}
            >
              {alreadyCaught && (
                <svg width="9" height="9" viewBox="0 0 20 20" style={{ display: 'block', flexShrink: 0, opacity: 0.9 }}>
                  <path d="M 10 2 A 8 8 0 0 1 18 10 L 12.5 10 A 2.5 2.5 0 0 0 7.5 10 L 2 10 A 8 8 0 0 1 10 2 Z" fill="#ef4444"/>
                  <path d="M 2 10 A 8 8 0 0 0 18 10 L 12.5 10 A 2.5 2.5 0 0 1 7.5 10 Z" fill="white"/>
                  <circle cx="10" cy="10" r="8" fill="none" stroke="#444" strokeWidth="2"/>
                  <line x1="2" y1="10" x2="18" y2="10" stroke="#444" strokeWidth="2"/>
                  <circle cx="10" cy="10" r="3.5" fill="white" stroke="#444" strokeWidth="1.5"/>
                </svg>
              )}
              {pokemonData.name}
            </div>
          </div>
        </div>
      ) : null}
    </div>
    </div>
  );
}
