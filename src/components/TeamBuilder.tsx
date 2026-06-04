import { useState } from 'react';
import { GameState, RARITY_COLORS } from '../types';
import { GEN1_POKEMON } from '../data/gen1';
import { POKEMON_TYPE, TYPE_COLORS } from '../data/pokemonTypes';
import { calcMaxHp, calcAttack } from '../data/combatEngine';

export interface TeamMember {
  pokemonId: number;
  level: number;
  xp: number;
  currentHp: number;
  maxHp: number;
}

interface Props {
  state: GameState;
  onConfirm: (team: TeamMember[]) => void;
  onClose: () => void;
  title?: string;
}

export function TeamBuilder({ state, onConfirm, onClose, title = 'Choisir mon équipe' }: Props) {
  const [selected, setSelected] = useState<number[]>([]);
  const [sort, setSort] = useState<'level' | 'rarity'>('level');

  const owned = GEN1_POKEMON.filter(p =>
    (state.normalCollection[p.id] ?? 0) > 0 || (state.shinyCollection[p.id] ?? 0) > 0
  );

  const sorted = [...owned].sort((a, b) => {
    if (sort === 'level') {
      const la = state.pokemonLevels?.[a.id]?.level ?? 1;
      const lb = state.pokemonLevels?.[b.id]?.level ?? 1;
      return lb - la;
    }
    const order = ['legendaire', 'elite', 'rare', 'peu_commun', 'commun'];
    return order.indexOf(a.rarity) - order.indexOf(b.rarity);
  });

  const toggle = (id: number) => {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const handleConfirm = () => {
    if (selected.length === 0) return;
    const team: TeamMember[] = selected.map(id => {
      const lvData = state.pokemonLevels?.[id] ?? { level: 1, xp: 0 };
      const maxHp = calcMaxHp(id, lvData.level);
      return { pokemonId: id, level: lvData.level, xp: lvData.xp, currentHp: maxHp, maxHp };
    });
    onConfirm(team);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 shrink-0">
        <div>
          <h2 className="text-white font-black text-xl">⚔️ {title}</h2>
          <p className="text-slate-400 text-sm">{selected.length}/3 Pokémon sélectionnés</p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl px-2">✕</button>
      </div>

      {/* Sort tabs */}
      <div className="flex gap-2 px-4 py-2 border-b border-slate-700/50 shrink-0">
        {(['level', 'rarity'] as const).map(s => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
              sort === s ? 'bg-yellow-500 text-black' : 'bg-slate-700 text-slate-300'
            }`}
          >
            {s === 'level' ? '📊 Par niveau' : '⭐ Par rareté'}
          </button>
        ))}
      </div>

      {/* Pokemon grid */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {sorted.map(p => {
            const lvData = state.pokemonLevels?.[p.id] ?? { level: 1, xp: 0 };
            const isShiny = (state.shinyCollection[p.id] ?? 0) > 0;
            const sel = selected.includes(p.id);
            const types = POKEMON_TYPE[p.id] ?? ['normal'];
            const color = RARITY_COLORS[p.rarity];
            const atk = calcAttack(p.id, lvData.level);
            const hp = calcMaxHp(p.id, lvData.level);

            return (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                  sel
                    ? 'border-yellow-400 bg-yellow-900/30 scale-105'
                    : 'border-slate-600/30 bg-slate-800/40 hover:border-slate-500'
                }`}
              >
                {/* Sprite */}
                <div className="relative">
                  <img
                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${isShiny ? 'shiny/' : ''}${p.id}.png`}
                    width={56} height={56}
                    style={{
                      imageRendering: 'pixelated',
                      filter: sel ? `drop-shadow(0 0 6px ${color})` : 'none',
                    }}
                    draggable={false}
                  />
                  {isShiny && <span className="absolute -top-1 -right-1 text-xs">✨</span>}
                  {sel && (
                    <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-black rounded-full w-4 h-4 flex items-center justify-center text-xs font-black">
                      {selected.indexOf(p.id) + 1}
                    </div>
                  )}
                </div>

                {/* Name */}
                <span className="text-white text-xs font-bold text-center leading-tight" style={{ fontSize: '0.6rem' }}>
                  {p.name}
                </span>

                {/* Level */}
                <span className="font-black text-xs" style={{ color }}>
                  Nv. {lvData.level}
                </span>

                {/* Type badges */}
                <div className="flex gap-0.5 flex-wrap justify-center">
                  {types.map(t => (
                    <span
                      key={t}
                      className="text-white font-bold rounded px-1"
                      style={{ background: TYPE_COLORS[t] ?? '#888', fontSize: '0.45rem' }}
                    >
                      {t.toUpperCase().slice(0, 4)}
                    </span>
                  ))}
                </div>

                {/* Stats */}
                <div className="flex gap-1 text-slate-400" style={{ fontSize: '0.5rem' }}>
                  <span>❤️{hp}</span>
                  <span>⚔️{atk}</span>
                </div>
              </button>
            );
          })}
        </div>

        {owned.length === 0 && (
          <div className="text-center text-slate-500 py-16">
            <div className="text-4xl mb-2">😢</div>
            <p>Aucun Pokémon capturé !</p>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="shrink-0 px-4 py-3 border-t border-slate-700 bg-slate-900/80">
        {/* Selected preview */}
        <div className="flex gap-2 mb-3 justify-center">
          {[0, 1, 2].map(i => {
            const id = selected[i];
            if (!id) return (
              <div key={i} className="w-14 h-14 rounded-xl border-2 border-dashed border-slate-600 flex items-center justify-center text-slate-600 text-xs">
                Vide
              </div>
            );
            const lvData = state.pokemonLevels?.[id] ?? { level: 1, xp: 0 };
            return (
              <div key={i} className="flex flex-col items-center">
                <img
                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`}
                  width={56} height={56}
                  style={{ imageRendering: 'pixelated' }}
                  draggable={false}
                />
                <span className="text-yellow-400 text-xs font-bold">Nv.{lvData.level}</span>
              </div>
            );
          })}
        </div>
        <button
          onClick={handleConfirm}
          disabled={selected.length === 0}
          className="w-full py-3 rounded-2xl font-black text-lg text-black disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: selected.length > 0 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : '#374151' }}
        >
          ⚔️ Combattre !
        </button>
      </div>
    </div>
  );
}
