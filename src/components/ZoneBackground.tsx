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

const ZONE_CONFIGS: Record<string, {
  sky: string;
  particles: 'leaves' | 'fireflies' | 'bubbles' | 'sparks' | 'wisps' | 'lava' | 'stars' | 'none';
  fog?: string;
  ambientLight?: string;
}> = {
  zone1: {
    sky: 'linear-gradient(180deg, #0d2b18 0%, #1a4a28 30%, #0f3520 60%, #0a2015 100%)',
    particles: 'fireflies',
    fog: 'radial-gradient(ellipse 90% 50% at 50% 70%, rgba(16,60,30,0.5) 0%, transparent 100%)',
    ambientLight: 'radial-gradient(ellipse 60% 40% at 70% 20%, rgba(100,200,100,0.08) 0%, transparent 100%)',
  },
  zone2: {
    sky: 'linear-gradient(180deg, #062040 0%, #0a3060 30%, #0d4070 55%, #0a2848 80%, #061828 100%)',
    particles: 'bubbles',
    fog: 'radial-gradient(ellipse 100% 40% at 50% 80%, rgba(10,40,80,0.6) 0%, transparent 100%)',
    ambientLight: 'radial-gradient(ellipse 70% 30% at 30% 30%, rgba(40,120,200,0.1) 0%, transparent 100%)',
  },
  zone3: {
    sky: 'linear-gradient(180deg, #181408 0%, #2a2200 30%, #1e1a00 60%, #111000 100%)',
    particles: 'sparks',
    fog: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(40,30,0,0.4) 0%, transparent 100%)',
    ambientLight: 'radial-gradient(ellipse 50% 40% at 80% 40%, rgba(200,180,0,0.07) 0%, transparent 100%)',
  },
  zone4: {
    sky: 'linear-gradient(180deg, #0e2818 0%, #1a4020 25%, #253520 55%, #1a2e18 100%)',
    particles: 'leaves',
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
    sky: 'linear-gradient(180deg, #180820 0%, #250e35 30%, #1e0a28 60%, #120818 100%)',
    particles: 'wisps',
    fog: 'radial-gradient(ellipse 70% 50% at 50% 60%, rgba(60,20,80,0.4) 0%, transparent 100%)',
    ambientLight: 'radial-gradient(ellipse 50% 35% at 70% 25%, rgba(180,100,255,0.07) 0%, transparent 100%)',
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
      {/* Fog */}
      {cfg.fog && (
        <div className="absolute inset-0 pointer-events-none" style={{ background: cfg.fog }} />
      )}
      {/* Ambient light */}
      {cfg.ambientLight && (
        <div className="absolute inset-0 pointer-events-none" style={{ background: cfg.ambientLight }} />
      )}

      {/* FIREFLIES — forest zone1 */}
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

      {/* LEAVES — floral forest zone4 */}
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

      {/* SPARKS — electric zone3 */}
      {cfg.particles === 'sparks' && SPARKS.map((s, i) => (
        <div key={i} className="absolute pointer-events-none" style={{ left: `${s.x}%`, top: `${s.y}%` }}>
          <div
            className="absolute"
            style={{
              width: 2,
              height: 20 + (i % 3) * 15,
              background: `linear-gradient(to bottom, #fde047, #facc15, transparent)`,
              transformOrigin: 'top center',
              boxShadow: '0 0 6px 2px rgba(250, 204, 21, 0.5)',
              animation: `spark ${1.5 + (i % 3) * 0.8}s ease-in-out infinite`,
              animationDelay: `${s.delay}s`,
            }}
          />
        </div>
      ))}

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
