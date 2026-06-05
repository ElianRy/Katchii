import { useState } from 'react';
import { logoutUser } from '../lib/auth';
import { PlayersPanel } from './PlayersPanel';

interface Props {
  username: string;
  onPlay: () => void;
  onCollection: () => void;
  onProfile: () => void;
  onLogout: () => void;
  onWrapped: () => void;
}

export function HomeScreen({ username, onPlay, onCollection, onProfile, onLogout, onWrapped }: Props) {
  const [showPlayers, setShowPlayers] = useState(false);

  const handleLogout = async () => {
    await logoutUser();
    onLogout();
  };

  const buttons = [
    { icon: '🎮', label: 'Jouer', onClick: onPlay, color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)' },
    { icon: '📚', label: 'Collection', onClick: onCollection, color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.4)' },
    { icon: '👤', label: 'Profil', onClick: onProfile, color: '#a855f7', bg: 'rgba(168,85,247,0.15)', border: 'rgba(168,85,247,0.4)' },
    { icon: '👥', label: 'Joueurs', onClick: () => setShowPlayers(true), color: '#22c55e', bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.4)' },
  ];

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{
        background: 'linear-gradient(180deg, #0a0a2e 0%, #1a1040 40%, #0d1f3c 100%)',
      }}
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
          Bonjour, <span className="text-yellow-400 font-bold">{username}</span> !
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

      {/* Bottom row: Wrapped + Logout */}
      <div className="relative z-10 flex items-center justify-between px-6 pb-8">
        <button
          onClick={onWrapped}
          className="text-slate-500 hover:text-yellow-400 text-xs transition-colors flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-yellow-900/20 border border-transparent hover:border-yellow-900/40"
        >
          🎁 <span>Récap annuel</span>
        </button>
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
