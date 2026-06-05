import { useState, useEffect, useCallback } from 'react';
import { logoutUser } from '../lib/auth';
import { PlayersPanel } from './PlayersPanel';

interface Props {
  username: string;
  onPlay: () => void;
  onProfile: () => void;
  onLogout: () => void;
  onWrapped: () => void;
}

const WANDER_POKEMON = [1, 4, 7, 12, 16, 25, 35, 39, 52, 54, 58, 79, 81, 92, 113, 131, 133, 137, 143, 147];

interface Wanderer {
  id: number;
  pokemonId: number;
  x: number;      // % across screen
  y: number;      // % down screen
  targetX: number;
  targetY: number;
  facingRight: boolean;
  size: number;   // px
  speed: number;  // transition seconds
}

function useWanderers(count = 8) {
  const [list, setList] = useState<Wanderer[]>(() =>
    Array.from({ length: count }, (_, i) => {
      const x = 5 + Math.random() * 88;
      const y = 10 + Math.random() * 78;
      return {
        id: i,
        pokemonId: WANDER_POKEMON[Math.floor(Math.random() * WANDER_POKEMON.length)],
        x, y, targetX: x, targetY: y,
        facingRight: Math.random() > 0.5,
        size: 40 + Math.floor(Math.random() * 24),
        speed: 3 + Math.random() * 4,
      };
    })
  );

  useEffect(() => {
    const id = setInterval(() => {
      setList(prev => prev.map(p => {
        const nx = 5 + Math.random() * 88;
        const ny = 10 + Math.random() * 78;
        return { ...p, x: p.targetX, y: p.targetY, targetX: nx, targetY: ny, facingRight: nx > p.x };
      }));
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return list;
}

export function HomeScreen({ username, onPlay, onProfile, onLogout, onWrapped }: Props) {
  const [showPlayers, setShowPlayers] = useState(false);
  const wanderers = useWanderers(10);

  const handleLogout = useCallback(async () => {
    await logoutUser();
    onLogout();
  }, [onLogout]);

  const isPokelian = username.toLowerCase() === 'pokelian';

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, #1a6b3c 0%, #2d9b5a 25%, #4ab86b 45%, #7dd87a 65%, #a8e88a 80%, #d4f5a0 100%)',
      }}
    >
      {/* Decorative clouds */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div style={{ position: 'absolute', top: '3%', left: '5%', fontSize: '5rem', opacity: 0.18, animation: 'sway 8s ease-in-out infinite' }}>☁️</div>
        <div style={{ position: 'absolute', top: '6%', right: '8%', fontSize: '7rem', opacity: 0.15, animation: 'sway 11s ease-in-out infinite reverse' }}>☁️</div>
        <div style={{ position: 'absolute', top: '1%', left: '40%', fontSize: '4rem', opacity: 0.12, animation: 'sway 9s ease-in-out infinite' }}>☁️</div>
        {/* Grass patches bottom */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(to top, rgba(26,107,60,0.4) 0%, transparent 100%)', borderRadius: '60% 60% 0 0' }} />
        {/* Sun */}
        <div style={{ position: 'absolute', top: '5%', right: '12%', width: 60, height: 60, borderRadius: '50%', background: 'radial-gradient(circle, #ffe566 0%, #ffcc00 60%, transparent 100%)', boxShadow: '0 0 40px 15px rgba(255,220,0,0.35)', animation: 'aura-pulse 3s ease-in-out infinite' }} />
      </div>

      {/* Wandering pokemon — all over the screen */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {wanderers.map(p => (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: `${p.targetX}%`,
              top: `${p.targetY}%`,
              transform: 'translate(-50%, -50%)',
              transition: `left ${p.speed}s ease-in-out, top ${p.speed}s ease-in-out`,
              zIndex: 1,
            }}
          >
            <img
              src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.pokemonId}.png`}
              width={p.size}
              height={p.size}
              style={{
                imageRendering: 'pixelated',
                transform: p.facingRight ? 'scaleX(-1)' : 'scaleX(1)',
                animation: `bounce-pokemon ${1.5 + p.id * 0.18}s ease-in-out infinite`,
                filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.25))',
                opacity: 0.85,
              }}
              alt=""
            />
          </div>
        ))}
      </div>

      {/* Wrapped floating bubble — top right */}
      <button
        onClick={onWrapped}
        className="absolute top-4 right-4 z-20 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold transition-all active:scale-95"
        style={{
          background: 'rgba(255,255,255,0.85)',
          color: '#ec4899',
          boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
          backdropFilter: 'blur(4px)',
          animation: 'bounce-pokemon 2.5s ease-in-out infinite',
        }}
      >
        🎁 <span>Récap</span>
      </button>

      {/* Main content */}
      <div className="relative z-10 flex flex-col flex-1 items-center justify-center px-6 gap-5">
        {/* Logo + greeting */}
        <div className="text-center mb-2">
          <h1
            className="text-6xl font-black tracking-wider mb-1"
            style={{
              color: '#fff',
              textShadow: '0 3px 0 rgba(0,0,0,0.18), 0 0 30px rgba(255,255,255,0.4)',
              letterSpacing: '0.06em',
            }}
          >
            KATCHII
          </h1>
          <p className="text-base font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
            Bonjour,{' '}
            <span className="font-black" style={{ color: isPokelian ? '#ff6b6b' : '#ffe566' }}>
              {username}
            </span>{' '}!
          </p>
        </div>

        {/* Big JOUER button */}
        <button
          onClick={onPlay}
          className="w-full rounded-2xl py-5 font-black text-2xl tracking-wide transition-all active:scale-95 flex items-center justify-center gap-3"
          style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #ef7c00 100%)',
            color: '#fff',
            boxShadow: '0 6px 24px rgba(245,158,11,0.5), 0 2px 0 rgba(0,0,0,0.12)',
          }}
        >
          <span style={{ fontSize: '1.6rem' }}>🎮</span> Jouer
        </button>

        {/* Half-size: Profil + Joueurs */}
        <div className="grid grid-cols-2 gap-3 w-full">
          <button
            onClick={onProfile}
            className="rounded-2xl py-4 font-bold text-base transition-all active:scale-95 flex flex-col items-center gap-1.5"
            style={{
              background: 'rgba(255,255,255,0.25)',
              color: '#fff',
              border: '2px solid rgba(255,255,255,0.45)',
              backdropFilter: 'blur(4px)',
              boxShadow: '0 3px 12px rgba(0,0,0,0.1)',
            }}
          >
            <span className="text-2xl">👤</span>
            <span>Profil</span>
          </button>
          <button
            onClick={() => setShowPlayers(true)}
            className="rounded-2xl py-4 font-bold text-base transition-all active:scale-95 flex flex-col items-center gap-1.5"
            style={{
              background: 'rgba(255,255,255,0.25)',
              color: '#fff',
              border: '2px solid rgba(255,255,255,0.45)',
              backdropFilter: 'blur(4px)',
              boxShadow: '0 3px 12px rgba(0,0,0,0.1)',
            }}
          >
            <span className="text-2xl">👥</span>
            <span>Joueurs</span>
          </button>
        </div>

        {/* Paramètres — same size as Jouer */}
        <button
          className="w-full rounded-2xl py-5 font-bold text-xl transition-all active:scale-95 flex items-center justify-center gap-3"
          style={{
            background: 'rgba(255,255,255,0.22)',
            color: '#fff',
            border: '2px solid rgba(255,255,255,0.4)',
            backdropFilter: 'blur(4px)',
            boxShadow: '0 3px 14px rgba(0,0,0,0.1)',
          }}
        >
          <span style={{ fontSize: '1.4rem' }}>⚙️</span> Paramètres
        </button>

        {/* Se déconnecter */}
        <button
          onClick={handleLogout}
          className="w-full rounded-2xl py-3 font-bold text-base transition-all active:scale-95"
          style={{
            background: 'rgba(239,68,68,0.15)',
            color: 'rgba(255,120,120,1)',
            border: '2px solid rgba(239,68,68,0.3)',
            backdropFilter: 'blur(4px)',
          }}
        >
          Se déconnecter
        </button>
      </div>

      {showPlayers && <PlayersPanel onClose={() => setShowPlayers(false)} />}
    </div>
  );
}
