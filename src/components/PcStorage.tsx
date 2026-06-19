import { useState, useMemo } from 'react';
import { GameState, RARITY_COLORS } from '../types';
import { POKEMON_BY_ID } from '../data/gen1';
import { ShinySprite } from './ShinySprite';
import { POKEMON_TYPE, TYPE_COLORS } from '../data/pokemonTypes';
import { calcMaxHp, calcAttack } from '../data/combatEngine';
import { EVOLUTION_DATA } from '../data/evolutionData';

const BOX_SIZE = 30;
const BOX_COLS = 6;

interface Props {
  state: GameState;
  onUpdateParty: (partyTeam: number[]) => void;
  onUpdatePcBoxes: (pcBoxes: number[][]) => void;
  onClose: () => void;
  isAdmin?: boolean;
  onSetLevel?: (pokemonId: number, level: number) => void;
  onTriggerEvolution?: (pokemonId: number) => void;
}

function chunkIntoBoxes(ids: number[]): number[][] {
  const boxes: number[][] = [];
  for (let i = 0; i < ids.length; i += BOX_SIZE) {
    boxes.push(ids.slice(i, i + BOX_SIZE));
  }
  if (boxes.length === 0) boxes.push([]);
  return boxes;
}

export function PcStorage({ state, onUpdateParty, onUpdatePcBoxes, onClose, isAdmin, onSetLevel, onTriggerEvolution }: Props) {
  const [boxIndex, setBoxIndex] = useState(0);
  const [selected, setSelected] = useState<{ id: number; from: 'party' | 'pc' } | null>(null);

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
      const stale = existingBoxes.map(box => box.filter(id => (state.normalCollection[id] ?? 0) > 0 && !partySet.has(id)));
      if (missing.length > 0) {
        const allInBox = [...stale.flat(), ...missing];
        return chunkIntoBoxes(allInBox);
      }
      return stale.length > 0 ? stale : [[]];
    }
    return chunkIntoBoxes(inPC);
  }, [state.pcBoxes, state.normalCollection, owned, party]);

  const safeBoxIndex = Math.min(boxIndex, Math.max(0, pcBoxes.length - 1));
  const currentBox = pcBoxes[safeBoxIndex] ?? [];

  const moveToPC = (pokemonId: number) => {
    const newParty = party.filter(id => id !== pokemonId);
    const newBoxes = pcBoxes.map((box, i) => i === safeBoxIndex ? [pokemonId, ...box.filter(id => id !== pokemonId)] : box);
    onUpdateParty(newParty);
    onUpdatePcBoxes(newBoxes);
    setSelected(null);
  };

  const moveToParty = (pokemonId: number) => {
    if (party.length >= 3) return;
    const newBoxes = pcBoxes.map(box => box.filter(id => id !== pokemonId));
    const newParty = [...party, pokemonId];
    onUpdateParty(newParty);
    onUpdatePcBoxes(newBoxes);
    setSelected(null);
  };

  const handlePartyClick = (id: number) => {
    if (selected?.id === id) { setSelected(null); return; }
    setSelected({ id, from: 'party' });
  };

  const handlePcClick = (id: number) => {
    if (selected?.id === id) { setSelected(null); return; }
    setSelected({ id, from: 'pc' });
  };

  const selectedPokemon = selected ? POKEMON_BY_ID[selected.id] : null;
  const selectedLevel = selected ? (state.pokemonLevels?.[selected.id]?.level ?? 1) : 1;
  const hasPendingEvo = selected ? (state.pendingEvolutions ?? []).includes(selected.id) : false;
  const evoEntry = selected ? EVOLUTION_DATA[selected.id] : null;

  return (
    <div className="fixed inset-0 z-[600] flex flex-col" style={{ background: '#0f172a', height: '100dvh' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 shrink-0">
        <div className="text-white font-black text-base">PC de Léo</div>
        <button onClick={onClose} className="text-slate-400 text-sm px-3 py-1 rounded-lg border border-slate-600">
          Fermer
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Party */}
        <div className="w-[38%] flex flex-col border-r border-slate-700 overflow-y-auto">
          <div className="px-3 py-2 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-700/50">
            Équipe ({party.length}/3)
          </div>
          <div className="flex flex-col gap-2 p-2 flex-1">
            {[0, 1, 2].map(i => {
              const id = party[i];
              if (!id) {
                return (
                  <div key={i} className="h-20 rounded-xl border-2 border-dashed border-slate-600/50 flex items-center justify-center text-slate-600 text-xs">
                    Vide
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
                  className={`h-20 rounded-xl border-2 flex items-center gap-2 px-2 transition-all active:scale-95 ${isSel ? 'border-yellow-400 bg-yellow-900/20' : 'border-slate-600/40 bg-slate-800/40'}`}
                >
                  <ShinySprite pokemonId={id} isShiny={isShiny} width={44} height={44} />
                  <div className="flex flex-col items-start min-w-0">
                    <span className="text-white font-bold leading-tight" style={{ fontSize: '0.6rem' }}>{poke?.name ?? `#${id}`}</span>
                    <span className="font-black text-xs" style={{ color }}>Nv.{lvData.level}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected info panel */}
          {selected && selectedPokemon && (
            <div className="border-t border-slate-700 p-3 bg-slate-800/40">
              <div className="text-white font-black text-sm mb-1">{selectedPokemon.name}</div>
              <div className="flex gap-1 mb-2">
                {(POKEMON_TYPE[selected.id] ?? []).map(t => (
                  <span key={t} className="text-white text-xs font-bold px-1.5 py-0.5 rounded"
                    style={{ background: TYPE_COLORS[t] ?? '#888', fontSize: '0.6rem' }}>
                    {t.toUpperCase().slice(0, 4)}
                  </span>
                ))}
              </div>
              <div className="text-slate-400 text-xs">
                Nv.{selectedLevel} · HP {calcMaxHp(selected.id, selectedLevel)} · ATK {calcAttack(selected.id, selectedLevel)}
              </div>
              {isAdmin && onSetLevel && (
                <div className="mt-2">
                  <div className="text-slate-500 text-xs mb-1">Niveau (admin)</div>
                  <input
                    type="range" min={1} max={100}
                    value={selectedLevel}
                    onChange={e => onSetLevel(selected.id, Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-yellow-400 text-xs font-bold text-center">Nv.{selectedLevel}</div>
                </div>
              )}
              {hasPendingEvo && evoEntry && onTriggerEvolution && (
                <button
                  onClick={() => { onTriggerEvolution(selected.id); setSelected(null); }}
                  className="mt-2 w-full py-1.5 rounded-lg font-bold text-xs text-black"
                  style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b)' }}
                >
                  Faire évoluer ✨
                </button>
              )}
              {selected.from === 'party' && (
                <button
                  onClick={() => moveToPC(selected.id)}
                  className="mt-2 w-full py-1.5 rounded-lg font-bold text-xs text-white border border-slate-500 bg-slate-700"
                >
                  Déposer au PC
                </button>
              )}
              {selected.from === 'pc' && party.length < 3 && (
                <button
                  onClick={() => moveToParty(selected.id)}
                  className="mt-2 w-full py-1.5 rounded-lg font-bold text-xs text-black"
                  style={{ background: 'linear-gradient(135deg,#60a5fa,#3b82f6)' }}
                >
                  Prendre dans l'équipe
                </button>
              )}
              {selected.from === 'pc' && party.length >= 3 && (
                <div className="mt-2 text-center text-slate-500 text-xs">Équipe pleine (3/3)</div>
              )}
            </div>
          )}
        </div>

        {/* Right: PC Boxes */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Box navigation */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/50 shrink-0">
            <button
              onClick={() => setBoxIndex(Math.max(0, safeBoxIndex - 1))}
              disabled={safeBoxIndex === 0}
              className="text-white px-2 py-1 rounded disabled:opacity-30 text-sm font-bold"
            >
              ◀
            </button>
            <div className="text-white font-bold text-sm">
              Boîte {safeBoxIndex + 1} <span className="text-slate-400 text-xs">({currentBox.length}/{BOX_SIZE})</span>
            </div>
            <button
              onClick={() => {
                const nextIdx = safeBoxIndex + 1;
                if (nextIdx >= pcBoxes.length) {
                  const newBoxes = [...pcBoxes, []];
                  onUpdatePcBoxes(newBoxes);
                }
                setBoxIndex(nextIdx);
              }}
              className="text-white px-2 py-1 rounded text-sm font-bold"
            >
              ▶
            </button>
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto p-2">
            <div
              className="grid gap-1"
              style={{ gridTemplateColumns: `repeat(${BOX_COLS}, 1fr)` }}
            >
              {Array.from({ length: BOX_SIZE }).map((_, slotIdx) => {
                const id = currentBox[slotIdx];
                if (!id) {
                  return (
                    <div
                      key={slotIdx}
                      className="aspect-square rounded-lg border border-dashed border-slate-700/40 bg-slate-800/20"
                    />
                  );
                }
                const poke = POKEMON_BY_ID[id];
                const lvData = state.pokemonLevels?.[id] ?? { level: 1, xp: 0 };
                const isShiny = (state.shinyCollection[id] ?? 0) > 0;
                const color = RARITY_COLORS[poke?.rarity ?? 'commun'];
                const isSel = selected?.id === id;
                return (
                  <button
                    key={slotIdx}
                    onClick={() => handlePcClick(id)}
                    className={`aspect-square rounded-lg border flex flex-col items-center justify-center p-0.5 transition-all active:scale-95 ${isSel ? 'border-yellow-400 bg-yellow-900/20' : 'border-slate-600/30 bg-slate-800/30'}`}
                  >
                    <ShinySprite pokemonId={id} isShiny={isShiny} width={32} height={32} compact />
                    <span className="font-black" style={{ fontSize: '0.45rem', color }}>
                      {lvData.level}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
