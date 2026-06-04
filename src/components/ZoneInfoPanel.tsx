import { GameState, RARITY_COLORS, RARITY_LABELS, Rarity } from '../types';
import { ZONE_BY_ID } from '../data/zones';
import { POKEMON_BY_ID } from '../data/gen1';

interface Props {
  state: GameState;
  onClose: () => void;
}

const RARITY_ORDER: Rarity[] = ['legendaire', 'elite', 'rare', 'peu_commun', 'commun'];

export function ZoneInfoPanel({ state, onClose }: Props) {
  const zoneId = state.zoneProgress?.currentZoneId ?? 'zone1';
  const zone = ZONE_BY_ID[zoneId];
  if (!zone) return null;

  const caughtInZone = zone.pokemonIds.filter(id => (state.normalCollection[id] ?? 0) > 0);
  const needed = Math.ceil(zone.pokemonIds.length * zone.completionThreshold);
  const progress = zone.pokemonIds.length > 0 ? caughtInZone.length / zone.pokemonIds.length : 0;
  const progressTowardBoss = Math.min(1, needed > 0 ? caughtInZone.length / needed : 1);
  const bossDefeated = state.zoneProgress?.bossDefeated?.[zoneId];

  const byRarity: Partial<Record<Rarity, number[]>> = {};
  for (const id of zone.pokemonIds) {
    const p = POKEMON_BY_ID[id];
    if (!p) continue;
    if (!byRarity[p.rarity]) byRarity[p.rarity] = [];
    byRarity[p.rarity]!.push(id);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 rounded-2xl w-full max-w-lg overflow-y-auto"
        style={{ maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-700">
          <div>
            <h2 className="text-white font-black text-lg">🌲 {zone.name}</h2>
            <p className="text-slate-400 text-xs mt-0.5">{zone.description}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl px-2">✕</button>
        </div>

        {/* Progress */}
        <div className="px-5 py-4 border-b border-slate-700/50 flex flex-col gap-3">
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Pokémon capturés dans la zone</span>
              <span className="font-bold text-white">{caughtInZone.length} / {zone.pokemonIds.length}</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all"
                style={{ width: `${progress * 100}%`, background: '#22c55e' }}
              />
            </div>
          </div>

          {zone.boss && !bossDefeated && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-yellow-400 font-bold">🏆 Débloquer {zone.boss.name}</span>
                <span className="text-slate-400">{caughtInZone.length} / {needed}</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                <div
                  className="h-3 rounded-full transition-all"
                  style={{ width: `${progressTowardBoss * 100}%`, background: 'linear-gradient(90deg, #f59e0b, #ef4444)' }}
                />
              </div>
              {caughtInZone.length < needed ? (
                <p className="text-xs text-slate-500 mt-1">
                  Encore <span className="text-yellow-400 font-bold">{needed - caughtInZone.length}</span> Pokémon à capturer pour affronter {zone.boss.name}
                </p>
              ) : (
                <p className="text-xs text-green-400 font-bold mt-1">✅ Tu peux affronter {zone.boss.name} !</p>
              )}
            </div>
          )}

          {bossDefeated && zone.boss && (
            <p className="text-xs text-green-400 font-bold">✅ Boss {zone.boss.name} vaincu !</p>
          )}
        </div>

        {/* Pokemon list by rarity — grey until caught */}
        <div className="px-5 py-4 pb-6">
          <h3 className="text-white font-bold text-sm mb-3">Pokémon disponibles dans cette zone</h3>
          {RARITY_ORDER.map(rarity => {
            const ids = byRarity[rarity];
            if (!ids || ids.length === 0) return null;
            const color = RARITY_COLORS[rarity];
            const caughtCount = ids.filter(id => (state.normalCollection[id] ?? 0) > 0).length;
            return (
              <div key={rarity} className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-px flex-1" style={{ background: color + '44' }} />
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ color, background: color + '22', border: `1px solid ${color}44` }}
                  >
                    {RARITY_LABELS[rarity]} — {caughtCount}/{ids.length}
                  </span>
                  <div className="h-px flex-1" style={{ background: color + '44' }} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {ids.map(id => {
                    const p = POKEMON_BY_ID[id];
                    if (!p) return null;
                    const caught = (state.normalCollection[id] ?? 0) > 0;
                    return (
                      <div key={id} className="flex flex-col items-center gap-0.5" style={{ width: 44 }}>
                        <img
                          src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`}
                          alt={caught ? p.name : '???'}
                          width={40}
                          height={40}
                          style={{
                            imageRendering: 'pixelated',
                            filter: caught
                              ? `drop-shadow(0 0 4px ${color})`
                              : 'grayscale(1) brightness(0.55) opacity(0.7)',
                          }}
                          draggable={false}
                        />
                        <span
                          style={{
                            fontSize: '0.5rem',
                            color: caught ? '#e2e8f0' : '#6b7280',
                            textAlign: 'center',
                            lineHeight: 1.2,
                            wordBreak: 'break-word',
                          }}
                        >
                          {caught ? p.name : '???'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
