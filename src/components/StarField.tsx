const STARS = Array.from({ length: 120 }, (_, i) => ({
  x: (i * 137.508) % 100,
  y: (i * 97.3) % 100,
  size: 0.5 + (i % 7) * 0.35,
  opacity: 0.15 + (i % 10) * 0.08,
  delay: (i % 7) * 0.9,
  duration: 1.5 + (i % 8) * 0.6,
}));

const FIREFLIES = Array.from({ length: 20 }, (_, i) => ({
  x: (i * 73.4 + 5) % 90,
  y: (i * 53.7 + 10) % 80,
  fx: ((i * 37.1) % 80) - 40,
  fy: ((i * 29.3) % 80) - 40,
  duration: 4 + (i % 6) * 1.5,
  delay: (i % 7) * 0.8,
}));

export function StarField() {
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #050514 0%, #0a0a2e 25%, #12103a 50%, #0a1428 75%, #060e1a 100%)',
      }}
    >
      {/* Subtle fog layers */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 40% at 20% 60%, rgba(30,10,60,0.3) 0%, transparent 100%)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 30% at 80% 30%, rgba(10,30,60,0.25) 0%, transparent 100%)',
        }}
      />

      {/* Stars */}
      {STARS.map((star, i) => (
        <div
          key={`star-${i}`}
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
      ))}

      {/* Fireflies */}
      {FIREFLIES.map((ff, i) => (
        <div
          key={`ff-${i}`}
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
    </div>
  );
}
