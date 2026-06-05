import { useEffect, useState } from 'react';

interface Props {
  username: string;
  onDone: () => void;
}

export function WelcomeAnimation({ username, onDone }: Props) {
  const [phase, setPhase] = useState<'clouds' | 'text' | 'fade'>('clouds');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('text'), 1200);
    const t2 = setTimeout(() => setPhase('fade'), 3200);
    const t3 = setTimeout(() => onDone(), 4200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #87ceeb 0%, #b0e0f5 50%, #e0f4ff 100%)',
        opacity: phase === 'fade' ? 0 : 1,
        transition: phase === 'fade' ? 'opacity 1s ease-out' : 'none',
        pointerEvents: phase === 'fade' ? 'none' : 'auto',
      }}
    >
      {/* Left cloud */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: phase === 'clouds' ? '5%' : '-60%',
        transition: 'left 1.1s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        fontSize: '10rem',
        lineHeight: 1,
        userSelect: 'none',
        filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))',
      }}>
        ☁️
      </div>
      <div style={{
        position: 'absolute',
        top: '8%',
        left: phase === 'clouds' ? '15%' : '-80%',
        transition: 'left 1.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        fontSize: '7rem',
        lineHeight: 1,
        userSelect: 'none',
        filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.1))',
      }}>
        ☁️
      </div>

      {/* Right cloud */}
      <div style={{
        position: 'absolute',
        top: '18%',
        right: phase === 'clouds' ? '3%' : '-60%',
        transition: 'right 1.1s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        fontSize: '9rem',
        lineHeight: 1,
        userSelect: 'none',
        filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))',
      }}>
        ☁️
      </div>
      <div style={{
        position: 'absolute',
        top: '6%',
        right: phase === 'clouds' ? '12%' : '-80%',
        transition: 'right 1.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        fontSize: '6rem',
        lineHeight: 1,
        userSelect: 'none',
        filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.1))',
      }}>
        ☁️
      </div>

      {/* Bottom clouds */}
      <div style={{
        position: 'absolute',
        bottom: '15%',
        left: phase === 'clouds' ? '10%' : '-70%',
        transition: 'left 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        fontSize: '8rem',
        lineHeight: 1,
        userSelect: 'none',
        filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.12))',
      }}>
        ☁️
      </div>
      <div style={{
        position: 'absolute',
        bottom: '12%',
        right: phase === 'clouds' ? '8%' : '-70%',
        transition: 'right 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        fontSize: '8rem',
        lineHeight: 1,
        userSelect: 'none',
        filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.12))',
      }}>
        ☁️
      </div>

      {/* Center content */}
      <div style={{
        textAlign: 'center',
        opacity: phase === 'text' || phase === 'fade' ? 1 : 0,
        transform: phase === 'text' || phase === 'fade' ? 'scale(1) translateY(0)' : 'scale(0.7) translateY(20px)',
        transition: 'opacity 0.6s ease-out, transform 0.6s cubic-bezier(0.34,1.56,0.64,1)',
        zIndex: 10,
      }}>
        <div style={{
          fontSize: '4rem',
          fontWeight: 900,
          color: '#1a6b3c',
          textShadow: '0 2px 0 rgba(255,255,255,0.8), 0 4px 12px rgba(0,0,0,0.2)',
          letterSpacing: '0.05em',
          marginBottom: 8,
        }}>
          Bienvenue !
        </div>
        <div style={{
          fontSize: '1.4rem',
          color: '#2d5a3d',
          fontWeight: 700,
          textShadow: '0 1px 4px rgba(255,255,255,0.6)',
        }}>
          {username}
        </div>
        <div style={{ fontSize: '2.5rem', marginTop: 16, animation: 'bounce-pokemon 1s ease-in-out infinite' }}>
          🎉
        </div>
      </div>
    </div>
  );
}
