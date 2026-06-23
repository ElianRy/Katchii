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


interface DexTheme {
  id: string;
  name: string;
  emoji: string;
  price: number;
  bg: string;
  headerGrad: string;
  border: string;
  tabBg: string;
  titleColor: string;
  contentBg: string;
  searchBg: string;
  filterTabBg: string;
  filterTabActive: string;
  inputBg: string;
  cardBg: string;
  hasAnimation?: boolean;
  textColor?: string;
  subTextColor?: string;
}

export const DEX_THEMES: DexTheme[] = [
  { id: 'default',  name: 'Classique',  emoji: '🔴', price: 0,    bg: '#b91c1c', headerGrad: 'linear-gradient(180deg,#dc2626 0%,#991b1b 100%)', border: '#7f1d1d', tabBg: '#991b1b', titleColor: 'white',    contentBg: '#1e3a8a', searchBg: '#991b1b', filterTabBg: '#991b1b', filterTabActive: '#7f1d1d', inputBg: '#1f2937', cardBg: '#1a3578', textColor: '#1e293b', subTextColor: '#475569' },
  { id: 'ocean',    name: 'Océan',      emoji: '🌊', price: 500,  bg: '#1c3fb9', headerGrad: 'linear-gradient(180deg,#2563dc 0%,#1d2d9b 100%)', border: '#1d2d7f', tabBg: '#1d3a9b', titleColor: 'white',    contentBg: '#1c3fb9', searchBg: '#1d3a9b', filterTabBg: '#1d3a9b', filterTabActive: '#1d2d7f', inputBg: '#0f1f3d', cardBg: 'rgba(255,255,255,0.15)', textColor: '#e0f2fe', subTextColor: '#7dd3fc' },
  { id: 'foret',    name: 'Forêt',      emoji: '🌿', price: 500,  bg: '#166534', headerGrad: 'linear-gradient(180deg,#16a34a 0%,#14532d 100%)', border: '#14532d', tabBg: '#166534', titleColor: 'white',    contentBg: '#166534', searchBg: '#166534', filterTabBg: '#166534', filterTabActive: '#14532d', inputBg: '#0a2a15', cardBg: 'rgba(255,255,255,0.15)', textColor: '#dcfce7', subTextColor: '#86efac' },
  { id: 'nuit',     name: 'Nuit',       emoji: '🌙', price: 1000, bg: '#0f0f1e', headerGrad: 'linear-gradient(180deg,#1e1b4b 0%,#0f0f1e 100%)', border: '#312e81', tabBg: '#1e1b4b', titleColor: '#a5b4fc', contentBg: '#0f0f1e', searchBg: '#1e1b4b', filterTabBg: '#1e1b4b', filterTabActive: '#312e81', inputBg: '#0a0a14', cardBg: 'rgba(255,255,255,0.08)', textColor: '#e2e8f0', subTextColor: '#94a3b8' },
  { id: 'rose',     name: 'Sakura',     emoji: '🌸', price: 1500, bg: '#9d174d', headerGrad: 'linear-gradient(180deg,#db2777 0%,#9d174d 100%)', border: '#831843', tabBg: '#be185d', titleColor: 'white',    contentBg: '#9d174d', searchBg: '#be185d', filterTabBg: '#be185d', filterTabActive: '#831843', inputBg: '#3d0a20', cardBg: 'rgba(255,255,255,0.15)', hasAnimation: true, textColor: '#fce7f3', subTextColor: '#f9a8d4' },
  { id: 'galaxie',  name: 'Galaxie',    emoji: '🌌', price: 2000, bg: '#020209', headerGrad: 'linear-gradient(135deg, #0a0a2e 0%, #1a0a3e 50%, #0a1a3e 100%)', border: '#4338ca', tabBg: '#0a0a2e', titleColor: '#a5b4fc', contentBg: '#030312', searchBg: '#0a0a2e', filterTabBg: '#0f0f35', filterTabActive: '#4338ca', inputBg: '#0a0a2e', cardBg: '#0a0a2e', hasAnimation: true, textColor: '#e0e7ff', subTextColor: '#a5b4fc' },
];

// All animation keyframes declared once globally to avoid re-injection bugs
const DEX_ANIM_STYLES = `
  @keyframes dex-petal-fall {
    0% { transform: translateY(-30px) translateX(0) rotate(0deg); opacity: 1; }
    80% { opacity: 0.85; }
    100% { transform: translateY(100vh) translateX(55px) rotate(240deg); opacity: 0; }
  }
  @keyframes dex-sakura-title {
    0%, 100% { text-shadow: 0 0 8px #f9a8d4, 0 0 16px #f9a8d4; }
    50% { text-shadow: 0 0 22px #fce7f3, 0 0 44px #f9a8d4; }
  }
  @keyframes dex-twinkle { 0%,100% { opacity: 0.15; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.6); } }
  @keyframes dex-shoot {
    0% { transform: translateX(0) translateY(0) scaleX(0.1); opacity: 0; }
    8% { opacity: 1; }
    100% { transform: translateX(150px) translateY(75px) scaleX(1); opacity: 0; }
  }
  @keyframes dex-nebula { 0%,100% { opacity: 0.2; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.12); } }
  @keyframes dex-float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
  @keyframes dex-galaxie-title {
    0% { color: #a5b4fc; text-shadow: 0 0 10px #6366f1, 0 0 28px #4f46e5; }
    25% { color: #c4b5fd; text-shadow: 0 0 12px #a855f7, 0 0 30px #7c3aed; }
    50% { color: #93c5fd; text-shadow: 0 0 12px #3b82f6, 0 0 30px #2563eb; }
    75% { color: #f0abfc; text-shadow: 0 0 12px #e879f9, 0 0 30px #a21caf; }
    100% { color: #a5b4fc; text-shadow: 0 0 10px #6366f1, 0 0 28px #4f46e5; }
  }
`;

function AnimatedDexOverlay({ themeId }: { themeId: string }) {
  if (themeId === 'rose') {
    const petals = Array.from({ length: 22 }, (_, i) => i);
    return (
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 2 }}>
        {petals.map(i => (
          <div key={i} style={{
            position: 'absolute',
            top: '-30px',
            left: `${(i / 22) * 100 + (i % 3) * 1.5}%`,
            width: 10 + (i % 4) * 5,
            height: 10 + (i % 4) * 5,
            borderRadius: '50% 0 50% 0',
            background: i % 3 === 0 ? '#ff80b0' : i % 3 === 1 ? '#ffb0d0' : '#ff5090',
            animation: `dex-petal-fall ${2 + (i % 5) * 0.6}s ${i * 0.18}s linear infinite`,
            boxShadow: '0 0 5px #ff60a0',
          }} />
        ))}
      </div>
    );
  }
  if (themeId === 'galaxie') {
    const stars = Array.from({ length: 70 }, (_, i) => i);
    const shootingStars = [0, 1, 2, 3, 4];
    const nebulas = [0, 1, 2];
    return (
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 2 }}>
        {/* Nebula glows */}
        {nebulas.map(i => (
          <div key={i} style={{
            position: 'absolute',
            top: `${15 + i * 28}%`,
            left: `${5 + i * 35}%`,
            width: 180,
            height: 90,
            borderRadius: '50%',
            background: i === 0
              ? 'radial-gradient(ellipse, rgba(99,102,241,0.45), transparent)'
              : i === 1
              ? 'radial-gradient(ellipse, rgba(168,85,247,0.38), transparent)'
              : 'radial-gradient(ellipse, rgba(236,72,153,0.3), transparent)',
            animation: `dex-nebula ${5 + i * 2.5}s ${i * 1.5}s ease-in-out infinite`,
          }} />
        ))}
        {/* Stars */}
        {stars.map(i => (
          <div key={i} style={{
            position: 'absolute',
            top: `${(i * 37 + 11) % 100}%`,
            left: `${(i * 61 + 7) % 100}%`,
            width: 1.5 + (i % 3),
            height: 1.5 + (i % 3),
            borderRadius: '50%',
            background: i % 5 === 0 ? '#c4b5fd' : i % 5 === 1 ? '#93c5fd' : i % 5 === 2 ? '#f0abfc' : i % 5 === 3 ? '#fde68a' : 'white',
            animation: `dex-twinkle ${0.6 + (i % 5) * 0.5}s ${(i % 8) * 0.22}s ease-in-out infinite`,
            boxShadow: i % 4 === 0 ? '0 0 5px currentColor' : undefined,
          }} />
        ))}
        {/* Shooting stars */}
        {shootingStars.map(i => (
          <div key={i} style={{
            position: 'absolute',
            top: `${4 + i * 18}%`,
            left: `${3 + i * 15}%`,
            width: 80,
            height: 2.5,
            background: 'linear-gradient(90deg, white, rgba(196,181,253,0.8), transparent)',
            borderRadius: 99,
            animation: `dex-shoot ${1 + i * 0.6}s ${i * 2.2 + 0.3}s ease-in infinite`,
            opacity: 0,
          }} />
        ))}
      </div>
    );
  }
  return null;
}

interface Props {
  state: GameState;
  onClose: () => void;
  onMarkTutorialDone?: () => void;
  onSaveCustomMoves?: (pokemonId: number, slugs: string[]) => void;
  onUpdateTheme?: (themeId: string, unlocked: string[], cost: number) => void;
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

export function Collection({ state, onClose: _onClose, onMarkTutorialDone, onUpdateTheme }: Props) {
  const dexTheme = DEX_THEMES.find(t => t.id === (state.dexThemeId ?? 'default')) ?? DEX_THEMES[0];
  const dexUnlocked = state.dexUnlockedThemes ?? ['default'];
  const [showThemeModal, setShowThemeModal] = useState(false);
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

  const setSelectedId = (id: number | null) => { setSelectedId_(id); };
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
    <div className="fixed inset-x-0 top-0 z-[510] flex flex-col" style={{ bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))', background: dexTheme.bg, fontFamily: 'monospace', position: 'relative' }}>
      {/* Global animation keyframes — injected once, not inside overlays */}
      <style>{DEX_ANIM_STYLES}</style>
      {/* Header */}
      <div style={{
        background: dexTheme.headerGrad,
        paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))',
        paddingBottom: '0.5rem',
        paddingLeft: '1rem',
        paddingRight: '1rem',
        borderBottom: `2px solid ${dexTheme.border}`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
      }}>
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
            <span style={{ color: dexTheme.titleColor, fontWeight: 900, fontSize: '1.1rem', letterSpacing: '0.15em', fontFamily: 'monospace' }}>
              {dexTheme.hasAnimation && dexTheme.id === 'rose' ? (
                <span style={{ animation: 'dex-sakura-title 2s ease-in-out infinite' }}>POKÉDEX</span>
              ) : dexTheme.hasAnimation && dexTheme.id === 'galaxie' ? (
                <span style={{ animation: 'dex-galaxie-title 4s linear infinite' }}>POKÉDEX</span>
              ) : 'POKÉDEX'}
            </span>
            <div style={{ flex: 1 }} />
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.6rem', fontFamily: 'monospace' }}>
              {totalCaught}/151 · {totalShinyCaught}✨
            </span>
            <button onClick={() => setShowThemeModal(true)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-sm"
              style={{ background: 'rgba(255,255,255,0.15)', border: `1px solid ${dexTheme.border}` }}>⚙️</button>
          </div>
        </div>
      </div>

      {/* Main tabs */}
      <div className="flex shrink-0" style={{ background: dexTheme.tabBg, borderBottom: `2px solid ${dexTheme.border}`, padding: '6px 12px', gap: 8 }}>
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
              background: mainTab === tab.id ? '#1f2937' : dexTheme.filterTabBg,
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
          <div style={{ padding: '6px 10px', background: dexTheme.searchBg, display: 'flex', gap: 8, flexShrink: 0 }}>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher…"
              style={{
                flex: 1,
                background: dexTheme.inputBg,
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
                    background: sortMode === k ? dexTheme.filterTabActive : dexTheme.inputBg,
                    color: sortMode === k ? '#fca5a5' : '#9ca3af',
                    border: `1px solid ${sortMode === k ? '#ef4444' : '#374151'}`,
                  }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Filter button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px', background: dexTheme.searchBg, borderBottom: `1px solid ${dexTheme.border}`, flexShrink: 0 }}>
            <button
              onClick={() => setFilterOpen(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 6,
                fontSize: '0.65rem', fontWeight: 900, fontFamily: 'monospace',
                background: dexTheme.filterTabActive, color: '#fca5a5',
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
            <div style={{ borderBottom: `1px solid ${dexTheme.border}`, background: dexTheme.filterTabActive, flexShrink: 0, padding: '8px 10px' }}>
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
                        ? (RARITY_ORDER.includes(tab.id as Rarity) ? RARITY_COLORS[tab.id as Rarity] : dexTheme.bg)
                        : dexTheme.filterTabBg,
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
                            background: typeFilter === null ? dexTheme.border : dexTheme.filterTabBg,
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
          <div style={{ flex: 1, overflowY: 'auto', background: dexTheme.contentBg, position: 'relative', zIndex: 1 }}>
            {/* Animation overlay: zIndex 0 so it stays behind the grid (zIndex 1) */}
            {dexTheme.hasAnimation && <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}><AnimatedDexOverlay themeId={dexTheme.id} /></div>}
            <div style={{ padding: '8px 8px 80px 8px' }}>
            <div style={{
              background: dexTheme.cardBg,
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
                        color: caught ? dexTheme.titleColor : 'rgba(180,200,220,0.4)',
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
            </div>{/* end padding wrapper */}
          </div>
        </>
      )}

      {mainTab === 'badges' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 96px', background: dexTheme.contentBg, position: 'relative', zIndex: 1 }}>
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
            style={{ bottom: 72, background: dexTheme.contentBg, fontFamily: 'monospace' }}
          >
            {/* Top bar */}
            <div
              style={{
                background: dexTheme.headerGrad,
                paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))',
                paddingBottom: '0.6rem',
                paddingLeft: '1rem',
                paddingRight: '1rem',
                borderBottom: `2px solid ${dexTheme.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flexShrink: 0,
              }}
            >
              <button
                onClick={() => setSelectedId(null)}
                style={{ color: dexTheme.titleColor, fontSize: '0.85rem', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 900, flexShrink: 0 }}
              >← Retour</button>
              <span style={{ color: 'white', fontWeight: 900, fontSize: '0.9rem', fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center', padding: '0 8px' }}>
                <span style={{ color: '#4ade80' }}>{numStr}</span> — {p.name.toUpperCase()}
              </span>
              <div style={{ flexShrink: 0, width: 60 }} />
            </div>

            {/* Hero: scan-line screen background + floating sprite — FIXED, outside scroll */}
            <div style={{
              position: 'relative', flexShrink: 0,
              background: dexTheme.cardBg,
              backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0px, rgba(0,0,0,0.18) 1px, transparent 1px, transparent 4px)',
              borderBottom: `2px solid ${dexTheme.border}`,
              display: 'flex', flexDirection: 'row', alignItems: 'center',
              padding: '10px 16px', gap: 14, overflow: 'hidden',
            }}>
              {/* Radial glow */}
              <div style={{ position: 'absolute', top: '50%', left: 60, transform: 'translate(-50%,-50%)', width: 120, height: 120, background: `radial-gradient(circle, ${rarityColor}35 0%, transparent 70%)`, pointerEvents: 'none' }} />
              {/* Sprite */}
              <div className={isShiny ? 'shiny-rainbow' : ''} style={{ animation: 'dex-float 3s ease-in-out infinite', position: 'relative', zIndex: 1, flexShrink: 0 }}>
                <img
                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${isShiny ? 'shiny/' : ''}${selectedId}.png`}
                  alt={p.name} width={88} height={88}
                  style={{ imageRendering: 'pixelated', filter: isShiny ? `drop-shadow(0 0 10px #fbbf24)` : `drop-shadow(0 0 8px ${rarityColor})` }}
                />
              </div>
              {/* Info */}
              <div style={{ flex: 1, position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ color: rarityColor, fontSize: '0.58rem', fontFamily: 'monospace', fontWeight: 700, textShadow: `0 0 6px ${rarityColor}` }}>{RARITY_LABELS[p.rarity]}</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {types.map(t => (
                    <span key={t} style={{ background: TYPE_COLORS[t as PokemonType] ?? '#888', color: 'white', fontWeight: 900, fontFamily: 'monospace', borderRadius: 4, padding: '2px 8px', fontSize: '0.58rem' }}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </span>
                  ))}
                </div>
                <div style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 99, padding: '2px 10px', color: 'rgba(255,255,255,0.75)', fontSize: '0.58rem', fontFamily: 'monospace', fontWeight: 700, alignSelf: 'flex-start' }}>
                  Capturé {normalCount} fois
                </div>
              </div>
            </div>

            {/* Scrollable content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 80px', display: 'flex', flexDirection: 'column', gap: 12, background: dexTheme.contentBg }}>
              {/* ── Pokédex data panels ──────────────────────────── */}
              <div style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>

              {/* SCANNER — level / XP / profile */}
              {(() => {
                const stats = GEN1_STATS[selectedId];
                const profile = stats ? getPokemonProfile(stats.hp) : 'equilibre';
                const profileLabel = profile === 'tank' ? 'TANK' : profile === 'equilibre' ? 'ÉQUILIBRÉ' : 'ATTAQUANT';
                const profileColor = profile === 'tank' ? '#4ade80' : profile === 'equilibre' ? '#60a5fa' : '#f87171';
                return (
                  <div style={{ background: 'rgba(0,0,0,0.45)', borderRadius: 10, border: `2px solid ${dexTheme.border}`, overflow: 'hidden' }}>
                    {/* Panel label */}
                    <div style={{ background: dexTheme.filterTabBg, borderBottom: `1px solid ${dexTheme.border}`, padding: '4px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: dexTheme.titleColor, fontSize: '0.55rem', fontFamily: 'monospace', fontWeight: 900, letterSpacing: '0.15em' }}>◉ DONNÉES</span>
                      <span style={{ color: profileColor, fontSize: '0.55rem', fontFamily: 'monospace', fontWeight: 900, background: `${profileColor}22`, padding: '1px 6px', borderRadius: 3 }}>{profileLabel}</span>
                    </div>
                    <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.6rem', fontFamily: 'monospace', width: 36 }}>NIV.</span>
                        <span style={{ color: 'white', fontSize: '1.1rem', fontFamily: 'monospace', fontWeight: 900, lineHeight: 1 }}>{lvData.level >= 100 ? 'MAX' : lvData.level}</span>
                        {lvData.level < 100 && (
                          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', fontFamily: 'monospace', marginLeft: 'auto' }}>{lvData.xp} / {xpToNextLevel(lvData.level)} XP</span>
                        )}
                      </div>
                      <div style={{ width: '100%', background: 'rgba(255,255,255,0.08)', borderRadius: 2, height: 5, border: '1px solid rgba(255,255,255,0.12)' }}>
                        <div style={{ height: '100%', borderRadius: 2, width: `${xpPct}%`, background: `linear-gradient(90deg, ${rarityColor}, #fbbf24)`, transition: 'width 0.4s' }} />
                      </div>
                      {pool.length > 0 && availablePool.length < pool.length && (
                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.58rem', fontFamily: 'monospace' }}>
                          🔓 {availablePool.length} / {pool.length} attaques débloquées
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* MOVES — 2×2 hardware button grid */}
              {activeSlugs.length > 0 && (
                <div style={{ background: 'rgba(0,0,0,0.45)', borderRadius: 10, border: `2px solid ${dexTheme.border}`, overflow: 'hidden' }}>
                  <div style={{ background: dexTheme.filterTabBg, borderBottom: `1px solid ${dexTheme.border}`, padding: '4px 10px' }}>
                    <span style={{ color: dexTheme.titleColor, fontSize: '0.55rem', fontFamily: 'monospace', fontWeight: 900, letterSpacing: '0.15em' }}>◉ ATTAQUES</span>
                  </div>
                  <div style={{ padding: '10px 10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {activeSlugs.map(slug => {
                      const m = MOVES[slug];
                      if (!m) return null;
                      const typeColor = TYPE_COLORS[m.type as PokemonType] ?? '#475569';
                      return (
                        <div key={slug} style={{
                          borderRadius: 8,
                          padding: '8px 10px',
                          background: `linear-gradient(135deg, rgba(0,0,0,0.6) 0%, ${typeColor}22 100%)`,
                          border: `2px solid ${typeColor}55`,
                          boxShadow: `0 3px 0 rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)`,
                          display: 'flex', flexDirection: 'column', gap: 3,
                        }}>
                          <span style={{ color: 'white', fontWeight: 900, borderRadius: 3, padding: '1px 5px', alignSelf: 'flex-start', background: typeColor, fontSize: '0.4rem', fontFamily: 'monospace', letterSpacing: '0.05em' }}>{m.type.toUpperCase()}</span>
                          <span style={{ color: 'white', fontSize: '0.72rem', fontWeight: 900, fontFamily: 'monospace', lineHeight: 1.2 }}>{m.name}</span>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.55rem', fontFamily: 'monospace' }}>{m.category === 'physical' ? 'PHYS' : m.category === 'special' ? 'SPÉ' : 'STAT'}</span>
                            {m.power > 0 && <span style={{ color: typeColor, fontSize: '0.72rem', fontWeight: 900, fontFamily: 'monospace' }}>{m.power}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STATS — digital readout */}
              {(() => {
                const stats = GEN1_STATS[selectedId];
                if (!stats) return null;
                const rows: [string, number, string][] = [
                  ['PV',  stats.hp,        '#4ade80'],
                  ['ATK', stats.attack,    '#f87171'],
                  ['DEF', stats.defense,   '#fb923c'],
                  ['SpA', stats.spAttack,  '#818cf8'],
                  ['SpD', stats.spDefense, '#60a5fa'],
                  ['VIT', stats.speed,     '#fbbf24'],
                ];
                const maxStat = 255;
                return (
                  <div style={{ background: 'rgba(0,0,0,0.45)', borderRadius: 10, border: `2px solid ${dexTheme.border}`, overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{ background: dexTheme.filterTabBg, borderBottom: `1px solid ${dexTheme.border}`, padding: '4px 10px' }}>
                      <span style={{ color: dexTheme.titleColor, fontSize: '0.55rem', fontFamily: 'monospace', fontWeight: 900, letterSpacing: '0.15em' }}>◉ STATS DE BASE</span>
                    </div>
                    <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {rows.map(([label, val, color]) => (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 700, fontSize: '0.6rem', fontFamily: 'monospace', width: 28, flexShrink: 0 }}>{label}</span>
                          <div style={{ flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 2, height: 5, border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ height: '100%', borderRadius: 2, background: color, width: `${Math.round((val / maxStat) * 100)}%`, transition: 'width 0.4s', boxShadow: `0 0 6px ${color}88` }} />
                          </div>
                          <span style={{ color: 'white', fontSize: '0.65rem', fontWeight: 900, fontFamily: 'monospace', width: 24, textAlign: 'right' }}>{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

            </div>{/* end padding wrapper */}
            </div>
          </div>
        );
      })()}

      {showTutorial && (
        <TutorialOverlay tutorialKey="collection" steps={COLLECTION_TUTORIAL} onDone={() => { setShowTutorial(false); onMarkTutorialDone?.(); }} bottomOffset={72} />
      )}

      {/* Theme modal */}
      {showThemeModal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setShowThemeModal(false)}>
          <div onClick={e => e.stopPropagation()} className="rounded-2xl p-4 w-80 max-w-[92vw]"
            style={{ background: '#1e293b', border: '2px solid #334155' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-white font-black text-base">🎨 Thème du Pokédex</span>
              <button onClick={() => setShowThemeModal(false)} className="text-slate-400 text-xl px-1">✕</button>
            </div>
            <div className="text-slate-400 text-xs mb-3">Solde : <span className="text-yellow-400 font-bold">{state.points} 🪙</span></div>
            <div className="flex flex-col gap-2">
              {DEX_THEMES.map(t => {
                const isUnlocked = dexUnlocked.includes(t.id);
                const isActive = (state.dexThemeId ?? 'default') === t.id;
                const canAfford = state.points >= t.price;
                return (
                  <button key={t.id}
                    onClick={() => {
                      if (!isUnlocked) {
                        if (!canAfford) return;
                        onUpdateTheme?.(t.id, [...dexUnlocked, t.id], t.price);
                      } else {
                        onUpdateTheme?.(t.id, dexUnlocked, 0);
                      }
                      setShowThemeModal(false);
                    }}
                    disabled={!isUnlocked && !canAfford}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl disabled:opacity-40"
                    style={{ background: isActive ? t.headerGrad : 'rgba(255,255,255,0.06)', border: `2px solid ${isActive ? t.border : 'transparent'}` }}>
                    <div className="w-8 h-8 rounded-lg shrink-0" style={{ background: t.headerGrad, border: `2px solid ${t.border}` }} />
                    <div className="flex-1 text-left">
                      <div className="font-black text-sm" style={{ color: isActive ? t.titleColor : 'white' }}>{t.emoji} {t.name}</div>
                    </div>
                    {isActive ? (
                      <span className="text-xs font-bold text-green-400">Actif</span>
                    ) : isUnlocked ? (
                      <span className="text-xs font-bold text-slate-400">Équiper</span>
                    ) : (
                      <span className="text-xs font-bold text-yellow-400">{t.price} 🪙</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
