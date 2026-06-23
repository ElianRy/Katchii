import { useState, useEffect } from 'react';
import { GameState, LureType, LURE_COSTS, LURE_LABELS, XpCandySize, COOLDOWN_REDUCER_COST, SPAWN_NET_COST, MYSTERY_CASE_COST } from '../types';

const BOOSTER_COST = 500;

interface Props {
  state: GameState;
  onBuyLure: (type: LureType) => void;
  onBuyXpCandy?: (size: XpCandySize) => boolean;
  onBuyCooldownBoost: () => boolean;
  onBuySpawnNet: () => boolean;
  onBuyMysteryCase: () => boolean;
  onOpenCase?: () => void;
  onActivateLure: (type: LureType) => boolean;
  onActivateCooldownBoost: () => boolean;
  onActivateSpawnNet: () => boolean;
  onClose: () => void;
  onBuyBooster?: () => boolean;
  onOpenFreeBooster?: () => void;
}

const LURE_ICONS: Record<LureType, string> = { rare: '💎', epique: '🔮', legendaire: '⚡', shiny: '✨' };
const LURE_DESCS: Record<LureType, string> = {
  rare:       'Apparitions Rare ×4 pendant 10 min',
  epique:     'Apparitions Élite ×4 pendant 10 min',
  legendaire: 'Apparitions Légendaires ×4 pendant 10 min',
  shiny:      'Taux Shiny ×4 pendant 10 min',
};
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

interface Toast { id: number; text: string }

export function ShopPanel({ state, onBuyLure, onBuyCooldownBoost, onBuySpawnNet, onBuyMysteryCase, onOpenCase, onActivateLure, onActivateCooldownBoost, onActivateSpawnNet, onClose, onBuyBooster, onOpenFreeBooster }: Props) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [counter, setCounter] = useState(0);
  const [tick, setTick] = useState(0);
  const coins = state.points;
  const unlockedZones = state.zoneProgress?.unlockedZones ?? [];
  const hasZoneLibre = unlockedZones.includes('zone_libre');

  const isLureActive = !!(state.activeLure && Date.now() < state.activeLure.expiresAt);
  const isBoostActive = !!(state.activeCooldownBoost && Date.now() < state.activeCooldownBoost.expiresAt);
  const isSpawnActive = !!(state.activeSpawnBoost && Date.now() < state.activeSpawnBoost.expiresAt);

  useEffect(() => {
    if (!isLureActive && !isBoostActive && !isSpawnActive) return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLureActive, isBoostActive, isSpawnActive, tick]);

  function addToast(text: string) {
    const id = counter;
    setCounter(c => c + 1);
    setToasts(prev => [...prev, { id, text }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2200);
  }

  function handleBuyLure(type: LureType) {
    onBuyLure(type);
    addToast('✅ Acheté !');
  }

  function handleBuyCooldownBoost() {
    if (onBuyCooldownBoost()) addToast('✅ Acheté !');
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pb-3 border-b border-slate-700 shrink-0" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl px-1">←</button>
        <div className="flex-1">
          <h2 className="text-white font-black text-xl">🏪 Boutique</h2>
          <p className="text-slate-400 text-xs">Achète et active tes objets ici</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)' }}>
          <span className="text-base">🪙</span>
          <span className="text-yellow-400 font-black text-sm">{coins.toLocaleString()}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-6"
        style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px) + 1.25rem)' }}>

        {/* Leurres */}
        <section>
          <h3 className="text-slate-300 font-bold text-sm mb-3 uppercase tracking-wider">🎣 Leurres</h3>
          <div className="bg-slate-800/60 rounded-xl border border-slate-700/40 overflow-hidden divide-y divide-slate-700/40">
            {LURE_TYPES.map(type => {
              const cost = LURE_COSTS[type];
              const count = state.lures[type] ?? 0;
              const isLocked = type === 'legendaire' && !hasZoneLibre;
              const canAfford = !isLocked && coins >= cost;
              const color = LURE_COLORS[type];
              const isThisActive = isLureActive && state.activeLure?.type === type;
              const canActivate = count > 0 && !isLocked;
              return (
                <div key={type} className="flex items-start gap-3 px-4 py-3.5"
                  style={{ opacity: isLocked ? 0.55 : 1 }}>
                  <span className="text-2xl shrink-0 mt-0.5">{isLocked ? '🔒' : LURE_ICONS[type]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold text-sm flex items-center gap-2">
                      {LURE_LABELS[type]}
                      {isLocked && <span className="text-slate-500 text-xs font-normal">— Zone Libre requise</span>}
                    </div>
                    <div className="text-slate-400 text-xs mt-0.5">{LURE_DESCS[type]}</div>
                    {isThisActive && state.activeLure && (
                      <div className="text-yellow-400 text-xs mt-1 font-bold animate-pulse">
                        ● Actif — {formatRemaining(state.activeLure.expiresAt)} restant
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ color, background: color + '22', border: `1px solid ${color}44` }}>
                        ×{count}
                      </span>
                      <span className="text-xs font-bold" style={{ color: isLocked ? '#475569' : color }}>
                        🪙{cost}
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      {canActivate && (
                        <button
                          onClick={() => { if (onActivateLure(type)) addToast(isThisActive ? '⏱️ Durée prolongée !' : '✅ Leurre activé !'); }}
                          className="text-xs font-bold px-2 py-1 rounded-lg transition-all active:scale-95"
                          style={{ background: color + '33', color, border: `1px solid ${color}66` }}
                        >
                          {isThisActive ? '+10min' : 'Activer'}
                        </button>
                      )}
                      <button
                        onClick={() => !isLocked && canAfford && handleBuyLure(type)}
                        disabled={isLocked || !canAfford}
                        className="text-xs font-bold px-2 py-1 rounded-lg transition-all active:scale-95"
                        style={{
                          background: (isLocked || !canAfford) ? '#1e293b' : 'linear-gradient(135deg,#f59e0b,#ef7c00)',
                          color: (isLocked || !canAfford) ? '#475569' : '#fff',
                          cursor: (isLocked || !canAfford) ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {isLocked ? '🔒' : 'Acheter'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Boosts */}
        <section>
          <h3 className="text-slate-300 font-bold text-sm mb-3 uppercase tracking-wider">⚡ Boosts</h3>
          <div className="bg-slate-800/60 rounded-xl border border-slate-700/40 overflow-hidden divide-y divide-slate-700/40">
            {([
              {
                key: 'cooldown',
                icon: '⏱️',
                label: 'Réducteur de cooldown',
                desc: 'Cooldown réduit à 10 sec pendant 10 min',
                cost: COOLDOWN_REDUCER_COST,
                color: '#22d3ee',
                count: state.cooldownReducers ?? 0,
                isActive: isBoostActive,
                activeLabel: isBoostActive && state.activeCooldownBoost ? `Actif — ${formatRemaining(state.activeCooldownBoost.expiresAt)}` : null,
                buy: handleBuyCooldownBoost,
                activate: () => { if (onActivateCooldownBoost()) addToast(isBoostActive ? '⏱️ Durée prolongée !' : '✅ Boost activé !'); },
              },
              {
                key: 'spawn',
                icon: '🕸️',
                label: 'Filet Géant',
                desc: 'Spawns ×2 pendant 5 min',
                cost: SPAWN_NET_COST,
                color: '#4ade80',
                count: state.spawnNets ?? 0,
                isActive: isSpawnActive,
                activeLabel: isSpawnActive && state.activeSpawnBoost ? `Actif — ${formatRemaining(state.activeSpawnBoost.expiresAt)}` : null,
                buy: () => { if (onBuySpawnNet()) addToast('✅ Acheté !'); },
                activate: () => { if (onActivateSpawnNet()) addToast(isSpawnActive ? '⏱️ Durée prolongée !' : '✅ Boost activé !'); },
              },
            ] as const).map(({ key, icon, label, desc, cost, color, count, activeLabel, buy, activate }) => (
              <div key={key} className="flex items-start gap-3 px-4 py-3.5">
                <span className="text-2xl shrink-0 mt-0.5">{icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-semibold text-sm">{label}</div>
                  <div className="text-slate-400 text-xs mt-0.5">{desc}</div>
                  {activeLabel && (
                    <div className="text-cyan-400 text-xs mt-1 font-bold animate-pulse">● {activeLabel}</div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ color, background: color + '22', border: `1px solid ${color}44` }}>
                      ×{count}
                    </span>
                    <span className="text-xs font-bold" style={{ color }}>🪙{cost}</span>
                  </div>
                  <div className="flex gap-1.5">
                    {count > 0 && (
                      <button onClick={activate}
                        className="text-xs font-bold px-2 py-1 rounded-lg transition-all active:scale-95"
                        style={{ background: color + '33', color, border: `1px solid ${color}66` }}>
                        {activeLabel ? '+durée' : 'Activer'}
                      </button>
                    )}
                    <button onClick={buy} disabled={coins < cost}
                      className="text-xs font-bold px-2 py-1 rounded-lg transition-all active:scale-95"
                      style={{
                        background: coins >= cost ? 'linear-gradient(135deg,#f59e0b,#ef7c00)' : '#1e293b',
                        color: coins >= cost ? '#fff' : '#475569',
                        cursor: coins >= cost ? 'pointer' : 'not-allowed',
                      }}>
                      Acheter
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Capsule Katchii */}
        <section>
          <h3 className="text-slate-300 font-bold text-sm mb-3 uppercase tracking-wider">🎰 Capsule</h3>
          <div
            className="rounded-xl overflow-hidden border"
            style={{ background: 'linear-gradient(135deg,rgba(120,53,15,0.4),rgba(30,10,60,0.6))', borderColor: '#f59e0b66' }}
          >
            <div className="flex items-center gap-3 px-4 py-4">
              <span className="text-3xl shrink-0">🎰</span>
              <div className="flex-1 min-w-0">
                <div className="text-white font-black text-sm">Capsule Katchii</div>
                <div className="text-slate-400 text-xs mt-0.5">Pokémon aléatoire jusqu'à Épique · 0,2% Shiny ✨</div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full text-amber-400"
                    style={{ background: '#f59e0b22', border: '1px solid #f59e0b44' }}>
                    ×{state.mysteryCases ?? 0}
                  </span>
                  <span className="text-xs font-bold text-yellow-400">🪙 {MYSTERY_CASE_COST}</span>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => { if (onBuyMysteryCase()) addToast('✅ Acheté !'); }}
                    disabled={coins < MYSTERY_CASE_COST}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95"
                    style={{
                      background: coins >= MYSTERY_CASE_COST ? 'linear-gradient(135deg,#f59e0b,#ef7c00)' : '#1e293b',
                      color: coins >= MYSTERY_CASE_COST ? '#fff' : '#475569',
                      cursor: coins >= MYSTERY_CASE_COST ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Acheter
                  </button>
                  <button
                    onClick={() => onOpenCase?.()}
                    disabled={!((state.mysteryCases ?? 0) > 0)}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95"
                    style={{
                      background: (state.mysteryCases ?? 0) > 0 ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : '#1e293b',
                      color: (state.mysteryCases ?? 0) > 0 ? '#fff' : '#475569',
                      cursor: (state.mysteryCases ?? 0) > 0 ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Utiliser
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Boosters TCG */}
        <section>
          <h3 className="text-slate-300 font-bold text-sm mb-3 uppercase tracking-wider">🎴 Boosters Cartes</h3>
          <div className="bg-slate-800/60 rounded-xl border border-slate-700/40 p-4 flex flex-col gap-3">
            {/* Free daily booster */}
            {(() => {
              const today = new Date().toISOString().slice(0, 10);
              const canFree = state.lastFreeBoosterDate !== today;
              return (
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-white font-black text-sm">Booster Gratuit</div>
                    <div className="text-slate-400 text-xs mt-0.5">1 booster offert par jour · 10 cartes aléatoires</div>
                  </div>
                  <button
                    onClick={() => { if (canFree && onOpenFreeBooster) { onOpenFreeBooster(); addToast('Booster gratuit ouvert !'); } }}
                    disabled={!canFree}
                    style={{
                      background: canFree ? 'linear-gradient(135deg, #7c3aed, #1d4ed8)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${canFree ? '#a78bfa' : 'rgba(255,255,255,0.1)'}`,
                      color: canFree ? 'white' : '#475569',
                      borderRadius: 10, padding: '8px 16px', fontWeight: 900,
                      fontFamily: 'monospace', fontSize: '0.75rem', cursor: canFree ? 'pointer' : 'default',
                    }}
                  >
                    {canFree ? '🎁 Ouvrir' : '✓ Réclamé'}
                  </button>
                </div>
              );
            })()}
            {/* Buy booster */}
            <div className="flex items-center gap-3 pt-2 border-t border-slate-700/40">
              <div className="flex-1">
                <div className="text-white font-black text-sm">Booster Premium</div>
                <div className="text-slate-400 text-xs mt-0.5">10 cartes · 6C + 3UC + 1 Rare ou mieux</div>
              </div>
              <button
                onClick={() => {
                  if (state.points < BOOSTER_COST) { addToast('Pas assez de PokéCoins !'); return; }
                  if (onBuyBooster?.()) addToast('Booster acheté !');
                }}
                style={{
                  background: state.points >= BOOSTER_COST ? 'linear-gradient(135deg, #1d4ed8, #7c3aed)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${state.points >= BOOSTER_COST ? '#60a5fa' : 'rgba(255,255,255,0.1)'}`,
                  color: state.points >= BOOSTER_COST ? 'white' : '#475569',
                  borderRadius: 10, padding: '8px 16px', fontWeight: 900,
                  fontFamily: 'monospace', fontSize: '0.75rem', cursor: state.points >= BOOSTER_COST ? 'pointer' : 'default',
                }}
              >
                {BOOSTER_COST} 🪙
              </button>
            </div>
          </div>
        </section>

        {/* How to earn */}
        <section>
          <h3 className="text-slate-300 font-bold text-sm mb-3 uppercase tracking-wider">🪙 Comment gagner des PokéCoins</h3>
          <div className="bg-slate-800/60 rounded-xl border border-slate-700/40 divide-y divide-slate-700/30">
            {[
              ['Capture (nouveau)',    'Varie selon la rareté', '30 – 450 🪙'],
              ['Capture (doublon)',    'Moins, mais ça compte',  '10 – 150 🪙'],
              ['Capture Shiny',        'Multiplicateur ×3',     '90 – 1350 🪙'],
              ['Entraînement gagné',   'Chaque combat remporté', '+30 🪙'],
              ["Boss d'arène vaincu", 'Victoire en zone',       '+180 🪙'],
            ].map(([action, desc, amount]) => (
              <div key={action} className="flex items-center gap-3 px-4 py-2.5">
                <div className="flex-1 min-w-0">
                  <div className="text-white text-xs font-semibold">{action}</div>
                  <div className="text-slate-500 text-xs">{desc}</div>
                </div>
                <span className="text-yellow-400 text-xs font-bold shrink-0">{amount}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Toast stack */}
      <div className="fixed left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none"
        style={{ bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))', zIndex: 600 }}>
        {toasts.map(t => (
          <div key={t.id}
            className="bg-slate-800 border border-slate-600 text-white text-sm font-bold px-4 py-2.5 rounded-full shadow-xl"
            style={{ animation: 'toast-up 2.2s ease forwards' }}>
            {t.text}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes toast-up {
          0%   { opacity: 0; transform: translateY(12px); }
          15%  { opacity: 1; transform: translateY(0); }
          70%  { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}
