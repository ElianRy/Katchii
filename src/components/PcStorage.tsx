import { useState, useMemo, useRef, useCallback } from 'react';
import { GameState, RARITY_COLORS } from '../types';
import { POKEMON_BY_ID, GEN1_POKEMON } from '../data/gen1';
import { ShinySprite } from './ShinySprite';
import { POKEMON_TYPE, TYPE_COLORS } from '../data/pokemonTypes';
import { calcMaxHp, calcAttack, xpToNextLevel } from '../data/combatEngine';
import { EVOLUTION_DATA } from '../data/evolutionData';
import { getAvailableMoves } from '../data/gen1Movepools';
import { MOVES } from '../data/gen1Moves';
import { EvolutionScreen } from './EvolutionScreen';
import { BattleScreen } from './BattleScreen';
import type { TeamMember } from './TeamBuilder';
import type { PokemonType } from '../data/pokemonTypes';

const BOX_SIZE = 30;
const BOX_COLS = 6;

// Re-export buildEnemyTeam logic locally
const ZONE_LEVEL_RANGE: Record<string, [number, number]> = {
  zone1: [5, 20], zone2: [15, 35], zone3: [25, 50],
  zone4: [35, 65], zone5: [50, 75], zone6: [60, 85],
  zone7: [70, 95], zone8: [80, 100], ligue: [85, 100], zone_libre: [85, 100],
};

function buildEnemyTeam(zoneId: string): TeamMember[] {
  const [minLv, maxLv] = ZONE_LEVEL_RANGE[zoneId] ?? [10, 30];
  const rarities: string[] = maxLv <= 25 ? ['commun', 'commun', 'peu_commun']
    : maxLv <= 40 ? ['commun', 'peu_commun', 'peu_commun']
    : maxLv <= 55 ? ['peu_commun', 'peu_commun', 'rare']
    : maxLv <= 70 ? ['peu_commun', 'rare', 'rare']
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
  state, username, onUpdateParty, onUpdatePcBoxes, onUpdateBoxNames, onClose,
  isAdmin, onSetLevel,
  currentZoneId, onAddXp, onBattleWin, onTrainingBattle, onTriggerEvo,
  onSaveCustomMoves,
}: Props) {
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
  const [selected, setSelected] = useState<{ id: number; from: 'party' | 'pc' } | null>(null);
  const [editingBoxName, setEditingBoxName] = useState(false);
  const [boxNameInput, setBoxNameInput] = useState('');
  const [swapPickOpen, setSwapPickOpen] = useState(false);
  const [pendingPcId, setPendingPcId] = useState<number | null>(null);

  // Move editor
  const [moveEditorId, setMoveEditorId] = useState<number | null>(null);
  const [editingMoves, setEditingMoves] = useState(false);
  const [pendingMoves, setPendingMoves] = useState<string[]>([]);

  // Battle state
  const [battleTeam, setBattleTeam] = useState<{ playerTeam: TeamMember[]; enemyTeam: TeamMember[] } | null>(null);
  const [battleResult, setBattleResult] = useState<{ won: boolean; xpGains: Record<number, number> } | null>(null);

  // Manual evolution trigger
  const [evoConfirmId, setEvoConfirmId] = useState<number | null>(null);
  const [pendingEvoChoice, setPendingEvoChoice] = useState<{ oldId: number; newId?: number; choices?: number[] } | null>(null);

  // Drag & drop
  const dragRef = useRef<DragState | null>(null);
  const [dragging, setDragging] = useState<{ pokemonId: number; x: number; y: number } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    setSelected(null);
  }, [party, pcBoxes, safeBoxIdx, onUpdateParty, onUpdatePcBoxes]);

  const moveToParty = useCallback((pokemonId: number) => {
    const newBoxes = pcBoxes.map(box => box.filter(id => id !== pokemonId));
    const newParty = [...party, pokemonId];
    onUpdateParty(newParty);
    onUpdatePcBoxes(newBoxes);
    setSelected(null);
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
    setSelected(null);
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
      setSelected(null);
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

  const startTraining = () => {
    if (party.length === 0) return;
    const playerTeam: TeamMember[] = party.map(id => {
      const lvData = state.pokemonLevels?.[id] ?? { level: 1, xp: 0 };
      const moves = state.pokemonCustomMoves?.[id] ?? getAvailableMoves(id, lvData.level).slice(0, 4);
      const maxHp = calcMaxHp(id, lvData.level);
      return { pokemonId: id, level: lvData.level, xp: lvData.xp, currentHp: maxHp, maxHp, isShiny: (state.shinyCollection[id] ?? 0) > 0, moves };
    });
    const enemyTeam = buildEnemyTeam(currentZoneId ?? 'zone1');
    setBattleTeam({ playerTeam, enemyTeam });
  };

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

    setBattleResult({ won, xpGains });
  }, [party, owned, state.pokemonLevels, onTrainingBattle, onAddXp, onBattleWin, state.shinyCollection]);

  // ── Move editor ──────────────────────────────────────────────────────────────
  const openMoveEditor = (id: number) => {
    const lvData = state.pokemonLevels?.[id] ?? { level: 1, xp: 0 };
    const current = state.pokemonCustomMoves?.[id] ?? getAvailableMoves(id, lvData.level).slice(0, 4);
    setPendingMoves([...current]);
    setMoveEditorId(id);
    setEditingMoves(false);
  };

  const selectedPokemon = selected ? POKEMON_BY_ID[selected.id] : null;
  const selectedLevel = selected ? (state.pokemonLevels?.[selected.id]?.level ?? 1) : 1;
  const selectedXp = selected ? (state.pokemonLevels?.[selected.id]?.xp ?? 0) : 0;

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
            {party.map(id => {
              const poke = POKEMON_BY_ID[id];
              const lvData = state.pokemonLevels?.[id] ?? { level: 1, xp: 0 };
              const gained = battleResult.xpGains[id] ?? 0;
              const isShiny = (state.shinyCollection[id] ?? 0) > 0;
              return (
                <div key={id} className="flex items-center gap-3 px-4 py-2.5">
                  <ShinySprite pokemonId={id} isShiny={isShiny} width={36} height={36} compact />
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-black text-xs truncate">{poke?.name ?? `#${id}`}</div>
                    <div className="text-white/40 text-xs">Niv. {lvData.level}</div>
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

  // ── Move editor modal ─────────────────────────────────────────────────────────
  if (moveEditorId !== null) {
    const p = POKEMON_BY_ID[moveEditorId];
    const lvData = state.pokemonLevels?.[moveEditorId] ?? { level: 1, xp: 0 };
    const availablePool = getAvailableMoves(moveEditorId, lvData.level);
    const currentSlugs = state.pokemonCustomMoves?.[moveEditorId] ?? availablePool.slice(0, 4);
    const activeSlugs = editingMoves ? pendingMoves : currentSlugs;

    return (
      <div className="fixed inset-0 z-[750] flex items-center justify-center bg-black/80 px-4">
        <div className="w-full max-w-xs bg-slate-900 rounded-3xl overflow-hidden border-2 border-slate-700 flex flex-col max-h-[88vh]">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700 shrink-0">
            <ShinySprite pokemonId={moveEditorId} isShiny={(state.shinyCollection[moveEditorId] ?? 0) > 0} width={44} height={44} />
            <div className="flex-1">
              <div className="text-white font-black text-base">{p?.name ?? `#${moveEditorId}`}</div>
              <div className="text-slate-400 text-xs">Niv. {lvData.level} — Attaques</div>
            </div>
            <button onClick={() => setMoveEditorId(null)} className="text-slate-400 text-xl">✕</button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-xs font-bold">Attaques actives</span>
              {onSaveCustomMoves && !editingMoves && (
                <button
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: '#3b82f633', color: '#60a5fa', border: '1px solid #3b82f655' }}
                  onClick={() => { setPendingMoves([...currentSlugs]); setEditingMoves(true); }}
                >Modifier</button>
              )}
              {editingMoves && (
                <div className="flex gap-1.5">
                  <button
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: '#ef444433', color: '#f87171', border: '1px solid #ef444455' }}
                    onClick={() => setEditingMoves(false)}
                  >Annuler</button>
                  <button
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: '#22c55e33', color: '#4ade80', border: '1px solid #22c55e55', opacity: pendingMoves.length === 4 ? 1 : 0.4 }}
                    onClick={() => {
                      if (pendingMoves.length === 4) {
                        onSaveCustomMoves?.(moveEditorId, pendingMoves);
                        setEditingMoves(false);
                      }
                    }}
                  >Sauvegarder</button>
                </div>
              )}
            </div>

            {!editingMoves ? (
              <div className="flex flex-col gap-2">
                {activeSlugs.map(slug => {
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
              <div>
                <div className="text-slate-500 text-xs mb-2">Sélectionnez exactement 4 attaques ({pendingMoves.length}/4)</div>
                <div className="flex flex-col gap-1.5">
                  {availablePool.map(slug => {
                    const m = MOVES[slug];
                    if (!m) return null;
                    const isSelected = pendingMoves.includes(slug);
                    const typeColor = TYPE_COLORS[m.type as PokemonType] ?? '#475569';
                    return (
                      <button
                        key={slug}
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left"
                        style={{ background: isSelected ? '#3b82f622' : '#ffffff06', border: `1px solid ${isSelected ? '#3b82f6' : '#ffffff11'}` }}
                        onClick={() => {
                          if (isSelected) setPendingMoves(prev => prev.filter(s => s !== slug));
                          else if (pendingMoves.length < 4) setPendingMoves(prev => [...prev, slug]);
                        }}
                      >
                        <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center text-xs ${isSelected ? 'bg-blue-500 border-blue-400' : 'border-slate-600'}`}>
                          {isSelected ? '✓' : ''}
                        </span>
                        <span className="text-white font-bold rounded px-1 py-0.5 shrink-0" style={{ background: typeColor, fontSize: '0.4rem' }}>{m.type.toUpperCase()}</span>
                        <span className="text-white text-xs font-bold flex-1">{m.name}</span>
                        {m.power > 0 && <span className="text-slate-400 text-xs shrink-0">{m.power}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
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
      style={{ bottom: 72, background: '#c0d0e0', fontFamily: 'monospace' }}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
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
      <div className="flex items-center justify-between px-3 py-2 shrink-0" style={{ background: 'linear-gradient(180deg,#8fafcf 0%,#6c90b0 100%)', borderBottom: '3px solid #4a7090' }}>
        <button onClick={onClose} className="text-white font-black text-xs px-2 py-1 rounded" style={{ background: '#4a7090', border: '1px solid #2a5070' }}>
          ← Fermer
        </button>
        <div className="text-white font-black text-sm">PC de {username ?? 'Léo'}</div>
        <button
          onClick={startTraining}
          disabled={party.length === 0}
          className="text-white font-black text-xs px-2 py-1 rounded flex items-center gap-1 disabled:opacity-40"
          style={{ background: '#e06020', border: '2px solid #b04010', boxShadow: '0 2px 0 #802808' }}
        >
          ⚔️ Entraîn.
        </button>
      </div>

      {/* Box header with navigation */}
      <div className="flex items-center justify-between px-2 py-1 shrink-0" style={{ background: '#6c8fac', borderBottom: '2px solid #4a7090' }}>
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
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* PC Grid */}
        <div className="flex-1 overflow-y-auto p-2" style={{ background: '#88a878' }}>
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${BOX_COLS}, 50px)`, width: 'fit-content', margin: '0 auto' }}>
            {Array.from({ length: BOX_SIZE }).map((_, slotIdx) => {
              const id = currentBox[slotIdx];
              if (!id) {
                return (
                  <div
                    key={slotIdx}
                    className="rounded flex items-center justify-center"
                    data-slot-type="pc"
                    data-slot-idx={slotIdx}
                    style={{ width: 50, height: 50, background: 'rgba(0,0,0,0.1)' }}
                  />
                );
              }
              const lvData = state.pokemonLevels?.[id] ?? { level: 1, xp: 0 };
              const isShiny = (state.shinyCollection[id] ?? 0) > 0;
              const isSel = selected?.id === id;
              const isDragged = dragging?.pokemonId === id;
              return (
                <button
                  key={slotIdx}
                  data-slot-type="pc"
                  data-slot-idx={slotIdx}
                  onClick={() => {
                    if (dragging) return;
                    if (selected?.id === id) { openMoveEditor(id); return; }
                    setSelected({ id, from: 'pc' });
                    setSwapPickOpen(false);
                  }}
                  onTouchStart={e => handleTouchStart(e, id, 'pc', slotIdx)}
                  className="rounded flex flex-col items-center justify-center p-0.5 transition-all active:scale-95"
                  style={{
                    width: 50, height: 50,
                    background: isSel ? 'rgba(255,220,100,0.7)' : 'rgba(255,255,255,0.15)',
                    outline: isSel ? '2px solid #f59e0b' : 'none',
                    opacity: isDragged ? 0.3 : 1,
                  }}
                >
                  <ShinySprite pokemonId={id} isShiny={isShiny} width={32} height={32} compact />
                  <span className="font-black" style={{ fontSize: '0.42rem', color: isSel ? '#92400e' : '#1e3a1e' }}>
                    Niv.{lvData.level}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom: Party + detail */}
        <div className="shrink-0" style={{ background: '#c0d0e0', borderTop: '3px solid #4a7090' }}>
          <div className="px-3 pt-1.5 pb-1 flex items-center justify-between">
            <div className="font-black text-xs text-slate-700">Équipe ({party.length}/3)</div>
            {selected && <div className="text-xs text-slate-500">Tapez 2× pour modifier attaques</div>}
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
              const isSel = selected?.id === id;
              const isDragged = dragging?.pokemonId === id;
              return (
                <button
                  key={i}
                  data-slot-type="party"
                  data-slot-idx={i}
                  onClick={() => {
                    if (dragging) return;
                    if (selected?.id === id) { openMoveEditor(id); return; }
                    setSelected({ id, from: 'party' });
                    setSwapPickOpen(false);
                  }}
                  onTouchStart={e => handleTouchStart(e, id, 'party', i)}
                  className="flex-1 h-16 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95"
                  style={{
                    background: isSel ? 'rgba(255,220,80,0.6)' : 'rgba(255,255,255,0.5)',
                    border: `2px solid ${isSel ? '#f59e0b' : '#8fa8c0'}`,
                    opacity: isDragged ? 0.3 : 1,
                  }}
                >
                  <ShinySprite pokemonId={id} isShiny={isShiny} width={36} height={36} compact />
                  <span className="font-black" style={{ fontSize: '0.5rem', color }}>Nv.{lvData.level}</span>
                </button>
              );
            })}
          </div>

          {/* Selected pokemon detail */}
          {selected && selectedPokemon && (
            <div className="mx-2 mb-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.6)', border: '2px solid #6c90b0' }}>
              <div className="flex items-center gap-2 mb-1.5">
                <ShinySprite pokemonId={selected.id} isShiny={(state.shinyCollection[selected.id] ?? 0) > 0} width={44} height={44} />
                <div className="flex-1">
                  <div className="font-black text-slate-800 text-sm">{selectedPokemon.name}</div>
                  <div className="flex gap-1 mb-1">
                    {(POKEMON_TYPE[selected.id] ?? []).map(t => (
                      <span key={t} className="text-white font-bold px-1 py-0.5 rounded" style={{ background: TYPE_COLORS[t] ?? '#888', fontSize: '0.55rem' }}>
                        {t.toUpperCase().slice(0, 4)}
                      </span>
                    ))}
                  </div>
                  <div className="text-slate-600 text-xs">
                    Niv. {selectedLevel} · HP {calcMaxHp(selected.id, selectedLevel)} · ATK {calcAttack(selected.id, selectedLevel)}
                  </div>
                  {selectedLevel < 100 && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <div className="flex-1 bg-slate-300 rounded-full overflow-hidden" style={{ height: 4 }}>
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.floor(selectedXp / xpToNextLevel(selectedLevel) * 100))}%`, background: '#3b82f6' }} />
                      </div>
                      <span className="text-slate-500" style={{ fontSize: '0.42rem' }}>{selectedXp}/{xpToNextLevel(selectedLevel)}</span>
                    </div>
                  )}
                </div>
              </div>

              {isAdmin && onSetLevel && (
                <div className="mb-1.5">
                  <div className="text-slate-500 text-xs mb-0.5">Niveau (admin)</div>
                  <input
                    type="range" min={1} max={100}
                    value={selectedLevel}
                    onChange={e => onSetLevel(selected.id, Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}

              {(() => {
                const evoEntry = EVOLUTION_DATA[selected.id];
                if (!evoEntry || selectedLevel < evoEntry.level) return null;
                const targets = evoEntry.choices ?? (evoEntry.evolvesInto ? [evoEntry.evolvesInto] : []);
                const allOwned = targets.every(tid => (state.normalCollection[tid] ?? 0) > 0);
                if (allOwned) return null;
                if (evoConfirmId === selected.id) {
                  return (
                    <div className="mb-1.5 rounded-lg p-2" style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid #fbbf24' }}>
                      <div className="text-xs text-slate-700 font-bold mb-1.5 text-center">Faire évoluer {selectedPokemon.name} ?</div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const entry = EVOLUTION_DATA[selected.id];
                            if (!entry) return;
                            if (entry.choices) {
                              setPendingEvoChoice({ oldId: selected.id, choices: entry.choices });
                            } else if (entry.evolvesInto) {
                              setPendingEvoChoice({ oldId: selected.id, newId: entry.evolvesInto });
                            }
                            setEvoConfirmId(null);
                          }}
                          className="flex-1 py-1 rounded-lg font-black text-xs text-black"
                          style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b)' }}
                        >Oui !</button>
                        <button
                          onClick={() => setEvoConfirmId(null)}
                          className="flex-1 py-1 rounded-lg font-bold text-xs text-slate-600"
                          style={{ background: '#d0d8e0', border: '1px solid #a0b0c0' }}
                        >Annuler</button>
                      </div>
                    </div>
                  );
                }
                return (
                  <button
                    onClick={() => setEvoConfirmId(selected.id)}
                    className="w-full py-1.5 rounded-lg font-black text-xs text-black mb-1.5"
                    style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b)' }}
                  >
                    ✨ Évoluer
                  </button>
                );
              })()}

              <div className="flex gap-2">
                <button
                  onClick={() => openMoveEditor(selected.id)}
                  className="flex-1 py-1.5 rounded-lg font-bold text-xs text-white"
                  style={{ background: '#5b6fac', border: '2px solid #3a4f8c', boxShadow: '0 2px 0 #2a3570' }}
                >
                  ⚔️ Attaques
                </button>
                {selected.from === 'party' && (
                  <button
                    onClick={() => moveToPC(selected.id)}
                    className="flex-1 py-1.5 rounded-lg font-bold text-xs text-white"
                    style={{ background: '#6c8fac', border: '2px solid #4a7090', boxShadow: '0 2px 0 #2a5070' }}
                  >
                    Déposer
                  </button>
                )}
                {selected.from === 'pc' && (
                  <button
                    onClick={() => handleTakeFromPC(selected.id)}
                    className="flex-1 py-1.5 rounded-lg font-bold text-xs text-white"
                    style={{ background: '#e06020', border: '2px solid #b04010', boxShadow: '0 2px 0 #802808' }}
                  >
                    Prendre
                  </button>
                )}
                <button
                  onClick={() => setSelected(null)}
                  className="py-1.5 px-3 rounded-lg font-bold text-xs text-slate-600"
                  style={{ background: '#d0d8e0', border: '2px solid #a0b0c0' }}
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
