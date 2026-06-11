import { useState, useEffect, useRef } from 'react';
import { GameState } from '../types';
import { playSfxQuestComplete } from '../lib/audio';

interface Props {
  state: GameState;
  onClaim: (questId: string) => void;
  onClose: () => void;
}

function timeUntilMidnight(): string {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const ms = midnight.getTime() - now.getTime();
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
}

interface PermanentQuest {
  id: string;
  label: string;
  desc: string;
  icon: string;
  progress: number;
  target: number;
  reward: string;
}

function getPermanentQuests(state: GameState): PermanentQuest[] {
  const caughtNormal = Object.keys(state.normalCollection).filter(id => (state.normalCollection[Number(id)] ?? 0) > 0).length;
  const maxLevel = Math.max(0, ...Object.values(state.pokemonLevels ?? {}).map(l => l.level));
  const uniqueShinies = Object.keys(state.shinyCollection).filter(id => (state.shinyCollection[Number(id)] ?? 0) > 0).length;

  return [
    {
      id: 'level_100',
      label: 'Niveau 100',
      desc: 'Fais atteindre le niveau 100 à un de tes Pokémon',
      icon: '⭐',
      progress: Math.min(maxLevel, 100),
      target: 100,
      reward: 'Taux Shiny +15%',
    },
    {
      id: 'pokedex_complete',
      label: 'Pokédex Complet',
      desc: 'Capture les 151 Pokémon de la première génération',
      icon: '📖',
      progress: caughtNormal,
      target: 151,
      reward: 'Taux Shiny +20%',
    },
    {
      id: 'shiny_100',
      label: 'Collectionneur de Shinys',
      desc: 'Capture 100 Pokémon Shiny différents',
      icon: '💎',
      progress: uniqueShinies,
      target: 100,
      reward: 'Taux Shiny +25%',
    },
  ];
}

export function QuestPanel({ state, onClaim, onClose }: Props) {
  const { quests } = state.dailyQuests;
  const permanentQuests = getPermanentQuests(state);
  const completed = new Set(state.achievementsCompleted ?? []);
  const [claimedToast, setClaimedToast] = useState<string | null>(null);
  const prevCompletedRef = useRef<Set<string>>(new Set());

  // Detect newly completed quests and show toast
  useEffect(() => {
    const newlyCompleted = quests.filter(q => q.completed && !q.rewardClaimed && !prevCompletedRef.current.has(q.id));
    if (newlyCompleted.length > 0) {
      playSfxQuestComplete();
      setClaimedToast(newlyCompleted[0].label);
      const t = setTimeout(() => setClaimedToast(null), 3000);
      prevCompletedRef.current = new Set(quests.filter(q => q.completed && !q.rewardClaimed).map(q => q.id));
      return () => clearTimeout(t);
    }
    prevCompletedRef.current = new Set(quests.filter(q => q.completed && !q.rewardClaimed).map(q => q.id));
  }, [quests]);

  const handleClaim = (questId: string) => {
    playSfxQuestComplete();
    onClaim(questId);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col">
      {/* Quest complete toast */}
      {claimedToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[999] pointer-events-none"
          style={{ animation: 'fadeIn 0.3s ease' }}>
          <div className="bg-yellow-500 text-black font-black text-sm px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 whitespace-nowrap"
            style={{ boxShadow: '0 0 24px 4px rgba(250,204,21,0.5)' }}>
            <span>✅</span>
            <span>Quête complétée !</span>
            <span className="font-bold opacity-70 text-xs ml-1">{claimedToast}</span>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700">
        <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl px-1">←</button>
        <div>
          <h2 className="text-white font-bold text-xl">📋 Quêtes</h2>
          <p className="text-slate-400 text-sm">Réinitialisation dans {timeUntilMidnight()}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-28 flex flex-col gap-6">
        {/* Daily quests */}
        <section>
          <h3 className="text-slate-300 font-bold text-sm uppercase tracking-wide mb-3">Quêtes du jour</h3>
          <div className="flex flex-col gap-3">
            {quests.map((quest) => {
              const pct = Math.min(100, Math.round((quest.progress / quest.target) * 100));
              return (
                <div
                  key={quest.id}
                  className={`rounded-2xl border p-4 ${
                    quest.rewardClaimed
                      ? 'border-slate-600/40 bg-slate-800/30'
                      : quest.completed
                      ? 'border-yellow-400/60 bg-yellow-900/20'
                      : 'border-slate-600/40 bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="text-white font-bold mb-1">{quest.label}</div>
                      <div className="text-slate-400 text-sm mb-2">
                        Récompense : {quest.reward.points} 🪙
                        {quest.reward.fragments ? ` + ${quest.reward.fragments} fragments` : ''}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-2 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: quest.completed ? '#facc15' : '#3b82f6' }}
                          />
                        </div>
                        <span className="text-slate-300 text-xs whitespace-nowrap">{quest.progress}/{quest.target}</span>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center">
                      {quest.rewardClaimed ? (
                        <span className="text-green-400 font-bold text-sm">✓ Réclamée</span>
                      ) : quest.completed ? (
                        <button
                          onClick={() => handleClaim(quest.id)}
                          className="bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-600 text-black font-bold px-4 py-2 rounded-xl text-sm shadow-lg transition-colors"
                          style={{ boxShadow: '0 0 12px 2px rgba(250,204,21,0.4)' }}
                        >
                          Réclamer
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Permanent achievements */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-slate-300 font-bold text-sm uppercase tracking-wide">Défis Permanents</h3>
            <span className="text-xs bg-purple-500/20 border border-purple-400/40 text-purple-300 rounded-full px-2 py-0.5">Ne se réinitialisent pas</span>
          </div>
          <div className="flex flex-col gap-3">
            {permanentQuests.map((q) => {
              const done = completed.has(q.id);
              const pct = Math.min(100, Math.round((q.progress / q.target) * 100));
              return (
                <div
                  key={q.id}
                  className={`rounded-2xl border p-4 ${
                    done
                      ? 'border-green-500/50 bg-green-900/15'
                      : 'border-purple-500/30 bg-purple-900/10'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl shrink-0">{q.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-white font-bold">{q.label}</span>
                        {done && <span className="text-green-400 text-xs font-bold">✅ Accompli</span>}
                      </div>
                      <div className="text-slate-400 text-xs mb-2">{q.desc}</div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-2 rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              background: done ? '#22c55e' : 'linear-gradient(90deg, #a855f7, #ec4899)',
                            }}
                          />
                        </div>
                        <span className="text-slate-300 text-xs whitespace-nowrap">{q.progress}/{q.target}</span>
                      </div>
                      <div className="text-xs font-bold" style={{ color: done ? '#4ade80' : '#c084fc' }}>
                        ✨ {q.reward}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
