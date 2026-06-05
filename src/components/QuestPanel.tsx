import { GameState } from '../types';

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

export function QuestPanel({ state, onClaim, onClose }: Props) {
  const { quests } = state.dailyQuests;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700">
        <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl px-1">←</button>
        <div>
          <h2 className="text-white font-bold text-xl">📋 Quêtes du jour</h2>
          <p className="text-slate-400 text-sm">Réinitialisation dans {timeUntilMidnight()}</p>
        </div>
      </div>

      {/* Quests */}
      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-4">
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
                    Récompense : {quest.reward.points} pts
                    {quest.reward.fragments ? ` + ${quest.reward.fragments} fragments` : ''}
                  </div>

                  {/* Progress bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          background: quest.completed ? '#facc15' : '#3b82f6',
                        }}
                      />
                    </div>
                    <span className="text-slate-300 text-xs whitespace-nowrap">
                      {quest.progress}/{quest.target}
                    </span>
                  </div>
                </div>

                {/* Action button */}
                <div className="shrink-0 flex items-center">
                  {quest.rewardClaimed ? (
                    <span className="text-green-400 font-bold text-sm">✓ Réclamée</span>
                  ) : quest.completed ? (
                    <button
                      onClick={() => onClaim(quest.id)}
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
    </div>
  );
}
