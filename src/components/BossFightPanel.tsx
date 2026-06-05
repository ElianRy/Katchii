import React, { useState, useCallback } from 'react';
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

        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-4 overflow-y-auto">
          <div className="text-center">
            <div className="text-5xl mb-1">🏆</div>
            <h3 className="text-white font-black text-xl">{boss.name}</h3>
            <p className="text-yellow-400 font-bold text-xs mt-0.5">{boss.title}</p>
          </div>

          {/* Boss team */}
          <div className="bg-slate-800/60 rounded-2xl p-3 border border-red-500/30 w-full max-w-sm">
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
                      style={{ filter: [p ? `drop-shadow(0 0 6px ${RARITY_COLORS[p.rarity]})` : '', m.isShiny ? 'drop-shadow(0 0 8px #fde047) drop-shadow(0 0 14px #f472b6)' : ''].filter(Boolean).join(' ') || 'none' }}
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
          <div className="bg-yellow-900/30 rounded-xl px-4 py-2 border border-yellow-500/40 text-center w-full max-w-sm">
            <div className="text-yellow-400 text-xs font-bold mb-0.5">Récompense en cas de victoire</div>
            <div className="text-white font-bold text-sm">🥇 {boss.badge}</div>
            <div className="text-slate-400 text-xs">{boss.reward}</div>
          </div>

          <button
            onClick={() => setPhase('select')}
            className="w-full max-w-sm py-3 rounded-2xl font-black text-base text-black"
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
  const CONFETTI = Array.from({ length: 18 }, (_, i) => ({
    color: ['#fbbf24','#f472b6','#60a5fa','#4ade80','#fb923c','#c084fc'][i % 6],
    cx: `${(i * 37 + 11) % 100 - 50}px`,
    cdx: `${((i * 23) % 60) - 30}px`,
    cr: `${(i * 47) % 720 - 360}deg`,
    left: `${(i * 37 + 11) % 100}%`,
    delay: `${(i * 0.07).toFixed(2)}s`,
    dur: `${0.8 + (i % 5) * 0.12}s`,
  }));

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{
      background: won
        ? 'radial-gradient(ellipse at 50% 20%, #1a3a1a 0%, #0a1a0a 60%, #020617 100%)'
        : '#020617',
    }}>
      <div className="flex-1 flex flex-col items-center justify-center gap-5 p-6 overflow-y-auto relative">
        {won ? (
          <>
            {/* Confetti */}
            {CONFETTI.map((c, i) => (
              <div key={i} style={{
                position: 'absolute', top: 0, left: c.left,
                width: 10, height: 10, borderRadius: 2,
                background: c.color,
                '--cx': c.cx, '--cdx': c.cdx, '--cr': c.cr,
                animation: `confetti-fall ${c.dur} ${c.delay} ease-in forwards`,
                pointerEvents: 'none', zIndex: 1,
              } as React.CSSProperties} />
            ))}

            {/* Trophy */}
            <div style={{ fontSize: '5rem', animation: 'victory-trophy 0.7s cubic-bezier(0.175,0.885,0.32,1.275) forwards', zIndex: 2 }}>
              🏆
            </div>

            {/* Title */}
            <div className="text-center" style={{ animation: 'victory-title 0.6s 0.3s ease-out both', zIndex: 2 }}>
              <h3 className="font-black text-4xl" style={{
                background: 'linear-gradient(90deg, #fbbf24, #4ade80, #60a5fa)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                textShadow: 'none',
                filter: 'drop-shadow(0 0 16px #fbbf24)',
              }}>VICTOIRE !</h3>
              <p className="text-slate-300 mt-1 text-sm">
                Tu as battu <span className="text-yellow-400 font-bold">{boss.name}</span> !
              </p>
            </div>

            {/* Badge */}
            <div className="bg-yellow-900/50 rounded-2xl px-6 py-4 border-2 border-yellow-400/60 text-center w-full max-w-sm"
              style={{ animation: 'badge-pop 0.5s 0.65s cubic-bezier(0.175,0.885,0.32,1.275) both', zIndex: 2,
                boxShadow: '0 0 30px rgba(251,191,36,0.3)' }}>
              <div className="text-yellow-300 text-xs font-bold mb-1 tracking-widest uppercase">Badge obtenu</div>
              <div className="text-yellow-400 font-black text-xl">🥇 {boss.badge}</div>
              {nextZoneId && <div className="text-green-400 text-sm mt-1 font-semibold">{boss.reward}</div>}
            </div>

            {/* XP gains */}
            {Object.keys(xpResults).length > 0 && (
              <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-600/40 w-full max-w-sm"
                style={{ animation: 'badge-pop 0.5s 0.85s ease-out both', zIndex: 2 }}>
                <div className="text-slate-400 text-xs mb-1.5 text-center">XP gagnée</div>
                {Object.entries(xpResults).map(([idStr, xp]) => {
                  const p = POKEMON_BY_ID[Number(idStr)];
                  return (
                    <div key={idStr} className="flex justify-between items-center py-0.5">
                      <span className="text-white text-sm">{p?.name ?? '???'}</span>
                      <span className="text-green-400 font-bold text-sm">+{xp} XP</span>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full max-w-sm py-4 rounded-2xl font-black text-lg text-black relative z-10"
              style={{
                background: 'linear-gradient(90deg, #fbbf24, #22c55e)',
                animation: 'badge-pop 0.5s 1.0s ease-out both',
                boxShadow: '0 0 20px rgba(251,191,36,0.4)',
              }}
            >
              ✅ Continuer →
            </button>
          </>
        ) : (
          <>
            <div className="text-7xl" style={{ animation: 'victory-trophy 0.6s cubic-bezier(0.175,0.885,0.32,1.275) forwards' }}>💀</div>
            <div className="text-center" style={{ animation: 'victory-title 0.5s 0.25s ease-out both' }}>
              <h3 className="text-red-400 font-black text-3xl">Défaite…</h3>
              <p className="text-slate-300 mt-1 text-sm">{boss.name} était trop fort !</p>
            </div>

            {Object.keys(xpResults).length > 0 && (
              <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-600/40 w-full max-w-sm"
                style={{ animation: 'badge-pop 0.5s 0.5s ease-out both' }}>
                <div className="text-slate-400 text-xs mb-1.5 text-center">XP gagnée malgré la défaite</div>
                {Object.entries(xpResults).map(([idStr, xp]) => {
                  const p = POKEMON_BY_ID[Number(idStr)];
                  return (
                    <div key={idStr} className="flex justify-between items-center py-0.5">
                      <span className="text-white text-sm">{p?.name ?? '???'}</span>
                      <span className="text-yellow-400 font-bold text-sm">+{xp} XP</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex gap-3 w-full max-w-sm" style={{ animation: 'badge-pop 0.5s 0.65s ease-out both' }}>
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
