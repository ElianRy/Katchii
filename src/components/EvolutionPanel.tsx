import { useState } from 'react';
import { GameState, RARITY_COLORS, RARITY_LABELS } from '../types';
import { EVOLUTIONS, EVOLUTION_COST } from '../data/evolutions';
import { GEN1_POKEMON, POKEMON_BY_ID } from '../data/gen1';

interface Props {
  state: GameState;
  onEvolve: (pokemonId: number, isShiny: boolean, targetId: number) => boolean;
}

interface EvolutionEntry {
  pokemonId: number;
  isShiny: boolean;
  nextIds: number[];
  cost: number;
  fragments: number;
}

function spriteUrl(id: number, shiny: boolean): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${shiny ? 'shiny/' : ''}${id}.png`;
}

export function EvolutionPanel({ state, onEvolve }: Props) {
  const [lastEvolved, setLastEvolved] = useState<number | null>(null);

  // Build list of evolvable entries
  const entries: EvolutionEntry[] = [];

  for (const pokemon of GEN1_POKEMON) {
    const nextIds = EVOLUTIONS[pokemon.id];
    if (!nextIds) continue;

    // Check if caught (normal or shiny)
    const caughtNormal = (state.normalCollection[pokemon.id] ?? 0) > 0;
    const caughtShiny = (state.shinyCollection[pokemon.id] ?? 0) > 0;
    if (!caughtNormal && !caughtShiny) continue;

    const cost = EVOLUTION_COST(pokemon.rarity);
    const fragments = state.fragments[pokemon.id] ?? 0;

    if (caughtNormal) {
      entries.push({ pokemonId: pokemon.id, isShiny: false, nextIds, cost, fragments });
    }
    if (caughtShiny) {
      entries.push({ pokemonId: pokemon.id, isShiny: true, nextIds, cost, fragments });
    }
  }

  const handleEvolve = (pokemonId: number, isShiny: boolean, targetId: number) => {
    const ok = onEvolve(pokemonId, isShiny, targetId);
    if (ok) {
      setLastEvolved(targetId);
      setTimeout(() => setLastEvolved(null), 2000);
    }
  };

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <div className="text-4xl mb-3">🔄</div>
        <p className="text-lg font-bold">Aucune évolution disponible</p>
        <p className="text-sm">Capturez des Pokémon et accumulez des fragments !</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 flex flex-col gap-4">
      {lastEvolved && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-float-up">
          <div className="bg-purple-900/90 border border-purple-400/60 rounded-2xl px-6 py-3 shadow-2xl text-center">
            <div className="text-2xl mb-1">🎉</div>
            <div className="text-white font-bold">Évolution réussie !</div>
            <div className="text-purple-300 text-sm">
              {POKEMON_BY_ID[lastEvolved]?.name ?? `#${lastEvolved}`} rejoint ta collection !
            </div>
          </div>
        </div>
      )}

      {entries.map((entry) => {
        const srcPokemon = POKEMON_BY_ID[entry.pokemonId];
        const canAfford = entry.fragments >= entry.cost;

        return (
          <div
            key={`${entry.pokemonId}-${entry.isShiny ? 'shiny' : 'normal'}`}
            className="rounded-2xl border border-slate-600/40 bg-slate-800/40 p-4"
          >
            {/* Source pokemon info */}
            <div className="flex items-center gap-2 mb-3">
              <img
                src={spriteUrl(entry.pokemonId, entry.isShiny)}
                alt={srcPokemon?.name}
                width={40}
                height={40}
                style={{ imageRendering: 'pixelated' }}
                draggable={false}
              />
              <div>
                <div className="text-white font-bold text-sm">
                  {entry.isShiny && <span className="text-yellow-400">✨ </span>}
                  #{entry.pokemonId} {srcPokemon?.name}
                </div>
                <div
                  className="text-xs font-bold"
                  style={{ color: RARITY_COLORS[srcPokemon?.rarity ?? 'commun'] }}
                >
                  {RARITY_LABELS[srcPokemon?.rarity ?? 'commun']}
                </div>
              </div>
              <div className="ml-auto text-right">
                <div className={`text-sm font-bold ${canAfford ? 'text-green-400' : 'text-red-400'}`}>
                  {entry.fragments} / {entry.cost} fragments
                </div>
                {!canAfford && (
                  <div className="text-slate-500 text-xs">
                    Encore {entry.cost - entry.fragments} à collecter
                  </div>
                )}
              </div>
            </div>

            {/* Fragment progress bar */}
            <div className="mb-3">
              <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-1.5 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (entry.fragments / entry.cost) * 100)}%`,
                    background: canAfford ? '#22c55e' : '#3b82f6',
                  }}
                />
              </div>
            </div>

            {/* Evolution options */}
            <div className="flex flex-wrap gap-3">
              {entry.nextIds.map((nextId) => {
                const nextPokemon = POKEMON_BY_ID[nextId];
                const alreadyCaught = entry.isShiny
                  ? (state.shinyCollection[nextId] ?? 0) > 0
                  : (state.normalCollection[nextId] ?? 0) > 0;

                return (
                  <div key={nextId} className="flex items-center gap-2">
                    <span className="text-slate-400 text-lg">→</span>
                    <div className="flex flex-col items-center">
                      <div className="relative">
                        <img
                          src={spriteUrl(nextId, entry.isShiny)}
                          alt={nextPokemon?.name ?? `#${nextId}`}
                          width={48}
                          height={48}
                          style={{
                            imageRendering: 'pixelated',
                            filter: alreadyCaught ? 'none' : 'grayscale(100%) brightness(0.3)',
                          }}
                          draggable={false}
                        />
                        {!alreadyCaught && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-slate-400 text-lg">?</span>
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 text-center mt-0.5">
                        {alreadyCaught ? `#${nextId} ${nextPokemon?.name}` : '???'}
                      </div>
                    </div>
                    <button
                      onClick={() => handleEvolve(entry.pokemonId, entry.isShiny, nextId)}
                      disabled={!canAfford}
                      className={`px-3 py-2 rounded-xl text-sm font-bold transition-colors ${
                        canAfford
                          ? 'bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white'
                          : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      Évoluer
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
