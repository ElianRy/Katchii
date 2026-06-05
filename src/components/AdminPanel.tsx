import { useState } from 'react';
import { GEN1_POKEMON, POKEMON_BY_ID } from '../data/gen1';
import { ZONE_ORDER, ZONE_BY_ID } from '../data/zones';
import { useGameState } from '../hooks/useGameState';

interface Props {
  gameState: ReturnType<typeof useGameState>;
  onClose: () => void;
}
const RARITY_COLORS_ADMIN: Record<string, string> = {
  commun: '#94a3b8', peu_commun: '#4ade80', rare: '#60a5fa', elite: '#c084fc', legendaire: '#fbbf24'
};

export function AdminPanel({ gameState, onClose }: Props) {
  const [tab, setTab] = useState<'pokemon' | 'zones' | 'misc'>('pokemon');
  const [filter, setFilter] = useState('');
  const [feedback, setFeedback] = useState('');

  const flash = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 1800);
  };

  const giveAll = () => {
    gameState.adminGiveAllMax();
    flash('✅ Tous les Pokémon ajoutés (niveau 100) !');
  };

  const giveAllShiny = () => {
    GEN1_POKEMON.forEach(p => gameState.addCapture(p.id, true, p.rarity));
    flash('✨ Tous les Shiny ajoutés !');
  };

  const givePokemon = (id: number, isShiny = false) => {
    const p = POKEMON_BY_ID[id];
    if (!p) return;
    gameState.addCapture(id, isShiny, p.rarity);
    flash(`✅ ${p.name}${isShiny ? ' ✨' : ''} ajouté !`);
  };

  const setZone = (zoneId: string) => {
    gameState.setCurrentZone(zoneId);
    // Also unlock the zone by marking all previous bosses as defeated
    const idx = ZONE_ORDER.indexOf(zoneId);
    for (let i = 0; i < idx; i++) {
      const z = ZONE_BY_ID[ZONE_ORDER[i]];
      const next = ZONE_ORDER[i + 1] ?? null;
      if (z?.boss) gameState.defeatZoneBoss(ZONE_ORDER[i], next);
    }
    flash(`📍 Zone "${ZONE_BY_ID[zoneId]?.name}" débloquée !`);
  };


  const addPoints = (amount: number) => {
    gameState.spendPoints(-amount);
    flash(`💰 +${amount} points !`);
  };

  const filtered = GEN1_POKEMON.filter(p =>
    p.name.toLowerCase().includes(filter.toLowerCase()) ||
    String(p.id).includes(filter)
  );

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-red-950 border-b border-red-700 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔧</span>
          <div>
            <h2 className="text-white font-black text-lg">Panneau Admin</h2>
            <p className="text-red-300 text-xs">Mode développeur</p>
          </div>
        </div>
        <button onClick={onClose} className="text-red-300 hover:text-white text-2xl px-2">✕</button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-black font-black px-4 py-2 rounded-xl text-sm shadow-lg">
          {feedback}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-700 shrink-0">
        {(['pokemon', 'zones', 'misc'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-bold transition-colors ${
              tab === t ? 'bg-red-900 text-white border-b-2 border-red-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t === 'pokemon' ? '🎮 Pokémon' : t === 'zones' ? '🗺️ Zones' : '⚙️ Divers'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* POKEMON TAB */}
        {tab === 'pokemon' && (
          <div className="p-4 flex flex-col gap-3">
            {/* Bulk actions */}
            <div className="flex gap-2">
              <button
                onClick={giveAll}
                className="flex-1 py-2 rounded-xl font-black text-sm text-black bg-green-400 hover:bg-green-300"
              >
                ✅ Tout donner
              </button>
              <button
                onClick={giveAllShiny}
                className="flex-1 py-2 rounded-xl font-black text-sm text-black bg-yellow-400 hover:bg-yellow-300"
              >
                ✨ Tout shiny
              </button>
            </div>

            {/* Search */}
            <input
              type="text"
              placeholder="Rechercher un Pokémon..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm border border-slate-600 focus:border-red-400 outline-none"
            />

            {/* Pokemon grid */}
            <div className="grid grid-cols-3 gap-2">
              {filtered.map(p => {
                const owned = (gameState.state.normalCollection[p.id] ?? 0) > 0;
                const color = RARITY_COLORS_ADMIN[p.rarity];
                return (
                  <div
                    key={p.id}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl bg-slate-800/60 border border-slate-700/40"
                  >
                    <img
                      src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`}
                      width={44} height={44}
                      style={{
                        imageRendering: 'pixelated',
                        filter: owned ? `drop-shadow(0 0 4px ${color})` : 'grayscale(1) brightness(0.5)',
                      }}
                    />
                    <span style={{ fontSize: '0.5rem', color: owned ? '#e2e8f0' : '#64748b', textAlign: 'center' }}>
                      {p.name}
                    </span>
                    <div className="flex gap-1 w-full">
                      <button
                        onClick={() => givePokemon(p.id, false)}
                        className="flex-1 text-xs rounded-lg py-0.5 font-bold"
                        style={{ background: color + '44', color, fontSize: '0.5rem' }}
                      >
                        +1
                      </button>
                      <button
                        onClick={() => givePokemon(p.id, true)}
                        className="flex-1 text-xs rounded-lg py-0.5 font-bold bg-yellow-900/40 text-yellow-400"
                        style={{ fontSize: '0.5rem' }}
                      >
                        ✨
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ZONES TAB */}
        {tab === 'zones' && (
          <div className="p-4 flex flex-col gap-3">
            <p className="text-slate-400 text-xs">Téléporte et débloque instantanément n'importe quelle zone.</p>
            {ZONE_ORDER.filter(z => z !== 'ligue').map(zoneId => {
              const zone = ZONE_BY_ID[zoneId];
              if (!zone) return null;
              const isCurrent = (gameState.state.zoneProgress?.currentZoneId ?? 'zone1') === zoneId;
              const bossDefeated = !!gameState.state.zoneProgress?.bossDefeated?.[zoneId];
              return (
                <button
                  key={zoneId}
                  onClick={() => setZone(zoneId)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                    isCurrent
                      ? 'border-red-500 bg-red-900/30'
                      : 'border-slate-700 bg-slate-800/40 hover:border-slate-500'
                  }`}
                >
                  <span className="text-xl">{isCurrent ? '📍' : bossDefeated ? '✅' : '🔒'}</span>
                  <div className="flex-1">
                    <div className="text-white font-bold text-sm">{zone.name}</div>
                    <div className="text-slate-400 text-xs">{zone.description}</div>
                  </div>
                  {isCurrent && <span className="text-red-400 text-xs font-bold">Actuelle</span>}
                </button>
              );
            })}

          </div>
        )}

        {/* MISC TAB */}
        {tab === 'misc' && (
          <div className="p-4 flex flex-col gap-3">
            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
              <h3 className="text-white font-bold mb-2 text-sm">💰 Points</h3>
              <div className="flex gap-2 flex-wrap">
                {[100, 500, 1000, 5000, 10000].map(n => (
                  <button
                    key={n}
                    onClick={() => addPoints(n)}
                    className="px-3 py-1.5 rounded-xl bg-yellow-900/40 text-yellow-400 font-bold text-sm hover:bg-yellow-900/60"
                  >
                    +{n}
                  </button>
                ))}
              </div>
              <div className="mt-2 text-slate-400 text-xs">Solde actuel : <span className="text-yellow-400 font-bold">{gameState.state.points} pts</span></div>
            </div>

            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
              <h3 className="text-white font-bold mb-1 text-sm">📊 Stats</h3>
              <div className="flex flex-col gap-1 text-xs text-slate-400">
                <div>Pokémon normaux : <span className="text-white">{Object.keys(gameState.state.normalCollection).length}</span></div>
                <div>Pokémon shiny : <span className="text-yellow-400">{Object.keys(gameState.state.shinyCollection).length}</span></div>
                <div>Zone actuelle : <span className="text-green-400">{gameState.state.zoneProgress?.currentZoneId ?? 'zone1'}</span></div>

              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
