import { useState } from 'react';
import type { TcgCardDef } from '../data/tcgData';
import { TCG_RARITY_COLOR, TCG_RARITY_LABEL, getTcgMoves } from '../data/tcgData';
import { POKEMON_TYPE, TYPE_COLORS } from '../data/pokemonTypes';
import type { PokemonType } from '../data/pokemonTypes';
import { GEN1_STATS } from '../data/gen1Stats';
import { POKEMON_INFO } from '../data/pokemonInfo';

interface TcgCardProps {
  card: TcgCardDef;
  count?: number;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  isFavorite?: boolean;
}

const SIZE = {
  sm: { w: 80,  h: 112, sprite: 40, font: 6,  subFont: 5,  showMoves: false },
  md: { w: 120, h: 168, sprite: 58, font: 8,  subFont: 6,  showMoves: true  },
  lg: { w: 200, h: 280, sprite: 96, font: 12, subFont: 9, showMoves: true  },
};

const TYPE_ANIM_COLOR: Record<string, string> = {
  fire: '#ef4444', water: '#3b82f6', electric: '#fbbf24', grass: '#22c55e',
  psychic: '#ec4899', ice: '#67e8f9', fighting: '#b45309', poison: '#a855f7',
  ground: '#d97706', flying: '#818cf8', bug: '#84cc16', rock: '#78716c',
  ghost: '#6d28d9', dragon: '#1d4ed8', dark: '#1f2937', steel: '#94a3b8',
  normal: '#9ca3af',
};

// Type → particle CSS class key
const TYPE_PARTICLE: Record<string, string> = {
  fire: 'particle-fire', water: 'particle-water', electric: 'particle-electric',
  grass: 'particle-grass', ice: 'particle-ice', psychic: 'particle-psychic',
  ghost: 'particle-ghost', dragon: 'particle-dragon', poison: 'particle-poison',
  flying: 'particle-flying', normal: '', fighting: '', ground: 'particle-ground',
  rock: '', bug: 'particle-bug', steel: '', dark: 'particle-dark',
};

function getRarityTier(card: TcgCardDef): 0 | 1 | 2 | 3 {
  if (card.tcgRarity === 'secret') return 3;
  if (card.tcgRarity === 'ultra' && card.isHolo) return 3;
  if (card.tcgRarity === 'ultra') return 2;
  if (card.tcgRarity === 'rare' && card.isHolo) return 2;
  if (card.tcgRarity === 'rare') return 1;
  return 0;
}

function getPermanentAnimation(card: TcgCardDef): string {
  if (card.tcgRarity === 'secret') return 'tcg-secret 1.5s ease-in-out infinite';
  if (card.tcgRarity === 'ultra' && card.isHolo) return 'tcg-ultra-holo-epic 3s linear infinite';
  if (card.tcgRarity === 'ultra') return 'tcg-ultra 2.5s ease-in-out infinite';
  if (card.tcgRarity === 'rare' && card.isHolo) return 'tcg-holo 3.5s ease-in-out infinite';
  return 'none';
}

// CSS fake attacks for sm size — colored shapes simulating card layout
function FakeAttacks({ typeColor, typeColor2, subFont }: { typeColor: string; typeColor2: string; subFont: number }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly',
      padding: '2px 6px', borderTop: '1px solid rgba(255,255,255,0.12)', marginTop: 2,
    }}>
      {[typeColor, typeColor2].map((c, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {/* Move name line: dot + wide rect */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <div style={{ width: subFont - 1, height: subFont - 1, borderRadius: '50%', background: c, flexShrink: 0 }} />
            <div style={{ height: subFont - 2, flex: 1, background: 'rgba(255,255,255,0.55)', borderRadius: 2 }} />
            <div style={{ height: subFont - 2, width: subFont + 2, background: '#fbbf24', borderRadius: 2, flexShrink: 0 }} />
          </div>
          {/* Description lines: two narrow rects */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, paddingLeft: subFont + 1 }}>
            <div style={{ height: subFont - 3, width: '85%', background: 'rgba(255,255,255,0.3)', borderRadius: 1 }} />
            <div style={{ height: subFont - 3, width: '60%', background: 'rgba(255,255,255,0.2)', borderRadius: 1 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Orbit stars around card
function OrbitStars({ w, h, tier, rarityColor }: { w: number; h: number; tier: number; rarityColor: string }) {
  if (tier < 1) return null;
  const count = tier === 3 ? 12 : tier === 2 ? 8 : 5;
  const stars = Array.from({ length: count }, (_, i) => {
    const angle = (360 / count) * i;
    const delay = (i / count) * -3;
    const zFront = i % 2 === 0;
    return { angle, delay, zFront };
  });
  return (
    <>
      {stars.map((s, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: '50%', left: '50%',
            width: w * 0.07, height: w * 0.07,
            marginLeft: -(w * 0.035), marginTop: -(w * 0.035),
            zIndex: s.zFront ? 20 : 1,
            pointerEvents: 'none',
            animation: `orbit-star ${tier === 3 ? 2.5 : tier === 2 ? 3.5 : 5}s linear ${s.delay}s infinite`,
            '--orbit-rx': `${w * 0.62}px`,
            '--orbit-ry': `${h * 0.58}px`,
            '--orbit-start': `${s.angle}deg`,
          } as React.CSSProperties}
        >
          <div style={{
            width: '100%', height: '100%',
            background: rarityColor,
            clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
            filter: `drop-shadow(0 0 3px ${rarityColor})`,
            opacity: tier === 3 ? 1 : 0.8,
          }} />
        </div>
      ))}
    </>
  );
}

// Type-specific particles
function TypeParticles({ primaryType, w, tier }: { primaryType: string; w: number; tier: number }) {
  if (tier < 1) return null;
  const particleClass = TYPE_PARTICLE[primaryType];
  if (!particleClass) return null;

  const count = tier >= 2 ? 8 : 5;
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const leftPct = 10 + (i / count) * 80;
        const delay = (i / count) * -2;
        return (
          <div
            key={i}
            className={particleClass}
            style={{
              position: 'absolute',
              bottom: 0,
              left: `${leftPct}%`,
              zIndex: 15,
              pointerEvents: 'none',
              animationDelay: `${delay}s`,
              width: w * 0.06, height: w * 0.06,
            } as React.CSSProperties}
          />
        );
      })}
    </>
  );
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
  const tier = getRarityTier(card);
  const info = POKEMON_INFO[card.pokemonId];

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
        @keyframes tcg-ultra-holo-epic {
          0%   { box-shadow: 0 0 20px #f00, 0 0 40px #f008, 0 0 60px #f004; filter: brightness(1.05) hue-rotate(0deg); }
          16%  { box-shadow: 0 0 20px #ff0, 0 0 40px #ff08, 0 0 60px #ff04; filter: brightness(1.15) hue-rotate(60deg); }
          33%  { box-shadow: 0 0 20px #0f0, 0 0 40px #0f08, 0 0 60px #0f04; filter: brightness(1.05) hue-rotate(120deg); }
          50%  { box-shadow: 0 0 20px #0ff, 0 0 40px #0ff8, 0 0 60px #0ff4; filter: brightness(1.15) hue-rotate(180deg); }
          66%  { box-shadow: 0 0 20px #00f, 0 0 40px #00f8, 0 0 60px #00f4; filter: brightness(1.05) hue-rotate(240deg); }
          83%  { box-shadow: 0 0 20px #f0f, 0 0 40px #f0f8, 0 0 60px #f0f4; filter: brightness(1.15) hue-rotate(300deg); }
          100% { box-shadow: 0 0 20px #f00, 0 0 40px #f008, 0 0 60px #f004; filter: brightness(1.05) hue-rotate(360deg); }
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
        @keyframes orbit-star {
          from { transform: rotate(var(--orbit-start)) translateX(var(--orbit-rx)) rotate(calc(-1 * var(--orbit-start))) rotateY(0deg); }
          to   { transform: rotate(calc(var(--orbit-start) + 360deg)) translateX(var(--orbit-rx)) rotate(calc(-1 * (var(--orbit-start) + 360deg))) rotateY(0deg); }
        }
        /* Type particles */
        @keyframes rise-fire   { 0% { transform: translateY(0) scale(1); opacity: 0.9; } 100% { transform: translateY(-60px) scale(0.3); opacity: 0; } }
        @keyframes rise-leaf   { 0% { transform: translateY(0) rotate(0deg); opacity: 0.8; } 100% { transform: translateY(-55px) rotate(180deg); opacity: 0; } }
        @keyframes rise-spark  { 0% { transform: translateY(0) translateX(0); opacity: 1; } 50% { transform: translateY(-20px) translateX(6px); } 100% { transform: translateY(-50px) translateX(-4px); opacity: 0; } }
        @keyframes rise-drop   { 0% { transform: translateY(0) scaleY(1); opacity: 0.8; } 100% { transform: translateY(-45px) scaleY(0.5); opacity: 0; } }
        @keyframes rise-snow   { 0% { transform: translateY(0) rotate(0deg); opacity: 0.9; } 100% { transform: translateY(-50px) rotate(90deg); opacity: 0; } }
        @keyframes rise-psychic { 0% { transform: scale(0.5) translateY(0); opacity: 0.8; } 100% { transform: scale(1.5) translateY(-40px); opacity: 0; } }
        @keyframes rise-ghost  { 0% { transform: translateY(0); opacity: 0.7; } 50% { opacity: 1; } 100% { transform: translateY(-55px); opacity: 0; } }
        @keyframes rise-bubble { 0% { transform: translateY(0) scale(1); opacity: 0.8; } 100% { transform: translateY(-50px) scale(1.4); opacity: 0; } }
        @keyframes rise-ground { 0% { transform: translateY(0) scale(1); opacity: 0.8; } 100% { transform: translateY(-35px) scale(0.5); opacity: 0; } }
        .particle-fire   { background: radial-gradient(circle, #fbbf24, #ef4444); border-radius: 50% 50% 30% 30%; animation: rise-fire 1.2s ease-out infinite; }
        .particle-grass  { background: #22c55e; clip-path: ellipse(30% 50% at 50% 50%); border-radius: 50%; animation: rise-leaf 1.5s ease-out infinite; }
        .particle-electric { background: #fbbf24; clip-path: polygon(50% 0%, 60% 40%, 100% 38%, 65% 60%, 79% 100%, 50% 70%, 21% 100%, 35% 60%, 0% 38%, 40% 40%); animation: rise-spark 0.9s ease-out infinite; }
        .particle-water  { background: radial-gradient(circle, #93c5fd, #3b82f6); border-radius: 50%; animation: rise-bubble 1.3s ease-out infinite; }
        .particle-ice    { background: #67e8f9; clip-path: polygon(50% 0%, 55% 45%, 100% 50%, 55% 55%, 50% 100%, 45% 55%, 0% 50%, 45% 45%); animation: rise-snow 1.6s ease-out infinite; }
        .particle-psychic { background: radial-gradient(circle, #f9a8d4, #ec4899); border-radius: 50%; animation: rise-psychic 1.4s ease-out infinite; }
        .particle-ghost  { background: #6d28d9; border-radius: 50% 50% 40% 40%; animation: rise-ghost 1.8s ease-in-out infinite; }
        .particle-dragon { background: linear-gradient(135deg, #1d4ed8, #7c3aed); clip-path: polygon(50% 0%, 80% 30%, 100% 70%, 60% 100%, 40% 100%, 0% 70%, 20% 30%); animation: rise-spark 1.1s ease-out infinite; }
        .particle-poison { background: #a855f7; border-radius: 50%; animation: rise-bubble 1.2s ease-out infinite; }
        .particle-flying { background: rgba(129,140,248,0.8); clip-path: ellipse(50% 20% at 50% 50%); border-radius: 50%; animation: rise-leaf 2s ease-out infinite; }
        .particle-bug    { background: #84cc16; clip-path: ellipse(30% 50% at 50% 50%); animation: rise-leaf 1.7s ease-out infinite; }
        .particle-dark   { background: rgba(31,41,55,0.9); border-radius: 50%; animation: rise-ghost 2s ease-in-out infinite; }
        .particle-ground { background: #d97706; border-radius: 30%; animation: rise-ground 1s ease-out infinite; }
      `}</style>

      <div
        onClick={handleClick}
        style={{
          width: s.w, height: s.h,
          borderRadius: s.w * 0.06,
          background: cardBg,
          border: `2px solid ${card.isHolo ? rarityColor + 'bb' : typeColor + '88'}`,
          position: 'relative', overflow: 'visible', flexShrink: 0,
          cursor: onClick ? 'pointer' : 'default',
          userSelect: 'none',
          animation: clicking ? `tcg-click 0.6s ease-out` : permAnim,
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Clip inner content */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: s.w * 0.06, overflow: 'hidden', zIndex: 0 }}>
          {/* Holo shimmer overlay */}
          {card.isHolo && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%, rgba(255,255,255,0.08) 100%)',
              mixBlendMode: 'screen',
            }} />
          )}
          {/* Ultra holo extra shimmer */}
          {card.tcgRarity === 'ultra' && card.isHolo && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none',
              background: 'linear-gradient(45deg, rgba(255,0,128,0.12) 0%, rgba(128,0,255,0.12) 25%, rgba(0,128,255,0.12) 50%, rgba(0,255,128,0.12) 75%, rgba(255,128,0,0.12) 100%)',
              mixBlendMode: 'color',
            }} />
          )}
        </div>

        {/* Inner border */}
        <div style={{
          position: 'absolute', inset: s.w * 0.04, borderRadius: s.w * 0.04,
          border: `1px solid rgba(255,255,255,0.15)`, zIndex: 3, pointerEvents: 'none',
        }} />

        {/* Type particles — only on md/lg */}
        {size !== 'sm' && (
          <div style={{ position: 'absolute', inset: 0, borderRadius: s.w * 0.06, overflow: 'hidden', zIndex: 4, pointerEvents: 'none' }}>
            <TypeParticles primaryType={primaryType} w={s.w} tier={tier} />
          </div>
        )}

        {/* Favorite star */}
        {isFavorite && (
          <div style={{
            position: 'absolute', top: 3, left: 4, zIndex: 10,
            color: '#fbbf24', fontSize: s.subFont + 1, textShadow: '0 0 6px #fbbf24',
          }}>★</div>
        )}

        {/* Top: name + HP */}
        <div style={{
          position: 'relative', zIndex: 5,
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
          position: 'relative', zIndex: 5, flexShrink: 0,
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
          position: 'relative', zIndex: 5,
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

        {/* Moves — real text for md/lg, CSS fake for sm */}
        {size === 'sm' ? (
          <FakeAttacks typeColor={typeColor} typeColor2={typeColor2} subFont={s.subFont} />
        ) : moves.length > 0 && (
          <div style={{
            position: 'relative', zIndex: 5, flex: 1,
            display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly',
            padding: `4px ${s.w * 0.07}px`,
            borderTop: '1px solid rgba(255,255,255,0.1)',
            marginTop: 2,
          }}>
            {moves.map((mv, i) => (
              <div key={i} style={{
                display: 'flex', flexDirection: 'column', gap: 1,
                background: 'rgba(0,0,0,0.22)', borderRadius: s.w * 0.03,
                padding: `${s.w * 0.025}px ${s.w * 0.04}px`,
              }}>
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

        {/* Bottom: height/weight (left) + rarity (right) */}
        <div style={{
          position: 'absolute', bottom: s.w * 0.03, left: s.w * 0.05, right: s.w * 0.05,
          zIndex: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0 }}>
            {count !== undefined && count > 1 && (
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: s.subFont - 1, fontFamily: 'monospace', fontWeight: 700 }}>×{count}</span>
            )}
            {info && size !== 'sm' && (
              <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: s.subFont - 2, fontFamily: 'monospace' }}>
                {info.height}m · {info.weight}kg
              </span>
            )}
          </div>
          <span style={{
            color: card.isHolo ? rarityColor : `${rarityColor}cc`,
            fontSize: s.subFont - 1, fontFamily: 'monospace', fontWeight: 900,
            textShadow: card.isHolo ? `0 0 6px ${rarityColor}` : 'none',
          }}>
            {card.isHolo ? '✦ HOLO' : TCG_RARITY_LABEL[card.tcgRarity].split(' ')[0]}
          </span>
        </div>

        {/* Orbit stars — only on md/lg */}
        {size !== 'sm' && <OrbitStars w={s.w} h={s.h} tier={tier} rarityColor={rarityColor} />}
      </div>
    </>
  );
}
