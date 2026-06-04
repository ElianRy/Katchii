import { useState } from 'react';
import { GameState, RARITY_COLORS, RARITY_LABELS, Rarity } from '../types';
import { GEN1_POKEMON } from '../data/gen1';
import { BADGES } from '../data/badges';

interface Props {
  state: GameState;
  onClose: () => void;
}

type FilterTab = 'tous' | 'captures' | 'shinies' | Rarity;
type MainTab = 'collection' | 'badges';

const RARITY_ORDER: Rarity[] = ['commun', 'peu_commun', 'rare', 'elite', 'legendaire'];

export function Collection({ state, onClose }: Props) {
  const [mainTab, setMainTab] = useState<MainTab>('collection');
  const [filter, setFilter] = useState<FilterTab>('tous');

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
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <div>
          <h2 className="text-white font-bold text-xl">Pokédex — Génération 1</h2>
          <p className="text-slate-400 text-sm">
            {totalCaught}/151 capturés · {totalShinyCaught} shinies
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white text-2xl leading-none px-2"
        >
          ✕
        </button>
      </div>

      {/* Main tabs */}
      <div className="flex gap-2 px-4 pt-2 border-b border-slate-700 shrink-0">
        {([
          { id: 'collection' as MainTab, label: '📚 Collection' },
          { id: 'badges' as MainTab, label: '🏅 Badges' },
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
          {/* Filter tabs */}
          <div className="flex gap-2 px-4 py-2 border-b border-slate-700 overflow-x-auto shrink-0">
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                  filter === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
                style={
                  RARITY_ORDER.includes(tab.id as Rarity) && filter === tab.id
                    ? { backgroundColor: RARITY_COLORS[tab.id as Rarity] + 'cc' }
                    : undefined
                }
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
              {filteredPokemon.map((pokemon) => {
                const caught = (state.normalCollection[pokemon.id] ?? 0) > 0;
                const shinyCaught = (state.shinyCollection[pokemon.id] ?? 0) > 0;
                const normalCount = state.normalCollection[pokemon.id] ?? 0;
                const shinyCount = state.shinyCollection[pokemon.id] ?? 0;
                const rarityColor = RARITY_COLORS[pokemon.rarity];

                return (
                  <div key={pokemon.id} className="flex flex-col items-center gap-1 relative">
                    <div
                      className="relative rounded-lg p-1 w-16 h-16 flex items-center justify-center"
                      style={{
                        border: caught ? `2px solid ${rarityColor}` : '2px solid transparent',
                        background: caught ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.5)',
                        boxShadow: caught ? `0 0 8px 2px ${rarityColor}44` : 'none',
                      }}
                    >
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
                          filter: caught ? 'none' : 'brightness(0) opacity(0.45)',
                        }}
                        draggable={false}
                      />
                      {shinyCaught && (
                        <div className="absolute -top-1 -right-1 text-xs">✨</div>
                      )}
                    </div>
                    <div
                      className="text-xs px-1 rounded font-bold"
                      style={{ color: caught ? rarityColor : '#374151', fontSize: '0.6rem' }}
                    >
                      {RARITY_LABELS[pokemon.rarity].slice(0, 3)}
                    </div>
                    <div
                      className="text-center leading-tight"
                      style={{ color: caught ? '#e2e8f0' : '#4b5563', fontSize: '0.6rem' }}
                    >
                      #{pokemon.id} {caught ? pokemon.name : '???'}
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
