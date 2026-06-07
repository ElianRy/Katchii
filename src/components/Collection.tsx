import { useState } from 'react';
import { GameState, RARITY_COLORS, RARITY_LABELS, Rarity } from '../types';
import { GEN1_POKEMON, POKEMON_BY_ID } from '../data/gen1';
import { BADGES } from '../data/badges';
import { ZONES } from '../data/zones';
import { POKEMON_TYPE, TYPE_COLORS, PokemonType } from '../data/pokemonTypes';
import { xpToNextLevel } from '../data/combatEngine';

function getPokemonTitle(wins: number): string | null {
  if (wins >= 500) return '👑 Maître';
  if (wins >= 200) return '🔥 Légende';
  if (wins >= 100) return '💎 Champion';
  if (wins >= 50) return '⚔️ Guerrier';
  if (wins >= 25) return '🛡️ Combattant';
  if (wins >= 10) return '🌱 Novice';
  return null;
}

const TITLE_THRESHOLDS = [10, 25, 50, 100, 200, 500];
const TITLE_LABELS = ['🌱 Novice', '🛡️ Combattant', '⚔️ Guerrier', '💎 Champion', '🔥 Légende', '👑 Maître'];

function getNextTitle(wins: number): { label: string; remaining: number } | null {
  for (let i = 0; i < TITLE_THRESHOLDS.length; i++) {
    if (wins < TITLE_THRESHOLDS[i]) {
      return { label: TITLE_LABELS[i], remaining: TITLE_THRESHOLDS[i] - wins };
    }
  }
  return null;
}

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
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const totalCaught = GEN1_POKEMON.filter(p => (state.normalCollection[p.id] ?? 0) > 0).length;
  const totalShinyCaught = GEN1_POKEMON.filter(p => (state.shinyCollection[p.id] ?? 0) > 0).length;

  const filteredPokemon = GEN1_POKEMON.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
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
          {/* Search bar */}
          <div className="px-4 pt-2 pb-1 shrink-0">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un Pokémon…"
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

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
                  <div key={pokemon.id} className="flex flex-col items-center gap-1 relative cursor-pointer" onClick={() => caught && setSelectedId(pokemon.id)}>
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

      {/* Pokemon detail modal */}
      {selectedId !== null && (() => {
        const p = POKEMON_BY_ID[selectedId];
        if (!p) return null;
        const caught = (state.normalCollection[selectedId] ?? 0) > 0;
        if (!caught) return null;
        const isShiny = (state.shinyCollection[selectedId] ?? 0) > 0;
        const lvData = state.pokemonLevels?.[selectedId] ?? { level: 1, xp: 0 };
        const xpPct = lvData.level >= 100 ? 100 : Math.min(100, Math.floor(lvData.xp / xpToNextLevel(lvData.level) * 100));
        const wins = (state.pokemonWins ?? {})[selectedId] ?? 0;
        const types = POKEMON_TYPE[selectedId] ?? ['normal'];
        const rarityColor = RARITY_COLORS[p.rarity];
        const normalCount = state.normalCollection[selectedId] ?? 0;
        const shinyCount = state.shinyCollection[selectedId] ?? 0;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setSelectedId(null)}>
            <div
              className="relative bg-slate-900 rounded-3xl p-6 w-72 flex flex-col items-center gap-4 border-2"
              style={{ borderColor: rarityColor }}
              onClick={e => e.stopPropagation()}
            >
              <button className="absolute top-3 right-4 text-slate-400 text-xl" onClick={() => setSelectedId(null)}>✕</button>
              <div className={isShiny ? 'shiny-rainbow' : ''} style={{ display: 'inline-block' }}>
                <img
                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${isShiny ? 'shiny/' : ''}${selectedId}.png`}
                  alt={p.name}
                  width={80} height={80}
                  style={{ imageRendering: 'pixelated', filter: `drop-shadow(0 0 8px ${rarityColor})` }}
                />
              </div>
              <div className="text-center">
                <div className="font-black text-xl text-white">{p.name}</div>
                {getPokemonTitle(wins) && (
                  <div className="text-sm font-bold mt-0.5 text-yellow-300">{getPokemonTitle(wins)}</div>
                )}
                <div className="text-xs mt-0.5" style={{ color: rarityColor }}>{RARITY_LABELS[p.rarity]}</div>
              </div>
              <div className="flex gap-1.5">
                {types.map(t => (
                  <span key={t} className="text-white font-bold rounded px-2 py-0.5 text-xs"
                    style={{ background: TYPE_COLORS[t as PokemonType] ?? '#888' }}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </span>
                ))}
              </div>
              <div className="w-full bg-slate-800 rounded-2xl px-4 py-3 flex flex-col gap-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400 font-bold">Niveau</span>
                  <span className="text-white font-black">{lvData.level >= 100 ? 'MAX' : lvData.level}</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div className="h-2 rounded-full transition-all" style={{ width: `${xpPct}%`, background: `linear-gradient(90deg, ${rarityColor}, #fbbf24)` }} />
                </div>
                {lvData.level < 100 && (
                  <div className="text-right text-xs text-slate-500">{lvData.xp} / {xpToNextLevel(lvData.level)} XP</div>
                )}
              </div>
              {(() => {
                const next = getNextTitle(wins);
                return (
                  <div className="w-full bg-slate-800 rounded-2xl px-4 py-3 flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm font-bold">Victoires</span>
                      <span className="text-yellow-400 font-black text-lg">{wins}</span>
                    </div>
                    {next ? (
                      <div className="text-xs text-slate-400">
                        Prochain titre : <span className="text-white font-bold">{next.label}</span>
                        <span className="text-slate-500"> — encore {next.remaining} victoire{next.remaining > 1 ? 's' : ''}</span>
                      </div>
                    ) : (
                      <div className="text-xs text-yellow-400 font-bold">Titre maximum atteint !</div>
                    )}
                  </div>
                );
              })()}
              <div className="flex flex-col items-center gap-0.5 text-xs text-slate-500">
                <span>Capturé {normalCount} fois</span>
                {shinyCount > 0 && <span className="text-yellow-400">✨ Shiny capturé {shinyCount} fois</span>}
              </div>
            </div>
          </div>
        );
      })()}

      {mainTab === 'succes' && (
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-28">
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
