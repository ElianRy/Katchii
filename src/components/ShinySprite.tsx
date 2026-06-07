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

export function ShinySprite({ pokemonId, isShiny, width = 64, height = 64, className, style, alt, compact = false, flip = false }: Props) {
  const src = isShiny
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${pokemonId}.png`
    : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;

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
          animation: isShiny && !compact ? 'shiny-img-rainbow 2.5s linear infinite' : undefined,
          ...style,
        }}
      />
      {isShiny && (
        <span className="absolute -top-1 -right-1 text-xs pointer-events-none" style={{ filter: 'drop-shadow(0 0 2px #fde047)', fontSize: 10 }}>✨</span>
      )}
    </div>
  );
}
