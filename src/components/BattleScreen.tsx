import { useState, useEffect, useCallback, useRef } from 'react';
import { RARITY_COLORS } from '../types';
import { POKEMON_BY_ID } from '../data/gen1';
import { POKEMON_TYPE, TYPE_COLORS } from '../data/pokemonTypes';
import { calcDamage, xpGainedFromBattle } from '../data/combatEngine';
import { TeamMember } from './TeamBuilder';

interface Props {
  playerTeam: TeamMember[];
  enemyTeam: TeamMember[];
  bossName?: string;
  onBattleEnd: (won: boolean, xpGains: Record<number, number>) => void;
}

interface LogEntry {
  text: string;
  color: string;
}

interface FighterState extends TeamMember {
  currentHp: number;
}

const TURN_DELAY_MS = 1400;

export function BattleScreen({ playerTeam, enemyTeam, bossName, onBattleEnd }: Props) {
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
  const [attackAnim, setAttackAnim] = useState<'player' | 'enemy' | null>(null);
  const [xpGains, setXpGains] = useState<Record<number, number>>({});
  const won = useRef<boolean>(false);
  const battleDone = useRef(false);

  const addLog = useCallback((text: string, color = '#e2e8f0') => {
    setLog(prev => [...prev.slice(-6), { text, color }]);
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

          // Player attacks
          const { damage: pDmg, effectiveness: pEff, moveName: pMove } = calcDamage(
            pFighter.pokemonId, pFighter.level, eFighter.pokemonId, eFighter.level
          );

          setAttackAnim('player');

          const newEHp = Math.max(0, eFighter.currentHp - pDmg);
          const newEf = ef.map((f, i) => i === enemyIdx ? { ...f, currentHp: newEHp } : f);

          addLog(`${pName} utilise ${pMove} ! (${pDmg} dégâts)`, '#fde68a');
          if (pEff >= 2) addLog("Super efficace !", '#4ade80');
          if (pEff === 0) addLog("Aucun effet...", '#94a3b8');
          if (pEff < 1 && pEff > 0) addLog("Peu efficace...", '#fb923c');

          if (newEHp <= 0) {
            addLog(`${eName} est K.O. !`, '#f87171');
            const xpEarned = xpGainedFromBattle(eFighter.level, true);
            setXpGains(prev => ({ ...prev, [pFighter.pokemonId]: (prev[pFighter.pokemonId] ?? 0) + xpEarned }));

            const nextE = newEf.findIndex((f, i) => i > enemyIdx && f.currentHp > 0);
            if (nextE < 0 && newEf.every(f => f.currentHp <= 0)) {
              battleDone.current = true;
              won.current = true;
              setPhase('end');
            } else if (nextE >= 0) {
              setTimeout(() => setEnemyIdx(nextE), 600);
            }
            return newEf;
          }

          // Enemy attacks back (with delay)
          setTimeout(() => {
            if (battleDone.current) return;
            setAttackAnim('enemy');
            const { damage: eDmg, effectiveness: eEff, moveName: eMove } = calcDamage(
              eFighter.pokemonId, eFighter.level, pFighter.pokemonId, pFighter.level
            );

            addLog(`${eName} utilise ${eMove} ! (${eDmg} dégâts)`, '#fca5a5');
            if (eEff >= 2) addLog("Super efficace !", '#f87171');

            setPlayerFighters(pf2 => {
              const newPHp = Math.max(0, pf2[playerIdx].currentHp - eDmg);
              const newPf = pf2.map((f, i) => i === playerIdx ? { ...f, currentHp: newPHp } : f);

              if (newPHp <= 0) {
                addLog(`${pName} est K.O. !`, '#f87171');
                const nextP = newPf.findIndex((f, i) => i > playerIdx && f.currentHp > 0);
                if (nextP < 0 && newPf.every(f => f.currentHp <= 0)) {
                  battleDone.current = true;
                  won.current = false;
                  setPhase('end');
                } else if (nextP >= 0) {
                  setTimeout(() => setPlayerIdx(nextP), 600);
                }
              }
              return newPf;
            });
            setAttackAnim(null);
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
  }, [playerIdx, enemyIdx, phase, addLog]);

  useEffect(() => {
    if (phase === 'end') {
      const snapshot = { ...xpGains };
      const wonSnapshot = won.current;
      setTimeout(() => onBattleEnd(wonSnapshot, snapshot), 1500);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const renderFighter = (fighter: FighterState | undefined, isPlayer: boolean) => {
    if (!fighter) return null;
    const p = POKEMON_BY_ID[fighter.pokemonId];
    const color = p ? RARITY_COLORS[p.rarity] : '#888';
    const hpPct = fighter.maxHp > 0 ? fighter.currentHp / fighter.maxHp : 0;
    const hpColor = hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#f59e0b' : '#ef4444';
    const types = POKEMON_TYPE[fighter.pokemonId] ?? ['normal'];
    const fainted = fighter.currentHp <= 0;
    const isAnimating = attackAnim === (isPlayer ? 'player' : 'enemy');

    return (
      <div className={`flex flex-col items-center gap-1 transition-all ${fainted ? 'opacity-30' : ''} ${isAnimating ? 'scale-110' : 'scale-100'}`}>
        <img
          src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${fighter.pokemonId}.png`}
          width={64} height={64}
          style={{
            imageRendering: 'pixelated',
            filter: !fainted ? `drop-shadow(0 0 8px ${color})` : 'grayscale(1)',
            transform: isPlayer ? 'scaleX(1)' : 'scaleX(-1)',
          }}
          draggable={false}
        />
        <div className="text-white text-xs font-bold">{p?.name} <span className="text-slate-400">Nv.{fighter.level}</span></div>
        <div className="w-20">
          <div className="flex justify-between text-xs text-slate-400 mb-0.5">
            <span>PV</span>
            <span>{fighter.currentHp}/{fighter.maxHp}</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div className="h-2 rounded-full transition-all duration-300" style={{ width: `${hpPct * 100}%`, background: hpColor }} />
          </div>
        </div>
        <div className="flex gap-0.5">
          {types.map(t => (
            <span key={t} className="text-white font-bold rounded px-1" style={{ background: TYPE_COLORS[t] ?? '#888', fontSize: '0.45rem' }}>
              {t.toUpperCase().slice(0, 4)}
            </span>
          ))}
        </div>
      </div>
    );
  };

  const activePF = playerFighters[playerIdx];
  const activeEF = enemyFighters[enemyIdx];

  return (
    <div className="fixed inset-0 z-60 bg-slate-950 flex flex-col">
      {/* Arena */}
      <div className="flex-1 flex flex-col justify-between p-4">
        {/* Enemy team status */}
        <div className="flex gap-2 justify-end mb-2">
          {enemyFighters.map((f, i) => (
            <div key={i} className={`w-3 h-3 rounded-full ${f.currentHp > 0 ? 'bg-red-400' : 'bg-slate-600'}`} />
          ))}
        </div>

        {/* Battle field */}
        <div className="flex items-center justify-around py-4">
          {/* Player */}
          <div className="flex flex-col items-center gap-2">
            <div className="text-green-400 text-xs font-bold">TON ÉQUIPE</div>
            {renderFighter(activePF, true)}
          </div>

          <div className="flex flex-col items-center gap-1">
            <div className="text-2xl font-black text-red-400 animate-pulse">VS</div>
            {phase === 'end' && (
              <div className={`font-black text-xl ${won.current ? 'text-green-400' : 'text-red-400'}`}>
                {won.current ? '🏆 Victoire !' : '💀 Défaite !'}
              </div>
            )}
          </div>

          {/* Enemy */}
          <div className="flex flex-col items-center gap-2">
            <div className="text-red-400 text-xs font-bold">{bossName ?? 'ENNEMI'}</div>
            {renderFighter(activeEF, false)}
          </div>
        </div>

        {/* Player team status */}
        <div className="flex gap-2 justify-start mt-2">
          {playerFighters.map((f, i) => (
            <div key={i} className={`w-3 h-3 rounded-full ${f.currentHp > 0 ? 'bg-green-400' : 'bg-slate-600'}`} />
          ))}
        </div>

        {/* Battle log */}
        <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-700/50 mt-4 min-h-[80px]">
          {log.slice(-3).map((entry, i) => (
            <div key={i} className="text-sm" style={{ color: entry.color, opacity: 0.5 + i * 0.25 }}>
              {entry.text}
            </div>
          ))}
        </div>
      </div>

      {/* Benched pokemon */}
      <div className="shrink-0 px-4 py-2 border-t border-slate-700 flex gap-3">
        <span className="text-slate-500 text-xs self-center">Banc :</span>
        {playerFighters.filter((_, i) => i !== playerIdx).map((f, i) => {
          const fainted = f.currentHp <= 0;
          return (
            <div key={i} className={`flex flex-col items-center ${fainted ? 'opacity-30' : ''}`}>
              <img
                src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${f.pokemonId}.png`}
                width={36} height={36}
                style={{ imageRendering: 'pixelated', filter: fainted ? 'grayscale(1)' : 'none' }}
                draggable={false}
              />
              <span className="text-xs text-slate-400">Nv.{f.level}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
