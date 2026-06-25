import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { GameState, RARITY_COLORS } from '../types';
import { POKEMON_BY_ID, GEN1_POKEMON } from '../data/gen1';
import { ShinySprite } from './ShinySprite';
import { POKEMON_TYPE, TYPE_COLORS } from '../data/pokemonTypes';
import { calcMaxHp, calcAttack, calcDefense, calcSpAttack, calcSpDefense, calcSpeed, xpToNextLevel } from '../data/combatEngine';
import { EVOLUTION_DATA } from '../data/evolutionData';
import { getAvailableMoves, GEN1_MOVEPOOL } from '../data/gen1Movepools';
import { MOVES } from '../data/gen1Moves';
import { EvolutionScreen } from './EvolutionScreen';
import { BattleScreen } from './BattleScreen';
import type { TeamMember } from './TeamBuilder';
import type { PokemonType } from '../data/pokemonTypes';

const BOX_SIZE = 30;

// English keys must match POKEMON_TYPE / TYPE_COLORS keys
const ALL_TYPES: { key: string; label: string }[] = [
  { key: 'normal', label: 'Normal' }, { key: 'fire', label: 'Feu' }, { key: 'water', label: 'Eau' },
  { key: 'grass', label: 'Plante' }, { key: 'electric', label: 'Électrik' }, { key: 'ice', label: 'Glace' },
  { key: 'fighting', label: 'Combat' }, { key: 'poison', label: 'Poison' }, { key: 'ground', label: 'Sol' },
  { key: 'flying', label: 'Vol' }, { key: 'psychic', label: 'Psy' }, { key: 'bug', label: 'Insecte' },
  { key: 'rock', label: 'Roche' }, { key: 'ghost', label: 'Spectre' }, { key: 'dragon', label: 'Dragon' },
];

const ALL_RARITIES: { key: string; label: string; color: string }[] = [
  { key: 'commun', label: 'Commun', color: '#94a3b8' },
  { key: 'peu_commun', label: 'Peu commun', color: '#4ade80' },
  { key: 'rare', label: 'Rare', color: '#60a5fa' },
  { key: 'elite', label: 'Élite', color: '#a78bfa' },
  { key: 'legendaire', label: 'Légendaire', color: '#fbbf24' },
];

interface PcFilter {
  name: string;
  types: string[];
  rarities: string[];
  shiny: boolean;
  minLevel: number | null;
  maxLevel: number | null;
}
const EMPTY_FILTER: PcFilter = { name: '', types: [], rarities: [], shiny: false, minLevel: null, maxLevel: null };
function filterIsEmpty(f: PcFilter) {
  return !f.name && f.types.length === 0 && f.rarities.length === 0 && !f.shiny && f.minLevel === null && f.maxLevel === null;
}
const BOX_COLS = 6;

// Re-export buildEnemyTeam logic locally

function buildEnemyTeam(_zoneId: string, avgLevel = 20): TeamMember[] {
  // Enemy levels scale around the player's average team level (±20%)
  const spread = Math.max(3, Math.round(avgLevel * 0.2));
  const minLv = Math.max(1, avgLevel - spread);
  const maxLv = Math.min(100, avgLevel + spread);
  const rarities: string[] = avgLevel <= 25 ? ['commun', 'commun', 'peu_commun']
    : avgLevel <= 40 ? ['commun', 'peu_commun', 'peu_commun']
    : avgLevel <= 55 ? ['peu_commun', 'peu_commun', 'rare']
    : avgLevel <= 70 ? ['peu_commun', 'rare', 'rare']
    : ['rare', 'elite', 'elite'];
  const picked: number[] = [];
  for (const rarity of rarities) {
    const pool = GEN1_POKEMON.filter(p => p.rarity === rarity && !picked.includes(p.id));
    if (pool.length > 0) picked.push(pool[Math.floor(Math.random() * pool.length)].id);
  }
  while (picked.length < 3) {
    const p = GEN1_POKEMON[Math.floor(Math.random() * GEN1_POKEMON.length)];
    if (!picked.includes(p.id)) picked.push(p.id);
  }
  return picked.map(id => {
    const level = minLv + Math.floor(Math.random() * (maxLv - minLv + 1));
    const maxHp = calcMaxHp(id, level);
    return { pokemonId: id, level, xp: 0, currentHp: maxHp, maxHp };
  });
}

interface PcTheme {
  id: string;
  name: string;
  emoji: string;
  price: number;
  bg: string;
  headerGrad: string;
  border: string;
  boxHeaderBg: string;
  titleColor: string;
  screenBg: string;
  hasAnimation?: boolean;
  textColor?: string;
  subTextColor?: string;
}

export const PC_THEMES: PcTheme[] = [
  { id: 'default',  name: 'Classique',  emoji: '🔵', price: 0,    bg: '#c0d0e0', headerGrad: 'linear-gradient(180deg,#8fafcf 0%,#6c90b0 100%)', border: '#4a7090', boxHeaderBg: '#6c8fac', titleColor: 'white',    screenBg: '#c8dce8', textColor: '#1e293b', subTextColor: '#475569' },
  { id: 'nuit',     name: 'Nuit',       emoji: '🌙', price: 500,  bg: '#1a2035', headerGrad: 'linear-gradient(180deg,#2a3550 0%,#1a2540 100%)', border: '#3a5080', boxHeaderBg: '#1e2d45', titleColor: '#93c5fd', screenBg: '#1a2035', textColor: '#e2e8f0', subTextColor: '#94a3b8' },
  { id: 'foret',    name: 'Forêt',      emoji: '🌿', price: 500,  bg: '#c0e0c0', headerGrad: 'linear-gradient(180deg,#8fbe8f 0%,#5a9060 100%)', border: '#3a7040', boxHeaderBg: '#6a9f6a', titleColor: 'white',    screenBg: '#1a2d1a', textColor: '#dcfce7', subTextColor: '#86efac' },
  { id: 'feu',      name: 'Feu',        emoji: '🔥', price: 1500, bg: '#e0c0a0', headerGrad: 'linear-gradient(180deg,#cf8f60 0%,#a05030 100%)', border: '#803020', boxHeaderBg: '#c07050', titleColor: 'white',    screenBg: '#2d1a0e', hasAnimation: true, textColor: '#fed7aa', subTextColor: '#fb923c' },
  { id: 'sakura',   name: 'Sakura',     emoji: '🌸', price: 1500, bg: '#2d1520', headerGrad: 'linear-gradient(180deg,#8b2252 0%,#5a0a30 100%)', border: '#a03060', boxHeaderBg: '#7a1a40', titleColor: '#ffb0d0', screenBg: '#2d1520', hasAnimation: true, textColor: '#fce7f3', subTextColor: '#f9a8d4' },
  { id: 'galaxie',  name: 'Galaxie',    emoji: '🌌', price: 2000, bg: '#120820', headerGrad: 'linear-gradient(180deg,#2a1060 0%,#1a0840 100%)', border: '#5020a0', boxHeaderBg: '#1e0e40', titleColor: '#c084fc', screenBg: '#050510', hasAnimation: true, textColor: '#e0e7ff', subTextColor: '#a5b4fc' },
];

// All animation keyframes declared once — injected via a single <style> in the component
const PC_ANIM_STYLES = `
  @keyframes pc-flame-rise {
    0% { transform: translateY(0) scale(1) rotate(-3deg); opacity: 1; }
    60% { opacity: 0.9; }
    100% { transform: translateY(-180px) scale(0.2) rotate(8deg); opacity: 0; }
  }
  @keyframes pc-fire-title-pulse {
    0%, 100% { color: #fb923c; text-shadow: 0 0 8px #fb923c, 0 0 18px #ef4444; }
    50% { color: #ffffff; text-shadow: 0 0 18px #ef4444, 0 0 36px #fb923c; }
  }
  @keyframes pc-petal-fall {
    0% { transform: translateY(-30px) translateX(0) rotate(0deg); opacity: 1; }
    80% { opacity: 0.8; }
    100% { transform: translateY(100vh) translateX(55px) rotate(240deg); opacity: 0; }
  }
  @keyframes pc-sakura-title-glow {
    0%, 100% { text-shadow: 0 0 8px #f9a8d4, 0 0 18px #f9a8d4; }
    50% { text-shadow: 0 0 22px #fce7f3, 0 0 44px #f9a8d4; }
  }
  @keyframes pc-twinkle { 0%,100% { opacity: 0.15; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.6); } }
  @keyframes pc-shoot {
    0% { transform: scaleX(0.1); opacity: 0; }
    8% { opacity: 1; }
    100% { transform: translateX(150px) translateY(75px) scaleX(1); opacity: 0; }
  }
  @keyframes pc-nebula { 0%,100% { opacity: 0.2; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.12); } }
  @keyframes pc-galaxie-title {
    0% { color: #a5b4fc; text-shadow: 0 0 10px #6366f1, 0 0 28px #4f46e5; }
    25% { color: #c4b5fd; text-shadow: 0 0 12px #a855f7, 0 0 30px #7c3aed; }
    50% { color: #93c5fd; text-shadow: 0 0 12px #3b82f6, 0 0 30px #2563eb; }
    75% { color: #f0abfc; text-shadow: 0 0 12px #e879f9, 0 0 30px #a21caf; }
    100% { color: #a5b4fc; text-shadow: 0 0 10px #6366f1, 0 0 28px #4f46e5; }
  }
`;

function AnimatedPcOverlay({ themeId }: { themeId: string }) {
  if (themeId === 'feu') {
    const particles = Array.from({ length: 18 }, (_, i) => i);
    return (
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 2 }}>
        {particles.map(i => (
          <div key={i} style={{
            position: 'absolute',
            bottom: `${(i % 4) * 8}%`,
            left: `${2 + i * 5.3}%`,
            width: 10 + (i % 4) * 6,
            height: 14 + (i % 4) * 8,
            borderRadius: '50% 50% 35% 35%',
            background: i % 3 === 0
              ? 'radial-gradient(circle at 40% 60%, #ffee44, #ff6600)'
              : i % 3 === 1
              ? 'radial-gradient(circle at 40% 60%, #ff8800, #cc2200)'
              : 'radial-gradient(circle at 40% 60%, #ffcc00, #ff4400)',
            animation: `pc-flame-rise ${0.9 + (i % 4) * 0.35}s ${i * 0.11}s ease-out infinite`,
            filter: 'blur(1px)',
            boxShadow: '0 0 8px #ff6600',
          }} />
        ))}
      </div>
    );
  }
  if (themeId === 'sakura') {
    const petals = Array.from({ length: 22 }, (_, i) => i);
    return (
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 2 }}>
        {petals.map(i => (
          <div key={i} style={{
            position: 'absolute',
            top: '-30px',
            left: `${(i / 22) * 100 + (i % 4) * 1.2}%`,
            width: 10 + (i % 4) * 5,
            height: 10 + (i % 4) * 5,
            borderRadius: '50% 0 50% 0',
            background: i % 3 === 0 ? '#ff80b0' : i % 3 === 1 ? '#ffb0d0' : '#ff5090',
            animation: `pc-petal-fall ${2 + (i % 5) * 0.55}s ${i * 0.17}s linear infinite`,
            boxShadow: '0 0 5px #ff60a0',
          }} />
        ))}
      </div>
    );
  }
  if (themeId === 'galaxie') {
    const stars = Array.from({ length: 65 }, (_, i) => i);
    const shootingStars = [0, 1, 2, 3, 4];
    const nebulas = [0, 1, 2];
    return (
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 2 }}>
        {nebulas.map(i => (
          <div key={i} style={{
            position: 'absolute',
            top: `${10 + i * 30}%`,
            left: `${5 + i * 33}%`,
            width: 160,
            height: 80,
            borderRadius: '50%',
            background: i === 0
              ? 'radial-gradient(ellipse, rgba(99,102,241,0.45), transparent)'
              : i === 1
              ? 'radial-gradient(ellipse, rgba(168,85,247,0.38), transparent)'
              : 'radial-gradient(ellipse, rgba(236,72,153,0.3), transparent)',
            animation: `pc-nebula ${5 + i * 2.5}s ${i * 1.5}s ease-in-out infinite`,
          }} />
        ))}
        {stars.map(i => (
          <div key={i} style={{
            position: 'absolute',
            top: `${(i * 37 + 11) % 100}%`,
            left: `${(i * 61 + 7) % 100}%`,
            width: 1.5 + (i % 3),
            height: 1.5 + (i % 3),
            borderRadius: '50%',
            background: i % 5 === 0 ? '#c4b5fd' : i % 5 === 1 ? '#93c5fd' : i % 5 === 2 ? '#f0abfc' : i % 5 === 3 ? '#fde68a' : 'white',
            animation: `pc-twinkle ${0.6 + (i % 5) * 0.5}s ${(i % 8) * 0.22}s ease-in-out infinite`,
            boxShadow: i % 4 === 0 ? '0 0 5px currentColor' : undefined,
          }} />
        ))}
        {shootingStars.map(i => (
          <div key={i} style={{
            position: 'absolute',
            top: `${4 + i * 18}%`,
            left: `${3 + i * 16}%`,
            width: 80,
            height: 2.5,
            background: 'linear-gradient(90deg, white, rgba(196,181,253,0.8), transparent)',
            borderRadius: 99,
            animation: `pc-shoot ${1 + i * 0.6}s ${i * 2.5 + 0.5}s ease-in infinite`,
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
  username?: string;
  onUpdateParty: (partyTeam: number[]) => void;
  onUpdatePcBoxes: (pcBoxes: number[][]) => void;
  onUpdateBoxNames?: (names: string[]) => void;
  onClose: () => void;
  isAdmin?: boolean;
  onSetLevel?: (pokemonId: number, level: number) => void;
  onTriggerEvolution?: (pokemonId: number) => void;
  currentZoneId?: string;
  onAddXp?: (pokemonId: number, xp: number) => void;
  onBattleWin?: (pokemonIds: number[]) => void;
  onTrainingBattle?: () => void;
  onTriggerEvo?: (oldId: number, newId: number) => void;
  onMarkPendingEvolution?: (pokemonId: number) => void;
  onSaveCustomMoves?: (pokemonId: number, slugs: string[]) => void;
  onUpdateTheme?: (themeId: string, unlocked: string[], cost: number) => void;
}

interface DragState {
  pokemonId: number;
  fromType: 'pc' | 'party';
  fromIdx: number;
  x: number;
  y: number;
}

function chunkIntoBoxes(ids: number[]): number[][] {
  const boxes: number[][] = [];
  for (let i = 0; i < ids.length; i += BOX_SIZE) {
    boxes.push(ids.slice(i, i + BOX_SIZE));
  }
  if (boxes.length === 0) boxes.push([]);
  return boxes;
}

export function PcStorage({
  state, username, onUpdateParty, onUpdatePcBoxes, onUpdateBoxNames, onClose: _onClose,
  isAdmin: _isAdmin, onSetLevel: _onSetLevel,
  currentZoneId, onAddXp, onBattleWin, onTrainingBattle, onTriggerEvo,
  onSaveCustomMoves,
}: Props) {
  const theme = PC_THEMES.find(t => t.id === (state.pcThemeId ?? 'default')) ?? PC_THEMES[0];
  const PC_BOX_KEY = `katchii_pc_box_${username ?? 'default'}`;
  const MAX_BOXES = 10;
  const [boxIndex, setBoxIndex] = useState(() => {
    try { return Math.max(0, Math.min(MAX_BOXES - 1, Number(localStorage.getItem(PC_BOX_KEY) ?? 0))); }
    catch { return 0; }
  });
  const setBoxIndexPersisted = (idx: number) => {
    setBoxIndex(idx);
    try { localStorage.setItem(PC_BOX_KEY, String(idx)); } catch {}
  };
  const PC_FILTER_KEY = `katchii_pc_filter_${username ?? 'default'}`;
  const [pcFilter, setPcFilter] = useState<PcFilter>(() => {
    try { return { ...EMPTY_FILTER, ...JSON.parse(localStorage.getItem(PC_FILTER_KEY) ?? '{}') }; }
    catch { return EMPTY_FILTER; }
  });
  const savePcFilter = (f: PcFilter) => {
    setPcFilter(f);
    try { localStorage.setItem(PC_FILTER_KEY, JSON.stringify(f)); } catch {}
  };
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterDraft, setFilterDraft] = useState<PcFilter>(EMPTY_FILTER);
  const [pokemonDetailId, setPokemonDetailId_] = useState<number | null>(null);
  const setPokemonDetailId = (id: number | null) => {
    setPokemonDetailId_(id);
    if (id !== pokemonDetailId) { setDetailEditMode(false); setDetailPendingMoves([]); }
  };
  const [autoTraining, setAutoTraining] = useState(false);
  const [trainingMuted, setTrainingMuted] = useState(false);
  const [xpBarWidths, setXpBarWidths] = useState<Record<number, number>>({});
  const [editingBoxName, setEditingBoxName] = useState(false);
  const [boxNameInput, setBoxNameInput] = useState('');
  const [swapPickOpen, setSwapPickOpen] = useState(false);
  const [pendingPcId, setPendingPcId] = useState<number | null>(null);


  // Inline move edit inside PC detail view
  const [detailEditMode, setDetailEditMode] = useState(false);
  const [detailPendingMoves, setDetailPendingMoves] = useState<string[]>([]);

  // Battle state
  const [battleTeam, setBattleTeam] = useState<{ playerTeam: TeamMember[]; enemyTeam: TeamMember[] } | null>(null);
  const [battleResult, setBattleResult] = useState<{ won: boolean; xpGains: Record<number, number> } | null>(null);
  const [preCombatLevels, setPreCombatLevels] = useState<Record<number, { level: number; xp: number }>>({});
  const [levelUpFlash, setLevelUpFlash] = useState<Record<number, number>>({}); // pokemonId -> new level

  // Manual evolution trigger
  const [_evoConfirmId, _setEvoConfirmId] = useState<number | null>(null);
  const [pendingEvoChoice, setPendingEvoChoice] = useState<{ oldId: number; newId?: number; choices?: number[] } | null>(null);

  // Drag & drop
  const dragRef = useRef<DragState | null>(null);
  const [dragging, setDragging] = useState<{ pokemonId: number; x: number; y: number } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const matchesFilter = useCallback((id: number): boolean => {
    if (filterIsEmpty(pcFilter)) return true;
    const poke = POKEMON_BY_ID[id];
    const lvData = state.pokemonLevels?.[id] ?? { level: 1, xp: 0 };
    const types = (POKEMON_TYPE[id] ?? ['normal']) as string[];
    if (pcFilter.name && !poke?.name.toLowerCase().includes(pcFilter.name.toLowerCase())) return false;
    if (pcFilter.types.length > 0 && !pcFilter.types.some(t => types.includes(t))) return false;
    if (pcFilter.rarities.length > 0 && !pcFilter.rarities.includes(poke?.rarity ?? 'commun')) return false;
    if (pcFilter.shiny && (state.shinyCollection[id] ?? 0) === 0) return false;
    if (pcFilter.minLevel !== null && lvData.level < pcFilter.minLevel) return false;
    if (pcFilter.maxLevel !== null && lvData.level > pcFilter.maxLevel) return false;
    return true;
  }, [pcFilter, state.pokemonLevels, state.shinyCollection]);

  const owned = useMemo(() => {
    return Object.keys(state.normalCollection)
      .map(Number)
      .filter(id => (state.normalCollection[id] ?? 0) > 0);
  }, [state.normalCollection]);

  const party: number[] = useMemo(() => {
    const p = state.partyTeam ?? [];
    return p.filter(id => (state.normalCollection[id] ?? 0) > 0);
  }, [state.partyTeam, state.normalCollection]);

  const pcBoxes: number[][] = useMemo(() => {
    const existingBoxes = state.pcBoxes;
    const partySet = new Set(party);
    const inPC = owned.filter(id => !partySet.has(id));
    if (existingBoxes && existingBoxes.length > 0) {
      const boxPokemonSet = new Set(existingBoxes.flat());
      const missing = inPC.filter(id => !boxPokemonSet.has(id));
      const cleaned = existingBoxes.map(box =>
        box.filter(id => (state.normalCollection[id] ?? 0) > 0 && !partySet.has(id))
      );
      if (missing.length > 0) {
        const allInBox = [...cleaned.flat(), ...missing];
        return chunkIntoBoxes(allInBox);
      }
      return cleaned.length > 0 ? cleaned : [[]];
    }
    return chunkIntoBoxes(inPC);
  }, [state.pcBoxes, state.normalCollection, owned, party]);

  const boxNames: string[] = useMemo(() => {
    const stored = (state as unknown as { pcBoxNames?: string[] }).pcBoxNames ?? [];
    const result: string[] = [];
    for (let i = 0; i < pcBoxes.length; i++) {
      result.push(stored[i] ?? `Boîte ${i + 1}`);
    }
    return result;
  }, [(state as unknown as { pcBoxNames?: string[] }).pcBoxNames, pcBoxes.length]);

  const safeBoxIdx = Math.min(boxIndex, Math.max(0, pcBoxes.length - 1));
  const currentBox = pcBoxes[safeBoxIdx] ?? [];
  const currentBoxName = boxNames[safeBoxIdx] ?? `Boîte ${safeBoxIdx + 1}`;


  const moveToPC = useCallback((pokemonId: number) => {
    const newParty = party.filter(id => id !== pokemonId);
    const newBoxes = pcBoxes.map((box, i) =>
      i === safeBoxIdx ? [pokemonId, ...box.filter(id => id !== pokemonId)] : box
    );
    onUpdateParty(newParty);
    onUpdatePcBoxes(newBoxes);
  }, [party, pcBoxes, safeBoxIdx, onUpdateParty, onUpdatePcBoxes]);

  const moveToParty = useCallback((pokemonId: number) => {
    const newBoxes = pcBoxes.map(box => box.filter(id => id !== pokemonId));
    const newParty = [...party, pokemonId];
    onUpdateParty(newParty);
    onUpdatePcBoxes(newBoxes);
    setSwapPickOpen(false);
    setPendingPcId(null);
  }, [party, pcBoxes, onUpdateParty, onUpdatePcBoxes]);

  const swapWithParty = useCallback((pcId: number, partySlot: number) => {
    const evicted = party[partySlot];
    const newParty = party.map((id, i) => i === partySlot ? pcId : id);
    const newBoxes = pcBoxes.map((box, i) =>
      i === safeBoxIdx
        ? [evicted, ...box.filter(id => id !== pcId)]
        : box
    );
    onUpdateParty(newParty);
    onUpdatePcBoxes(newBoxes);
    setSwapPickOpen(false);
    setPendingPcId(null);
  }, [party, pcBoxes, safeBoxIdx, onUpdateParty, onUpdatePcBoxes]);

  const handleTakeFromPC = useCallback((id: number) => {
    if (party.length < 3) {
      moveToParty(id);
    } else {
      setPendingPcId(id);
      setSwapPickOpen(true);
    }
  }, [party.length, moveToParty]);

  const swapPcSlots = useCallback((idA: number, idB: number, aInParty: boolean, bInParty: boolean) => {
    // swap between party and pc or within pc
    if (aInParty && !bInParty) {
      // move bId to party slot of aId, aId to PC
      const partyIdx = party.indexOf(idA);
      const newParty = party.map((id, i) => i === partyIdx ? idB : id);
      const newBoxes = pcBoxes.map(box => box.map(id => id === idB ? idA : id));
      onUpdateParty(newParty);
      onUpdatePcBoxes(newBoxes);
    } else if (!aInParty && bInParty) {
      const partyIdx = party.indexOf(idB);
      const newParty = party.map((id, i) => i === partyIdx ? idA : id);
      const newBoxes = pcBoxes.map(box => box.map(id => id === idA ? idB : id));
      onUpdateParty(newParty);
      onUpdatePcBoxes(newBoxes);
    } else if (aInParty && bInParty) {
      const aIdx = party.indexOf(idA);
      const bIdx = party.indexOf(idB);
      const newParty = [...party];
      newParty[aIdx] = idB;
      newParty[bIdx] = idA;
      onUpdateParty(newParty);
    } else {
      // both in PC
      const newBoxes = pcBoxes.map(box => box.map(id => id === idA ? -1 : id === idB ? idA : id).map(id => id === -1 ? idB : id));
      onUpdatePcBoxes(newBoxes);
    }
  }, [party, pcBoxes, onUpdateParty, onUpdatePcBoxes]);

  const moveToPartyEmpty = useCallback((pokemonId: number) => {
    // drag from PC to empty party slot
    if (party.length < 3) {
      moveToParty(pokemonId);
    }
  }, [party.length, moveToParty]);

  // ── Touch drag & drop ────────────────────────────────────────────────────────
  const handleTouchStart = useCallback((e: React.TouchEvent, pokemonId: number, fromType: 'pc' | 'party', fromIdx: number) => {
    const touch = e.touches[0];
    longPressTimerRef.current = setTimeout(() => {
      dragRef.current = { pokemonId, fromType, fromIdx, x: touch.clientX, y: touch.clientY };
      setDragging({ pokemonId, x: touch.clientX, y: touch.clientY });
    }, 450);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
    if (!dragRef.current) return;
    e.preventDefault();
    const touch = e.touches[0];
    dragRef.current.x = touch.clientX;
    dragRef.current.y = touch.clientY;
    setDragging({ pokemonId: dragRef.current.pokemonId, x: touch.clientX, y: touch.clientY });
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    setDragging(null);

    const touch = e.changedTouches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!el) return;
    const slotEl = (el as HTMLElement).closest('[data-slot-type]') as HTMLElement | null;
    if (!slotEl) return;

    const slotType = slotEl.dataset.slotType as 'pc' | 'party' | 'party-empty';
    const slotIdx = Number(slotEl.dataset.slotIdx ?? -1);

    if (slotType === 'party-empty') {
      // drop onto empty party slot
      if (drag.fromType === 'pc') moveToPartyEmpty(drag.pokemonId);
    } else if (slotType === 'party') {
      const targetId = party[slotIdx];
      if (!targetId) {
        if (drag.fromType === 'pc') moveToPartyEmpty(drag.pokemonId);
      } else if (targetId === drag.pokemonId) {
        // same slot, no-op
      } else {
        swapPcSlots(drag.pokemonId, targetId, drag.fromType === 'party', true);
      }
    } else if (slotType === 'pc') {
      const targetId = currentBox[slotIdx];
      if (!targetId) {
        // drop onto empty PC slot: move from party to PC
        if (drag.fromType === 'party') moveToPC(drag.pokemonId);
      } else if (targetId === drag.pokemonId) {
        // same slot
      } else {
        swapPcSlots(drag.pokemonId, targetId, drag.fromType === 'party', false);
      }
    }
  }, [party, currentBox, moveToPartyEmpty, moveToPC, swapPcSlots]);

  const saveBoxName = () => {
    if (!boxNameInput.trim()) { setEditingBoxName(false); return; }
    const newNames = [...boxNames];
    newNames[safeBoxIdx] = boxNameInput.trim();
    onUpdateBoxNames?.(newNames);
    setEditingBoxName(false);
  };

  const startTraining = useCallback(() => {
    if (party.length === 0) return;
    // Capture pre-combat XP snapshot
    const snapshot: Record<number, { level: number; xp: number }> = {};
    for (const id of party) {
      const lvData = state.pokemonLevels?.[id] ?? { level: 1, xp: 0 };
      snapshot[id] = { level: lvData.level, xp: lvData.xp };
    }
    setPreCombatLevels(snapshot);
    const playerTeam: TeamMember[] = party.map(id => {
      const lvData = state.pokemonLevels?.[id] ?? { level: 1, xp: 0 };
      const moves = state.pokemonCustomMoves?.[id] ?? getAvailableMoves(id, lvData.level).slice(0, 4);
      const maxHp = calcMaxHp(id, lvData.level);
      return { pokemonId: id, level: lvData.level, xp: lvData.xp, currentHp: maxHp, maxHp, isShiny: (state.shinyCollection[id] ?? 0) > 0, moves };
    });
    const avgLevel = Math.round(playerTeam.reduce((s, m) => s + m.level, 0) / playerTeam.length);
    const enemyTeam = buildEnemyTeam(currentZoneId ?? 'zone1', avgLevel);
    setBattleTeam({ playerTeam, enemyTeam });
  }, [party, state.pokemonLevels, state.pokemonCustomMoves, state.shinyCollection, currentZoneId]);

  const handleBattleEnd = useCallback((won: boolean, xpGains: Record<number, number>, finalTeam?: TeamMember[]) => {
    setBattleTeam(null);
    onTrainingBattle?.();

    // Apply XP gains
    if (finalTeam) {
      for (const m of finalTeam) {
        const gained = xpGains[m.pokemonId] ?? 0;
        if (gained > 0) onAddXp?.(m.pokemonId, gained);
      }
    }

    if (won) {
      onBattleWin?.(party);
    }

    if (autoTraining) {
      setTimeout(() => startTraining(), 300);
      return;
    }

    setBattleResult({ won, xpGains });
  }, [party, owned, state.pokemonLevels, onTrainingBattle, onAddXp, onBattleWin, state.shinyCollection, autoTraining, startTraining]);


  // XP bar animation on victory screen
  useEffect(() => {
    if (!battleResult) return;

    // Initialize bars at pre-combat percentages
    const preWidths: Record<number, number> = {};
    for (const id of party) {
      const pre = preCombatLevels[id] ?? { level: 1, xp: 0 };
      preWidths[id] = pre.level >= 100 ? 100 : Math.min(100, Math.floor(pre.xp / xpToNextLevel(pre.level) * 100));
    }
    setXpBarWidths(preWidths);
    setLevelUpFlash({});

    const timers: ReturnType<typeof setTimeout>[] = [];

    // After a brief delay, animate each bar forward
    const t = setTimeout(() => {
      const postWidths: Record<number, number> = {};
      const flashMap: Record<number, number> = {};

      for (const id of party) {
        const pre = preCombatLevels[id] ?? { level: 1, xp: 0 };
        const post = state.pokemonLevels?.[id] ?? { level: 1, xp: 0 };
        const gained = battleResult.xpGains[id] ?? 0;

        if (gained <= 0 || pre.level >= 100) {
          postWidths[id] = preWidths[id];
          continue;
        }

        const leveledUp = post.level > pre.level;

        if (!leveledUp) {
          // Simple animation: pre% → post%
          postWidths[id] = post.level >= 100 ? 100 : Math.min(100, Math.floor(post.xp / xpToNextLevel(post.level) * 100));
        } else {
          // Animate to 100%, then reset and fill to post%
          postWidths[id] = 100;
          flashMap[id] = post.level;
          // After 600ms: flash level-up, reset to 0%, then animate to post%
          const t2 = setTimeout(() => {
            setLevelUpFlash(prev => ({ ...prev, [id]: post.level }));
            setXpBarWidths(prev => ({ ...prev, [id]: 0 }));
            const t3 = setTimeout(() => {
              const finalPct = post.level >= 100 ? 100 : Math.min(100, Math.floor(post.xp / xpToNextLevel(post.level) * 100));
              setXpBarWidths(prev => ({ ...prev, [id]: finalPct }));
              // Clear flash after animation
              const t4 = setTimeout(() => setLevelUpFlash(prev => { const n = { ...prev }; delete n[id]; return n; }), 800);
              timers.push(t4);
            }, 100);
            timers.push(t3);
          }, 600);
          timers.push(t2);
        }
      }

      setXpBarWidths(postWidths);
      // Don't set flash here - level-up ones are handled by the delayed timers above
      // But for non-leveled pokemon postWidths is already correct
    }, 80);
    timers.push(t);

    return () => { timers.forEach(clearTimeout); };
  }, [battleResult]);

  // ── Pokemon detail overlay ────────────────────────────────────────────────────
  if (pokemonDetailId !== null) {
    const detailId = pokemonDetailId;
    const detailPoke = POKEMON_BY_ID[detailId];
    const detailLvData = state.pokemonLevels?.[detailId] ?? { level: 1, xp: 0 };
    const detailLevel = detailLvData.level;
    const detailXp = detailLvData.xp;
    const detailIsShiny = (state.shinyCollection[detailId] ?? 0) > 0;
    const detailInParty = party.includes(detailId);
    const detailMoves = state.pokemonCustomMoves?.[detailId] ?? getAvailableMoves(detailId, detailLevel).slice(0, 4);
    const detailEvoEntry = EVOLUTION_DATA[detailId];
    const detailCanEvolve = detailEvoEntry && detailLevel >= detailEvoEntry.level;
    const detailEvoTargets = detailEvoEntry
      ? (detailEvoEntry.choices ?? (detailEvoEntry.evolvesInto ? [detailEvoEntry.evolvesInto] : []))
      : [];
    const detailEvoBlocked = detailEvoTargets.some(tid => (state.normalCollection[tid] ?? 0) > 0 || party.includes(tid));
    const detailShowEvo = !!detailCanEvolve && !detailEvoBlocked;

    return (
      <div className="fixed inset-0 z-[650] flex flex-col overflow-y-auto"
        style={{ background: theme.bg, fontFamily: 'monospace' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 shrink-0"
          style={{ background: theme.headerGrad, borderBottom: `3px solid ${theme.border}`, paddingTop: 'calc(0.5rem + env(safe-area-inset-top,0px))', paddingBottom: '0.5rem' }}>
          <button onClick={() => setPokemonDetailId(null)} className="font-black text-xs px-2 py-1 rounded"
            style={{ background: theme.border, color: theme.titleColor, border: `1px solid ${theme.border}` }}>← Retour</button>
          <div className="text-white font-black text-sm flex items-center gap-1">
            {detailPoke?.name ?? `#${detailId}`}
            {detailIsShiny && <span className="text-yellow-300">⭐</span>}
            <span className="text-blue-100 font-normal ml-1">Niv. {detailLevel}</span>
          </div>
          <div style={{ width: 56 }} />
        </div>

        {/* Sprite */}
        <div className="flex justify-center py-4">
          <ShinySprite pokemonId={detailId} isShiny={detailIsShiny} width={96} height={96} />
        </div>

        {/* XP bar */}
        {detailLevel < 100 && (() => {
          const detailPool = GEN1_MOVEPOOL[detailId] ?? [];
          const detailAvailable = getAvailableMoves(detailId, detailLevel);
          return (
            <div className="mx-3 mb-3 rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.6)', border: '2px solid #6c90b0' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-500 text-xs font-bold">XP</span>
                <span className="text-slate-500 text-xs">{detailXp}/{xpToNextLevel(detailLevel)}</span>
              </div>
              <div className="w-full rounded-full overflow-hidden" style={{ height: 6, background: 'rgba(0,0,0,0.15)' }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.floor(detailXp / xpToNextLevel(detailLevel) * 100))}%`, background: '#3b82f6' }} />
              </div>
              {detailPool.length > 0 && detailAvailable.length < detailPool.length && (
                <div className="text-slate-400 text-xs mt-1.5">
                  🔓 {detailAvailable.length}/{detailPool.length} attaques débloquées
                </div>
              )}
            </div>
          );
        })()}

        {/* Moves */}
        <div className="mx-3 mb-3 rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.6)', border: '2px solid #6c90b0' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="font-black text-slate-700 text-xs">Attaques</div>
            {onSaveCustomMoves && !detailEditMode && (
              <button
                onClick={() => { setDetailPendingMoves([...detailMoves]); setDetailEditMode(true); }}
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: '#3b82f633', color: '#60a5fa', border: '1px solid #3b82f655' }}
              >✏️ Modifier</button>
            )}
            {detailEditMode && (
              <div className="flex gap-1.5">
                <button
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: '#ef444433', color: '#f87171', border: '1px solid #ef444455' }}
                  onClick={() => setDetailEditMode(false)}
                >Annuler</button>
                <button
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: '#22c55e33', color: '#4ade80', border: '1px solid #22c55e55', opacity: detailPendingMoves.length === 4 ? 1 : 0.4 }}
                  onClick={() => {
                    if (detailPendingMoves.length === 4) {
                      onSaveCustomMoves?.(detailId, detailPendingMoves);
                      setDetailEditMode(false);
                    }
                  }}
                >Sauvegarder</button>
              </div>
            )}
          </div>
          {!detailEditMode ? (
            <div className="flex flex-col gap-1.5">
              {detailMoves.map(slug => {
                const m = MOVES[slug];
                if (!m) return null;
                const typeColor = TYPE_COLORS[m.type as PokemonType] ?? '#475569';
                return (
                  <div key={slug} className="rounded-lg px-2 py-1.5" style={{ background: `${typeColor}18`, border: `1px solid ${typeColor}44` }}>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold rounded px-1.5 py-0.5 shrink-0" style={{ background: typeColor, fontSize: '0.42rem' }}>{m.type.toUpperCase()}</span>
                      <span className="text-white text-xs font-bold flex-1">{m.name}</span>
                      <span className="text-slate-400 text-xs shrink-0">{m.category === 'physical' ? 'PHYS' : m.category === 'special' ? 'SPÉ' : 'STAT'}</span>
                      {m.power > 0 && <span className="text-slate-300 text-xs font-black shrink-0">{m.power}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <div className="text-slate-500 text-xs mb-1">Sélectionne 4 attaques ({detailPendingMoves.length}/4)</div>
              {(() => {
                const pool = getAvailableMoves(detailId, detailLevel);
                return pool.map(slug => {
                  const m = MOVES[slug];
                  if (!m) return null;
                  const typeColor = TYPE_COLORS[m.type as PokemonType] ?? '#475569';
                  const selected = detailPendingMoves.includes(slug);
                  return (
                    <button
                      key={slug}
                      onClick={() => {
                        if (selected) {
                          setDetailPendingMoves(prev => prev.filter(s => s !== slug));
                        } else if (detailPendingMoves.length < 4) {
                          setDetailPendingMoves(prev => [...prev, slug]);
                        }
                      }}
                      className="rounded-lg px-2 py-1.5 text-left w-full"
                      style={{ background: selected ? `${typeColor}35` : `${typeColor}10`, border: `1px solid ${selected ? typeColor : typeColor + '44'}`, opacity: !selected && detailPendingMoves.length >= 4 ? 0.4 : 1 }}
                    >
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: '0.75rem' }}>{selected ? '✓' : '○'}</span>
                        <span className="text-white font-bold rounded px-1.5 py-0.5 shrink-0" style={{ background: typeColor, fontSize: '0.42rem' }}>{m.type.toUpperCase()}</span>
                        <span className="text-white text-xs font-bold flex-1">{m.name}</span>
                        {m.power > 0 && <span className="text-slate-300 text-xs font-black shrink-0">{m.power}</span>}
                      </div>
                    </button>
                  );
                });
              })()}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="mx-3 mb-3 rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.6)', border: '2px solid #6c90b0' }}>
          <div className="flex items-center gap-1 mb-2">
            {(POKEMON_TYPE[detailId] ?? []).map(t => (
              <span key={t} className="text-white font-bold px-1.5 py-0.5 rounded" style={{ background: TYPE_COLORS[t] ?? '#888', fontSize: '0.6rem' }}>{t.toUpperCase()}</span>
            ))}
          </div>
          <div className="font-black text-slate-700 text-xs mb-2">Statistiques</div>
          {[
            { label: 'HP', value: calcMaxHp(detailId, detailLevel) },
            { label: 'Attaque', value: calcAttack(detailId, detailLevel) },
            { label: 'Défense', value: calcDefense(detailId, detailLevel) },
            { label: 'Sp.Atk', value: calcSpAttack(detailId, detailLevel) },
            { label: 'Sp.Déf', value: calcSpDefense(detailId, detailLevel) },
            { label: 'Vitesse', value: calcSpeed(detailId, detailLevel) },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-0.5">
              <span className="text-slate-600 text-xs">{label}</span>
              <span className="font-black text-slate-800 text-xs">{value}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="mx-3 mb-4 flex gap-2 flex-wrap">
          {detailInParty ? (
            <button
              onClick={() => { moveToPC(detailId); setPokemonDetailId(null); }}
              className="flex-1 py-2 rounded-xl font-black text-xs text-white"
              style={{ background: '#6c8fac', border: '2px solid #4a7090', boxShadow: '0 2px 0 #2a5070' }}
            >Déposer</button>
          ) : (
            <button
              onClick={() => { handleTakeFromPC(detailId); setPokemonDetailId(null); }}
              className="flex-1 py-2 rounded-xl font-black text-xs text-white"
              style={{ background: '#e06020', border: '2px solid #b04010', boxShadow: '0 2px 0 #802808' }}
            >Prendre</button>
          )}
          {detailShowEvo && (
            <button
              onClick={() => {
                const entry = EVOLUTION_DATA[detailId];
                if (!entry) return;
                if (entry.choices) {
                  const availableChoices = entry.choices.filter(tid => (state.normalCollection[tid] ?? 0) === 0 && !party.includes(tid));
                  if (availableChoices.length === 0) return;
                  setPendingEvoChoice({ oldId: detailId, choices: availableChoices });
                } else if (entry.evolvesInto) {
                  setPendingEvoChoice({ oldId: detailId, newId: entry.evolvesInto });
                }
                setPokemonDetailId(null);
              }}
              className="flex-1 py-2 rounded-xl font-black text-xs text-black"
              style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b)' }}
            >✨ Évoluer</button>
          )}
        </div>
      </div>
    );
  }

  // ── Manual evolution screen ───────────────────────────────────────────────────
  if (pendingEvoChoice) {
    const item = pendingEvoChoice;
    const oldName = POKEMON_BY_ID[item.oldId]?.name ?? `#${item.oldId}`;
    const resolveNewId = item.newId ?? item.choices?.[0] ?? 0;
    const resolveNewName = POKEMON_BY_ID[resolveNewId]?.name ?? `#${resolveNewId}`;
    const choiceNames: Record<number, string> = {};
    if (item.choices) {
      for (const cid of item.choices) {
        choiceNames[cid] = POKEMON_BY_ID[cid]?.name ?? `#${cid}`;
      }
    }
    return (
      <EvolutionScreen
        oldPokemonId={item.oldId}
        newPokemonId={resolveNewId}
        oldName={oldName}
        newName={resolveNewName}
        choices={item.choices}
        choiceNames={choiceNames}
        ownedIds={owned}
        onComplete={() => {
          onTriggerEvo?.(item.oldId, item.newId ?? resolveNewId);
          setPendingEvoChoice(null);
        }}
        onCancel={() => {
          setPendingEvoChoice(null);
        }}
      />
    );
  }

  // ── Battle screen ─────────────────────────────────────────────────────────────
  if (battleTeam) {
    return (
      <BattleScreen
        playerTeam={battleTeam.playerTeam}
        enemyTeam={battleTeam.enemyTeam}
        onBattleEnd={handleBattleEnd}
        autoCombat={autoTraining}
        onAutoCombatChange={setAutoTraining}
        initialMuted={trainingMuted}
        onMuteChange={v => setTrainingMuted(v)}
        onQuit={() => { setBattleTeam(null); setAutoTraining(false); setTrainingMuted(false); }}
        pokemonCustomMoves={state.pokemonCustomMoves}
        pokemonMoves={state.pokemonMoves}
      />
    );
  }

  // ── Battle result screen ──────────────────────────────────────────────────────
  if (battleResult) {
    const totalXp = Object.values(battleResult.xpGains).reduce((s, v) => s + v, 0);
    return (
      <div className="fixed inset-0 z-[700] flex flex-col items-center justify-center px-6"
        style={{ background: 'linear-gradient(180deg,#0a0f2e 0%,#1a2050 100%)', fontFamily: 'monospace' }}>
        {/* Title */}
        <div className="mb-8 text-center">
          {battleResult.won ? (
            <div>
              <div className="text-yellow-400 font-black text-4xl mb-1" style={{ textShadow: '0 0 20px rgba(251,191,36,0.8)' }}>
                Victoire !
              </div>
              <div className="text-yellow-200/60 text-sm">Votre équipe a gagné le combat !</div>
            </div>
          ) : (
            <div>
              <div className="text-red-400 font-black text-4xl mb-1" style={{ textShadow: '0 0 20px rgba(248,113,113,0.8)' }}>
                Défaite...
              </div>
              <div className="text-red-200/60 text-sm">Votre équipe a été vaincue.</div>
            </div>
          )}
        </div>

        {/* Pokemon XP panel */}
        <div className="w-full max-w-xs rounded-2xl overflow-hidden mb-6"
          style={{ background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.12)' }}>
          <div className="px-4 py-2 text-center text-xs text-white/50 border-b border-white/10">
            Expérience gagnée
          </div>
          <div className="flex flex-col divide-y divide-white/5">
            {party.map((id, index) => {
              const poke = POKEMON_BY_ID[id];
              const lvData = state.pokemonLevels?.[id] ?? { level: 1, xp: 0 };
              const gained = battleResult.xpGains[id] ?? 0;
              const isShiny = (state.shinyCollection[id] ?? 0) > 0;
              const flashLevel = levelUpFlash[id];
              return (
                <div key={id} className="flex items-center gap-3 px-4 py-2.5" style={{ position: 'relative' }}>
                  <ShinySprite pokemonId={id} isShiny={isShiny} width={36} height={36} compact />
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-black text-xs truncate">{poke?.name ?? `#${id}`}</div>
                    <div className="text-white/40 text-xs">Niv. {lvData.level}</div>
                    {gained > 0 && (
                      <div style={{ position: 'relative', width: '100%', height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, marginTop: 2 }}>
                        <div style={{
                          width: `${xpBarWidths[id] ?? 0}%`,
                          height: '100%',
                          borderRadius: 2,
                          background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                          transition: 'width 1.2s ease-out',
                          transitionDelay: `${index * 150}ms`,
                        }} />
                      </div>
                    )}
                    {(() => {
                      const pre = preCombatLevels[id] ?? { level: 1, xp: 0 };
                      const post = state.pokemonLevels?.[id] ?? { level: 1, xp: 0 };
                      if (post.level <= pre.level) return null;
                      const preMoveSet = new Set(getAvailableMoves(id, pre.level));
                      const newMoves = getAvailableMoves(id, post.level).filter(m => !preMoveSet.has(m));
                      if (newMoves.length === 0) return null;
                      return (
                        <div style={{ marginTop: 3 }}>
                          {newMoves.map(slug => {
                            const mv = MOVES[slug];
                            if (!mv) return null;
                            return (
                              <div key={slug} style={{ fontSize: '0.6rem', color: '#4ade80', fontWeight: 700, lineHeight: 1.4 }}>
                                🆕 {mv.name} débloquée !
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                    {flashLevel !== undefined && (
                      <div style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none',
                        animation: 'levelFlash 0.7s ease-out',
                        color: '#fbbf24',
                        fontWeight: 900,
                        fontSize: '0.85rem',
                        textShadow: '0 0 12px rgba(251,191,36,0.9)',
                        zIndex: 2,
                      }}>
                        Niveau {flashLevel} !
                      </div>
                    )}
                  </div>
                  {gained > 0 ? (
                    <div className="text-yellow-400 font-black text-sm">+{gained} XP</div>
                  ) : (
                    <div className="text-white/20 text-xs">—</div>
                  )}
                </div>
              );
            })}
          </div>
          {totalXp > 0 && (
            <div className="px-4 py-2 text-right text-yellow-300 font-black text-xs border-t border-white/10">
              Total : +{totalXp} XP
            </div>
          )}
        </div>

        <button
          onClick={() => setBattleResult(null)}
          className="px-10 py-3 rounded-2xl font-black text-base text-black"
          style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', boxShadow: '0 4px 15px rgba(251,191,36,0.4)' }}
        >
          Continuer
        </button>
      </div>
    );
  }

  // ── Swap picker modal ────────────────────────────────────────────────────────
  if (swapPickOpen && pendingPcId !== null) {
    const pcPoke = POKEMON_BY_ID[pendingPcId];
    return (
      <div className="fixed inset-0 z-[700] flex flex-col items-center justify-center bg-black/80 px-4">
        <div className="w-full max-w-xs rounded-2xl overflow-hidden" style={{ border: '3px solid #6c8fac', background: 'linear-gradient(180deg,#c8d8e8 0%,#a8bfd0 100%)' }}>
          <div className="text-center py-3 px-4" style={{ background: '#6c8fac', borderBottom: '2px solid #4a7090' }}>
            <div className="text-white font-black text-sm" style={{ fontFamily: 'monospace' }}>Quel Pokémon retirer ?</div>
            <div className="text-blue-100 text-xs mt-0.5" style={{ fontFamily: 'monospace' }}>
              Pour prendre {pcPoke?.name ?? `#${pendingPcId}`}
            </div>
          </div>
          <div className="p-4 flex flex-col gap-2">
            {party.map((id, i) => {
              const poke = POKEMON_BY_ID[id];
              const lvData = state.pokemonLevels?.[id] ?? { level: 1, xp: 0 };
              const isShiny = (state.shinyCollection[id] ?? 0) > 0;
              return (
                <button
                  key={i}
                  onClick={() => swapWithParty(pendingPcId, i)}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl active:scale-95 transition-all"
                  style={{ background: '#e8f0e8', border: '2px solid #8faf8f' }}
                >
                  <ShinySprite pokemonId={id} isShiny={isShiny} width={40} height={40} />
                  <div className="flex flex-col items-start">
                    <span className="font-black text-slate-800 text-sm">{poke?.name ?? `#${id}`}</span>
                    <span className="text-slate-600 text-xs">Niv. {lvData.level}</span>
                  </div>
                </button>
              );
            })}
            <button
              onClick={() => { setSwapPickOpen(false); setPendingPcId(null); }}
              className="mt-1 py-2 rounded-xl font-bold text-sm text-slate-600"
              style={{ background: '#d0d8d0', border: '2px solid #9faf9f' }}
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-x-0 top-0 z-[600] flex flex-col select-none"
      style={{ bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))', background: theme.bg, fontFamily: 'monospace' }}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Global animation keyframes — injected once */}
      {theme.hasAnimation && <style>{PC_ANIM_STYLES}</style>}
      {/* Floating drag sprite */}
      {dragging && (
        <div
          className="fixed z-[900] pointer-events-none"
          style={{ left: dragging.x - 24, top: dragging.y - 24, width: 48, height: 48, opacity: 0.85 }}
        >
          <ShinySprite pokemonId={dragging.pokemonId} isShiny={(state.shinyCollection[dragging.pokemonId] ?? 0) > 0} width={48} height={48} compact />
        </div>
      )}

      {/* Header DS-style */}
      <div className="flex items-center justify-between px-3 shrink-0"
        style={{ background: theme.headerGrad, borderBottom: `3px solid ${theme.border}`, paddingTop: 'calc(0.5rem + env(safe-area-inset-top,0px))', paddingBottom: '0.5rem' }}>
        <div className="font-black text-sm" style={{ color: theme.titleColor }}>
          {theme.hasAnimation && theme.id === 'feu' ? (
            <span>{'PC de '.split('').map((char, i) => (
              <span key={i} style={{ animation: `pc-fire-title-pulse 1.5s ${i * 0.1}s ease-in-out infinite`, display: 'inline-block', minWidth: char === ' ' ? '0.35em' : undefined }}>{char === ' ' ? ' ' : char}</span>
            ))}{(username ?? 'Léo').split('').map((char, i) => (
              <span key={i} style={{ animation: `pc-fire-title-pulse 1.5s ${(i + 6) * 0.1}s ease-in-out infinite`, display: 'inline-block' }}>{char}</span>
            ))}</span>
          ) : theme.hasAnimation && theme.id === 'sakura' ? (
            <span style={{ animation: 'pc-sakura-title-glow 2s ease-in-out infinite' }}>PC de {username ?? 'Léo'}</span>
          ) : theme.hasAnimation && theme.id === 'galaxie' ? (
            <span style={{ animation: 'pc-galaxie-title 4s linear infinite' }}>PC de {username ?? 'Léo'}</span>
          ) : (
            `PC de ${username ?? 'Léo'}`
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setFilterDraft({ ...pcFilter }); setShowFilterModal(true); }}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-base relative"
            style={{ background: !filterIsEmpty(pcFilter) ? 'rgba(251,191,36,0.25)' : 'rgba(255,255,255,0.15)', border: !filterIsEmpty(pcFilter) ? '1px solid #fbbf24' : `1px solid ${theme.border}` }}
          >
            🔍
            {!filterIsEmpty(pcFilter) && (
              <span style={{ position: 'absolute', top: -4, right: -4, width: 10, height: 10, borderRadius: '50%', background: '#fbbf24', border: '2px solid #92400e' }} />
            )}
          </button>
        </div>
      </div>

      {/* Box header with navigation */}
      <div className="flex items-center justify-between px-2 py-1 shrink-0" style={{ background: theme.boxHeaderBg, borderBottom: `2px solid ${theme.border}` }}>
        <button
          onClick={() => setBoxIndexPersisted(Math.max(0, safeBoxIdx - 1))}
          disabled={safeBoxIdx === 0}
          className="text-white font-black text-base px-2 disabled:opacity-30"
        >◀</button>
        {editingBoxName ? (
          <input
            autoFocus
            className="text-center font-black text-sm bg-white text-slate-800 rounded px-2 py-0.5 w-28"
            value={boxNameInput}
            onChange={e => setBoxNameInput(e.target.value)}
            onBlur={saveBoxName}
            onKeyDown={e => e.key === 'Enter' && saveBoxName()}
            maxLength={20}
          />
        ) : (
          <button
            className="text-white font-black text-sm px-2 py-0.5 rounded hover:bg-white/10 transition-colors"
            onClick={() => { setBoxNameInput(currentBoxName); setEditingBoxName(true); }}
          >
            {currentBoxName}
          </button>
        )}
        <button
          onClick={() => {
            const nextIdx = safeBoxIdx + 1;
            if (nextIdx >= pcBoxes.length && pcBoxes.length < MAX_BOXES) onUpdatePcBoxes([...pcBoxes, []]);
            if (nextIdx < Math.min(pcBoxes.length + 1, MAX_BOXES)) setBoxIndexPersisted(nextIdx);
          }}
          disabled={safeBoxIdx >= pcBoxes.length - 1 && pcBoxes.length >= MAX_BOXES}
          className="text-white font-black text-base px-2 disabled:opacity-30"
        >▶</button>
      </div>

      {/* Main area */}
      <div className="flex flex-col flex-1 overflow-hidden" style={{ position: 'relative' }}>
        {theme.hasAnimation && <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}><AnimatedPcOverlay themeId={theme.id} /></div>}
        {/* PC Grid */}
        <div className="flex-1 overflow-y-auto p-2" style={{ background: theme.screenBg, backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,40,0.04) 0px, rgba(0,0,40,0.04) 1px, transparent 1px, transparent 3px)', position: 'relative', zIndex: 1 }}>
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${BOX_COLS}, 52px)`, width: 'fit-content', margin: '0 auto', overflow: 'visible' }}>
            {Array.from({ length: BOX_SIZE }).map((_, slotIdx) => {
              const id = currentBox[slotIdx];
              if (!id) {
                return (
                  <div
                    key={slotIdx}
                    className="rounded flex items-center justify-center"
                    data-slot-type="pc"
                    data-slot-idx={slotIdx}
                    style={{ width: 52, height: 52, background: 'rgba(0,0,0,0.1)' }}
                  />
                );
              }
              const lvData = state.pokemonLevels?.[id] ?? { level: 1, xp: 0 };
              const isShiny = (state.shinyCollection[id] ?? 0) > 0;
              const isDragged = dragging?.pokemonId === id;
              const evoEntry = EVOLUTION_DATA[id];
              const canEvolve = evoEntry && lvData.level >= evoEntry.level;
              const targets = evoEntry?.choices ?? (evoEntry?.evolvesInto ? [evoEntry.evolvesInto] : []);
              const allOwned = targets.every(tid => (state.normalCollection[tid] ?? 0) > 0);
              const showEvoBadge = canEvolve && !allOwned;
              const isFiltered = !matchesFilter(id);
              return (
                <button
                  key={slotIdx}
                  data-slot-type="pc"
                  data-slot-idx={slotIdx}
                  onClick={() => {
                    if (dragging) return;
                    setPokemonDetailId(id);
                    setSwapPickOpen(false);
                  }}
                  onTouchStart={e => handleTouchStart(e, id, 'pc', slotIdx)}
                  className="rounded flex flex-col items-center justify-center p-0.5 transition-all active:scale-95"
                  style={{
                    width: 52, height: 52,
                    background: 'rgba(255,255,255,0.15)',
                    opacity: isDragged ? 0.3 : 1,
                    filter: isFiltered ? 'grayscale(1) brightness(0.25)' : 'none',
                    position: 'relative',
                  }}
                >
                  <ShinySprite pokemonId={id} isShiny={isShiny} width={32} height={32} compact />
                  <span className="font-black" style={{ fontSize: '0.42rem', color: 'rgba(255,255,255,0.75)', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
                    Niv.{lvData.level}
                  </span>
                  {showEvoBadge && (
                    <span style={{ position: 'absolute', top: -3, right: -3, width: 13, height: 13, borderRadius: '50%', background: '#ffcc00', border: '2px solid #b8860b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', lineHeight: 1, zIndex: 10, boxShadow: '0 0 4px rgba(0,0,0,0.5)' }}>▲</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom: Party + detail */}
        <div className="shrink-0" style={{ background: theme.bg, borderTop: `3px solid ${theme.border}` }}>
          <div className="px-3 pt-1.5 pb-1 flex items-center justify-between">
            <div className="font-black text-xs" style={{ color: theme.textColor ?? '#1e293b' }}>Équipe ({party.length}/3)</div>
          </div>

          {/* Party slots */}
          <div className="flex gap-2 px-2 pb-2">
            {[0, 1, 2].map(i => {
              const id = party[i];
              if (!id) {
                return (
                  <div
                    key={i}
                    className="flex-1 h-16 rounded-xl flex items-center justify-center"
                    data-slot-type="party-empty"
                    data-slot-idx={i}
                    style={{ background: 'rgba(0,0,0,0.1)', border: '2px dashed #8fa8c0' }}
                  >
                    <span className="text-slate-500 text-xs">Vide</span>
                  </div>
                );
              }
              const poke = POKEMON_BY_ID[id];
              const lvData = state.pokemonLevels?.[id] ?? { level: 1, xp: 0 };
              const isShiny = (state.shinyCollection[id] ?? 0) > 0;
              const color = RARITY_COLORS[poke?.rarity ?? 'commun'];
              const isDragged = dragging?.pokemonId === id;
              const isPartyFiltered = !matchesFilter(id);
              return (
                <button
                  key={i}
                  data-slot-type="party"
                  data-slot-idx={i}
                  onClick={() => {
                    if (dragging) return;
                    setPokemonDetailId(id);
                    setSwapPickOpen(false);
                  }}
                  onTouchStart={e => handleTouchStart(e, id, 'party', i)}
                  className="flex-1 h-16 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95"
                  style={{
                    background: 'rgba(255,255,255,0.5)',
                    border: '2px solid #8fa8c0',
                    opacity: isDragged ? 0.3 : 1,
                    filter: isPartyFiltered ? 'grayscale(1) brightness(0.25)' : 'none',
                  }}
                >
                  <ShinySprite pokemonId={id} isShiny={isShiny} width={36} height={36} compact />
                  <span className="font-black" style={{ fontSize: '0.5rem', color, textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>Nv.{lvData.level}</span>
                </button>
              );
            })}
          </div>

          <div className="px-2 pb-2">
            <button
              onClick={startTraining}
              disabled={party.length === 0}
              className="w-full py-2 rounded-xl font-black text-sm text-white flex items-center justify-center gap-2 disabled:opacity-40"
              style={{ background: '#e06020', border: '2px solid #b04010', boxShadow: '0 2px 0 #802808' }}
            >
              ⚔️ Entraînement
            </button>
          </div>

        </div>
      </div>

      {/* Filter modal */}
      {showFilterModal && (
        <div className="fixed inset-0 z-[700] flex flex-col justify-end" style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setShowFilterModal(false)}>
          <div onClick={e => e.stopPropagation()} className="rounded-t-3xl flex flex-col max-h-[80vh]"
            style={{ background: '#0f172a', border: '2px solid #1e293b', borderBottom: 'none' }}>
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-slate-600" />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 shrink-0">
              <span className="text-white font-black text-sm">🔍 Filtres</span>
              <div className="flex gap-2">
                <button
                  onClick={() => { const f = EMPTY_FILTER; setFilterDraft(f); savePcFilter(f); }}
                  className="text-xs font-bold px-3 py-1 rounded-full"
                  style={{ background: '#ef444422', color: '#f87171', border: '1px solid #ef444455' }}
                >Tout effacer</button>
                <button
                  onClick={() => { savePcFilter(filterDraft); setShowFilterModal(false); }}
                  className="text-xs font-bold px-3 py-1 rounded-full"
                  style={{ background: '#22c55e22', color: '#4ade80', border: '1px solid #22c55e55' }}
                >Appliquer</button>
              </div>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col gap-4">
              {/* Name */}
              <div>
                <div className="text-slate-400 text-xs font-bold mb-2 uppercase tracking-wider">Nom</div>
                <input
                  type="text"
                  placeholder="Rechercher un Pokémon..."
                  value={filterDraft.name}
                  onChange={e => setFilterDraft(f => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-xl px-3 py-2 text-sm text-white font-bold outline-none"
                  style={{ background: '#1e293b', border: '1.5px solid #334155', fontFamily: 'monospace' }}
                />
              </div>
              {/* Types */}
              <div>
                <div className="text-slate-400 text-xs font-bold mb-2 uppercase tracking-wider">Types</div>
                <div className="flex flex-wrap gap-2">
                  {ALL_TYPES.map(({ key, label }) => {
                    const color = TYPE_COLORS[key as PokemonType] ?? '#475569';
                    const active = filterDraft.types.includes(key);
                    return (
                      <button
                        key={key}
                        onClick={() => setFilterDraft(f => ({
                          ...f,
                          types: active ? f.types.filter(x => x !== key) : [...f.types, key],
                        }))}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-black transition-all"
                        style={{
                          background: active ? color : 'rgba(255,255,255,0.05)',
                          color: 'white',
                          border: `1.5px solid ${color}`,
                          boxShadow: active ? `0 0 8px ${color}88` : 'none',
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Rarity */}
              <div>
                <div className="text-slate-400 text-xs font-bold mb-2 uppercase tracking-wider">Rareté</div>
                <div className="flex flex-wrap gap-2">
                  {ALL_RARITIES.map(({ key, label, color }) => {
                    const active = filterDraft.rarities.includes(key);
                    return (
                      <button
                        key={key}
                        onClick={() => setFilterDraft(f => ({
                          ...f,
                          rarities: active ? f.rarities.filter(x => x !== key) : [...f.rarities, key],
                        }))}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-black transition-all"
                        style={{
                          background: active ? color : 'rgba(255,255,255,0.05)',
                          color: 'white',
                          border: `1.5px solid ${color}`,
                          boxShadow: active ? `0 0 8px ${color}88` : 'none',
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Shiny */}
              <div>
                <div className="text-slate-400 text-xs font-bold mb-2 uppercase tracking-wider">Spécial</div>
                <button
                  onClick={() => setFilterDraft(f => ({ ...f, shiny: !f.shiny }))}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-black transition-all"
                  style={{
                    background: filterDraft.shiny ? '#fbbf24' : 'rgba(255,255,255,0.05)',
                    color: 'white',
                    border: '1.5px solid #fbbf24',
                    boxShadow: filterDraft.shiny ? '0 0 8px #fbbf2488' : 'none',
                  }}
                >
                  ✨ Shiny
                </button>
              </div>
              {/* Level range */}
              <div>
                <div className="text-slate-400 text-xs font-bold mb-2 uppercase tracking-wider">Niveau</div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1} max={100}
                    placeholder="Min"
                    value={filterDraft.minLevel ?? ''}
                    onChange={e => setFilterDraft(f => ({ ...f, minLevel: e.target.value ? Number(e.target.value) : null }))}
                    className="flex-1 rounded-xl px-3 py-2 text-sm text-white font-bold outline-none text-center"
                    style={{ background: '#1e293b', border: '1.5px solid #334155', fontFamily: 'monospace' }}
                  />
                  <span className="text-slate-500 font-bold">—</span>
                  <input
                    type="number"
                    min={1} max={100}
                    placeholder="Max"
                    value={filterDraft.maxLevel ?? ''}
                    onChange={e => setFilterDraft(f => ({ ...f, maxLevel: e.target.value ? Number(e.target.value) : null }))}
                    className="flex-1 rounded-xl px-3 py-2 text-sm text-white font-bold outline-none text-center"
                    style={{ background: '#1e293b', border: '1.5px solid #334155', fontFamily: 'monospace' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
