import { useMemo } from 'react';

interface Props {
  zoneId: string;
}

// Leaves for forest zones
const LEAVES = Array.from({ length: 14 }, (_, i) => ({
  x: (i * 73.4 + 5) % 95,
  delay: (i * 0.7) % 6,
  duration: 6 + (i % 5) * 1.5,
  leafX: ((i * 37) % 80) - 40,
  leafRot: 180 + (i % 3) * 120,
  size: 6 + (i % 4) * 3,
  color: i % 3 === 0 ? '#4ade80' : i % 3 === 1 ? '#86efac' : '#bbf7d0',
}));

// Fireflies
const FIREFLIES = Array.from({ length: 18 }, (_, i) => ({
  x: (i * 73.4 + 5) % 90,
  y: (i * 53.7 + 10) % 70,
  fx: ((i * 37.1) % 80) - 40,
  fy: ((i * 29.3) % 60) - 30,
  duration: 4 + (i % 6) * 1.5,
  delay: (i % 7) * 0.8,
}));

// Bubbles for ocean
const BUBBLES = Array.from({ length: 16 }, (_, i) => ({
  x: (i * 43.7 + 3) % 95,
  y: 60 + (i % 4) * 10,
  size: 4 + (i % 5) * 4,
  delay: (i * 0.9) % 4,
  duration: 3 + (i % 4) * 1.2,
}));

// Sparks for electric zone
const SPARKS = Array.from({ length: 10 }, (_, i) => ({
  x: 5 + (i * 89.7) % 90,
  y: 10 + (i * 47.3) % 60,
  delay: (i * 0.4) % 3,
}));

// Ghost wisps
const WISPS = Array.from({ length: 6 }, (_, i) => ({
  x: 10 + (i * 67.3) % 80,
  y: 15 + (i * 43.1) % 55,
  gx: ((i * 53) % 60) - 30,
  gx2: ((i * 37) % 40) - 20,
  duration: 6 + (i % 4) * 2,
  delay: (i * 1.1) % 5,
}));

// Lava bubbles
const LAVA_BUBBLES = Array.from({ length: 10 }, (_, i) => ({
  x: 5 + (i * 79.3) % 88,
  size: 6 + (i % 4) * 5,
  delay: (i * 0.6) % 3.5,
  duration: 2.5 + (i % 3) * 1,
}));

// Stars for night/space zones
const STARS = Array.from({ length: 120 }, (_, i) => ({
  x: (i * 137.508) % 100,
  y: (i * 97.3) % 100,
  size: 0.5 + (i % 7) * 0.35,
  opacity: 0.15 + (i % 10) * 0.08,
  delay: (i % 7) * 0.9,
  duration: 1.5 + (i % 8) * 0.6,
}));

// Ground flowers for zone4 — scattered at multiple heights
const GROUND_FLOWERS = Array.from({ length: 32 }, (_, i) => ({
  x: (i * 31.7 + 3) % 96,
  // Spread flowers from 10% to 80% from bottom (5 different heights)
  bottomPct: 10 + ((i * 13 + 7) % 70),
  size: 8 + (i % 4) * 4,
  color: ['#f9a8d4', '#fbcfe8', '#fde68a', '#bbf7d0', '#c4b5fd', '#fca5a5', '#a5f3fc', '#fef08a'][i % 8],
  delay: (i * 0.3) % 3,
}));


const ZONE_CONFIGS: Record<string, {
  sky: string;
  particles: 'leaves' | 'leaves_flowers' | 'fireflies' | 'bubbles' | 'sparks' | 'electric' | 'wisps' | 'indoor' | 'lava' | 'stars' | 'none';
  fog?: string;
  ambientLight?: string;
}> = {
  zone1: {
    sky: 'linear-gradient(180deg, #5cb8e8 0%, #82cfed 30%, #a8e0f0 55%, #c5eed8 75%, #8ac96a 100%)',
    particles: 'none',
    fog: undefined,
    ambientLight: undefined,
  },
  zone2: {
    sky: 'linear-gradient(180deg, #062040 0%, #0a3060 30%, #0d4070 55%, #0a2848 80%, #061828 100%)',
    particles: 'bubbles',
    fog: 'radial-gradient(ellipse 100% 40% at 50% 80%, rgba(10,40,80,0.6) 0%, transparent 100%)',
    ambientLight: 'radial-gradient(ellipse 70% 30% at 30% 30%, rgba(40,120,200,0.1) 0%, transparent 100%)',
  },
  zone3: {
    sky: 'linear-gradient(180deg, #1e1c0a 0%, #161408 45%, #0e0c06 80%, #080808 100%)',
    particles: 'none',
    fog: 'radial-gradient(ellipse 100% 30% at 50% 100%, rgba(80,70,10,0.1) 0%, transparent 100%)',
    ambientLight: undefined,
  },
  zone4: {
    sky: 'linear-gradient(180deg, #6ec8e0 0%, #9adbc0 40%, #b8e8a0 70%, #7ac855 100%)',
    particles: 'leaves_flowers',
    fog: 'radial-gradient(ellipse 90% 50% at 50% 60%, rgba(30,70,30,0.4) 0%, transparent 100%)',
    ambientLight: 'radial-gradient(ellipse 50% 30% at 40% 20%, rgba(200,255,100,0.06) 0%, transparent 100%)',
  },
  zone5: {
    sky: 'linear-gradient(180deg, #050510 0%, #0d0520 30%, #150d30 60%, #0a0818 100%)',
    particles: 'wisps',
    fog: 'radial-gradient(ellipse 80% 50% at 50% 50%, rgba(30,10,60,0.5) 0%, transparent 100%)',
    ambientLight: 'radial-gradient(ellipse 60% 40% at 60% 30%, rgba(120,50,200,0.08) 0%, transparent 100%)',
  },
  zone6: {
    sky: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 40%, #0f3460 80%, #0a0a1a 100%)',
    particles: 'indoor',
    fog: 'radial-gradient(ellipse 80% 30% at 50% 100%, rgba(30,60,120,0.25) 0%, transparent 100%)',
    ambientLight: 'radial-gradient(ellipse 60% 40% at 50% 30%, rgba(100,150,255,0.05) 0%, transparent 100%)',
  },
  zone7: {
    sky: 'linear-gradient(180deg, #1a0500 0%, #300a00 30%, #451200 55%, #2a0800 100%)',
    particles: 'lava',
    fog: 'radial-gradient(ellipse 90% 50% at 50% 80%, rgba(80,20,0,0.6) 0%, transparent 100%)',
    ambientLight: 'radial-gradient(ellipse 60% 40% at 50% 20%, rgba(255,80,0,0.1) 0%, transparent 100%)',
  },
  zone8: {
    sky: 'linear-gradient(180deg, #0a0d10 0%, #121820 30%, #181e24 60%, #0a0d10 100%)',
    particles: 'none',
    fog: 'radial-gradient(ellipse 100% 40% at 50% 80%, rgba(10,12,16,0.7) 0%, transparent 100%)',
    ambientLight: 'radial-gradient(ellipse 60% 40% at 50% 30%, rgba(150,160,180,0.04) 0%, transparent 100%)',
  },
  ligue: {
    sky: 'linear-gradient(180deg, #000008 0%, #080818 35%, #0a0820 65%, #050510 100%)',
    particles: 'stars',
    fog: 'radial-gradient(ellipse 80% 40% at 50% 50%, rgba(20,10,60,0.5) 0%, transparent 100%)',
    ambientLight: 'radial-gradient(ellipse 50% 30% at 50% 20%, rgba(200,150,255,0.1) 0%, transparent 100%)',
  },
  zone_libre: {
    sky: 'linear-gradient(180deg, #050010 0%, #100530 30%, #180a40 55%, #0a0520 100%)',
    particles: 'stars',
    fog: 'radial-gradient(ellipse 80% 40% at 50% 50%, rgba(40,10,80,0.5) 0%, transparent 100%)',
    ambientLight: 'radial-gradient(ellipse 60% 35% at 40% 20%, rgba(150,50,255,0.1) 0%, transparent 100%)',
  },
};

const ZONES_WITH_WALLPAPER = new Set(['zone1','zone2','zone3','zone4','zone5','zone6','zone7','zone8']);

export function ZoneBackground({ zoneId }: Props) {
  const cfg = ZONE_CONFIGS[zoneId] ?? ZONE_CONFIGS['zone1'];
  const hasWallpaper = ZONES_WITH_WALLPAPER.has(zoneId);

  const starsEls = useMemo(() => STARS.map((star, i) => (
    <div key={i} className="star" style={{
      left: `${star.x}%`, top: `${star.y}%`,
      width: `${star.size}px`, height: `${star.size}px`,
      '--base-opacity': star.opacity,
      '--tw-duration': `${star.duration}s`,
      '--tw-delay': `${star.delay}s`,
    } as React.CSSProperties} />
  )), []);

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: hasWallpaper ? '#000' : cfg.sky }}>

      {/* ── Wallpaper photo (zones 1-8) ── */}
      {hasWallpaper && (
        <picture style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          <source media="(min-width: 768px)" srcSet={`/wlppzones/${zoneId}pc.jpg`} />
          <img src={`/wlppzones/${zoneId}.jpg`} alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
        </picture>
      )}

      {/* ── Vignette breathing (all zones) ── */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 90% 90% at 50% 50%, transparent 40%, rgba(0,0,0,0.55) 100%)',
        animation: 'vignette-breathe 4s ease-in-out infinite',
      }} />

      {/* ── Fog overlay ── */}
      {cfg.fog && <div className="absolute inset-0 pointer-events-none" style={{ background: cfg.fog }} />}
      {cfg.ambientLight && <div className="absolute inset-0 pointer-events-none" style={{ background: cfg.ambientLight }} />}

      {/* ══════════════════════════════════════════════════════
          ZONE 1 — Forêt de Pallet
          Mobile: sun ~50% 9%, clouds in top 35%
          PC: sun ~50% 9%, lake bottom-right, buildings left
      ══════════════════════════════════════════════════════ */}
      {zoneId === 'zone1' && (
        <>
          {/* Sun glow pulse */}
          {/* Mobile sun position */}
          <div className="absolute pointer-events-none md:hidden" style={{
            left: '42%', top: '5%', width: 90, height: 90,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,230,100,0.35) 0%, rgba(255,180,0,0.1) 60%, transparent 100%)',
            animation: 'sun-ray-pulse 3s ease-in-out infinite',
          }} />
          {/* PC sun position */}
          <div className="absolute pointer-events-none hidden md:block" style={{
            left: '46%', top: '3%', width: 120, height: 120,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,230,100,0.3) 0%, rgba(255,180,0,0.08) 60%, transparent 100%)',
            animation: 'sun-ray-pulse 3.5s ease-in-out infinite',
          }} />
          {/* Drifting clouds — mobile */}
          {[
            { top: '8%', startX: '-180px', dur: '55s', delay: '0s', w: 110, h: 30 },
            { top: '16%', startX: '-140px', dur: '75s', delay: '-25s', w: 85, h: 24 },
            { top: '24%', startX: '-120px', dur: '65s', delay: '-40s', w: 100, h: 26 },
          ].map((c, i) => (
            <div key={`c1m${i}`} className="absolute pointer-events-none md:hidden" style={{
              top: c.top, left: c.startX, width: c.w, height: c.h,
              background: 'rgba(255,255,255,0.75)',
              borderRadius: '50px',
              animation: `cloud-drift-slow ${c.dur} linear infinite`,
              animationDelay: c.delay,
            }} />
          ))}
          {/* Drifting clouds — PC */}
          {[
            { top: '6%', startX: '-200px', dur: '80s', delay: '0s', w: 160, h: 36 },
            { top: '12%', startX: '-160px', dur: '100s', delay: '-35s', w: 120, h: 28 },
            { top: '20%', startX: '-140px', dur: '90s', delay: '-60s', w: 140, h: 30 },
          ].map((c, i) => (
            <div key={`c1p${i}`} className="absolute pointer-events-none hidden md:block" style={{
              top: c.top, left: c.startX, width: c.w, height: c.h,
              background: 'rgba(255,255,255,0.7)',
              borderRadius: '60px',
              animation: `cloud-drift-slow ${c.dur} linear infinite`,
              animationDelay: c.delay,
            }} />
          ))}
        </>
      )}

      {/* ══════════════════════════════════════════════════════
          ZONE 2 — Bords de Mer (underwater)
          Mobile: 2 bubble streams at ~30% and ~62% left, starting ~38% top
          PC: bubble streams at ~37% and ~52% left, starting ~28% top
      ══════════════════════════════════════════════════════ */}
      {zoneId === 'zone2' && (
        <>
          {/* Light rays from surface */}
          {[20, 38, 55, 72].map((x, i) => (
            <div key={`ray2${i}`} className="absolute pointer-events-none" style={{
              left: `${x}%`, top: 0,
              width: `${3 + i % 2}%`, height: '50%',
              background: 'linear-gradient(to bottom, rgba(120,210,255,0.15) 0%, transparent 100%)',
              transform: `rotate(${(i - 1.5) * 3}deg)`,
              transformOrigin: 'top center',
              animation: `sway ${4 + i * 0.9}s ease-in-out infinite`,
              animationDelay: `${i * 0.7}s`,
            }} />
          ))}
          {/* Bubble stream 1 — mobile: 30% left */}
          {Array.from({ length: 6 }, (_, i) => (
            <div key={`b2m1_${i}`} className="absolute pointer-events-none rounded-full border border-cyan-200/50 md:hidden" style={{
              left: `${28 + (i % 3) * 1.5}%`,
              top: `${38 + (i % 4) * 4}%`,
              width: 4 + (i % 3) * 2, height: 4 + (i % 3) * 2,
              background: 'radial-gradient(circle at 30% 30%, rgba(180,240,255,0.5), transparent)',
              '--by': `-${90 + i * 15}px`,
              '--bx': `${(i % 2 === 0 ? 1 : -1) * (3 + i * 2)}px`,
              animation: `bubble-stream ${2.5 + i * 0.6}s ease-out infinite`,
              animationDelay: `${i * 0.5}s`,
            } as React.CSSProperties} />
          ))}
          {/* Bubble stream 2 — mobile: 62% left */}
          {Array.from({ length: 6 }, (_, i) => (
            <div key={`b2m2_${i}`} className="absolute pointer-events-none rounded-full border border-cyan-200/50 md:hidden" style={{
              left: `${60 + (i % 3) * 1.5}%`,
              top: `${35 + (i % 4) * 4}%`,
              width: 3 + (i % 3) * 2, height: 3 + (i % 3) * 2,
              background: 'radial-gradient(circle at 30% 30%, rgba(180,240,255,0.5), transparent)',
              '--by': `-${80 + i * 12}px`,
              '--bx': `${(i % 2 === 0 ? 1 : -1) * (2 + i * 2)}px`,
              animation: `bubble-stream ${2.8 + i * 0.5}s ease-out infinite`,
              animationDelay: `${i * 0.4 + 0.3}s`,
            } as React.CSSProperties} />
          ))}
          {/* Bubble stream 1 — PC: 37% left */}
          {Array.from({ length: 6 }, (_, i) => (
            <div key={`b2p1_${i}`} className="absolute pointer-events-none rounded-full border border-cyan-200/50 hidden md:block" style={{
              left: `${35 + (i % 3) * 1.5}%`,
              top: `${28 + (i % 4) * 5}%`,
              width: 5 + (i % 3) * 2, height: 5 + (i % 3) * 2,
              background: 'radial-gradient(circle at 30% 30%, rgba(180,240,255,0.5), transparent)',
              '--by': `-${100 + i * 15}px`,
              '--bx': `${(i % 2 === 0 ? 1 : -1) * (3 + i * 2)}px`,
              animation: `bubble-stream ${2.5 + i * 0.6}s ease-out infinite`,
              animationDelay: `${i * 0.5}s`,
            } as React.CSSProperties} />
          ))}
          {/* Bubble stream 2 — PC: 52% left */}
          {Array.from({ length: 6 }, (_, i) => (
            <div key={`b2p2_${i}`} className="absolute pointer-events-none rounded-full border border-cyan-200/50 hidden md:block" style={{
              left: `${50 + (i % 3) * 1.5}%`,
              top: `${25 + (i % 4) * 5}%`,
              width: 4 + (i % 3) * 2, height: 4 + (i % 3) * 2,
              background: 'radial-gradient(circle at 30% 30%, rgba(180,240,255,0.5), transparent)',
              '--by': `-${90 + i * 12}px`,
              '--bx': `${(i % 2 === 0 ? -1 : 1) * (2 + i * 2)}px`,
              animation: `bubble-stream ${3 + i * 0.5}s ease-out infinite`,
              animationDelay: `${i * 0.4 + 0.2}s`,
            } as React.CSSProperties} />
          ))}
        </>
      )}

      {/* ══════════════════════════════════════════════════════
          ZONE 3 — Centrale Électrique
          Mobile: sparks on wires ~35% and ~60% left, ~15-25% top
          PC: sparks on wires ~25%, 40%, 60% left, ~12-20% top
          Smoke from chimneys: center-back
      ══════════════════════════════════════════════════════ */}
      {zoneId === 'zone3' && (
        <>
          {/* Electric arcs — mobile positions */}
          {[
            { left: '32%', top: '17%' },
            { left: '48%', top: '14%' },
            { left: '62%', top: '18%' },
          ].map((pos, i) => (
            <div key={`arc3m${i}`} className="absolute pointer-events-none md:hidden" style={{
              left: pos.left, top: pos.top,
              width: 18, height: 10,
              background: 'linear-gradient(90deg, transparent, rgba(250,220,30,0.9), transparent)',
              borderRadius: 4,
              boxShadow: '0 0 6px 2px rgba(250,220,30,0.6)',
              animation: `arc-flicker ${1.2 + i * 0.4}s ease-in-out infinite`,
              animationDelay: `${i * 0.35}s`,
            }} />
          ))}
          {/* Electric arcs — PC positions */}
          {[
            { left: '22%', top: '12%' },
            { left: '38%', top: '10%' },
            { left: '52%', top: '11%' },
            { left: '66%', top: '13%' },
          ].map((pos, i) => (
            <div key={`arc3p${i}`} className="absolute pointer-events-none hidden md:block" style={{
              left: pos.left, top: pos.top,
              width: 22, height: 10,
              background: 'linear-gradient(90deg, transparent, rgba(250,220,30,0.9), transparent)',
              borderRadius: 4,
              boxShadow: '0 0 8px 3px rgba(250,220,30,0.5)',
              animation: `arc-flicker ${1.1 + i * 0.3}s ease-in-out infinite`,
              animationDelay: `${i * 0.28}s`,
            }} />
          ))}
          {/* Smoke from chimney — mobile (~50%, 43%) */}
          {Array.from({ length: 5 }, (_, i) => (
            <div key={`sm3m${i}`} className="absolute pointer-events-none rounded-full md:hidden" style={{
              left: `${48 + (i % 3) - 1}%`,
              top: '43%',
              width: 10 + i * 3, height: 10 + i * 3,
              background: 'rgba(120,120,120,0.22)',
              '--sx': `${(i % 2 === 0 ? 1 : -1) * (5 + i * 3)}px`,
              animation: `smoke-rise ${2.5 + i * 0.5}s ease-out infinite`,
              animationDelay: `${i * 0.6}s`,
            } as React.CSSProperties} />
          ))}
          {/* Smoke — PC (chimneys at center-background ~48%, 28%) */}
          {Array.from({ length: 5 }, (_, i) => (
            <div key={`sm3p${i}`} className="absolute pointer-events-none rounded-full hidden md:block" style={{
              left: `${46 + (i % 3) - 1}%`,
              top: '28%',
              width: 12 + i * 4, height: 12 + i * 4,
              background: 'rgba(120,120,120,0.2)',
              '--sx': `${(i % 2 === 0 ? 1 : -1) * (6 + i * 3)}px`,
              animation: `smoke-rise ${3 + i * 0.5}s ease-out infinite`,
              animationDelay: `${i * 0.55}s`,
            } as React.CSSProperties} />
          ))}
        </>
      )}

      {/* ══════════════════════════════════════════════════════
          ZONE 4 — Bois aux Fleurs
          Petals falling + butterflies at visible positions
          Mobile sun: 50% 8%, butterflies: ~15% 40%, ~75% 35%
          PC sun: 50% 10%, butterflies: ~12% 45%, ~80% 40%
      ══════════════════════════════════════════════════════ */}
      {zoneId === 'zone4' && (
        <>
          {/* Sun rays pulse — mobile */}
          <div className="absolute pointer-events-none md:hidden" style={{
            left: '35%', top: '2%', width: 110, height: 110,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,240,120,0.3) 0%, rgba(255,200,50,0.08) 60%, transparent 100%)',
            animation: 'sun-ray-pulse 4s ease-in-out infinite',
          }} />
          {/* Sun rays pulse — PC */}
          <div className="absolute pointer-events-none hidden md:block" style={{
            left: '43%', top: '3%', width: 140, height: 140,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,240,120,0.25) 0%, rgba(255,200,50,0.06) 60%, transparent 100%)',
            animation: 'sun-ray-pulse 4s ease-in-out infinite',
            animationDelay: '0.5s',
          }} />
          {/* Butterflies — mobile */}
          {[
            { left: '12%', top: '42%', color: '#f9a8d4', dur: 3.2, delay: 0 },
            { left: '74%', top: '37%', color: '#fde68a', dur: 2.8, delay: 0.8 },
            { left: '55%', top: '48%', color: '#c4b5fd', dur: 3.5, delay: 1.5 },
          ].map((b, i) => (
            <div key={`bf4m${i}`} className="absolute pointer-events-none md:hidden" style={{
              left: b.left, top: b.top,
              fontSize: 12,
              animation: `butterfly-drift ${b.dur}s ease-in-out infinite`,
              animationDelay: `${b.delay}s`,
            }}>🦋</div>
          ))}
          {/* Butterflies — PC */}
          {[
            { left: '10%', top: '48%', dur: 3.2, delay: 0 },
            { left: '78%', top: '42%', dur: 2.8, delay: 0.8 },
            { left: '45%', top: '55%', dur: 3.8, delay: 1.2 },
            { left: '25%', top: '60%', dur: 3.0, delay: 2.0 },
          ].map((b, i) => (
            <div key={`bf4p${i}`} className="absolute pointer-events-none hidden md:block" style={{
              left: b.left, top: b.top,
              fontSize: 14,
              animation: `butterfly-drift ${b.dur}s ease-in-out infinite`,
              animationDelay: `${b.delay}s`,
            }}>🦋</div>
          ))}
        </>
      )}

      {/* Zone 4 falling petals */}
      {cfg.particles === 'leaves_flowers' && LEAVES.map((leaf, i) => (
        <div key={i} className="absolute pointer-events-none rounded-full" style={{
          left: `${leaf.x}%`, top: '-12px',
          width: leaf.size * 0.7, height: leaf.size * 0.5,
          background: i % 4 === 0 ? '#f9a8d4' : i % 4 === 1 ? '#fde68a' : i % 4 === 2 ? '#f472b6' : '#bbf7d0',
          opacity: 0.8,
          '--leaf-x': `${leaf.leafX}px`, '--leaf-rot': `${leaf.leafRot}deg`,
          animation: `leaf-fall ${leaf.duration}s linear infinite`,
          animationDelay: `${leaf.delay}s`,
        } as React.CSSProperties} />
      ))}

      {/* ══════════════════════════════════════════════════════
          ZONE 5 — Tour Fantôme
          Will-o'-wisps at exact drawn positions
          Mobile wisps: right side of tower ~67% 32%, ~77% 38%, ~72% 52%, ~52% 68%, ~20% 65%, ~15% 73%
          PC wisps: scattered across cemetery ~15% 58%, ~10% 42%, ~25% 48%, ~38% 62%, ~52% 55%, ~60% 42%, ~72% 35%, ~82% 48%
      ══════════════════════════════════════════════════════ */}
      {zoneId === 'zone5' && (
        <>
          {/* Mobile will-o'-wisps */}
          {[
            { left: '67%', top: '32%', color: '#818cf8', size: 10, dur: 2.1, delay: 0 },
            { left: '77%', top: '38%', color: '#a78bfa', size: 8, dur: 2.8, delay: 0.5 },
            { left: '72%', top: '52%', color: '#7dd3fc', size: 9, dur: 2.4, delay: 1.0 },
            { left: '52%', top: '68%', color: '#818cf8', size: 7, dur: 3.0, delay: 0.3 },
            { left: '20%', top: '65%', color: '#a78bfa', size: 8, dur: 2.6, delay: 0.8 },
            { left: '15%', top: '73%', color: '#7dd3fc', size: 7, dur: 2.2, delay: 1.4 },
          ].map((w, i) => (
            <div key={`w5m${i}`} className="absolute pointer-events-none md:hidden" style={{
              left: w.left, top: w.top,
              width: w.size, height: w.size * 1.4,
              background: `radial-gradient(ellipse at 50% 30%, ${w.color} 0%, ${w.color}88 50%, transparent 100%)`,
              borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
              boxShadow: `0 0 8px 3px ${w.color}66`,
              animation: `wisp-rise ${w.dur}s ease-in-out infinite`,
              animationDelay: `${w.delay}s`,
            }} />
          ))}
          {/* PC will-o'-wisps */}
          {[
            { left: '12%', top: '58%', color: '#818cf8', size: 10, dur: 2.5, delay: 0 },
            { left: '8%', top: '42%', color: '#a78bfa', size: 8, dur: 3.0, delay: 0.6 },
            { left: '23%', top: '52%', color: '#7dd3fc', size: 9, dur: 2.2, delay: 1.1 },
            { left: '38%', top: '65%', color: '#818cf8', size: 8, dur: 2.8, delay: 0.3 },
            { left: '52%', top: '58%', color: '#a78bfa', size: 10, dur: 2.4, delay: 0.9 },
            { left: '62%', top: '44%', color: '#7dd3fc', size: 8, dur: 3.2, delay: 1.5 },
            { left: '74%', top: '36%', color: '#818cf8', size: 9, dur: 2.0, delay: 0.4 },
            { left: '84%', top: '50%', color: '#a78bfa', size: 7, dur: 2.7, delay: 1.2 },
          ].map((w, i) => (
            <div key={`w5p${i}`} className="absolute pointer-events-none hidden md:block" style={{
              left: w.left, top: w.top,
              width: w.size, height: w.size * 1.4,
              background: `radial-gradient(ellipse at 50% 30%, ${w.color} 0%, ${w.color}88 50%, transparent 100%)`,
              borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
              boxShadow: `0 0 8px 3px ${w.color}66`,
              animation: `wisp-rise ${w.dur}s ease-in-out infinite`,
              animationDelay: `${w.delay}s`,
            }} />
          ))}
        </>
      )}

      {/* ══════════════════════════════════════════════════════
          ZONE 6 — Sylph Co. (office)
          Neon light pulse on strips + screen flicker
          Mobile: neon strips left ~7% 13% and right ~88% 13%; screens at ~20% 45% and ~75% 45%
          PC: neon strips left ~33% 8% and right ~62% 8%; screens scattered
      ══════════════════════════════════════════════════════ */}
      {zoneId === 'zone6' && (
        <>
          {/* Neon strips — mobile */}
          {[
            { left: '6%', top: '13%', w: 3, h: 30 },
            { left: '88%', top: '13%', w: 3, h: 30 },
          ].map((n, i) => (
            <div key={`neon6m${i}`} className="absolute pointer-events-none md:hidden" style={{
              left: n.left, top: n.top, width: n.w, height: n.h,
              background: 'rgba(200,120,255,0.9)',
              boxShadow: '0 0 8px 3px rgba(200,120,255,0.7)',
              borderRadius: 2,
              animation: `neon-flicker ${2.5 + i * 0.7}s ease-in-out infinite`,
              animationDelay: `${i * 1.2}s`,
            }} />
          ))}
          {/* Neon strips — PC */}
          {[
            { left: '32%', top: '8%', w: 3, h: 22 },
            { left: '62%', top: '8%', w: 3, h: 22 },
          ].map((n, i) => (
            <div key={`neon6p${i}`} className="absolute pointer-events-none hidden md:block" style={{
              left: n.left, top: n.top, width: n.w, height: n.h,
              background: 'rgba(200,120,255,0.9)',
              boxShadow: '0 0 8px 3px rgba(200,120,255,0.7)',
              borderRadius: 2,
              animation: `neon-flicker ${2.5 + i * 0.7}s ease-in-out infinite`,
              animationDelay: `${i * 1.2}s`,
            }} />
          ))}
          {/* Screen glow flicker — mobile */}
          {[
            { left: '8%', top: '42%', w: 28, h: 18, color: 'rgba(80,180,255,0.25)' },
            { left: '73%', top: '42%', w: 28, h: 18, color: 'rgba(160,80,255,0.25)' },
          ].map((s, i) => (
            <div key={`scr6m${i}`} className="absolute pointer-events-none rounded md:hidden" style={{
              left: s.left, top: s.top, width: s.w, height: s.h,
              background: s.color,
              animation: `neon-flicker ${3 + i * 0.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.8 + 0.5}s`,
            }} />
          ))}
          {/* Screen glow — PC */}
          {[
            { left: '3%', top: '18%', w: 36, h: 22, color: 'rgba(80,180,255,0.2)' },
            { left: '62%', top: '22%', w: 32, h: 20, color: 'rgba(160,80,255,0.2)' },
          ].map((s, i) => (
            <div key={`scr6p${i}`} className="absolute pointer-events-none rounded hidden md:block" style={{
              left: s.left, top: s.top, width: s.w, height: s.h,
              background: s.color,
              animation: `neon-flicker ${3 + i * 0.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.8 + 0.5}s`,
            }} />
          ))}
        </>
      )}

      {/* ══════════════════════════════════════════════════════
          ZONE 7 — Île Cramoisie (volcano)
          Embers from crater + lava pool glows
          Mobile: crater ~50% 27%, lava pools ~30% 58%, ~55% 62%, ~42% 68%
          PC: main crater ~70% 22%, secondary ~20% 30%, lava pools ~45% 55%
      ══════════════════════════════════════════════════════ */}
      {zoneId === 'zone7' && (
        <>
          {/* Embers rising — mobile crater */}
          {Array.from({ length: 8 }, (_, i) => (
            <div key={`em7m${i}`} className="absolute pointer-events-none rounded-full md:hidden" style={{
              left: `${48 + (i % 5) - 2}%`,
              top: '27%',
              width: 3 + (i % 2), height: 3 + (i % 2),
              background: i % 3 === 0 ? '#ff4500' : i % 3 === 1 ? '#ff8c00' : '#ffd700',
              boxShadow: `0 0 4px 1px ${i % 3 === 0 ? '#ff4500' : '#ff8c00'}`,
              '--ex': `${(i % 2 === 0 ? 1 : -1) * (5 + i * 3)}px`,
              '--ex2': `${(i % 2 === 0 ? -1 : 1) * (8 + i * 2)}px`,
              animation: `ember-rise ${1.5 + (i % 4) * 0.4}s ease-out infinite`,
              animationDelay: `${(i * 0.3) % 2}s`,
            } as React.CSSProperties} />
          ))}
          {/* Embers rising — PC main crater */}
          {Array.from({ length: 8 }, (_, i) => (
            <div key={`em7pm${i}`} className="absolute pointer-events-none rounded-full hidden md:block" style={{
              left: `${68 + (i % 5) - 2}%`,
              top: '22%',
              width: 3 + (i % 2), height: 3 + (i % 2),
              background: i % 3 === 0 ? '#ff4500' : i % 3 === 1 ? '#ff8c00' : '#ffd700',
              boxShadow: `0 0 4px 1px ${i % 3 === 0 ? '#ff4500' : '#ff8c00'}`,
              '--ex': `${(i % 2 === 0 ? 1 : -1) * (5 + i * 3)}px`,
              '--ex2': `${(i % 2 === 0 ? -1 : 1) * (8 + i * 2)}px`,
              animation: `ember-rise ${1.5 + (i % 4) * 0.4}s ease-out infinite`,
              animationDelay: `${(i * 0.3) % 2}s`,
            } as React.CSSProperties} />
          ))}
          {/* Embers — PC secondary crater */}
          {Array.from({ length: 5 }, (_, i) => (
            <div key={`em7ps${i}`} className="absolute pointer-events-none rounded-full hidden md:block" style={{
              left: `${19 + (i % 3) - 1}%`,
              top: '30%',
              width: 2 + (i % 2), height: 2 + (i % 2),
              background: '#ff6600',
              '--ex': `${(i % 2 === 0 ? 1 : -1) * (3 + i * 2)}px`,
              '--ex2': `${(i % 2 === 0 ? -1 : 1) * (5 + i)}px`,
              animation: `ember-rise ${1.8 + (i % 3) * 0.4}s ease-out infinite`,
              animationDelay: `${i * 0.4}s`,
            } as React.CSSProperties} />
          ))}
          {/* Lava pool glows — mobile */}
          {[
            { left: '24%', top: '56%', w: 45, h: 18 },
            { left: '50%', top: '60%', w: 38, h: 15 },
            { left: '37%', top: '66%', w: 32, h: 13 },
          ].map((p, i) => (
            <div key={`lp7m${i}`} className="absolute pointer-events-none rounded-full md:hidden" style={{
              left: p.left, top: p.top, width: p.w, height: p.h,
              background: 'radial-gradient(ellipse, rgba(255,80,0,0.45) 0%, rgba(255,50,0,0.15) 60%, transparent 100%)',
              animation: `lava-glow-pulse ${2 + i * 0.4}s ease-in-out infinite`,
              animationDelay: `${i * 0.5}s`,
            }} />
          ))}
          {/* Lava pool glows — PC */}
          {[
            { left: '40%', top: '52%', w: 60, h: 22 },
            { left: '62%', top: '60%', w: 44, h: 16 },
          ].map((p, i) => (
            <div key={`lp7p${i}`} className="absolute pointer-events-none rounded-full hidden md:block" style={{
              left: p.left, top: p.top, width: p.w, height: p.h,
              background: 'radial-gradient(ellipse, rgba(255,80,0,0.4) 0%, rgba(255,50,0,0.12) 60%, transparent 100%)',
              animation: `lava-glow-pulse ${2.2 + i * 0.4}s ease-in-out infinite`,
              animationDelay: `${i * 0.6}s`,
            }} />
          ))}
          {/* Smoke from main crater — mobile */}
          {Array.from({ length: 5 }, (_, i) => (
            <div key={`sm7m${i}`} className="absolute pointer-events-none rounded-full md:hidden" style={{
              left: `${47 + (i % 3) - 1}%`,
              top: '23%',
              width: 14 + i * 4, height: 14 + i * 4,
              background: 'rgba(80,70,60,0.2)',
              '--sx': `${(i % 2 === 0 ? 1 : -1) * (8 + i * 4)}px`,
              animation: `smoke-rise ${2.8 + i * 0.5}s ease-out infinite`,
              animationDelay: `${i * 0.55}s`,
            } as React.CSSProperties} />
          ))}
          {/* Smoke — PC main crater */}
          {Array.from({ length: 5 }, (_, i) => (
            <div key={`sm7pm${i}`} className="absolute pointer-events-none rounded-full hidden md:block" style={{
              left: `${67 + (i % 3) - 1}%`,
              top: '18%',
              width: 16 + i * 5, height: 16 + i * 5,
              background: 'rgba(80,70,60,0.18)',
              '--sx': `${(i % 2 === 0 ? 1 : -1) * (8 + i * 4)}px`,
              animation: `smoke-rise ${3 + i * 0.5}s ease-out infinite`,
              animationDelay: `${i * 0.5}s`,
            } as React.CSSProperties} />
          ))}
        </>
      )}

      {/* ══════════════════════════════════════════════════════
          ZONE 8 — Route Victoire (mountain path with clouds)
          Drifting mist clouds between the cliffs
      ══════════════════════════════════════════════════════ */}
      {zoneId === 'zone8' && (
        <>
          {/* Mist patches drifting — mobile */}
          {[
            { left: '10%', top: '45%', w: 80, h: 30, dur: 6, delay: 0 },
            { left: '55%', top: '55%', w: 65, h: 25, dur: 8, delay: -2 },
            { left: '30%', top: '65%', w: 90, h: 35, dur: 7, delay: -4 },
          ].map((m, i) => (
            <div key={`mist8m${i}`} className="absolute pointer-events-none rounded-full md:hidden" style={{
              left: m.left, top: m.top, width: m.w, height: m.h,
              background: 'radial-gradient(ellipse, rgba(220,230,240,0.28) 0%, transparent 100%)',
              animation: `mist-drift ${m.dur}s ease-in-out infinite`,
              animationDelay: `${m.delay}s`,
            }} />
          ))}
          {/* Mist patches — PC */}
          {[
            { left: '5%', top: '40%', w: 130, h: 40, dur: 8, delay: 0 },
            { left: '35%', top: '50%', w: 100, h: 35, dur: 10, delay: -3 },
            { left: '65%', top: '45%', w: 120, h: 38, dur: 9, delay: -5 },
          ].map((m, i) => (
            <div key={`mist8p${i}`} className="absolute pointer-events-none rounded-full hidden md:block" style={{
              left: m.left, top: m.top, width: m.w, height: m.h,
              background: 'radial-gradient(ellipse, rgba(220,230,240,0.25) 0%, transparent 100%)',
              animation: `mist-drift ${m.dur}s ease-in-out infinite`,
              animationDelay: `${m.delay}s`,
            }} />
          ))}
        </>
      )}

      {/* ── Bubbles for zone2 (fallback if no localized, kept for compatibility) ── */}
      {cfg.particles === 'bubbles' && zoneId !== 'zone2' && BUBBLES.map((b, i) => (
        <div key={i} className="absolute pointer-events-none rounded-full border border-cyan-300/40" style={{
          left: `${b.x}%`, bottom: `${20 + b.y * 0.3}%`,
          width: b.size, height: b.size,
          background: 'radial-gradient(circle at 30% 30%, rgba(150,220,255,0.3), transparent)',
          animation: `ripple ${b.duration}s ease-out infinite`,
          animationDelay: `${b.delay}s`,
        }} />
      ))}

      {/* ── Stars for ligue ── */}
      {cfg.particles === 'stars' && zoneId !== 'zone8' && zoneId !== 'zone_libre' && starsEls}

      {/* ── Zone libre — starfield ── */}
      {zoneId === 'zone_libre' && (
        <>
          {starsEls}
          {[
            { x: 12, y: 8, size: 4, dur: 2.1, delay: 0 },
            { x: 34, y: 14, size: 5, dur: 3.4, delay: 0.8 },
            { x: 58, y: 6, size: 3.5, dur: 1.8, delay: 1.5 },
            { x: 78, y: 12, size: 4.5, dur: 2.8, delay: 0.4 },
            { x: 90, y: 22, size: 3, dur: 4.1, delay: 2.2 },
            { x: 22, y: 28, size: 5, dur: 2.5, delay: 1.1 },
            { x: 68, y: 30, size: 3.5, dur: 3.0, delay: 0.7 },
            { x: 45, y: 18, size: 4, dur: 1.6, delay: 3.0 },
          ].map((s, i) => (
            <div key={`bright-${i}`} className="absolute pointer-events-none rounded-full" style={{
              left: `${s.x}%`, top: `${s.y}%`,
              width: s.size, height: s.size,
              background: i % 3 === 0 ? '#fff' : i % 3 === 1 ? '#e0d8ff' : '#ffeedd',
              '--base-opacity': 0.9,
              '--tw-duration': `${s.dur}s`,
              '--tw-delay': `${s.delay}s`,
              boxShadow: `0 0 ${s.size * 3}px ${s.size}px ${i % 3 === 0 ? 'rgba(255,255,255,0.5)' : i % 3 === 1 ? 'rgba(200,180,255,0.4)' : 'rgba(255,220,150,0.35)'}`,
              animation: `twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
            } as React.CSSProperties} />
          ))}
        </>
      )}

    </div>
  );
}
