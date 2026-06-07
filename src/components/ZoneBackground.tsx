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
    sky: 'linear-gradient(180deg, #080415 0%, #100828 30%, #0c0620 60%, #181030 100%)',
    particles: 'none',
    fog: 'radial-gradient(ellipse 100% 40% at 50% 80%, rgba(20,10,40,0.7) 0%, transparent 100%)',
    ambientLight: 'radial-gradient(ellipse 60% 40% at 50% 30%, rgba(120,80,200,0.06) 0%, transparent 100%)',
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

      {/* ZONE 4 — Bois aux Fleurs : flowering forest */}
      {zoneId === 'zone4' && (
        <>
          <svg className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Far tree canopy band */}
            <path d="M -5 55 C 0 40 8 32 15 38 C 20 44 22 35 28 30 C 34 25 36 36 42 32 C 48 28 50 38 56 33 C 62 28 65 36 70 31 C 75 26 78 35 84 30 C 90 25 93 38 100 35 L 105 55 Z"
              fill="#2d7a1e" opacity="0.85"/>
            {/* Mid tree canopy */}
            <path d="M -5 72 C 2 52 10 44 18 50 C 24 55 26 43 33 38 C 40 33 42 47 49 43 C 56 39 58 50 64 44 C 70 38 73 52 80 46 C 87 40 90 55 100 50 L 105 72 Z"
              fill="#22a040" opacity="0.9"/>
            {/* Near tree band */}
            <path d="M -5 88 C 4 68 12 58 20 65 C 27 71 30 57 38 52 C 46 47 48 63 55 58 C 62 53 66 67 73 61 C 80 55 84 70 92 64 C 98 59 100 72 105 68 L 105 88 Z"
              fill="#16863a" opacity="1"/>
            {/* Ground */}
            <rect x="-5" y="85" width="110" height="20" fill="#15803d"/>
            {/* Flowers on ground - scattered positions */}
            {[4,11,19,27,33,40,47,54,60,68,75,82,89,95].map((x, i) => (
              <ellipse key={`fp${i}`} cx={x} cy={87 + (i%3)*2} rx="1.8" ry="1.2"
                fill={['#f9a8d4','#fde68a','#f472b6','#fbbf24','#c084fc','#86efac','#f87171'][i%7]}
                opacity="0.9"/>
            ))}
          </svg>
          {/* Scattered flowers — ground level */}
          {GROUND_FLOWERS.map((f, i) => (
            <div key={`flower-${i}`} className="absolute pointer-events-none" style={{
              left: `${f.x}%`,
              bottom: `${14 + (i % 6) * 2}%`,
              fontSize: f.size,
              animation: `sway ${2 + (i % 4) * 0.5}s ease-in-out infinite`,
              animationDelay: `${f.delay}s`,
              userSelect: 'none',
              lineHeight: 1,
              opacity: 0.85,
            }}>
              {['🌸','🌼','🌺','🌷','🌻','🌹','💐'][i % 7]}
            </div>
          ))}
          {/* Falling petals */}
          {LEAVES.map((leaf, i) => (
            <div key={`petal-${i}`} className="absolute pointer-events-none rounded-full" style={{
              left: `${leaf.x}%`, top: '-12px',
              width: leaf.size * 0.7, height: leaf.size * 0.5,
              background: i % 4 === 0 ? '#f9a8d4' : i % 4 === 1 ? '#fde68a' : i % 4 === 2 ? '#f472b6' : '#bbf7d0',
              opacity: 0.8,
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

      {/* ZONE 2 — Bords de Mer : underwater ocean */}
      {zoneId === 'zone2' && (
        <>
          {/* Light rays from above */}
          {[15, 32, 50, 68, 85].map((x, i) => (
            <div key={`ray-${i}`} className="absolute pointer-events-none" style={{
              left: `${x}%`, top: 0,
              width: `${4 + i % 3}%`, height: '65%',
              background: 'linear-gradient(to bottom, rgba(80,180,255,0.18) 0%, transparent 100%)',
              transform: `rotate(${(i - 2) * 4}deg)`,
              transformOrigin: 'top center',
              animation: `sway ${5 + i * 0.8}s ease-in-out infinite`,
              animationDelay: `${i * 0.6}s`,
            }} />
          ))}
          <svg className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Sandy/rocky seabed */}
            <path d="M 0 82 Q 12 78 25 82 Q 38 86 52 80 Q 65 74 78 80 Q 90 86 100 82 L 100 100 L 0 100 Z"
              fill="#0c3a5e"/>
            <path d="M 0 85 Q 15 81 30 85 Q 45 89 60 83 Q 75 77 90 83 Q 96 85 100 84 L 100 100 L 0 100 Z"
              fill="#0a2e4a"/>

            {/* Coral clusters */}
            {/* Left coral */}
            <line x1="5" y1="82" x2="5" y2="70" stroke="#ef4444" strokeWidth="1.2" strokeLinecap="round"/>
            <line x1="5" y1="75" x2="2" y2="68" stroke="#ef4444" strokeWidth="0.9" strokeLinecap="round"/>
            <line x1="5" y1="75" x2="8" y2="67" stroke="#ef4444" strokeWidth="0.9" strokeLinecap="round"/>
            <circle cx="5" cy="70" r="2" fill="#f87171"/>
            <circle cx="2" cy="68" r="1.5" fill="#fca5a5"/>
            <circle cx="8" cy="67" r="1.5" fill="#f87171"/>
            <line x1="10" y1="82" x2="10" y2="72" stroke="#f97316" strokeWidth="1" strokeLinecap="round"/>
            <line x1="10" y1="76" x2="7.5" y2="70" stroke="#f97316" strokeWidth="0.8" strokeLinecap="round"/>
            <line x1="10" y1="76" x2="12.5" y2="69" stroke="#f97316" strokeWidth="0.8" strokeLinecap="round"/>

            {/* Right coral */}
            <line x1="88" y1="82" x2="88" y2="69" stroke="#a855f7" strokeWidth="1.3" strokeLinecap="round"/>
            <line x1="88" y1="74" x2="85" y2="66" stroke="#a855f7" strokeWidth="0.9" strokeLinecap="round"/>
            <line x1="88" y1="74" x2="91" y2="65" stroke="#a855f7" strokeWidth="0.9" strokeLinecap="round"/>
            <circle cx="88" cy="69" r="2.2" fill="#c084fc"/>
            <circle cx="85" cy="66" r="1.5" fill="#d8b4fe"/>
            <circle cx="91" cy="65" r="1.5" fill="#c084fc"/>
            <line x1="94" y1="82" x2="94" y2="73" stroke="#ec4899" strokeWidth="1" strokeLinecap="round"/>
            <circle cx="94" cy="73" r="1.8" fill="#f9a8d4"/>

            {/* Seaweed — swaying */}
            {[20, 28, 72, 80].map((x, i) => (
              <g key={`sw${i}`}>
                <path d={`M ${x} 85 C ${x+3} 78 ${x-3} 70 ${x+2} 63 C ${x+5} 56 ${x-2} 50 ${x+1} 44`}
                  fill="none" stroke={i%2===0 ? '#16a34a' : '#15803d'} strokeWidth={1.5 - i*0.1}
                  strokeLinecap="round"
                  style={{ animation: `sway ${3+i*0.5}s ease-in-out infinite`, animationDelay: `${i*0.4}s`, transformOrigin: `${x}px 85px` }}/>
              </g>
            ))}

            {/* Small fish silhouettes */}
            {[30, 55, 65].map((x, i) => (
              <g key={`fish${i}`} style={{ animation: `cloud-drift ${8+i*3}s linear infinite`, animationDelay: `${-i*2}s` }}>
                <ellipse cx={x} cy={40+i*10} rx="4" ry="2" fill={['rgba(100,200,255,0.5)','rgba(255,180,100,0.45)','rgba(100,255,200,0.5)'][i]}/>
                <polygon points={`${x-4},${40+i*10} ${x-8},${38+i*10} ${x-8},${42+i*10}`}
                  fill={['rgba(80,180,255,0.4)','rgba(230,150,80,0.4)','rgba(80,230,180,0.4)'][i]}/>
                <circle cx={x+2} cy={39+i*10} r="0.6" fill="rgba(0,0,0,0.5)"/>
              </g>
            ))}
          </svg>
        </>
      )}

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

      {/* ZONE 3 — Centrale Électrique : pylônes HTB, tours de refroidissement, usine */}
      {zoneId === 'zone3' && (
        <>
          {/* Pollution haze overlay */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse 120% 35% at 50% 95%, rgba(90,80,15,0.18) 0%, transparent 65%)',
          }} />
          <svg className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <filter id="e3gy" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="1.8" result="b"/>
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <filter id="e3gr" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="1.2" result="b"/>
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <linearGradient id="e3tw" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#232118"/>
                <stop offset="50%" stopColor="#1c1a12"/>
                <stop offset="100%" stopColor="#161410"/>
              </linearGradient>
              <linearGradient id="e3fc" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1c1a12"/>
                <stop offset="100%" stopColor="#0e0c08"/>
              </linearGradient>
            </defs>

            {/* ── COOLING TOWER LEFT ── */}
            <polygon points="5,78 11,26 21,26 27,78" fill="url(#e3tw)" stroke="#2a2818" strokeWidth="0.3"/>
            <ellipse cx="16" cy="26" rx="5" ry="1.4" fill="#161410" stroke="#2a2818" strokeWidth="0.3"/>
            {[38,50,64].map((y,i) => {
              const t=(y-26)/52; const xl=5+(11-5)*t+0.6; const xr=27-(27-21)*t-0.6;
              return <line key={i} x1={xl} y1={y} x2={xr} y2={y} stroke="#2a2818" strokeWidth="0.22" opacity="0.55"/>;
            })}

            {/* ── COOLING TOWER RIGHT ── */}
            <polygon points="67,78 74,18 86,18 93,78" fill="url(#e3tw)" stroke="#252316" strokeWidth="0.3"/>
            <ellipse cx="80" cy="18" rx="6" ry="1.7" fill="#141210" stroke="#252316" strokeWidth="0.3"/>
            {[34,48,62].map((y,i) => {
              const t=(y-18)/60; const xl=67+(74-67)*t+0.6; const xr=93-(93-86)*t-0.6;
              return <line key={i} x1={xl} y1={y} x2={xr} y2={y} stroke="#252316" strokeWidth="0.22" opacity="0.55"/>;
            })}

            {/* ── FACTORY BUILDING ── */}
            <rect x="28" y="48" width="40" height="30" fill="url(#e3fc)" stroke="#1e1c10" strokeWidth="0.3"/>
            {/* Saw-tooth industrial roof */}
            <polygon points="28,48 34,41 40,48 46,41 52,48 58,41 64,48 68,48 28,48" fill="#181610" stroke="#22200e" strokeWidth="0.3"/>
            <rect x="28" y="48" width="40" height="1.5" fill="#262416"/>
            {/* Windows row 1 */}
            {[30.5,36,41.5,47,52.5,58].map((x,i)=>(
              <rect key={`w1${i}`} x={x} y={52} width={3.5} height={3.5} rx={0.3}
                fill={['rgba(255,185,35,0.9)','rgba(200,150,25,0.55)','rgba(55,45,8,0.3)'][i%3]}/>
            ))}
            {/* Windows row 2 */}
            {[30.5,36,41.5,47,52.5,58].map((x,i)=>(
              <rect key={`w2${i}`} x={x} y={60} width={3.5} height={3.5} rx={0.3}
                fill={['rgba(55,45,8,0.3)','rgba(255,185,35,0.85)','rgba(175,135,20,0.5)'][i%3]}/>
            ))}
            {/* Chimney stacks */}
            <rect x="30.5" y="36" width="2.5" height="12.5" fill="#161410"/>
            <rect x="36" y="32" width="2.5" height="16.5" fill="#161410"/>
            <rect x="61" y="38" width="2.5" height="10.5" fill="#161410"/>

            {/* ── ELECTRICAL SUBSTATION (lower left) ── */}
            <rect x="0" y="62" width="24" height="16" fill="#0e0c08" stroke="#1a1810" strokeWidth="0.3"/>
            {[1.5,6.5,12,17.5].map((x,i)=>(
              <rect key={`tr${i}`} x={x} y={64} width={4} height={10} rx={0.5} fill="#181612" stroke="#242216" strokeWidth="0.3"/>
            ))}
            {[3.5,8.5,14,19.5].map((x,i)=>(
              <g key={`ins${i}`}>
                <circle cx={x} cy={63.5} r={0.9} fill="#fde047" filter="url(#e3gy)" className="electric-node-sub"/>
                <line x1={x} y1={63.5} x2={x} y2={64.5} stroke="#2a2820" strokeWidth="0.5"/>
              </g>
            ))}

            {/* ── PYLON 1 — far left (small) ── */}
            <line x1="11" y1="12" x2="11" y2="16.5" stroke="#2e2c1e" strokeWidth="0.7"/>
            <line x1="6" y1="18" x2="16" y2="18" stroke="#2e2c1e" strokeWidth="0.8"/>
            <line x1="11" y1="16.5" x2="11" y2="49" stroke="#2e2c1e" strokeWidth="0.7"/>
            <line x1="8.5" y1="23" x2="13.5" y2="30" stroke="#2e2c1e" strokeWidth="0.45"/>
            <line x1="8.5" y1="30" x2="13.5" y2="23" stroke="#2e2c1e" strokeWidth="0.45"/>
            <line x1="8.5" y1="33" x2="13.5" y2="40" stroke="#2e2c1e" strokeWidth="0.45"/>
            <line x1="8.5" y1="40" x2="13.5" y2="33" stroke="#2e2c1e" strokeWidth="0.45"/>
            <line x1="11" y1="43" x2="9" y2="49" stroke="#2e2c1e" strokeWidth="0.7"/>
            <line x1="11" y1="43" x2="13" y2="49" stroke="#2e2c1e" strokeWidth="0.7"/>
            <circle cx="6" cy="18" r="0.9" fill="#fde047" filter="url(#e3gy)" className="electric-node-1"/>
            <circle cx="16" cy="18" r="0.9" fill="#fde047" filter="url(#e3gy)" className="electric-node-1"/>
            <circle cx="11" cy="12.5" r="0.8" fill="#fde047" filter="url(#e3gy)" className="electric-node-1"/>

            {/* ── PYLON 2 — center (medium) ── */}
            <line x1="50" y1="5" x2="50" y2="9.5" stroke="#2e2c1e" strokeWidth="1"/>
            <line x1="44" y1="12.5" x2="56" y2="12.5" stroke="#2e2c1e" strokeWidth="1.1"/>
            <line x1="50" y1="9.5" x2="50" y2="52" stroke="#2e2c1e" strokeWidth="1"/>
            <line x1="46" y1="19" x2="54" y2="27" stroke="#2e2c1e" strokeWidth="0.65"/>
            <line x1="46" y1="27" x2="54" y2="19" stroke="#2e2c1e" strokeWidth="0.65"/>
            <line x1="46" y1="30" x2="54" y2="38" stroke="#2e2c1e" strokeWidth="0.65"/>
            <line x1="46" y1="38" x2="54" y2="30" stroke="#2e2c1e" strokeWidth="0.65"/>
            <line x1="50" y1="44" x2="46" y2="52" stroke="#2e2c1e" strokeWidth="1"/>
            <line x1="50" y1="44" x2="54" y2="52" stroke="#2e2c1e" strokeWidth="1"/>
            <circle cx="44" cy="12.5" r="1.1" fill="#fde047" filter="url(#e3gy)" className="electric-node-2"/>
            <circle cx="56" cy="12.5" r="1.1" fill="#fde047" filter="url(#e3gy)" className="electric-node-2"/>
            <circle cx="50" cy="5.5" r="1" fill="#fde047" filter="url(#e3gy)" className="electric-node-2"/>

            {/* ── PYLON 3 — right (large) ── */}
            <line x1="88" y1="-0.5" x2="88" y2="5" stroke="#2e2c1e" strokeWidth="1.4"/>
            <line x1="80" y1="8" x2="96" y2="8" stroke="#2e2c1e" strokeWidth="1.5"/>
            <line x1="88" y1="5" x2="88" y2="52" stroke="#2e2c1e" strokeWidth="1.4"/>
            <line x1="83.5" y1="14" x2="92.5" y2="23" stroke="#2e2c1e" strokeWidth="0.9"/>
            <line x1="83.5" y1="23" x2="92.5" y2="14" stroke="#2e2c1e" strokeWidth="0.9"/>
            <line x1="83.5" y1="27" x2="92.5" y2="36" stroke="#2e2c1e" strokeWidth="0.9"/>
            <line x1="83.5" y1="36" x2="92.5" y2="27" stroke="#2e2c1e" strokeWidth="0.9"/>
            <line x1="88" y1="43" x2="84" y2="52" stroke="#2e2c1e" strokeWidth="1.4"/>
            <line x1="88" y1="43" x2="92" y2="52" stroke="#2e2c1e" strokeWidth="1.4"/>
            <circle cx="80" cy="8" r="1.5" fill="#fde047" filter="url(#e3gy)" className="electric-node-3"/>
            <circle cx="96" cy="8" r="1.5" fill="#fde047" filter="url(#e3gy)" className="electric-node-3"/>
            <circle cx="88" cy="0.2" r="1.3" fill="#fde047" filter="url(#e3gy)" className="electric-node-3"/>

            {/* ── POWER LINES ── */}
            {/* Top wires peak-to-peak */}
            <path d="M 11 12.5 C 28 11 40 7.5 50 5.5" fill="none" stroke="#1c1a10" strokeWidth="0.5"/>
            <path d="M 50 5.5 C 65 4 76 2.5 88 0" fill="none" stroke="#1c1a10" strokeWidth="0.5"/>
            {/* Left crossarm wires */}
            <path d="M 6 18 C 22 19.5 36 15.5 44 12.5" fill="none" stroke="#1c1a10" strokeWidth="0.45"/>
            <path d="M 16 18 C 30 19.5 40 16 44 12.5" fill="none" stroke="#1c1a10" strokeWidth="0.4"/>
            {/* Right crossarm wires */}
            <path d="M 56 12.5 C 66 12 74 10.5 80 8" fill="none" stroke="#1c1a10" strokeWidth="0.45"/>
            <path d="M 56 12.5 C 68 11.5 78 10 96 8" fill="none" stroke="#1c1a10" strokeWidth="0.4"/>
            {/* Off-screen continuations */}
            <path d="M 6 18 C 3.5 22 1.5 28 0 36" fill="none" stroke="#1c1a10" strokeWidth="0.4"/>
            <path d="M 96 8 C 98 13 99 20 100 28" fill="none" stroke="#1c1a10" strokeWidth="0.4"/>

            {/* ── ELECTRIC ARC — animated, between pylon1 and pylon2 ── */}
            <path d="M 11 13 L 18 11 L 23 14 L 30 9.5 L 37 12.5 L 43 9 L 50 5.5"
              fill="none" stroke="#fde047" strokeWidth="0.65"
              className="electric-arc-flicker"
              style={{ filter: 'drop-shadow(0 0 1.5px #facc15)' }}
            />

            {/* ── WARNING LIGHTS — red blinking on structures ── */}
            <circle cx="16" cy="25.5" r="1.3" fill="#ff2c14" filter="url(#e3gr)" className="warning-blink"/>
            <circle cx="80" cy="17.5" r="1.6" fill="#ff2c14" filter="url(#e3gr)" className="warning-blink-2"/>
            <circle cx="36.5" cy="31.5" r="1" fill="#ff2c14" filter="url(#e3gr)" className="warning-blink"/>

            {/* ── GROUND ── */}
            <rect x="0" y="78" width="100" height="22" fill="#090908"/>
            <line x1="0" y1="78" x2="100" y2="78" stroke="#1c1a0c" strokeWidth="0.5"/>
            <line x1="0" y1="82" x2="100" y2="82" stroke="#141208" strokeWidth="1.5"/>
            <line x1="18" y1="87" x2="66" y2="87" stroke="#101008" strokeWidth="1.2"/>
          </svg>
        </>
      )}

      {/* ZONE 5 — Tour Fantôme : single haunted Gothic tower */}
      {zoneId === 'zone5' && (
        <>
          {/* Moon */}
          <div className="absolute pointer-events-none" style={{
            right: '12%', top: '5%', width: 52, height: 52,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 38% 38%, #f1f5f9 0%, #cbd5e1 60%, #94a3b8 100%)',
            boxShadow: '0 0 50px 20px rgba(200,210,255,0.16)',
          }} />
          <svg className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <filter id="z5glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="1.5" result="b"/>
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <linearGradient id="z5stone" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#1e1a2e"/>
                <stop offset="50%" stopColor="#2a2440"/>
                <stop offset="100%" stopColor="#181428"/>
              </linearGradient>
              <linearGradient id="z5stoneV" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2a2440"/>
                <stop offset="100%" stopColor="#0d0b18"/>
              </linearGradient>
            </defs>

            {/* ── SINGLE TALL TOWER — centered ── */}
            {/* Tower body */}
            <rect x="38" y="25" width="24" height="53" fill="url(#z5stoneV)" stroke="#3a3050" strokeWidth="0.3"/>
            {/* Stone block texture */}
            {[35, 43, 51, 59, 67].map((y, i) => (
              <line key={`sh${i}`} x1="38" y1={y} x2="62" y2={y} stroke="#282040" strokeWidth="0.35" opacity="0.6"/>
            ))}
            {[38, 46, 54, 62].map((y, i) => (
              <line key={`sv${i}`} x1={i % 2 === 0 ? 50 : 44} y1={y} x2={i % 2 === 0 ? 50 : 44} y2={y + 8} stroke="#282040" strokeWidth="0.25" opacity="0.4"/>
            ))}
            {/* Wide battlements at top */}
            <rect x="35" y="15" width="30" height="12" fill="url(#z5stone)" stroke="#3a3050" strokeWidth="0.3"/>
            {[35, 41.5, 48, 54.5, 61].map((x, i) => (
              <rect key={`m${i}`} x={x} y="8" width="5" height="9" fill="url(#z5stone)" stroke="#3a3050" strokeWidth="0.3"/>
            ))}
            {/* Pointed spire on top center */}
            <polygon points="50,2 53,10 47,10" fill="#1a1628" stroke="#3a3050" strokeWidth="0.3"/>

            {/* ── WINDOWS ── */}
            {/* Upper arch window */}
            <rect x="46" y="28" width="8" height="11" rx="4" fill="#060412" stroke="#4c1d95" strokeWidth="0.5"/>
            <rect x="46" y="28" width="8" height="11" rx="4" fill="rgba(168,85,247,0.18)"/>
            {/* Middle arch window */}
            <rect x="46" y="44" width="8" height="11" rx="4" fill="#060412" stroke="#4c1d95" strokeWidth="0.5"/>
            <rect x="46" y="44" width="8" height="11" rx="4" fill="rgba(139,92,246,0.14)"/>
            {/* Lower arch window */}
            <rect x="47" y="60" width="6" height="8" rx="3" fill="#060412" stroke="#4c1d95" strokeWidth="0.4"/>
            <rect x="47" y="60" width="6" height="8" rx="3" fill="rgba(168,85,247,0.1)"/>
            {/* Window glows */}
            <ellipse cx="50" cy="33" rx="6" ry="4" fill="rgba(168,85,247,0.1)" filter="url(#z5glow)" className="warning-blink-2"/>
            <ellipse cx="50" cy="49" rx="6" ry="4" fill="rgba(139,92,246,0.08)" filter="url(#z5glow)" className="warning-blink"/>

            {/* ── ENTRANCE ARCH ── */}
            <path d="M 44 78 L 44 70 A 6 6 0 0 1 56 70 L 56 78 Z" fill="#060412" stroke="#3a3050" strokeWidth="0.3"/>

            {/* ── GRAVESTONES ── */}
            {[6, 14, 22, 70, 80, 90].map((x, i) => (
              <g key={`grave${i}`}>
                <rect x={x} y={74 - (i % 2) * 2} width={5} height={6.5} rx={2.5} fill="#1a1628" stroke="#3a3050" strokeWidth="0.4"/>
                <line x1={x+2.5} y1={75 - (i%2)*2} x2={x+2.5} y2={79 - (i%2)*2} stroke="#2e2840" strokeWidth="0.45"/>
                <line x1={x+0.8} y1={77 - (i%2)*2} x2={x+4.2} y2={77 - (i%2)*2} stroke="#2e2840" strokeWidth="0.45"/>
              </g>
            ))}

            {/* ── DEAD TREES ── */}
            <line x1="10" y1="78" x2="10" y2="32" stroke="#1a1628" strokeWidth="1.3"/>
            <line x1="10" y1="48" x2="3" y2="37" stroke="#1a1628" strokeWidth="0.9"/>
            <line x1="10" y1="40" x2="17" y2="30" stroke="#1a1628" strokeWidth="0.8"/>
            <line x1="10" y1="35" x2="5" y2="28" stroke="#1a1628" strokeWidth="0.6"/>
            <line x1="90" y1="78" x2="90" y2="36" stroke="#1a1628" strokeWidth="1.3"/>
            <line x1="90" y1="52" x2="97" y2="40" stroke="#1a1628" strokeWidth="0.9"/>
            <line x1="90" y1="43" x2="83" y2="33" stroke="#1a1628" strokeWidth="0.8"/>
            <line x1="90" y1="38" x2="95" y2="30" stroke="#1a1628" strokeWidth="0.6"/>

            {/* ── GROUND ── */}
            <rect x="0" y="78" width="100" height="22" fill="#0d0b18"/>
            <path d="M 0 78 Q 25 75 50 78 Q 75 81 100 78 L 100 83 Q 75 86 50 83 Q 25 80 0 83 Z" fill="#181428" opacity="0.5"/>
          </svg>
          {/* Ghost wisps */}
          {WISPS.map((w, i) => (
            <div key={i} className="absolute pointer-events-none rounded-full" style={{
              left: `${w.x}%`, top: `${w.y}%`,
              width: 18 + (i % 3) * 8, height: 18 + (i % 3) * 8,
              background: 'radial-gradient(circle, rgba(180,150,255,0.22), transparent)',
              '--gx': `${w.gx}px`, '--gx2': `${w.gx2}px`,
              animation: `ghost-drift ${w.duration}s ease-in-out infinite`,
              animationDelay: `${w.delay}s`,
            } as React.CSSProperties} />
          ))}
        </>
      )}

      {/* INDOOR — zone6 Sylphe SARL psychic corporate lab */}
      {zoneId === 'zone6' && (
        <>
          <svg className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <filter id="z6glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="1.2" result="b"/>
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <linearGradient id="z6wall" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#141830"/>
                <stop offset="100%" stopColor="#0d1020"/>
              </linearGradient>
              <linearGradient id="z6ceil" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0a0c1a"/>
                <stop offset="100%" stopColor="#141830"/>
              </linearGradient>
              <linearGradient id="z6floor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1a1e36"/>
                <stop offset="100%" stopColor="#0d1020"/>
              </linearGradient>
            </defs>

            {/* Ceiling panel */}
            <rect x="0" y="0" width="100" height="10" fill="url(#z6ceil)"/>
            <line x1="0" y1="10" x2="100" y2="10" stroke="#2a2e50" strokeWidth="0.5"/>
            {/* Ceiling light fixtures */}
            {[10, 30, 50, 70, 90].map((x, i) => (
              <g key={`light${i}`}>
                <rect x={x-2} y="9" width="4" height="1.5" fill="#232840"/>
                <rect x={x-3} y="10" width="6" height="0.8" rx="0.3" fill="#c7d2fe"/>
                <rect x={x-3} y="10" width="6" height="0.8" rx="0.3" fill="rgba(199,210,254,0.3)" filter="url(#z6glow)"/>
              </g>
            ))}

            {/* Back wall */}
            <rect x="0" y="10" width="100" height="55" fill="url(#z6wall)"/>

            {/* Sylphe SARL sign */}
            <rect x="30" y="12" width="40" height="8" rx="1" fill="#0a0c1a" stroke="#3730a3" strokeWidth="0.4"/>
            <rect x="31" y="13" width="38" height="6" rx="0.8" fill="rgba(99,102,241,0.15)"/>

            {/* Tall windows (floor-to-ceiling style) */}
            {[2, 19, 62, 79].map((x, i) => (
              <g key={`twin${i}`}>
                <rect x={x} y="13" width="14" height="42" rx="0.5" fill="#0d1020" stroke="#2e3460" strokeWidth="0.5"/>
                {/* Window panes */}
                <rect x={x+1} y="14" width="6" height="20" fill={i % 2 === 0 ? 'rgba(99,102,241,0.12)' : 'rgba(79,70,229,0.08)'}/>
                <rect x={x+8} y="14" width="5" height="20" fill="rgba(79,70,229,0.06)"/>
                <rect x={x+1} y="35" width="6" height="19" fill="rgba(79,70,229,0.06)"/>
                <rect x={x+8} y="35" width="5" height="19" fill={i % 2 === 0 ? 'rgba(99,102,241,0.1)' : 'rgba(79,70,229,0.06)'}/>
                {/* Window glow */}
                {i % 2 === 0 && <rect x={x} y="13" width="14" height="42" rx="0.5" fill="rgba(99,102,241,0.06)" filter="url(#z6glow)"/>}
              </g>
            ))}

            {/* Monitor/screen panels on the wall */}
            {[38, 54].map((x, i) => (
              <g key={`screen${i}`}>
                <rect x={x} y="22" width="14" height="9" rx="0.8" fill="#060810" stroke="#312e81" strokeWidth="0.4"/>
                <rect x={x+1} y="23" width="12" height="7" rx="0.5"
                  fill={i === 0 ? 'rgba(99,102,241,0.35)' : 'rgba(168,85,247,0.2)'}/>
                {/* Screen data lines */}
                {[24.5, 26, 27.5, 29].map((y, li) => (
                  <line key={li} x1={x+2} y1={y} x2={x+2+(li%3===0?8:li%3===1?5:6)} y2={y}
                    stroke={i === 0 ? '#818cf8' : '#c084fc'} strokeWidth="0.35" opacity="0.8"/>
                ))}
              </g>
            ))}

            {/* Lab equipment — tanks and machinery */}
            {/* Left tank */}
            <rect x="0" y="35" width="10" height="30" rx="1" fill="#0d1020" stroke="#2e3460" strokeWidth="0.4"/>
            <rect x="1" y="36" width="8" height="28" rx="0.8" fill="rgba(99,102,241,0.08)"/>
            {/* Bubbles in tank */}
            {[3, 5, 7].map((x, i) => (
              <circle key={i} cx={x} cy={55 - i * 5} r="0.8" fill="rgba(148,163,184,0.4)" filter="url(#z6glow)"
                style={{ animation: `ripple ${1.8 + i * 0.5}s ease-out infinite`, animationDelay: `${i * 0.7}s` }}/>
            ))}
            {/* Right console */}
            <rect x="90" y="38" width="10" height="27" rx="1" fill="#0d1020" stroke="#2e3460" strokeWidth="0.4"/>
            {[41, 45, 49, 53].map((y, i) => (
              <circle key={i} cx="95" cy={y} r="1.2"
                fill={['#4ade80','#f87171','#fbbf24','#a78bfa'][i]}
                style={{ animation: `warning-blink ${1.2 + i * 0.3}s ease-in-out infinite`, animationDelay: `${i * 0.4}s` }}/>
            ))}

            {/* Floor */}
            <rect x="0" y="65" width="100" height="35" fill="url(#z6floor)"/>
            <line x1="0" y1="65" x2="100" y2="65" stroke="#2a2e50" strokeWidth="0.5"/>
            {/* Floor tiles grid */}
            {[0, 16.6, 33.3, 50, 66.6, 83.3].map((x, i) => (
              <line key={`ft${i}`} x1={x} y1="65" x2={x} y2="100" stroke="#1a1e30" strokeWidth="0.3" opacity="0.5"/>
            ))}
            {/* Floor reflection of lights */}
            {[10, 30, 50, 70, 90].map((x, i) => (
              <ellipse key={`ref${i}`} cx={x} cy="67" rx="8" ry="2"
                fill="rgba(199,210,254,0.06)" filter="url(#z6glow)"/>
            ))}

            {/* Floating psychic orbs */}
            {[22, 50, 76].map((x, i) => (
              <circle key={`orb${i}`} cx={x} cy={45 + (i % 2) * 8} r={3 + i}
                fill="none" stroke={['rgba(168,85,247,0.5)','rgba(99,102,241,0.4)','rgba(168,85,247,0.3)'][i]}
                strokeWidth="0.6" filter="url(#z6glow)"
                style={{
                  animation: `ghost-drift ${4 + i * 1.5}s ease-in-out infinite`,
                  animationDelay: `${i * 1.2}s`,
                }}/>
            ))}
          </svg>
        </>
      )}

      {/* WISPS — only for non-zone5 (zone5 has its own dedicated section) */}
      {cfg.particles === 'wisps' && zoneId !== 'zone5' && WISPS.map((w, i) => (
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

      {/* ZONE 7 — Île Cramoisie : volcanic island with lava */}
      {zoneId === 'zone7' && (
        <>
          {/* Distant ash cloud / smoke plume */}
          <div className="absolute pointer-events-none" style={{
            left: '30%', top: '2%', width: '40%', height: '30%',
            background: 'radial-gradient(ellipse at 50% 80%, rgba(60,20,5,0.55) 0%, rgba(40,15,5,0.3) 50%, transparent 100%)',
            animation: 'sway 8s ease-in-out infinite',
          }} />
          <svg className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <filter id="z7glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="b"/>
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <radialGradient id="z7lava" cx="50%" cy="0%" r="80%">
                <stop offset="0%" stopColor="#ff4500" stopOpacity="0.9"/>
                <stop offset="40%" stopColor="#dc2626" stopOpacity="0.7"/>
                <stop offset="100%" stopColor="#7c2d12" stopOpacity="0.5"/>
              </radialGradient>
              <linearGradient id="z7rock" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3d1a08"/>
                <stop offset="60%" stopColor="#2a1005"/>
                <stop offset="100%" stopColor="#1a0800"/>
              </linearGradient>
              <linearGradient id="z7rockside" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#1a0800"/>
                <stop offset="100%" stopColor="#3d1a08"/>
              </linearGradient>
            </defs>

            {/* ── VOLCANO ── */}
            {/* Far volcano silhouette */}
            <polygon points="70,78 82,25 94,78" fill="#1a0800" opacity="0.6"/>
            {/* Main volcano */}
            <polygon points="15,78 40,10 65,78" fill="url(#z7rock)" stroke="#2a1005" strokeWidth="0.3"/>
            {/* Volcano crater */}
            <ellipse cx="40" cy="11" rx="6" ry="2.5" fill="#0d0500" stroke="#3d1a08" strokeWidth="0.3"/>
            {/* Lava glow in crater */}
            <ellipse cx="40" cy="11" rx="5" ry="2" fill="#ff4500" opacity="0.7" filter="url(#z7glow)"/>
            {/* Lava flow 1 — down left slope */}
            <path d="M 37 14 C 33 22 28 32 25 42 C 22 52 20 62 19 72 L 24 72 C 25 62 27 52 30 42 C 33 32 37 22 40 14 Z"
              fill="url(#z7lava)" opacity="0.75"/>
            {/* Lava flow 2 — down right slope */}
            <path d="M 43 15 C 47 23 52 34 55 45 C 57 55 58 64 59 72 L 54 72 C 53 64 52 55 50 45 C 48 34 43 23 40 15 Z"
              fill="url(#z7lava)" opacity="0.55"/>
            {/* Rock texture lines on volcano */}
            {[30, 45, 58].map((y, i) => {
              const t = (y - 10) / 68;
              const xl = 40 - 25 * t + 1;
              const xr = 40 + 25 * t - 1;
              return <line key={i} x1={xl} y1={y} x2={xr} y2={y} stroke="#1a0800" strokeWidth="0.4" opacity="0.5"/>;
            })}

            {/* ── ROCKY ISLAND GROUND ── */}
            {/* Island base shape */}
            <path d="M 0 78 C 5 74 15 72 30 73 C 40 73 50 73 60 73 C 75 73 90 75 100 78 L 100 100 L 0 100 Z"
              fill="#1a0800"/>
            {/* Lava pool at base */}
            <ellipse cx="40" cy="77" rx="18" ry="3.5" fill="#dc2626" opacity="0.6" filter="url(#z7glow)"/>
            <ellipse cx="40" cy="77" rx="14" ry="2.5" fill="#ff4500" opacity="0.4"/>
            {/* Ground cracks with lava glow */}
            {[10, 65, 80].map((x, i) => (
              <g key={`crack${i}`}>
                <path d={`M ${x} 78 L ${x+3} 82 L ${x+1} 86 L ${x+4} 91`}
                  stroke="#ff4500" strokeWidth="0.8" opacity="0.5" fill="none"/>
                <path d={`M ${x} 78 L ${x+3} 82 L ${x+1} 86 L ${x+4} 91`}
                  stroke="#ff4500" strokeWidth="1.5" opacity="0.2" fill="none" filter="url(#z7glow)"/>
              </g>
            ))}
            {/* Small rocks */}
            {[5, 70, 84, 92].map((x, i) => (
              <ellipse key={`rock${i}`} cx={x} cy={76 + (i%2)*2} rx={3+i%2} ry={1.5}
                fill="#2a1005" stroke="#1a0800" strokeWidth="0.3"/>
            ))}

            {/* ── LAVA BUBBLES ── */}
            {LAVA_BUBBLES.slice(0, 6).map((b, i) => (
              <circle key={`lb${i}`} cx={18 + (b.x % 45)} cy={77 - (i%3)*0.5} r={1 + (i%3)*0.5}
                fill="#ff4500" opacity="0.8" filter="url(#z7glow)"
                style={{ animation: `lava-bubble ${b.duration}s ease-out infinite`, animationDelay: `${b.delay}s` }}/>
            ))}

            {/* ── ASH PARTICLES / EMBERS — small orange dots floating up ── */}
            {[38, 41, 36, 43, 40].map((x, i) => (
              <circle key={`em${i}`} cx={x + (i-2)*2} cy={8 + i*2} r="0.7"
                fill="#f97316" opacity="0.7"
                style={{ animation: `spark ${1.2 + i*0.4}s ease-out infinite`, animationDelay: `${i*0.3}s` }}/>
            ))}

            {/* ── ERUPTION GLOW ── */}
            <ellipse cx="40" cy="10" rx="18" ry="12" fill="rgba(255,69,0,0.07)" filter="url(#z7glow)"/>
          </svg>
          {/* Lava bubble divs for the ground pool */}
          {LAVA_BUBBLES.map((b, i) => (
            <div key={i} className="absolute pointer-events-none rounded-full" style={{
              left: `${20 + (b.x % 40)}%`,
              bottom: '21%',
              width: b.size * 0.7,
              height: b.size * 0.7,
              background: `radial-gradient(circle, rgba(255,${80 + i * 10},0,0.8), rgba(200,30,0,0.35))`,
              boxShadow: `0 0 6px 2px rgba(255,80,0,0.4)`,
              animation: `lava-bubble ${b.duration}s ease-out infinite`,
              animationDelay: `${b.delay}s`,
            }}/>
          ))}
        </>
      )}

      {/* ZONE 8 — Route Victoire : epic mountain path */}
      {zoneId === 'zone8' && (
        <>
          {/* Stars in sky */}
          {starsEls}
          <svg className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <filter id="z8glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="b"/>
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <linearGradient id="z8cliff" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1a1430"/>
                <stop offset="60%" stopColor="#120e22"/>
                <stop offset="100%" stopColor="#0a0818"/>
              </linearGradient>
              <linearGradient id="z8cliffR" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1e1838"/>
                <stop offset="60%" stopColor="#140e26"/>
                <stop offset="100%" stopColor="#0c0a1a"/>
              </linearGradient>
              <linearGradient id="z8path" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2a2048"/>
                <stop offset="100%" stopColor="#1a1430"/>
              </linearGradient>
              <radialGradient id="z8fog" cx="50%" cy="50%" r="60%">
                <stop offset="0%" stopColor="rgba(80,60,140,0.3)"/>
                <stop offset="100%" stopColor="rgba(20,10,40,0)"/>
              </radialGradient>
            </defs>

            {/* ── FAR MOUNTAIN PEAKS ── */}
            <polygon points="-5,60 10,30 25,55 40,20 55,48 70,15 85,42 100,25 105,60"
              fill="#0e0820" opacity="0.9"/>
            <polygon points="-5,65 8,40 18,60 32,28 46,55 60,22 74,48 90,18 100,38 105,65"
              fill="#130c28" opacity="0.8"/>

            {/* ── LEFT CLIFF WALL ── */}
            <path d="M -5 100 L -5 35 C 2 30 5 25 8 22 C 11 20 13 24 15 20 C 17 16 19 18 21 14 C 23 10 25 20 28 16 C 30 12 32 22 35 18 L 35 78 C 28 76 20 78 10 80 Z"
              fill="url(#z8cliff)"/>
            {/* Cliff ledge detail */}
            <path d="M -5 42 C 2 38 8 36 14 38 C 18 40 22 36 26 34"
              fill="none" stroke="#2a2040" strokeWidth="0.5" opacity="0.7"/>
            <path d="M 0 55 C 6 52 12 54 18 50"
              fill="none" stroke="#2a2040" strokeWidth="0.4" opacity="0.5"/>
            {/* Cracks in cliff */}
            <line x1="10" y1="35" x2="8" y2="48" stroke="#0a0818" strokeWidth="0.4" opacity="0.6"/>
            <line x1="22" y1="28" x2="20" y2="45" stroke="#0a0818" strokeWidth="0.3" opacity="0.5"/>

            {/* ── RIGHT CLIFF WALL ── */}
            <path d="M 105 100 L 105 28 C 98 24 95 20 92 17 C 89 14 87 18 84 15 C 81 12 79 20 76 18 C 73 16 71 22 68 20 C 65 18 64 26 65 32 L 65 78 C 72 76 82 78 92 82 Z"
              fill="url(#z8cliffR)"/>
            <path d="M 105 40 C 98 36 92 38 86 34 C 82 32 78 36 74 32"
              fill="none" stroke="#2a2040" strokeWidth="0.5" opacity="0.7"/>
            <line x1="90" y1="30" x2="92" y2="44" stroke="#0a0818" strokeWidth="0.4" opacity="0.6"/>
            <line x1="78" y1="25" x2="80" y2="40" stroke="#0a0818" strokeWidth="0.3" opacity="0.5"/>

            {/* ── STONE PATH ── */}
            {/* Path receding into distance */}
            <path d="M 35 100 C 38 88 42 82 44 75 C 46 68 47 62 48 56 C 49 50 49.5 44 50 38 L 50 38 C 50.5 44 51 50 52 56 C 53 62 54 68 56 75 C 58 82 62 88 65 100 Z"
              fill="url(#z8path)" opacity="0.8"/>
            {/* Stone slabs */}
            {[88, 82, 76, 70, 65, 61, 57].map((y, i) => {
              const w = 30 - i * 3.5;
              const cx = 50;
              return <line key={i} x1={cx - w/2} y1={y} x2={cx + w/2} y2={y}
                stroke="#1a1438" strokeWidth={0.6 - i*0.06} opacity={0.8 - i*0.08}/>;
            })}
            {/* Path edge glow */}
            <path d="M 35 100 C 38 88 42 82 44 75 C 46 68 47 62 48 56 C 49 50 49.5 44 50 38"
              fill="none" stroke="rgba(120,80,200,0.3)" strokeWidth="0.5"/>
            <path d="M 65 100 C 62 88 58 82 56 75 C 54 68 53 62 52 56 C 51 50 50.5 44 50 38"
              fill="none" stroke="rgba(120,80,200,0.3)" strokeWidth="0.5"/>

            {/* ── ANCIENT STONE PILLARS ── */}
            {[[20, 72, 8, 28], [26, 65, 7, 22], [74, 65, 7, 22], [80, 70, 8, 26]].map(([x, y, w, h], i) => (
              <g key={i}>
                <rect x={x - w/2} y={y - h} width={w} height={h} fill="#1a1438" stroke="#2a2050" strokeWidth="0.3"/>
                <rect x={x - w/2 - 1} y={y - h - 2} width={w + 2} height={3} fill="#221850" stroke="#2a2050" strokeWidth="0.3"/>
                {/* Rune glows on pillars */}
                <ellipse cx={x} cy={y - h/2} rx={1.5} ry={1}
                  fill="rgba(160,100,255,0.6)" filter="url(#z8glow)"
                  style={{ animation: `warning-blink ${2+i*0.5}s ease-in-out infinite`, animationDelay: `${i*0.6}s` }}/>
              </g>
            ))}

            {/* ── MYSTICAL ENERGY WISPS on path ── */}
            {[[42, 80], [50, 65], [58, 72], [46, 90]].map(([x, y], i) => (
              <ellipse key={i} cx={x} cy={y} rx="2.5" ry="1.5"
                fill="rgba(160,100,255,0.35)" filter="url(#z8glow)"
                style={{ animation: `ghost-drift ${3+i}s ease-in-out infinite`, animationDelay: `${i*0.8}s` }}/>
            ))}

            {/* ── GROUND ── */}
            <rect x="0" y="80" width="100" height="25" fill="#0a0818"/>
            <line x1="0" y1="80" x2="100" y2="80" stroke="#1a1438" strokeWidth="0.4"/>
          </svg>
          {/* Fog wisps */}
          {WISPS.map((w, i) => (
            <div key={i} className="absolute pointer-events-none rounded-full" style={{
              left: `${w.x}%`, top: `${w.y}%`,
              width: 30 + (i % 3) * 15, height: 20 + (i % 3) * 10,
              background: 'radial-gradient(circle, rgba(100,60,180,0.12), transparent)',
              '--gx': `${w.gx}px`, '--gx2': `${w.gx2}px`,
              animation: `ghost-drift ${w.duration * 1.4}s ease-in-out infinite`,
              animationDelay: `${w.delay}s`,
            } as React.CSSProperties} />
          ))}
        </>
      )}

      {/* ZONE LIBRE — shooting stars + secrets */}
      {zoneId === 'zone_libre' && (
        <>
          {starsEls}
          {/* Shooting stars */}
          {[0, 1, 2, 3].map(i => (
            <div
              key={`shoot${i}`}
              className="absolute pointer-events-none"
              style={{
                left: `${(i * 27 + 5) % 90}%`,
                top: `${(i * 19 + 3) % 40}%`,
                width: '80px',
                height: '2px',
                background: 'linear-gradient(to right, rgba(255,255,255,0), rgba(255,255,255,0.9), rgba(200,180,255,0.6))',
                borderRadius: '2px',
                transform: 'rotate(-20deg)',
                animation: `shooting-star ${6 + i * 4}s ease-in infinite`,
                animationDelay: `${i * 3.5}s`,
                boxShadow: '0 0 6px 1px rgba(200,180,255,0.4)',
              }}
            />
          ))}
          {/* Secret 1 — faint Mew silhouette */}
          <div className="absolute pointer-events-none" style={{
            right: '8%', top: '25%', opacity: 0.06,
            animation: 'ghost-drift 12s ease-in-out infinite',
            fontSize: 28,
          }}>
            🐱
          </div>
          {/* Secret 2 — mysterious floating question */}
          <div className="absolute pointer-events-none" style={{
            left: '4%', top: '35%', opacity: 0.05,
            animation: 'float 7s ease-in-out infinite',
            color: '#c084fc', fontWeight: 900, fontSize: 18,
          }}>?</div>
          {/* Secret 3 — ancient symbols */}
          <div className="absolute pointer-events-none" style={{
            left: '12%', bottom: '28%', opacity: 0.07,
            fontSize: 11, color: '#818cf8', letterSpacing: 2,
            animation: 'ghost-drift 9s ease-in-out infinite',
            animationDelay: '2s',
          }}>◈ ✦ ◈</div>
          {/* Secret 4 — distant orb */}
          <div className="absolute pointer-events-none rounded-full" style={{
            right: '15%', bottom: '32%',
            width: 8, height: 8,
            background: 'radial-gradient(circle, rgba(240,171,252,0.5), transparent)',
            animation: 'aura-pulse 4s ease-in-out infinite',
            animationDelay: '1s',
          }} />
        </>
      )}

      {/* STARS — night zones (not zone8 or zone_libre which have their own) */}
      {cfg.particles === 'stars' && zoneId !== 'zone8' && zoneId !== 'zone_libre' && starsEls}
    </div>
  );
}
