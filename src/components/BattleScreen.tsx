import { useState, useEffect, useCallback, useRef } from 'react';
import { RARITY_COLORS } from '../types';
import { POKEMON_BY_ID } from '../data/gen1';
import { ShinySprite } from './ShinySprite';
import { POKEMON_TYPE, TYPE_COLORS, PokemonType } from '../data/pokemonTypes';
import { calcDamage, xpGainedFromBattle } from '../data/combatEngine';
import { TeamMember } from './TeamBuilder';

interface Props {
  playerTeam: TeamMember[];
  enemyTeam: TeamMember[];
  bossName?: string;
  onBattleEnd: (won: boolean, xpGains: Record<number, number>) => void;
}

interface FighterState extends TeamMember { currentHp: number; }
interface LogEntry { text: string; color: string; }

interface AttackEvent {
  attacker: 'player' | 'enemy';
  type: PokemonType;
  uid: number;
}

interface FloatingDmg {
  id: number;
  value: number;
  target: 'player' | 'enemy';
  effectiveness: number;
}

// Precomputed stars
const STARS = Array.from({ length: 40 }, (_, i) => ({
  size: 1 + (i * 0.7) % 2.5,
  top: (i * 37 + 7) % 60,
  left: (i * 53 + 11) % 100,
  opacity: 0.2 + (i * 0.23) % 0.7,
  dur: 1.5 + (i * 0.4) % 2.5,
  del: (i * 0.37) % 2.5,
}));


let dmgCounter = 0;

// ── Type VFX — streams of emojis from the attacker's position toward the target ──────
// ltr = player (bottom-left) attacks enemy (top-right)
// rtl = enemy (top-right) attacks player (bottom-left)
function TypeVfx({ type, direction, uid: _uid }: { type: PokemonType; direction: 'ltr' | 'rtl'; uid: number }) {
  const d = direction;

  // Attacker position: player = bottom-left (left 17%, top 52%), enemy = top-right (left 73%, top 20%)
  const origin: React.CSSProperties = {
    position: 'absolute', pointerEvents: 'none', zIndex: 15,
    left: d === 'ltr' ? '17%' : '73%',
    top:  d === 'ltr' ? '52%' : '20%',
  };

  // Helper: 4-particle stream with increasing size (biggest = front of stream, delay=0)
  // Each particle uses `stream-ltr/rtl` keyframe + CSS --s for scale
  const stream = (emoji: string, glow: string, dur = '0.75s') =>
    [{ s: 2.2, d: '0s' }, { s: 1.6, d: '0.07s' }, { s: 1.2, d: '0.13s' }, { s: 0.85, d: '0.18s' }].map(
      (p, i) => (
        <div key={i} style={{
          position: 'absolute', fontSize: '1rem',
          filter: glow,
          '--s': p.s,
          animation: `stream-${d} ${dur} ${p.d} ease-out forwards`,
        } as React.CSSProperties}>{emoji}</div>
      )
    );

  switch (type) {
    // FIRE: stream of fireballs, biggest at front
    case 'fire': return (
      <div style={origin}>
        {stream('🔥', 'drop-shadow(0 0 8px #f97316)')}
        <div style={{ position: 'absolute', width: 48, height: 48, top: -24, left: -24, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(253,115,0,0.6) 0%, transparent 70%)',
          animation: `stream-${d} 0.3s ease-out forwards`, '--s': 0.5 } as React.CSSProperties} />
      </div>
    );

    // WATER: stream of water drops arcing toward target
    case 'water': return (
      <div style={origin}>
        {stream('💧', 'drop-shadow(0 0 8px #38bdf8)', '0.8s')}
        <div style={{ position: 'absolute', fontSize: '1rem', '--s': 2.5,
          animation: `stream-${d} 0.72s ease-out forwards`, filter: 'drop-shadow(0 0 10px #0ea5e9)' } as React.CSSProperties}>🌊</div>
      </div>
    );

    // ELECTRIC: SVG bolt extending from attacker, then ⚡ stream
    case 'electric': return (
      <div style={{ ...origin, overflow: 'visible' }}>
        <svg width={d === 'ltr' ? 220 : 220} height="50" style={{
          position: 'absolute', top: -25, left: d === 'ltr' ? 0 : -220,
          transform: d === 'rtl' ? 'scaleX(-1)' : undefined, overflow: 'visible',
        }}>
          <polyline points="0,25 40,8 68,38 100,4 132,32 162,10 190,27 220,20"
            fill="none" stroke="#fbbf24" strokeWidth="6" strokeLinecap="round"
            strokeDasharray="320" strokeDashoffset="0"
            style={{ filter: 'blur(4px)', animation: 'bolt-extend 0.35s ease-out forwards', opacity: 0.9 }} />
          <polyline points="0,25 40,8 68,38 100,4 132,32 162,10 190,27 220,20"
            fill="none" stroke="#fef08a" strokeWidth="2.5" strokeLinecap="round"
            strokeDasharray="320" strokeDashoffset="0"
            style={{ filter: 'drop-shadow(0 0 5px #fbbf24)', animation: 'bolt-extend 0.32s ease-out forwards' }} />
        </svg>
        {stream('⚡', 'drop-shadow(0 0 6px #fbbf24)', '0.55s')}
      </div>
    );

    // GRASS: leaves rise from below attacker then stream toward target
    case 'grass': return (
      <div style={{ ...origin, top: d === 'ltr' ? '68%' : '35%' }}>
        {[{ s: 2.2, d2: '0s' }, { s: 1.6, d2: '0.07s' }, { s: 1.2, d2: '0.13s' }, { s: 0.85, d2: '0.18s' }].map(
          (p, i) => (
            <div key={i} style={{
              position: 'absolute', fontSize: '1rem',
              filter: 'drop-shadow(0 0 6px #22c55e)',
              '--s': p.s,
              animation: `grass-up-${d} 0.85s ${p.d2} ease-out forwards`,
            } as React.CSSProperties}>{['🌿','🍃','🌱','🍃'][i]}</div>
          )
        )}
      </div>
    );

    // ICE: spinning ice shards stream toward target
    case 'ice': return (
      <div style={origin}>
        {stream('❄️', 'drop-shadow(0 0 8px #7dd3fc)', '0.7s')}
        <div style={{ position: 'absolute', fontSize: '1rem', '--s': 1.8,
          animation: `stream-${d} 0.65s 0.04s ease-out forwards`, filter: 'drop-shadow(0 0 8px #a5f3fc)' } as React.CSSProperties}>🔷</div>
      </div>
    );

    // PSYCHIC: concentric rings shoot from attacker to target
    case 'psychic': return (
      <div style={origin}>
        {[{ sz: 60, del: '0s', op: 0.9 }, { sz: 90, del: '0.1s', op: 0.65 }, { sz: 120, del: '0.2s', op: 0.4 }].map((p, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: p.sz, height: p.sz, top: -(p.sz / 2), left: -(p.sz / 2),
            border: `2.5px solid rgba(244,114,182,${p.op})`,
            borderRadius: '50%',
            boxShadow: '0 0 14px #f472b6',
            animation: `psyring-${d} 0.75s ${p.del} ease-out forwards`,
          }} />
        ))}
        <div style={{ position: 'absolute', fontSize: '1.5rem', top: -12, left: -12,
          animation: `stream-${d} 0.75s ease-out forwards`, '--s': 1.5,
          filter: 'drop-shadow(0 0 12px #e879f9)' } as React.CSSProperties}>🔮</div>
      </div>
    );

    // FIGHTING: fist stream punches toward target, burst at impact
    case 'fighting': return (
      <div style={origin}>
        {stream('👊', 'drop-shadow(0 0 6px #ef4444)', '0.5s')}
        <div style={{ position: 'absolute', fontSize: '1rem', '--s': 2.5,
          animation: `stream-${d} 0.48s 0.02s ease-out forwards`, filter: 'drop-shadow(0 0 8px #ef4444)' } as React.CSSProperties}>💥</div>
      </div>
    );

    // GHOST: slow wavy ghost drifts from attacker to target
    case 'ghost': return (
      <div style={origin}>
        <div style={{ position: 'absolute', fontSize: '2.5rem', top: -20, left: -12,
          filter: 'drop-shadow(0 0 16px #7c3aed) blur(1px)', opacity: 0.8,
          animation: `ghost-${d} 1.0s ease-in-out forwards` }}>👻</div>
        <div style={{ position: 'absolute', fontSize: '0.9rem', top: -10, left: -4, opacity: 0.5,
          filter: 'blur(0.5px)',
          animation: `ghost-${d} 1.0s 0.12s ease-in-out forwards` }}>💀</div>
      </div>
    );

    // POISON: stream of poison orbs toward target
    case 'poison': return (
      <div style={origin}>
        {stream('🟣', 'drop-shadow(0 0 8px #a855f7)', '0.7s')}
        <div style={{ position: 'absolute', fontSize: '1rem', '--s': 2,
          animation: `stream-${d} 0.68s 0.03s ease-out forwards`, filter: 'drop-shadow(0 0 10px #7e22ce)' } as React.CSSProperties}>☠️</div>
      </div>
    );

    // GROUND: rocks thrown in arc toward target
    case 'ground': return (
      <div style={origin}>
        {stream('🪨', '', '0.7s')}
        <div style={{ position: 'absolute', fontSize: '1rem', '--s': 2,
          animation: `stream-${d} 0.65s 0.03s ease-out forwards` } as React.CSSProperties}>💥</div>
      </div>
    );

    // FLYING: wind gusts stream across
    case 'flying': return (
      <div style={origin}>
        {stream('💨', 'drop-shadow(0 0 6px #c4b5fd)', '0.6s')}
        <div style={{ position: 'absolute', fontSize: '1rem', '--s': 2.2,
          animation: `stream-${d} 0.55s ease-out forwards`, filter: 'drop-shadow(0 0 8px #a78bfa)' } as React.CSSProperties}>🌪️</div>
      </div>
    );

    // DRAGON: large dragon sweeps from attacker side
    case 'dragon': return (
      <div style={{ ...origin, top: d === 'ltr' ? '45%' : '25%' }}>
        <div style={{ position: 'absolute', fontSize: '2.8rem', top: -22, left: -14,
          filter: 'drop-shadow(0 0 14px #4f46e5) drop-shadow(0 0 24px #818cf8)',
          transform: d === 'rtl' ? 'scaleX(-1)' : undefined,
          animation: `stream-${d} 0.85s ease-in-out forwards`, '--s': 1.2 } as React.CSSProperties}>🐉</div>
        {stream('✨', 'drop-shadow(0 0 6px #818cf8)', '0.8s')}
      </div>
    );

    // ROCK: rocks stream toward target
    case 'rock': return (
      <div style={origin}>
        {stream('🪨', 'drop-shadow(0 0 4px #a8a29e)', '0.6s')}
        <div style={{ position: 'absolute', fontSize: '1rem', '--s': 2,
          animation: `stream-${d} 0.58s ease-out forwards` } as React.CSSProperties}>💥</div>
      </div>
    );

    // BUG: bug swarm streams toward target
    case 'bug': return (
      <div style={origin}>
        {stream('🐛', 'drop-shadow(0 0 5px #84cc16)', '0.65s')}
        <div style={{ position: 'absolute', fontSize: '1rem', '--s': 1.8,
          animation: `stream-${d} 0.6s 0.04s ease-out forwards`, filter: 'drop-shadow(0 0 6px #a3e635)' } as React.CSSProperties}>🍃</div>
      </div>
    );

    default: // normal
      return (
        <div style={origin}>
          {stream('⭐', 'drop-shadow(0 0 6px #fde047)', '0.65s')}
          <div style={{ position: 'absolute', fontSize: '1rem', '--s': 2.2,
            animation: `stream-${d} 0.6s 0.02s ease-out forwards`, filter: 'drop-shadow(0 0 8px #fbbf24)' } as React.CSSProperties}>💥</div>
        </div>
      );
  }
}

// ── Main component ───────────────────────────────────────────────────────
export function BattleScreen({ playerTeam, enemyTeam, bossName: _bossName, onBattleEnd }: Props) {
  const [playerFighters, setPlayerFighters] = useState<FighterState[]>(
    playerTeam.map(m => ({ ...m, currentHp: m.maxHp }))
  );
  const [enemyFighters, setEnemyFighters] = useState<FighterState[]>(
    enemyTeam.map(m => ({ ...m, currentHp: m.maxHp }))
  );
  const [playerIdx, setPlayerIdx] = useState(0);
  const [enemyIdx, setEnemyIdx] = useState(0);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [phase, setPhase] = useState<'battle' | 'switch' | 'end'>('battle');
  const [attackEvt, setAttackEvt] = useState<AttackEvent | null>(null);
  const [floatingDmg, setFloatingDmg] = useState<FloatingDmg[]>([]);
  const [xpGains, setXpGains] = useState<Record<number, number>>({});
  const [hitFlash, setHitFlash] = useState<'player' | 'enemy' | null>(null);
  const [speedX2, setSpeedX2] = useState(false);
  const won = useRef(false);
  const battleDone = useRef(false);
  const paused = useRef(false); // paused while player chooses switch

  const addLog = useCallback((text: string, color = '#e2e8f0') => {
    setLog(prev => [...prev.slice(-5), { text, color }]);
  }, []);

  const addDmg = useCallback((value: number, target: 'player' | 'enemy', effectiveness: number) => {
    const id = dmgCounter++;
    setFloatingDmg(prev => [...prev, { id, value, target, effectiveness }]);
    setTimeout(() => setFloatingDmg(prev => prev.filter(d => d.id !== id)), 1100);
  }, []);

  useEffect(() => {
    if (battleDone.current) return;

    const runTurn = () => {
      if (battleDone.current || paused.current) return;

      setPlayerFighters(pf => {
        setEnemyFighters(ef => {
          const pFighter = pf[playerIdx];
          const eFighter = ef[enemyIdx];
          if (!pFighter || !eFighter || pFighter.currentHp <= 0 || eFighter.currentHp <= 0) return ef;

          const pName = POKEMON_BY_ID[pFighter.pokemonId]?.name ?? '???';
          const eName = POKEMON_BY_ID[eFighter.pokemonId]?.name ?? '???';
          const pType = (POKEMON_TYPE[pFighter.pokemonId] ?? ['normal'])[0] as PokemonType;
          const eType = (POKEMON_TYPE[eFighter.pokemonId] ?? ['normal'])[0] as PokemonType;

          const { damage: pDmg, effectiveness: pEff, moveName: pMove } = calcDamage(
            pFighter.pokemonId, pFighter.level, eFighter.pokemonId, eFighter.level
          );

          setAttackEvt({ attacker: 'player', type: pType, uid: dmgCounter++ });
          setTimeout(() => setHitFlash('enemy'), 350);
          setTimeout(() => setHitFlash(null), 600);
          setTimeout(() => setAttackEvt(null), 700);
          addDmg(pDmg, 'enemy', pEff);
          addLog(`${pName} → ${pMove}${pEff >= 2 ? ' 💥 Super efficace !' : pEff === 0 ? ' (sans effet)' : pEff < 1 ? ' (peu efficace)' : ''}`,
            pEff >= 2 ? '#4ade80' : '#fde68a');

          const newEHp = Math.max(0, eFighter.currentHp - pDmg);
          const newEf = ef.map((f, i) => i === enemyIdx ? { ...f, currentHp: newEHp } : f);

          if (newEHp <= 0) {
            addLog(`${eName} est K.O. !`, '#f87171');
            const xpEarned = xpGainedFromBattle(eFighter.level, true);
            setXpGains(prev => ({ ...prev, [pFighter.pokemonId]: (prev[pFighter.pokemonId] ?? 0) + xpEarned }));
            const nextE = newEf.findIndex((f, i) => i > enemyIdx && f.currentHp > 0);
            if (nextE < 0 && newEf.every(f => f.currentHp <= 0)) {
              battleDone.current = true; won.current = true; setPhase('end');
            } else if (nextE >= 0) setTimeout(() => setEnemyIdx(nextE), 600);
            return newEf;
          }

          // Enemy counter
          setTimeout(() => {
            if (battleDone.current || paused.current) return;
            setAttackEvt({ attacker: 'enemy', type: eType, uid: dmgCounter++ });
            setTimeout(() => setHitFlash('player'), 350);
            setTimeout(() => setHitFlash(null), 600);
            setTimeout(() => setAttackEvt(null), 700);

            const { damage: eDmg, effectiveness: eEff, moveName: eMove } = calcDamage(
              eFighter.pokemonId, eFighter.level, pFighter.pokemonId, pFighter.level
            );
            addDmg(eDmg, 'player', eEff);
            addLog(`${eName} → ${eMove}${eEff >= 2 ? ' 💥 Super efficace !' : ''}`, eEff >= 2 ? '#f87171' : '#fca5a5');

            setPlayerFighters(pf2 => {
              const newPHp = Math.max(0, pf2[playerIdx].currentHp - eDmg);
              const newPf = pf2.map((f, i) => i === playerIdx ? { ...f, currentHp: newPHp } : f);
              if (newPHp <= 0) {
                addLog(`${pName} est K.O. !`, '#f87171');
                const nextP = newPf.findIndex((f, i) => i > playerIdx && f.currentHp > 0);
                if (nextP < 0 && newPf.every(f => f.currentHp <= 0)) {
                  battleDone.current = true; won.current = false; setPhase('end');
                } else {
                  // Ask player to choose next pokemon
                  paused.current = true;
                  setPhase('switch');
                }
              }
              return newPf;
            });
          }, (speedX2 ? 800 : 1600) / 2);

          return newEf;
        });
        return pf;
      });
    };

    if (phase !== 'battle' || battleDone.current) return;
    const intervalMs = speedX2 ? 800 : 1600;
    const timer = setInterval(() => {
      if (battleDone.current) { clearInterval(timer); return; }
      runTurn();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [playerIdx, enemyIdx, phase, addLog, addDmg, speedX2]);

  useEffect(() => {
    if (phase === 'end') {
      const snap = { ...xpGains };
      const wonSnap = won.current;
      setTimeout(() => onBattleEnd(wonSnap, snap), 1800);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const handleSwitch = useCallback((idx: number) => {
    setPlayerIdx(idx);
    paused.current = false;
    setPhase('battle');
    const name = POKEMON_BY_ID[playerFighters[idx]?.pokemonId]?.name ?? '???';
    addLog(`Allez ${name} !`, '#4ade80');
  }, [playerFighters, addLog]);

  const activePF = playerFighters[playerIdx];
  const activeEF = enemyFighters[enemyIdx];
  const hpColor = (pct: number) => pct > 0.5 ? '#22c55e' : pct > 0.25 ? '#f59e0b' : '#ef4444';

  return (
    <div className="fixed inset-0 z-[400] flex flex-col" style={{ background: '#020617' }}>

      {/* ── Arena ── */}
      <div className="relative flex-1 overflow-hidden">

        {/* Sky */}
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at 50% 20%, #1e1b4b 0%, #0f0720 55%, #020617 100%)',
        }} />
        {STARS.map((s, i) => (
          <div key={i} className="absolute rounded-full bg-white pointer-events-none" style={{
            width: s.size, height: s.size,
            top: `${s.top}%`, left: `${s.left}%`,
            opacity: s.opacity,
            animation: `arena-twinkle ${s.dur}s ease-in-out ${s.del}s infinite`,
          }} />
        ))}

        {/* Stadium arc */}
        <div className="absolute inset-x-0 top-0 pointer-events-none" style={{
          height: '55%',
          background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.07) 0%, transparent 70%)',
        }} />

        {/* Arena floor */}
        <div className="absolute bottom-0 inset-x-0 pointer-events-none" style={{
          height: '38%',
          background: 'linear-gradient(to top, rgba(30,27,75,0.85) 0%, transparent 100%)',
        }} />

        {/* Center divider */}
        <div className="absolute inset-y-0 pointer-events-none" style={{
          left: '50%', width: 1,
          background: 'linear-gradient(to bottom, transparent, rgba(148,163,184,0.12), transparent)',
        }} />

        {/* Platform enemy */}
        <div className="absolute pointer-events-none" style={{
          top: '38%', right: '12%', width: 110, height: 22,
          background: 'radial-gradient(ellipse, rgba(248,113,113,0.55) 0%, transparent 100%)',
          borderRadius: '50%', filter: 'blur(5px)',
          animation: 'platform-pulse 2.2s ease-in-out infinite',
        }} />

        {/* Platform player */}
        <div className="absolute pointer-events-none" style={{
          bottom: '28%', left: '12%', width: 110, height: 22,
          background: 'radial-gradient(ellipse, rgba(74,222,128,0.55) 0%, transparent 100%)',
          borderRadius: '50%', filter: 'blur(5px)',
          animation: 'platform-pulse 2.2s ease-in-out 0.4s infinite',
        }} />

        {/* Attack VFX */}
        {attackEvt && (
          <TypeVfx key={attackEvt.uid} type={attackEvt.type}
            direction={attackEvt.attacker === 'player' ? 'ltr' : 'rtl'}
            uid={attackEvt.uid} />
        )}

        {/* Hit flash */}
        {hitFlash && (
          <div className="absolute inset-0 pointer-events-none battle-hit-flash" style={{
            background: hitFlash === 'player' ? 'rgba(239,68,68,0.2)' : 'rgba(250,204,21,0.13)',
          }} />
        )}

        {/* Floating damage */}
        {floatingDmg.map(d => {
          const color = d.effectiveness >= 2 ? '#4ade80' : d.effectiveness === 0 ? '#94a3b8' : d.effectiveness < 1 ? '#fb923c' : '#fde047';
          const pos = d.target === 'enemy'
            ? { top: '22%', right: '14%' }
            : { bottom: '26%', left: '20%' };
          return (
            <div key={d.id} className="absolute pointer-events-none" style={{
              ...pos, zIndex: 20,
              fontSize: d.effectiveness >= 2 ? '1.6rem' : '1.2rem',
              fontWeight: 900, color,
              textShadow: `0 0 12px ${color}`,
              animation: 'dmg-float 1.1s ease-out forwards',
              transform: 'translateX(-50%)',
            }}>
              -{d.value}
              {d.effectiveness >= 2 && <div style={{ fontSize: '0.55rem', textAlign: 'center' }}>SUPER EFFICACE</div>}
            </div>
          );
        })}

        {/* Enemy info + sprite */}
        <div className="absolute" style={{ top: '5%', right: '7%' }}>
          <div className="bg-black/75 rounded-xl px-3 py-2 border border-slate-600/50 mb-2 min-w-[140px]">
            <div className="flex justify-between items-center mb-1">
              <span className="text-white font-black text-sm">{POKEMON_BY_ID[activeEF?.pokemonId ?? 0]?.name ?? '???'}</span>
              <span className="text-slate-400 text-xs">Nv.{activeEF?.level}</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2.5">
              <div className="h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${activeEF ? (activeEF.currentHp / activeEF.maxHp) * 100 : 0}%`, background: hpColor(activeEF ? activeEF.currentHp / activeEF.maxHp : 0) }} />
            </div>
            <div className="text-right text-xs text-slate-400 mt-0.5">{activeEF?.currentHp}/{activeEF?.maxHp}</div>
            <div className="flex gap-1 mt-1">
              {(POKEMON_TYPE[activeEF?.pokemonId ?? 0] ?? []).map(t => (
                <span key={t} className="text-white font-bold rounded px-1" style={{ background: TYPE_COLORS[t as PokemonType] ?? '#888', fontSize: '0.42rem' }}>
                  {t.toUpperCase()}
                </span>
              ))}
            </div>
          </div>
          <div className={`flex justify-end ${attackEvt?.attacker === 'enemy' ? 'battle-lunge-left' : ''} ${activeEF?.currentHp === 0 ? 'opacity-30' : ''}`}>
            {activeEF && <ShinySprite pokemonId={activeEF.pokemonId} isShiny={activeEF.isShiny ?? false} width={88} height={88}
              style={{ filter: `drop-shadow(0 0 10px ${RARITY_COLORS[POKEMON_BY_ID[activeEF.pokemonId]?.rarity ?? 'commun']})`, transform: 'scaleX(-1)' }} />}
          </div>
          <div className="flex gap-1.5 justify-end mt-1">
            {enemyFighters.map((f, i) => (
              <div key={i} className={`w-3 h-3 rounded-full ${i === enemyIdx ? 'ring-2 ring-white' : ''} ${f.currentHp > 0 ? 'bg-red-400' : 'bg-slate-600'}`} />
            ))}
          </div>
        </div>

        {/* Player info + sprite */}
        <div className="absolute" style={{ bottom: '13%', left: '7%' }}>
          <div className="flex gap-1.5 mb-1">
            {playerFighters.map((f, i) => (
              <div key={i} className={`w-3 h-3 rounded-full ${i === playerIdx ? 'ring-2 ring-white' : ''} ${f.currentHp > 0 ? 'bg-green-400' : 'bg-slate-600'}`} />
            ))}
          </div>
          <div className={`${attackEvt?.attacker === 'player' ? 'battle-lunge-right' : ''} ${activePF?.currentHp === 0 ? 'opacity-30' : ''}`}>
            {activePF && <ShinySprite pokemonId={activePF.pokemonId} isShiny={activePF.isShiny ?? false} width={96} height={96}
              style={{ filter: `drop-shadow(0 0 10px ${RARITY_COLORS[POKEMON_BY_ID[activePF.pokemonId]?.rarity ?? 'commun']})` }} />}
          </div>
          <div className="bg-black/75 rounded-xl px-3 py-2 border border-slate-600/50 mt-2 min-w-[140px]">
            <div className="flex justify-between items-center mb-1">
              <span className="text-white font-black text-sm">{POKEMON_BY_ID[activePF?.pokemonId ?? 0]?.name ?? '???'}</span>
              <span className="text-slate-400 text-xs">Nv.{activePF?.level}</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2.5">
              <div className="h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${activePF ? (activePF.currentHp / activePF.maxHp) * 100 : 0}%`, background: hpColor(activePF ? activePF.currentHp / activePF.maxHp : 0) }} />
            </div>
            <div className="text-right text-xs text-slate-400 mt-0.5">{activePF?.currentHp}/{activePF?.maxHp}</div>
            <div className="flex gap-1 mt-1">
              {(POKEMON_TYPE[activePF?.pokemonId ?? 0] ?? []).map(t => (
                <span key={t} className="text-white font-bold rounded px-1" style={{ background: TYPE_COLORS[t as PokemonType] ?? '#888', fontSize: '0.42rem' }}>
                  {t.toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* VS / End banner */}
        <div className="absolute inset-x-0 top-1/2 flex justify-center pointer-events-none" style={{ transform: 'translateY(-50%)' }}>
          {phase === 'end' ? (
            <div className={`font-black text-4xl drop-shadow-lg ${won.current ? 'text-yellow-400' : 'text-red-400'}`}
              style={{ textShadow: won.current ? '0 0 20px #fbbf24' : '0 0 20px #ef4444' }}>
              {won.current ? '🏆 VICTOIRE !' : '💀 DÉFAITE !'}
            </div>
          ) : (
            <div className="text-slate-500/30 font-black text-6xl">VS</div>
          )}
        </div>

        {/* ── Switch overlay ── */}
        {phase === 'switch' && (
          <div className="absolute inset-0 z-30 bg-black/80 flex flex-col items-center justify-center gap-4 px-6">
            <div className="text-white font-black text-xl text-center">
              Choisissez votre prochain Pokémon !
            </div>
            <div className="flex gap-3 flex-wrap justify-center">
              {playerFighters.map((f, i) => {
                if (f.currentHp <= 0 || i === playerIdx) return null;
                const p = POKEMON_BY_ID[f.pokemonId];
                const hpPct = f.currentHp / f.maxHp;
                return (
                  <button
                    key={i}
                    onClick={() => handleSwitch(i)}
                    className="flex flex-col items-center bg-slate-800/90 border-2 border-slate-500 hover:border-yellow-400 rounded-2xl px-4 py-3 transition-all hover:scale-105"
                  >
                    <ShinySprite pokemonId={f.pokemonId} isShiny={f.isShiny ?? false} width={64} height={64}
                      style={{ filter: `drop-shadow(0 0 6px ${RARITY_COLORS[p?.rarity ?? 'commun']})` }} />
                    <span className="text-white font-bold text-sm mt-1">{p?.name}</span>
                    <span className="text-slate-400 text-xs">Nv.{f.level}</span>
                    <div className="w-16 bg-slate-700 rounded-full h-2 mt-1">
                      <div className="h-2 rounded-full" style={{ width: `${hpPct * 100}%`, background: hpColor(hpPct) }} />
                    </div>
                    <span className="text-xs mt-0.5" style={{ color: hpColor(hpPct) }}>{f.currentHp}/{f.maxHp}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Battle log */}
      <div className="shrink-0 bg-black/90 border-t border-slate-700/50 px-4 py-2" style={{ minHeight: 80 }}>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {log.slice(-3).map((entry, i) => (
              <div key={i} className="text-xs font-medium" style={{ color: entry.color, opacity: 0.4 + i * 0.3 }}>
                {entry.text}
              </div>
            ))}
          </div>
          {phase === 'battle' && (
            <button
              onClick={() => setSpeedX2(v => !v)}
              className="ml-3 px-3 py-1.5 rounded-xl font-black text-sm border transition-all shrink-0"
              style={{
                background: speedX2 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : '#1e293b',
                border: speedX2 ? '2px solid #f59e0b' : '2px solid #475569',
                color: speedX2 ? '#000' : '#94a3b8',
              }}
            >
              {speedX2 ? '⚡ x2' : '▶ x1'}
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
