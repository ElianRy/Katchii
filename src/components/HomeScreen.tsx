import { useState, useEffect, useCallback } from 'react';
import { logoutUser } from '../lib/auth';
import { PlayersPanel } from './PlayersPanel';

interface Props {
  username: string;
  onPlay: () => void;
  onProfile: () => void;
  onLogout: () => void;
  onWrapped: () => void;
  onSettings: () => void;
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
      // stagger initial targets so they start moving immediately
      const tx = 5 + Math.random() * 88;
      const ty = 10 + Math.random() * 78;
      return {
        id: i,
        pokemonId: WANDER_POKEMON[Math.floor(Math.random() * WANDER_POKEMON.length)],
        x, y, targetX: tx, targetY: ty,
        facingRight: tx > x,
        size: 40 + Math.floor(Math.random() * 24),
        speed: 3 + Math.random() * 3,
      };
    })
  );

  useEffect(() => {
    // Each pokemon gets its own interval so they never pause together
    const ids = list.map(p =>
      setInterval(() => {
        setList(prev => prev.map(w => {
          if (w.id !== p.id) return w;
          const nx = 5 + Math.random() * 88;
          const ny = 10 + Math.random() * 78;
          return { ...w, x: w.targetX, y: w.targetY, targetX: nx, targetY: ny, facingRight: nx > w.targetX };
        }));
      }, 2500 + p.id * 400 + Math.random() * 1500)
    );
    return () => ids.forEach(clearInterval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return list;
}

export function HomeScreen({ username, onPlay, onProfile, onLogout, onWrapped, onSettings }: Props) {
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
        background: 'linear-gradient(180deg, #1a78c2 0%, #3a9fd8 30%, #6ec6f0 60%, #b8e4f8 85%, #dff2fc 100%)',
      }}
    >
      {/* Sky decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Sun */}
        <div style={{
          position: 'absolute', top: '6%', right: '10%',
          width: 80, height: 80, borderRadius: '50%',
          background: 'radial-gradient(circle, #fff7a0 0%, #ffe234 50%, #ffaa00 100%)',
          boxShadow: '0 0 60px 25px rgba(255,220,0,0.55), 0 0 120px 60px rgba(255,180,0,0.2)',
          animation: 'aura-pulse 4s ease-in-out infinite',
        }} />
        {/* Cloud 1 — drifts left to right slowly */}
        <div style={{
          position: 'absolute', top: '8%', fontSize: '6rem', opacity: 0.9,
          animation: 'cloud-drift-1 28s linear infinite',
          whiteSpace: 'nowrap',
        }}>☁️</div>
        {/* Cloud 2 */}
        <div style={{
          position: 'absolute', top: '18%', fontSize: '8rem', opacity: 0.85,
          animation: 'cloud-drift-2 38s linear infinite',
          whiteSpace: 'nowrap',
        }}>☁️</div>
        {/* Cloud 3 */}
        <div style={{
          position: 'absolute', top: '5%', fontSize: '5rem', opacity: 0.75,
          animation: 'cloud-drift-3 22s linear infinite',
          whiteSpace: 'nowrap',
        }}>☁️</div>
        {/* Cloud 4 */}
        <div style={{
          position: 'absolute', top: '28%', fontSize: '9rem', opacity: 0.8,
          animation: 'cloud-drift-4 45s linear infinite',
          whiteSpace: 'nowrap',
        }}>☁️</div>
        {/* Horizon glow */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 120,
          background: 'linear-gradient(to top, rgba(255,200,80,0.25) 0%, transparent 100%)',
        }} />
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
              textShadow: '0 4px 0 rgba(0,0,0,0.25), 0 0 40px rgba(255,255,255,0.5), 0 2px 8px rgba(0,0,0,0.3)',
              letterSpacing: '0.06em',
            }}
          >
            KATCHII
          </h1>
          <p
            className="text-base font-semibold"
            style={{ color: 'rgba(255,255,255,0.95)', textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}
          >
            Bonjour,{' '}
            <span
              className="font-black"
              style={{
                color: isPokelian ? '#ff6b6b' : '#ffe566',
                textShadow: '0 2px 6px rgba(0,0,0,0.4)',
              }}
            >
              {username}
            </span>{' '}!
          </p>
        </div>

        {/* Buttons — capped width so they don't span the full screen */}
        <div className="w-full flex flex-col items-center gap-5" style={{ maxWidth: 360 }}>
          {/* Big JOUER button */}
          <button
            onClick={onPlay}
            className="w-full rounded-2xl py-5 font-black text-2xl tracking-wide transition-all active:scale-95 flex items-center justify-center gap-3"
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #ef7c00 100%)',
              color: '#fff',
              boxShadow: '0 6px 24px rgba(245,158,11,0.5), 0 2px 0 rgba(0,0,0,0.18)',
              textShadow: '0 1px 4px rgba(0,0,0,0.25)',
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
                background: 'rgba(255,255,255,0.28)',
                color: '#fff',
                border: '2px solid rgba(255,255,255,0.55)',
                backdropFilter: 'blur(6px)',
                boxShadow: '0 3px 12px rgba(0,0,0,0.15)',
                textShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }}
            >
              <span className="text-2xl">👤</span>
              <span>Profil</span>
            </button>
            <button
              onClick={() => setShowPlayers(true)}
              className="rounded-2xl py-4 font-bold text-base transition-all active:scale-95 flex flex-col items-center gap-1.5"
              style={{
                background: 'rgba(255,255,255,0.28)',
                color: '#fff',
                border: '2px solid rgba(255,255,255,0.55)',
                backdropFilter: 'blur(6px)',
                boxShadow: '0 3px 12px rgba(0,0,0,0.15)',
                textShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }}
            >
              <span className="text-2xl">👥</span>
              <span>Joueurs</span>
            </button>
          </div>

          {/* Paramètres — same size as Jouer */}
          <button
            onClick={onSettings}
            className="w-full rounded-2xl py-5 font-bold text-xl transition-all active:scale-95 flex items-center justify-center gap-3"
            style={{
              background: 'rgba(255,255,255,0.28)',
              color: '#fff',
              border: '2px solid rgba(255,255,255,0.55)',
              backdropFilter: 'blur(6px)',
              boxShadow: '0 3px 14px rgba(0,0,0,0.15)',
              textShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }}
          >
            <span style={{ fontSize: '1.4rem' }}>⚙️</span> Paramètres
          </button>

          {/* Se déconnecter */}
          <button
            onClick={handleLogout}
            className="w-full rounded-2xl py-3 font-bold text-base transition-all active:scale-95 flex items-center justify-center gap-2"
            style={{
              background: 'rgba(239,68,68,0.25)',
              color: '#fff',
              border: '2px solid rgba(239,68,68,0.6)',
              backdropFilter: 'blur(4px)',
              boxShadow: '0 3px 12px rgba(239,68,68,0.2)',
              textShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }}
          >
            🚪 Se déconnecter
          </button>
        </div>
      </div>

      {showPlayers && <PlayersPanel onClose={() => setShowPlayers(false)} />}
    </div>
  );
}
