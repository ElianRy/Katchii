import { useState } from 'react';
import { GameState, LureType, LURE_COSTS, LURE_LABELS, XpCandySize, COOLDOWN_REDUCER_COST, SPAWN_NET_COST, ATTACK_BOOST_COST, MYSTERY_CASE_COST } from '../types';

interface Props {
  state: GameState;
  onBuyLure: (type: LureType) => void;
  onBuyXpCandy: (size: XpCandySize) => boolean;
  onBuyCooldownBoost: () => boolean;
  onBuySpawnNet: () => boolean;
  onBuyAttackBoost: () => boolean;
  onBuyMysteryCase: () => boolean;
  onClose: () => void;
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


interface Toast { id: number; text: string }

export function ShopPanel({ state, onBuyLure, onBuyCooldownBoost, onBuySpawnNet, onBuyAttackBoost, onBuyMysteryCase, onClose }: Omit<Props, 'onBuyXpCandy'> & { onBuyXpCandy?: (size: XpCandySize) => boolean }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [counter, setCounter] = useState(0);
  const coins = state.points;
  const unlockedZones = state.zoneProgress?.unlockedZones ?? [];
  const hasZoneLibre = unlockedZones.includes('zone_libre');

  function addToast(text: string) {
    const id = counter;
    setCounter(c => c + 1);
    setToasts(prev => [...prev, { id, text }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2200);
  }

  function handleBuyLure(type: LureType) {
    onBuyLure(type);
    addToast('🎒 Ajouté au sac à dos');
  }

function handleBuyCooldownBoost() {
    if (onBuyCooldownBoost()) addToast('🎒 Ajouté au sac à dos');
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700 shrink-0">
        <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl px-1">←</button>
        <div className="flex-1">
          <h2 className="text-white font-black text-xl">🏪 Boutique</h2>
          <p className="text-slate-400 text-xs">Les objets achetés vont dans ton sac à dos</p>
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
              const isLocked = type === 'legendaire' && !hasZoneLibre;
              const canAfford = !isLocked && coins >= cost;
              const color = LURE_COLORS[type];
              return (
                <div key={type} className="flex items-center gap-3 px-4 py-3.5"
                  style={{ opacity: isLocked ? 0.55 : 1 }}>
                  <span className="text-2xl shrink-0">{isLocked ? '🔒' : LURE_ICONS[type]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold text-sm flex items-center gap-2">
                      {LURE_LABELS[type]}
                      {isLocked && (
                        <span className="text-slate-500 text-xs font-normal">— Zone Libre requise</span>
                      )}
                    </div>
                    <div className="text-slate-400 text-xs mt-0.5">{LURE_DESCS[type]}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-xs font-bold" style={{ color: isLocked ? '#475569' : color }}>
                      🪙 {cost}
                    </span>
                    <button
                      onClick={() => !isLocked && canAfford && handleBuyLure(type)}
                      disabled={isLocked || !canAfford}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95"
                      style={{
                        background: (isLocked || !canAfford) ? '#1e293b' : 'linear-gradient(135deg,#f59e0b,#ef7c00)',
                        color: (isLocked || !canAfford) ? '#475569' : '#fff',
                        cursor: (isLocked || !canAfford) ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isLocked ? 'Verrouillé' : 'Acheter'}
                    </button>
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
            {[
              { key: 'cooldown', icon: '⏱️', label: 'Réducteur de cooldown', desc: 'Cooldown réduit à 10 sec pendant 10 min', cost: COOLDOWN_REDUCER_COST, color: '#22d3ee', buy: handleBuyCooldownBoost },
              { key: 'spawn',    icon: '🕸️', label: 'Filet Géant',           desc: 'Spawns ×2 pendant 5 min',               cost: SPAWN_NET_COST,         color: '#4ade80', buy: () => { if (onBuySpawnNet()) addToast('🎒 Ajouté au sac à dos'); } },
              { key: 'attack',   icon: '⚔️', label: 'Boost Attaque',          desc: '+25% de dégâts pour 1 combat',           cost: ATTACK_BOOST_COST,      color: '#f87171', buy: () => { if (onBuyAttackBoost()) addToast('🎒 Ajouté au sac à dos'); } },
            ].map(({ key, icon, label, desc, cost, color, buy }) => (
              <div key={key} className="flex items-center gap-3 px-4 py-3.5">
                <span className="text-2xl shrink-0">{icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-semibold text-sm">{label}</div>
                  <div className="text-slate-400 text-xs mt-0.5">{desc}</div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-xs font-bold" style={{ color }}>🪙 {cost}</span>
                  <button onClick={buy} disabled={coins < cost}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95"
                    style={{
                      background: coins >= cost ? 'linear-gradient(135deg,#f59e0b,#ef7c00)' : '#1e293b',
                      color: coins >= cost ? '#fff' : '#475569',
                      cursor: coins >= cost ? 'pointer' : 'not-allowed',
                    }}>
                    Acheter
                  </button>
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
                <span className="text-xs font-bold text-yellow-400">🪙 {MYSTERY_CASE_COST}</span>
                <button
                  onClick={() => { if (onBuyMysteryCase()) addToast('🎒 Ajouté au sac à dos'); }}
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
              </div>
            </div>
          </div>
        </section>

        {/* How to earn */}
        <section>
          <h3 className="text-slate-300 font-bold text-sm mb-3 uppercase tracking-wider">🪙 Comment gagner des PokéCoins</h3>
          <div className="bg-slate-800/60 rounded-xl border border-slate-700/40 divide-y divide-slate-700/30">
            {[
              ['Capture (nouveau)',    'Varie selon la rareté', '15 – 250 🪙'],
              ['Capture (doublon)',    'Moins, mais ça compte',  '5 – 75 🪙'],
              ['Capture Shiny',        'Multiplicateur ×3',     '45 – 750 🪙'],
              ['Entraînement gagné',   'Chaque combat remporté', '+10 🪙'],
              ['Boss d\'arène vaincu', 'Victoire en zone',       '+80 🪙'],
              ['Raid',                 'Proportionnel aux dégâts','Variable'],
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
