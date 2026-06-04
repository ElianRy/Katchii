import { GameState, RARITY_COLORS, RARITY_LABELS, Rarity } from '../types';
import { ZONE_BY_ID } from '../data/zones';
import { POKEMON_BY_ID } from '../data/gen1';

interface Props {
  state: GameState;
  onClose: () => void;
}

export function ZoneInfoPanel({ state, onClose }: Props) {
  const zoneId = state.zoneProgress?.currentZoneId ?? 'zone1';
  const zone = ZONE_BY_ID[zoneId];
  if (!zone) return null;

  const caughtInZone = zone.pokemonIds.filter(id => (state.normalCollection[id] ?? 0) > 0);
  const missingInZone = zone.pokemonIds.filter(id => (state.normalCollection[id] ?? 0) === 0);
  const threshold = zone.completionThreshold;
  const needed = Math.ceil(zone.pokemonIds.length * threshold);
  const progress = caughtInZone.length / zone.pokemonIds.length;
  const progressTowardBoss = Math.min(1, caughtInZone.length / needed);
  const bossDefeated = state.zoneProgress?.bossDefeated?.[zoneId];

  // Group pokemon by rarity
  const byRarity: Record<string, number[]> = {};
  for (const id of zone.pokemonIds) {
    const p = POKEMON_BY_ID[id];
    if (!p) continue;
    if (!byRarity[p.rarity]) byRarity[p.rarity] = [];
    byRarity[p.rarity].push(id);
  }

  const RARITY_ORDER: Rarity[] = ['legendaire', 'elite', 'rare', 'peu_commun', 'commun'];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-slate-900 rounded-t-3xl w-full max-w-lg max-h-[80vh] overflow-y-auto pb-8"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-700">
          <div>
            <h2 className="text-white font-black text-lg">{zone.name}</h2>
            <p className="text-slate-400 text-xs">{zone.description}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl px-2">✕</button>
        </div>

        {/* Progress */}
        <div className="px-5 py-4 border-b border-slate-700/50">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Progression zone</span>
            <span>{caughtInZone.length}/{zone.pokemonIds.length}</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2 mb-3">
            <div className="h-2 rounded-full transition-all" style={{ width: `${progress * 100}%`, background: '#22c55e' }} />
          </div>

          {zone.boss && !bossDefeated && (
            <>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-yellow-400 font-bold">Débloquer le boss : {zone.boss.name}</span>
                <span className="text-slate-400">{caughtInZone.length}/{needed} ({Math.round(threshold * 100)}%)</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                <div
                  className="h-3 rounded-full transition-all"
                  style={{ width: `${progressTowardBoss * 100}%`, background: 'linear-gradient(90deg, #f59e0b, #ef4444)' }}
                />
              </div>
              {caughtInZone.length < needed && (
                <p className="text-xs text-slate-500 mt-1">Il te manque {needed - caughtInZone.length} Pokémon pour affronter {zone.boss.name}</p>
              )}
              {caughtInZone.length >= needed && (
                <p className="text-xs text-green-400 mt-1 font-bold">✅ Tu peux affronter {zone.boss.name} !</p>
              )}
            </>
          )}
          {bossDefeated && (
            <p className="text-xs text-green-400 font-bold">✅ Boss vaincu !</p>
          )}
        </div>

        {/* Pokemon by rarity */}
        <div className="px-5 py-4">
          <h3 className="text-white font-bold text-sm mb-3">Pokémon disponibles dans cette zone</h3>
          {RARITY_ORDER.map(rarity => {
            const ids = byRarity[rarity];
            if (!ids || ids.length === 0) return null;
            const color = RARITY_COLORS[rarity];
            const label = RARITY_LABELS[rarity];
            return (
              <div key={rarity} className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-px flex-1" style={{ background: color + '44' }} />
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ color, background: color + '22', border: `1px solid ${color}44` }}>
                    {label}
                  </span>
                  <div className="h-px flex-1" style={{ background: color + '44' }} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {ids.map(id => {
                    const p = POKEMON_BY_ID[id];
                    if (!p) return null;
                    const caught = (state.normalCollection[id] ?? 0) > 0;
                    return (
                      <div key={id} className="flex flex-col items-center gap-0.5">
                        <img
                          src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`}
                          alt={caught ? p.name : '???'}
                          width={40}
                          height={40}
                          style={{
                            imageRendering: 'pixelated',
                            filter: caught ? `drop-shadow(0 0 4px ${color})` : 'brightness(0) opacity(0.35)',
                          }}
                        />
                        <span className="text-center" style={{ fontSize: '0.5rem', color: caught ? '#e2e8f0' : '#4b5563', maxWidth: 40, lineHeight: 1.2 }}>
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

        {/* Missing pokemon */}
        {missingInZone.length > 0 && (
          <div className="px-5 pb-4 border-t border-slate-700/50 pt-4">
            <h3 className="text-white font-bold text-sm mb-2">
              Pokémon manquants ({missingInZone.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {missingInZone.map(id => (
                <div key={id} className="flex flex-col items-center gap-0.5">
                  <img
                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`}
                    alt="???"
                    width={36}
                    height={36}
                    style={{ imageRendering: 'pixelated', filter: 'brightness(0) opacity(0.35)' }}
                  />
                  <span style={{ fontSize: '0.45rem', color: '#4b5563' }}>#{id}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
