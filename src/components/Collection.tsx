import { useState } from 'react';
import { GameState, RARITY_COLORS, RARITY_LABELS, Rarity } from '../types';
import { GEN1_POKEMON } from '../data/gen1';
import { BADGES } from '../data/badges';
import { ZONES } from '../data/zones';

interface Props {
  state: GameState;
  onClose: () => void;
}

type FilterTab = 'tous' | 'captures' | 'shinies' | Rarity;
type MainTab = 'collection' | 'badges' | 'succes';

// All arena badges (zones with a boss that has a badge)
const ARENA_BADGES = ZONES.filter(z => z.boss?.badge).map(z => ({
  zoneId: z.id,
  badge: z.boss!.badge,
  bossName: z.boss!.name,
  bossTitle: z.boss!.title,
  zoneName: z.name,
}));

const RARITY_ORDER: Rarity[] = ['commun', 'peu_commun', 'rare', 'elite', 'legendaire'];

export function Collection({ state, onClose }: Props) {
  const [mainTab, setMainTab] = useState<MainTab>('collection');
  const [filter, setFilter] = useState<FilterTab>('tous');
  const [filterOpen, setFilterOpen] = useState(false);

  const totalCaught = GEN1_POKEMON.filter(p => (state.normalCollection[p.id] ?? 0) > 0).length;
  const totalShinyCaught = GEN1_POKEMON.filter(p => (state.shinyCollection[p.id] ?? 0) > 0).length;

  const filteredPokemon = GEN1_POKEMON.filter((p) => {
    if (filter === 'tous') return true;
    if (filter === 'captures') return (state.normalCollection[p.id] ?? 0) > 0;
    if (filter === 'shinies') return (state.shinyCollection[p.id] ?? 0) > 0;
    return p.rarity === filter;
  }).sort((a, b) => a.id - b.id);

  const filterTabs: { id: FilterTab; label: string }[] = [
    { id: 'tous', label: 'Tous' },
    { id: 'captures', label: 'Capturés' },
    { id: 'shinies', label: 'Shinies' },
    ...RARITY_ORDER.map((r) => ({ id: r as FilterTab, label: RARITY_LABELS[r] })),
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700">
        <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl px-1">←</button>
        <div>
          <h2 className="text-white font-bold text-xl">Pokédex — Génération 1</h2>
          <p className="text-slate-400 text-sm">
            {totalCaught}/151 capturés · {totalShinyCaught} shinies
          </p>
        </div>
      </div>

      {/* Main tabs */}
      <div className="flex gap-2 px-4 pt-2 border-b border-slate-700 shrink-0">
        {([
          { id: 'collection' as MainTab, label: '📚 Collection' },
          { id: 'badges' as MainTab, label: '🥇 Badges' },
          { id: 'succes' as MainTab, label: '🏅 Succès' },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setMainTab(tab.id)}
            className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${
              mainTab === tab.id
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {mainTab === 'collection' && (
        <>
          {/* Filter button */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-700 shrink-0">
            <button
              onClick={() => setFilterOpen(o => !o)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-700 text-slate-200 hover:bg-slate-600"
            >
              <span>🔍</span>
              <span>Filtrer</span>
              {filter !== 'tous' && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-white font-black text-[0.55rem]"
                  style={{ background: RARITY_ORDER.includes(filter as Rarity) ? RARITY_COLORS[filter as Rarity] : '#3b82f6' }}>
                  {filterTabs.find(t => t.id === filter)?.label}
                </span>
              )}
              <span style={{ transform: filterOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>▾</span>
            </button>
            {filter !== 'tous' && (
              <button onClick={() => setFilter('tous')} className="text-slate-400 hover:text-white text-xs">✕ Réinitialiser</button>
            )}
          </div>

          {/* Filter dropdown */}
          {filterOpen && (
            <div className="flex flex-wrap gap-1.5 px-4 py-2 border-b border-slate-700 bg-slate-900/80 shrink-0">
              {filterTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setFilter(tab.id); setFilterOpen(false); }}
                  className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                    filter === tab.id ? 'text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                  style={
                    filter === tab.id
                      ? { background: RARITY_ORDER.includes(tab.id as Rarity) ? RARITY_COLORS[tab.id as Rarity] + 'dd' : '#3b82f6' }
                      : undefined
                  }
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Grid */}
          <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
              {filteredPokemon.map((pokemon) => {
                const caught = (state.normalCollection[pokemon.id] ?? 0) > 0;
                const shinyCaught = (state.shinyCollection[pokemon.id] ?? 0) > 0;
                const normalCount = state.normalCollection[pokemon.id] ?? 0;
                const shinyCount = state.shinyCollection[pokemon.id] ?? 0;
                const rarityColor = RARITY_COLORS[pokemon.rarity];

                return (
                  <div key={pokemon.id} className="flex flex-col items-center gap-1 relative">
                    <div className={`relative${shinyCaught ? ' shiny-rainbow' : ''}`} style={{ display: 'inline-block' }}>
                      <img
                        src={
                          caught
                            ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${shinyCaught ? 'shiny/' : ''}${pokemon.id}.png`
                            : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`
                        }
                        alt={caught ? pokemon.name : '???'}
                        width={48}
                        height={48}
                        style={{
                          imageRendering: 'pixelated',
                          filter: caught && !shinyCaught
                            ? `drop-shadow(0 0 5px ${rarityColor}) drop-shadow(0 0 2px ${rarityColor}88)`
                            : caught ? undefined : 'grayscale(1) opacity(0.35)',
                        }}
                        draggable={false}
                      />
                      {shinyCaught && (
                        <>
                          <span className="absolute -top-2 -right-1 text-xs" style={{ animation: 'pokedex-star-orbit-a 2s linear infinite' }}>⭐</span>
                          <span className="absolute -bottom-1 -left-1 text-xs" style={{ animation: 'pokedex-star-orbit-b 2.5s linear infinite' }}>✦</span>
                          <span className="absolute top-0 -right-2" style={{ fontSize: 8, animation: 'pokedex-star-orbit-c 1.8s linear infinite' }}>★</span>
                        </>
                      )}
                    </div>
                    <div
                      className="text-xs px-1 rounded font-bold"
                      style={{ color: caught ? rarityColor : '#374151', fontSize: '0.6rem' }}
                    >
                      {RARITY_LABELS[pokemon.rarity].split('—')[1]?.trim().slice(0, 4) ?? ''}
                    </div>
                    <div
                      className="text-center leading-tight"
                      style={{ color: caught ? '#e2e8f0' : '#4b5563', fontSize: '0.6rem' }}
                    >
                      {caught ? pokemon.name : '???'}
                    </div>
                    {caught && (
                      <div className="flex gap-1" style={{ fontSize: '0.55rem' }}>
                        <span className="text-slate-400">×{normalCount}</span>
                        {shinyCount > 0 && (
                          <span className="text-yellow-400">✨×{shinyCount}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {filteredPokemon.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <div className="text-4xl mb-3">🔍</div>
                <p className="text-lg font-bold">Aucun Pokémon trouvé</p>
                <p className="text-sm">Continuez à chasser !</p>
              </div>
            )}
          </div>
        </>
      )}

      {mainTab === 'badges' && (
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
          <p className="text-slate-400 text-xs mb-4 text-center">Bats les maîtres d'arène pour débloquer leurs badges</p>
          <div className="flex flex-col gap-3">
            {ARENA_BADGES.map(({ zoneId, badge, bossName, bossTitle, zoneName }) => {
              const earned = !!(state.zoneProgress?.bossDefeated?.[zoneId]);
              return (
                <div
                  key={zoneId}
                  className="flex items-center gap-4 rounded-2xl px-4 py-3 border"
                  style={{
                    background: earned ? 'rgba(234,179,8,0.12)' : 'rgba(30,41,59,0.5)',
                    borderColor: earned ? 'rgba(234,179,8,0.45)' : 'rgba(100,116,139,0.2)',
                    boxShadow: earned ? '0 0 18px rgba(234,179,8,0.2)' : 'none',
                  }}
                >
                  {/* Badge icon */}
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 text-2xl"
                    style={{
                      background: earned ? 'rgba(234,179,8,0.25)' : 'rgba(30,41,59,0.8)',
                      border: `2px solid ${earned ? 'rgba(234,179,8,0.6)' : 'rgba(100,116,139,0.3)'}`,
                      filter: earned ? 'none' : 'grayscale(1) opacity(0.35)',
                    }}
                  >
                    🥇
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-base" style={{ color: earned ? '#fde68a' : '#4b5563' }}>
                      {badge}
                    </div>
                    <div className="text-xs font-bold" style={{ color: earned ? '#94a3b8' : '#374151' }}>
                      {bossName} · {bossTitle}
                    </div>
                    <div className="text-xs" style={{ color: earned ? '#64748b' : '#374151' }}>
                      {zoneName}
                    </div>
                  </div>
                  {earned ? (
                    <span className="text-yellow-400 text-xl shrink-0">✅</span>
                  ) : (
                    <span className="text-slate-600 text-xl shrink-0">🔒</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {mainTab === 'succes' && (
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {BADGES.map((badge) => {
              const earned = state.badges.includes(badge.id);
              return (
                <div
                  key={badge.id}
                  className={`rounded-xl border p-3 flex items-center gap-3 ${
                    earned
                      ? 'border-yellow-500/50 bg-yellow-900/20'
                      : 'border-slate-600/30 bg-slate-800/30'
                  }`}
                >
                  <span className="text-2xl" style={{ filter: earned ? 'none' : 'grayscale(1) opacity(0.3)' }}>
                    {badge.secret && !earned ? '❓' : badge.icon}
                  </span>
                  <div className="min-w-0">
                    <div
                      className="font-bold text-sm truncate"
                      style={{ color: earned ? '#fde68a' : '#4b5563' }}
                    >
                      {badge.secret && !earned ? '???' : badge.label}
                    </div>
                    <div className="text-xs" style={{ color: earned ? '#94a3b8' : '#374151' }}>
                      {badge.secret && !earned ? '????' : badge.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
