import React, { useState, useEffect, useCallback, useRef } from 'react';
import { playBattleMusic, playShinyBattleSfx, playLeagueBattleMusic, stopMusic, playVictory, playLeagueVictory, playSfxDefeat, playPokemonCry } from '../lib/audio';
import { RARITY_COLORS, Rarity } from '../types';
import { POKEMON_BY_ID } from '../data/gen1';
import { ShinySprite } from './ShinySprite';

function spriteFilter(pokemonId: number, _isShiny: boolean, _size = 4): string {
  const rarity = (POKEMON_BY_ID[pokemonId]?.rarity ?? 'commun') as Rarity;
  if (rarity === 'legendaire') return 'drop-shadow(0 0 6px #f59e0b) drop-shadow(0 0 12px #fde04799)';
  return `drop-shadow(0 0 4px ${RARITY_COLORS[rarity]})`;
}
import { POKEMON_TYPE, TYPE_COLORS, PokemonType } from '../data/pokemonTypes';
import { calcDamage, calcStruggle, calcXpGain, calcSpeed, chooseEnemyMoveIndex, emptyStages, getMoveListRaw } from '../data/combatEngine';
import type { Stages } from '../data/combatEngine';
import type { } from '../data/gen1Stats';
import { TeamMember } from './TeamBuilder';
import type { PokemonInstanceData } from '../types';

const SHINY_INTRO_STARS: { color: string; dur: string; delay: string; sym: string; size: number; anim: string }[] = [
  { color: '#fde047', dur: '1.2s', delay: '0s',    sym: '✦', size: 18, anim: 'park-persp-a' },
  { color: '#f472b6', dur: '1.0s', delay: '-0.3s', sym: '★', size: 16, anim: 'park-persp-b' },
  { color: '#60a5fa', dur: '1.5s', delay: '-0.6s', sym: '✦', size: 17, anim: 'park-persp-c' },
  { color: '#4ade80', dur: '1.1s', delay: '-0.9s', sym: '✧', size: 15, anim: 'park-persp-d' },
  { color: '#ffffff', dur: '1.4s', delay: '-0.4s', sym: '★', size: 16, anim: 'park-persp-e' },
  { color: '#c084fc', dur: '1.0s', delay: '-0.7s', sym: '✦', size: 17, anim: 'park-persp-a' },
];

interface Props {
  playerTeam: TeamMember[];
  enemyTeam: TeamMember[];
  bossName?: string;
  onBattleEnd: (won: boolean, xpGains: Record<number, number>, finalTeam?: TeamMember[], enemyDmg?: Record<number, number>) => void;
  playerDamageMult?: number;
  isLeague?: boolean;
  suppressVictorySound?: boolean;
  keepMusic?: boolean;
  keepMusicOnUnmount?: boolean;
  autoCombat?: boolean;
  onAutoCombatChange?: (v: boolean) => void;
  speedLevel?: number;
  onSpeedLevelChange?: (v: number) => void;
  onQuit?: () => void;
  trainerImage?: string;
  trainerColor?: string;
  sideOverlay?: React.ReactNode;
  pokemonData?: Record<number, PokemonInstanceData>;
  pokemonMoves?: Record<number, number[]>;
}

interface FighterState extends TeamMember {
  currentHp: number;
  currentPP: number[];
  stages: Stages;
}

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
  isCrit?: boolean;
  isMiss?: boolean;
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

// ── Type VFX ────────────────────────────────────────────────────────────────
function TypeVfx({ type, direction, uid: _uid }: { type: PokemonType; direction: 'ltr' | 'rtl'; uid: number }) {
  const d = direction;
  type P = React.CSSProperties;

  const origin: P = {
    position: 'absolute', pointerEvents: 'none', zIndex: 15,
    left: d === 'ltr'
      ? 'calc(max(7%, calc(50% - 220px)) + 110px)'
      : 'calc(100% - max(7%, calc(50% - 220px)) - 120px)',
    top:  d === 'ltr' ? '56%' : '20%',
  };

  switch (type) {
    case 'fire': return (
      <div style={origin}>
        <div style={{ position:'absolute', fontSize:'3rem', filter:'drop-shadow(0 0 18px #f97316) drop-shadow(0 0 32px #ef4444)', animation:`fire-arc-${d} 1.05s ease-in-out forwards` } as P}>🔥</div>
        <div style={{ position:'absolute', fontSize:'1.8rem', filter:'drop-shadow(0 0 10px #fb923c)', animation:`fire-arc-${d} 1.05s 0.1s ease-in-out forwards` } as P}>🔥</div>
        <div style={{ position:'absolute', fontSize:'1.2rem', animation:`fire-arc-${d} 1.05s 0.2s ease-in-out forwards` } as P}>🔥</div>
      </div>
    );
    case 'water': return (
      <div style={origin}>
        <div style={{ position:'absolute', fontSize:'2.6rem', filter:'drop-shadow(0 0 16px #38bdf8) drop-shadow(0 0 26px #0ea5e9)', animation:`water-arc-${d} 1.1s ease-in-out forwards` } as P}>💧</div>
        <div style={{ position:'absolute', fontSize:'1.7rem', filter:'drop-shadow(0 0 8px #7dd3fc)', animation:`water-arc-${d} 1.1s 0.1s ease-in-out forwards` } as P}>💧</div>
        <div style={{ position:'absolute', fontSize:'2rem', filter:'drop-shadow(0 0 10px #0ea5e9)', animation:`water-arc-${d} 1.1s 0.18s ease-in-out forwards` } as P}>🌊</div>
      </div>
    );
    case 'electric': {
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
    case 'grass': return (
      <div style={origin}>
        <div style={{ position:'absolute', fontSize:'2.4rem', filter:'drop-shadow(0 0 8px #4ade80)', animation:`grass-fly-${d} 1.1s ease-in-out forwards` } as P}>🍃</div>
        <div style={{ position:'absolute', fontSize:'1.7rem', filter:'drop-shadow(0 0 6px #22c55e)', animation:`grass-fly-${d} 1.1s 0.1s ease-in-out forwards` } as P}>🌿</div>
        <div style={{ position:'absolute', fontSize:'1.3rem', animation:`grass-fly-${d} 1.1s 0.18s ease-in-out forwards` } as P}>🍃</div>
      </div>
    );
    case 'ice': return (
      <div style={origin}>
        <div style={{ position:'absolute', fontSize:'2.8rem', filter:'drop-shadow(0 0 20px #bae6fd) drop-shadow(0 0 36px #38bdf8)', animation:`ice-beam-${d} 0.35s ease-out forwards` } as P}>❄️</div>
        <div style={{ position:'absolute', fontSize:'1.8rem', filter:'drop-shadow(0 0 12px #93c5fd)', animation:`ice-beam-${d} 0.35s 0.06s ease-out forwards` } as P}>🔷</div>
        <div style={{ position:'absolute', fontSize:'1.4rem', animation:`ice-beam-${d} 0.35s 0.11s ease-out forwards` } as P}>❄️</div>
      </div>
    );
    case 'psychic': {
      const tgt: P = {
        position:'absolute', pointerEvents:'none', zIndex:15,
        left: d === 'ltr' ? '80%' : '22%',
        top:  d === 'ltr' ? '25%' : '60%',
      };
      return (
        <>
          <div style={origin}>
            <div style={{ position:'absolute', fontSize:'2.2rem', filter:'drop-shadow(0 0 16px #d946ef)',
              '--s': 1, animation:`stream-${d} 0.8s ease-in-out forwards` } as P}>🔮</div>
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
    case 'fighting': return (
      <div style={origin}>
        <div style={{ position:'absolute', fontSize:'3rem', filter:'drop-shadow(0 0 16px #f97316)', animation:`fight-dash-${d} 0.5s ease-in forwards` } as P}>👊</div>
        <div style={{ position:'absolute', fontSize:'2.4rem', filter:'drop-shadow(0 0 16px #fbbf24)', animation:`fight-dash-${d} 0.5s 0.22s ease-out forwards` } as P}>💥</div>
      </div>
    );
    case 'ghost': return (
      <div style={origin}>
        <div style={{ position:'absolute', fontSize:'3.5rem', top:-26, left:-18,
          filter:'drop-shadow(0 0 20px #7c3aed) blur(0.5px)', opacity:0,
          animation:`ghost-wave2-${d} 1.6s ease-in-out forwards` } as P}>👻</div>
      </div>
    );
    case 'poison': return (
      <div style={origin}>
        {([
          {t:0,  l:0,  s:22, delay:'0s'   },
          {t:9,  l:-8, s:16, delay:'0.1s' },
          {t:-5, l:9,  s:18, delay:'0.17s'},
        ] as Array<{t:number,l:number,s:number,delay:string}>).map((b,i) => (
          <div key={i} style={{ position:'absolute', width:b.s, height:b.s, borderRadius:'50%',
            background:'radial-gradient(circle at 35% 35%, #d946ef, #7e22ce)',
            border:'1px solid #e879f9', top:b.t, left:b.l,
            filter:'drop-shadow(0 0 4px #a855f7)',
            animation:`poison-drift-${d} 1.2s ${b.delay} ease-in-out forwards` } as P} />
        ))}
        <div style={{ position:'absolute', fontSize:'1.6rem', top:-6, left:-6,
          filter:'drop-shadow(0 0 8px #a855f7)',
          animation:`poison-drift-${d} 1.2s 0.08s ease-in-out forwards` } as P}>☠️</div>
      </div>
    );
    case 'ground': return (
      <div style={{ ...origin, top: d === 'ltr' ? '67%' : '42%' }}>
        <div style={{ position:'absolute', fontSize:'2.6rem', filter:'drop-shadow(0 0 7px #92400e)', animation:`ground-roll-${d} 1.1s ease-in-out forwards` } as P}>🪨</div>
        <div style={{ position:'absolute', fontSize:'1.8rem', animation:`ground-roll-${d} 1.1s 0.1s ease-in-out forwards` } as P}>🪨</div>
        <div style={{ position:'absolute', fontSize:'1.4rem', filter:'drop-shadow(0 0 7px #f97316)', animation:`ground-roll-${d} 1.1s 0.32s ease-out forwards` } as P}>💥</div>
      </div>
    );
    case 'flying': {
      const slashBase: P = { position:'absolute', borderRadius:2, background:'rgba(186,230,253,0.9)',
        filter:'drop-shadow(0 0 4px #7dd3fc)', transformOrigin: d === 'ltr' ? 'left center' : 'right center' };
      const tops = d === 'ltr' ? ['52%', '58%', '46%'] : ['20%', '26%', '14%'];
      return (
        <div style={{ position:'absolute', zIndex:15, pointerEvents:'none',
          left: d === 'ltr' ? '8%' : 'auto', right: d === 'ltr' ? 'auto' : '8%',
          top:0, bottom:0, width:'100%' }}>
          {([
            {w:76, h:4, delay:'0s'   },
            {w:56, h:3, delay:'0.07s'},
            {w:44, h:3, delay:'0.13s' },
          ] as Array<{w:number,h:number,delay:string}>).map((s,i) => (
            <div key={i} style={{ ...slashBase, top:tops[i], width:s.w, height:s.h,
              animation:`wind-slash-${d} 0.85s ${s.delay} ease-in-out forwards` } as P} />
          ))}
          <div style={{ position:'absolute', top: d === 'ltr' ? '49%' : '17%', fontSize:'2rem',
            filter:'drop-shadow(0 0 8px #bae6fd)',
            animation:`wind-slash-${d} 0.85s ease-in-out forwards` } as P}>💨</div>
        </div>
      );
    }
    case 'dragon': return (
      <div style={{ ...origin, top: d === 'ltr' ? '55%' : '35%' }}>
        <div style={{ position:'absolute', fontSize:'4rem', top:-30, left:-20,
          filter:'drop-shadow(0 0 18px #4f46e5) drop-shadow(0 0 36px #818cf8)',
          transform: d === 'rtl' ? 'scaleX(-1)' : undefined,
          animation:`dragon-arc-${d} 1.2s ease-in-out forwards` } as P}>🐉</div>
        <div style={{ position:'absolute', fontSize:'1.4rem', filter:'drop-shadow(0 0 8px #818cf8)',
          animation:`dragon-arc-${d} 1.2s 0.15s ease-in-out forwards` } as P}>✨</div>
        <div style={{ position:'absolute', fontSize:'1.1rem', filter:'drop-shadow(0 0 5px #a5b4fc)',
          animation:`dragon-arc-${d} 1.2s 0.28s ease-in-out forwards` } as P}>✨</div>
      </div>
    );
    case 'rock': return (
      <div style={origin}>
        <div style={{ position:'absolute', fontSize:'2.6rem', filter:'drop-shadow(0 0 5px #a8a29e)', animation:`rock-throw-${d} 0.9s ease-in-out forwards` } as P}>🪨</div>
        <div style={{ position:'absolute', fontSize:'1.7rem', animation:`rock-throw-${d} 0.9s 0.12s ease-in-out forwards` } as P}>🪨</div>
        <div style={{ position:'absolute', fontSize:'1.5rem', filter:'drop-shadow(0 0 7px #fbbf24)', animation:`rock-throw-${d} 0.9s 0.22s ease-out forwards` } as P}>💥</div>
      </div>
    );
    case 'bug': return (
      <div style={origin}>
        {([0,1,2,3] as number[]).map(i => (
          <div key={i} style={{ position:'absolute', fontSize:'1.6rem',
            top:(i%2)*12-6, left:(Math.floor(i/2))*10-5,
            animation:`bug-swarm-${d} 1.1s ${(i*0.09).toFixed(2)}s ease-in-out forwards` } as P}>🐛</div>
        ))}
      </div>
    );
    default: return (
      <div style={origin}>
        {([{s:2,d2:'0s'},{s:1.5,d2:'0.08s'},{s:1.1,d2:'0.15s'},{s:.8,d2:'0.22s'}] as Array<{s:number,d2:string}>).map((p,i)=>(
          <div key={i} style={{ position:'absolute', fontSize:'1.5rem',
            filter:'drop-shadow(0 0 8px #fde047)', '--s':p.s,
            animation:`stream-${d} 0.9s ${p.d2} ease-out forwards` } as P}>⭐</div>
        ))}
        <div style={{ position:'absolute', fontSize:'1.5rem', '--s':2.2,
          animation:`stream-${d} 0.85s 0.02s ease-out forwards`,
          filter:'drop-shadow(0 0 10px #fbbf24)' } as P}>💥</div>
      </div>
    );
  }
}

// Helper to get PP array for a pokemon (4 moves), respecting custom move selection
function initPP(pokemonId: number, customIndices?: number[]): number[] {
  const rawMoves = getMoveListRaw(pokemonId, customIndices);
  if (rawMoves.length > 0) return rawMoves.map(m => m.pp ?? 15);
  return [15, 15, 15, 15];
}

type DisplayMove = { name: string; type: string; power: number; pp: number; category: string; description?: string; multiHit?: boolean; highCrit?: boolean; accuracy?: number };

// Helper to get move list for display, respecting custom move selection
function getMoveList(pokemonId: number, customIndices?: number[]): DisplayMove[] {
  return getMoveListRaw(pokemonId, customIndices) as DisplayMove[];
}

// ── Main component ───────────────────────────────────────────────────────────
export function BattleScreen({
  playerTeam, enemyTeam, bossName: _bossName, onBattleEnd,
  playerDamageMult = 1, isLeague = false,
  suppressVictorySound = false, keepMusic = false, keepMusicOnUnmount = false,
  onQuit, trainerImage, trainerColor, sideOverlay, pokemonData, pokemonMoves,
}: Props) {

  const initFighters = (team: TeamMember[], useCurrentHp: boolean): FighterState[] =>
    team.map(m => ({
      ...m,
      currentHp: useCurrentHp && m.currentHp > 0 ? m.currentHp : m.maxHp,
      currentPP: initPP(m.pokemonId, pokemonMoves?.[m.pokemonId]),
      stages: emptyStages(),
    }));

  const [playerFighters, setPlayerFighters] = useState<FighterState[]>(() => initFighters(playerTeam, true));
  const playerFightersRef = useRef<FighterState[]>(initFighters(playerTeam, true));
  const boostActiveRef = useRef(playerDamageMult > 1);
  const [boostActive, setBoostActive] = useState(playerDamageMult > 1);
  const [enemyFighters, setEnemyFighters] = useState<FighterState[]>(() => initFighters(enemyTeam, false));
  const [playerIdx, setPlayerIdx] = useState(0);
  const [enemyIdx, setEnemyIdx] = useState(0);
  const playerIdxRef = useRef(0);
  const enemyIdxRef = useRef(0);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [phase, setPhase] = useState<'intro' | 'player_turn' | 'resolving' | 'switch' | 'end'>('intro');
  const phaseRef = useRef<'intro' | 'player_turn' | 'resolving' | 'switch' | 'end'>('intro');
  const [attackEvt, setAttackEvt] = useState<AttackEvent | null>(null);
  const [floatingDmg, setFloatingDmg] = useState<FloatingDmg[]>([]);
  const [xpGains, setXpGains] = useState<Record<number, number>>({});
  const xpGainsRef = useRef<Record<number, number>>({});
  const [hitFlash, setHitFlash] = useState<'player' | 'enemy' | null>(null);
  const won = useRef(false);
  const battleDone = useRef(false);
  const enemyDmgRef = useRef<Record<number, number>>({});
  const [trainerKoAnim, setTrainerKoAnim] = useState(false);
  const prevEfHp = useRef<number | null>(null);
  const isMasterTrainer = trainerColor === '#a855f7';
  const [shinyIntro, setShinyIntro] = useState(false);
  const [shakePokemon, setShakePokemon] = useState<'player' | 'enemy' | null>(null);
  const [tooltipMoveIdx, setTooltipMoveIdx] = useState<number | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);
  const turnNumberRef = useRef(0);

  useEffect(() => { playerFightersRef.current = playerFighters; }, [playerFighters]);
  useEffect(() => { playerIdxRef.current = playerIdx; }, [playerIdx]);
  useEffect(() => { enemyIdxRef.current = enemyIdx; }, [enemyIdx]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { xpGainsRef.current = xpGains; }, [xpGains]);

  // Trainer KO reaction
  useEffect(() => {
    const hp = enemyFighters[enemyIdx]?.currentHp ?? null;
    if (hp !== null && prevEfHp.current !== null && prevEfHp.current > 0 && hp === 0) {
      setTrainerKoAnim(true);
      const t = setTimeout(() => setTrainerKoAnim(false), 900);
      return () => clearTimeout(t);
    }
    prevEfHp.current = hp;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enemyFighters, enemyIdx]);

  const [statusAnim, setStatusAnim] = useState<{ target: 'player' | 'enemy'; positive: boolean; uid: number } | null>(null);
  const addLog = useCallback((text: string, color = '#e2e8f0') => {
    setLog(prev => [...prev.slice(-8), { text, color }]);
  }, []);

  // Intro → battle
  useEffect(() => {
    if (phase !== 'intro') return;
    const hasShiny = [...playerTeam, ...enemyTeam].some(m => m.isShiny);
    if (!keepMusic) { if (isLeague) playLeagueBattleMusic(); else playBattleMusic(); }
    if (hasShiny) { playShinyBattleSfx(); setShinyIntro(true); setTimeout(() => setShinyIntro(false), 2500); }
    const t1 = setTimeout(() => {
      setShakePokemon('player');
      if (playerTeam[0]) playPokemonCry(playerTeam[0].pokemonId);
      setTimeout(() => setShakePokemon(null), 600);
    }, 1400);
    const t2 = setTimeout(() => {
      setShakePokemon('enemy');
      if (enemyTeam[0]) playPokemonCry(enemyTeam[0].pokemonId);
      setTimeout(() => setShakePokemon(null), 600);
    }, 2100);
    const t3 = setTimeout(() => { phaseRef.current = 'player_turn'; setPhase('player_turn'); }, 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => () => { if (!keepMusicOnUnmount) stopMusic(0.5); }, [keepMusicOnUnmount]);

  const addDmg = useCallback((value: number, target: 'player' | 'enemy', effectiveness: number, isCrit?: boolean, isMiss?: boolean) => {
    const id = dmgCounter++;
    setFloatingDmg(prev => [...prev, { id, value, target, effectiveness, isCrit, isMiss }]);
    setTimeout(() => setFloatingDmg(prev => prev.filter(d => d.id !== id)), 1100);
  }, []);

  const hpColor = (pct: number) => pct > 0.5 ? '#22c55e' : pct > 0.25 ? '#f59e0b' : '#ef4444';

  // Handle end phase
  useEffect(() => {
    if (phase === 'end') {
      const wonSnap = won.current;
      boostActiveRef.current = false;
      setBoostActive(false);
      if (!wonSnap) { stopMusic(0.3); if (!suppressVictorySound) playSfxDefeat(); }
      const snap = { ...xpGainsRef.current };
      const activeEarned = playerFightersRef.current.map(f => snap[f.pokemonId] ?? 0).filter(xp => xp > 0);
      const avgXp = activeEarned.length > 0
        ? Math.floor(activeEarned.reduce((a, b) => a + b, 0) / activeEarned.length) : 0;
      if (avgXp > 0) {
        playerTeam.forEach(m => { if (!snap[m.pokemonId]) snap[m.pokemonId] = Math.max(1, avgXp); });
      }
      const finalTeam: TeamMember[] = playerFightersRef.current.map(f => ({ ...f }));
      setTimeout(() => onBattleEnd(wonSnap, snap, finalTeam, enemyDmgRef.current), 1800);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const handleSwitch = useCallback((idx: number) => {
    playerIdxRef.current = idx;
    setPlayerIdx(idx);
    const name = POKEMON_BY_ID[playerFighters[idx]?.pokemonId]?.name ?? '???';
    addLog(`Allez ${name} !`, '#4ade80');
    setShakePokemon('player');
    if (playerFighters[idx]) playPokemonCry(playerFighters[idx].pokemonId);
    setTimeout(() => {
      setShakePokemon(null);
      phaseRef.current = 'player_turn';
      setPhase('player_turn');
    }, 700);
  }, [playerFighters, addLog]);

  // ── Core turn execution ──────────────────────────────────────────────────
  const executeTurn = useCallback((playerMoveIndex: number) => {
    if (battleDone.current || phaseRef.current !== 'player_turn') return;
    phaseRef.current = 'resolving';
    setPhase('resolving');

    const pIdx = playerIdxRef.current;
    const eIdx = enemyIdxRef.current;

    setPlayerFighters(pf => {
      setEnemyFighters(ef => {
        const pFighter = pf[pIdx];
        const eFighter = ef[eIdx];
        if (!pFighter || !eFighter) return ef;

        const pInst = pokemonData?.[pFighter.pokemonId];
        const eInst = pokemonData?.[eFighter.pokemonId];
        const pName = POKEMON_BY_ID[pFighter.pokemonId]?.name ?? '???';
        const eName = POKEMON_BY_ID[eFighter.pokemonId]?.name ?? '???';

        // Speed check — faster pokemon goes first
        const pSpeed = calcSpeed(pFighter.pokemonId, pFighter.level, pInst);
        const eSpeed = calcSpeed(eFighter.pokemonId, eFighter.level, eInst);
        const playerGoesFirst = pSpeed >= eSpeed;

        // Smart enemy AI — considers type effectiveness and stat boost priority
        const ePlayerTypes = (POKEMON_TYPE[pFighter.pokemonId] ?? ['normal']) as PokemonType[];
        const eMoveIndex = chooseEnemyMoveIndex(
          eFighter.pokemonId, ePlayerTypes, eFighter.currentPP, eFighter.stages, turnNumberRef.current
        );
        turnNumberRef.current++;

        // Check player PP
        const pHasMoves = getMoveList(pFighter.pokemonId, pokemonMoves?.[pFighter.pokemonId]).length > 0;
        const playerUsesStruggle = pHasMoves && pFighter.currentPP[playerMoveIndex] <= 0;

        // Deduct PP
        let newPPf = pf.map((f, i) => {
          if (i !== pIdx) return f;
          const pp = [...f.currentPP];
          if (!playerUsesStruggle && pHasMoves && pp[playerMoveIndex] > 0) pp[playerMoveIndex]--;
          return { ...f, currentPP: pp };
        });
        let newEf = ef.map((f, i) => {
          if (i !== eIdx || eMoveIndex < 0) return f;
          const pp = [...f.currentPP];
          if (pp[eMoveIndex] > 0) pp[eMoveIndex]--;
          return { ...f, currentPP: pp };
        });

        const boostMult = boostActiveRef.current && pIdx === 0 ? playerDamageMult : 1;

        // Compute both attacks (pass current stat stages)
        const pStages = { ...pFighter.stages, attack: pFighter.stages.attack + (boostMult > 1 ? 1 : 0) };
        const pResult = playerUsesStruggle
          ? calcStruggle(pFighter.pokemonId, pFighter.level, eFighter.pokemonId, eFighter.level, pInst, eInst)
          : calcDamage(pFighter.pokemonId, pFighter.level, eFighter.pokemonId, eFighter.level, playerMoveIndex, pInst, eInst, pStages, eFighter.stages, getMoveListRaw(pFighter.pokemonId, pokemonMoves?.[pFighter.pokemonId]));

        const eResult = eMoveIndex < 0
          ? calcStruggle(eFighter.pokemonId, eFighter.level, pFighter.pokemonId, pFighter.level, eInst, pInst)
          : calcDamage(eFighter.pokemonId, eFighter.level, pFighter.pokemonId, pFighter.level, eMoveIndex, eInst, pInst, eFighter.stages, pFighter.stages);

        // Execute attacks in speed order
        // Apply a statBoost to a fighter's stages (clamped −6 to +6)
        const applyBoost = (f: FighterState, boost: typeof pResult.statBoost): FighterState => {
          if (!boost) return f;
          const cur = f.stages[boost.stat as keyof typeof f.stages] ?? 0;
          const next = Math.max(-6, Math.min(6, cur + boost.stages));
          const label = boost.stages > 0 ? `↑ ${boost.stat}` : `↓ ${boost.stat}`;
          const dir = boost.stages > 0 ? '+' : '';
          addLog(`${dir}${boost.stages} ${label} !`, boost.stages > 0 ? '#4ade80' : '#f87171');
          return { ...f, stages: { ...f.stages, [boost.stat]: next } };
        };

        const hitsLabel = (r: typeof pResult) => r.hits > 1 ? ` (×${r.hits})` : '';

        const doPlayerAttack = (_pf: FighterState[], ef_: FighterState[]) => { void _pf;
          const pIsStatus = pResult.damage === 0 && !!pResult.statBoost;
          if (!pIsStatus) {
            setAttackEvt({ attacker: 'player', type: pResult.moveType, uid: dmgCounter++ });
            setTimeout(() => setAttackEvt(null), 400);
          }
          if (!pResult.isMiss && pResult.damage > 0) { setTimeout(() => setHitFlash('enemy'), 120); setTimeout(() => setHitFlash(null), 280); }
          if (pResult.damage > 0) addDmg(pResult.damage, 'enemy', pResult.effectiveness, pResult.isCrit, pResult.isMiss);
          if (pIsStatus && !pResult.isMiss) {
            const positive = pResult.statBoost!.target === 'self' ? pResult.statBoost!.stages > 0 : pResult.statBoost!.stages < 0;
            const animTarget = pResult.statBoost!.target === 'self' ? 'player' : 'enemy';
            setStatusAnim({ target: animTarget, positive, uid: dmgCounter++ });
            setTimeout(() => setStatusAnim(null), 900);
          }
          addLog(
            pResult.isMiss ? `${pName} rate !` :
            pResult.damage === 0 && pResult.statBoost ? `${pName} → ${pResult.moveName}` :
            `${pName} → ${pResult.moveName}${hitsLabel(pResult)} (${pResult.damage} dégâts)${pResult.isCrit ? ' ⚡ CRIT !' : ''}${pResult.effectiveness >= 2 ? ' 💥 Efficace !' : pResult.effectiveness === 0 ? ' (sans effet)' : pResult.effectiveness < 1 ? ' (peu eff.)' : ''}`,
            pResult.isMiss ? '#94a3b8' : pResult.isCrit ? '#fbbf24' : pResult.effectiveness >= 2 ? '#4ade80' : '#fde68a');
          let nextEf = ef_;
          // Apply player's statBoost to self
          if (pResult.statBoost?.target === 'self') {
            const updated = applyBoost(_pf[pIdx], pResult.statBoost);
            setPlayerFighters(prev => prev.map((f, i) => i === pIdx ? updated : f));
          }
          // Apply player's statBoost to foe
          if (pResult.statBoost?.target === 'foe') {
            nextEf = ef_.map((f, i) => i === eIdx ? applyBoost(f, pResult.statBoost!) : f);
          }
          const newEHp = Math.max(0, nextEf[eIdx].currentHp - pResult.damage);
          return nextEf.map((f, i) => i === eIdx ? { ...f, currentHp: newEHp } : f);
        };

        const doEnemyAttack = (pf_: FighterState[], _ef: FighterState[]) => { void _ef;
          const eIsStatus = eResult.damage === 0 && !!eResult.statBoost;
          if (!eIsStatus) {
            setAttackEvt({ attacker: 'enemy', type: eResult.moveType, uid: dmgCounter++ });
            setTimeout(() => setAttackEvt(null), 400);
          }
          if (!eResult.isMiss && eResult.damage > 0) { setTimeout(() => setHitFlash('player'), 120); setTimeout(() => setHitFlash(null), 280); }
          if (eResult.damage > 0) addDmg(eResult.damage, 'player', eResult.effectiveness, eResult.isCrit, eResult.isMiss);
          if (eIsStatus && !eResult.isMiss) {
            const positive = eResult.statBoost!.target === 'self' ? eResult.statBoost!.stages > 0 : eResult.statBoost!.stages < 0;
            const animTarget = eResult.statBoost!.target === 'self' ? 'enemy' : 'player';
            setStatusAnim({ target: animTarget, positive, uid: dmgCounter++ });
            setTimeout(() => setStatusAnim(null), 900);
          }
          addLog(
            eResult.isMiss ? `${eName} rate !` :
            eResult.damage === 0 && eResult.statBoost ? `${eName} → ${eResult.moveName}` :
            `${eName} → ${eResult.moveName}${hitsLabel(eResult)} (${eResult.damage} dégâts)${eResult.isCrit ? ' ⚡ CRIT !' : ''}${eResult.effectiveness >= 2 ? ' 💥 Efficace !' : ''}`,
            eResult.isMiss ? '#94a3b8' : eResult.isCrit ? '#fbbf24' : eResult.effectiveness >= 2 ? '#f87171' : '#fca5a5');
          let nextPf = pf_;
          // Apply enemy's statBoost to self
          if (eResult.statBoost?.target === 'self') {
            const updated = applyBoost(_ef[eIdx], eResult.statBoost!);
            setEnemyFighters(prev => prev.map((f, i) => i === eIdx ? updated : f));
          }
          // Apply enemy's statBoost to foe (player)
          if (eResult.statBoost?.target === 'foe') {
            nextPf = pf_.map((f, i) => i === pIdx ? applyBoost(f, eResult.statBoost!) : f);
          }
          const newPHp = Math.max(0, nextPf[pIdx].currentHp - eResult.damage);
          return nextPf.map((f, i) => i === pIdx ? { ...f, currentHp: newPHp } : f);
        };

        let finalPf = newPPf;
        let finalEf = newEf;

        if (playerGoesFirst) {
          finalEf = doPlayerAttack(finalPf, finalEf);
          if (finalEf[eIdx].currentHp > 0) {
            // Enemy attacks back after brief delay (handled below via setTimeout)
          }
        } else {
          finalPf = doEnemyAttack(finalPf, finalEf);
        }

        // Check outcomes after first attack
        const afterFirst_eKo = playerGoesFirst && finalEf[eIdx].currentHp <= 0;
        const afterFirst_pKo = !playerGoesFirst && finalPf[pIdx].currentHp <= 0;

        const finalizeTurn = (pf2: FighterState[], ef2: FighterState[], delayMs: number) => {
          setTimeout(() => {
            if (battleDone.current) return;

            // If enemy is KO after player's first strike
            if (ef2[eIdx].currentHp <= 0) {
              addLog(`${eName} est K.O. !`, '#f87171');
              const xpEarned = calcXpGain(eFighter.pokemonId, eFighter.level, !!_bossName);
              setXpGains(prev => {
                const next = { ...prev, [pFighter.pokemonId]: (prev[pFighter.pokemonId] ?? 0) + xpEarned };
                xpGainsRef.current = next;
                return next;
              });
              const nextE = ef2.findIndex((f, i) => i > eIdx && f.currentHp > 0);
              if (nextE < 0 && ef2.every(f => f.currentHp <= 0)) {
                battleDone.current = true; won.current = true;
                stopMusic(0);
                if (!suppressVictorySound) { isLeague ? playLeagueVictory() : playVictory(); }
                phaseRef.current = 'end'; setPhase('end');
              } else if (nextE >= 0) {
                enemyIdxRef.current = nextE;
                setEnemyIdx(nextE);
                phaseRef.current = 'player_turn'; setPhase('player_turn');
              }
              setPlayerFighters(() => pf2);
              setEnemyFighters(() => ef2);
              return;
            }

            // If player is KO after enemy's first strike
            if (pf2[pIdx].currentHp <= 0) {
              addLog(`${pName} est K.O. !`, '#f87171');
              enemyDmgRef.current[eFighter.pokemonId] = (enemyDmgRef.current[eFighter.pokemonId] ?? 0) + eResult.damage;
              if (pIdx === 0 && boostActiveRef.current) { boostActiveRef.current = false; setBoostActive(false); }
              const nextP = pf2.findIndex((f, i) => i > pIdx && f.currentHp > 0);
              if (nextP < 0 && pf2.every(f => f.currentHp <= 0)) {
                battleDone.current = true; won.current = false;
                phaseRef.current = 'end'; setPhase('end');
              } else {
                phaseRef.current = 'switch'; setPhase('switch');
              }
              setPlayerFighters(() => pf2);
              setEnemyFighters(() => ef2);
              return;
            }

            // Both alive — do second attack
            let pf3 = pf2;
            let ef3 = ef2;
            if (playerGoesFirst) {
              pf3 = doEnemyAttack(pf2, ef2);
            } else {
              ef3 = doPlayerAttack(pf2, ef2);
            }

            // Check KOs after second attack
            if (ef3[eIdx].currentHp <= 0) {
              addLog(`${eName} est K.O. !`, '#f87171');
              const xpEarned = calcXpGain(eFighter.pokemonId, eFighter.level, !!_bossName);
              setXpGains(prev => {
                const next = { ...prev, [pFighter.pokemonId]: (prev[pFighter.pokemonId] ?? 0) + xpEarned };
                xpGainsRef.current = next;
                return next;
              });
              const nextE = ef3.findIndex((f, i) => i > eIdx && f.currentHp > 0);
              if (nextE < 0 && ef3.every(f => f.currentHp <= 0)) {
                battleDone.current = true; won.current = true;
                stopMusic(0);
                if (!suppressVictorySound) { isLeague ? playLeagueVictory() : playVictory(); }
                phaseRef.current = 'end'; setPhase('end');
              } else if (nextE >= 0) {
                enemyIdxRef.current = nextE;
                setEnemyIdx(nextE);
                phaseRef.current = 'player_turn'; setPhase('player_turn');
              }
            } else if (pf3[pIdx].currentHp <= 0) {
              addLog(`${pName} est K.O. !`, '#f87171');
              enemyDmgRef.current[eFighter.pokemonId] = (enemyDmgRef.current[eFighter.pokemonId] ?? 0) + eResult.damage;
              if (pIdx === 0 && boostActiveRef.current) { boostActiveRef.current = false; setBoostActive(false); }
              const nextP = pf3.findIndex((f, i) => i > pIdx && f.currentHp > 0);
              if (nextP < 0 && pf3.every(f => f.currentHp <= 0)) {
                battleDone.current = true; won.current = false;
                phaseRef.current = 'end'; setPhase('end');
              } else {
                phaseRef.current = 'switch'; setPhase('switch');
              }
            } else {
              // Both alive, player's turn again
              phaseRef.current = 'player_turn'; setPhase('player_turn');
            }

            setPlayerFighters(() => pf3);
            setEnemyFighters(() => ef3);
          }, delayMs);
        };

        if (afterFirst_eKo || afterFirst_pKo) {
          finalizeTurn(finalPf, finalEf, 600);
        } else {
          // Second attack happens after animation delay
          finalizeTurn(finalPf, finalEf, playerGoesFirst ? 1200 : 600);
        }

        return finalEf;
      });
      return pf;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerIdx, enemyIdx, addLog, addDmg, pokemonData]);

  const activePF = playerFighters[playerIdx];
  const activeEF = enemyFighters[enemyIdx];
  const playerMoves = activePF ? getMoveList(activePF.pokemonId, pokemonMoves?.[activePF.pokemonId]) : [];
  const allPPEmpty = activePF ? activePF.currentPP.every(pp => pp <= 0) : false;

  // Long press handlers
  const startLongPress = (idx: number) => {
    longPressFiredRef.current = false;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      setTooltipMoveIdx(idx);
    }, 700);
  };
  const endLongPress = (idx: number) => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    if (longPressFiredRef.current) return; // long press showed tooltip — do nothing on release
    if (tooltipMoveIdx !== null) { setTooltipMoveIdx(null); return; } // close tooltip on tap
    if (phase === 'player_turn') executeTurn(idx);
  };

  // ── INTRO PHASE ─────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="fixed inset-0 z-[600] flex flex-col" style={{ background: '#020617' }}>
        {sideOverlay && <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 35 }}>{sideOverlay}</div>}
        <div className="relative flex-1 overflow-hidden">
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(ellipse at 50% 20%, #1e1b4b 0%, #0f0720 55%, #020617 100%)',
          }} />

          {/* Enemy pokemon */}
          <div className="absolute" style={{ top:'calc(5% + env(safe-area-inset-top, 0px))', right:'max(7%, calc(50% - 220px))', animation:'battle-enter-enemy 0.7s cubic-bezier(.175,.885,.32,1.275) forwards' }}>
            <div className="bg-black/75 rounded-xl px-3 py-2 border border-slate-600/50 mb-2 min-w-[140px]">
              <div className="flex items-center gap-1.5 mb-1">
                {trainerImage && (
                  <img src={trainerImage} alt="" draggable={false}
                    style={{ width: 30, height: 40, objectFit: 'contain', objectPosition: 'top center', flexShrink: 0,
                      filter: isMasterTrainer ? `drop-shadow(0 0 6px ${trainerColor})` : 'drop-shadow(0 1px 4px rgba(0,0,0,0.8))',
                      animation: isMasterTrainer ? 'trainer-master-float 2s ease-in-out infinite' : undefined,
                    }} />
                )}
                <div className="flex flex-1 justify-between items-center">
                  <span className="text-white font-black text-sm">{POKEMON_BY_ID[enemyFighters[0]?.pokemonId ?? 0]?.name ?? '???'}</span>
                  <span className="text-slate-400 text-xs">Nv.{enemyFighters[0]?.level}</span>
                </div>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2.5">
                <div className="h-2.5 rounded-full" style={{ width:'100%', background:'#22c55e' }} />
              </div>
            </div>
            <div className="flex justify-end">
              {enemyFighters[0] && (
                <div className="relative inline-flex items-center justify-center"
                  style={shakePokemon === 'enemy' ? { animation: 'pokemon-shake 0.6s ease-in-out' } : undefined}>
                  <ShinySprite pokemonId={enemyFighters[0].pokemonId} isShiny={enemyFighters[0].isShiny ?? false} width={88} height={88} flip
                    style={{ filter: spriteFilter(enemyFighters[0].pokemonId, enemyFighters[0].isShiny ?? false) }} />
                  {shinyIntro && enemyFighters[0].isShiny && SHINY_INTRO_STARS.map((s, i) => (
                    <div key={i} style={{ position:'absolute', left:'50%', top:'50%', width:0, height:0, zIndex:10,
                      animation:`${s.anim} ${s.dur} ${s.delay} linear infinite` } as React.CSSProperties}>
                      <span style={{ position:'absolute', transform:'translate(-50%,-50%)', color:s.color, fontSize:s.size,
                        fontWeight:900, textShadow:`0 0 8px ${s.color}`, lineHeight:1, userSelect:'none' }}>{s.sym}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Player pokemon */}
          <div className="absolute" style={{ bottom:'13%', left:'max(7%, calc(50% - 220px))', animation:'battle-enter-player 0.7s cubic-bezier(.175,.885,.32,1.275) forwards' }}>
            {playerFighters[0] && (
              <div className="relative inline-flex items-center justify-center"
                style={shakePokemon === 'player' ? { animation: 'pokemon-shake 0.6s ease-in-out' } : undefined}>
                <ShinySprite pokemonId={playerFighters[0].pokemonId} isShiny={playerFighters[0].isShiny ?? false} width={96} height={96}
                  style={{ filter: spriteFilter(playerFighters[0].pokemonId, playerFighters[0].isShiny ?? false) }} />
                {shinyIntro && playerFighters[0].isShiny && SHINY_INTRO_STARS.map((s, i) => (
                  <div key={i} style={{ position:'absolute', left:'50%', top:'50%', width:0, height:0, zIndex:10,
                    animation:`${s.anim} ${s.dur} ${s.delay} linear infinite` } as React.CSSProperties}>
                    <span style={{ position:'absolute', transform:'translate(-50%,-50%)', color:s.color, fontSize:s.size,
                      fontWeight:900, textShadow:`0 0 8px ${s.color}`, lineHeight:1, userSelect:'none' }}>{s.sym}</span>
                  </div>
                ))}
              </div>
            )}
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
    <div className="fixed inset-0 z-[600] flex flex-col" style={{ background: '#020617' }}>
      {sideOverlay && <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 35 }}>{sideOverlay}</div>}

      {/* ── Arena ── */}
      <div className="relative overflow-hidden" style={{ flex: '1 1 0', minHeight: 0 }}>
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at 50% 20%, #1e1b4b 0%, #0f0720 55%, #020617 100%)',
        }} />
        {STARS.map((s, i) => (
          <div key={i} className="absolute rounded-full bg-white pointer-events-none" style={{
            width: s.size, height: s.size, top: `${s.top}%`, left: `${s.left}%`,
            opacity: s.opacity, animation: `arena-twinkle ${s.dur}s ease-in-out ${s.del}s infinite`,
          }} />
        ))}
        <div className="absolute inset-x-0 top-0 pointer-events-none" style={{
          height: '55%', background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.07) 0%, transparent 70%)',
        }} />
        <div className="absolute bottom-0 inset-x-0 pointer-events-none" style={{
          height: '38%', background: 'linear-gradient(to top, rgba(30,27,75,0.85) 0%, transparent 100%)',
        }} />
        <div className="absolute inset-y-0 pointer-events-none" style={{
          left: '50%', width: 1, background: 'linear-gradient(to bottom, transparent, rgba(148,163,184,0.12), transparent)',
        }} />

        {/* Platform enemy */}
        <div className="absolute pointer-events-none" style={{
          top: '38%', right: 'max(12%, calc(50% - 200px))', width: 110, height: 22,
          background: 'radial-gradient(ellipse, rgba(248,113,113,0.55) 0%, transparent 100%)',
          borderRadius: '50%', filter: 'blur(5px)', animation: 'platform-pulse 2.2s ease-in-out infinite',
        }} />
        {/* Platform player */}
        <div className="absolute pointer-events-none" style={{
          bottom: '28%', left: 'max(12%, calc(50% - 200px))', width: 110, height: 22,
          background: 'radial-gradient(ellipse, rgba(74,222,128,0.55) 0%, transparent 100%)',
          borderRadius: '50%', filter: 'blur(5px)', animation: 'platform-pulse 2.2s ease-in-out 0.4s infinite',
        }} />

        {attackEvt && <TypeVfx key={attackEvt.uid} type={attackEvt.type} direction={attackEvt.attacker === 'player' ? 'ltr' : 'rtl'} uid={attackEvt.uid} />}
        {hitFlash && <div className="absolute inset-0 pointer-events-none battle-hit-flash" style={{ background: hitFlash === 'player' ? 'rgba(239,68,68,0.2)' : 'rgba(250,204,21,0.13)' }} />}
        {/* Status move animation */}
        {statusAnim && (() => {
          const isEnemy = statusAnim.target === 'enemy';
          const style: React.CSSProperties = isEnemy
            ? { position: 'absolute', top: 'calc(5% + env(safe-area-inset-top,0px) + 60px)', right: 'max(9%, calc(50% - 200px))', pointerEvents: 'none' as const, zIndex: 30 }
            : { position: 'absolute', bottom: 'calc(14% + 60px)', left: 'max(9%, calc(50% - 200px))', pointerEvents: 'none' as const, zIndex: 30 };
          const color = statusAnim.positive ? '#4ade80' : '#f87171';
          const icons = statusAnim.positive ? ['⬆️','✨','💫'] : ['⬇️','💢','‼️'];
          return (
            <div key={statusAnim.uid} style={style}>
              {icons.map((icon, i) => (
                <span key={i} style={{
                  position: 'absolute', fontSize: '1.6rem',
                  left: `${(i - 1) * 28}px`, top: 0,
                  animation: `status-burst-${i % 2 === 0 ? 'a' : 'b'} 0.9s ease-out forwards`,
                  filter: `drop-shadow(0 0 6px ${color})`,
                }}>{icon}</span>
              ))}
            </div>
          );
        })()}

        {/* Floating damage */}
        {floatingDmg.map(d => {
          const color = d.isMiss ? '#94a3b8' : d.isCrit ? '#fbbf24' : d.effectiveness === 0 ? '#94a3b8' : '#ef4444';
          const pos = d.target === 'enemy'
            ? { top: '14%', right: 'max(7%, calc(50% - 220px))' }
            : { bottom: '32%', left: 'max(7%, calc(50% - 220px))' };
          return (
            <div key={d.id} className="absolute pointer-events-none" style={{
              ...pos, zIndex: 20,
              fontSize: d.isCrit ? '1.8rem' : d.effectiveness >= 2 ? '1.6rem' : '1.2rem',
              fontWeight: 900, color,
              textShadow: d.isCrit ? `0 0 18px #fbbf24, 0 0 32px #f59e0b` : `0 0 12px ${color}`,
              animation: 'dmg-float 1.1s ease-out forwards', transform: 'translateX(-50%)',
            }}>
              {d.isMiss ? 'RATÉ!' : `−${d.value}`}
              {d.isCrit && <div style={{ fontSize: '0.6rem', textAlign: 'center', color: '#fde047', letterSpacing: '0.1em' }}>CRITIQUE !</div>}
              {!d.isMiss && !d.isCrit && d.effectiveness >= 2 && <div style={{ fontSize: '0.55rem', textAlign: 'center' }}>SUPER EFFICACE</div>}
            </div>
          );
        })}

        {/* Enemy info + sprite */}
        <div className="absolute" style={{ top: 'calc(5% + env(safe-area-inset-top, 0px))', right: 'max(7%, calc(50% - 220px))' }}>
          <div className="bg-black/75 rounded-xl px-3 py-2 border border-slate-600/50 mb-2 min-w-[140px]"
            style={{ borderColor: isMasterTrainer ? `${trainerColor}55` : undefined, boxShadow: isMasterTrainer ? `0 0 12px ${trainerColor}33` : undefined }}>
            <div className="flex items-center gap-1.5 mb-1">
              {trainerImage && (
                <div style={{ flexShrink: 0, position: 'relative' }}>
                  {isMasterTrainer && <div style={{ position: 'absolute', inset: -3, borderRadius: 4, background: `radial-gradient(ellipse, ${trainerColor}55 0%, transparent 70%)`, animation: 'trainer-master-float 2s ease-in-out infinite' }} />}
                  <img src={trainerImage} alt="" draggable={false}
                    style={{ width: 28, height: 38, objectFit: 'contain', objectPosition: 'top center', display: 'block', position: 'relative',
                      filter: isMasterTrainer ? `drop-shadow(0 0 5px ${trainerColor}) drop-shadow(0 0 10px ${trainerColor}88)` : 'drop-shadow(0 1px 4px rgba(0,0,0,0.9))',
                      animation: trainerKoAnim ? 'trainer-ko-react 0.9s ease-out' : isMasterTrainer ? 'trainer-master-float 2s ease-in-out infinite' : undefined,
                    }} />
                </div>
              )}
              <div className="flex flex-1 justify-between items-center min-w-0">
                <span className="text-white font-black text-sm truncate">{POKEMON_BY_ID[activeEF?.pokemonId ?? 0]?.name ?? '???'}</span>
                <span className="text-slate-400 text-xs ml-1 shrink-0">Nv.{activeEF?.level}</span>
              </div>
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
            {activeEF && <ShinySprite pokemonId={activeEF.pokemonId} isShiny={activeEF.isShiny ?? false} width={88} height={88} flip
              style={{ filter: spriteFilter(activeEF.pokemonId, activeEF.isShiny ?? false) }} />}
          </div>
          <div className="flex gap-1.5 justify-end mt-1">
            {enemyFighters.map((f, i) => (
              <div key={i} className={`w-3 h-3 rounded-full ${i === enemyIdx ? 'ring-2 ring-white' : ''} ${f.currentHp > 0 ? 'bg-red-400' : 'bg-slate-600'}`} />
            ))}
          </div>
        </div>

        {/* Player info + sprite */}
        <div className="absolute" style={{ bottom: '13%', left: 'max(7%, calc(50% - 220px))' }}>
          <div className="flex gap-1.5 mb-1">
            {playerFighters.map((f, i) => (
              <div key={i} className={`w-3 h-3 rounded-full ${i === playerIdx ? 'ring-2 ring-white' : ''} ${f.currentHp > 0 ? 'bg-green-400' : 'bg-slate-600'}`} />
            ))}
          </div>
          <div className={`${attackEvt?.attacker === 'player' ? 'battle-lunge-right' : ''} ${activePF?.currentHp === 0 ? 'opacity-30' : ''}`}>
            {activePF && <ShinySprite pokemonId={activePF.pokemonId} isShiny={activePF.isShiny ?? false} width={96} height={96}
              style={{ filter: spriteFilter(activePF.pokemonId, activePF.isShiny ?? false, 12) }} />}
          </div>
          <div className="bg-black/75 rounded-xl px-3 py-2 border border-slate-600/50 mt-2 min-w-[140px]">
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-1 min-w-0">
                <span className="text-white font-black text-sm truncate">{POKEMON_BY_ID[activePF?.pokemonId ?? 0]?.name ?? '???'}</span>
                {boostActive && playerIdx === 0 && (
                  <span className="font-black shrink-0" style={{ fontSize: '0.48rem', color: '#f87171' }}>⚔️+25%</span>
                )}
              </div>
              <span className="text-slate-400 text-xs shrink-0 ml-1">Nv.{activePF?.level}</span>
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

        {/* VS faded */}
        {phase !== 'end' && (
          <div className="absolute inset-x-0 top-1/2 flex justify-center pointer-events-none" style={{ transform: 'translateY(-50%)' }}>
            <div className="text-slate-500/30 font-black text-6xl">VS</div>
          </div>
        )}

        {/* End banner */}
        {phase === 'end' && (
          <>
            {won.current && CONFETTI_BATTLE.map((c, i) => (
              <div key={i} style={{
                position: 'absolute', top: 0, left: c.left, width: 9, height: 9, borderRadius: 2, background: c.color,
                '--cx': c.cx, '--cdx': c.cdx, '--cr': c.cr,
                animation: `confetti-fall ${c.dur} ${c.delay} ease-in forwards`,
                pointerEvents: 'none', zIndex: 24,
              } as React.CSSProperties} />
            ))}
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

        {/* Switch overlay */}
        {phase === 'switch' && (
          <div className="absolute inset-0 z-30 bg-black/80 flex flex-col items-center justify-center gap-4 px-6">
            <div className="text-white font-black text-xl text-center">Choisissez votre prochain Pokémon !</div>
            <div className="flex gap-3 flex-wrap justify-center">
              {playerFighters.map((f, i) => {
                if (f.currentHp <= 0 || i === playerIdx) return null;
                const p = POKEMON_BY_ID[f.pokemonId];
                const hpPct = f.currentHp / f.maxHp;
                return (
                  <button key={i} onClick={() => handleSwitch(i)}
                    className="flex flex-col items-center bg-slate-800/90 border-2 border-slate-500 hover:border-yellow-400 rounded-2xl px-4 py-3 transition-all hover:scale-105">
                    <ShinySprite pokemonId={f.pokemonId} isShiny={f.isShiny ?? false} width={64} height={64} compact
                      style={{ filter: spriteFilter(f.pokemonId, f.isShiny ?? false, 6) }} />
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

      {/* ── Battle log + Move buttons ── */}
      <div className="shrink-0 border-t border-slate-700/40" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)', background: 'linear-gradient(180deg, rgba(10,12,28,0.97) 0%, rgba(5,8,20,0.99) 100%)' }}>
        {/* Log */}
        <div className="px-4 pt-2 pb-1 flex flex-col gap-0.5" style={{ minHeight: 76, maxHeight: 100, overflow: 'hidden', justifyContent: 'flex-end' }}>
          {log.slice(-4).map((entry, i, arr) => (
            <div key={i} className="text-xs font-medium leading-tight" style={{ color: entry.color, opacity: 0.35 + (i / (arr.length - 1 || 1)) * 0.65 }}>
              {entry.text}
            </div>
          ))}
        </div>

        {/* Long press tooltip */}
        {tooltipMoveIdx !== null && playerMoves[tooltipMoveIdx] && (() => {
          const m = playerMoves[tooltipMoveIdx];
          const pp = activePF?.currentPP[tooltipMoveIdx] ?? 0;
          const typeColor = TYPE_COLORS[m.type as PokemonType] ?? '#475569';
          return (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70"
              onPointerUp={() => setTooltipMoveIdx(null)}
              onTouchEnd={() => setTooltipMoveIdx(null)}>
              <div className="mx-4 rounded-2xl p-4 max-w-xs w-full"
                style={{ background: '#0f172a', border: `2px solid ${typeColor}`, boxShadow: `0 0 24px ${typeColor}66` }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-black text-white text-base">{m.name}</span>
                  <span className="px-2 py-0.5 rounded text-white font-bold text-xs" style={{ background: typeColor }}>{m.type.toUpperCase()}</span>
                  {m.highCrit && <span className="text-yellow-400 text-xs">⚡ Crit+</span>}
                  {m.multiHit && <span className="text-purple-400 text-xs">×2–5</span>}
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                  <div className="bg-slate-800 rounded-lg py-1.5">
                    <div className="text-slate-400 text-xs">Puissance</div>
                    <div className="text-white font-black">{m.power > 0 ? m.power : '—'}</div>
                  </div>
                  <div className="bg-slate-800 rounded-lg py-1.5">
                    <div className="text-slate-400 text-xs">Précision</div>
                    <div className="text-white font-black">{m.accuracy ?? 100}%</div>
                  </div>
                  <div className="bg-slate-800 rounded-lg py-1.5">
                    <div className="text-slate-400 text-xs">PP</div>
                    <div className="font-black" style={{ color: pp === 0 ? '#ef4444' : pp <= 2 ? '#f59e0b' : '#4ade80' }}>{pp}/{m.pp}</div>
                  </div>
                </div>
                <div className="text-slate-400 text-xs mb-1 uppercase tracking-wide">
                  {m.category === 'status' ? 'Statut' : m.category === 'physical' ? 'Physique' : 'Spécial'}
                </div>
                {m.description && <div className="text-slate-200 text-sm">{m.description}</div>}
                <div className="mt-3 text-center text-slate-500 text-xs">Relâchez pour fermer</div>
              </div>
            </div>
          );
        })()}

        {/* Move selection — shown during player_turn */}
        {(phase === 'player_turn' || phase === 'resolving') && (
          <div className="px-3 pb-3">
            {playerMoves.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {playerMoves.map((move, i) => {
                  const pp = activePF?.currentPP[i] ?? 0;
                  const disabled = phase === 'resolving' || pp <= 0;
                  const typeColor = TYPE_COLORS[move.type as PokemonType] ?? '#475569';
                  return (
                    <button key={i}
                      disabled={disabled}
                      onPointerDown={() => !disabled && startLongPress(i)}
                      onPointerUp={() => !disabled && endLongPress(i)}
                      onPointerLeave={() => { if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressFiredRef.current = false; } }}
                      onTouchStart={e => { e.preventDefault(); !disabled && startLongPress(i); }}
                      onTouchEnd={e => { e.preventDefault(); !disabled && endLongPress(i); }}
                      onClick={e => e.preventDefault()}
                      className="relative rounded-xl px-3 py-2 text-left select-none"
                      style={{
                        background: disabled ? '#1e293b' : `linear-gradient(135deg, ${typeColor}cc, ${typeColor}66)`,
                        border: `2px solid ${disabled ? '#334155' : typeColor}`,
                        opacity: disabled ? 0.5 : 1,
                        WebkitTapHighlightColor: 'transparent',
                      }}>
                      <div className="flex justify-between items-start">
                        <span className="text-white font-bold text-xs leading-tight">{move.name}</span>
                        <span className="text-white/60 text-xs">{pp}/{move.pp ?? 15}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        <span className="text-white/70 uppercase font-bold" style={{ fontSize: '0.45rem' }}>{move.type}</span>
                        <span className="text-white/50" style={{ fontSize: '0.45rem' }}>•</span>
                        <span className="text-white/70" style={{ fontSize: '0.45rem' }}>
                          {move.category === 'status' ? 'STATUT' : move.category === 'physical' ? 'PHYS' : 'SPÉ'}
                        </span>
                        {move.power > 0 && <><span className="text-white/50" style={{ fontSize: '0.45rem' }}>•</span><span className="text-white/70" style={{ fontSize: '0.45rem' }}>{move.power}</span></>}
                        {move.highCrit && <span className="text-yellow-300" style={{ fontSize: '0.45rem' }}>⚡</span>}
                        {move.multiHit && <span className="text-purple-300" style={{ fontSize: '0.45rem' }}>×2-5</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : allPPEmpty ? (
              <button
                disabled={phase === 'resolving'}
                onPointerUp={() => phase === 'player_turn' && executeTurn(0)}
                className="w-full rounded-xl px-4 py-3 text-center"
                style={{ background: '#374151', border: '2px solid #6b7280', opacity: phase === 'resolving' ? 0.5 : 1 }}>
                <span className="text-white font-bold text-sm">Lutte</span>
                <div className="text-white/50 text-xs">Plus de PP !</div>
              </button>
            ) : null}

            {onQuit && phase === 'player_turn' && (
              <button onClick={onQuit} className="mt-2 w-full text-xs text-slate-500 hover:text-slate-300 transition-colors py-1">
                ✕ Fuir le combat
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
