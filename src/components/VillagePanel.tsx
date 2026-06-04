import { useState } from 'react';
import { GameState } from '../types';
import { GEN1_POKEMON, POKEMON_BY_ID } from '../data/gen1';

interface Props {
  state: GameState;
  onClose: () => void;
  onUpdateVillage: (updater: (prev: GameState['village']) => GameState['village']) => void;
  onSpendPoints: (amount: number) => boolean;
}

const VILLAGE_LEVELS = [
  { level: 1 as const, name: 'Cabane', cost: 0, slots: 2, gradient: 'from-green-950 via-slate-900 to-green-950' },
  { level: 2 as const, name: 'Maison', cost: 200, slots: 3, gradient: 'from-emerald-950 via-slate-900 to-emerald-950' },
  { level: 3 as const, name: 'Manoir', cost: 500, slots: 5, gradient: 'from-teal-950 via-slate-900 to-teal-950' },
  { level: 4 as const, name: 'Château', cost: 1200, slots: 7, gradient: 'from-blue-950 via-slate-900 to-blue-950' },
  { level: 5 as const, name: 'Tour Légendaire', cost: 3000, slots: 10, gradient: 'from-purple-950 via-slate-900 to-purple-950' },
] as const;

export function VillagePanel({ state, onClose, onUpdateVillage, onSpendPoints }: Props) {
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(state.village.name);
  const [pickingSlot, setPickingSlot] = useState<number | null>(null);
  const [pickingFavorite, setPickingFavorite] = useState(false);

  const currentLevel = VILLAGE_LEVELS.find(l => l.level === state.village.level)!;
  const nextLevel = VILLAGE_LEVELS.find(l => l.level === (state.village.level + 1 as 2 | 3 | 4 | 5));

  const ownedPokemon = GEN1_POKEMON.filter(
    p => (state.normalCollection[p.id] ?? 0) > 0 || (state.shinyCollection[p.id] ?? 0) > 0
  );

  const saveName = () => {
    const trimmed = nameInput.trim() || 'Mon Village';
    onUpdateVillage(v => ({ ...v, name: trimmed }));
    setEditingName(false);
  };

  const upgrade = () => {
    if (!nextLevel) return;
    if (onSpendPoints(nextLevel.cost)) {
      onUpdateVillage(v => ({ ...v, level: nextLevel.level }));
    }
  };

  const assignShowcase = (slotIdx: number, pokemonId: number, isShiny: boolean) => {
    onUpdateVillage(v => {
      const showcase = [...v.showcase];
      showcase[slotIdx] = { pokemonId, isShiny };
      return { ...v, showcase };
    });
    setPickingSlot(null);
  };

  const assignFavorite = (pokemonId: number, isShiny: boolean) => {
    onUpdateVillage(v => ({ ...v, favoritePokemon: { pokemonId, isShiny } }));
    setPickingFavorite(false);
  };

  const clearShowcaseSlot = (slotIdx: number) => {
    onUpdateVillage(v => {
      const showcase = v.showcase.filter((_, i) => i !== slotIdx);
      return { ...v, showcase };
    });
  };

  if (pickingSlot !== null || pickingFavorite) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 shrink-0">
          <h2 className="text-white font-bold text-lg">
            {pickingFavorite ? 'Choisir le Pokémon favori' : `Assigner la vitrine #${pickingSlot! + 1}`}
          </h2>
          <button onClick={() => { setPickingSlot(null); setPickingFavorite(false); }} className="text-slate-400 hover:text-white text-2xl px-2">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {ownedPokemon.length === 0 && (
            <p className="text-slate-500 text-center py-8">Capture d'abord des Pokémon !</p>
          )}
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
            {ownedPokemon.flatMap(p => {
              const variants: Array<{ pokemonId: number; isShiny: boolean }> = [{ pokemonId: p.id, isShiny: false }];
              if ((state.shinyCollection[p.id] ?? 0) > 0) variants.push({ pokemonId: p.id, isShiny: true });
              return variants.map(({ pokemonId, isShiny }) => (
                <button
                  key={`${pokemonId}-${isShiny}`}
                  onClick={() => pickingFavorite ? assignFavorite(pokemonId, isShiny) : assignShowcase(pickingSlot!, pokemonId, isShiny)}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg border border-slate-600/40 bg-slate-800/40 hover:border-blue-500"
                >
                  <div className="relative">
                    <img
                      src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${isShiny ? 'shiny/' : ''}${pokemonId}.png`}
                      alt={p.name} width={48} height={48} style={{ imageRendering: 'pixelated' }} draggable={false}
                    />
                    {isShiny && <span className="absolute -top-1 -right-1 text-xs">✨</span>}
                  </div>
                  <span className="text-slate-300" style={{ fontSize: '0.6rem' }}>{p.name}</span>
                </button>
              ));
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 shrink-0">
        <div>
          <h2 className="text-white font-bold text-xl">🏘️ Village</h2>
          <p className="text-slate-400 text-sm">{currentLevel.name} · Niveau {state.village.level}</p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none px-2">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Village background */}
        <div className={`rounded-2xl bg-gradient-to-br ${currentLevel.gradient} border border-slate-600/40 p-6 relative min-h-48`}>
          {/* Level badge */}
          <div className="absolute top-3 right-3 bg-black/60 rounded-full px-3 py-1 text-yellow-400 font-bold text-sm">
            Niv. {state.village.level} — {currentLevel.name}
          </div>

          {/* Village name */}
          <div className="flex items-center gap-2 mb-4">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveName()}
                  className="bg-slate-800 text-white rounded-lg px-3 py-1 text-lg font-bold border border-blue-500 outline-none"
                  maxLength={30}
                />
                <button onClick={saveName} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-lg text-sm font-bold">✓</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="text-white font-bold text-xl">{state.village.name}</h3>
                <button onClick={() => { setNameInput(state.village.name); setEditingName(true); }} className="text-slate-400 hover:text-white text-sm">✏️</button>
              </div>
            )}
          </div>

          {/* Favorite Pokémon */}
          <div className="flex items-end gap-4">
            {state.village.favoritePokemon ? (
              <div className="flex flex-col items-center">
                <img
                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${state.village.favoritePokemon.isShiny ? 'shiny/' : ''}${state.village.favoritePokemon.pokemonId}.png`}
                  alt="Favori"
                  width={64}
                  height={64}
                  style={{ imageRendering: 'pixelated', animation: 'bounce 2s ease-in-out infinite' }}
                />
                <span className="text-white text-xs">{POKEMON_BY_ID[state.village.favoritePokemon.pokemonId]?.name}</span>
                {state.village.favoritePokemon.isShiny && <span className="text-yellow-400 text-xs">✨</span>}
              </div>
            ) : (
              <button
                onClick={() => setPickingFavorite(true)}
                className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-500 flex items-center justify-center text-slate-500 text-xs hover:border-slate-300"
              >
                +
              </button>
            )}
            {state.village.favoritePokemon && (
              <button
                onClick={() => setPickingFavorite(true)}
                className="text-slate-400 hover:text-white text-xs underline"
              >
                Changer
              </button>
            )}
          </div>
        </div>

        {/* Showcase */}
        <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-600/40">
          <h3 className="text-white font-bold mb-3">Vitrine ({currentLevel.slots} emplacements)</h3>
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: currentLevel.slots }).map((_, i) => {
              const entry = state.village.showcase[i];
              const p = entry ? POKEMON_BY_ID[entry.pokemonId] : null;
              return (
                <div key={i} className="relative">
                  <button
                    onClick={() => setPickingSlot(i)}
                    className={`w-16 h-16 rounded-lg border-2 flex items-center justify-center transition-colors ${
                      entry ? 'border-blue-500/60 bg-slate-700' : 'border-dashed border-slate-600 hover:border-slate-400'
                    }`}
                  >
                    {entry ? (
                      <div className="relative">
                        <img
                          src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${entry.isShiny ? 'shiny/' : ''}${entry.pokemonId}.png`}
                          alt={p?.name} width={48} height={48} style={{ imageRendering: 'pixelated' }} draggable={false}
                        />
                        {entry.isShiny && <span className="absolute -top-1 -right-1 text-xs">✨</span>}
                      </div>
                    ) : (
                      <span className="text-slate-600 text-xl">+</span>
                    )}
                  </button>
                  {entry && (
                    <button
                      onClick={() => clearShowcaseSlot(i)}
                      className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs leading-none"
                    >
                      ×
                    </button>
                  )}
                  {p && <div className="text-center text-slate-400 mt-1" style={{ fontSize: '0.55rem' }}>{p.name}</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Upgrade */}
        {nextLevel && (
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-600/40">
            <h3 className="text-white font-bold mb-1">Amélioration</h3>
            <p className="text-slate-400 text-sm mb-3">
              Passer au niveau {nextLevel.level} — {nextLevel.name} ({nextLevel.slots} emplacements vitrine)
            </p>
            <div className="flex items-center justify-between">
              <span className="text-yellow-400 font-bold">{nextLevel.cost} pts</span>
              <button
                onClick={upgrade}
                disabled={state.points < nextLevel.cost}
                className="bg-yellow-600 hover:bg-yellow-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold px-4 py-2 rounded-xl transition-colors text-sm"
              >
                {state.points < nextLevel.cost ? `Il manque ${nextLevel.cost - state.points} pts` : 'Améliorer ✨'}
              </button>
            </div>
          </div>
        )}
        {!nextLevel && (
          <div className="bg-yellow-900/20 rounded-xl p-4 border border-yellow-500/40 text-center">
            <span className="text-yellow-400 font-bold">🏆 Village au niveau maximum !</span>
          </div>
        )}
      </div>
    </div>
  );
}
