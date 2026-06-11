import { useState, useEffect } from 'react';
import { GameState, LureType, LURE_LABELS } from '../types';

interface Props {
  state: GameState;
  onActivateLure: (type: LureType) => void;
  onActivateCooldownBoost: () => boolean;
  onActivateSpawnNet: () => boolean;
  onOpenCase: () => void;
  onClose: () => void;
}

const LURE_DESCRIPTIONS: Record<LureType, string> = {
  rare:       'Augmente les apparitions Rare ×4 pendant 10 min',
  epique:     'Augmente les apparitions Élite ×4 pendant 10 min',
  legendaire: 'Augmente les apparitions Légendaires ×4 pendant 10 min',
  shiny:      'Augmente le taux Shiny ×4 pendant 10 min',
};
const LURE_ICONS: Record<LureType, string> = { rare: '💎', epique: '🔮', legendaire: '⚡', shiny: '✨' };
const LURE_COLORS: Record<LureType, string> = {
  rare: '#3b82f6', epique: '#a855f7', legendaire: '#f59e0b', shiny: '#ec4899',
};
const LURE_TYPES: LureType[] = ['rare', 'epique', 'legendaire', 'shiny'];


function formatRemaining(expiresAt: number): string {
  const ms = Math.max(0, expiresAt - Date.now());
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function BackpackPanel({ state, onActivateLure, onActivateCooldownBoost, onActivateSpawnNet, onOpenCase, onClose }: Props) {
  const [, setTick] = useState(0);

  // Refresh timers every second
  useEffect(() => {
    const hasActive = (state.activeLure && Date.now() < state.activeLure.expiresAt) ||
                      (state.activeCooldownBoost && Date.now() < state.activeCooldownBoost.expiresAt);
    if (!hasActive) return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  });

  const isLureActive = !!(state.activeLure && Date.now() < state.activeLure.expiresAt);
  const isBoostActive = !!(state.activeCooldownBoost && Date.now() < state.activeCooldownBoost.expiresAt);
  const isSpawnActive = !!(state.activeSpawnBoost && Date.now() < state.activeSpawnBoost.expiresAt);

  const totalLures = LURE_TYPES.reduce((s, t) => s + (state.lures[t] ?? 0), 0);
const totalBoosts = state.cooldownReducers ?? 0;
  const totalSpawnNets = state.spawnNets ?? 0;
  const totalAttackBoosts = state.attackBoostCharges ?? 0;
  const totalCases = state.mysteryCases ?? 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700 shrink-0">
        <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl px-1">←</button>
        <div>
          <h2 className="text-white font-black text-xl">🎒 Sac à dos</h2>
          <p className="text-slate-400 text-xs">
            {totalLures} leurre{totalLures !== 1 ? 's' : ''} · {totalBoosts + totalSpawnNets + totalAttackBoosts} boost{(totalBoosts + totalSpawnNets + totalAttackBoosts) !== 1 ? 's' : ''} · {totalCases} capsule{totalCases !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-6"
        style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px) + 1.25rem)' }}>

        {/* Active items banner */}
        {(isLureActive || isBoostActive) && (
          <div className="flex flex-col gap-2">
            {isLureActive && state.activeLure && (
              <div className="rounded-xl border border-yellow-500/40 bg-yellow-900/20 px-4 py-3 flex items-center gap-3">
                <span className="text-2xl">{LURE_ICONS[state.activeLure.type]}</span>
                <div className="flex-1">
                  <div className="text-yellow-300 font-bold text-sm">{LURE_LABELS[state.activeLure.type]} actif</div>
                  <div className="text-yellow-500 text-xs">{formatRemaining(state.activeLure.expiresAt)} restant</div>
                </div>
                <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              </div>
            )}
            {isBoostActive && state.activeCooldownBoost && (
              <div className="rounded-xl border border-cyan-500/40 bg-cyan-900/20 px-4 py-3 flex items-center gap-3">
                <span className="text-2xl">⏱️</span>
                <div className="flex-1">
                  <div className="text-cyan-300 font-bold text-sm">Réducteur de cooldown actif</div>
                  <div className="text-cyan-500 text-xs">{formatRemaining(state.activeCooldownBoost.expiresAt)} restant</div>
                </div>
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              </div>
            )}
            {isSpawnActive && state.activeSpawnBoost && (
              <div className="rounded-xl border border-green-500/40 bg-green-900/20 px-4 py-3 flex items-center gap-3">
                <span className="text-2xl">🕸️</span>
                <div className="flex-1">
                  <div className="text-green-300 font-bold text-sm">Filet Géant actif — Spawns ×2</div>
                  <div className="text-green-500 text-xs">{formatRemaining(state.activeSpawnBoost.expiresAt)} restant</div>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              </div>
            )}
          </div>
        )}

        {/* Lures */}
        <section>
          <h3 className="text-slate-300 font-bold text-sm mb-3 uppercase tracking-wider">🎣 Leurres</h3>
          <div className="bg-slate-800/60 rounded-xl border border-slate-700/40 overflow-hidden divide-y divide-slate-700/40">
            {LURE_TYPES.map(type => {
              const count = state.lures[type] ?? 0;
              const color = LURE_COLORS[type];
              const isThisActive = isLureActive && state.activeLure?.type === type;
              return (
                <div key={type} className="flex items-center gap-3 px-4 py-3.5">
                  <span className="text-2xl shrink-0">{LURE_ICONS[type]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold text-sm">{LURE_LABELS[type]}</div>
                    <div className="text-slate-400 text-xs mt-0.5">{LURE_DESCRIPTIONS[type]}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ color, background: color + '22', border: `1px solid ${color}44` }}>
                      ×{count}
                    </span>
                    {count > 0 && !isLureActive && (
                      <button
                        onClick={() => onActivateLure(type)}
                        className="text-xs font-bold px-3 py-1 rounded-lg transition-all active:scale-95"
                        style={{ background: color + '33', color, border: `1px solid ${color}66` }}
                      >
                        Activer
                      </button>
                    )}
                    {isThisActive && <span className="text-xs text-yellow-400 font-bold">Actif ✓</span>}
                    {isLureActive && !isThisActive && count > 0 && (
                      <span className="text-xs text-slate-500">Un leurre est déjà actif</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {totalLures === 0 && (
            <p className="text-slate-500 text-xs text-center mt-2">Aucun leurre — achète-en dans la Boutique 🏪</p>
          )}
        </section>


        {/* Boosts divers */}
        <section>
          <h3 className="text-slate-300 font-bold text-sm mb-3 uppercase tracking-wider">⚡ Boosts</h3>
          <div className="bg-slate-800/60 rounded-xl border border-slate-700/40 overflow-hidden divide-y divide-slate-700/40">
            {/* Filet Géant */}
            <div className="flex items-center gap-3 px-4 py-3.5">
              <span className="text-2xl shrink-0">🕸️</span>
              <div className="flex-1 min-w-0">
                <div className="text-white font-semibold text-sm">Filet Géant</div>
                <div className="text-slate-400 text-xs mt-0.5">Spawns ×2 pendant 5 min</div>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ color: '#4ade80', background: '#4ade8022', border: '1px solid #4ade8044' }}>
                  ×{totalSpawnNets}
                </span>
                {totalSpawnNets > 0 && !isSpawnActive && (
                  <button onClick={() => onActivateSpawnNet()}
                    className="text-xs font-bold px-3 py-1 rounded-lg transition-all active:scale-95"
                    style={{ background: '#4ade8033', color: '#4ade80', border: '1px solid #4ade8066' }}>
                    Activer
                  </button>
                )}
                {isSpawnActive && <span className="text-xs text-green-400 font-bold">Actif ✓</span>}
              </div>
            </div>
            {/* Boost Attaque */}
            <div className="flex items-center gap-3 px-4 py-3.5">
              <span className="text-2xl shrink-0">⚔️</span>
              <div className="flex-1 min-w-0">
                <div className="text-white font-semibold text-sm">Boost Attaque</div>
                <div className="text-slate-400 text-xs mt-0.5">+25% dégâts · consommé au prochain combat</div>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ color: '#f87171', background: '#f8717122', border: '1px solid #f8717144' }}>
                  ×{totalAttackBoosts}
                </span>
                {totalAttackBoosts > 0 && (
                  <span className="text-xs text-slate-400 text-right" style={{ maxWidth: 80 }}>Auto au prochain combat</span>
                )}
              </div>
            </div>
            {/* Réducteur de cooldown */}
            <div className="flex items-center gap-3 px-4 py-3.5">
              <span className="text-2xl shrink-0">⏱️</span>
              <div className="flex-1 min-w-0">
                <div className="text-white font-semibold text-sm">Réducteur de cooldown</div>
                <div className="text-slate-400 text-xs mt-0.5">Cooldown réduit à 10 sec pendant 10 min</div>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ color: '#22d3ee', background: '#22d3ee22', border: '1px solid #22d3ee44' }}>
                  ×{totalBoosts}
                </span>
                {totalBoosts > 0 && !isBoostActive && (
                  <button onClick={() => onActivateCooldownBoost()}
                    className="text-xs font-bold px-3 py-1 rounded-lg transition-all active:scale-95"
                    style={{ background: '#22d3ee33', color: '#22d3ee', border: '1px solid #22d3ee66' }}>
                    Activer
                  </button>
                )}
                {isBoostActive && state.activeCooldownBoost && (
                  <span className="text-xs text-cyan-400 font-bold">⏱️ {formatRemaining(state.activeCooldownBoost.expiresAt)}</span>
                )}
              </div>
            </div>
          </div>
          {(totalSpawnNets + totalAttackBoosts + totalBoosts) === 0 && (
            <p className="text-slate-500 text-xs text-center mt-2">Aucun boost — achète-en dans la Boutique 🏪</p>
          )}
        </section>

        {/* Capsules Katchii */}
        <section>
          <h3 className="text-slate-300 font-bold text-sm mb-3 uppercase tracking-wider">🎰 Capsules Katchii</h3>
          <div className="bg-slate-800/60 rounded-xl border"
            style={{ borderColor: '#f59e0b44', background: 'linear-gradient(135deg,rgba(120,53,15,0.25),rgba(30,10,60,0.35))' }}>
            <div className="flex items-center gap-3 px-4 py-3.5">
              <span className="text-3xl shrink-0">🎰</span>
              <div className="flex-1 min-w-0">
                <div className="text-white font-semibold text-sm">Capsule Katchii</div>
                <div className="text-slate-400 text-xs mt-0.5">Pokémon aléatoire · 0,2% Shiny ✨</div>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ color: '#f59e0b', background: '#f59e0b22', border: '1px solid #f59e0b44' }}>
                  ×{totalCases}
                </span>
                {totalCases > 0 && (
                  <button onClick={onOpenCase}
                    className="text-xs font-bold px-3 py-1 rounded-lg transition-all active:scale-95"
                    style={{ background: 'linear-gradient(135deg,#f59e0b,#ef7c00)', color: '#fff' }}>
                    Ouvrir !
                  </button>
                )}
              </div>
            </div>
          </div>
          {totalCases === 0 && (
            <p className="text-slate-500 text-xs text-center mt-2">Aucune capsule — achète-en dans la Boutique 🏪</p>
          )}
        </section>


      </div>
    </div>
  );
}
