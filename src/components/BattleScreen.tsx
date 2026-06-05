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

const CONFETTI_BATTLE = Array.from({ length: 22 }, (_, i) => ({
  color: ['#fbbf24','#f472b6','#60a5fa','#4ade80','#fb923c','#c084fc'][i % 6],
  cx: `${(i * 37 + 11) % 100 - 50}px`,
  cdx: `${((i * 23) % 60) - 30}px`,
  cr: `${(i * 47) % 720 - 360}deg`,
  left: `${(i * 37 + 11) % 100}%`,
  delay: `${(i * 0.06).toFixed(2)}s`,
  dur: `${0.7 + (i % 5) * 0.1}s`,
}));

// ── Type VFX — each type has a distinct trajectory and visual ────────────────
// ltr = player (bottom-left) attacks enemy (top-right)
// rtl = enemy (top-right) attacks player (bottom-left)
function TypeVfx({ type, direction, uid: _uid }: { type: PokemonType; direction: 'ltr' | 'rtl'; uid: number }) {
  const d = direction;
  type P = React.CSSProperties;

  // Attacker origin: corner of sprite facing the opponent
  // Player (ltr): top-right corner of player sprite ≈ left:33%, top:50%
  // Enemy  (rtl): bottom-left corner of enemy sprite ≈ left:70%, top:42%
  const origin: P = {
    position: 'absolute', pointerEvents: 'none', zIndex: 15,
    left: d === 'ltr' ? '33%' : '70%',
    top:  d === 'ltr' ? '50%' : '42%',
  };

  switch (type) {

    // FIRE: parabolic arc — big fireball rises high then comes down at target
    case 'fire': return (
      <div style={origin}>
        <div style={{ position:'absolute', fontSize:'2.2rem', filter:'drop-shadow(0 0 14px #f97316) drop-shadow(0 0 24px #ef4444)', animation:`fire-arc-${d} 0.75s ease-in-out forwards` } as P}>🔥</div>
        <div style={{ position:'absolute', fontSize:'1.3rem', filter:'drop-shadow(0 0 8px #fb923c)', animation:`fire-arc-${d} 0.75s 0.09s ease-in-out forwards` } as P}>🔥</div>
        <div style={{ position:'absolute', fontSize:'0.9rem', animation:`fire-arc-${d} 0.75s 0.17s ease-in-out forwards` } as P}>🔥</div>
      </div>
    );

    // WATER: very high arc (different peak height from fire)
    case 'water': return (
      <div style={origin}>
        <div style={{ position:'absolute', fontSize:'1.9rem', filter:'drop-shadow(0 0 12px #38bdf8) drop-shadow(0 0 20px #0ea5e9)', animation:`water-arc-${d} 0.78s ease-in-out forwards` } as P}>💧</div>
        <div style={{ position:'absolute', fontSize:'1.2rem', filter:'drop-shadow(0 0 6px #7dd3fc)', animation:`water-arc-${d} 0.78s 0.08s ease-in-out forwards` } as P}>💧</div>
        <div style={{ position:'absolute', fontSize:'1.4rem', filter:'drop-shadow(0 0 8px #0ea5e9)', animation:`water-arc-${d} 0.78s 0.15s ease-in-out forwards` } as P}>🌊</div>
      </div>
    );

    // ELECTRIC: SVG zigzag bolt drawn instantly across the arena
    case 'electric': {
      // Zigzag from attacker front to target center in % coordinates
      const pts = d === 'ltr'
        ? '33,50 42,40 36,30 53,22 46,13 66,7 59,2 80,25'
        : '70,42 61,52 67,62 50,70 57,79 38,85 44,91 22,60';
      return (
        <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:15 }}
          viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs><filter id="glow-e"><feGaussianBlur stdDeviation="1.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
          <polyline points={pts} fill="none" stroke="#facc15" strokeWidth="1.4"
            strokeLinecap="round" strokeLinejoin="round" filter="url(#glow-e)"
            style={{ strokeDasharray:220, strokeDashoffset:220, animation:'bolt-extend 0.2s ease-out forwards, bolt-fade 0.4s 0.2s ease-out forwards' }} />
          <polyline points={pts} fill="none" stroke="white" strokeWidth="0.5"
            strokeLinecap="round" strokeLinejoin="round"
            style={{ strokeDasharray:220, strokeDashoffset:220, animation:'bolt-extend 0.18s ease-out forwards, bolt-fade 0.3s 0.18s ease-out forwards' }} />
        </svg>
      );
    }

    // GRASS: leaves rise from below, then spiral to target
    case 'grass': return (
      <div style={origin}>
        <div style={{ position:'absolute', fontSize:'1.7rem', filter:'drop-shadow(0 0 6px #4ade80)', animation:`grass-fly-${d} 0.78s ease-in-out forwards` } as P}>🍃</div>
        <div style={{ position:'absolute', fontSize:'1.2rem', filter:'drop-shadow(0 0 5px #22c55e)', animation:`grass-fly-${d} 0.78s 0.08s ease-in-out forwards` } as P}>🌿</div>
        <div style={{ position:'absolute', fontSize:'0.95rem', animation:`grass-fly-${d} 0.78s 0.15s ease-in-out forwards` } as P}>🍃</div>
      </div>
    );

    // ICE: ultra-fast straight beam (very different from fire's slow arc)
    case 'ice': return (
      <div style={origin}>
        <div style={{ position:'absolute', fontSize:'2rem', filter:'drop-shadow(0 0 16px #bae6fd) drop-shadow(0 0 28px #38bdf8)', animation:`ice-beam-${d} 0.22s ease-out forwards` } as P}>❄️</div>
        <div style={{ position:'absolute', fontSize:'1.3rem', filter:'drop-shadow(0 0 10px #93c5fd)', animation:`ice-beam-${d} 0.22s 0.05s ease-out forwards` } as P}>🔷</div>
        <div style={{ position:'absolute', fontSize:'1rem', animation:`ice-beam-${d} 0.22s 0.09s ease-out forwards` } as P}>❄️</div>
      </div>
    );

    // PSYCHIC: gem travels to target; rings expand at target (dual element)
    case 'psychic': {
      const tgt: P = {
        position:'absolute', pointerEvents:'none', zIndex:15,
        left: d === 'ltr' ? '80%' : '22%',
        top:  d === 'ltr' ? '25%' : '60%',
      };
      return (
        <>
          <div style={origin}>
            <div style={{ position:'absolute', fontSize:'1.6rem', filter:'drop-shadow(0 0 12px #d946ef)',
              '--s': 1, animation:`stream-${d} 0.58s ease-in-out forwards` } as P}>🔮</div>
          </div>
          <div style={tgt}>
            {([0,1,2] as number[]).map(i => (
              <div key={i} style={{ position:'absolute', width:34, height:34, borderRadius:'50%',
                border:'2.5px solid #e879f9', top:-17, left:-17,
                filter:'drop-shadow(0 0 8px #a855f7)', opacity:0,
                animation:`psyring-expand 0.6s ${0.38 + i * 0.13}s ease-out forwards` } as P} />
            ))}
          </div>
        </>
      );
    }

    // FIGHTING: very fast direct punch (shortest animation)
    case 'fighting': return (
      <div style={origin}>
        <div style={{ position:'absolute', fontSize:'2.2rem', filter:'drop-shadow(0 0 12px #f97316)', animation:`fight-dash-${d} 0.3s ease-in forwards` } as P}>👊</div>
        <div style={{ position:'absolute', fontSize:'1.7rem', filter:'drop-shadow(0 0 12px #fbbf24)', animation:`fight-dash-${d} 0.3s 0.18s ease-out forwards` } as P}>💥</div>
      </div>
    );

    // GHOST: slow, undulating wave (longest animation — opposite of fighting)
    case 'ghost': return (
      <div style={origin}>
        <div style={{ position:'absolute', fontSize:'2.6rem', top:-20, left:-13,
          filter:'drop-shadow(0 0 16px #7c3aed) blur(0.5px)', opacity:0,
          animation:`ghost-wave2-${d} 1.2s ease-in-out forwards` } as P}>👻</div>
      </div>
    );

    // POISON: three purple bubbles drifting in slightly different paths
    case 'poison': return (
      <div style={origin}>
        {([
          {t:0,  l:0,  s:15, delay:'0s'   },
          {t:9,  l:-6, s:11, delay:'0.1s' },
          {t:-5, l:7,  s:12, delay:'0.17s'},
        ] as Array<{t:number,l:number,s:number,delay:string}>).map((b,i) => (
          <div key={i} style={{ position:'absolute', width:b.s, height:b.s, borderRadius:'50%',
            background:'radial-gradient(circle at 35% 35%, #d946ef, #7e22ce)',
            border:'1px solid #e879f9', top:b.t, left:b.l,
            filter:'drop-shadow(0 0 4px #a855f7)',
            animation:`poison-drift-${d} 0.9s ${b.delay} ease-in-out forwards` } as P} />
        ))}
        <div style={{ position:'absolute', fontSize:'1.1rem', top:-4, left:-4,
          filter:'drop-shadow(0 0 6px #a855f7)',
          animation:`poison-drift-${d} 0.9s 0.06s ease-in-out forwards` } as P}>☠️</div>
      </div>
    );

    // GROUND: rock rolls LOW along the ground, then rises to hit target
    case 'ground': return (
      <div style={{ ...origin, top: d === 'ltr' ? '67%' : '42%' }}>
        <div style={{ position:'absolute', fontSize:'1.9rem', filter:'drop-shadow(0 0 5px #92400e)', animation:`ground-roll-${d} 0.82s ease-in-out forwards` } as P}>🪨</div>
        <div style={{ position:'absolute', fontSize:'1.3rem', animation:`ground-roll-${d} 0.82s 0.09s ease-in-out forwards` } as P}>🪨</div>
        <div style={{ position:'absolute', fontSize:'1rem', filter:'drop-shadow(0 0 5px #f97316)', animation:`ground-roll-${d} 0.82s 0.28s ease-out forwards` } as P}>💥</div>
      </div>
    );

    // FLYING: three parallel wind slash lines sweep horizontally
    case 'flying': {
      const slashBase: P = { position:'absolute', borderRadius:2, background:'rgba(186,230,253,0.9)',
        filter:'drop-shadow(0 0 4px #7dd3fc)', transformOrigin: d === 'ltr' ? 'left center' : 'right center' };
      // ltr slashes: player (bottom) attacks up-right → slashes at ~50% height
      // rtl slashes: enemy (top) attacks down-left   → slashes at ~20% height
      const tops = d === 'ltr'
        ? ['52%', '58%', '46%']
        : ['20%', '26%', '14%'];
      return (
        <div style={{ position:'absolute', zIndex:15, pointerEvents:'none',
          left: d === 'ltr' ? '8%' : 'auto', right: d === 'ltr' ? 'auto' : '8%',
          top:0, bottom:0, width:'100%' }}>
          {([
            {w:54, h:3, delay:'0s'   },
            {w:40, h:2, delay:'0.06s'},
            {w:31, h:2, delay:'0.1s' },
          ] as Array<{w:number,h:number,delay:string}>).map((s,i) => (
            <div key={i} style={{ ...slashBase, top:tops[i], width:s.w, height:s.h,
              animation:`wind-slash-${d} 0.62s ${s.delay} ease-in-out forwards` } as P} />
          ))}
          <div style={{ position:'absolute', top: d === 'ltr' ? '49%' : '17%', fontSize:'1.4rem',
            filter:'drop-shadow(0 0 6px #bae6fd)',
            animation:`wind-slash-${d} 0.62s ease-in-out forwards` } as P}>💨</div>
        </div>
      );
    }

    // DRAGON: slow powerful sweep with energy trail
    case 'dragon': return (
      <div style={{ ...origin, top: d === 'ltr' ? '55%' : '35%' }}>
        <div style={{ position:'absolute', fontSize:'3rem', top:-24, left:-15,
          filter:'drop-shadow(0 0 14px #4f46e5) drop-shadow(0 0 28px #818cf8)',
          transform: d === 'rtl' ? 'scaleX(-1)' : undefined,
          animation:`dragon-arc-${d} 0.9s ease-in-out forwards` } as P}>🐉</div>
        <div style={{ position:'absolute', fontSize:'1rem', filter:'drop-shadow(0 0 6px #818cf8)',
          animation:`dragon-arc-${d} 0.9s 0.13s ease-in-out forwards` } as P}>✨</div>
        <div style={{ position:'absolute', fontSize:'0.8rem', filter:'drop-shadow(0 0 4px #a5b4fc)',
          animation:`dragon-arc-${d} 0.9s 0.23s ease-in-out forwards` } as P}>✨</div>
      </div>
    );

    // ROCK: tumbling rocks with rotation
    case 'rock': return (
      <div style={origin}>
        <div style={{ position:'absolute', fontSize:'1.9rem', filter:'drop-shadow(0 0 4px #a8a29e)', animation:`rock-throw-${d} 0.65s ease-in-out forwards` } as P}>🪨</div>
        <div style={{ position:'absolute', fontSize:'1.2rem', animation:`rock-throw-${d} 0.65s 0.1s ease-in-out forwards` } as P}>🪨</div>
        <div style={{ position:'absolute', fontSize:'1.1rem', filter:'drop-shadow(0 0 5px #fbbf24)', animation:`rock-throw-${d} 0.65s 0.19s ease-out forwards` } as P}>💥</div>
      </div>
    );

    // BUG: four bugs in erratic zigzag paths
    case 'bug': return (
      <div style={origin}>
        {([0,1,2,3] as number[]).map(i => (
          <div key={i} style={{ position:'absolute', fontSize:'1rem',
            top:(i%2)*10-5, left:(Math.floor(i/2))*8-4,
            animation:`bug-swarm-${d} 0.8s ${(i*0.07).toFixed(2)}s ease-in-out forwards` } as P}>🐛</div>
        ))}
      </div>
    );

    // NORMAL: star stream
    default: return (
      <div style={origin}>
        {([{s:2,d2:'0s'},{s:1.5,d2:'0.07s'},{s:1.1,d2:'0.13s'},{s:.8,d2:'0.18s'}] as Array<{s:number,d2:string}>).map((p,i)=>(
          <div key={i} style={{ position:'absolute', fontSize:'1rem',
            filter:'drop-shadow(0 0 6px #fde047)', '--s':p.s,
            animation:`stream-${d} 0.65s ${p.d2} ease-out forwards` } as P}>⭐</div>
        ))}
        <div style={{ position:'absolute', fontSize:'1rem', '--s':2.2,
          animation:`stream-${d} 0.6s 0.02s ease-out forwards`,
          filter:'drop-shadow(0 0 8px #fbbf24)' } as P}>💥</div>
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
  const [phase, setPhase] = useState<'intro' | 'battle' | 'switch' | 'end'>('intro');
  const [attackEvt, setAttackEvt] = useState<AttackEvent | null>(null);
  const [floatingDmg, setFloatingDmg] = useState<FloatingDmg[]>([]);
  const [xpGains, setXpGains] = useState<Record<number, number>>({});
  const [hitFlash, setHitFlash] = useState<'player' | 'enemy' | null>(null);
  const [speedLevel, setSpeedLevel] = useState(0); // 0=x1, 1=x2, 2=x4
  const won = useRef(false);
  const battleDone = useRef(false);
  const paused = useRef(false); // paused while player chooses switch

  const addLog = useCallback((text: string, color = '#e2e8f0') => {
    setLog(prev => [...prev.slice(-5), { text, color }]);
  }, []);

  // Intro → battle transition (2s cinematic)
  useEffect(() => {
    if (phase !== 'intro') return;
    const t = setTimeout(() => setPhase('battle'), 2000);
    return () => clearTimeout(t);
  }, [phase]);

  const addDmg = useCallback((value: number, target: 'player' | 'enemy', effectiveness: number) => {
    const id = dmgCounter++;
    setFloatingDmg(prev => [...prev, { id, value, target, effectiveness }]);
    setTimeout(() => setFloatingDmg(prev => prev.filter(d => d.id !== id)), 1100);
  }, []);

  useEffect(() => {
    if (battleDone.current) return;
    const intervalMs = speedLevel === 2 ? 400 : speedLevel === 1 ? 800 : 1600;

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
          }, intervalMs / 2);

          return newEf;
        });
        return pf;
      });
    };

    if (phase !== 'battle' || battleDone.current) return;
    const timer = setInterval(() => {
      if (battleDone.current) { clearInterval(timer); return; }
      runTurn();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [playerIdx, enemyIdx, phase, addLog, addDmg, speedLevel]);

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

  // ── INTRO PHASE ──
  if (phase === 'intro') {
    return (
      <div className="fixed inset-0 z-[400] flex flex-col" style={{ background: '#020617' }}>
        <div className="relative flex-1 overflow-hidden">
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(ellipse at 50% 20%, #1e1b4b 0%, #0f0720 55%, #020617 100%)',
          }} />

          {/* Enemy pokemon slides in from top-right */}
          <div className="absolute" style={{ top:'5%', right:'7%', animation:'battle-enter-enemy 0.7s cubic-bezier(.175,.885,.32,1.275) forwards' }}>
            <div className="bg-black/75 rounded-xl px-3 py-2 border border-slate-600/50 mb-2 min-w-[140px]">
              <div className="flex justify-between items-center mb-1">
                <span className="text-white font-black text-sm">{POKEMON_BY_ID[enemyFighters[0]?.pokemonId ?? 0]?.name ?? '???'}</span>
                <span className="text-slate-400 text-xs">Nv.{enemyFighters[0]?.level}</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2.5">
                <div className="h-2.5 rounded-full" style={{ width:'100%', background:'#22c55e' }} />
              </div>
            </div>
            <div className="flex justify-end">
              {enemyFighters[0] && <ShinySprite pokemonId={enemyFighters[0].pokemonId} isShiny={enemyFighters[0].isShiny ?? false} width={88} height={88}
                style={{ filter:`drop-shadow(0 0 10px ${RARITY_COLORS[POKEMON_BY_ID[enemyFighters[0].pokemonId]?.rarity ?? 'commun']})`, transform:'scaleX(-1)' }} />}
            </div>
          </div>

          {/* Player pokemon slides in from bottom-left */}
          <div className="absolute" style={{ bottom:'13%', left:'7%', animation:'battle-enter-player 0.7s cubic-bezier(.175,.885,.32,1.275) forwards' }}>
            {playerFighters[0] && <ShinySprite pokemonId={playerFighters[0].pokemonId} isShiny={playerFighters[0].isShiny ?? false} width={96} height={96}
              style={{ filter:`drop-shadow(0 0 10px ${RARITY_COLORS[POKEMON_BY_ID[playerFighters[0].pokemonId]?.rarity ?? 'commun']})` }} />}
            <div className="bg-black/75 rounded-xl px-3 py-2 border border-slate-600/50 mt-2 min-w-[140px]">
              <div className="flex justify-between items-center mb-1">
                <span className="text-white font-black text-sm">{POKEMON_BY_ID[playerFighters[0]?.pokemonId ?? 0]?.name ?? '???'}</span>
                <span className="text-slate-400 text-xs">Nv.{playerFighters[0]?.level}</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2.5">
                <div className="h-2.5 rounded-full" style={{ width:'100%', background:'#22c55e' }} />
              </div>
            </div>
          </div>

          {/* VS */}
          <div className="absolute inset-x-0 top-1/2 flex justify-center"
            style={{ animation:'battle-vs 0.5s 0.4s ease-out both' }}>
            <span className="font-black" style={{
              fontSize:'5rem',
              background:'linear-gradient(135deg, #ef4444, #f97316)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
              filter:'drop-shadow(0 0 20px #ef4444)',
            }}>VS</span>
          </div>
        </div>
      </div>
    );
  }

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
          const color = d.effectiveness === 0 ? '#94a3b8' : '#ef4444';
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
        {phase !== 'end' && (
          <div className="absolute inset-x-0 top-1/2 flex justify-center pointer-events-none" style={{ transform: 'translateY(-50%)' }}>
            <div className="text-slate-500/30 font-black text-6xl">VS</div>
          </div>
        )}
        {phase === 'end' && (
          <>
            {/* Confetti for victory */}
            {won.current && CONFETTI_BATTLE.map((c, i) => (
              <div key={i} style={{
                position: 'absolute', top: 0, left: c.left,
                width: 9, height: 9, borderRadius: 2,
                background: c.color,
                '--cx': c.cx, '--cdx': c.cdx, '--cr': c.cr,
                animation: `confetti-fall ${c.dur} ${c.delay} ease-in forwards`,
                pointerEvents: 'none', zIndex: 24,
              } as React.CSSProperties} />
            ))}
            {/* Victory/defeat text */}
            <div className="absolute inset-x-0 top-1/2 flex flex-col items-center gap-2 pointer-events-none"
              style={{ transform: 'translateY(-50%)', zIndex: 25 }}>
              {won.current ? (
                <>
                  <div style={{ fontSize: '4rem', animation: 'victory-trophy 0.7s cubic-bezier(.175,.885,.32,1.275) forwards' }}>🏆</div>
                  <div className="font-black" style={{
                    fontSize: '2.8rem',
                    background: 'linear-gradient(90deg, #fbbf24, #4ade80, #60a5fa)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 0 16px #fbbf24)',
                    animation: 'victory-title 0.6s 0.3s ease-out both',
                  }}>VICTOIRE !</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '4rem', animation: 'victory-trophy 0.6s ease-out forwards' }}>💀</div>
                  <div className="font-black text-red-400 text-4xl"
                    style={{ textShadow: '0 0 20px #ef4444', animation: 'victory-title 0.5s 0.25s ease-out both' }}>
                    DÉFAITE…
                  </div>
                </>
              )}
            </div>
          </>
        )}

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
              onClick={() => setSpeedLevel(v => (v + 1) % 3)}
              className="ml-3 px-3 py-1.5 rounded-xl font-black text-sm shrink-0"
              style={{
                background: speedLevel === 2 ? 'linear-gradient(90deg, #ef4444, #7c3aed)' : speedLevel === 1 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : '#1e293b',
                border: speedLevel > 0 ? `2px solid ${speedLevel === 2 ? '#ef4444' : '#f59e0b'}` : '2px solid #475569',
                color: speedLevel > 0 ? '#000' : '#94a3b8',
              }}
            >
              {speedLevel === 2 ? '⚡ x4' : speedLevel === 1 ? '⚡ x2' : '▶ x1'}
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
