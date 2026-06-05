import React from 'react';

export const SPARKLE_POSITIONS = [
  { top: '-16px',  left: '50%',    color: '#fde047', duration: '1.0s', delay: '0s' },
  { top: '5%',     right: '-16px', color: '#f472b6', duration: '1.2s', delay: '0.15s' },
  { bottom: '-14px',left: '50%',   color: '#60a5fa', duration: '0.85s', delay: '0.3s' },
  { top: '5%',     left: '-16px',  color: '#4ade80', duration: '1.3s', delay: '0.45s' },
  { top: '50%',    right: '-18px', color: '#fb923c', duration: '0.95s', delay: '0.6s' },
  { top: '50%',    left: '-18px',  color: '#c084fc', duration: '1.1s', delay: '0.75s' },
  { top: '-14px',  right: '20%',   color: '#34d399', duration: '1.25s', delay: '0.9s' },
  { bottom: '-12px',right: '20%',  color: '#f87171', duration: '1.05s', delay: '1.05s' },
];

const ORBIT_POSITIONS = [
  { top: '-8px',   left: '30%',   color: '#fde047', duration: '1.15s', delay: '0.5s' },
  { top: '20%',    right: '-10px',color: '#60a5fa', duration: '0.9s',  delay: '0.7s' },
  { bottom: '-6px',left: '70%',   color: '#f472b6', duration: '1.0s',  delay: '0.2s' },
  { top: '70%',    left: '-10px', color: '#fb923c', duration: '1.35s', delay: '0.95s' },
];

interface Props {
  pokemonId: number;
  isShiny: boolean;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
  /** compact=true skips animated sparkle divs (use in grids with many pokemon) */
  compact?: boolean;
  /** flip=true mirrors the whole sprite + aura horizontally */
  flip?: boolean;
}

export function ShinySprite({ pokemonId, isShiny, width = 64, height = 64, className, style, alt, compact = false, flip = false }: Props) {
  const src = isShiny
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${pokemonId}.png`
    : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width, height, transform: flip ? 'scaleX(-1)' : undefined }}>
      {/* Full sparkles only in non-compact mode */}
      {isShiny && !compact && SPARKLE_POSITIONS.map((sp, i) => (
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
      {isShiny && !compact && ORBIT_POSITIONS.map((sp, i) => (
        <div
          key={`o${i}`}
          className="shiny-sparkle-orbit"
          style={{
            top: sp.top,
            left: sp.left,
            right: (sp as { right?: string }).right,
            bottom: (sp as { bottom?: string }).bottom,
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
        style={{
          imageRendering: 'pixelated',
          ...(isShiny ? { filter: 'drop-shadow(0 0 8px #fde047) drop-shadow(0 0 14px #f472b6)' } : {}),
          ...style,
        }}
      />
      {isShiny && (
        <span className="absolute -top-1 -right-1 text-xs pointer-events-none" style={{ filter: 'drop-shadow(0 0 3px #fde047)' }}>✨</span>
      )}
    </div>
  );
}

