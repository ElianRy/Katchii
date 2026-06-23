import { useState } from 'react';
import type { TcgCardDef } from '../data/tcgData';
import { TCG_RARITY_COLOR, TCG_RARITY_LABEL, getTcgMoves } from '../data/tcgData';
import { POKEMON_TYPE, TYPE_COLORS } from '../data/pokemonTypes';
import type { PokemonType } from '../data/pokemonTypes';
import { GEN1_STATS } from '../data/gen1Stats';

interface TcgCardProps {
  card: TcgCardDef;
  count?: number;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  isFavorite?: boolean;
}

const SIZE = {
  sm: { w: 80,  h: 112, sprite: 44, font: 6,  subFont: 5,  showMoves: false },
  md: { w: 120, h: 168, sprite: 60, font: 8,  subFont: 6,  showMoves: true  },
  lg: { w: 200, h: 280, sprite: 100, font: 12, subFont: 9, showMoves: true  },
};

// Type-specific click animation colors
const TYPE_ANIM_COLOR: Record<string, string> = {
  fire: '#ef4444', water: '#3b82f6', electric: '#fbbf24', grass: '#22c55e',
  psychic: '#ec4899', ice: '#67e8f9', fighting: '#b45309', poison: '#a855f7',
  ground: '#d97706', flying: '#818cf8', bug: '#84cc16', rock: '#78716c',
  ghost: '#6d28d9', dragon: '#1d4ed8', dark: '#1f2937', steel: '#94a3b8',
  normal: '#9ca3af',
};

function getPermanentAnimation(card: TcgCardDef): string {
  if (card.tcgRarity === 'secret') return 'tcg-secret 1.5s ease-in-out infinite';
  if (card.tcgRarity === 'ultra' && card.isHolo) return 'tcg-ultra-holo 2s ease-in-out infinite';
  if (card.tcgRarity === 'ultra') return 'tcg-ultra 2.5s ease-in-out infinite';
  if (card.tcgRarity === 'rare' && card.isHolo) return 'tcg-holo 3.5s ease-in-out infinite';
  return 'none';
}

export default function TcgCard({ card, count, size = 'md', onClick, isFavorite }: TcgCardProps) {
  const s = SIZE[size];
  const [clicking, setClicking] = useState(false);
  const types = POKEMON_TYPE[card.pokemonId] ?? ['normal'];
  const primaryType = types[0] as PokemonType;
  const typeColor = TYPE_COLORS[primaryType] ?? '#888';
  const typeColor2 = types[1] ? (TYPE_COLORS[types[1] as PokemonType] ?? typeColor) : typeColor;
  const rarityColor = TCG_RARITY_COLOR[card.tcgRarity];
  const stats = GEN1_STATS[card.pokemonId];
  const hp = (stats as unknown as Record<string, number>)?.hp ?? 50;
  const moves = s.showMoves ? getTcgMoves(card.pokemonId) : [];
  const clickColor = TYPE_ANIM_COLOR[primaryType] ?? '#ffffff';
  const permAnim = getPermanentAnimation(card);

  function handleClick() {
    if (!onClick && !clicking) return;
    setClicking(true);
    setTimeout(() => setClicking(false), 600);
    onClick?.();
  }

  const cardBg = card.isHolo
    ? `linear-gradient(135deg, ${typeColor}cc 0%, ${typeColor2}88 50%, ${typeColor}cc 100%)`
    : `linear-gradient(160deg, ${typeColor}88 0%, #1e293b 65%, ${typeColor2}33 100%)`;

  return (
    <>
      <style>{`
        @keyframes tcg-holo {
          0%, 100% { box-shadow: 0 0 8px ${rarityColor}66, inset 0 0 8px ${rarityColor}22; }
          50%       { box-shadow: 0 0 20px ${rarityColor}bb, 0 0 40px ${rarityColor}44, inset 0 0 15px ${rarityColor}33; }
        }
        @keyframes tcg-ultra {
          0%, 100% { box-shadow: 0 0 10px ${typeColor}88; filter: brightness(1); }
          50%       { box-shadow: 0 0 25px ${typeColor}cc, 0 0 50px ${typeColor}44; filter: brightness(1.1); }
        }
        @keyframes tcg-ultra-holo {
          0%   { box-shadow: 0 0 15px #f00a, 0 0 30px #f00a; }
          17%  { box-shadow: 0 0 15px #ff0a, 0 0 30px #ff0a; }
          33%  { box-shadow: 0 0 15px #0f0a, 0 0 30px #0f0a; }
          50%  { box-shadow: 0 0 15px #0ffa, 0 0 30px #0ffa; }
          67%  { box-shadow: 0 0 15px #00fa, 0 0 30px #00fa; }
          83%  { box-shadow: 0 0 15px #f0fa, 0 0 30px #f0fa; }
          100% { box-shadow: 0 0 15px #f00a, 0 0 30px #f00a; }
        }
        @keyframes tcg-secret {
          0%   { box-shadow: 0 0 20px #ffd700, 0 0 40px #ffd700; transform: scale(1); filter: brightness(1); }
          25%  { box-shadow: 0 0 35px #fff, 0 0 60px #ffd700, 0 0 90px #ffd700; transform: scale(1.03); filter: brightness(1.2); }
          50%  { box-shadow: 0 0 20px #ff69b4, 0 0 40px #ffd700; transform: scale(1); filter: brightness(1); }
          75%  { box-shadow: 0 0 35px #fff, 0 0 60px #ffd700, 0 0 90px #ff69b4; transform: scale(1.03); filter: brightness(1.2); }
          100% { box-shadow: 0 0 20px #ffd700, 0 0 40px #ffd700; transform: scale(1); filter: brightness(1); }
        }
        @keyframes tcg-click {
          0%   { box-shadow: 0 0 0 0 ${clickColor}00; }
          30%  { box-shadow: 0 0 40px 15px ${clickColor}cc; }
          100% { box-shadow: 0 0 0 0 ${clickColor}00; }
        }
      `}</style>

      <div
        onClick={handleClick}
        style={{
          width: s.w, height: s.h,
          borderRadius: s.w * 0.06,
          background: cardBg,
          border: `2px solid ${card.isHolo ? rarityColor + 'bb' : typeColor + '88'}`,
          position: 'relative', overflow: 'hidden', flexShrink: 0,
          cursor: onClick ? 'pointer' : 'default',
          userSelect: 'none',
          animation: clicking ? `tcg-click 0.6s ease-out` : permAnim,
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Holo shimmer overlay */}
        {card.isHolo && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', borderRadius: 'inherit',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%, rgba(255,255,255,0.08) 100%)',
            mixBlendMode: 'screen',
          }} />
        )}

        {/* Inner border */}
        <div style={{
          position: 'absolute', inset: s.w * 0.04, borderRadius: s.w * 0.04,
          border: `1px solid rgba(255,255,255,0.15)`, zIndex: 3, pointerEvents: 'none',
        }} />

        {/* Favorite star */}
        {isFavorite && (
          <div style={{
            position: 'absolute', top: 3, left: 4, zIndex: 10,
            color: '#fbbf24', fontSize: s.subFont + 1, textShadow: '0 0 6px #fbbf24',
          }}>★</div>
        )}

        {/* Top: name + HP */}
        <div style={{
          position: 'relative', zIndex: 4,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: `${s.w * 0.05}px ${s.w * 0.08}px ${s.w * 0.01}px`,
        }}>
          <span style={{
            color: 'white', fontWeight: 900, fontFamily: 'monospace', fontSize: s.font,
            textShadow: '0 1px 3px rgba(0,0,0,0.9)', maxWidth: '68%',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{card.pokemonName}</span>
          <span style={{ color: 'white', fontWeight: 700, fontFamily: 'monospace', fontSize: s.subFont, textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
            {hp} PV
          </span>
        </div>

        {/* Sprite */}
        <div style={{
          position: 'relative', zIndex: 4, flexShrink: 0,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          height: s.sprite + s.w * 0.06,
          background: 'rgba(0,0,0,0.28)',
          margin: `0 ${s.w * 0.06}px`,
          borderRadius: s.w * 0.04,
          border: '1px solid rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}>
          <img
            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${card.pokemonId}.png`}
            style={{ width: s.sprite, height: s.sprite, imageRendering: 'pixelated' }}
            alt={card.pokemonName}
          />
          <span style={{ position: 'absolute', bottom: 2, right: 5, color: 'rgba(255,255,255,0.4)', fontSize: s.subFont - 1, fontFamily: 'monospace' }}>
            #{String(card.pokemonId).padStart(3, '0')}
          </span>
        </div>

        {/* Types */}
        <div style={{
          position: 'relative', zIndex: 4,
          display: 'flex', gap: 3, justifyContent: 'center',
          padding: `${s.w * 0.025}px ${s.w * 0.06}px`,
        }}>
          {types.slice(0, 2).map(t => (
            <span key={t} style={{
              background: TYPE_COLORS[t as PokemonType] ?? '#888',
              color: 'white', fontWeight: 900, fontFamily: 'monospace',
              borderRadius: s.w * 0.02, padding: `0px ${s.w * 0.04}px`,
              fontSize: s.subFont - 1, textTransform: 'uppercase',
            }}>{t}</span>
          ))}
        </div>

        {/* Moves */}
        {s.showMoves && moves.length > 0 && (
          <div style={{
            position: 'relative', zIndex: 4, flex: 1,
            display: 'flex', flexDirection: 'column', gap: 2,
            padding: `2px ${s.w * 0.07}px 0`,
            borderTop: '1px solid rgba(255,255,255,0.1)',
            marginTop: 2,
          }}>
            {moves.map((mv, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <span style={{
                      width: s.subFont - 1, height: s.subFont - 1, borderRadius: '50%',
                      background: TYPE_COLORS[mv.type as PokemonType] ?? '#888',
                      display: 'inline-block', flexShrink: 0,
                    }} />
                    <span style={{ color: 'white', fontWeight: 900, fontFamily: 'monospace', fontSize: s.subFont - 1 }}>
                      {mv.name}
                    </span>
                  </div>
                  {mv.damage > 0 && (
                    <span style={{ color: '#fbbf24', fontWeight: 900, fontFamily: 'monospace', fontSize: s.subFont - 1 }}>
                      {mv.damage}
                    </span>
                  )}
                </div>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace', fontSize: s.subFont - 2, lineHeight: 1.2 }}>
                  {mv.description}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Bottom: count (left) + rarity (right) */}
        <div style={{
          position: 'absolute', bottom: s.w * 0.03, left: s.w * 0.05, right: s.w * 0.05,
          zIndex: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        }}>
          {count !== undefined && count > 1 ? (
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: s.subFont - 1, fontFamily: 'monospace', fontWeight: 700 }}>×{count}</span>
          ) : <span />}
          <span style={{
            color: card.isHolo ? rarityColor : `${rarityColor}cc`,
            fontSize: s.subFont - 1, fontFamily: 'monospace', fontWeight: 900,
            textShadow: card.isHolo ? `0 0 6px ${rarityColor}` : 'none',
          }}>
            {card.isHolo ? '✦ HOLO' : TCG_RARITY_LABEL[card.tcgRarity].split(' ')[0]}
          </span>
        </div>
      </div>
    </>
  );
}
