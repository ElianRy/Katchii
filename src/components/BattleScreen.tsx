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
  damage: number;
  effectiveness: number;
  uid: number;
}

interface FloatingDmg {
  id: number;
  value: number;
  target: 'player' | 'enemy';
  effectiveness: number;
}

// Type particles (5 per attack)
const TYPE_EMOJIS: Record<PokemonType, string[]> = {
  fire:     ['🔥','🔥','💥','✨','🔥'],
  water:    ['💧','💧','🌊','💦','💧'],
  electric: ['⚡','⚡','✨','⚡','💛'],
  grass:    ['🍃','🌿','🌱','🍃','🌿'],
  ice:      ['❄️','❄️','💎','❄️','🔷'],
  psychic:  ['🔮','✨','⭐','🔮','💫'],
  fighting: ['💥','⭐','💢','💥','⚡'],
  poison:   ['💜','🟣','✨','💀','💜'],
  ground:   ['🪨','💥','🪨','💥','⬛'],
  flying:   ['🌪️','🍃','💨','🌪️','✨'],
  bug:      ['🍃','🐛','⚡','✨','🍃'],
  rock:     ['🪨','💥','🪨','⭐','💥'],
  ghost:    ['👻','💀','✨','👾','💜'],
  dragon:   ['🐉','✨','💫','⭐','🔥'],
  normal:   ['⭐','💥','✨','⭐','💫'],
};

const TYPE_BG: Record<PokemonType, string> = {
  fire:'#f9731630', water:'#60a5fa30', electric:'#fbbf2430', grass:'#4ade8030',
  ice:'#a5f3fc30', psychic:'#f472b630', fighting:'#ef444430', poison:'#a855f730',
  ground:'#d9770630', flying:'#a78bfa30', bug:'#84cc1630', rock:'#a1620730',
  ghost:'#7c3aed30', dragon:'#4f46e530', normal:'#d1d5db30',
};

// Precomputed arena stars (avoid re-random on render)
const STARS = Array.from({ length: 40 }, (_, i) => ({
  size: 1 + (i * 0.7) % 2.5,
  top: (i * 37 + 7) % 60,
  left: (i * 53 + 11) % 100,
  opacity: 0.2 + (i * 0.23) % 0.7,
  dur: 1.5 + (i * 0.4) % 2.5,
  del: (i * 0.37) % 2.5,
}));

const TURN_DELAY_MS = 1500;
let dmgCounter = 0;

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
  const [phase, setPhase] = useState<'battle' | 'end'>('battle');
  const [attackEvt, setAttackEvt] = useState<AttackEvent | null>(null);
  const [floatingDmg, setFloatingDmg] = useState<FloatingDmg[]>([]);
  const [xpGains, setXpGains] = useState<Record<number, number>>({});
  const [hitFlash, setHitFlash] = useState<'player' | 'enemy' | null>(null);
  const won = useRef(false);
  const battleDone = useRef(false);

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
      if (battleDone.current) return;

      setPlayerFighters(pf => {
        setEnemyFighters(ef => {
          const pFighter = pf[playerIdx];
          const eFighter = ef[enemyIdx];
          if (!pFighter || !eFighter || pFighter.currentHp <= 0 || eFighter.currentHp <= 0) return ef;

          const pName = POKEMON_BY_ID[pFighter.pokemonId]?.name ?? '???';
          const eName = POKEMON_BY_ID[eFighter.pokemonId]?.name ?? '???';
          const pType = (POKEMON_TYPE[pFighter.pokemonId] ?? ['normal'])[0] as PokemonType;

          const { damage: pDmg, effectiveness: pEff, moveName: pMove } = calcDamage(
            pFighter.pokemonId, pFighter.level, eFighter.pokemonId, eFighter.level
          );

          setAttackEvt({ attacker: 'player', type: pType, damage: pDmg, effectiveness: pEff, uid: dmgCounter++ });
          setTimeout(() => setHitFlash('enemy'), 300);
          setTimeout(() => setHitFlash(null), 550);
          addDmg(pDmg, 'enemy', pEff);
          addLog(`${pName} → ${pMove}${pEff >= 2 ? ' 💥 Super efficace !' : pEff === 0 ? ' (sans effet)' : pEff < 1 ? ' (peu efficace)' : ''}`, pEff >= 2 ? '#4ade80' : '#fde68a');

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

          // Enemy counter-attack
          setTimeout(() => {
            if (battleDone.current) return;
            const eType = (POKEMON_TYPE[eFighter.pokemonId] ?? ['normal'])[0] as PokemonType;
            const { damage: eDmg, effectiveness: eEff, moveName: eMove } = calcDamage(
              eFighter.pokemonId, eFighter.level, pFighter.pokemonId, pFighter.level
            );
            setAttackEvt({ attacker: 'enemy', type: eType, damage: eDmg, effectiveness: eEff, uid: dmgCounter++ });
            setTimeout(() => setHitFlash('player'), 300);
            setTimeout(() => setHitFlash(null), 550);
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
                } else if (nextP >= 0) setTimeout(() => setPlayerIdx(nextP), 600);
              }
              return newPf;
            });
            setTimeout(() => setAttackEvt(null), 600);
          }, TURN_DELAY_MS / 2);

          return newEf;
        });
        return pf;
      });
    };

    if (phase !== 'battle' || battleDone.current) return;
    const timer = setInterval(() => { if (battleDone.current) { clearInterval(timer); return; } runTurn(); }, TURN_DELAY_MS);
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

  const activePF = playerFighters[playerIdx];
  const activeEF = enemyFighters[enemyIdx];

  // HP bar color
  const hpColor = (pct: number) => pct > 0.5 ? '#22c55e' : pct > 0.25 ? '#f59e0b' : '#ef4444';

  return (
    <div className="fixed inset-0 z-60 flex flex-col" style={{ background: '#020617' }}>

      {/* ── Arena ── */}
      <div className="relative flex-1 overflow-hidden">

        {/* Sky & stars */}
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

        {/* Stadium arc suggestion */}
        <div className="absolute inset-x-0 top-0 pointer-events-none" style={{
          height: '55%',
          background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.07) 0%, transparent 70%)',
        }} />

        {/* Arena floor */}
        <div className="absolute bottom-0 inset-x-0 pointer-events-none" style={{
          height: '38%',
          background: 'linear-gradient(to top, rgba(30,27,75,0.85) 0%, transparent 100%)',
        }} />

        {/* Center divider glow */}
        <div className="absolute inset-y-0 pointer-events-none" style={{
          left: '50%', width: 1,
          background: 'linear-gradient(to bottom, transparent, rgba(148,163,184,0.15), transparent)',
        }} />

        {/* Platform — enemy (top-right) */}
        <div className="absolute pointer-events-none" style={{
          top: '38%', right: '12%', width: 110, height: 22,
          background: 'radial-gradient(ellipse, rgba(248,113,113,0.55) 0%, transparent 100%)',
          borderRadius: '50%', filter: 'blur(5px)',
          animation: 'platform-pulse 2.2s ease-in-out infinite',
        }} />

        {/* Platform — player (bottom-left) */}
        <div className="absolute pointer-events-none" style={{
          bottom: '28%', left: '12%', width: 110, height: 22,
          background: 'radial-gradient(ellipse, rgba(74,222,128,0.55) 0%, transparent 100%)',
          borderRadius: '50%', filter: 'blur(5px)',
          animation: 'platform-pulse 2.2s ease-in-out 0.4s infinite',
        }} />

        {/* ── Attack type flash bg ── */}
        {attackEvt && (
          <div key={attackEvt.uid + '-bg'} className="absolute inset-0 pointer-events-none battle-hit-flash" style={{
            background: TYPE_BG[attackEvt.type],
          }} />
        )}

        {/* ── Type particles ── */}
        {attackEvt && (() => {
          const ltr = attackEvt.attacker === 'player';
          const emojis = TYPE_EMOJIS[attackEvt.type];
          // particles start near attacker, fly across
          const startTop = ['43%', '52%', '38%', '58%', '48%'];
          const startLeft = ltr ? ['22%', '25%', '20%', '27%', '23%'] : ['72%', '69%', '74%', '67%', '71%'];
          return emojis.map((e, i) => (
            <div
              key={attackEvt.uid + '-p' + i}
              className="absolute pointer-events-none select-none"
              style={{
                top: startTop[i], left: startLeft[i],
                fontSize: i === 0 ? '1.6rem' : '1.1rem',
                zIndex: 10,
                animation: `p-${ltr ? 'ltr' : 'rtl'}-${i} 0.65s ${i * 0.06}s ease-out forwards`,
              }}
            >{e}</div>
          ));
        })()}

        {/* ── Hit flash screen tint ── */}
        {hitFlash && (
          <div className="absolute inset-0 pointer-events-none battle-hit-flash" style={{
            background: hitFlash === 'player' ? 'rgba(239,68,68,0.18)' : 'rgba(250,204,21,0.12)',
          }} />
        )}

        {/* ── Damage numbers ── */}
        {floatingDmg.map(d => {
          const color = d.effectiveness >= 2 ? '#4ade80' : d.effectiveness === 0 ? '#94a3b8' : d.effectiveness < 1 ? '#fb923c' : '#fde047';
          const pos = d.target === 'enemy'
            ? { top: '25%', right: '12%' }
            : { bottom: '28%', left: '18%' };
          return (
            <div key={d.id} className="absolute pointer-events-none" style={{
              ...pos, zIndex: 20,
              fontSize: d.effectiveness >= 2 ? '1.5rem' : '1.2rem',
              fontWeight: 900, color,
              textShadow: `0 0 12px ${color}`,
              animation: 'dmg-float 1.1s ease-out forwards',
              transform: 'translateX(-50%)',
            }}>
              -{d.value}
              {d.effectiveness >= 2 && <div style={{ fontSize: '0.6rem', textAlign: 'center', color: '#4ade80' }}>SUPER EFFICACE</div>}
            </div>
          );
        })}

        {/* ── Enemy ── */}
        <div className="absolute" style={{ top: '6%', right: '8%' }}>
          {/* Name + HP box */}
          <div className="bg-black/70 rounded-xl px-3 py-2 border border-slate-600/50 mb-2 min-w-[140px]">
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
          {/* Sprite */}
          <div className={`flex justify-end ${attackEvt?.attacker === 'enemy' ? 'battle-lunge-left' : ''} ${activeEF?.currentHp === 0 ? 'opacity-30' : ''}`}>
            {activeEF && (
              <ShinySprite pokemonId={activeEF.pokemonId} isShiny={activeEF.isShiny ?? false}
                width={88} height={88}
                style={{
                  filter: `drop-shadow(0 0 10px ${RARITY_COLORS[POKEMON_BY_ID[activeEF.pokemonId]?.rarity ?? 'commun']})`,
                  transform: 'scaleX(-1)',
                }}
              />
            )}
          </div>
          {/* Enemy team dots */}
          <div className="flex gap-1.5 justify-end mt-1">
            {enemyFighters.map((f, i) => (
              <div key={i} className={`w-3 h-3 rounded-full transition-all ${i === enemyIdx ? 'ring-2 ring-white' : ''} ${f.currentHp > 0 ? 'bg-red-400' : 'bg-slate-600'}`} />
            ))}
          </div>
        </div>

        {/* ── Player ── */}
        <div className="absolute" style={{ bottom: '14%', left: '8%' }}>
          {/* Player team dots */}
          <div className="flex gap-1.5 mb-1">
            {playerFighters.map((f, i) => (
              <div key={i} className={`w-3 h-3 rounded-full transition-all ${i === playerIdx ? 'ring-2 ring-white' : ''} ${f.currentHp > 0 ? 'bg-green-400' : 'bg-slate-600'}`} />
            ))}
          </div>
          {/* Sprite */}
          <div className={`${attackEvt?.attacker === 'player' ? 'battle-lunge-right' : ''} ${activePF?.currentHp === 0 ? 'opacity-30' : ''}`}>
            {activePF && (
              <ShinySprite pokemonId={activePF.pokemonId} isShiny={activePF.isShiny ?? false}
                width={96} height={96}
                style={{ filter: `drop-shadow(0 0 10px ${RARITY_COLORS[POKEMON_BY_ID[activePF.pokemonId]?.rarity ?? 'commun']})` }}
              />
            )}
          </div>
          {/* Name + HP box */}
          <div className="bg-black/70 rounded-xl px-3 py-2 border border-slate-600/50 mt-2 min-w-[140px]">
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

        {/* ── VS / End banner ── */}
        <div className="absolute inset-x-0 top-1/2 flex justify-center pointer-events-none" style={{ transform: 'translateY(-50%)' }}>
          {phase === 'end' ? (
            <div className={`font-black text-4xl drop-shadow-lg ${won.current ? 'text-yellow-400' : 'text-red-400'}`}
              style={{ textShadow: won.current ? '0 0 20px #fbbf24' : '0 0 20px #ef4444' }}>
              {won.current ? '🏆 VICTOIRE !' : '💀 DÉFAITE !'}
            </div>
          ) : (
            <div className="text-slate-500/40 font-black text-6xl">VS</div>
          )}
        </div>
      </div>

      {/* ── Battle log ── */}
      <div className="shrink-0 bg-black/90 border-t border-slate-700/50 px-4 py-2" style={{ minHeight: 82 }}>
        {log.slice(-3).map((entry, i) => (
          <div key={i} className="text-xs font-medium" style={{ color: entry.color, opacity: 0.4 + i * 0.3 }}>
            {entry.text}
          </div>
        ))}
      </div>

      {/* ── Bench ── */}
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
