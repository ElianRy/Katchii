import { useState, useEffect } from 'react';
import { GameState, RARITY_COLORS } from '../types';
import { POKEMON_BY_ID } from '../data/gen1';

interface Props {
  state: GameState;
  onAttack: () => void;
  onClaimReward: () => void;
  onStartRaid: () => void;
  onClose: () => void;
}

function getWeekId(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
  return `${now.getFullYear()}-${String(weekNum).padStart(2, '0')}`;
}

function todayDate(): string {
  return new Date().toISOString().split('T')[0];
}

function HpBar({ current, max }: { current: number; max: number }) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  const color = pct > 50 ? '#22c55e' : pct > 25 ? '#f59e0b' : '#ef4444';
  return (
    <div className="w-full bg-slate-700 rounded-full h-4 overflow-hidden border border-slate-600">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

export function RaidPanel({ state, onAttack, onClaimReward, onStartRaid, onClose }: Props) {
  const raid = state.raid;
  const [damageAnim, setDamageAnim] = useState<number | null>(null);

  useEffect(() => {
    if (damageAnim !== null) {
      const t = setTimeout(() => setDamageAnim(null), 900);
      return () => clearTimeout(t);
    }
  }, [damageAnim]);

  const boss = raid ? POKEMON_BY_ID[raid.bossId] : null;

  const handleAttack = () => {
    // Calculate team damage before attack
    const teamDamage = getTeamDamage(state);
    onAttack();
    setDamageAnim(teamDamage);
  };

  const alreadyAttackedToday = raid?.playerAttackedToday && raid?.lastAttackDate === todayDate();

  return (
    <div className="fixed inset-0 bg-slate-900 text-white z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-700 bg-black/40">
        <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl px-1">←</button>
        <div>
          <h2 className="text-xl font-bold text-red-400">⚔️ Raid Boss</h2>
          <p className="text-xs text-slate-400 mt-0.5">Boss légendaire hebdomadaire</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!raid ? (
          <div className="flex flex-col items-center justify-center gap-6 py-12">
            <div className="text-6xl">🐉</div>
            <div className="text-center">
              <div className="text-xl font-bold text-white mb-2">Aucun Raid en cours</div>
              <div className="text-slate-400 text-sm">Un nouveau boss légendaire t'attend !</div>
            </div>
            <button
              onClick={onStartRaid}
              className="bg-red-600 hover:bg-red-500 text-white font-bold px-8 py-3 rounded-xl text-lg"
            >
              Lancer le Raid
            </button>
          </div>
        ) : (
          <div className="max-w-lg mx-auto flex flex-col gap-5">
            {/* Boss card */}
            <div className="bg-black/50 rounded-2xl border border-red-500/40 p-5 flex flex-col items-center gap-4">
              <div className="text-sm text-slate-400 font-bold uppercase tracking-wider">BOSS LÉGENDAIRE</div>

              {/* Boss sprite */}
              <div className="relative">
                {!raid.completed && (
                  <div
                    className="absolute inset-0 rounded-full animate-pulse"
                    style={{ boxShadow: '0 0 40px 15px #ef444455' }}
                  />
                )}
                <img
                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${raid.bossId}.png`}
                  alt={boss?.name}
                  width={128}
                  height={128}
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>

              <div className="text-2xl font-bold" style={{ color: RARITY_COLORS['legendaire'] }}>
                {boss?.name ?? `#${raid.bossId}`}
              </div>

              {/* HP bar */}
              <div className="w-full">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-300">Points de vie</span>
                  <span className="font-bold text-white">
                    {Math.max(0, raid.bossCurrentHp).toLocaleString()} / {raid.bossMaxHp.toLocaleString()}
                  </span>
                </div>
                <HpBar current={raid.bossCurrentHp} max={raid.bossMaxHp} />
              </div>

              {/* Participants */}
              <div className="flex gap-6 text-center">
                <div>
                  <div className="text-lg font-bold text-blue-400">{raid.simulatedParticipants}</div>
                  <div className="text-xs text-slate-400">joueurs participent</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-yellow-400">{raid.playerDamage.toLocaleString()}</div>
                  <div className="text-xs text-slate-400">tes dégâts</div>
                </div>
              </div>

              {/* Damage animation */}
              {damageAnim !== null && (
                <div
                  className="absolute text-red-400 font-black text-2xl pointer-events-none animate-float-up"
                  style={{ top: '30%', left: '50%', transform: 'translateX(-50%)' }}
                >
                  -{damageAnim.toLocaleString()}
                </div>
              )}
            </div>

            {/* Player team */}
            <TeamDisplay state={state} />

            {/* Action */}
            {raid.completed ? (
              <div className="text-center">
                <div className="text-green-400 font-bold text-xl mb-3">🎉 Boss vaincu !</div>
                {!raid.rewardClaimed ? (
                  <button
                    onClick={onClaimReward}
                    className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-8 py-3 rounded-xl text-lg w-full"
                  >
                    Réclamer la récompense 🎁
                  </button>
                ) : (
                  <div className="text-slate-400 text-sm">Récompense déjà réclamée</div>
                )}
              </div>
            ) : (
              <button
                onClick={handleAttack}
                disabled={!!alreadyAttackedToday}
                className="w-full py-4 rounded-xl font-black text-lg transition-all"
                style={{
                  background: alreadyAttackedToday ? '#374151' : '#dc2626',
                  color: alreadyAttackedToday ? '#6b7280' : '#fff',
                  cursor: alreadyAttackedToday ? 'not-allowed' : 'pointer',
                }}
              >
                {alreadyAttackedToday ? '⏳ Déjà attaqué aujourd\'hui' : '⚔️ Attaquer !'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function getTeamDamage(state: GameState): number {
  const team = getBestTeam(state);
  return team.reduce((sum, id) => {
    const p = POKEMON_BY_ID[id];
    if (!p) return sum;
    const rarityStats: Record<string, number> = {
      commun: 10, peu_commun: 20, rare: 40, elite: 80, legendaire: 150,
    };
    return sum + (rarityStats[p.rarity] ?? 10);
  }, 0);
}

function getBestTeam(state: GameState): number[] {
  const rarityOrder: Record<string, number> = {
    legendaire: 5, elite: 4, rare: 3, peu_commun: 2, commun: 1,
  };
  const caught = Object.entries(state.normalCollection)
    .filter(([, count]) => count > 0)
    .map(([id]) => Number(id))
    .sort((a, b) => {
      const ra = rarityOrder[POKEMON_BY_ID[a]?.rarity ?? 'commun'] ?? 1;
      const rb = rarityOrder[POKEMON_BY_ID[b]?.rarity ?? 'commun'] ?? 1;
      return rb - ra;
    });
  return caught.slice(0, 3);
}

function TeamDisplay({ state }: { state: GameState }) {
  const team = getBestTeam(state);

  if (team.length === 0) {
    return (
      <div className="bg-black/30 rounded-xl p-4 text-center text-slate-400 text-sm">
        Capture des Pokémon pour former ton équipe !
      </div>
    );
  }

  return (
    <div className="bg-black/30 rounded-xl p-4">
      <div className="text-sm text-slate-400 mb-3 font-bold">Ton équipe (top 3)</div>
      <div className="flex gap-3 justify-center">
        {team.map((id) => {
          const p = POKEMON_BY_ID[id];
          return (
            <div key={id} className="flex flex-col items-center gap-1">
              <img
                src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`}
                alt={p?.name}
                width={48}
                height={48}
                style={{ imageRendering: 'pixelated' }}
              />
              <span className="text-xs text-white font-bold">{p?.name}</span>
              <span className="text-xs" style={{ color: RARITY_COLORS[p?.rarity ?? 'commun'] }}>
                {p?.rarity}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { getWeekId, todayDate, getBestTeam, getTeamDamage };
