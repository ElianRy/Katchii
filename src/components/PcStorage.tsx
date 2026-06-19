import { useState, useMemo } from 'react';
import { GameState, RARITY_COLORS } from '../types';
import { POKEMON_BY_ID } from '../data/gen1';
import { ShinySprite } from './ShinySprite';
import { POKEMON_TYPE, TYPE_COLORS } from '../data/pokemonTypes';
import { calcMaxHp, calcAttack, xpToNextLevel } from '../data/combatEngine';
import { EVOLUTION_DATA } from '../data/evolutionData';
import { TeamBuilder } from './TeamBuilder';

const BOX_SIZE = 30;
const BOX_COLS = 6;

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
  isAdmin, onSetLevel, onTriggerEvolution,
  currentZoneId, onAddXp, onBattleWin, onTrainingBattle, onTriggerEvo, onMarkPendingEvolution,
}: Props) {
  const [boxIndex, setBoxIndex] = useState(0);
  const [selected, setSelected] = useState<{ id: number; from: 'party' | 'pc' } | null>(null);
  const [showTraining, setShowTraining] = useState(false);
  const [editingBoxName, setEditingBoxName] = useState(false);
  const [boxNameInput, setBoxNameInput] = useState('');
  const [swapPickOpen, setSwapPickOpen] = useState(false);
  const [pendingPcId, setPendingPcId] = useState<number | null>(null);

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

  const moveToPC = (pokemonId: number) => {
    const newParty = party.filter(id => id !== pokemonId);
    const newBoxes = pcBoxes.map((box, i) =>
      i === safeBoxIdx ? [pokemonId, ...box.filter(id => id !== pokemonId)] : box
    );
    onUpdateParty(newParty);
    onUpdatePcBoxes(newBoxes);
    setSelected(null);
  };

  const moveToParty = (pokemonId: number) => {
    const newBoxes = pcBoxes.map(box => box.filter(id => id !== pokemonId));
    const newParty = [...party, pokemonId];
    onUpdateParty(newParty);
    onUpdatePcBoxes(newBoxes);
    setSelected(null);
    setSwapPickOpen(false);
    setPendingPcId(null);
  };

  const swapWithParty = (pcId: number, partySlot: number) => {
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
  };

  const handlePartyClick = (id: number) => {
    if (selected?.id === id) { setSelected(null); return; }
    setSelected({ id, from: 'party' });
    setSwapPickOpen(false);
  };

  const handlePcClick = (id: number) => {
    if (selected?.id === id) { setSelected(null); return; }
    setSelected({ id, from: 'pc' });
    setSwapPickOpen(false);
  };

  const handleTakeFromPC = (id: number) => {
    if (party.length < 3) {
      moveToParty(id);
    } else {
      setPendingPcId(id);
      setSwapPickOpen(true);
    }
  };

  const saveBoxName = () => {
    if (!boxNameInput.trim()) { setEditingBoxName(false); return; }
    const newNames = [...boxNames];
    newNames[safeBoxIdx] = boxNameInput.trim();
    onUpdateBoxNames?.(newNames);
    setEditingBoxName(false);
  };

  const selectedPokemon = selected ? POKEMON_BY_ID[selected.id] : null;
  const selectedLevel = selected ? (state.pokemonLevels?.[selected.id]?.level ?? 1) : 1;
  const selectedXp = selected ? (state.pokemonLevels?.[selected.id]?.xp ?? 0) : 0;
  const hasPendingEvo = selected ? (state.pendingEvolutions ?? []).includes(selected.id) : false;

  if (showTraining) {
    return (
      <TeamBuilder
        state={state}
        currentZoneId={currentZoneId}
        onAddXp={onAddXp}
        onBattleWin={onBattleWin}
        onTrainingBattle={onTrainingBattle}
        onClose={() => setShowTraining(false)}
        onTriggerEvolution={onTriggerEvo}
        onMarkPendingEvolution={onMarkPendingEvolution}
      />
    );
  }

  // Swap picker modal
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
    <div className="fixed inset-0 z-[600] flex flex-col" style={{ height: '100dvh', background: '#c0d0e0', fontFamily: 'monospace' }}>
      {/* Header DS-style */}
      <div className="flex items-center justify-between px-3 py-2 shrink-0" style={{ background: 'linear-gradient(180deg,#8fafcf 0%,#6c90b0 100%)', borderBottom: '3px solid #4a7090' }}>
        <button onClick={onClose} className="text-white font-black text-xs px-2 py-1 rounded" style={{ background: '#4a7090', border: '1px solid #2a5070' }}>
          ← Fermer
        </button>
        <div className="text-white font-black text-sm">PC de {username ?? 'Léo'}</div>
        <button
          onClick={() => setShowTraining(true)}
          className="text-white font-black text-xs px-2 py-1 rounded flex items-center gap-1"
          style={{ background: '#e06020', border: '2px solid #b04010', boxShadow: '0 2px 0 #802808' }}
        >
          ⚔️ Entraîn.
        </button>
      </div>

      {/* Box header with navigation */}
      <div className="flex items-center justify-between px-2 py-1 shrink-0" style={{ background: '#6c8fac', borderBottom: '2px solid #4a7090' }}>
        <button
          onClick={() => setBoxIndex(Math.max(0, safeBoxIdx - 1))}
          disabled={safeBoxIdx === 0}
          className="text-white font-black text-base px-2 disabled:opacity-30"
        >
          ◀
        </button>
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
            if (nextIdx >= pcBoxes.length) {
              onUpdatePcBoxes([...pcBoxes, []]);
            }
            setBoxIndex(nextIdx);
          }}
          className="text-white font-black text-base px-2"
        >
          ▶
        </button>
      </div>

      {/* Main area: PC grid on top, party on bottom */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* PC Grid */}
        <div className="flex-1 overflow-y-auto p-2" style={{ background: '#88a878' }}>
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${BOX_COLS}, 1fr)` }}>
            {Array.from({ length: BOX_SIZE }).map((_, slotIdx) => {
              const id = currentBox[slotIdx];
              if (!id) {
                return (
                  <div
                    key={slotIdx}
                    className="aspect-square rounded flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.1)' }}
                  />
                );
              }
              const lvData = state.pokemonLevels?.[id] ?? { level: 1, xp: 0 };
              const isShiny = (state.shinyCollection[id] ?? 0) > 0;
              const isSel = selected?.id === id;
              return (
                <button
                  key={slotIdx}
                  onClick={() => handlePcClick(id)}
                  className="aspect-square rounded flex flex-col items-center justify-center p-0.5 transition-all active:scale-95"
                  style={{
                    background: isSel ? 'rgba(255,220,100,0.7)' : 'rgba(255,255,255,0.15)',
                    outline: isSel ? '2px solid #f59e0b' : 'none',
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

        {/* Bottom: Party + detail panel */}
        <div className="shrink-0" style={{ background: '#c0d0e0', borderTop: '3px solid #4a7090' }}>
          {/* てもちポケモン label */}
          <div className="px-3 pt-1.5 pb-1 flex items-center justify-between">
            <div className="font-black text-xs text-slate-700">Équipe ({party.length}/3)</div>
          </div>

          {/* Party slots horizontal */}
          <div className="flex gap-2 px-2 pb-2">
            {[0, 1, 2].map(i => {
              const id = party[i];
              if (!id) {
                return (
                  <div key={i} className="flex-1 h-16 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.1)', border: '2px dashed #8fa8c0' }}>
                    <span className="text-slate-500 text-xs">Vide</span>
                  </div>
                );
              }
              const poke = POKEMON_BY_ID[id];
              const lvData = state.pokemonLevels?.[id] ?? { level: 1, xp: 0 };
              const isShiny = (state.shinyCollection[id] ?? 0) > 0;
              const color = RARITY_COLORS[poke?.rarity ?? 'commun'];
              const isSel = selected?.id === id;
              return (
                <button
                  key={i}
                  onClick={() => handlePartyClick(id)}
                  className="flex-1 h-16 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95"
                  style={{
                    background: isSel ? 'rgba(255,220,80,0.6)' : 'rgba(255,255,255,0.5)',
                    border: `2px solid ${isSel ? '#f59e0b' : '#8fa8c0'}`,
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

              {hasPendingEvo && EVOLUTION_DATA[selected.id] && onTriggerEvolution && (
                <button
                  onClick={() => { onTriggerEvolution(selected.id); setSelected(null); }}
                  className="w-full py-1.5 rounded-lg font-black text-xs text-black mb-1.5"
                  style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b)' }}
                >
                  ✨ Faire évoluer
                </button>
              )}

              <div className="flex gap-2">
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
