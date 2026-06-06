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

// Electric arcs for zone3
const ELECTRIC_ARCS = Array.from({ length: 6 }, (_, i) => ({
  x1: 10 + (i * 79.3) % 80,
  x2: 10 + (i * 79.3 + 30 + (i % 3) * 20) % 80,
  height: 30 + (i % 4) * 25,
  delay: (i * 0.55) % 2.5,
  duration: 0.12 + (i % 3) * 0.06,
}));

// Ground flowers for zone4
const GROUND_FLOWERS = Array.from({ length: 22 }, (_, i) => ({
  x: (i * 31.7 + 3) % 96,
  size: 8 + (i % 4) * 5,
  color: ['#f9a8d4', '#fbcfe8', '#fde68a', '#bbf7d0', '#c4b5fd', '#fca5a5', '#a5f3fc'][i % 7],
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
    sky: 'linear-gradient(180deg, #08080f 0%, #0d0d1a 35%, #12100a 65%, #0a0a05 100%)',
    particles: 'electric',
    fog: 'radial-gradient(ellipse 100% 40% at 50% 100%, rgba(250,204,21,0.06) 0%, transparent 100%)',
    ambientLight: 'radial-gradient(ellipse 60% 30% at 50% 60%, rgba(250,204,21,0.04) 0%, transparent 100%)',
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
    sky: 'linear-gradient(180deg, #0a0808 0%, #1a1210 35%, #120e0c 65%, #0a0808 100%)',
    particles: 'stars',
    fog: 'radial-gradient(ellipse 80% 50% at 50% 60%, rgba(20,10,8,0.5) 0%, transparent 100%)',
    ambientLight: 'radial-gradient(ellipse 50% 30% at 60% 20%, rgba(255,150,50,0.06) 0%, transparent 100%)',
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

export function ZoneBackground({ zoneId }: Props) {
  const cfg = ZONE_CONFIGS[zoneId] ?? ZONE_CONFIGS['zone1'];

  const starsEls = useMemo(() => STARS.map((star, i) => (
    <div
      key={i}
      className="star"
      style={{
        left: `${star.x}%`,
        top: `${star.y}%`,
        width: `${star.size}px`,
        height: `${star.size}px`,
        '--base-opacity': star.opacity,
        '--tw-duration': `${star.duration}s`,
        '--tw-delay': `${star.delay}s`,
      } as React.CSSProperties}
    />
  )), []);

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: cfg.sky }}>

      {/* ══ ZONE 1 — Forêt de Pallet : calm daytime ══ */}
      {zoneId === 'zone1' && (
        <>
          {/* Sun — soft, top right */}
          <div className="absolute pointer-events-none" style={{
            right: '12%', top: '6%',
            width: 60, height: 60,
            borderRadius: '50%',
            background: 'radial-gradient(circle, #fffde0 0%, #ffe066 55%, #ffc800 100%)',
            boxShadow: '0 0 50px 25px rgba(255,210,0,0.28)',
          }} />
          {/* 2 slow clouds */}
          {[
            { left: '3%', top: '10%', w: 120, h: 36, dur: '60s', delay: '0s' },
            { left: '55%', top: '6%', w: 90, h: 28, dur: '80s', delay: '-30s' },
          ].map((c, i) => (
            <div key={i} className="absolute pointer-events-none" style={{
              left: c.left, top: c.top, width: c.w, height: c.h,
              background: 'rgba(255,255,255,0.82)',
              borderRadius: '60px',
              boxShadow: `${Math.round(c.w * 0.25)}px -6px 0 ${Math.round(c.w * 0.12)}px rgba(255,255,255,0.75)`,
              animation: `cloud-drift ${c.dur} linear infinite`,
              animationDelay: c.delay,
            }} />
          ))}
          {/* Far tree silhouette band */}
          <div className="absolute pointer-events-none w-full" style={{
            bottom: '18%',
            height: '16%',
            background: 'linear-gradient(to bottom, #3a7a22 0%, #2d6018 100%)',
            clipPath: 'polygon(0% 60%, 5% 20%, 10% 55%, 15% 10%, 20% 50%, 26% 5%, 32% 45%, 38% 15%, 44% 50%, 50% 8%, 56% 48%, 62% 12%, 68% 45%, 74% 5%, 80% 50%, 86% 18%, 92% 52%, 97% 22%, 100% 55%, 100% 100%, 0% 100%)',
            opacity: 0.85,
          }} />
          {/* Near tree silhouette band */}
          <div className="absolute pointer-events-none w-full" style={{
            bottom: '15%',
            height: '13%',
            background: 'linear-gradient(to bottom, #4a9428 0%, #3a7018 100%)',
            clipPath: 'polygon(0% 70%, 4% 25%, 9% 65%, 14% 20%, 20% 60%, 27% 10%, 33% 55%, 40% 18%, 46% 58%, 53% 12%, 59% 52%, 65% 20%, 72% 60%, 78% 8%, 84% 55%, 90% 22%, 96% 58%, 100% 30%, 100% 100%, 0% 100%)',
          }} />
        </>
      )}

      {/* Fog */}
      {cfg.fog && (
        <div className="absolute inset-0 pointer-events-none" style={{ background: cfg.fog }} />
      )}
      {/* Ambient light */}
      {cfg.ambientLight && (
        <div className="absolute inset-0 pointer-events-none" style={{ background: cfg.ambientLight }} />
      )}

      {/* FIREFLIES — forest (kept for other green zones) */}
      {cfg.particles === 'fireflies' && FIREFLIES.map((ff, i) => (
        <div
          key={i}
          className="firefly"
          style={{
            left: `${ff.x}%`,
            top: `${ff.y}%`,
            '--fx': `${ff.fx}px`,
            '--fy': `${ff.fy}px`,
            '--ff-duration': `${ff.duration}s`,
            '--ff-delay': `${ff.delay}s`,
          } as React.CSSProperties}
        />
      ))}

      {/* LEAVES + FLOWERS — zone4 */}
      {cfg.particles === 'leaves_flowers' && (
        <>
          {/* Ground flowers row */}
          {GROUND_FLOWERS.map((f, i) => (
            <div key={`flower-${i}`} className="absolute pointer-events-none" style={{
              left: `${f.x}%`,
              bottom: `${18 + (i % 3) * 2}%`,
              fontSize: f.size,
              animation: `sway ${2 + (i % 4) * 0.5}s ease-in-out infinite`,
              animationDelay: `${f.delay}s`,
              userSelect: 'none',
              lineHeight: 1,
            }}>
              {['🌸','🌼','🌺','💐','🌷','🌻','🌹'][i % 7]}
            </div>
          ))}
          {/* Falling leaves */}
          {LEAVES.map((leaf, i) => (
            <div key={`leaf-${i}`} className="absolute pointer-events-none rounded-full" style={{
              left: `${leaf.x}%`, top: '-12px',
              width: leaf.size, height: leaf.size * 0.6,
              background: leaf.color, opacity: 0.7,
              '--leaf-x': `${leaf.leafX}px`, '--leaf-rot': `${leaf.leafRot}deg`,
              animation: `leaf-fall ${leaf.duration}s linear infinite`,
              animationDelay: `${leaf.delay}s`,
            } as React.CSSProperties} />
          ))}
        </>
      )}
      {/* LEAVES — leaves only */}
      {cfg.particles === 'leaves' && LEAVES.map((leaf, i) => (
        <div
          key={i}
          className="absolute pointer-events-none rounded-full"
          style={{
            left: `${leaf.x}%`,
            top: '-12px',
            width: leaf.size,
            height: leaf.size * 0.6,
            background: leaf.color,
            opacity: 0.7,
            '--leaf-x': `${leaf.leafX}px`,
            '--leaf-rot': `${leaf.leafRot}deg`,
            animation: `leaf-fall ${leaf.duration}s linear infinite`,
            animationDelay: `${leaf.delay}s`,
          } as React.CSSProperties}
        />
      ))}

      {/* BUBBLES — ocean zone2 */}
      {cfg.particles === 'bubbles' && BUBBLES.map((b, i) => (
        <div
          key={i}
          className="absolute pointer-events-none rounded-full border border-cyan-300/40"
          style={{
            left: `${b.x}%`,
            bottom: `${20 + b.y * 0.3}%`,
            width: b.size,
            height: b.size,
            background: 'radial-gradient(circle at 30% 30%, rgba(150,220,255,0.3), transparent)',
            animation: `ripple ${b.duration}s ease-out infinite`,
            animationDelay: `${b.delay}s`,
          }}
        />
      ))}

      {/* SPARKS — (kept for fallback) */}
      {cfg.particles === 'sparks' && SPARKS.map((s, i) => (
        <div key={i} className="absolute pointer-events-none" style={{ left: `${s.x}%`, top: `${s.y}%` }}>
          <div className="absolute" style={{
            width: 2, height: 20 + (i % 3) * 15,
            background: `linear-gradient(to bottom, #fde047, #facc15, transparent)`,
            transformOrigin: 'top center',
            boxShadow: '0 0 6px 2px rgba(250,204,21,0.5)',
            animation: `spark ${1.5 + (i % 3) * 0.8}s ease-in-out infinite`,
            animationDelay: `${s.delay}s`,
          }} />
        </div>
      ))}

      {/* ELECTRIC ARCS — zone3 power plant */}
      {cfg.particles === 'electric' && (
        <>
          {/* Dark industrial background elements */}
          {/* Ceiling struts */}
          {[15, 35, 55, 75].map((x, i) => (
            <div key={i} className="absolute pointer-events-none" style={{
              left: `${x}%`, top: 0, width: 6, height: '45%',
              background: 'linear-gradient(to bottom, #2a2a3a, #1a1a28)',
              boxShadow: '0 0 8px rgba(100,100,200,0.15)',
            }} />
          ))}
          {/* Horizontal beam */}
          <div className="absolute pointer-events-none w-full" style={{
            top: '30%', height: 10,
            background: 'linear-gradient(to right, transparent, #1e1e2e 15%, #252535 50%, #1e1e2e 85%, transparent)',
          }} />
          {/* Machines / boxes at bottom */}
          {[5, 20, 50, 68, 82].map((x, i) => (
            <div key={i} className="absolute pointer-events-none" style={{
              left: `${x}%`, bottom: '18%',
              width: 10 + (i % 3) * 6, height: 14 + (i % 4) * 8,
              background: 'linear-gradient(135deg, #1e2030 0%, #2a2d42 100%)',
              border: '1px solid #3a3d52',
              borderRadius: 2,
              boxShadow: `0 0 ${6 + i * 2}px rgba(100,150,255,0.1)`,
            }} />
          ))}
          {/* Electric arc SVG paths */}
          {ELECTRIC_ARCS.map((arc, i) => (
            <svg key={i} className="absolute pointer-events-none" style={{
              left: `${Math.min(arc.x1, arc.x2)}%`,
              top: `${15 + (i % 3) * 10}%`,
              width: `${Math.abs(arc.x2 - arc.x1)}%`,
              height: arc.height,
              overflow: 'visible',
              animation: `electric-flicker ${arc.duration}s step-end infinite`,
              animationDelay: `${arc.delay}s`,
              opacity: 0.9,
            }}>
              <polyline
                points={`0,${arc.height} ${arc.height * 0.3},${arc.height * 0.4} ${arc.height * 0.5},${arc.height * 0.8} ${arc.height * 0.7},${arc.height * 0.2} 100%,0`}
                fill="none" stroke="#fde047" strokeWidth="2"
                style={{ filter: 'drop-shadow(0 0 4px #facc15) drop-shadow(0 0 8px #eab308)' }}
              />
              <polyline
                points={`0,${arc.height} ${arc.height * 0.25},${arc.height * 0.6} ${arc.height * 0.55},${arc.height * 0.3} ${arc.height * 0.75},${arc.height * 0.7} 100%,0`}
                fill="none" stroke="white" strokeWidth="1" opacity="0.6"
              />
            </svg>
          ))}
          {/* Glow nodes at arc endpoints */}
          {ELECTRIC_ARCS.map((arc, i) => (
            <div key={`node-${i}`} className="absolute pointer-events-none rounded-full" style={{
              left: `calc(${arc.x1}% - 5px)`,
              top: `calc(${15 + (i % 3) * 10}% + ${arc.height - 10}px)`,
              width: 10, height: 10,
              background: 'radial-gradient(circle, #fde047, #facc15)',
              boxShadow: '0 0 12px 4px rgba(250,204,21,0.7)',
              animation: `electric-flicker ${arc.duration * 1.3}s step-end infinite`,
              animationDelay: `${arc.delay + 0.05}s`,
            }} />
          ))}
        </>
      )}

      {/* INDOOR — zone6 Sylphe SARL office building */}
      {cfg.particles === 'indoor' && (
        <>
          {/* Ceiling */}
          <div className="absolute pointer-events-none w-full" style={{
            top: 0, height: '8%',
            background: 'linear-gradient(to bottom, #1a1a2e, #16213e)',
            borderBottom: '2px solid #2a2a4e',
          }} />
          {/* Back wall with windows */}
          <div className="absolute pointer-events-none w-full" style={{
            top: '8%', bottom: '25%',
            background: 'linear-gradient(180deg, #16213e 0%, #1a2040 60%, #141830 100%)',
          }} />
          {/* Windows row 1 */}
          {[8, 26, 44, 62, 80].map((x, i) => (
            <div key={`win1-${i}`} className="absolute pointer-events-none" style={{
              left: `${x}%`, top: '12%', width: '12%', height: '18%',
              background: i % 3 === 0
                ? 'linear-gradient(135deg, rgba(100,150,255,0.35), rgba(150,200,255,0.2))'
                : 'linear-gradient(135deg, rgba(60,80,180,0.2), rgba(80,100,200,0.1))',
              border: '1.5px solid #3a4060',
              borderRadius: 2,
              boxShadow: i % 3 === 0 ? '0 0 20px rgba(100,150,255,0.25) inset' : 'none',
            }} />
          ))}
          {/* Windows row 2 */}
          {[17, 35, 53, 71].map((x, i) => (
            <div key={`win2-${i}`} className="absolute pointer-events-none" style={{
              left: `${x}%`, top: '34%', width: '12%', height: '18%',
              background: 'linear-gradient(135deg, rgba(60,80,180,0.15), rgba(80,100,200,0.08))',
              border: '1.5px solid #2e3450',
              borderRadius: 2,
            }} />
          ))}
          {/* Floor line */}
          <div className="absolute pointer-events-none w-full" style={{
            bottom: '24%', height: 3,
            background: 'linear-gradient(to right, transparent, #2a2a4e 20%, #3a3a5e 50%, #2a2a4e 80%, transparent)',
          }} />
          {/* Floor reflection */}
          <div className="absolute pointer-events-none w-full" style={{
            bottom: '18%', height: '8%',
            background: 'linear-gradient(to top, transparent, rgba(30,40,90,0.3))',
          }} />
          {/* Floating psychic orbs / data screens */}
          {[20, 50, 78].map((x, i) => (
            <div key={`orb-${i}`} className="absolute pointer-events-none rounded-full" style={{
              left: `${x}%`, top: `${38 + i * 8}%`,
              width: 14 + i * 6, height: 14 + i * 6,
              background: 'radial-gradient(circle, rgba(168,85,247,0.5), rgba(99,102,241,0.2), transparent)',
              boxShadow: '0 0 20px rgba(168,85,247,0.3)',
              animation: `ghost-drift ${4 + i * 1.5}s ease-in-out infinite`,
              animationDelay: `${i * 1.2}s`,
              '--gx': `${[-20,15,-10][i]}px`,
              '--gx2': `${[10,-8,14][i]}px`,
            } as React.CSSProperties} />
          ))}
        </>
      )}

      {/* WISPS — ghost/psychic zone5 & zone6 */}
      {cfg.particles === 'wisps' && WISPS.map((w, i) => (
        <div
          key={i}
          className="absolute pointer-events-none rounded-full"
          style={{
            left: `${w.x}%`,
            top: `${w.y}%`,
            width: 20 + (i % 3) * 10,
            height: 20 + (i % 3) * 10,
            background: zoneId === 'zone6'
              ? 'radial-gradient(circle, rgba(180,100,255,0.3), transparent)'
              : 'radial-gradient(circle, rgba(150,150,255,0.25), transparent)',
            '--gx': `${w.gx}px`,
            '--gx2': `${w.gx2}px`,
            animation: `ghost-drift ${w.duration}s ease-in-out infinite`,
            animationDelay: `${w.delay}s`,
          } as React.CSSProperties}
        />
      ))}

      {/* LAVA — fire zone7 */}
      {cfg.particles === 'lava' && LAVA_BUBBLES.map((b, i) => (
        <div
          key={i}
          className="absolute pointer-events-none rounded-full"
          style={{
            left: `${b.x}%`,
            bottom: '18%',
            width: b.size,
            height: b.size,
            background: `radial-gradient(circle, rgba(255,${60 + i * 8},0,0.7), rgba(200,30,0,0.3))`,
            boxShadow: `0 0 8px 3px rgba(255,60,0,0.3)`,
            animation: `lava-bubble ${b.duration}s ease-out infinite`,
            animationDelay: `${b.delay}s`,
          }}
        />
      ))}

      {/* STARS — night zones */}
      {cfg.particles === 'stars' && starsEls}
    </div>
  );
}
