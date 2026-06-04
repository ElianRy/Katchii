import { useState, useCallback } from 'react';
import { GameState, RARITY_COLORS, Rarity } from '../types';
import { POKEMON_BY_ID, GEN1_POKEMON } from '../data/gen1';
import { Zone, ZONE_ORDER } from '../data/zones';

interface Props {
  zone: Zone;
  state: GameState;
  onClose: () => void;
  onVictory: (zoneId: string, nextZoneId: string | null) => void;
}

const RARITY_POWER: Record<Rarity, number> = {
  commun: 10,
  peu_commun: 20,
  rare: 35,
  elite: 55,
  legendaire: 80,
};

function teamScore(team: Array<{ pokemonId: number; isShiny: boolean }>): number {
  return team.reduce((sum, m) => {
    const p = POKEMON_BY_ID[m.pokemonId];
    if (!p) return sum;
    return sum + RARITY_POWER[p.rarity] + (m.isShiny ? 10 : 0);
  }, 0);
}

type Phase = 'intro' | 'select' | 'battle' | 'result';

export function BossFightPanel({ zone, state, onClose, onVictory }: Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [selected, setSelected] = useState<Array<{ pokemonId: number; isShiny: boolean }>>([]);
  const [won, setWon] = useState(false);
  const [playerScore, setPlayerScore] = useState(0);
  const [bossScore, setBossScore] = useState(0);

  const boss = zone.boss!;
  const bossTeamScore = teamScore(boss.team);

  const nextZoneId = (() => {
    const idx = ZONE_ORDER.indexOf(zone.id);
    return idx >= 0 && idx < ZONE_ORDER.length - 1 ? ZONE_ORDER[idx + 1] : null;
  })();

  const ownedPokemon = GEN1_POKEMON.filter(
    p => (state.normalCollection[p.id] ?? 0) > 0 || (state.shinyCollection[p.id] ?? 0) > 0
  );

  const toggle = useCallback((pokemonId: number, isShiny: boolean) => {
    setSelected(prev => {
      const idx = prev.findIndex(m => m.pokemonId === pokemonId && m.isShiny === isShiny);
      if (idx >= 0) return prev.filter((_, i) => i !== idx);
      if (prev.length >= 3) return prev;
      return [...prev, { pokemonId, isShiny }];
    });
  }, []);

  const isSelected = (pokemonId: number, isShiny: boolean) =>
    selected.some(m => m.pokemonId === pokemonId && m.isShiny === isShiny);

  const startFight = useCallback(() => {
    if (selected.length === 0) return;
    const ps = teamScore(selected);
    const bs = bossTeamScore;
    const victory = ps >= bs;
    setPlayerScore(ps);
    setBossScore(bs);
    setWon(victory);
    setPhase('battle');
    setTimeout(() => {
      setPhase('result');
      if (victory) onVictory(zone.id, nextZoneId);
    }, 2200);
  }, [selected, bossTeamScore, zone.id, nextZoneId, onVictory]);

  const myScore = teamScore(selected);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-slate-700 shrink-0"
        style={{ background: 'rgba(0,0,0,0.6)' }}
      >
        <div>
          <h2 className="text-white font-black text-xl">⚔️ Combat de Zone</h2>
          <p className="text-slate-400 text-sm">{zone.name}</p>
        </div>
        {phase !== 'battle' && (
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl px-2">✕</button>
        )}
      </div>

      {/* INTRO */}
      {phase === 'intro' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
          <div className="text-center">
            <div className="text-6xl mb-3">🏆</div>
            <h3 className="text-white font-black text-2xl">{boss.name}</h3>
            <p className="text-yellow-400 font-bold text-sm mt-1">{boss.title}</p>
          </div>

          {/* Boss team */}
          <div className="bg-slate-800/60 rounded-2xl p-4 border border-red-500/30 w-full max-w-sm">
            <div className="text-slate-400 text-xs text-center mb-3">Équipe du maître</div>
            <div className="flex justify-center gap-4">
              {boss.team.map((m, i) => {
                const p = POKEMON_BY_ID[m.pokemonId];
                return (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <img
                      src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${m.isShiny ? 'shiny/' : ''}${m.pokemonId}.png`}
                      alt={p?.name ?? '???'}
                      width={64}
                      height={64}
                      style={{
                        imageRendering: 'pixelated',
                        filter: p ? `drop-shadow(0 0 6px ${RARITY_COLORS[p.rarity]})` : 'none',
                      }}
                    />
                    <span className="text-xs text-slate-300">{p?.name ?? '???'}</span>
                    <span className="text-xs font-bold" style={{ color: p ? RARITY_COLORS[p.rarity] : '#fff' }}>
                      {p ? RARITY_POWER[p.rarity] + (m.isShiny ? 10 : 0) : 0} pts
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="text-center mt-3">
              <span className="text-red-400 font-black text-lg">Force totale : {bossTeamScore}</span>
            </div>
          </div>

          {/* Badge reward */}
          <div className="bg-yellow-900/30 rounded-xl px-5 py-3 border border-yellow-500/40 text-center">
            <div className="text-yellow-400 text-xs font-bold mb-0.5">Récompense en cas de victoire</div>
            <div className="text-white font-bold">🥇 {boss.badge}</div>
            <div className="text-slate-400 text-xs mt-1">{boss.reward}</div>
          </div>

          <button
            onClick={() => setPhase('select')}
            className="w-full max-w-sm py-4 rounded-2xl font-black text-lg text-black"
            style={{ background: 'linear-gradient(90deg, #f59e0b, #ef4444)' }}
          >
            ⚔️ Choisir mon équipe
          </button>
        </div>
      )}

      {/* TEAM SELECT */}
      {phase === 'select' && (
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 p-4">
          {/* My team */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-600/40 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-bold">Mon équipe ({selected.length}/3)</h3>
              <span className="text-yellow-400 font-black">{myScore} pts</span>
            </div>
            <div className="flex gap-3">
              {[0, 1, 2].map(i => {
                const m = selected[i];
                if (!m) return (
                  <div key={i} className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-600 flex items-center justify-center text-slate-600 text-xs">
                    Vide
                  </div>
                );
                const p = POKEMON_BY_ID[m.pokemonId];
                return (
                  <div key={i} className="flex flex-col items-center">
                    <img
                      src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${m.isShiny ? 'shiny/' : ''}${m.pokemonId}.png`}
                      width={64} height={64}
                      style={{ imageRendering: 'pixelated' }}
                    />
                    <span className="text-xs text-slate-300 text-center" style={{ fontSize: '0.55rem' }}>{p?.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Boss power indicator */}
          <div className="bg-red-950/40 rounded-xl px-4 py-2 border border-red-500/30 shrink-0 flex justify-between items-center">
            <span className="text-slate-400 text-xs">{boss.name} — Force</span>
            <span className="text-red-400 font-black">{bossTeamScore} pts</span>
          </div>
          {myScore > 0 && (
            <div className="text-center text-sm shrink-0">
              {myScore >= bossTeamScore
                ? <span className="text-green-400 font-bold">✅ Tu es plus fort que le maître !</span>
                : <span className="text-red-400 font-bold">⚠️ Le maître est plus fort ({bossTeamScore - myScore} pts d'écart)</span>
              }
            </div>
          )}

          {/* Pokemon grid */}
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {ownedPokemon.length === 0 && (
              <div className="col-span-4 text-slate-500 text-center py-8">
                <p>Aucun Pokémon capturé !</p>
              </div>
            )}
            {ownedPokemon.map(p => {
              const hasShiny = (state.shinyCollection[p.id] ?? 0) > 0;
              const variants: Array<{ pokemonId: number; isShiny: boolean }> = [{ pokemonId: p.id, isShiny: false }];
              if (hasShiny) variants.push({ pokemonId: p.id, isShiny: true });
              return variants.map(({ pokemonId, isShiny }) => {
                const sel = isSelected(pokemonId, isShiny);
                const color = RARITY_COLORS[p.rarity];
                return (
                  <button
                    key={`${pokemonId}-${isShiny}`}
                    onClick={() => toggle(pokemonId, isShiny)}
                    className={`flex flex-col items-center gap-0.5 p-1 rounded-xl border-2 transition-all ${
                      sel ? 'border-yellow-400 bg-yellow-900/30 scale-105' : 'border-slate-600/30 bg-slate-800/40'
                    }`}
                  >
                    <img
                      src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${isShiny ? 'shiny/' : ''}${pokemonId}.png`}
                      width={48} height={48}
                      style={{ imageRendering: 'pixelated', filter: sel ? `drop-shadow(0 0 4px ${color})` : 'none' }}
                    />
                    <span className="text-center" style={{ fontSize: '0.5rem', color: sel ? '#fde68a' : '#94a3b8' }}>
                      {RARITY_POWER[p.rarity] + (isShiny ? 10 : 0)}pts
                    </span>
                  </button>
                );
              });
            })}
          </div>

          {/* Fight button */}
          <div className="shrink-0 pb-4">
            <button
              onClick={startFight}
              disabled={selected.length === 0}
              className="w-full py-4 rounded-2xl font-black text-lg text-black disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              style={{ background: selected.length > 0 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : '#374151' }}
            >
              ⚔️ Combattre {boss.name} !
            </button>
          </div>
        </div>
      )}

      {/* BATTLE ANIMATION */}
      {phase === 'battle' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-8 p-6">
          <div className="text-center">
            <div className="text-5xl animate-bounce mb-4">⚔️</div>
            <h3 className="text-white font-black text-2xl animate-pulse">Combat en cours…</h3>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <div className="text-slate-300 text-sm font-bold">Ton équipe</div>
              <div className="flex gap-2">
                {selected.map((m, i) => (
                  <img
                    key={i}
                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${m.isShiny ? 'shiny/' : ''}${m.pokemonId}.png`}
                    width={52} height={52}
                    style={{ imageRendering: 'pixelated', animation: `float 0.8s ease-in-out infinite`, animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </div>
              <span className="text-yellow-400 font-black">{playerScore} pts</span>
            </div>
            <div className="text-3xl font-black text-red-400 animate-pulse">VS</div>
            <div className="flex flex-col items-center gap-2">
              <div className="text-red-300 text-sm font-bold">{boss.name}</div>
              <div className="flex gap-2">
                {boss.team.map((m, i) => (
                  <img
                    key={i}
                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${m.pokemonId}.png`}
                    width={52} height={52}
                    style={{ imageRendering: 'pixelated', animation: `float 0.8s ease-in-out infinite`, animationDelay: `${i * 0.2 + 0.1}s` }}
                  />
                ))}
              </div>
              <span className="text-red-400 font-black">{bossScore} pts</span>
            </div>
          </div>
        </div>
      )}

      {/* RESULT */}
      {phase === 'result' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
          {won ? (
            <>
              <div className="text-7xl">🏆</div>
              <div className="text-center">
                <h3 className="text-white font-black text-3xl text-green-400">Victoire !</h3>
                <p className="text-slate-300 mt-1">Tu as battu <span className="text-yellow-400 font-bold">{boss.name}</span> !</p>
                <p className="text-slate-400 text-sm mt-0.5">{playerScore} pts vs {bossScore} pts</p>
              </div>
              <div className="bg-yellow-900/40 rounded-2xl p-5 border border-yellow-500/50 text-center w-full max-w-sm flex flex-col gap-2">
                <div className="text-yellow-400 font-black text-lg">🥇 {boss.badge} obtenu !</div>
                {nextZoneId && (
                  <div className="text-green-400 text-sm font-bold">{boss.reward}</div>
                )}
                <div className="text-slate-300 text-sm">+100 points</div>
              </div>
              <button
                onClick={onClose}
                className="w-full max-w-sm py-4 rounded-2xl font-black text-lg text-black"
                style={{ background: 'linear-gradient(90deg, #22c55e, #16a34a)' }}
              >
                ✅ Continuer
              </button>
            </>
          ) : (
            <>
              <div className="text-7xl">💀</div>
              <div className="text-center">
                <h3 className="text-red-400 font-black text-3xl">Défaite…</h3>
                <p className="text-slate-300 mt-1">{boss.name} était trop fort !</p>
                <p className="text-slate-400 text-sm mt-0.5">{playerScore} pts vs {bossScore} pts</p>
              </div>
              <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-600/40 text-center w-full max-w-sm">
                <p className="text-slate-400 text-sm">Capture plus de Pokémon et réessaie.</p>
                <p className="text-slate-500 text-xs mt-1">Force nécessaire : ≥ {bossTeamScore} pts</p>
              </div>
              <div className="flex gap-3 w-full max-w-sm">
                <button
                  onClick={() => { setSelected([]); setPhase('select'); }}
                  className="flex-1 py-3 rounded-2xl font-bold text-white bg-slate-700 hover:bg-slate-600"
                >
                  🔄 Réessayer
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-3 rounded-2xl font-bold text-slate-400 border border-slate-600"
                >
                  Fermer
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
