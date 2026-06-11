import { useState } from 'react';
import { GameState, LureType, LURE_COSTS, LURE_LABELS, XpCandySize, XP_CANDY_COSTS, COOLDOWN_REDUCER_COST } from '../types';

interface Props {
  state: GameState;
  onBuyLure: (type: LureType) => void;
  onBuyXpCandy: (size: XpCandySize) => boolean;
  onBuyCooldownBoost: () => boolean;
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

const XP_CANDY_ICONS: Record<XpCandySize, string> = { petit: '🍬', moyen: '🍭', grand: '🍫' };
const XP_CANDY_LABELS: Record<XpCandySize, string> = {
  petit: 'Bonbon XP Petit', moyen: 'Bonbon XP Moyen', grand: 'Bonbon XP Grand',
};
const XP_CANDY_DESCS: Record<XpCandySize, string> = {
  petit: 'Donne 500 XP à un Pokémon',
  moyen: 'Donne 2 000 XP à un Pokémon',
  grand: 'Donne 10 000 XP à un Pokémon',
};
const XP_SIZES: XpCandySize[] = ['petit', 'moyen', 'grand'];

function BuyButton({ canAfford, onClick, label }: { canAfford: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={!canAfford}
      className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95 shrink-0"
      style={{
        background: canAfford ? 'linear-gradient(135deg,#f59e0b,#ef7c00)' : '#1e293b',
        color: canAfford ? '#fff' : '#475569',
        cursor: canAfford ? 'pointer' : 'not-allowed',
      }}
    >
      {label}
    </button>
  );
}

export function ShopPanel({ state, onBuyLure, onBuyXpCandy, onBuyCooldownBoost, onClose }: Props) {
  const [flash, setFlash] = useState<string | null>(null);
  const coins = state.points;
  const boostActive = state.activeCooldownBoost && Date.now() < state.activeCooldownBoost.expiresAt;

  function bought(key: string) {
    setFlash(key);
    setTimeout(() => setFlash(null), 1200);
  }

  function remainingBoost() {
    if (!state.activeCooldownBoost) return '';
    const ms = Math.max(0, state.activeCooldownBoost.expiresAt - Date.now());
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700 shrink-0">
        <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl px-1">←</button>
        <div className="flex-1">
          <h2 className="text-white font-black text-xl">🏪 Boutique</h2>
          <p className="text-slate-400 text-xs">Dépense tes PokéCoins</p>
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
              const canAfford = coins >= cost;
              const color = LURE_COLORS[type];
              const isFlash = flash === `lure_${type}`;
              return (
                <div key={type} className="flex items-center gap-3 px-4 py-3.5">
                  <span className="text-2xl shrink-0">{LURE_ICONS[type]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold text-sm">{LURE_LABELS[type]}</div>
                    <div className="text-slate-400 text-xs mt-0.5">{LURE_DESCS[type]}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-xs font-bold" style={{ color }}>
                      {isFlash ? '✅ Acheté !' : `🪙 ${cost}`}
                    </span>
                    <BuyButton
                      canAfford={canAfford}
                      label="Acheter"
                      onClick={() => { onBuyLure(type); bought(`lure_${type}`); }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Bonbons XP */}
        <section>
          <h3 className="text-slate-300 font-bold text-sm mb-3 uppercase tracking-wider">🍬 Bonbons XP</h3>
          <div className="bg-slate-800/60 rounded-xl border border-slate-700/40 overflow-hidden divide-y divide-slate-700/40">
            {XP_SIZES.map(size => {
              const cost = XP_CANDY_COSTS[size];
              const canAfford = coins >= cost;
              const isFlash = flash === `candy_${size}`;
              return (
                <div key={size} className="flex items-center gap-3 px-4 py-3.5">
                  <span className="text-2xl shrink-0">{XP_CANDY_ICONS[size]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold text-sm">{XP_CANDY_LABELS[size]}</div>
                    <div className="text-slate-400 text-xs mt-0.5">{XP_CANDY_DESCS[size]}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-xs font-bold text-green-400">
                      {isFlash ? '✅ Acheté !' : `🪙 ${cost}`}
                    </span>
                    <BuyButton
                      canAfford={canAfford}
                      label="Acheter"
                      onClick={() => { if (onBuyXpCandy(size)) bought(`candy_${size}`); }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Cooldown reducer */}
        <section>
          <h3 className="text-slate-300 font-bold text-sm mb-3 uppercase tracking-wider">⚡ Boosts</h3>
          <div className="bg-slate-800/60 rounded-xl border border-slate-700/40 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <span className="text-2xl shrink-0">⏱️</span>
              <div className="flex-1 min-w-0">
                <div className="text-white font-semibold text-sm">Réducteur de cooldown</div>
                <div className="text-slate-400 text-xs mt-0.5">
                  {boostActive
                    ? `Actif — expire dans ${remainingBoost()}`
                    : 'Cooldown réduit à 10 sec pendant 10 min'}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-xs font-bold text-cyan-400">
                  {flash === 'boost' ? '✅ Activé !' : boostActive ? '⚡ Actif' : `🪙 ${COOLDOWN_REDUCER_COST}`}
                </span>
                {!boostActive && (
                  <BuyButton
                    canAfford={coins >= COOLDOWN_REDUCER_COST}
                    label="Activer"
                    onClick={() => { if (onBuyCooldownBoost()) bought('boost'); }}
                  />
                )}
              </div>
            </div>
          </div>
        </section>

        {/* How to earn */}
        <section>
          <h3 className="text-slate-300 font-bold text-sm mb-3 uppercase tracking-wider">🪙 Comment gagner des PokéCoins</h3>
          <div className="bg-slate-800/60 rounded-xl border border-slate-700/40 divide-y divide-slate-700/30">
            {[
              ['Capture (nouveau)', 'Varie selon la rareté', '15 – 250 🪙'],
              ['Capture (doublon)', 'Moins, mais ça compte', '5 – 75 🪙'],
              ['Capture Shiny', 'Multiplicateur ×3 sur la rareté', '45 – 750 🪙'],
              ['Victoire entraînement', 'Chaque combat remporté', '+10 🪙'],
              ['Boss d\'arène vaincu', 'Victoire contre un champion', '+80 🪙'],
              ['Raid', 'Récompenses proportionnelles aux dégâts', 'Variable'],
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
    </div>
  );
}
