import { useState } from 'react';
import { TutorialOverlay, isTutorialDone } from './TutorialOverlay';
import { COLLECTION_TUTORIAL } from './TutorialContent';
import { GameState, RARITY_COLORS, RARITY_LABELS, Rarity } from '../types';
import { GEN1_POKEMON, POKEMON_BY_ID } from '../data/gen1';
import { ZONES } from '../data/zones';
import { POKEMON_TYPE, TYPE_COLORS, PokemonType } from '../data/pokemonTypes';
import { xpToNextLevel, getPokemonProfile } from '../data/combatEngine';
import { GEN1_STATS } from '../data/gen1Stats';
import { MOVES } from '../data/gen1Moves';
import { GEN1_MOVEPOOL, getAvailableMoves } from '../data/gen1Movepools';


interface Props {
  state: GameState;
  onClose: () => void;
  onMarkTutorialDone?: () => void;
  onSaveCustomMoves?: (pokemonId: number, slugs: string[]) => void;
}

type FilterTab = 'tous' | 'captures' | 'shinies' | Rarity;
type MainTab = 'collection' | 'badges';

// All arena badges (zones with a boss that has a badge)
const ARENA_BADGES = ZONES.filter(z => z.boss?.badge).map(z => ({
  zoneId: z.id,
  badge: z.boss!.badge,
  bossName: z.boss!.name,
  bossTitle: z.boss!.title,
  zoneName: z.name,
}));

const RARITY_ORDER: Rarity[] = ['commun', 'peu_commun', 'rare', 'elite', 'legendaire'];

export function Collection({ state, onClose: _onClose, onMarkTutorialDone }: Props) {
  const [showTutorial, setShowTutorial] = useState(() =>
    !state.completedTutorials?.includes('collection') && !isTutorialDone('collection')
  );
  const [mainTab, setMainTab] = useState<MainTab>('collection');
  const [filter, setFilter] = useState<FilterTab>(() => {
    try { return (localStorage.getItem('katchii_pokedex_filter') as FilterTab) ?? 'tous'; } catch { return 'tous'; }
  });
  const applyFilter = (f: FilterTab) => {
    setFilter(f);
    try { localStorage.setItem('katchii_pokedex_filter', f); } catch {}
  };
  const [filterOpen, setFilterOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<PokemonType | null>(null);
  const [selectedId, setSelectedId_] = useState<number | null>(null);
  const [detailTab, setDetailTab] = useState<'attaques' | 'stats'>('attaques');
  const setSelectedId = (id: number | null) => { setSelectedId_(id); setDetailTab('attaques'); };
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<'id' | 'rarity_desc' | 'level_desc'>(() => {
    try { return (localStorage.getItem('katchii_pokedex_sort') as 'id' | 'rarity_desc' | 'level_desc') ?? 'id'; } catch { return 'id'; }
  });
  const applySortMode = (s: 'id' | 'rarity_desc' | 'level_desc') => {
    setSortMode(s);
    try { localStorage.setItem('katchii_pokedex_sort', s); } catch {}
  };

  const totalCaught = GEN1_POKEMON.filter(p => (state.normalCollection[p.id] ?? 0) > 0).length;
  const totalShinyCaught = GEN1_POKEMON.filter(p => (state.shinyCollection[p.id] ?? 0) > 0).length;

  const rarityOrder = ['legendaire', 'elite', 'rare', 'peu_commun', 'commun'];

  const filteredPokemon = GEN1_POKEMON.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'tous') {
      // only type filter applies to status
    } else if (filter === 'captures') {
      if (!((state.normalCollection[p.id] ?? 0) > 0)) return false;
    } else if (filter === 'shinies') {
      if (!((state.shinyCollection[p.id] ?? 0) > 0)) return false;
    } else {
      if (p.rarity !== filter) return false;
    }
    if (typeFilter) {
      const types = POKEMON_TYPE[p.id] ?? [];
      if (!types.includes(typeFilter)) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortMode === 'rarity_desc') {
      const ra = rarityOrder.indexOf(a.rarity);
      const rb = rarityOrder.indexOf(b.rarity);
      return ra !== rb ? ra - rb : a.id - b.id;
    }
    if (sortMode === 'level_desc') {
      const la = state.pokemonLevels?.[a.id]?.level ?? 0;
      const lb = state.pokemonLevels?.[b.id]?.level ?? 0;
      return lb !== la ? lb - la : a.id - b.id;
    }
    return a.id - b.id;
  });

  const filterTabs: { id: FilterTab; label: string }[] = [
    { id: 'tous', label: 'Tous' },
    { id: 'captures', label: 'Capturés' },
    { id: 'shinies', label: 'Shinies' },
    ...RARITY_ORDER.map((r) => ({ id: r as FilterTab, label: RARITY_LABELS[r] })),
  ];

  return (
    <div className="fixed inset-x-0 top-0 z-[510] flex flex-col" style={{ bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))', background: '#b91c1c', fontFamily: 'monospace' }}>
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(180deg, #dc2626 0%, #991b1b 100%)',
          paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))',
          paddingBottom: '0.5rem',
          paddingLeft: '1rem',
          paddingRight: '1rem',
          borderBottom: '2px solid #7f1d1d',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }}
      >
        <div className="flex items-center gap-3">
<div className="flex items-center gap-2 flex-1">
            {/* Pokéball icon */}
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              background: 'linear-gradient(180deg, #dc2626 50%, white 50%)',
              border: '2px solid #111',
              boxShadow: '0 0 4px rgba(0,0,0,0.4)',
              position: 'relative',
              flexShrink: 0,
            }}>
              <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 2, background: '#111', transform: 'translateY(-50%)' }} />
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 6, height: 6, borderRadius: '50%', background: 'white', border: '1.5px solid #111', zIndex: 1 }} />
            </div>
            <span style={{ color: 'white', fontWeight: 900, fontSize: '1.1rem', letterSpacing: '0.15em', fontFamily: 'monospace' }}>
              POKÉDEX
            </span>
            <div style={{ flex: 1 }} />
            <span style={{ color: '#fecaca', fontSize: '0.6rem', fontFamily: 'monospace' }}>
              {totalCaught}/151 · {totalShinyCaught}✨
            </span>
          </div>
        </div>
      </div>

      {/* Main tabs */}
      <div className="flex shrink-0" style={{ background: '#991b1b', borderBottom: '2px solid #7f1d1d', padding: '6px 12px', gap: 8 }}>
        {([
          { id: 'collection' as MainTab, label: '📚 POKÉDEX' },
          { id: 'badges' as MainTab, label: '🥇 BADGES' },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setMainTab(tab.id)}
            style={{
              padding: '5px 14px',
              borderRadius: 6,
              fontSize: '0.7rem',
              fontWeight: 900,
              fontFamily: 'monospace',
              letterSpacing: '0.08em',
              border: 'none',
              cursor: 'pointer',
              background: mainTab === tab.id ? '#1f2937' : '#b91c1c',
              color: mainTab === tab.id ? '#4ade80' : '#fca5a5',
              boxShadow: mainTab === tab.id ? 'inset 0 2px 4px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.3)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {mainTab === 'collection' && (
        <>
          {/* Search bar + sort */}
          <div style={{ padding: '6px 10px', background: '#991b1b', display: 'flex', gap: 8, flexShrink: 0 }}>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher…"
              style={{
                flex: 1,
                background: '#1f2937',
                border: '1px solid #374151',
                borderRadius: 6,
                padding: '5px 10px',
                fontSize: '0.75rem',
                color: 'white',
                fontFamily: 'monospace',
                outline: 'none',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#dc2626'; e.currentTarget.style.boxShadow = '0 0 0 2px #dc262655'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#374151'; e.currentTarget.style.boxShadow = 'none'; }}
            />
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              {([['id', '#'], ['rarity_desc', '★'], ['level_desc', '↓Nv']] as const).map(([k, label]) => (
                <button key={k} onClick={() => applySortMode(k)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 5,
                    fontSize: '0.65rem',
                    fontWeight: 900,
                    fontFamily: 'monospace',
                    cursor: 'pointer',
                    background: sortMode === k ? '#7f1d1d' : '#1f2937',
                    color: sortMode === k ? '#fca5a5' : '#9ca3af',
                    border: `1px solid ${sortMode === k ? '#ef4444' : '#374151'}`,
                  }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Filter button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px', background: '#991b1b', borderBottom: '1px solid #7f1d1d', flexShrink: 0 }}>
            <button
              onClick={() => setFilterOpen(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 6,
                fontSize: '0.65rem', fontWeight: 900, fontFamily: 'monospace',
                background: '#7f1d1d', color: '#fca5a5',
                border: '1px solid #ef444466', cursor: 'pointer',
              }}
            >
              <span>🔍</span>
              <span>FILTRER</span>
              {filter !== 'tous' && (
                <span style={{
                  marginLeft: 2, padding: '1px 6px', borderRadius: 99,
                  color: 'white', fontWeight: 900, fontSize: '0.55rem',
                  background: RARITY_ORDER.includes(filter as Rarity) ? RARITY_COLORS[filter as Rarity] : '#dc2626',
                }}>
                  {filterTabs.find(t => t.id === filter)?.label}
                </span>
              )}
              <span style={{ transform: filterOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>▾</span>
            </button>
            {filter !== 'tous' && (
              <button onClick={() => applyFilter('tous')} style={{ color: '#fca5a5', fontSize: '0.65rem', background: 'none', border: 'none', cursor: 'pointer' }}>✕ Réinitialiser</button>
            )}
          </div>

          {/* Filter dropdown */}
          {filterOpen && (
            <div style={{ borderBottom: '1px solid #7f1d1d', background: '#7f1d1d', flexShrink: 0, padding: '8px 10px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {filterTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => { applyFilter(tab.id); setFilterOpen(false); }}
                    style={{
                      padding: '3px 10px', borderRadius: 99,
                      fontSize: '0.65rem', fontWeight: 900, fontFamily: 'monospace',
                      cursor: 'pointer', whiteSpace: 'nowrap',
                      background: filter === tab.id
                        ? (RARITY_ORDER.includes(tab.id as Rarity) ? RARITY_COLORS[tab.id as Rarity] : '#dc2626')
                        : '#991b1b',
                      color: filter === tab.id ? 'white' : '#fca5a5',
                      border: `1px solid ${filter === tab.id ? 'transparent' : '#ef444433'}`,
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              {/* Type filter inside dropdown */}
              <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 2 }}>
                {([null, 'normal', 'fire', 'water', 'grass', 'electric', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon'] as (PokemonType | null)[]).map((t) => (
                  <button
                    key={t ?? 'all'}
                    onClick={() => setTypeFilter(t === typeFilter ? null : t)}
                    style={{
                      padding: '2px 8px', borderRadius: 99,
                      fontSize: '0.6rem', fontWeight: 900, fontFamily: 'monospace',
                      cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                      ...(t === null
                        ? {
                            background: typeFilter === null ? '#5a0e0e' : '#991b1b',
                            color: typeFilter === null ? '#fca5a5' : '#9ca3af',
                            border: `1px solid ${typeFilter === null ? '#ef4444' : '#374151'}`,
                          }
                        : {
                            background: typeFilter === t ? (TYPE_COLORS[t] ?? '#888') : `${TYPE_COLORS[t] ?? '#888'}22`,
                            color: typeFilter === t ? 'white' : TYPE_COLORS[t] ?? '#888',
                            border: `1px solid ${TYPE_COLORS[t] ?? '#888'}${typeFilter === t ? '' : '55'}`,
                          }
                      ),
                    }}
                  >
                    {t === null ? 'Tous types' : t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* LCD Screen wrapping the grid */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px 80px 8px', background: '#b91c1c' }}>
            <div style={{
              background: '#c8dce8',
              backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,40,0.04) 0px, rgba(0,0,40,0.04) 1px, transparent 1px, transparent 3px)',
              borderRadius: 12,
              padding: '10px 8px',
              boxShadow: 'inset 0 0 20px rgba(0,0,80,0.15), inset 0 0 4px rgba(100,150,200,0.3)',
              minHeight: '100%',
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: 6,
              }}>
                {filteredPokemon.map((pokemon) => {
                  const caught = (state.normalCollection[pokemon.id] ?? 0) > 0;
                  const shinyCaught = (state.shinyCollection[pokemon.id] ?? 0) > 0;
                  const rarityColor = RARITY_COLORS[pokemon.rarity];
                  const numStr = `#${String(pokemon.id).padStart(3, '0')}`;

                  return (
                    <div
                      key={pokemon.id}
                      onClick={() => caught && setSelectedId(pokemon.id)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 2,
                        padding: '5px 3px 4px',
                        borderRadius: 6,
                        cursor: caught ? 'pointer' : 'default',
                        background: caught ? 'rgba(255,255,255,0.5)' : 'rgba(180,200,220,0.4)',
                        border: caught ? '1px solid rgba(100,150,200,0.4)' : '1px solid rgba(100,150,200,0.15)',
                        borderTop: caught ? `2px solid ${rarityColor}` : '2px solid rgba(100,150,200,0.15)',
                        position: 'relative',
                      }}
                    >
                      {/* Number */}
                      <div style={{
                        fontSize: '0.5rem',
                        fontFamily: 'monospace',
                        color: caught ? '#2c4a6a' : 'rgba(80,120,160,0.4)',
                        lineHeight: 1,
                        alignSelf: 'flex-start',
                        paddingLeft: 2,
                      }}>
                        {caught ? numStr : '#???'}
                      </div>

                      {/* Sprite */}
                      <div className={shinyCaught ? 'shiny-rainbow' : ''} style={{ display: 'inline-block', position: 'relative' }}>
                        <img
                          src={
                            caught
                              ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${shinyCaught ? 'shiny/' : ''}${pokemon.id}.png`
                              : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`
                          }
                          alt={caught ? pokemon.name : '???'}
                          width={40}
                          height={40}
                          style={{
                            imageRendering: 'pixelated',
                            filter: caught
                              ? (shinyCaught
                                ? undefined
                                : `drop-shadow(0 0 4px ${rarityColor}) drop-shadow(0 0 1px ${rarityColor}88)`)
                              : 'brightness(0) opacity(0.25)',
                          }}
                          draggable={false}
                        />
                        {shinyCaught && (
                          <>
                            <span className="absolute -top-2 -right-1" style={{ animation: 'pokedex-star-orbit-a 2s linear infinite', fontSize: '0.55rem' }}>⭐</span>
                            <span className="absolute -bottom-1 -left-1" style={{ animation: 'pokedex-star-orbit-b 2.5s linear infinite', fontSize: '0.5rem' }}>✦</span>
                          </>
                        )}
                      </div>

                      {/* Name */}
                      <div style={{
                        fontSize: '0.5rem',
                        fontFamily: 'monospace',
                        color: caught ? '#1a2a3a' : 'rgba(80,120,160,0.4)',
                        textAlign: 'center',
                        lineHeight: 1.2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '100%',
                      }}>
                        {caught ? pokemon.name : '???'}
                      </div>

                      {/* Shiny badge */}
                      {shinyCaught && (
                        <span style={{ position: 'absolute', top: 2, right: 2, fontSize: '0.55rem' }}>✨</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {filteredPokemon.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: '#2d4a2d' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔍</div>
                  <p style={{ fontSize: '0.8rem', fontWeight: 900, fontFamily: 'monospace', color: '#4ade8044' }}>AUCUN RÉSULTAT</p>
                  <p style={{ fontSize: '0.65rem', fontFamily: 'monospace', color: '#2d4a2d' }}>Continuez à chasser !</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {mainTab === 'badges' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 96px', background: '#b91c1c' }}>
          <p style={{ color: '#fca5a5', fontSize: '0.65rem', fontFamily: 'monospace', textAlign: 'center', marginBottom: 12 }}>
            BATS LES MAÎTRES D'ARÈNE POUR DÉBLOQUER LEURS BADGES
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {ARENA_BADGES.map(({ zoneId, badge, bossName, bossTitle, zoneName }) => {
              const earned = !!(state.zoneProgress?.bossDefeated?.[zoneId]);
              return (
                <div
                  key={zoneId}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    borderRadius: 10, padding: '10px 14px',
                    background: earned ? '#1a1200' : '#111c11',
                    border: `1px solid ${earned ? 'rgba(234,179,8,0.45)' : '#1f2d1f'}`,
                    boxShadow: earned ? '0 0 12px rgba(234,179,8,0.15)' : 'none',
                    fontFamily: 'monospace',
                  }}
                >
                  <div
                    style={{
                      width: 48, height: 48, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.4rem', flexShrink: 0,
                      background: earned ? 'rgba(234,179,8,0.2)' : '#1a1a1a',
                      border: `2px solid ${earned ? 'rgba(234,179,8,0.6)' : '#2d2d2d'}`,
                      filter: earned ? 'none' : 'grayscale(1) opacity(0.3)',
                    }}
                  >
                    🥇
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 900, fontSize: '0.85rem', color: earned ? '#fde68a' : '#2d4a2d' }}>
                      {badge}
                    </div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: earned ? '#94a3b8' : '#1f2d1f' }}>
                      {bossName} · {bossTitle}
                    </div>
                    <div style={{ fontSize: '0.6rem', color: earned ? '#475569' : '#1f2d1f' }}>
                      {zoneName}
                    </div>
                  </div>
                  {earned ? (
                    <span style={{ color: '#fde68a', fontSize: '1.2rem', flexShrink: 0 }}>✅</span>
                  ) : (
                    <span style={{ color: '#2d4a2d', fontSize: '1.2rem', flexShrink: 0 }}>🔒</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pokemon detail — full screen */}
      {selectedId !== null && (() => {
        const p = POKEMON_BY_ID[selectedId];
        if (!p) return null;
        const caught = (state.normalCollection[selectedId] ?? 0) > 0;
        if (!caught) return null;
        const isShiny = (state.shinyCollection[selectedId] ?? 0) > 0;
        const lvData = state.pokemonLevels?.[selectedId] ?? { level: 1, xp: 0 };
        const xpPct = lvData.level >= 100 ? 100 : Math.min(100, Math.floor(lvData.xp / xpToNextLevel(lvData.level) * 100));
        const types = POKEMON_TYPE[selectedId] ?? ['normal'];
        const rarityColor = RARITY_COLORS[p.rarity];
        const normalCount = state.normalCollection[selectedId] ?? 0;
        const numStr = `#${String(selectedId).padStart(3, '0')}`;

        // Level-gated pool: unlock moves based on level
        const pool = GEN1_MOVEPOOL[selectedId] ?? [];
        const availablePool = getAvailableMoves(selectedId, lvData.level);
        const activeSlugs: string[] = state.pokemonCustomMoves?.[selectedId] ?? availablePool.slice(0, 4);

        return (
          <div
            className="fixed inset-x-0 top-0 z-[520] flex flex-col"
            style={{ bottom: 72, background: '#dce8f0', fontFamily: 'monospace' }}
          >
            {/* Top bar */}
            <div
              style={{
                background: 'linear-gradient(180deg, #dc2626 0%, #991b1b 100%)',
                paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))',
                paddingBottom: '0.6rem',
                paddingLeft: '1rem',
                paddingRight: '1rem',
                borderBottom: '2px solid #7f1d1d',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flexShrink: 0,
              }}
            >
              <button
                onClick={() => setSelectedId(null)}
                style={{ color: '#fca5a5', fontSize: '0.85rem', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 900 }}
              >← Retour</button>
              <span style={{ color: 'white', fontWeight: 900, fontSize: '0.9rem', fontFamily: 'monospace', flex: 1 }}>
                <span style={{ color: '#4ade80' }}>{numStr}</span> — {p.name.toUpperCase()}
              </span>
            </div>

            {/* Scrollable content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px 80px', display: 'flex', flexDirection: 'column', gap: 12, background: '#dce8f0' }}>

              {/* Sprite + name block */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div
                  className={isShiny ? 'shiny-rainbow' : ''}
                  style={{
                    display: 'inline-block',
                    background: '#c8dce8',
                    backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,40,0.04) 0px, rgba(0,0,40,0.04) 1px, transparent 1px, transparent 3px)',
                    borderRadius: 16,
                    padding: '12px',
                    boxShadow: `0 0 24px ${rarityColor}66, inset 0 0 10px rgba(0,0,80,0.1)`,
                    border: `2px solid ${rarityColor}44`,
                  }}
                >
                  <img
                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${isShiny ? 'shiny/' : ''}${selectedId}.png`}
                    alt={p.name}
                    width={120}
                    height={120}
                    style={{
                      imageRendering: 'pixelated',
                      filter: isShiny ? undefined : `drop-shadow(0 0 10px ${rarityColor})`,
                    }}
                  />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#1a2a3a', fontWeight: 900, fontSize: '1.3rem', fontFamily: 'monospace' }}>{p.name}</div>
                  <div style={{ color: '#2c4a6a', fontSize: '0.75rem', fontFamily: 'monospace', marginTop: 2 }}>{numStr}</div>
                  <div style={{ color: rarityColor, fontSize: '0.65rem', fontFamily: 'monospace', marginTop: 2 }}>{RARITY_LABELS[p.rarity]}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {types.map(t => (
                    <span key={t}
                      style={{
                        background: TYPE_COLORS[t as PokemonType] ?? '#888',
                        color: 'white', fontWeight: 900, fontFamily: 'monospace',
                        borderRadius: 4, padding: '2px 10px', fontSize: '0.65rem',
                      }}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </span>
                  ))}
                </div>
                {/* Capture count chip */}
                <div style={{
                  background: 'white',
                  border: '1px solid rgba(60,100,150,0.3)',
                  borderRadius: 99,
                  padding: '3px 12px',
                  color: '#2c4a6a',
                  fontSize: '0.65rem',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                }}>
                  Capturé {normalCount} fois
                </div>
              </div>

              {/* Level / XP bar */}
              <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: 10, padding: '10px 14px', border: '1px solid #a0c0d8', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#4a6a8a', fontSize: '0.7rem', fontFamily: 'monospace', fontWeight: 700 }}>NIVEAU</span>
                  <span style={{ color: '#1a2a3a', fontSize: '0.85rem', fontFamily: 'monospace', fontWeight: 900 }}>{lvData.level >= 100 ? 'MAX' : lvData.level}</span>
                </div>
                <div style={{ width: '100%', background: '#a8c0d0', borderRadius: 99, height: 6, border: '1px solid #90b0c8' }}>
                  <div style={{ height: '100%', borderRadius: 99, transition: 'width 0.4s', width: `${xpPct}%`, background: `linear-gradient(90deg, ${rarityColor}, #fbbf24)` }} />
                </div>
                {lvData.level < 100 && (
                  <div style={{ textAlign: 'right', fontSize: '0.6rem', color: '#4a6a8a', fontFamily: 'monospace' }}>
                    {lvData.xp} / {xpToNextLevel(lvData.level)} XP
                  </div>
                )}
                {pool.length > 0 && availablePool.length < pool.length && (
                  <div style={{ fontSize: '0.6rem', color: '#6b7280', fontFamily: 'monospace' }}>
                    🔓 {availablePool.length}/{pool.length} attaques débloquées
                  </div>
                )}
              </div>

              {/* Tab selector */}
              <div style={{ display: 'flex', gap: 6, background: 'rgba(100,150,200,0.2)', borderRadius: 8, padding: 4 }}>
                {(['attaques', 'stats'] as const).map(tab => (
                  <button key={tab} onClick={() => setDetailTab(tab)}
                    style={{
                      flex: 1, padding: '6px', borderRadius: 6,
                      fontSize: '0.68rem', fontWeight: 900, fontFamily: 'monospace',
                      cursor: 'pointer', border: 'none',
                      background: detailTab === tab ? 'rgba(255,255,255,0.8)' : 'transparent',
                      color: detailTab === tab ? '#1a4a7a' : '#4a6a8a',
                      boxShadow: detailTab === tab ? 'inset 0 1px 3px rgba(0,0,80,0.15)' : 'none',
                    }}>
                    {tab === 'attaques' ? '⚔️ ATTAQUES' : '📊 STATS'}
                  </button>
                ))}
              </div>

              {/* Tab: Attaques */}
              {detailTab === 'attaques' && (
                <>
                  {/* Movepool editor */}
                  {pool.length > 0 && (
                    <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: 10, padding: '10px 12px', border: '1px solid #a0c0d8' }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ color: '#4a6a8a', fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 700 }}>ATTAQUES ACTIVES</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {activeSlugs.map(slug => {
                          const m = MOVES[slug];
                          if (!m) return null;
                          const typeColor = TYPE_COLORS[m.type as PokemonType] ?? '#475569';
                          return (
                            <div key={slug} style={{ borderRadius: 7, padding: '7px 10px', background: `${typeColor}18`, border: `1px solid ${typeColor}44` }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ color: 'white', fontWeight: 900, borderRadius: 3, padding: '1px 5px', flexShrink: 0, background: typeColor, fontSize: '0.42rem', fontFamily: 'monospace' }}>{m.type.toUpperCase()}</span>
                                <span style={{ color: '#1a2a3a', fontSize: '0.72rem', fontWeight: 700, fontFamily: 'monospace', flex: 1 }}>{m.name}</span>
                                <span style={{ color: '#9ca3af', fontSize: '0.6rem', flexShrink: 0, fontFamily: 'monospace' }}>{m.category === 'physical' ? 'PHYS' : m.category === 'special' ? 'SPÉ' : 'STAT'}</span>
                                {m.power > 0 && <span style={{ color: '#e2e8f0', fontSize: '0.65rem', fontWeight: 900, flexShrink: 0, fontFamily: 'monospace' }}>{m.power}</span>}
                              </div>
                              {m.description && (
                                <div style={{ color: '#6b7280', marginTop: 3, fontSize: '0.58rem', lineHeight: 1.4, fontFamily: 'monospace' }}>{m.description}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Tab: Stats */}
              {detailTab === 'stats' && (() => {
                const stats = GEN1_STATS[selectedId];
                if (!stats) return null;
                const rows: [string, number, string][] = [
                  ['PV',   stats.hp,        '#4ade80'],
                  ['ATK',  stats.attack,     '#f87171'],
                  ['DEF',  stats.defense,    '#fb923c'],
                  ['SpA',  stats.spAttack,   '#818cf8'],
                  ['SpD',  stats.spDefense,  '#60a5fa'],
                  ['VIT',  stats.speed,      '#fbbf24'],
                ];
                const maxStat = 255;
                const profile = getPokemonProfile(stats.hp);
                const profileLabel = profile === 'tank' ? '🛡️ Tank' : profile === 'equilibre' ? '⚖️ Équilibré' : '💥 Attaquant';
                const profileColor = profile === 'tank' ? '#4ade80' : profile === 'equilibre' ? '#60a5fa' : '#f87171';
                return (
                  <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: 10, padding: '12px 14px', border: '1px solid #a0c0d8', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ color: '#4a6a8a', fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 700 }}>PROFIL :</span>
                      <span style={{ fontSize: '0.65rem', fontWeight: 900, fontFamily: 'monospace', padding: '2px 8px', borderRadius: 99, color: profileColor, background: `${profileColor}22`, border: `1px solid ${profileColor}55` }}>{profileLabel}</span>
                    </div>
                    <div style={{ color: '#1a4a7a', fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 900, letterSpacing: '0.1em', borderBottom: '1px solid #a0c0d8', paddingBottom: 6, marginBottom: 4 }}>
                      STATS DE BASE
                    </div>
                    {rows.map(([label, val, color]) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#4a6a8a', fontWeight: 700, fontSize: '0.65rem', fontFamily: 'monospace', width: 28, flexShrink: 0 }}>{label}</span>
                        <div style={{ flex: 1, background: '#a8c0d0', borderRadius: 99, height: 6, border: '1px solid #90b0c8' }}>
                          <div style={{ height: '100%', borderRadius: 99, background: color, width: `${Math.round((val / maxStat) * 100)}%`, transition: 'width 0.4s' }} />
                        </div>
                        <span style={{ color: '#1a2a3a', fontSize: '0.65rem', fontWeight: 900, fontFamily: 'monospace', width: 24, textAlign: 'right' }}>{val}</span>
                      </div>
                    ))}
                    <div style={{ marginTop: 4, paddingTop: 8, borderTop: '1px solid #a0c0d8', fontSize: '0.6rem', fontFamily: 'monospace', color: '#4a6a8a' }}>
                      <span style={{ fontWeight: 700 }}>Attaque signature : </span>
                      <span style={{ color: '#1a2a3a', fontWeight: 700 }}>{stats.moves[0].name}</span>
                      <span style={{ color: '#6a8aaa' }}> ({stats.moves[0].power} pts · {stats.moves[0].category === 'physical' ? 'Physique' : 'Spéciale'})</span>
                    </div>
                  </div>
                );
              })()}

            </div>
          </div>
        );
      })()}

      {showTutorial && (
        <TutorialOverlay tutorialKey="collection" steps={COLLECTION_TUTORIAL} onDone={() => { setShowTutorial(false); onMarkTutorialDone?.(); }} bottomOffset={72} />
      )}
    </div>
  );
}
