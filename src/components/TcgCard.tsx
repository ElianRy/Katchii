import React, { useRef, useState } from 'react';
import type { TcgCardDef } from '../data/tcgData';
import { TCG_RARITY_COLOR, TCG_RARITY_LABEL } from '../data/tcgData';
import { POKEMON_TYPE, TYPE_COLORS } from '../data/pokemonTypes';
import type { PokemonType } from '../data/pokemonTypes';
import { GEN1_STATS } from '../data/gen1Stats';

interface TcgCardProps {
  card: TcgCardDef;
  count?: number;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  isFavorite?: boolean;
  onFavorite?: () => void;
  showFavoriteBtn?: boolean;
}

const SIZE = {
  sm: { w: 80, h: 112, sprite: 48, font: 6, subFont: 5 },
  md: { w: 120, h: 168, sprite: 72, font: 8, subFont: 6 },
  lg: { w: 200, h: 280, sprite: 120, font: 12, subFont: 9 },
};

export default function TcgCard({ card, count, size = 'md', onClick, isFavorite, onFavorite, showFavoriteBtn }: TcgCardProps) {
  const s = SIZE[size];
  const types = POKEMON_TYPE[card.pokemonId] ?? ['normal'];
  const primaryType = types[0] as PokemonType;
  const typeColor = TYPE_COLORS[primaryType] ?? '#888';
  const secondaryType = types[1] ? (TYPE_COLORS[types[1] as PokemonType] ?? typeColor) : typeColor;
  const rarityColor = TCG_RARITY_COLOR[card.tcgRarity];
  const stats = GEN1_STATS[card.pokemonId];
  const hp = (stats as unknown as { hp?: number })?.hp ?? 50;

  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0, shine: 50 });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!card.isHolo) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 20;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -20;
    const shine = ((e.clientX - rect.left) / rect.width) * 100;
    setTilt({ x, y, shine });
  }
  function handleMouseLeave() {
    setTilt({ x: 0, y: 0, shine: 50 });
  }

  const cardBg = card.isHolo
    ? `linear-gradient(135deg, ${typeColor}cc 0%, ${secondaryType}99 50%, ${typeColor}cc 100%)`
    : `linear-gradient(160deg, ${typeColor}99 0%, #1e293b 60%, ${secondaryType}44 100%)`;

  const innerBorderColor = card.isHolo ? `${rarityColor}cc` : `${typeColor}88`;

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        width: s.w,
        height: s.h,
        borderRadius: s.w * 0.06,
        background: cardBg,
        border: `2px solid ${innerBorderColor}`,
        boxShadow: card.isHolo
          ? `0 0 ${s.w * 0.15}px ${rarityColor}88, 0 4px 16px rgba(0,0,0,0.7)`
          : `0 4px 12px rgba(0,0,0,0.5)`,
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
        overflow: 'hidden',
        flexShrink: 0,
        transform: `perspective(600px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`,
        transition: card.isHolo ? 'none' : 'box-shadow 0.2s',
        userSelect: 'none',
      }}
    >
      {/* Holo rainbow overlay */}
      {card.isHolo && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', borderRadius: 'inherit',
          background: `linear-gradient(${tilt.shine * 3.6}deg,
            rgba(255,0,0,0.12) 0%,
            rgba(255,165,0,0.12) 15%,
            rgba(255,255,0,0.12) 30%,
            rgba(0,255,0,0.12) 45%,
            rgba(0,150,255,0.12) 60%,
            rgba(150,0,255,0.12) 75%,
            rgba(255,0,150,0.12) 90%,
            rgba(255,0,0,0.12) 100%)`,
          mixBlendMode: 'screen',
        }} />
      )}

      {/* Holographic sparkles */}
      {card.isHolo && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', borderRadius: 'inherit',
          backgroundImage: `radial-gradient(circle at ${tilt.shine}% 50%, rgba(255,255,255,0.25) 0%, transparent 60%)`,
        }} />
      )}

      {/* Inner border frame */}
      <div style={{
        position: 'absolute', inset: s.w * 0.04, borderRadius: s.w * 0.04,
        border: `1px solid ${innerBorderColor}66`, zIndex: 3, pointerEvents: 'none',
      }} />

      {/* Top bar: name + HP */}
      <div style={{
        position: 'relative', zIndex: 4,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: `${s.w * 0.05}px ${s.w * 0.08}px ${s.w * 0.02}px`,
      }}>
        <span style={{
          color: 'white', fontWeight: 900, fontFamily: 'monospace',
          fontSize: s.font, textShadow: '0 1px 3px rgba(0,0,0,0.8)',
          maxWidth: '65%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {card.pokemonName}
        </span>
        <span style={{
          color: 'white', fontWeight: 700, fontFamily: 'monospace',
          fontSize: s.subFont, textShadow: '0 1px 3px rgba(0,0,0,0.8)',
        }}>
          {hp} PV
        </span>
      </div>

      {/* Sprite area */}
      <div style={{
        position: 'relative', zIndex: 4,
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        height: s.sprite + s.w * 0.08,
        background: 'rgba(0,0,0,0.25)',
        margin: `0 ${s.w * 0.06}px`,
        borderRadius: s.w * 0.04,
        border: `1px solid rgba(255,255,255,0.1)`,
        overflow: 'hidden',
      }}>
        <img
          src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${card.pokemonId}.png`}
          style={{ width: s.sprite, height: s.sprite, imageRendering: 'pixelated' }}
          alt={card.pokemonName}
        />
        {/* Pokédex number */}
        <span style={{
          position: 'absolute', bottom: 3, right: 6,
          color: 'rgba(255,255,255,0.5)', fontSize: s.subFont - 1, fontFamily: 'monospace',
        }}>
          #{String(card.pokemonId).padStart(3, '0')}
        </span>
      </div>

      {/* Types */}
      <div style={{
        position: 'relative', zIndex: 4,
        display: 'flex', gap: 3, justifyContent: 'center',
        padding: `${s.w * 0.03}px`,
      }}>
        {types.slice(0, 2).map(t => (
          <span key={t} style={{
            background: TYPE_COLORS[t as PokemonType] ?? '#888',
            color: 'white', fontWeight: 900, fontFamily: 'monospace',
            borderRadius: s.w * 0.02, padding: `1px ${s.w * 0.04}px`,
            fontSize: s.subFont - 1, textTransform: 'uppercase',
          }}>
            {t}
          </span>
        ))}
      </div>

      {/* Bottom: rarity */}
      <div style={{
        position: 'absolute', bottom: s.w * 0.04, left: 0, right: 0, zIndex: 4,
        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4,
      }}>
        <span style={{
          color: card.isHolo ? rarityColor : `${rarityColor}cc`,
          fontSize: s.subFont - 1, fontFamily: 'monospace', fontWeight: 900,
          textShadow: card.isHolo ? `0 0 8px ${rarityColor}` : 'none',
        }}>
          {card.isHolo ? '✦ HOLO' : TCG_RARITY_LABEL[card.tcgRarity].split(' ').slice(1).join(' ').toUpperCase()}
        </span>
      </div>

      {/* Count badge */}
      {count !== undefined && count > 1 && (
        <div style={{
          position: 'absolute', top: 4, right: 4, zIndex: 10,
          background: 'rgba(0,0,0,0.7)', color: 'white', fontWeight: 900,
          borderRadius: '50%', width: s.font + 8, height: s.font + 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: s.subFont, border: '1px solid rgba(255,255,255,0.3)',
        }}>
          ×{count}
        </div>
      )}

      {/* Favorite button */}
      {showFavoriteBtn && (
        <button
          onClick={e => { e.stopPropagation(); onFavorite?.(); }}
          style={{
            position: 'absolute', top: 4, left: 4, zIndex: 10,
            background: isFavorite ? '#f59e0b' : 'rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.3)', borderRadius: '50%',
            width: s.font + 8, height: s.font + 8, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: s.subFont,
          }}
        >
          ★
        </button>
      )}
    </div>
  );
}
