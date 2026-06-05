import React, { useState, useEffect } from 'react';
import { logoutUser } from '../lib/auth';
import { PlayersPanel } from './PlayersPanel';

interface Props {
  username: string;
  onPlay: () => void;
  onProfile: () => void;
  onLogout: () => void;
  onWrapped: () => void;
}

// A few random pokemon IDs to wander on the home screen
const WANDER_POKEMON = [1, 4, 7, 25, 39, 52, 54, 133, 143];

interface WanderingPokemon {
  id: number;
  pokemonId: number;
  x: number;
  targetX: number;
  facingRight: boolean;
}

function useWanderingPokemon() {
  const [pokemon, setPokemon] = useState<WanderingPokemon[]>(() =>
    Array.from({ length: 4 }, (_, i) => {
      const x = 10 + i * 22 + Math.random() * 10;
      return {
        id: i,
        pokemonId: WANDER_POKEMON[Math.floor(Math.random() * WANDER_POKEMON.length)],
        x,
        targetX: x,
        facingRight: Math.random() > 0.5,
      };
    })
  );

  useEffect(() => {
    const id = setInterval(() => {
      setPokemon(prev => prev.map(p => {
        const newX = 5 + Math.random() * 88;
        return { ...p, targetX: newX, facingRight: newX > p.x };
      }));
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return pokemon;
}

export function HomeScreen({ username, onPlay, onProfile, onLogout, onWrapped }: Props) {
  const [showPlayers, setShowPlayers] = useState(false);
  const wanderers = useWanderingPokemon();

  const handleLogout = async () => {
    await logoutUser();
    onLogout();
  };

  const buttons = [
    { icon: '🎮', label: 'Jouer', onClick: onPlay, color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)' },
    { icon: '👥', label: 'Joueurs', onClick: () => setShowPlayers(true), color: '#22c55e', bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.4)' },
    { icon: '👤', label: 'Profil', onClick: onProfile, color: '#a855f7', bg: 'rgba(168,85,247,0.15)', border: 'rgba(168,85,247,0.4)' },
    { icon: '🎁', label: 'Récap', onClick: onWrapped, color: '#ec4899', bg: 'rgba(236,72,153,0.15)', border: 'rgba(236,72,153,0.4)' },
  ];

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ background: 'linear-gradient(180deg, #0a0a2e 0%, #1a1040 40%, #0d1f3c 100%)' }}
    >
      {/* Stars */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 80 }, (_, i) => (
          <div
            key={i}
            className="star"
            style={{
              left: `${(i * 137.508) % 100}%`,
              top: `${(i * 97.3) % 100}%`,
              width: `${0.5 + (i % 5) * 0.4}px`,
              height: `${0.5 + (i % 5) * 0.4}px`,
              '--base-opacity': 0.2 + (i % 8) * 0.1,
              '--tw-duration': `${2 + (i % 6) * 0.5}s`,
              '--tw-delay': `${(i % 5) * 1.1}s`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Wandering pokemon near the bottom */}
      <div className="absolute bottom-24 left-0 right-0 h-24 pointer-events-none overflow-visible">
        {wanderers.map(p => (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              bottom: 0,
              left: `${p.targetX}%`,
              transform: 'translateX(-50%)',
              transition: 'left 4s ease-in-out',
            }}
          >
            <img
              src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.pokemonId}.png`}
              width={48}
              height={48}
              style={{
                imageRendering: 'pixelated',
                transform: p.facingRight ? 'scaleX(-1)' : 'scaleX(1)',
                animation: 'bounce-pokemon 2s ease-in-out infinite',
                filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.2))',
              }}
              alt=""
            />
          </div>
        ))}
      </div>

      {/* Top logo + greeting */}
      <div className="relative z-10 flex flex-col items-center pt-16 pb-8">
        <h1
          className="text-5xl font-black tracking-wider mb-2"
          style={{
            color: '#f59e0b',
            textShadow: '0 0 20px rgba(245,158,11,0.8), 0 0 40px rgba(245,158,11,0.4)',
          }}
        >
          KATCHII
        </h1>
        <p className="text-slate-300 text-lg">
          Bonjour, <span className="font-bold" style={{ color: username.toLowerCase() === 'pokelian' ? '#ef4444' : '#fbbf24' }}>{username}</span> !
        </p>
      </div>

      {/* 2x2 Grid of buttons */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-6">
        <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
          {buttons.map((btn) => (
            <button
              key={btn.label}
              onClick={btn.onClick}
              className="flex flex-col items-center justify-center gap-3 rounded-2xl py-8 transition-all active:scale-95"
              style={{
                background: btn.bg,
                border: `2px solid ${btn.border}`,
                boxShadow: `0 0 20px ${btn.bg}`,
              }}
            >
              <span className="text-4xl">{btn.icon}</span>
              <span className="font-bold text-lg" style={{ color: btn.color }}>
                {btn.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom row: Logout */}
      <div className="relative z-10 flex items-center justify-end px-6 pb-8">
        <button
          onClick={handleLogout}
          className="text-slate-500 hover:text-slate-300 text-sm transition-colors px-4 py-2"
        >
          Se déconnecter
        </button>
      </div>

      {showPlayers && <PlayersPanel onClose={() => setShowPlayers(false)} />}
    </div>
  );
}
