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
// Each type has a unique directional animation — particles travel FROM attacker TO target
function TypeVfx({ type, direction, uid }: { type: PokemonType; direction: 'ltr' | 'rtl'; uid: number }) {
  const d = direction; // 'ltr' = player attacks right, 'rtl' = enemy attacks left

  // Attacker origin: ltr starts at left 20%, rtl starts at right 20% (= left 62%)
  const originLeft = d === 'ltr' ? '20%' : '62%';
  const suf = d; // keyframe suffix: 'ltr' or 'rtl'

  const base: React.CSSProperties = {
    position: 'absolute',
    pointerEvents: 'none',
    zIndex: 15,
    top: '40%',
    left: originLeft,
  };

  switch (type) {
    // FIRE: stream of 🔥 shoots horizontally from attacker's position toward target
    case 'fire': return (
      <div key={uid} style={base}>
        {/* Main fire stream — 7 fireballs in a horizontal spray, fanning slightly */}
        {[
          { vy: '-40px', size: '1.5rem', delay: '0s',    dur: '0.6s' },
          { vy: '-20px', size: '2rem',   delay: '0.05s', dur: '0.62s' },
          { vy: '0px',   size: '2.2rem', delay: '0.02s', dur: '0.58s' },
          { vy: '20px',  size: '2rem',   delay: '0.07s', dur: '0.63s' },
          { vy: '40px',  size: '1.5rem', delay: '0.04s', dur: '0.6s' },
          { vy: '-10px', size: '1.2rem', delay: '0.12s', dur: '0.55s' },
          { vy: '10px',  size: '1.2rem', delay: '0.14s', dur: '0.55s' },
        ].map((p, i) => (
          <div key={i} style={{
            position: 'absolute', fontSize: p.size,
            animation: `fire-shoot-${suf} ${p.dur} ${p.delay} ease-out forwards`,
            filter: 'drop-shadow(0 0 6px #f97316)',
            '--vy': p.vy,
          } as React.CSSProperties}>🔥</div>
        ))}
        {/* Heat wave glow that expands at origin */}
        <div style={{
          position: 'absolute', top: '-28px', left: '-28px',
          width: 56, height: 56,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(253,115,0,0.7) 0%, transparent 70%)',
          animation: `fire-heatwave 0.5s ease-out forwards`,
        }} />
      </div>
    );

    // WATER: droplets arc upward then crash down at the target
    case 'water': return (
      <div key={uid} style={base}>
        {[
          { vy: '0px', size: '2rem', delay: '0s',    emoji: '🌊' },
          { vy: '-15px', size: '1.4rem', delay: '0.06s', emoji: '💧' },
          { vy: '15px',  size: '1.4rem', delay: '0.04s', emoji: '💧' },
          { vy: '-30px', size: '1.1rem', delay: '0.1s',  emoji: '💧' },
          { vy: '30px',  size: '1.1rem', delay: '0.08s', emoji: '💧' },
        ].map((p, i) => (
          <div key={i} style={{
            position: 'absolute', fontSize: p.size,
            animation: `water-arc-${suf} 0.8s ${p.delay} cubic-bezier(0.25,0.46,0.45,0.94) forwards`,
            filter: 'drop-shadow(0 0 8px #38bdf8)',
          }}>{p.emoji}</div>
        ))}
      </div>
    );

    // ELECTRIC: bolt SVG extends across the field, then sparks ricochet off impact
    case 'electric': return (
      <div key={uid} style={{ ...base, top: '38%', left: d === 'ltr' ? '18%' : 'auto', right: d === 'rtl' ? '18%' : undefined }}>
        {/* Lightning bolt SVG — draws itself from attacker to target */}
        <svg width="240" height="50" style={{
          position: 'absolute', top: -25,
          left: d === 'ltr' ? 0 : 'auto', right: d === 'rtl' ? 0 : 'auto',
          transform: d === 'rtl' ? 'scaleX(-1)' : undefined,
          overflow: 'visible',
        }}>
          {/* Glow layer */}
          <polyline
            points="0,25 35,8 62,38 95,4 128,32 158,10 185,27 215,18 240,24"
            fill="none" stroke="#fbbf24" strokeWidth="7"
            strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray="300" strokeDashoffset="0"
            style={{ filter: 'blur(4px)', animation: `bolt-extend 0.35s ease-out forwards`, opacity: 0.9 }}
          />
          {/* Sharp bolt */}
          <polyline
            points="0,25 35,8 62,38 95,4 128,32 158,10 185,27 215,18 240,24"
            fill="none" stroke="#fef08a" strokeWidth="3"
            strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray="300" strokeDashoffset="0"
            style={{ filter: 'drop-shadow(0 0 6px #fbbf24)', animation: `bolt-extend 0.32s ease-out forwards` }}
          />
        </svg>
        {/* Ricochet sparks that explode at impact point */}
        {[
          { vy: '-50px', vr: '-30deg', delay: '0.3s' },
          { vy: '-20px', vr: '15deg',  delay: '0.32s' },
          { vy: '20px',  vr: '-20deg', delay: '0.31s' },
          { vy: '50px',  vr: '40deg',  delay: '0.33s' },
        ].map((p, i) => (
          <div key={i} style={{
            position: 'absolute', fontSize: '1.1rem',
            animation: `spark-ricochet-${suf} 0.4s ${p.delay} ease-out forwards`,
            '--vy': p.vy, '--vr': p.vr,
          } as React.CSSProperties}>⚡</div>
        ))}
      </div>
    );

    // GRASS: leaves and vines rise UP from UNDER the attacker, then arc toward target
    case 'grass': return (
      <div key={uid} style={{ ...base, top: '65%' }}>
        {/* Vines/leaves grow up from ground */}
        {[
          { delay: '0s',    size: '2rem',  emoji: '🌿', x: '-10px' },
          { delay: '0.06s', size: '1.8rem', emoji: '🍃', x: '5px' },
          { delay: '0.03s', size: '2.2rem', emoji: '🌱', x: '0px' },
          { delay: '0.09s', size: '1.5rem', emoji: '🍃', x: '-5px' },
          { delay: '0.12s', size: '1.3rem', emoji: '🌿', x: '12px' },
        ].map((p, i) => (
          <div key={i} style={{
            position: 'absolute', fontSize: p.size,
            left: p.x,
            animation: `grass-rise-${suf} 0.85s ${p.delay} ease-out forwards`,
            filter: 'drop-shadow(0 0 6px #4ade80)',
          }}>{p.emoji}</div>
        ))}
        {/* Big tree bursts at impact */}
        <div style={{
          position: 'absolute', fontSize: '2.5rem',
          animation: `grass-rise-${suf} 0.7s 0.05s ease-out forwards`,
          filter: 'drop-shadow(0 0 10px #16a34a)',
        }}>🌳</div>
      </div>
    );

    // ICE: spinning ice shards fly toward target in spread
    case 'ice': return (
      <div key={uid} style={base}>
        {[
          { vy: '-45px', size: '1.6rem', delay: '0s',    emoji: '❄️' },
          { vy: '-20px', size: '1.8rem', delay: '0.05s', emoji: '❄️' },
          { vy: '0px',   size: '2rem',   delay: '0.02s', emoji: '🔷' },
          { vy: '20px',  size: '1.8rem', delay: '0.07s', emoji: '❄️' },
          { vy: '45px',  size: '1.6rem', delay: '0.04s', emoji: '❄️' },
          { vy: '-35px', size: '1.1rem', delay: '0.1s',  emoji: '🔷' },
          { vy: '35px',  size: '1.1rem', delay: '0.1s',  emoji: '🔷' },
        ].map((p, i) => (
          <div key={i} style={{
            position: 'absolute', fontSize: p.size,
            animation: `ice-spin-${suf} 0.75s ${p.delay} ease-out forwards`,
            filter: 'drop-shadow(0 0 6px #7dd3fc)',
            '--vy': p.vy,
          } as React.CSSProperties}>{p.emoji}</div>
        ))}
      </div>
    );

    // PSYCHIC: concentric energy rings travel from attacker to target
    case 'psychic': return (
      <div key={uid} style={{ ...base, top: '35%' }}>
        {[40, 65, 90].map((size, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: size, height: size,
            top: -(size / 2), left: -(size / 2),
            border: `2.5px solid rgba(244,114,182,${0.9 - i * 0.2})`,
            borderRadius: '50%',
            boxShadow: `0 0 12px #f472b6, inset 0 0 8px rgba(244,114,182,0.3)`,
            animation: `psychic-ring-${suf} 0.8s ${i * 0.1}s ease-out forwards`,
          }} />
        ))}
        <div style={{
          position: 'absolute', fontSize: '2rem', top: '-16px', left: '-16px',
          animation: `psychic-ring-${suf} 0.85s 0.05s ease-out forwards`,
          filter: 'drop-shadow(0 0 10px #e879f9)',
        }}>🔮</div>
      </div>
    );

    // FIGHTING: attacker lunges, big impact 💥 bursts at target's face
    case 'fighting': return (
      <div key={uid} style={base}>
        {[
          { vy: '-35px', size: '2.5rem', delay: '0.15s', emoji: '💥' },
          { vy: '0px',   size: '2rem',   delay: '0.17s', emoji: '💢' },
          { vy: '35px',  size: '2.5rem', delay: '0.13s', emoji: '💥' },
          { vy: '-18px', size: '1.5rem', delay: '0.22s', emoji: '⭐' },
          { vy: '18px',  size: '1.5rem', delay: '0.2s',  emoji: '⭐' },
        ].map((p, i) => (
          <div key={i} style={{
            position: 'absolute', fontSize: p.size,
            animation: `fight-impact-${suf} 0.5s ${p.delay} ease-out forwards`,
            filter: 'drop-shadow(0 0 5px #ef4444)',
            '--vy': p.vy,
          } as React.CSSProperties}>{p.emoji}</div>
        ))}
      </div>
    );

    // GHOST: semi-transparent 👻 phases out of attacker and drifts with a wave to target
    case 'ghost': return (
      <div key={uid} style={{ ...base, top: '35%' }}>
        <div style={{
          position: 'absolute', fontSize: '3.5rem',
          top: '-28px', left: '-14px',
          filter: 'drop-shadow(0 0 14px #7c3aed) blur(1.5px)',
          animation: `ghost-wave-${suf} 1.1s ease-in-out forwards`,
        }}>👻</div>
        {/* Trailing wisps */}
        {['-30px', '0px', '30px'].map((vy, i) => (
          <div key={i} style={{
            position: 'absolute', fontSize: '1.1rem',
            top: vy, opacity: 0.5,
            filter: 'blur(1px)',
            animation: `ghost-wave-${suf} 1.1s ${(i + 1) * 0.1}s ease-in-out forwards`,
          }}>💀</div>
        ))}
      </div>
    );

    // POISON: purple bubbles rise from ground at the TARGET's position
    case 'poison': return (
      <div key={uid} style={{ ...base, top: '70%' }}>
        {[
          { delay: '0s',    size: '1.8rem', emoji: '💜', offset: '-15px' },
          { delay: '0.08s', size: '2rem',   emoji: '☠️', offset: '0px' },
          { delay: '0.05s', size: '1.8rem', emoji: '💜', offset: '15px' },
          { delay: '0.13s', size: '1.3rem', emoji: '🟣', offset: '-8px' },
          { delay: '0.1s',  size: '1.3rem', emoji: '🟣', offset: '8px' },
        ].map((p, i) => (
          <div key={i} style={{
            position: 'absolute', left: p.offset, fontSize: p.size,
            animation: `poison-bubble-${suf} 0.85s ${p.delay} ease-out forwards`,
            filter: 'drop-shadow(0 0 6px #a855f7)',
          }}>{p.emoji}</div>
        ))}
      </div>
    );

    // GROUND: rocks thrown in a HIGH arc from attacker to target (earthquake style)
    case 'ground': return (
      <div key={uid} style={{ ...base, top: '55%' }}>
        {[
          { vy: '-12px', size: '2rem',   delay: '0s',    emoji: '🪨' },
          { vy: '0px',   size: '1.7rem', delay: '0.07s', emoji: '🪨' },
          { vy: '-20px', size: '1.4rem', delay: '0.04s', emoji: '💥' },
          { vy: '12px',  size: '1.7rem', delay: '0.1s',  emoji: '🪨' },
          { vy: '5px',   size: '1.3rem', delay: '0.06s', emoji: '💥' },
        ].map((p, i) => (
          <div key={i} style={{
            position: 'absolute', fontSize: p.size,
            animation: `ground-arc-${suf} 0.75s ${p.delay} cubic-bezier(0.55,0,1,0.45) forwards`,
          }}>{p.emoji}</div>
        ))}
      </div>
    );

    // FLYING: gusts of wind sweep horizontally across the arena
    case 'flying': return (
      <div key={uid} style={{ ...base, top: '30%' }}>
        {[
          { vy: '-40px', size: '2rem',   delay: '0s',    emoji: '🌪️', dur: '0.55s' },
          { vy: '-15px', size: '1.5rem', delay: '0.05s', emoji: '💨', dur: '0.6s' },
          { vy: '5px',   size: '1.7rem', delay: '0.03s', emoji: '🍃', dur: '0.58s' },
          { vy: '25px',  size: '1.5rem', delay: '0.08s', emoji: '💨', dur: '0.62s' },
          { vy: '50px',  size: '2rem',   delay: '0.01s', emoji: '🌪️', dur: '0.55s' },
        ].map((p, i) => (
          <div key={i} style={{
            position: 'absolute', fontSize: p.size,
            animation: `wind-sweep-${suf} ${p.dur} ${p.delay} ease-in-out forwards`,
            filter: 'drop-shadow(0 0 5px #c4b5fd)',
            '--vy': p.vy,
          } as React.CSSProperties}>{p.emoji}</div>
        ))}
      </div>
    );

    // DRAGON: a large dragon sweeps the entire field
    case 'dragon': return (
      <div key={uid} style={{ ...base, top: '25%', left: d === 'ltr' ? '-5%' : 'auto', right: d === 'rtl' ? '-5%' : undefined }}>
        <div style={{
          position: 'absolute', fontSize: '3.5rem',
          filter: 'drop-shadow(0 0 12px #4f46e5) drop-shadow(0 0 20px #818cf8)',
          transform: d === 'rtl' ? 'scaleX(-1)' : undefined,
          animation: `dragon-sweep-${suf} 0.9s ease-in-out forwards`,
        }}>🐉</div>
        {['✨', '🔥', '✨'].map((e, i) => (
          <div key={i} style={{
            position: 'absolute', fontSize: '1.3rem',
            top: `${(i - 1) * 30}px`,
            animation: `dragon-sweep-${suf} 0.9s ${(i + 1) * 0.08}s ease-in-out forwards`,
            filter: 'drop-shadow(0 0 8px #818cf8)',
          }}>{e}</div>
        ))}
      </div>
    );

    // ROCK: rocks fly directly at target (flatter arc than ground)
    case 'rock': return (
      <div key={uid} style={base}>
        {[
          { vy: '-30px', size: '1.8rem', delay: '0s',    emoji: '🪨' },
          { vy: '0px',   size: '2rem',   delay: '0.04s', emoji: '🪨' },
          { vy: '30px',  size: '1.8rem', delay: '0.02s', emoji: '🪨' },
          { vy: '-15px', size: '1.3rem', delay: '0.09s', emoji: '💥' },
          { vy: '15px',  size: '1.3rem', delay: '0.07s', emoji: '💥' },
        ].map((p, i) => (
          <div key={i} style={{
            position: 'absolute', fontSize: p.size,
            animation: `ground-arc-${suf} 0.6s ${p.delay} ease-out forwards`,
          }}>{p.emoji}</div>
        ))}
      </div>
    );

    // BUG: swarm of 🐛 and leaves charge toward target
    case 'bug': return (
      <div key={uid} style={base}>
        {[
          { vy: '-35px', size: '1.4rem', delay: '0s',    emoji: '🐛' },
          { vy: '-12px', size: '1.6rem', delay: '0.05s', emoji: '🍃' },
          { vy: '5px',   size: '1.8rem', delay: '0.02s', emoji: '🐛' },
          { vy: '25px',  size: '1.6rem', delay: '0.07s', emoji: '🍃' },
          { vy: '45px',  size: '1.4rem', delay: '0.04s', emoji: '🐛' },
          { vy: '-50px', size: '1.2rem', delay: '0.09s', emoji: '⚡' },
        ].map((p, i) => (
          <div key={i} style={{
            position: 'absolute', fontSize: p.size,
            animation: `fire-shoot-${suf} 0.65s ${p.delay} ease-out forwards`,
            filter: 'drop-shadow(0 0 4px #84cc16)',
            '--vy': p.vy,
          } as React.CSSProperties}>{p.emoji}</div>
        ))}
      </div>
    );

    default: // normal — stars shoot toward target
      return (
        <div key={uid} style={base}>
          {[
            { vy: '-40px', size: '1.6rem', delay: '0s',    emoji: '⭐' },
            { vy: '-15px', size: '1.9rem', delay: '0.04s', emoji: '💥' },
            { vy: '5px',   size: '2rem',   delay: '0.02s', emoji: '⭐' },
            { vy: '25px',  size: '1.9rem', delay: '0.06s', emoji: '✨' },
            { vy: '45px',  size: '1.6rem', delay: '0.03s', emoji: '⭐' },
          ].map((p, i) => (
            <div key={i} style={{
              position: 'absolute', fontSize: p.size,
              animation: `star-fly-${suf} 0.65s ${p.delay} ease-out forwards`,
              '--vy': p.vy,
            } as React.CSSProperties}>{p.emoji}</div>
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

    </div>
  );
}
