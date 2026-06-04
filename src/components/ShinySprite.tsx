import React from 'react';

export const SPARKLE_POSITIONS = [
  { top: '-12px', left: '50%', color: '#fde047', duration: '1.1s', delay: '0s' },
  { top: '10%', right: '-12px', color: '#f472b6', duration: '1.3s', delay: '0.2s' },
  { bottom: '-10px', left: '50%', color: '#60a5fa', duration: '0.9s', delay: '0.4s' },
  { top: '10%', left: '-12px', color: '#4ade80', duration: '1.4s', delay: '0.6s' },
  { top: '50%', right: '-14px', color: '#fb923c', duration: '1.0s', delay: '0.8s' },
  { top: '50%', left: '-14px', color: '#c084fc', duration: '1.2s', delay: '1.0s' },
];

interface Props {
  pokemonId: number;
  isShiny: boolean;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
}

export function ShinySprite({ pokemonId, isShiny, width = 64, height = 64, className, style, alt }: Props) {
  const src = isShiny
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${pokemonId}.png`
    : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width, height }}>
      {isShiny && SPARKLE_POSITIONS.map((sp, i) => (
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
      <img
        src={src}
        alt={alt ?? ''}
        width={width}
        height={height}
        className={className}
        style={{ imageRendering: 'pixelated', ...style }}
      />
      {isShiny && (
        <span className="absolute -top-1 -right-1 text-xs pointer-events-none">✨</span>
      )}
    </div>
  );
}
