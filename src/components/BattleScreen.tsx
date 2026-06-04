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

const TURN_DELAY_MS = 1600;
let dmgCounter = 0;

// ── Type attack animation components ──────────────────────────────────────
function TypeVfx({ type, direction, uid }: { type: PokemonType; direction: 'ltr' | 'rtl'; uid: number }) {
  // direction: ltr = player attacks (left→right), rtl = enemy attacks (right→left)
  const flip = direction === 'rtl';

  const common: React.CSSProperties = {
    position: 'absolute',
    pointerEvents: 'none',
    zIndex: 15,
    // start near attacker, travel toward target
    top: '42%',
    left: flip ? '68%' : '22%',
    transformOrigin: 'center',
  };

  const particles = (count: number, render: (i: number) => React.ReactNode) =>
    Array.from({ length: count }, (_, i) => render(i));

  switch (type) {
    case 'fire': return (
      <div key={uid} style={common}>
        {particles(6, i => (
          <div key={i} style={{
            position: 'absolute',
            fontSize: i < 3 ? '1.8rem' : '1.1rem',
            top: `${(i - 3) * 18}px`,
            animation: `p-${flip ? 'rtl' : 'ltr'}-${i % 5} 0.7s ${i * 0.07}s ease-out forwards`,
            filter: 'drop-shadow(0 0 6px #f97316)',
          }}>🔥</div>
        ))}
        {/* Heat wave */}
        <div style={{
          position: 'absolute', top: '-20px',
          width: 60, height: 60,
          background: 'radial-gradient(circle, rgba(251,146,60,0.6) 0%, transparent 70%)',
          borderRadius: '50%',
          animation: `p-${flip ? 'rtl' : 'ltr'}-0 0.65s ease-out forwards`,
        }} />
      </div>
    );

    case 'water': return (
      <div key={uid} style={common}>
        {particles(5, i => (
          <div key={i} style={{
            position: 'absolute',
            fontSize: i === 0 ? '2rem' : '1.2rem',
            top: `${(i - 2) * 16}px`,
            animation: `p-${flip ? 'rtl' : 'ltr'}-${i} 0.75s ${i * 0.06}s ease-out forwards`,
            filter: 'drop-shadow(0 0 8px #60a5fa)',
          }}>{i === 0 ? '🌊' : '💧'}</div>
        ))}
      </div>
    );

    case 'electric': return (
      <div key={uid} style={common}>
        {/* Zigzag lightning SVG */}
        <svg key={uid + '-svg'} width="220" height="60"
          style={{ position: 'absolute', top: -30, left: flip ? -220 : 0, transform: flip ? 'scaleX(-1)' : undefined,
            animation: `p-ltr-0 0.45s ease-out forwards`, opacity: 0.95 }}>
          <polyline points="0,30 40,10 70,40 100,5 130,35 160,12 190,30 220,20"
            fill="none" stroke="#fbbf24" strokeWidth="3.5"
            style={{ filter: 'drop-shadow(0 0 8px #fbbf24)' }} />
          <polyline points="0,32 40,12 70,42 100,7 130,37 160,14 190,32 220,22"
            fill="none" stroke="white" strokeWidth="1.5" opacity={0.7} />
        </svg>
        {particles(4, i => (
          <div key={i} style={{
            position: 'absolute', fontSize: '1rem',
            top: `${(i - 2) * 22}px`,
            animation: `p-${flip ? 'rtl' : 'ltr'}-${i} 0.5s ${i * 0.08}s ease-out forwards`,
          }}>⚡</div>
        ))}
      </div>
    );

    case 'grass': return (
      <div key={uid} style={common}>
        {/* Growing tree/vine effect */}
        {particles(5, i => (
          <div key={i} style={{
            position: 'absolute',
            fontSize: i < 2 ? '1.6rem' : '1rem',
            top: `${(i - 2) * 18}px`,
            animation: `p-${flip ? 'rtl' : 'ltr'}-${i} 0.8s ${i * 0.08}s ease-out forwards`,
            filter: 'drop-shadow(0 0 6px #4ade80)',
          }}>{i < 2 ? '🌿' : i === 2 ? '🌱' : '🍃'}</div>
        ))}
        <div style={{
          position: 'absolute', top: '-15px',
          fontSize: '2.2rem',
          animation: `p-${flip ? 'rtl' : 'ltr'}-2 0.8s ease-out forwards`,
          filter: 'drop-shadow(0 0 8px #22c55e)',
        }}>🌳</div>
      </div>
    );

    case 'ice': return (
      <div key={uid} style={common}>
        {particles(6, i => (
          <div key={i} style={{
            position: 'absolute',
            fontSize: i < 2 ? '1.5rem' : '1rem',
            top: `${(i - 3) * 15}px`,
            animation: `p-${flip ? 'rtl' : 'ltr'}-${i % 5} 0.7s ${i * 0.07}s ease-out forwards`,
            filter: 'drop-shadow(0 0 6px #a5f3fc)',
          }}>{i < 3 ? '❄️' : '🔷'}</div>
        ))}
      </div>
    );

    case 'psychic': return (
      <div key={uid} style={common}>
        {/* Spinning rings */}
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            position: 'absolute',
            width: 50 + i * 20, height: 50 + i * 20,
            top: -(25 + i * 10), left: -(25 + i * 10),
            border: `2px solid rgba(244,114,182,${0.8 - i * 0.2})`,
            borderRadius: '50%',
            animation: `p-${flip ? 'rtl' : 'ltr'}-${i} 0.8s ${i * 0.1}s ease-out forwards`,
            boxShadow: '0 0 10px #f472b6',
          }} />
        ))}
        <div style={{
          position: 'absolute', fontSize: '1.8rem',
          animation: `p-${flip ? 'rtl' : 'ltr'}-0 0.8s ease-out forwards`,
        }}>🔮</div>
      </div>
    );

    case 'fighting': return (
      <div key={uid} style={common}>
        {/* Impact burst */}
        {particles(5, i => (
          <div key={i} style={{
            position: 'absolute',
            fontSize: i < 2 ? '2rem' : '1.2rem',
            top: `${(i - 2) * 20}px`,
            animation: `p-${flip ? 'rtl' : 'ltr'}-${i} 0.5s ${i * 0.06}s ease-out forwards`,
            filter: 'drop-shadow(0 0 4px #ef4444)',
          }}>{i === 0 ? '💥' : i === 1 ? '⭐' : '💢'}</div>
        ))}
      </div>
    );

    case 'ghost': return (
      <div key={uid} style={common}>
        <div style={{
          position: 'absolute', fontSize: '3rem',
          top: '-30px',
          opacity: 0.55,
          animation: `p-${flip ? 'rtl' : 'ltr'}-0 0.9s ease-in-out forwards`,
          filter: 'drop-shadow(0 0 12px #7c3aed) blur(1px)',
        }}>👻</div>
        {particles(3, i => (
          <div key={i} style={{
            position: 'absolute', fontSize: '1rem',
            top: `${(i - 1) * 25}px`,
            opacity: 0.6,
            animation: `p-${flip ? 'rtl' : 'ltr'}-${i + 1} 0.85s ${i * 0.12}s ease-out forwards`,
            filter: 'blur(0.5px)',
          }}>💀</div>
        ))}
      </div>
    );

    case 'poison': return (
      <div key={uid} style={common}>
        {particles(5, i => (
          <div key={i} style={{
            position: 'absolute', fontSize: i < 2 ? '1.6rem' : '1.1rem',
            top: `${(i - 2) * 18}px`,
            animation: `p-${flip ? 'rtl' : 'ltr'}-${i} 0.7s ${i * 0.07}s ease-out forwards`,
            filter: 'drop-shadow(0 0 6px #a855f7)',
          }}>{i < 2 ? '💜' : '🟣'}</div>
        ))}
      </div>
    );

    case 'ground': return (
      <div key={uid} style={common}>
        {particles(5, i => (
          <div key={i} style={{
            position: 'absolute', fontSize: i < 2 ? '1.8rem' : '1.2rem',
            top: `${(i - 2) * 16}px`,
            animation: `p-${flip ? 'rtl' : 'ltr'}-${i} 0.65s ${i * 0.08}s ease-out forwards`,
          }}>{i < 3 ? '🪨' : '💥'}</div>
        ))}
      </div>
    );

    case 'flying': return (
      <div key={uid} style={common}>
        {particles(5, i => (
          <div key={i} style={{
            position: 'absolute', fontSize: i === 0 ? '2rem' : '1.2rem',
            top: `${(i - 2) * 18}px`,
            animation: `p-${flip ? 'rtl' : 'ltr'}-${i} 0.65s ${i * 0.07}s ease-out forwards`,
            filter: 'drop-shadow(0 0 5px #a78bfa)',
          }}>{i === 0 ? '🌪️' : i < 3 ? '🍃' : '💨'}</div>
        ))}
      </div>
    );

    case 'dragon': return (
      <div key={uid} style={common}>
        <div style={{
          position: 'absolute', fontSize: '2.5rem',
          top: '-25px',
          animation: `p-${flip ? 'rtl' : 'ltr'}-0 0.8s ease-out forwards`,
          filter: 'drop-shadow(0 0 10px #4f46e5)',
        }}>🐉</div>
        {particles(3, i => (
          <div key={i} style={{
            position: 'absolute', fontSize: '1.2rem',
            top: `${(i - 1) * 24}px`,
            animation: `p-${flip ? 'rtl' : 'ltr'}-${i + 1} 0.7s ${i * 0.1}s ease-out forwards`,
            filter: 'drop-shadow(0 0 8px #818cf8)',
          }}>✨</div>
        ))}
      </div>
    );

    case 'rock': return (
      <div key={uid} style={common}>
        {particles(5, i => (
          <div key={i} style={{
            position: 'absolute', fontSize: i < 2 ? '1.7rem' : '1.1rem',
            top: `${(i - 2) * 17}px`,
            animation: `p-${flip ? 'rtl' : 'ltr'}-${i} 0.6s ${i * 0.07}s ease-out forwards`,
          }}>{i < 3 ? '🪨' : '💥'}</div>
        ))}
      </div>
    );

    case 'bug': return (
      <div key={uid} style={common}>
        {particles(5, i => (
          <div key={i} style={{
            position: 'absolute', fontSize: '1.2rem',
            top: `${(i - 2) * 18}px`,
            animation: `p-${flip ? 'rtl' : 'ltr'}-${i} 0.7s ${i * 0.07}s ease-out forwards`,
            filter: 'drop-shadow(0 0 4px #84cc16)',
          }}>{i < 2 ? '🍃' : i === 2 ? '🐛' : '⚡'}</div>
        ))}
      </div>
    );

    default: return ( // normal
      <div key={uid} style={common}>
        {particles(5, i => (
          <div key={i} style={{
            position: 'absolute', fontSize: i < 2 ? '1.6rem' : '1.1rem',
            top: `${(i - 2) * 18}px`,
            animation: `p-${flip ? 'rtl' : 'ltr'}-${i} 0.6s ${i * 0.07}s ease-out forwards`,
          }}>{i < 2 ? '⭐' : i === 2 ? '💥' : '✨'}</div>
        ))}
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
          }, TURN_DELAY_MS / 2);

          return newEf;
        });
        return pf;
      });
    };

    if (phase !== 'battle' || battleDone.current) return;
    const timer = setInterval(() => {
      if (battleDone.current) { clearInterval(timer); return; }
      runTurn();
    }, TURN_DELAY_MS);
    return () => clearInterval(timer);
  }, [playerIdx, enemyIdx, phase, addLog, addDmg]);

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
        {log.slice(-3).map((entry, i) => (
          <div key={i} className="text-xs font-medium" style={{ color: entry.color, opacity: 0.4 + i * 0.3 }}>
            {entry.text}
          </div>
        ))}
      </div>

      {/* Bench */}
      <div className="shrink-0 flex gap-3 px-4 py-2 border-t border-slate-700/40 bg-black/60">
        <span className="text-slate-500 text-xs self-center">Banc :</span>
        {playerFighters.filter((_, i) => i !== playerIdx).map((f, i) => (
          <div key={i} className={`flex flex-col items-center ${f.currentHp <= 0 ? 'opacity-30' : ''}`}>
            <ShinySprite pokemonId={f.pokemonId} isShiny={f.isShiny ?? false} width={34} height={34}
              style={{ filter: f.currentHp <= 0 ? 'grayscale(1)' : 'none' }} />
            <span className="text-xs text-slate-400">Nv.{f.level}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
