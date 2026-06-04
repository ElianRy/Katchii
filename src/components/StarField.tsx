const STARS = Array.from({ length: 120 }, (_, i) => ({
  x: (i * 137.508) % 100,
  y: (i * 97.3) % 100,
  size: 0.5 + (i % 5) * 0.4,
  opacity: 0.2 + (i % 8) * 0.1,
  delay: (i % 5) * 1.1,
  duration: 2 + (i % 6) * 0.5,
}));

export function StarField() {
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        background: 'linear-gradient(to bottom, #0a0a2e 0%, #1a1040 40%, #0d1f3c 100%)',
      }}
    >
      {STARS.map((star, i) => (
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
      ))}
    </div>
  );
}
