import { useState } from 'react';
import type { TcgCardDef } from '../data/tcgData';
import { TCG_RARITY_COLOR, TCG_RARITY_LABEL, getTcgMoves, TCG_HP } from '../data/tcgData';
import { POKEMON_TYPE, TYPE_COLORS } from '../data/pokemonTypes';
import type { PokemonType } from '../data/pokemonTypes';
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
  if (card.tcgRarity === 'ultra') return 'tcg-ultra 2.5s ease-in-out infinite';
  if (card.tcgRarity === 'rare' && card.isHolo) return 'tcg-holo 3.5s ease-in-out infinite';
  return 'none';
}

// CSS fake attacks for sm size
function FakeAttacks({ typeColor, typeColor2, subFont }: { typeColor: string; typeColor2: string; subFont: number }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly',
      padding: '2px 6px', borderTop: '1px solid rgba(255,255,255,0.12)', marginTop: 2,
    }}>
      {[typeColor, typeColor2].map((c, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <div style={{ width: subFont - 1, height: subFont - 1, borderRadius: '50%', background: c, flexShrink: 0 }} />
            <div style={{ height: subFont - 2, flex: 1, background: 'rgba(255,255,255,0.55)', borderRadius: 2 }} />
            <div style={{ height: subFont - 2, width: subFont + 2, background: '#fbbf24', borderRadius: 2, flexShrink: 0 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, paddingLeft: subFont + 1 }}>
            <div style={{ height: subFont - 3, width: '85%', background: 'rgba(255,255,255,0.3)', borderRadius: 1 }} />
            <div style={{ height: subFont - 3, width: '60%', background: 'rgba(255,255,255,0.2)', borderRadius: 1 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Orbit stars — only for rare holo (not ultra holo, which has TypeOverlay instead)
function OrbitStars({ w, h, tier, rarityColor }: { w: number; h: number; tier: number; rarityColor: string }) {
  if (tier < 1 || tier > 2) return null; // only tier 1-2 (rare holo, ultra non-holo)
  const count = tier === 2 ? 8 : 5;
  const stars = Array.from({ length: count }, (_, i) => ({
    angle: (360 / count) * i,
    delay: (i / count) * -3,
    zFront: i % 2 === 0,
  }));
  return (
    <>
      {stars.map((s, i) => (
        <div key={i} style={{
          position: 'absolute', top: '50%', left: '50%',
          width: w * 0.07, height: w * 0.07,
          marginLeft: -(w * 0.035), marginTop: -(w * 0.035),
          zIndex: s.zFront ? 20 : 1, pointerEvents: 'none',
          animation: `orbit-star ${tier === 2 ? 3.5 : 5}s linear ${s.delay}s infinite`,
          '--orbit-rx': `${w * 0.62}px`,
          '--orbit-ry': `${h * 0.58}px`,
          '--orbit-start': `${s.angle}deg`,
        } as React.CSSProperties}>
          <div style={{
            width: '100%', height: '100%',
            background: rarityColor,
            clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
            filter: `drop-shadow(0 0 3px ${rarityColor})`,
            opacity: 0.8,
          }} />
        </div>
      ))}
    </>
  );
}

// Type particles — only for rare holo
function TypeParticles({ primaryType, w, tier }: { primaryType: string; w: number; tier: number }) {
  const TYPE_PARTICLE: Record<string, string> = {
    fire: 'particle-fire', water: 'particle-water', electric: 'particle-electric',
    grass: 'particle-grass', ice: 'particle-ice', psychic: 'particle-psychic',
    ghost: 'particle-ghost', dragon: 'particle-dragon', poison: 'particle-poison',
    flying: 'particle-flying', normal: '', fighting: '', ground: 'particle-ground',
    rock: '', bug: 'particle-bug', steel: '', dark: 'particle-dark',
  };
  if (tier < 1 || tier > 2) return null;
  const particleClass = TYPE_PARTICLE[primaryType];
  if (!particleClass) return null;
  const count = tier >= 2 ? 8 : 5;
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={particleClass} style={{
          position: 'absolute', bottom: 0, left: `${10 + (i / count) * 80}%`,
          zIndex: 15, pointerEvents: 'none',
          animationDelay: `${(i / count) * -2}s`,
          width: w * 0.06, height: w * 0.06,
        } as React.CSSProperties} />
      ))}
    </>
  );
}

// Type-specific overlay effects for ultra holo cards (md/lg only)
function TypeOverlay({ type, w, h }: { type: string; w: number; h: number }) {
  const count = 6;
  const items = Array.from({ length: count }, (_, i) => i);

  if (type === 'grass') {
    return <>
      {items.map(i => (
        <div key={i} className="overlay-leaf" style={{
          position: 'absolute', top: '-10%',
          left: `${8 + i * 15}%`,
          width: w * 0.07, height: w * 0.1,
          background: '#22c55e',
          clipPath: 'ellipse(40% 50% at 50% 50%)',
          zIndex: 12, pointerEvents: 'none',
          animationDelay: `${(i / count) * -3}s`,
          opacity: 0.7,
        }} />
      ))}
    </>;
  }
  if (type === 'fire') {
    return <>
      {items.map(i => (
        <div key={i} className="overlay-flame" style={{
          position: 'absolute', bottom: '5%',
          left: `${8 + i * 15}%`,
          width: w * 0.07, height: w * 0.12,
          background: 'radial-gradient(ellipse at bottom, #fbbf24 0%, #ef4444 60%, transparent 100%)',
          borderRadius: '50% 50% 30% 30%',
          zIndex: 12, pointerEvents: 'none',
          animationDelay: `${(i / count) * -1.5}s`,
          opacity: 0.65,
        }} />
      ))}
    </>;
  }
  if (type === 'water') {
    return <>
      {items.map(i => (
        <div key={i} className="overlay-bubble" style={{
          position: 'absolute', bottom: '5%',
          left: `${8 + i * 15}%`,
          width: w * 0.06, height: w * 0.06,
          background: 'radial-gradient(circle, rgba(147,197,253,0.8) 0%, rgba(59,130,246,0.4) 60%, transparent 100%)',
          border: '1px solid rgba(147,197,253,0.6)',
          borderRadius: '50%',
          zIndex: 12, pointerEvents: 'none',
          animationDelay: `${(i / count) * -2}s`,
        }} />
      ))}
    </>;
  }
  if (type === 'psychic') {
    return <>
      {[0, 1, 2].map(i => (
        <div key={i} className="overlay-psy-ring" style={{
          position: 'absolute',
          top: '50%', left: '50%',
          width: w * (0.3 + i * 0.25), height: h * (0.2 + i * 0.15),
          marginLeft: -(w * (0.15 + i * 0.125)), marginTop: -(h * (0.1 + i * 0.075)),
          border: '1.5px solid rgba(236,72,153,0.5)',
          borderRadius: '50%',
          zIndex: 12, pointerEvents: 'none',
          animationDelay: `${i * -0.5}s`,
        }} />
      ))}
    </>;
  }
  if (type === 'fighting') {
    return <>
      {[0, 1, 2].map(i => (
        <div key={i} className="overlay-punch" style={{
          position: 'absolute',
          top: `${25 + i * 20}%`, left: `${15 + i * 25}%`,
          color: '#b45309', fontSize: w * 0.15,
          zIndex: 12, pointerEvents: 'none',
          animationDelay: `${i * -0.7}s`,
          userSelect: 'none',
        }}>✊</div>
      ))}
    </>;
  }
  if (type === 'electric') {
    return <>
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="overlay-bolt" style={{
          position: 'absolute',
          top: `${10 + i * 20}%`, left: `${10 + i * 22}%`,
          color: '#fbbf24', fontSize: w * 0.14,
          zIndex: 12, pointerEvents: 'none',
          animationDelay: `${i * -0.4}s`,
          userSelect: 'none',
          filter: 'drop-shadow(0 0 4px #fbbf24)',
        }}>⚡</div>
      ))}
    </>;
  }
  if (type === 'rock') {
    return <>
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="overlay-mountain" style={{
          position: 'absolute', bottom: 0,
          left: `${5 + i * 23}%`,
          width: 0, height: 0,
          borderLeft: `${w * 0.08}px solid transparent`,
          borderRight: `${w * 0.08}px solid transparent`,
          borderBottom: `${w * 0.14}px solid rgba(120,113,108,0.6)`,
          zIndex: 12, pointerEvents: 'none',
          animationDelay: `${i * -0.5}s`,
        }} />
      ))}
    </>;
  }
  if (type === 'dragon') {
    return <>
      {[0, 1].map(i => (
        <div key={i} className="overlay-dragon" style={{
          position: 'absolute',
          top: `${20 + i * 40}%`,
          color: '#7c3aed', fontSize: w * 0.18,
          zIndex: 12, pointerEvents: 'none',
          animationDelay: `${i * -1.5}s`,
          userSelect: 'none',
          filter: 'drop-shadow(0 0 4px #7c3aed)',
        }}>🐉</div>
      ))}
    </>;
  }
  if (type === 'normal') {
    return <>
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i} className="overlay-sparkle" style={{
          position: 'absolute',
          top: `${15 + i * 15}%`, left: `${10 + i * 18}%`,
          color: 'rgba(255,255,255,0.8)', fontSize: w * 0.1,
          zIndex: 12, pointerEvents: 'none',
          animationDelay: `${i * -0.4}s`,
          userSelect: 'none',
        }}>✦</div>
      ))}
    </>;
  }
  return null;
}

// Golden orbit stars for shiny cards (orbit around sprite area)
function ShinyStars({ w, spriteY, spriteSize }: { w: number; spriteY: number; spriteSize: number }) {
  const count = 6;
  const rx = spriteSize * 0.65;
  const ry = spriteSize * 0.55;
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{
          position: 'absolute',
          top: spriteY + spriteSize * 0.5, left: w * 0.5,
          width: w * 0.06, height: w * 0.06,
          marginLeft: -(w * 0.03), marginTop: -(w * 0.03),
          zIndex: 22, pointerEvents: 'none',
          animation: `shiny-orbit 2s linear ${(i / count) * -2}s infinite`,
          '--shiny-rx': `${rx}px`,
          '--shiny-ry': `${ry}px`,
          '--shiny-start': `${(360 / count) * i}deg`,
        } as React.CSSProperties}>
          <div style={{
            width: '100%', height: '100%',
            background: '#fbbf24',
            clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
            filter: 'drop-shadow(0 0 4px #fbbf24)',
          }} />
        </div>
      ))}
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
  const hp = TCG_HP[card.pokemonId] ?? 50;
  const moves = s.showMoves ? getTcgMoves(card.pokemonId) : [];
  const clickColor = TYPE_ANIM_COLOR[primaryType] ?? '#ffffff';
  const permAnim = getPermanentAnimation(card);
  const tier = getRarityTier(card);
  const info = POKEMON_INFO[card.pokemonId];
  const isUltraHolo = card.tcgRarity === 'ultra' && card.isHolo;

  // Vertical position of sprite area top (approx: name bar + padding)
  const spriteAreaTop = s.w * 0.05 + s.font + s.w * 0.01 + 4;

  function handleClick() {
    if (!onClick && !clicking) return;
    setClicking(true);
    setTimeout(() => setClicking(false), 600);
    onClick?.();
  }

  const cardBg = card.isHolo
    ? (card.isShiny
        ? `linear-gradient(135deg, #fbbf2488 0%, ${typeColor}88 40%, #fbbf2488 100%)`
        : `linear-gradient(135deg, ${typeColor}cc 0%, ${typeColor2}88 50%, ${typeColor}cc 100%)`)
    : `linear-gradient(160deg, ${typeColor}88 0%, #1e293b 65%, ${typeColor2}33 100%)`;

  return (
    <>
      <style>{`
        @keyframes tcg-holo {
          0%, 100% { box-shadow: 0 0 8px ${rarityColor}66, inset 0 0 8px ${rarityColor}22; }
          50%       { box-shadow: 0 0 20px ${rarityColor}bb, 0 0 40px ${rarityColor}44, inset 0 0 15px ${rarityColor}33; }
        }
        @keyframes holo-sheen {
          0%   { transform: translateX(-150%); opacity: 0; }
          15%  { opacity: 0.7; }
          85%  { opacity: 0.7; }
          100% { transform: translateX(450%); opacity: 0; }
        }
        @keyframes tcg-ultra {
          0%, 100% { box-shadow: 0 0 10px ${typeColor}88; filter: brightness(1); }
          50%       { box-shadow: 0 0 25px ${typeColor}cc, 0 0 50px ${typeColor}44; filter: brightness(1.1); }
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
          from { transform: rotate(var(--orbit-start)) translateX(var(--orbit-rx)) rotate(calc(-1 * var(--orbit-start))); }
          to   { transform: rotate(calc(var(--orbit-start) + 360deg)) translateX(var(--orbit-rx)) rotate(calc(-1 * (var(--orbit-start) + 360deg))); }
        }
        @keyframes shiny-orbit {
          from { transform: rotate(var(--shiny-start)) translateX(var(--shiny-rx)) rotate(calc(-1 * var(--shiny-start))); }
          to   { transform: rotate(calc(var(--shiny-start) + 360deg)) translateX(var(--shiny-rx)) rotate(calc(-1 * (var(--shiny-start) + 360deg))); }
        }
        @keyframes ultra-holo-border {
          0%   { border-color: hsl(0, 100%, 65%);   box-shadow: 0 0 6px hsl(0, 100%, 65%); }
          16%  { border-color: hsl(60, 100%, 65%);  box-shadow: 0 0 6px hsl(60, 100%, 65%); }
          33%  { border-color: hsl(120, 100%, 65%); box-shadow: 0 0 6px hsl(120, 100%, 65%); }
          50%  { border-color: hsl(180, 100%, 65%); box-shadow: 0 0 6px hsl(180, 100%, 65%); }
          66%  { border-color: hsl(240, 100%, 65%); box-shadow: 0 0 6px hsl(240, 100%, 65%); }
          83%  { border-color: hsl(300, 100%, 65%); box-shadow: 0 0 6px hsl(300, 100%, 65%); }
          100% { border-color: hsl(360, 100%, 65%); box-shadow: 0 0 6px hsl(360, 100%, 65%); }
        }
        /* Type overlay animations */
        @keyframes overlay-leaf-fall {
          0%   { transform: translateY(-10%) rotate(0deg); opacity: 0.7; }
          100% { transform: translateY(120%) rotate(180deg); opacity: 0; }
        }
        @keyframes overlay-flame-rise {
          0%   { transform: translateY(0) scaleY(1); opacity: 0.65; }
          100% { transform: translateY(-80%) scaleY(0.3); opacity: 0; }
        }
        @keyframes overlay-bubble-rise {
          0%   { transform: translateY(0) scale(1); opacity: 0.7; }
          100% { transform: translateY(-100%) scale(1.3); opacity: 0; }
        }
        @keyframes overlay-psy-pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
          50%       { transform: translate(-50%, -50%) scale(1.2); opacity: 0; }
        }
        @keyframes overlay-punch-fade {
          0%, 30% { opacity: 0; transform: scale(0.7); }
          50%      { opacity: 0.7; transform: scale(1); }
          80%,100% { opacity: 0; transform: scale(1.1); }
        }
        @keyframes overlay-bolt-flash {
          0%, 30% { opacity: 0; }
          35%      { opacity: 0.9; }
          50%,100% { opacity: 0; }
        }
        @keyframes overlay-mountain-rise {
          0%   { transform: scaleY(0); opacity: 0; transform-origin: bottom; }
          40%  { transform: scaleY(1); opacity: 0.6; transform-origin: bottom; }
          80%  { transform: scaleY(1); opacity: 0.6; transform-origin: bottom; }
          100% { transform: scaleY(0); opacity: 0; transform-origin: bottom; }
        }
        @keyframes overlay-dragon-wander {
          0%   { transform: translateX(-20%); opacity: 0; }
          20%  { opacity: 0.7; }
          80%  { opacity: 0.7; }
          100% { transform: translateX(110%); opacity: 0; }
        }
        @keyframes overlay-sparkle-twinkle {
          0%, 100% { opacity: 0; transform: scale(0.5); }
          50%       { opacity: 0.8; transform: scale(1); }
        }
        .overlay-leaf      { animation: overlay-leaf-fall 2.5s ease-in infinite; }
        .overlay-flame     { animation: overlay-flame-rise 1.2s ease-out infinite; }
        .overlay-bubble    { animation: overlay-bubble-rise 1.5s ease-in infinite; }
        .overlay-psy-ring  { animation: overlay-psy-pulse 1.8s ease-in-out infinite; position: absolute !important; }
        .overlay-punch     { animation: overlay-punch-fade 1.5s ease-in-out infinite; }
        .overlay-bolt      { animation: overlay-bolt-flash 0.8s ease-out infinite; }
        .overlay-mountain  { animation: overlay-mountain-rise 2s ease-in-out infinite; }
        .overlay-dragon    { animation: overlay-dragon-wander 3s linear infinite; }
        .overlay-sparkle   { animation: overlay-sparkle-twinkle 1s ease-in-out infinite; }
        /* Rare holo type particles */
        @keyframes rise-fire   { 0% { transform: translateY(0) scale(1); opacity: 0.9; } 100% { transform: translateY(-60px) scale(0.3); opacity: 0; } }
        @keyframes rise-leaf   { 0% { transform: translateY(0) rotate(0deg); opacity: 0.8; } 100% { transform: translateY(-55px) rotate(180deg); opacity: 0; } }
        @keyframes rise-spark  { 0% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(-50px); opacity: 0; } }
        @keyframes rise-drop   { 0% { transform: translateY(0); opacity: 0.8; } 100% { transform: translateY(-45px); opacity: 0; } }
        @keyframes rise-snow   { 0% { transform: translateY(0) rotate(0deg); opacity: 0.9; } 100% { transform: translateY(-50px) rotate(90deg); opacity: 0; } }
        @keyframes rise-psychic { 0% { transform: scale(0.5); opacity: 0.8; } 100% { transform: scale(1.5) translateY(-40px); opacity: 0; } }
        @keyframes rise-ghost  { 0% { transform: translateY(0); opacity: 0.7; } 100% { transform: translateY(-55px); opacity: 0; } }
        @keyframes rise-bubble { 0% { transform: translateY(0) scale(1); opacity: 0.8; } 100% { transform: translateY(-50px) scale(1.4); opacity: 0; } }
        @keyframes rise-ground { 0% { transform: translateY(0) scale(1); opacity: 0.8; } 100% { transform: translateY(-35px) scale(0.5); opacity: 0; } }
        .particle-fire     { background: radial-gradient(circle, #fbbf24, #ef4444); border-radius: 50% 50% 30% 30%; animation: rise-fire 1.2s ease-out infinite; }
        .particle-grass    { background: #22c55e; clip-path: ellipse(30% 50% at 50% 50%); animation: rise-leaf 1.5s ease-out infinite; }
        .particle-electric { background: #fbbf24; clip-path: polygon(50% 0%,60% 40%,100% 38%,65% 60%,79% 100%,50% 70%,21% 100%,35% 60%,0% 38%,40% 40%); animation: rise-spark 0.9s ease-out infinite; }
        .particle-water    { background: radial-gradient(circle, #93c5fd, #3b82f6); border-radius: 50%; animation: rise-bubble 1.3s ease-out infinite; }
        .particle-ice      { background: #67e8f9; clip-path: polygon(50% 0%,55% 45%,100% 50%,55% 55%,50% 100%,45% 55%,0% 50%,45% 45%); animation: rise-snow 1.6s ease-out infinite; }
        .particle-psychic  { background: radial-gradient(circle, #f9a8d4, #ec4899); border-radius: 50%; animation: rise-psychic 1.4s ease-out infinite; }
        .particle-ghost    { background: #6d28d9; border-radius: 50% 50% 40% 40%; animation: rise-ghost 1.8s ease-in-out infinite; }
        .particle-dragon   { background: linear-gradient(135deg,#1d4ed8,#7c3aed); clip-path: polygon(50% 0%,80% 30%,100% 70%,60% 100%,40% 100%,0% 70%,20% 30%); animation: rise-spark 1.1s ease-out infinite; }
        .particle-poison   { background: #a855f7; border-radius: 50%; animation: rise-bubble 1.2s ease-out infinite; }
        .particle-flying   { background: rgba(129,140,248,0.8); clip-path: ellipse(50% 20% at 50% 50%); animation: rise-leaf 2s ease-out infinite; }
        .particle-bug      { background: #84cc16; clip-path: ellipse(30% 50% at 50% 50%); animation: rise-leaf 1.7s ease-out infinite; }
        .particle-dark     { background: rgba(31,41,55,0.9); border-radius: 50%; animation: rise-ghost 2s ease-in-out infinite; }
        .particle-ground   { background: #d97706; border-radius: 30%; animation: rise-ground 1s ease-out infinite; }
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
        {/* Clipped inner layer */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: s.w * 0.06, overflow: 'hidden', zIndex: 0 }}>
          {/* Horizontal sheen sweep on holo cards */}
          {card.isHolo && (
            <div style={{
              position: 'absolute', top: 0, bottom: 0, left: 0,
              width: '30%', zIndex: 8, pointerEvents: 'none',
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)',
              animation: 'holo-sheen 3s ease-in-out infinite',
            }} />
          )}
          {/* Ultra holo extra shimmer */}
          {isUltraHolo && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none',
              background: 'linear-gradient(45deg, rgba(255,0,128,0.08) 0%, rgba(128,0,255,0.08) 25%, rgba(0,128,255,0.08) 50%, rgba(0,255,128,0.08) 75%, rgba(255,128,0,0.08) 100%)',
              mixBlendMode: 'color',
            }} />
          )}
        </div>

        {/* Color-cycling border for ultra holo */}
        {isUltraHolo && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: s.w * 0.06,
            border: '2px solid transparent',
            animation: 'ultra-holo-border 4s linear infinite',
            zIndex: 25, pointerEvents: 'none',
          }} />
        )}

        {/* Inner border */}
        <div style={{
          position: 'absolute', inset: s.w * 0.04, borderRadius: s.w * 0.04,
          border: '1px solid rgba(255,255,255,0.15)', zIndex: 3, pointerEvents: 'none',
        }} />

        {/* Type particles for rare holo — only on md/lg, not ultra holo */}
        {size !== 'sm' && !isUltraHolo && (
          <div style={{ position: 'absolute', inset: 0, borderRadius: s.w * 0.06, overflow: 'hidden', zIndex: 4, pointerEvents: 'none' }}>
            <TypeParticles primaryType={primaryType} w={s.w} tier={tier} />
          </div>
        )}

        {/* Type overlay for ultra holo — only on md/lg */}
        {size !== 'sm' && isUltraHolo && (
          <div style={{ position: 'absolute', inset: 0, borderRadius: s.w * 0.06, overflow: 'hidden', zIndex: 13, pointerEvents: 'none' }}>
            <TypeOverlay type={primaryType} w={s.w} h={s.h} />
          </div>
        )}

        {/* Favorite star */}
        {isFavorite && (
          <div style={{
            position: 'absolute', top: size === 'sm' ? 2 : 3, left: size === 'sm' ? 3 : 4, zIndex: 10,
            color: '#fbbf24', fontSize: size === 'sm' ? s.font + 2 : s.subFont + 1, textShadow: '0 0 6px #fbbf24, 0 0 12px #fbbf24',
          }}>★</div>
        )}

        {/* Shiny badge */}
        {card.isShiny && (
          <div style={{
            position: 'absolute', top: size === 'sm' ? 2 : 3, right: size === 'sm' ? 3 : 4, zIndex: 10,
            color: '#fbbf24', fontSize: size === 'sm' ? s.font : s.subFont, textShadow: '0 0 6px #fbbf24',
          }}>✨</div>
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
            src={card.isShiny
              ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${card.pokemonId}.png`
              : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${card.pokemonId}.png`}
            style={{ width: s.sprite, height: s.sprite, imageRendering: 'pixelated' }}
            alt={card.pokemonName}
          />
          <span style={{ position: 'absolute', bottom: 2, right: 5, color: 'rgba(255,255,255,0.4)', fontSize: s.subFont - 1, fontFamily: 'monospace' }}>
            #{String(card.pokemonId).padStart(3, '0')}
          </span>
        </div>

        {/* Shiny orbit stars around sprite */}
        {card.isShiny && (
          <ShinyStars w={s.w} spriteY={spriteAreaTop} spriteSize={s.sprite} />
        )}

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

        {/* Moves */}
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
            {card.isShiny ? '✨ SHINY' : card.isHolo ? '✦ HOLO' : TCG_RARITY_LABEL[card.tcgRarity].split(' ')[0]}
          </span>
        </div>

        {/* Orbit stars — only for rare holo (not ultra holo), only on md/lg */}
        {size !== 'sm' && <OrbitStars w={s.w} h={s.h} tier={tier} rarityColor={rarityColor} />}
      </div>
    </>
  );
}
