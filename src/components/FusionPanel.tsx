import { useState } from 'react';
import { GameState, RARITY_COLORS, RARITY_LABELS } from '../types';
import { FUSIONS, FusionDefinition } from '../data/fusions';
import { POKEMON_BY_ID } from '../data/gen1';

interface Props {
  state: GameState;
  onFuse: (fusionId: string) => boolean;
  onClose: () => void;
}

function getPokemonSprite(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

function FusionCard({
  fusion,
  owned,
  alreadyFused,
  missingName,
  onFuse,
}: {
  fusion: FusionDefinition;
  owned: boolean;
  alreadyFused: boolean;
  missingName: string | null;
  onFuse: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [animating, setAnimating] = useState(false);
  const rarityColor = RARITY_COLORS[fusion.rarity];

  const handleFuse = () => {
    if (!confirm) {
      setConfirm(true);
      return;
    }
    setAnimating(true);
    setTimeout(() => {
      onFuse();
      setConfirm(false);
      setAnimating(false);
    }, 600);
  };

  return (
    <div
      className="rounded-xl border p-4 flex flex-col gap-3"
      style={{
        background: 'rgba(0,0,0,0.5)',
        borderColor: alreadyFused ? '#f59e0b' : owned ? rarityColor : '#374151',
        boxShadow: alreadyFused ? `0 0 12px 3px #f59e0b44` : owned ? `0 0 8px 2px ${rarityColor}44` : 'none',
      }}
    >
      {/* Sprites */}
      <div className={`flex items-center justify-center gap-1 relative ${animating ? 'animate-pulse' : ''}`}>
        <img
          src={getPokemonSprite(fusion.a)}
          alt=""
          width={48}
          height={48}
          style={{ imageRendering: 'pixelated', opacity: alreadyFused ? 1 : owned ? 1 : 0.4 }}
        />
        <span className="text-white font-bold text-lg">+</span>
        <img
          src={getPokemonSprite(fusion.b)}
          alt=""
          width={48}
          height={48}
          style={{ imageRendering: 'pixelated', opacity: alreadyFused ? 1 : owned ? 1 : 0.4 }}
        />
      </div>

      {/* Name & rarity */}
      <div className="text-center">
        <div className="font-bold text-white text-sm">{fusion.name}</div>
        <div className="text-xs mt-0.5" style={{ color: rarityColor }}>
          {RARITY_LABELS[fusion.rarity]}
        </div>
        <div className="text-xs text-slate-400 mt-0.5">{fusion.desc}</div>
      </div>

      {/* Status */}
      {alreadyFused ? (
        <div className="text-center text-yellow-400 font-bold text-sm">Créée ✓</div>
      ) : owned ? (
        <div className="text-center text-green-400 font-bold text-xs">Disponible</div>
      ) : (
        <div className="text-center text-slate-400 text-xs">
          Manque : {missingName}
        </div>
      )}

      {/* Button */}
      {!alreadyFused && owned && (
        <button
          onClick={handleFuse}
          className="w-full rounded-lg py-2 font-bold text-sm transition-all"
          style={{
            background: confirm ? '#dc2626' : rarityColor,
            color: '#000',
          }}
        >
          {confirm ? 'Confirmer ?' : 'Fusionner'}
        </button>
      )}
      {confirm && (
        <button
          onClick={() => setConfirm(false)}
          className="w-full rounded-lg py-1 font-bold text-xs text-slate-300 bg-slate-700 hover:bg-slate-600"
        >
          Annuler
        </button>
      )}
    </div>
  );
}

export function FusionPanel({ state, onFuse, onClose }: Props) {
  const fusedIds = new Set(state.fusions.map((f) => f.fusionId));

  return (
    <div className="fixed inset-0 bg-slate-900 text-white z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700 bg-black/40">
        <div>
          <h2 className="text-xl font-bold text-purple-300">⚗️ Fusion</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Fusionne deux Pokémon pour créer une créature unique
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">
            {fusedIds.size}/{FUSIONS.length} créées
          </span>
          <button
            onClick={onClose}
            className="bg-slate-700 hover:bg-slate-600 rounded-full w-8 h-8 flex items-center justify-center font-bold"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-3 max-w-2xl mx-auto">
          {FUSIONS.map((fusion) => {
            const alreadyFused = fusedIds.has(fusion.id);
            const hasA = (state.normalCollection[fusion.a] ?? 0) > 0;
            const hasB = (state.normalCollection[fusion.b] ?? 0) > 0;
            const owned = hasA && hasB;
            let missingName: string | null = null;
            if (!owned) {
              if (!hasA && !hasB) {
                const pa = POKEMON_BY_ID[fusion.a];
                const pb = POKEMON_BY_ID[fusion.b];
                missingName = `${pa?.name ?? fusion.a} & ${pb?.name ?? fusion.b}`;
              } else if (!hasA) {
                missingName = POKEMON_BY_ID[fusion.a]?.name ?? String(fusion.a);
              } else {
                missingName = POKEMON_BY_ID[fusion.b]?.name ?? String(fusion.b);
              }
            }

            return (
              <FusionCard
                key={fusion.id}
                fusion={fusion}
                owned={owned}
                alreadyFused={alreadyFused}
                missingName={missingName}
                onFuse={() => onFuse(fusion.id)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
