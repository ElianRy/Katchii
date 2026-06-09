import React from 'react';

// kept for external consumers that import these arrays
export const SPARKLE_POSITIONS: never[] = [];
export const ORBIT_POSITIONS: never[] = [];

interface Props {
  pokemonId: number;
  isShiny: boolean;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
  compact?: boolean;
  flip?: boolean;
}

const BATTLE_ORBIT_STARS: { color: string; dur: string; delay: string; sym: string; size: number; anim: string; layer: 'front' | 'back' }[] = [
  { color: '#fde047', dur: '3.0s', delay: '0s',    sym: '✦', size: 14, anim: 'shiny-persp-a', layer: 'front' },
  { color: '#f472b6', dur: '2.5s', delay: '-0.8s', sym: '★', size: 12, anim: 'shiny-persp-b', layer: 'back'  },
  { color: '#60a5fa', dur: '3.8s', delay: '-1.6s', sym: '✦', size: 13, anim: 'shiny-persp-c', layer: 'front' },
  { color: '#fbbf24', dur: '2.1s', delay: '-0.4s', sym: '✧', size: 11, anim: 'shiny-persp-d', layer: 'back'  },
  { color: '#ffffff', dur: '3.4s', delay: '-2.0s', sym: '★', size: 12, anim: 'shiny-persp-e', layer: 'front' },
  { color: '#4ade80', dur: '2.8s', delay: '-1.2s', sym: '✦', size: 13, anim: 'shiny-persp-a', layer: 'back'  },
  { color: '#c084fc', dur: '2.3s', delay: '-1.4s', sym: '✧', size: 11, anim: 'shiny-persp-d', layer: 'front' },
  { color: '#fb923c', dur: '3.6s', delay: '-2.6s', sym: '★', size: 10, anim: 'shiny-persp-b', layer: 'back'  },
];

export function ShinySprite({ pokemonId, isShiny, width = 64, height = 64, className, style, alt, compact = false, flip = false }: Props) {
  const src = isShiny
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${pokemonId}.png`
    : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;

  const cx = width / 2;
  const cy = height / 2;

  if (isShiny && !compact) {
    return (
      <div className="relative inline-flex items-center justify-center" style={{ width, height, transform: flip ? 'scaleX(-1)' : undefined }}>
        {/* Stars behind sprite */}
        {BATTLE_ORBIT_STARS.filter(s => s.layer === 'back').map((star, i) => (
          <div key={`b${i}`} style={{
            position: 'absolute', left: cx, top: cy, width: 0, height: 0, zIndex: 0,
            animation: `${star.anim} ${star.dur} ${star.delay} linear infinite`,
          } as React.CSSProperties}>
            <span style={{
              position: 'absolute', transform: 'translate(-50%,-50%)',
              color: star.color, fontSize: star.size, fontWeight: 900,
              textShadow: `0 0 6px ${star.color}, 0 0 12px ${star.color}88`,
              lineHeight: 1, userSelect: 'none',
            }}>{star.sym}</span>
          </div>
        ))}
        <img
          src={src}
          alt={alt ?? ''}
          width={width}
          height={height}
          className={className}
          style={{
            imageRendering: 'pixelated',
            animation: 'shiny-img-rainbow 2.5s linear infinite',
            position: 'relative', zIndex: 1,
            ...style,
          }}
        />
        {/* Stars in front of sprite */}
        {BATTLE_ORBIT_STARS.filter(s => s.layer === 'front').map((star, i) => (
          <div key={`f${i}`} style={{
            position: 'absolute', left: cx, top: cy, width: 0, height: 0, zIndex: 5,
            animation: `${star.anim} ${star.dur} ${star.delay} linear infinite`,
          } as React.CSSProperties}>
            <span style={{
              position: 'absolute', transform: 'translate(-50%,-50%)',
              color: star.color, fontSize: star.size, fontWeight: 900,
              textShadow: `0 0 6px ${star.color}, 0 0 12px ${star.color}88`,
              lineHeight: 1, userSelect: 'none',
            }}>{star.sym}</span>
          </div>
        ))}
        <span className="absolute -top-1 -right-1 text-xs pointer-events-none" style={{ filter: 'drop-shadow(0 0 2px #fde047)', fontSize: 10, zIndex: 6 }}>✨</span>
      </div>
    );
  }

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width, height, transform: flip ? 'scaleX(-1)' : undefined }}>
      <img
        src={src}
        alt={alt ?? ''}
        width={width}
        height={height}
        className={className}
        style={{
          imageRendering: 'pixelated',
          ...style,
        }}
      />
      {isShiny && (
        <span className="absolute -top-1 -right-1 text-xs pointer-events-none" style={{ filter: 'drop-shadow(0 0 2px #fde047)', fontSize: 10 }}>✨</span>
      )}
    </div>
  );
}
