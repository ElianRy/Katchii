import { useState, useCallback } from 'react';
import { GameState, RARITY_COLORS } from '../types';
import { POKEMON_BY_ID } from '../data/gen1';
import { ShinySprite } from './ShinySprite';
import { Zone, ZONE_ORDER } from '../data/zones';
import { TeamBuilder, TeamMember } from './TeamBuilder';
import { BattleScreen } from './BattleScreen';
import { calcMaxHp } from '../data/combatEngine';
import { POKEMON_TYPE, TYPE_COLORS } from '../data/pokemonTypes';

interface Props {
  zone: Zone;
  state: GameState;
  onClose: () => void;
  onVictory: (zoneId: string, nextZoneId: string | null) => void;
  onAddXp: (pokemonId: number, xp: number) => void;
}

type Phase = 'intro' | 'select' | 'battle' | 'result';

function getBossLevel(zoneId: string): number {
  const idx = ZONE_ORDER.indexOf(zoneId);
  if (zoneId === 'ligue') return 90;
  if (idx < 0) return 20;
  return Math.min(100, 15 + idx * 10);
}

export function BossFightPanel({ zone, state, onClose, onVictory, onAddXp }: Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [playerTeam, setPlayerTeam] = useState<TeamMember[]>([]);
  const [won, setWon] = useState(false);
  const [xpResults, setXpResults] = useState<Record<number, number>>({});
  const [victoryHandled, setVictoryHandled] = useState(false);

  const boss = zone.boss!;
  const bossLevel = getBossLevel(zone.id);

  const nextZoneId = (() => {
    const idx = ZONE_ORDER.indexOf(zone.id);
    return idx >= 0 && idx < ZONE_ORDER.length - 1 ? ZONE_ORDER[idx + 1] : null;
  })();

  // Build enemy team for BattleScreen
  const enemyTeam: TeamMember[] = boss.team.map(m => {
    const maxHp = calcMaxHp(m.pokemonId, bossLevel);
    return {
      pokemonId: m.pokemonId,
      level: bossLevel,
      xp: 0,
      currentHp: maxHp,
      maxHp,
    };
  });

  const handleTeamConfirm = useCallback((team: TeamMember[]) => {
    setPlayerTeam(team);
    setPhase('battle');
  }, []);

  const handleBattleEnd = useCallback((battleWon: boolean, xpGains: Record<number, number>) => {
    setWon(battleWon);
    setXpResults(xpGains);

    // Apply XP gains
    Object.entries(xpGains).forEach(([idStr, xp]) => {
      onAddXp(Number(idStr), xp);
    });

    if (battleWon && !victoryHandled) {
      setVictoryHandled(true);
      onVictory(zone.id, nextZoneId);
    }

    setPhase('result');
  }, [zone.id, nextZoneId, onVictory, onAddXp, victoryHandled]);

  // INTRO phase
  if (phase === 'intro') {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 shrink-0">
          <div>
            <h2 className="text-white font-black text-xl">⚔️ Combat de Zone</h2>
            <p className="text-slate-400 text-sm">{zone.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl px-2">✕</button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6 overflow-y-auto">
          <div className="text-center">
            <div className="text-6xl mb-3">🏆</div>
            <h3 className="text-white font-black text-2xl">{boss.name}</h3>
            <p className="text-yellow-400 font-bold text-sm mt-1">{boss.title}</p>
          </div>

          {/* Boss team */}
          <div className="bg-slate-800/60 rounded-2xl p-4 border border-red-500/30 w-full max-w-sm">
            <div className="text-slate-400 text-xs text-center mb-3">Équipe du maître — Nv. {bossLevel}</div>
            <div className="flex justify-center gap-4">
              {boss.team.map((m, i) => {
                const p = POKEMON_BY_ID[m.pokemonId];
                const types = POKEMON_TYPE[m.pokemonId] ?? ['normal'];
                return (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <ShinySprite
                      pokemonId={m.pokemonId} isShiny={m.isShiny}
                      width={64} height={64}
                      alt={p?.name ?? '???'}
                      style={{ filter: p ? `drop-shadow(0 0 6px ${RARITY_COLORS[p.rarity]})` : 'none' }}
                    />
                    <span className="text-xs text-slate-300">{p?.name ?? '???'}</span>
                    <span className="text-xs font-bold text-yellow-400">Nv. {bossLevel}</span>
                    <div className="flex gap-0.5">
                      {types.map(t => (
                        <span key={t} className="text-white font-bold rounded px-1" style={{ background: TYPE_COLORS[t] ?? '#888', fontSize: '0.4rem' }}>
                          {t.toUpperCase().slice(0, 4)}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Badge reward */}
          <div className="bg-yellow-900/30 rounded-xl px-5 py-3 border border-yellow-500/40 text-center w-full max-w-sm">
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
      </div>
    );
  }

  // SELECT phase — TeamBuilder full screen
  if (phase === 'select') {
    return (
      <TeamBuilder
        state={state}
        onConfirm={handleTeamConfirm}
        onClose={() => setPhase('intro')}
        title={`Combattre ${boss.name}`}
      />
    );
  }

  // BATTLE phase
  if (phase === 'battle') {
    return (
      <BattleScreen
        playerTeam={playerTeam}
        enemyTeam={enemyTeam}
        bossName={boss.name}
        onBattleEnd={handleBattleEnd}
      />
    );
  }

  // RESULT phase
  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 shrink-0">
        <div>
          <h2 className="text-white font-black text-xl">⚔️ Résultat</h2>
          <p className="text-slate-400 text-sm">{zone.name}</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6 overflow-y-auto">
        {won ? (
          <>
            <div className="text-7xl">🏆</div>
            <div className="text-center">
              <h3 className="text-green-400 font-black text-3xl">Victoire !</h3>
              <p className="text-slate-300 mt-1">Tu as battu <span className="text-yellow-400 font-bold">{boss.name}</span> !</p>
            </div>

            <div className="bg-yellow-900/40 rounded-2xl p-5 border border-yellow-500/50 text-center w-full max-w-sm flex flex-col gap-2">
              <div className="text-yellow-400 font-black text-lg">🥇 {boss.badge} obtenu !</div>
              {nextZoneId && (
                <div className="text-green-400 text-sm font-bold">{boss.reward}</div>
              )}
            </div>

            {/* XP gains */}
            {Object.keys(xpResults).length > 0 && (
              <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-600/40 w-full max-w-sm">
                <div className="text-slate-400 text-xs mb-2 text-center">XP gagnée</div>
                {Object.entries(xpResults).map(([idStr, xp]) => {
                  const p = POKEMON_BY_ID[Number(idStr)];
                  return (
                    <div key={idStr} className="flex justify-between items-center py-1">
                      <span className="text-white text-sm">{p?.name ?? '???'}</span>
                      <span className="text-green-400 font-bold text-sm">+{xp} XP</span>
                    </div>
                  );
                })}
              </div>
            )}

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
            </div>

            {/* XP gains even on loss */}
            {Object.keys(xpResults).length > 0 && (
              <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-600/40 w-full max-w-sm">
                <div className="text-slate-400 text-xs mb-2 text-center">XP gagnée malgré la défaite</div>
                {Object.entries(xpResults).map(([idStr, xp]) => {
                  const p = POKEMON_BY_ID[Number(idStr)];
                  return (
                    <div key={idStr} className="flex justify-between items-center py-1">
                      <span className="text-white text-sm">{p?.name ?? '???'}</span>
                      <span className="text-yellow-400 font-bold text-sm">+{xp} XP</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex gap-3 w-full max-w-sm">
              <button
                onClick={() => { setPhase('select'); setVictoryHandled(false); }}
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
    </div>
  );
}
