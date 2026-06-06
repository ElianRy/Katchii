import { GameState, RARITY_COLORS, RARITY_LABELS, RARITY_WEIGHTS, Rarity } from '../types';
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
  const progress = zone.pokemonIds.length > 0 ? caughtInZone.length / zone.pokemonIds.length : 0;
  const bossDefeated = state.zoneProgress?.bossDefeated?.[zoneId];

  function getBossConditionDisplay() {
    const cond = zone.unlockCondition;
    if (!cond) return null;
    const totalDiff = Object.keys(state.normalCollection).filter(id => (state.normalCollection[Number(id)] ?? 0) > 0).length;
    switch (cond.type) {
      case 'total_pokemon': return { label: `${totalDiff} / ${cond.count} pokémon différents`, progress: Math.min(1, totalDiff / cond.count) };
      case 'daily_quests_completed': { const done = state.dailyQuests.quests.filter(q => q.completed).length; return { label: `${done} / ${cond.count} quêtes complétées`, progress: Math.min(1, done / cond.count) }; }
      case 'capture_n_times': { const n = (state.pokemonCaptureCount ?? {})[cond.pokemonId] ?? 0; const name = POKEMON_BY_ID[cond.pokemonId]?.name ?? `#${cond.pokemonId}`; return { label: `${n} / ${cond.count} ${name} capturé(s)`, progress: Math.min(1, n / cond.count) }; }
      case 'duel_wins': return { label: `${state.duels.wins} / ${cond.count} victoires en duel`, progress: Math.min(1, state.duels.wins / cond.count) };
      case 'pokemon_level_in_team': { const maxLvl = Math.max(0, ...Object.values(state.pokemonLevels ?? {}).map(l => l.level)); return { label: `Niv. max : ${maxLvl} / ${cond.level}`, progress: Math.min(1, maxLvl / cond.level) }; }
      case 'shiny_captures': { const n = state.shinyCapturesTotal ?? 0; return { label: `${n} / ${cond.count} shiny capturé(s)`, progress: Math.min(1, n / cond.count) }; }
    }
  }
  const bossCondition = getBossConditionDisplay();

  const byRarity: Partial<Record<Rarity, number[]>> = {};
  for (const id of zone.pokemonIds) {
    const p = POKEMON_BY_ID[id];
    if (!p) continue;
    if (!byRarity[p.rarity]) byRarity[p.rarity] = [];
    byRarity[p.rarity]!.push(id);
  }

  // Compute spawn % per rarity tier (only tiers present in zone)
  const presentRarities = Object.keys(byRarity) as Rarity[];
  const totalWeight = presentRarities.reduce((s, r) => s + RARITY_WEIGHTS[r], 0);
  const rarityChance = (r: Rarity) => totalWeight > 0 ? (RARITY_WEIGHTS[r] / totalWeight) * 100 : 0;
  const pokemonChance = (r: Rarity) => {
    const count = byRarity[r]?.length ?? 1;
    return rarityChance(r) / count;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 rounded-2xl w-full max-w-lg overflow-y-auto"
        style={{ maxHeight: 'calc(100dvh - 96px)' }}
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

          {zone.boss && !bossDefeated && bossCondition && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-yellow-400 font-bold">⚔️ {zone.boss.name}</span>
                <span className="text-slate-400">{bossCondition.label}</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                <div
                  className="h-3 rounded-full transition-all"
                  style={{ width: `${bossCondition.progress * 100}%`, background: 'linear-gradient(90deg, #f59e0b, #ef4444)' }}
                />
              </div>
              {bossCondition.progress < 1 ? (
                <p className="text-xs text-slate-500 mt-1">Condition pas encore remplie pour affronter {zone.boss.name}</p>
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
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-bold text-sm">Pokémon disponibles dans cette zone</h3>
            <span className="text-yellow-400 text-xs font-bold bg-yellow-400/10 border border-yellow-400/30 rounded-full px-2 py-0.5">✨ ~0.4% shiny</span>
          </div>
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
                    {RARITY_LABELS[rarity]} — {rarityChance(rarity).toFixed(1)}% spawn — {caughtCount}/{ids.length}
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
                        <span style={{ fontSize: '0.45rem', color: color + 'cc', textAlign: 'center' }}>
                          {pokemonChance(rarity).toFixed(1)}%
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
