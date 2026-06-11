import { useState } from 'react';
import { GameState } from '../types';
import { BADGES } from '../data/badges';

interface Props {
  username: string;
  state: GameState;
  onClose: () => void;
  onLogout: () => void;
}

type Tab = 'profil' | 'stats';

function formatPlayTime(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  if (h === 0) return `${min}min`;
  return `${h}h ${min}min`;
}

export function ProfileScreen({ username, state, onClose, onLogout }: Props) {
  const [tab, setTab] = useState<Tab>('profil');

  const totalCaught = Object.keys(state.normalCollection).filter(id => (state.normalCollection[Number(id)] ?? 0) > 0).length;
  const totalShinyCaught = Object.keys(state.shinyCollection).filter(id => (state.shinyCollection[Number(id)] ?? 0) > 0).length;
  const badgesEarned = state.badges.length;
  const totalBadges = BADGES.length;
  const totalPlayTime = state.stats?.totalPlayTimeMs ?? 0;

  const earnedBadges = BADGES.filter(b => state.badges.includes(b.id));

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'linear-gradient(180deg, #0a0a2e 0%, #1a1040 40%, #0d1f3c 100%)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none px-2">←</button>
        <h2 className="text-white font-bold text-xl">Profil</h2>
        <div className="w-10" />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700 shrink-0">
        {(['profil', 'stats'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${
              tab === t ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t === 'profil' ? '👤 Profil' : '📊 Stats'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        {tab === 'profil' && (
          <div className="flex flex-col items-center gap-6">
            {/* Avatar */}
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-black"
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                boxShadow: '0 0 30px rgba(245,158,11,0.4)',
              }}
            >
              {username.charAt(0).toUpperCase()}
            </div>

            {/* Username */}
            <div className="text-center">
              <h2 className="text-white font-black text-2xl">{username}</h2>
              <p className="text-slate-400 text-sm">Dresseur Katchii</p>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
              <div className="bg-slate-800/60 rounded-xl p-3 text-center border border-slate-700/40">
                <div className="text-yellow-400 font-black text-xl">🪙 {state.points.toLocaleString()}</div>
                <div className="text-slate-400 text-xs">PokéCoins</div>
              </div>
              <div className="bg-slate-800/60 rounded-xl p-3 text-center border border-slate-700/40">
                <div className="text-blue-400 font-black text-xl">{totalCaught}</div>
                <div className="text-slate-400 text-xs">Capturés</div>
              </div>
              <div className="bg-slate-800/60 rounded-xl p-3 text-center border border-slate-700/40">
                <div className="text-purple-400 font-black text-xl">{totalShinyCaught}</div>
                <div className="text-slate-400 text-xs">Shinies</div>
              </div>
            </div>

            {/* PokéParc Elo */}
            {(state.parkDuelRecord?.totalWins !== undefined || state.parkElo !== undefined) && (
              <div className="w-full max-w-sm bg-slate-800/60 rounded-2xl border border-slate-700/40 p-4">
                <div className="text-slate-300 font-bold text-sm mb-3">🌿 PokéParc — Duels</div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <div className="text-yellow-400 font-black text-xl">{state.parkElo ?? 1000}</div>
                    <div className="text-slate-400 text-xs">Elo</div>
                  </div>
                  <div className="text-center">
                    <div className="text-green-400 font-black text-xl">{state.parkDuelRecord?.totalWins ?? 0}</div>
                    <div className="text-slate-400 text-xs">Victoires</div>
                  </div>
                  <div className="text-center">
                    <div className="text-red-400 font-black text-xl">{state.parkDuelRecord?.totalLosses ?? 0}</div>
                    <div className="text-slate-400 text-xs">Défaites</div>
                  </div>
                </div>
              </div>
            )}

            {/* Succès section */}
            {earnedBadges.length > 0 && (
              <div className="w-full max-w-sm">
                <h3 className="text-slate-300 font-bold text-sm mb-3">Succès obtenus ({badgesEarned}/{totalBadges})</h3>
                <div className="flex flex-wrap gap-2">
                  {earnedBadges.map(badge => (
                    <div
                      key={badge.id}
                      className="bg-yellow-900/30 border border-yellow-500/40 rounded-xl px-3 py-2 flex items-center gap-2"
                      title={badge.desc}
                    >
                      <span className="text-lg">{badge.icon}</span>
                      <span className="text-yellow-300 text-xs font-bold">{badge.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Logout */}
            <button
              onClick={onLogout}
              className="text-red-400 hover:text-red-300 border border-red-500/30 rounded-xl px-6 py-2 text-sm transition-colors mt-4"
            >
              Se déconnecter
            </button>
          </div>
        )}

        {tab === 'stats' && (
          <div className="flex flex-col gap-3 max-w-sm mx-auto">
            {[
              { label: 'Pokémon capturés (normal)', value: totalCaught, icon: '🎯' },
              { label: 'Shinies capturés', value: totalShinyCaught, icon: '✨' },
              { label: 'Duels gagnés', value: state.duels.wins, icon: '⚔️' },
              { label: 'Duels perdus', value: state.duels.losses, icon: '💔' },
              { label: 'Meilleure streak', value: state.duels.streak, icon: '🔥' },
              { label: 'Succès débloqués', value: `${badgesEarned}/${totalBadges}`, icon: '🏅' },
              { label: 'PokéCoins', value: state.points.toLocaleString(), icon: '🪙' },
              { label: 'Temps total de jeu', value: formatPlayTime(totalPlayTime), icon: '⏰' },
            ].map(({ label, value, icon }) => (
              <div
                key={label}
                className="flex items-center justify-between bg-slate-800/60 rounded-xl px-4 py-3 border border-slate-700/40"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{icon}</span>
                  <span className="text-slate-300 text-sm">{label}</span>
                </div>
                <span className="text-white font-bold">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
