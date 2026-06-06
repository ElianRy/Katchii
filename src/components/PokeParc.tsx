import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { GameState, RARITY_COLORS } from '../types';
import { POKEMON_BY_ID } from '../data/gen1';
import { POKEMON_TYPE } from '../data/pokemonTypes';
import { getPlayerGrade, PARK_XP_PER_TICK } from '../lib/playerLevel';

type Mood = 'happy' | 'sleep' | 'attack' | 'dance' | 'excited' | 'scared' | 'proud' | 'hungry' | 'curious';

interface PresenceRow {
  user_id: string;
  username: string;
  pokemon_id: number;
  is_shiny: boolean;
  mood: Mood;
  x: number;
  y: number;
  updated_at: string;
}

interface ChatMessage {
  id: string;
  user_id: string;
  username: string;
  message: string;
  created_at: string;
  grade?: string;
  grade_icon?: string;
  grade_color?: string;
}

interface InteractionTarget {
  userId: string;
  username: string;
  pokemonId: number;
  isShiny: boolean;
  level: number;
  rarity: string;
}

interface Props {
  state: GameState;
  username: string;
  isAdmin?: boolean;
  onClose: () => void;
  onSetFavoritePokemon: (fav: GameState['favoritePokemon']) => void;
  onAddPlayerXp: (xp: number) => void;
  onAddPokemonXp: (pokemonId: number, xp: number) => void;
  onTrainingWin?: () => void;
}

function getPokemonTitle(wins: number): string | null {
  if (wins >= 500) return '👑 Maître';
  if (wins >= 200) return '🔥 Légende';
  if (wins >= 100) return '💎 Champion';
  if (wins >= 50) return '⚔️ Guerrier';
  if (wins >= 25) return '🛡️ Combattant';
  if (wins >= 10) return '🌱 Novice';
  return null;
}

function formatChatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}

const RARITY_SCORE: Record<string, number> = {
  commun: 1, peu_commun: 1.5, rare: 2.5, elite: 4, legendaire: 8,
};




function getPokemonLevelFromState(state: GameState, pokemonId: number): number {
  const stored = state.pokemonLevels[pokemonId];
  if (stored) return stored.level;
  const data = POKEMON_BY_ID[pokemonId];
  if (!data) return 1;
  const rarityBase: Record<string, number> = { commun: 5, peu_commun: 10, rare: 20, elite: 35, legendaire: 50 };
  return rarityBase[data.rarity] ?? 5;
}

function getSpriteUrl(pokemonId: number, isShiny: boolean) {
  const base = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
  return isShiny ? `${base}/shiny/${pokemonId}.png` : `${base}/${pokemonId}.png`;
}

// ---- Shiny sparkles centered on the 56×56 sprite ----
const PARK_SPARKLE_COLORS = ['#fde047', '#f0abfc', '#ffffff', '#fbbf24', '#a5f3fc'];
function ParkShinySparkles() {
  const sparkles = React.useMemo(() => Array.from({ length: 5 }, (_, i) => {
    const angle = (i / 5) * Math.PI * 2 + i * 0.5;
    const r = 26 + (i % 2) * 12;
    return {
      id: i,
      x: Math.cos(angle) * r + 28, // center = 28px (half of 56px)
      y: Math.sin(angle) * r + 28,
      color: PARK_SPARKLE_COLORS[i % PARK_SPARKLE_COLORS.length],
      delay: `${(i * 0.22).toFixed(2)}s`,
      duration: `${(1.1 + i * 0.15).toFixed(2)}s`,
    };
  }), []);
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}>
      {sparkles.map(sp => (
        <div key={sp.id} className="shiny-sparkle" style={{
          position: 'absolute', left: sp.x, top: sp.y,
          '--sp-color': sp.color, '--sp-duration': sp.duration, '--sp-delay': sp.delay,
        } as React.CSSProperties} />
      ))}
    </div>
  );
}

// ---- Park Attack VFX ----
// Minimal inline attack animations that don't need the full BattleScreen keyframes.
// Each type shows a distinct emoji stream flying rightward (park POV: always ltr-ish).
const TYPE_EMOJI: Record<string, string[]> = {
  fire:    ['🔥', '🔥'],
  water:   ['💧', '🌊'],
  grass:   ['🍃', '🌿'],
  electric:['⚡', '✨'],
  ice:     ['❄️', '🌨'],
  psychic: ['🔮', '💜'],
  fighting:['💥', '👊'],
  ghost:   ['👻', '🌀'],
  poison:  ['☠️', '💜'],
  ground:  ['💨', '🪨'],
  rock:    ['🪨', '💥'],
  flying:  ['🌪', '💨'],
  dragon:  ['🐉', '🔥'],
  bug:     ['🦋', '🍃'],
  normal:  ['⭐', '💫'],
  dark:    ['🌑', '💀'],
  steel:   ['⚙️', '🔩'],
};

function ParkAttackVfx({ pokemonId, facingRight }: { pokemonId: number; facingRight: boolean }) {
  const [shots, setShots] = useState<number[]>([]);
  const type = (POKEMON_TYPE[pokemonId] ?? ['normal'])[0];
  const emojis = TYPE_EMOJI[type] ?? ['⭐', '💫'];
  useEffect(() => {
    const interval = setInterval(() => {
      const id = Date.now();
      setShots(prev => [...prev.slice(-3), id]);
      setTimeout(() => setShots(prev => prev.filter(s => s !== id)), 800);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {shots.map((id, i) => (
        <div key={id} className="absolute pointer-events-none" style={{
          top: '20%',
          left: facingRight ? '80%' : '20%',
          zIndex: 20,
        }}>
          <div style={{
            fontSize: '1.1rem',
            animation: `park-attack-${facingRight ? 'r' : 'l'} 0.75s ease-out forwards`,
            animationDelay: `${i * 0.08}s`,
            filter: `drop-shadow(0 0 6px ${type === 'fire' ? '#f97316' : type === 'electric' ? '#facc15' : type === 'water' ? '#38bdf8' : type === 'grass' ? '#4ade80' : type === 'psychic' ? '#e879f9' : '#fff'})`,
          }}>
            {emojis[i % emojis.length]}
          </div>
        </div>
      ))}
    </>
  );
}

function ParkSprite({
  pokemonId, isShiny, mood, username, isMine, onClick, waveTarget, wins,
}: {
  pokemonId: number; isShiny: boolean; mood: Mood; username: string;
  isMine: boolean; onClick?: () => void; waveTarget?: boolean; wins?: number;
}) {
  const data = POKEMON_BY_ID[pokemonId];
  const rarityColor = data ? RARITY_COLORS[data.rarity] : '#6b7280';
  const [err, setErr] = useState(false);

  const MOOD_ANIM: Record<Mood, string> = {
    happy:   'bounce-pokemon 1.4s ease-in-out infinite',
    excited: 'bounce-pokemon 0.6s ease-in-out infinite',
    dance:   'sway 1.0s ease-in-out infinite',
    attack:  'wiggle 0.5s ease-in-out infinite',
    scared:  'wiggle 0.3s ease-in-out infinite',
    proud:   'float 3s ease-in-out infinite',
    hungry:  'hop 2s ease-in-out infinite',
    curious: 'sway 2.5s ease-in-out infinite',
    sleep:   '',
  };
  const spriteAnim = MOOD_ANIM[mood] ?? '';

  const filter = isShiny
    ? 'drop-shadow(0 0 8px #fde047) drop-shadow(0 0 16px #f0abfc88)'
    : `drop-shadow(0 0 5px ${rarityColor})`;

  return (
    <div
      className="flex flex-col items-center gap-0.5 cursor-pointer select-none"
      onClick={onClick}
      style={{ position: 'relative' }}
    >
      {/* Wave animation overlay */}
      {waveTarget && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xl" style={{ animation: 'wave-hand 0.5s ease-in-out 3' }}>
          👋
        </div>
      )}

      {/* Mood overlay badges */}
      {mood === 'sleep' && (
        <div className="absolute -top-5 -right-2 text-xs font-black text-blue-300" style={{ animation: 'zzz-float 2s ease-in-out infinite' }}>Zzz</div>
      )}
      {mood === 'hungry' && (
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-sm" style={{ animation: 'zzz-float 1.5s ease-in-out infinite' }}>🍖</div>
      )}
      {mood === 'excited' && (
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-sm" style={{ animation: 'zzz-float 0.8s ease-in-out infinite' }}>✨</div>
      )}
      {mood === 'scared' && (
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-sm" style={{ animation: 'zzz-float 0.5s ease-in-out infinite' }}>😰</div>
      )}
      {mood === 'dance' && (
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-sm" style={{ animation: 'zzz-float 1s ease-in-out infinite' }}>🎵</div>
      )}
      {mood === 'proud' && (
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-sm" style={{ animation: 'zzz-float 3s ease-in-out infinite' }}>👑</div>
      )}

      {/* Attack VFX for aggressive mood */}
      {mood === 'attack' && (
        <ParkAttackVfx pokemonId={pokemonId} facingRight={!isMine} />
      )}

      {/* Sprite + shiny sparkles centered on it */}
      <div style={{ position: 'relative', width: 56, height: 56, display: 'inline-block' }}>
        {err ? (
          <div style={{
            width: 56, height: 56,
            background: `linear-gradient(135deg, ${rarityColor}33, ${rarityColor}11)`,
            border: `1px solid ${rarityColor}66`,
            borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, filter,
          }}>?</div>
        ) : (
          <img
            src={getSpriteUrl(pokemonId, isShiny)}
            width={56} height={56}
            style={{ imageRendering: 'pixelated', objectFit: 'contain', filter, animation: spriteAnim }}
            onError={() => setErr(true)}
            draggable={false}
            alt={data?.name ?? '?'}
          />
        )}
        {/* Shiny sparkles — positioned relative to sprite center (28px) */}
        {isShiny && <ParkShinySparkles />}
      </div>

      {/* Username badge */}
      <div className="flex flex-col items-center gap-0" style={{ maxWidth: 80 }}>
        <div className="rounded px-1.5 py-0.5 text-center w-full truncate" style={{
          background: isMine ? 'rgba(251,191,36,0.85)' : 'rgba(0,0,0,0.75)',
          color: isMine ? '#000' : rarityColor,
          fontSize: '0.55rem',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
        }}>
          {isMine ? '★ ' : ''}<span style={username?.toLowerCase() === 'pokelian' && !isMine ? { color: '#ef4444' } : {}}>{username}</span>
        </div>
        {wins !== undefined && wins >= 10 && getPokemonTitle(wins) && (
          <div style={{ fontSize: '0.45rem', color: '#fbbf24', fontWeight: 'bold', textAlign: 'center' }}>
            {getPokemonTitle(wins)}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Race Modal ----
function RaceModal({
  myPokemonId, myIsShiny, myLevel, myRarity,
  opponentPokemonId, opponentIsShiny, opponentLevel, opponentRarity, opponentName,
  onClose, onResult,
}: {
  myPokemonId: number; myIsShiny: boolean; myLevel: number; myRarity: string;
  opponentPokemonId: number; opponentIsShiny: boolean; opponentLevel: number; opponentRarity: string;
  opponentName: string; onClose: () => void; onResult: (won: boolean) => void;
}) {
  const myBase = myLevel * (RARITY_SCORE[myRarity] ?? 1);
  const oppBase = opponentLevel * (RARITY_SCORE[opponentRarity] ?? 1);

  const [tapBonus, setTapBonus] = useState(0);
  const [phase, setPhase] = useState<'tap' | 'race' | 'result'>('tap');
  const [countdown, setCountdown] = useState(5);
  const [myPos, setMyPos] = useState(0);
  const [oppPos, setOppPos] = useState(0);
  const [winner, setWinner] = useState<'me' | 'opponent' | null>(null);
  const raceRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resultSent = useRef(false);

  const MAX_TAP_BONUS = 15;

  const winPct = Math.min(95, Math.max(5,
    (myBase / (myBase + oppBase)) * 100 + Math.min(tapBonus, MAX_TAP_BONUS)
  ));

  const handleTap = () => {
    if (phase === 'tap') setTapBonus(b => Math.min(b + 0.5, MAX_TAP_BONUS));
  };

  // Countdown 5→0 then start race
  useEffect(() => {
    if (phase !== 'tap') return;
    setCountdown(5);
    const ticks = [
      setTimeout(() => setCountdown(4), 1000),
      setTimeout(() => setCountdown(3), 2000),
      setTimeout(() => setCountdown(2), 3000),
      setTimeout(() => setCountdown(1), 4000),
      setTimeout(() => { setCountdown(0); setPhase('race'); }, 5000),
    ];
    return () => ticks.forEach(clearTimeout);
  }, [phase]);

  // Race simulation — use ref for winPct so it captures latest tap bonus
  const winPctRef = useRef(winPct);
  winPctRef.current = winPct;

  useEffect(() => {
    if (phase !== 'race') return;
    setMyPos(0); setOppPos(0);

    // Use a single random outcome seeded by winPct to ensure proper probability
    const won = Math.random() * 100 < winPctRef.current;
    // Winning side gets a speed advantage
    const mySpeed = won ? 1.8 + Math.random() * 0.6 : 1.2 + Math.random() * 0.5;
    const oppSpeed = won ? 1.2 + Math.random() * 0.5 : 1.8 + Math.random() * 0.6;

    raceRef.current = setInterval(() => {
      setMyPos(p => Math.min(p + mySpeed + Math.random() * 0.6, 100));
      setOppPos(p => Math.min(p + oppSpeed + Math.random() * 0.6, 100));
    }, 100);

    return () => { if (raceRef.current) clearInterval(raceRef.current); };
  }, [phase]);

  // Detect finish
  useEffect(() => {
    if (phase !== 'race') return;
    if (myPos >= 100 || oppPos >= 100) {
      if (raceRef.current) clearInterval(raceRef.current);
      const w = myPos >= oppPos ? 'me' : 'opponent';
      setWinner(w);
      setPhase('result');
      if (!resultSent.current) { resultSent.current = true; onResult(w === 'me'); }
    }
  }, [myPos, oppPos, phase]);

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80"
      onClick={phase === 'tap' ? handleTap : undefined}
    >
      <div className="relative bg-slate-800 rounded-2xl border border-yellow-500/40 shadow-2xl p-5 w-80 max-w-[95vw]" onClick={e => e.stopPropagation()}>
        <div className="text-center font-black text-yellow-400 text-lg mb-3">🏁 Course !</div>

        {/* Sprites */}
        <div className="flex justify-around items-end mb-4">
          <div className="flex flex-col items-center gap-1">
            <img src={getSpriteUrl(myPokemonId, myIsShiny)} width={52} height={52} style={{ imageRendering: 'pixelated' }} alt="me" />
            <span className="text-xs text-yellow-400 font-bold">Toi</span>
          </div>
          <div className="text-3xl font-black text-white">VS</div>
          <div className="flex flex-col items-center gap-1">
            <img src={getSpriteUrl(opponentPokemonId, opponentIsShiny)} width={52} height={52} style={{ imageRendering: 'pixelated', transform: 'scaleX(-1)' }} alt="opp" />
            <span className="text-xs text-slate-300 font-bold">{opponentName}</span>
          </div>
        </div>

        {phase === 'tap' && (
          <>
            <div className="text-center text-2xl font-black text-white mb-1">
              Tape pour booster !
            </div>
            <div className="text-center mb-3">
              <span className="text-5xl font-black transition-all" style={{ color: countdown <= 2 ? '#ef4444' : '#fbbf24' }}>
                {countdown > 0 ? countdown : '🏁'}
              </span>
            </div>
            <div className="flex justify-around text-xs text-slate-300 mb-3">
              <span>Chances : <b className="text-yellow-400">{winPct.toFixed(0)}%</b></span>
              <span>+{Math.min(tapBonus, MAX_TAP_BONUS).toFixed(1)}% bonus taps</span>
            </div>
            <button
              onClick={handleTap}
              className="w-full py-4 rounded-xl text-2xl font-black bg-yellow-500 text-black active:scale-95 transition-transform"
            >
              👟 TAPE !
            </button>
          </>
        )}

        {phase === 'race' && (
          <div className="space-y-3">
            {/* Track */}
            <div className="relative bg-slate-700 rounded-full h-10 overflow-hidden border border-slate-600">
              <div className="absolute top-0 bottom-0 flex items-center transition-all duration-100" style={{ left: `${Math.min(myPos, 95)}%` }}>
                <img src={getSpriteUrl(myPokemonId, myIsShiny)} width={32} height={32} style={{ imageRendering: 'pixelated' }} alt="" />
              </div>
            </div>
            <div className="relative bg-slate-700 rounded-full h-10 overflow-hidden border border-slate-600">
              <div className="absolute top-0 bottom-0 flex items-center transition-all duration-100" style={{ left: `${Math.min(oppPos, 95)}%` }}>
                <img src={getSpriteUrl(opponentPokemonId, opponentIsShiny)} width={32} height={32} style={{ imageRendering: 'pixelated', transform: 'scaleX(-1)' }} alt="" />
              </div>
            </div>
            <div className="text-center text-xs text-slate-400 animate-pulse">En course…</div>
          </div>
        )}

        {phase === 'result' && (
          <div className="text-center">
            <div className="text-5xl mb-2">{winner === 'me' ? '🏆' : '💀'}</div>
            <div className="font-black text-xl mb-1" style={{ color: winner === 'me' ? '#fbbf24' : '#ef4444' }}>
              {winner === 'me' ? 'VICTOIRE !' : 'Défaite…'}
            </div>
            <div className="text-xs text-slate-400 mb-4">
              {winner === 'me' ? `Tu as battu ${opponentName} !` : `${opponentName} était trop rapide.`}
            </div>
            <button onClick={onClose} className="px-6 py-2 rounded-xl bg-slate-600 text-white font-bold text-sm">
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Interaction Modal ----
function InteractionModal({
  target, onWave, onRace, onDuel, onClose,
}: {
  target: InteractionTarget; onWave: () => void; onRace: () => void; onDuel: () => void; onClose: () => void;
}) {
  const data = POKEMON_BY_ID[target.pokemonId];
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-slate-800 rounded-2xl border border-slate-600 shadow-2xl p-5 w-72 max-w-[90vw]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <img src={getSpriteUrl(target.pokemonId, target.isShiny)} width={52} height={52} style={{ imageRendering: 'pixelated' }} alt={data?.name} />
          <div>
            <div className="font-black text-white">{target.username}</div>
            <div className="text-xs" style={{ color: data ? RARITY_COLORS[data.rarity] : '#fff' }}>
              {data?.name ?? `#${target.pokemonId}`} · Niv. {target.level}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={onWave} className="py-3 rounded-xl bg-blue-600/80 text-white font-bold text-sm flex flex-col items-center gap-1">
            <span className="text-2xl">👋</span>Saluer
          </button>
          <button onClick={onDuel} className="py-3 rounded-xl bg-red-600/80 text-white font-bold text-sm flex flex-col items-center gap-1">
            <span className="text-2xl">⚔️</span>Duel
          </button>
          <button onClick={onRace} className="py-3 rounded-xl bg-yellow-500/80 text-black font-bold text-sm flex flex-col items-center gap-1">
            <span className="text-2xl">🏁</span>Course
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Duel Modal ----
function DuelModal({
  myPokemonId, myIsShiny, myLevel, myRarity,
  opponentPokemonId, opponentIsShiny, opponentLevel, opponentRarity, opponentName,
  onClose, onResult,
}: {
  myPokemonId: number; myIsShiny: boolean; myLevel: number; myRarity: string;
  opponentPokemonId: number; opponentIsShiny: boolean; opponentLevel: number; opponentRarity: string;
  opponentName: string; onClose: () => void; onResult: (won: boolean) => void;
}) {
  const myData = POKEMON_BY_ID[myPokemonId];
  const oppData = POKEMON_BY_ID[opponentPokemonId];
  const myScore = myLevel * (RARITY_SCORE[myRarity] ?? 1);
  const oppScore = opponentLevel * (RARITY_SCORE[opponentRarity] ?? 1);
  // Single random draw at mount to decide winner, weighted by score
  const wonRef = useRef(Math.random() < myScore / (myScore + oppScore));

  const myMaxHp = Math.round(50 + myLevel * 2.5);
  const oppMaxHp = Math.round(50 + opponentLevel * 2.5);
  const [myHp, setMyHp] = useState(myMaxHp);
  const [oppHp, setOppHp] = useState(oppMaxHp);
  const myHpRef = useRef(myMaxHp);
  const oppHpRef = useRef(oppMaxHp);
  const [log, setLog] = useState<Array<{ text: string; color: string }>>([]);
  const [phase, setPhase] = useState<'battle' | 'result'>('battle');
  const [winner, setWinner] = useState<'me' | 'opponent' | null>(null);
  const [hitFlash, setHitFlash] = useState<'me' | 'opp' | null>(null);
  const [shakeMe, setShakeMe] = useState(false);
  const [shakeOpp, setShakeOpp] = useState(false);
  const [attackMe, setAttackMe] = useState(false);
  const [attackOpp, setAttackOpp] = useState(false);
  const [hitKeyMe, setHitKeyMe] = useState(0);
  const [hitKeyOpp, setHitKeyOpp] = useState(0);
  const resultSent = useRef(false);
  const turnRef = useRef(0);

  const myRarityColor = myData ? RARITY_COLORS[myData.rarity] : '#6b7280';
  const oppRarityColor = oppData ? RARITY_COLORS[oppData.rarity] : '#6b7280';
  const hpColor = (pct: number) => pct > 0.5 ? '#4ade80' : pct > 0.25 ? '#facc15' : '#ef4444';

  useEffect(() => {
    const won = wonRef.current;
    // Winner deals more damage per hit on average
    const myDmgMult = won ? 1.4 : 0.7;
    const oppDmgMult = won ? 0.7 : 1.4;

    const interval = setInterval(() => {
      if (myHpRef.current <= 0 || oppHpRef.current <= 0) return;
      turnRef.current += 1;
      const isMyTurn = turnRef.current % 2 === 1;

      if (isMyTurn) {
        const dmg = Math.max(4, Math.round((8 + Math.random() * 8) * myDmgMult));
        setAttackMe(true);
        setTimeout(() => {
          setAttackMe(false);
          oppHpRef.current = Math.max(0, oppHpRef.current - dmg);
          setOppHp(oppHpRef.current);
          setHitFlash('opp'); setShakeOpp(true); setHitKeyOpp(k => k + 1);
          setTimeout(() => { setHitFlash(null); setShakeOpp(false); }, 300);
        }, 220);
        setLog(prev => [...prev.slice(-5), { text: `${myData?.name ?? 'Toi'} inflige ${dmg} dégâts !`, color: '#4ade80' }]);
      } else {
        const dmg = Math.max(4, Math.round((8 + Math.random() * 8) * oppDmgMult));
        setAttackOpp(true);
        setTimeout(() => {
          setAttackOpp(false);
          myHpRef.current = Math.max(0, myHpRef.current - dmg);
          setMyHp(myHpRef.current);
          setHitFlash('me'); setShakeMe(true); setHitKeyMe(k => k + 1);
          setTimeout(() => { setHitFlash(null); setShakeMe(false); }, 300);
        }, 220);
        setLog(prev => [...prev.slice(-5), { text: `${oppData?.name ?? opponentName} inflige ${dmg} dégâts !`, color: '#f87171' }]);
      }

      if (myHpRef.current <= 0 || oppHpRef.current <= 0) {
        clearInterval(interval);
        const w = oppHpRef.current <= 0 ? 'me' : 'opponent';
        setWinner(w);
        setPhase('result');
        if (!resultSent.current) { resultSent.current = true; onResult(w === 'me'); }
      }
    }, 650);
    return () => clearInterval(interval);
  }, []);

  // Stars background (precomputed)
  const stars = React.useMemo(() => Array.from({ length: 28 }, (_, i) => ({
    w: 1 + (i * 0.5) % 2, top: (i * 37 + 7) % 55, left: (i * 53 + 11) % 100,
    op: 0.2 + (i * 0.23) % 0.6, dur: 1.5 + (i * 0.4) % 2.5, del: (i * 0.37) % 2.5,
  })), []);

  return (
    <div className="fixed inset-0 z-[500] flex flex-col" style={{ background: '#020617' }}>
      {/* Starfield background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 20%, #1e1b4b 0%, #0f0720 55%, #020617 100%)' }} />
        {stars.map((s, i) => (
          <div key={i} className="absolute rounded-full bg-white" style={{
            width: s.w, height: s.w, top: `${s.top}%`, left: `${s.left}%`,
            opacity: s.op, animation: `arena-twinkle ${s.dur}s ease-in-out ${s.del}s infinite`,
          }} />
        ))}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 130, background: 'linear-gradient(to top, rgba(30,27,75,0.9) 0%, transparent 100%)' }} />
        <div style={{ position: 'absolute', top: '50%', left: '5%', right: '5%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(148,163,184,0.15), transparent)' }} />
        {/* Ground circle glow under each pokemon */}
        <div style={{ position: 'absolute', top: '32%', left: '18%', width: 80, height: 18, borderRadius: '50%', background: 'rgba(99,102,241,0.18)', filter: 'blur(6px)' }} />
        <div style={{ position: 'absolute', top: '60%', right: '18%', width: 80, height: 18, borderRadius: '50%', background: 'rgba(248,113,113,0.18)', filter: 'blur(6px)' }} />
      </div>

      {/* Battle area */}
      <div className="relative flex-1 flex flex-col">
        {/* Enemy side — top right */}
        <div className="flex-1 flex items-center justify-end pr-10 pt-6 relative">
          <div className="absolute top-4 left-4 bg-black/80 rounded-xl px-3 py-2 border border-slate-600/50 min-w-[150px]">
            <div className="text-xs font-black text-white mb-1 truncate">{opponentName} — {oppData?.name ?? `#${opponentPokemonId}`}</div>
            <div className="flex justify-between text-[0.6rem] mb-1">
              <span style={{ color: oppRarityColor }}>HP</span>
              <span className="text-slate-300">{oppHp}/{oppMaxHp}</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div className="h-2 rounded-full transition-all duration-300" style={{ width: `${(oppHp / oppMaxHp) * 100}%`, background: hpColor(oppHp / oppMaxHp) }} />
            </div>
          </div>
          <div style={{
            filter: hitFlash === 'opp' ? 'brightness(5) saturate(0)' : `drop-shadow(0 0 14px ${oppRarityColor})`,
            transition: 'filter 0.15s, transform 0.22s ease-out',
            opacity: oppHp <= 0 ? 0.25 : 1,
            transform: attackOpp ? 'translateX(-40px) scale(1.1)' : 'translateX(0px) scale(1)',
          }}>
            <img key={hitKeyOpp} src={getSpriteUrl(opponentPokemonId, opponentIsShiny)} width={88} height={88}
              style={{ imageRendering: 'pixelated', transform: 'scaleX(-1)', animation: shakeOpp ? 'wiggle 0.35s ease-in-out' : 'none' }} alt="" />
          </div>
        </div>

        {/* Player side — bottom left */}
        <div className="flex-1 flex items-center justify-start pl-10 pb-6 relative">
          <div style={{
            filter: hitFlash === 'me' ? 'brightness(5) saturate(0)' : `drop-shadow(0 0 14px ${myRarityColor})`,
            transition: 'filter 0.15s, transform 0.22s ease-out',
            opacity: myHp <= 0 ? 0.25 : 1,
            transform: attackMe ? 'translateX(40px) scale(1.1)' : 'translateX(0px) scale(1)',
          }}>
            <img key={hitKeyMe} src={getSpriteUrl(myPokemonId, myIsShiny)} width={88} height={88}
              style={{ imageRendering: 'pixelated', animation: shakeMe ? 'wiggle 0.35s ease-in-out' : 'none' }} alt="" />
          </div>
          <div className="absolute bottom-4 right-4 bg-black/80 rounded-xl px-3 py-2 border border-slate-600/50 min-w-[150px]">
            <div className="text-xs font-black text-yellow-400 mb-1 truncate">Toi — {myData?.name ?? `#${myPokemonId}`}</div>
            <div className="flex justify-between text-[0.6rem] mb-1">
              <span style={{ color: myRarityColor }}>HP</span>
              <span className="text-slate-300">{myHp}/{myMaxHp}</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div className="h-2 rounded-full transition-all duration-300" style={{ width: `${(myHp / myMaxHp) * 100}%`, background: hpColor(myHp / myMaxHp) }} />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom panel — log + result */}
      <div className="shrink-0 bg-slate-900/95 border-t border-slate-700 px-4 py-3" style={{ minHeight: 110 }}>
        {phase === 'battle' && (
          <>
            <div className="h-14 overflow-hidden mb-2 space-y-0.5">
              {log.length === 0
                ? <div className="text-xs text-slate-500 animate-pulse">Le combat commence…</div>
                : log.slice(-3).map((l, i) => (
                    <div key={i} className="text-xs" style={{ color: l.color }}>{l.text}</div>
                  ))
              }
            </div>
            <div className="text-center text-xs text-slate-600 animate-pulse">Combat en cours…</div>
          </>
        )}
        {phase === 'result' && (
          <div className="flex flex-col items-center gap-1 py-1">
            <div className="text-4xl">{winner === 'me' ? '🏆' : '💀'}</div>
            <div className="font-black text-lg" style={{ color: winner === 'me' ? '#fbbf24' : '#ef4444' }}>
              {winner === 'me' ? 'VICTOIRE !' : 'Défaite…'}
            </div>
            <div className="text-xs text-slate-400 mb-2">
              {winner === 'me' ? `Tu as battu ${opponentName} !` : `${opponentName} était trop fort.`}
            </div>
            <button onClick={onClose} className="px-8 py-2 rounded-xl bg-yellow-500 text-black font-black text-sm">
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Pokemon Picker ----
function PokemonPicker({ state, onPick, onClose }: {
  state: GameState; onPick: (pokemonId: number, isShiny: boolean) => void; onClose: () => void;
}) {
  const owned = Object.entries(state.normalCollection)
    .filter(([, count]) => count > 0)
    .map(([id]) => Number(id))
    .sort((a, b) => a - b);

  const shinyOwned = new Set(Object.entries(state.shinyCollection).filter(([, c]) => c > 0).map(([id]) => Number(id)));

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="bg-slate-800 rounded-2xl border border-slate-600 p-4 w-80 max-w-[95vw] max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="font-black text-white mb-3 text-center">Choisir ton Pokémon</div>
        <div className="overflow-y-auto flex-1 grid grid-cols-4 gap-2 pb-2">
          {owned.map(id => {
            const data = POKEMON_BY_ID[id];
            const isShiny = shinyOwned.has(id);
            return (
              <button
                key={id}
                onClick={() => { onPick(id, isShiny); onClose(); }}
                className="flex flex-col items-center gap-0.5 p-1 rounded-lg bg-slate-700/50 hover:bg-slate-600/50"
              >
                <img src={getSpriteUrl(id, isShiny)} width={36} height={36} style={{ imageRendering: 'pixelated' }} alt={data?.name} />
                <span className="text-[0.45rem] text-slate-300 truncate w-full text-center">{data?.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}


// ---- Main Component ----
export function PokeParc({ state, username, isAdmin = false, onClose, onSetFavoritePokemon, onAddPlayerXp, onAddPokemonXp, onTrainingWin }: Props) {
  const [presence, setPresence] = useState<PresenceRow[]>([]);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [mood, setMood] = useState<Mood>('happy');
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [myPos, setMyPos] = useState({ x: 20 + Math.random() * 60, y: 20 + Math.random() * 50 });
  const [interactionTarget, setInteractionTarget] = useState<InteractionTarget | null>(null);
  const [waveTarget, setWaveTarget] = useState<string | null>(null);
  const [showRace, setShowRace] = useState(false);
  const [showDuel, setShowDuel] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [justPlaced, setJustPlaced] = useState(false);
  // mutedUsers: userId -> expiryMs (null = permanent) — persisted in localStorage
  const MUTE_KEY = 'katchii_muted_users';
  const loadMuted = (): Map<string, number | null> => {
    try {
      const raw = JSON.parse(localStorage.getItem(MUTE_KEY) ?? '[]') as [string, number | null][];
      // filter out expired entries
      const now = Date.now();
      return new Map(raw.filter(([, exp]) => exp === null || exp > now));
    } catch { return new Map(); }
  };
  const saveMuted = (m: Map<string, number | null>) => {
    localStorage.setItem(MUTE_KEY, JSON.stringify([...m.entries()]));
  };
  const [mutedUsers, setMutedUsers] = useState<Map<string, number | null>>(loadMuted);
  const [muteMenuFor, setMuteMenuFor] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const wanderRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const myFav = state.favoritePokemon;

  // Get current user ID
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setMyUserId(user.id);
    });
  }, []);

  // Fetch and subscribe to presence
  useEffect(() => {
    supabase.from('pokepark_presence').select('*').then(({ data }) => {
      if (data) setPresence(data as PresenceRow[]);
    });

    const chan = supabase.channel('pokepark_presence_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pokepark_presence' }, payload => {
        if (payload.eventType === 'DELETE') {
          setPresence(prev => prev.filter(p => p.user_id !== (payload.old as PresenceRow).user_id));
        } else {
          const row = payload.new as PresenceRow;
          setPresence(prev => {
            const idx = prev.findIndex(p => p.user_id === row.user_id);
            if (idx >= 0) { const next = [...prev]; next[idx] = row; return next; }
            return [...prev, row];
          });
        }
      }).subscribe();

    return () => { supabase.removeChannel(chan); };
  }, []);

  // Fetch and subscribe to chat (last 24h only)
  useEffect(() => {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const deletedIds = new Set(JSON.parse(localStorage.getItem('katchii_deleted_msgs') ?? '[]') as string[]);
    supabase.from('pokepark_chat').select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: true }).limit(100)
      .then(({ data }) => {
        if (data) setChat((data as ChatMessage[]).filter(m => !deletedIds.has(m.id)));
      });

    const chan = supabase.channel('pokepark_chat_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pokepark_chat' }, payload => {
        const incoming = payload.new as ChatMessage;
        setChat(prev => {
          // If this user is muted by this admin client, delete from DB immediately
          const exp = mutedUsers.get(incoming.user_id);
          const muted = exp !== undefined && (exp === null || Date.now() < exp);
          if (muted) {
            supabase.from('pokepark_chat').delete().eq('id', incoming.id);
            return prev;
          }
          const optIdx = prev.findIndex(m => m.id.startsWith('opt-') && m.user_id === incoming.user_id && m.message === incoming.message);
          if (optIdx >= 0) {
            const next = [...prev];
            next[optIdx] = incoming;
            return next;
          }
          return [...prev.slice(-99), incoming];
        });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'pokepark_chat' }, payload => {
        const deleted = payload.old as { id: string };
        setChat(prev => prev.filter(m => m.id !== deleted.id));
      }).subscribe();

    return () => { supabase.removeChannel(chan); };
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  // Wander movement
  useEffect(() => {
    if (mood === 'sleep') {
      if (wanderRef.current) clearInterval(wanderRef.current);
      return;
    }
    const MOOD_SPEED: Record<Mood, number> = {
      attack: 10, excited: 9, scared: 11, dance: 5,
      happy: 4, hungry: 6, curious: 3, proud: 2, sleep: 0,
    };
    const speed = MOOD_SPEED[mood] ?? 4;
    const interval = mood === 'dance' ? 1500 : mood === 'proud' ? 4000 : 2500;
    wanderRef.current = setInterval(() => {
      setMyPos(prev => {
        const dx = (Math.random() - 0.5) * speed;
        const dy = (Math.random() - 0.5) * speed;
        return {
          x: Math.max(5, Math.min(85, prev.x + dx)),
          y: Math.max(10, Math.min(70, prev.y + dy)),
        };
      });
    }, interval);
    return () => { if (wanderRef.current) clearInterval(wanderRef.current); };
  }, [mood]);

  // Park XP tick — every 2 min, player + pokemon earn XP based on pokemon rarity/shiny
  useEffect(() => {
    if (!myFav) return;
    const data = POKEMON_BY_ID[myFav.pokemonId];
    const baseXp = PARK_XP_PER_TICK[data?.rarity ?? 'commun'] ?? 5;
    const xp = myFav.isShiny ? baseXp * 2 : baseXp;
    const id = setInterval(() => {
      onAddPlayerXp(xp);
      onAddPokemonXp(myFav.pokemonId, xp);
    }, 2 * 60 * 1000);
    return () => clearInterval(id);
  }, [myFav, onAddPlayerXp, onAddPokemonXp]);

  // Upsert my presence
  const upsertPresence = useCallback(async (pos: { x: number; y: number }, m: Mood) => {
    if (!myUserId || !myFav) return;
    await supabase.from('pokepark_presence').upsert({
      user_id: myUserId,
      username,
      pokemon_id: myFav.pokemonId,
      is_shiny: myFav.isShiny ?? false,
      mood: m,
      x: pos.x,
      y: pos.y,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  }, [myUserId, myFav, username]);

  // Sync presence when position/mood changes
  useEffect(() => {
    upsertPresence(myPos, mood);
  }, [myPos, mood, upsertPresence]);

  // Remove presence on unmount
  useEffect(() => {
    return () => {
      if (myUserId) {
        supabase.from('pokepark_presence').delete().eq('user_id', myUserId);
      }
    };
  }, [myUserId]);

  const sendChat = async () => {
    const msg = chatInput.trim();
    if (!msg) return;
    let uid = myUserId;
    if (!uid) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      uid = user.id;
      setMyUserId(uid);
    }
    setChatInput('');
    const myGrade = getPlayerGrade(state.playerXp ?? 0);
    // Optimistic update — show immediately without waiting for realtime
    const optimistic: ChatMessage = {
      id: `opt-${Date.now()}`,
      user_id: uid,
      username,
      message: msg,
      created_at: new Date().toISOString(),
      grade: myGrade.grade,
      grade_icon: myGrade.icon,
      grade_color: myGrade.color,
    };
    setChat(prev => [...prev.slice(-99), optimistic]);
    let { error } = await supabase.from('pokepark_chat').insert({
      user_id: uid, username, message: msg,
      grade: myGrade.grade, grade_icon: myGrade.icon, grade_color: myGrade.color,
    });
    // Fallback: retry without grade columns if they don't exist yet in DB
    if (error && (error.code === '42703' || error.message.includes('grade'))) {
      const res = await supabase.from('pokepark_chat').insert({ user_id: uid, username, message: msg });
      error = res.error;
    }
    if (error) {
      console.error('[chat] insert error:', error.message, error.code);
      setChat(prev => prev.filter(m => m.id !== optimistic.id));
    }
  };

  const DELETED_KEY = 'katchii_deleted_msgs';
  const getDeletedIds = (): Set<string> => {
    try { return new Set(JSON.parse(localStorage.getItem(DELETED_KEY) ?? '[]')); } catch { return new Set(); }
  };
  const persistDeletedId = (id: string) => {
    const ids = getDeletedIds();
    ids.add(id);
    // keep only last 200 to avoid bloat
    const arr = [...ids].slice(-200);
    localStorage.setItem(DELETED_KEY, JSON.stringify(arr));
  };

  const deleteMessage = async (msgId: string) => {
    setChat(prev => prev.filter(m => m.id !== msgId));
    persistDeletedId(msgId);
    const { error } = await supabase.from('pokepark_chat').delete().eq('id', msgId);
    if (error) console.error('[chat] delete error:', error.message, error.code);
  };

  const muteUser = (userId: string, durationMs: number | null) => {
    const expiry = durationMs === null ? null : Date.now() + durationMs;
    setMutedUsers(prev => {
      const next = new Map(prev).set(userId, expiry);
      saveMuted(next);
      return next;
    });
    setMuteMenuFor(null);
  };

  const unmuteUser = (userId: string) => {
    setMutedUsers(prev => {
      const next = new Map(prev);
      next.delete(userId);
      saveMuted(next);
      return next;
    });
  };

  const isMuted = (userId: string) => {
    const exp = mutedUsers.get(userId);
    if (exp === undefined) return false;
    if (exp === null) return true;
    if (Date.now() < exp) return true;
    setMutedUsers(prev => { const next = new Map(prev); next.delete(userId); saveMuted(next); return next; });
    return false;
  };

  const sendSystemMessage = async (msg: string) => {
    let uid = myUserId;
    if (!uid) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      uid = user.id;
      setMyUserId(uid);
    }
    await supabase.from('pokepark_chat').insert({ user_id: uid, username, message: msg });
  };

  const handleWave = () => {
    if (!interactionTarget) return;
    const target = interactionTarget;
    setWaveTarget(target.userId);
    setInteractionTarget(null);
    setTimeout(() => setWaveTarget(null), 2000);
    sendSystemMessage(`👋 ${username} fait coucou à ${target.username} !`);
  };

  const handleRace = () => {
    if (!interactionTarget) return;
    setShowRace(true);
  };

  const handleDuel = () => {
    if (!interactionTarget) return;
    setShowDuel(true);
  };

  const isPokelian = username.toLowerCase() === 'pokelian';
  const canMute = isAdmin || isPokelian;

  const others = presence.filter(p => p.user_id !== myUserId);
  const mySpriteData = myFav ? POKEMON_BY_ID[myFav.pokemonId] : null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2 bg-black/60 border-b border-slate-700/60 shrink-0">
        <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl px-1">←</button>
        <div className="font-black text-yellow-400 text-sm flex-1">🌿 PokéParc</div>
      </div>

      {/* Mood bar */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/40 border-b border-slate-700/30 shrink-0 overflow-x-auto">
        <span className="text-xs text-slate-500 shrink-0 mr-1">Humeur :</span>
        {([
          ['happy',   '😄', 'Joyeux'],
          ['sleep',   '😴', 'Dors'],
          ['attack',  '⚔️', 'Agressif'],
          ['dance',   '💃', 'Danse'],
          ['excited', '🤩', 'Excité'],
          ['scared',  '😰', 'Effrayé'],
          ['proud',   '👑', 'Fier'],
          ['hungry',  '🍖', 'Affamé'],
          ['curious', '🔍', 'Curieux'],
        ] as [Mood, string, string][]).map(([m, icon, label]) => (
          <button
            key={m}
            onClick={() => setMood(m)}
            className="shrink-0 flex flex-col items-center px-2 py-0.5 rounded-lg transition-all"
            style={{
              background: mood === m ? '#fbbf24' : 'rgba(255,255,255,0.07)',
              color: mood === m ? '#000' : '#94a3b8',
              minWidth: 44,
            }}
          >
            <span className="text-base leading-none">{icon}</span>
            <span className="text-[0.48rem] font-bold mt-0.5">{label}</span>
          </button>
        ))}
      </div>

      {/* Main content: field + chat */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Park field */}
        <div
          className="relative overflow-hidden shrink-0"
          style={{
            height: '42%',
            background: 'linear-gradient(180deg, #0f2a1a 0%, #1a3a2a 40%, #1e4a30 100%)',
          }}
        >
          {/* Ground line */}
          <div className="absolute bottom-0 left-0 right-0 h-12 opacity-30"
            style={{ background: 'linear-gradient(0deg, #2d5a20, transparent)' }} />

          {/* Trees decoration */}
          {[8, 25, 70, 88].map(x => (
            <div key={x} className="absolute bottom-6 text-3xl pointer-events-none select-none"
              style={{ left: `${x}%`, opacity: 0.4 }}>🌲</div>
          ))}

          {/* No pokemon message */}
          {!myFav && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(15,23,42,0.65)' }}>
              <button
                onClick={() => setShowPicker(true)}
                className="px-6 py-3 rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-transform"
                style={{ background: 'linear-gradient(90deg,#fbbf24,#f59e0b)', color: '#000' }}
              >
                ➕ Ajouter un Pokémon
              </button>
            </div>
          )}

          {/* Player count */}
          <div className="absolute top-2 left-2">
            <div className="text-xs text-slate-400 bg-black/40 rounded px-2 py-0.5">
              {others.length + (myFav ? 1 : 0)} joueurs en ligne
            </div>
          </div>

          {/* Other players */}
          {others.map(p => {
            const data = POKEMON_BY_ID[p.pokemon_id];
            return (
              <div
                key={p.user_id}
                className="absolute"
                style={{
                  left: `${p.x}%`, top: `${p.y}%`,
                  transform: 'translate(-50%, -50%)',
                  animation: p.mood !== 'sleep'
                    ? (p.pokemon_id % 3 === 0 ? 'wander-a 8s ease-in-out infinite' : p.pokemon_id % 3 === 1 ? 'wander-b 10s ease-in-out infinite' : 'wander-c 12s ease-in-out infinite')
                    : undefined,
                  animationDelay: `${(p.pokemon_id % 5) * 1.2}s`,
                }}
              >
                <ParkSprite
                  pokemonId={p.pokemon_id}
                  isShiny={p.is_shiny}
                  mood={p.mood}
                  username={p.username}
                  isMine={false}
                  waveTarget={waveTarget === p.user_id}
                  onClick={() => {
                    setInteractionTarget({
                      userId: p.user_id,
                      username: p.username,
                      pokemonId: p.pokemon_id,
                      isShiny: p.is_shiny,
                      level: data ? (state.pokemonLevels[p.pokemon_id]?.level ?? 5) : 5,
                      rarity: data?.rarity ?? 'commun',
                    });
                    const tx = Math.max(5, Math.min(85, p.x + (p.x > 50 ? -12 : 12)));
                    const ty = Math.max(10, Math.min(70, p.y + (p.y > 50 ? -8 : 8)));
                    setMyPos({ x: tx, y: ty });
                  }}
                />
              </div>
            );
          })}

          {/* Gray overlay while picker is open */}
          {showPicker && (
            <div className="absolute inset-0 z-10 pointer-events-none" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'grayscale(0.8)' }} />
          )}

          {/* My pokemon */}
          {myFav && (
            <div
              className="absolute"
              style={{
                left: `${myPos.x}%`,
                top: `${myPos.y}%`,
                transform: 'translate(-50%, -50%)',
                transition: 'left 2s ease-in-out, top 2s ease-in-out',
                zIndex: justPlaced ? 20 : undefined,
                animation: justPlaced ? 'park-place-bounce 0.7s cubic-bezier(.175,.885,.32,1.275) forwards' : undefined,
              }}
            >
              <ParkSprite
                pokemonId={myFav.pokemonId}
                isShiny={myFav.isShiny ?? false}
                mood={mood}
                username={username}
                isMine={true}
                onClick={() => setShowPicker(true)}
                wins={(state.pokemonWins ?? {})[myFav.pokemonId] ?? 0}
              />
            </div>
          )}

          {/* Change pokemon button */}
          {myFav && (
            <button
              onClick={() => setShowPicker(true)}
              className="absolute bottom-2 right-2 text-xs px-2 py-1 rounded-lg bg-black/50 text-slate-400 border border-slate-700/60"
            >
              Changer
            </button>
          )}
        </div>

        {/* Chat */}
        <div className="flex-1 flex flex-col bg-black/40 border-t border-slate-700/40 overflow-hidden">
          <div className="text-xs font-bold text-slate-400 px-3 py-1.5 border-b border-slate-700/40 shrink-0">
            💬 Chat du parc
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
            {chat.length === 0 && (
              <div className="text-xs text-slate-600 text-center py-4">Soyez le premier à écrire !</div>
            )}
            {chat.filter(m => !isMuted(m.user_id)).map(msg => (
              <div key={msg.id} className="flex flex-col gap-0.5 text-xs group relative">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-slate-500 shrink-0" style={{ fontSize: '0.55rem' }}>
                    {formatChatTime(msg.created_at)}
                  </span>
                  {msg.grade_icon && (
                    <span title={msg.grade} style={{ fontSize: '0.65rem', color: msg.grade_color ?? '#94a3b8' }}>
                      {msg.grade_icon} {msg.grade}
                    </span>
                  )}
                  <span className="font-bold shrink-0" style={{
                    color: msg.username?.toLowerCase() === 'pokelian' ? '#ef4444' : msg.user_id === myUserId ? '#fbbf24' : '#60a5fa'
                  }}>
                    {msg.username}
                  </span>
                  {canMute && msg.user_id !== myUserId && (
                    <span className="ml-auto flex items-center gap-1 shrink-0">
                      {/* Delete — admin + pokelian */}
                      <button onClick={() => deleteMessage(msg.id)}
                        className="text-red-500 hover:text-red-400 px-1 rounded text-xs" title="Supprimer">🗑️</button>
                      {/* Mute / unmute — admin + pokelian */}
                      <div className="relative">
                        {isMuted(msg.user_id) ? (
                          <button onClick={() => unmuteUser(msg.user_id)}
                            className="text-green-500 hover:text-green-400 px-1 rounded text-xs font-bold" title="Démuter">
                            🔊 Démute
                          </button>
                        ) : (
                          <button onClick={() => setMuteMenuFor(muteMenuFor === msg.id ? null : msg.id)}
                            className="text-orange-500 hover:text-orange-400 px-1 rounded text-xs" title="Muter">🔇</button>
                        )}
                        {muteMenuFor === msg.id && (
                          <div className="absolute right-0 bottom-6 z-50 bg-slate-800 border border-slate-600 rounded-xl shadow-xl flex flex-col overflow-hidden" style={{ minWidth: 110 }}>
                            {[
                              { label: '5 min', ms: 5 * 60 * 1000 },
                              { label: '1 heure', ms: 60 * 60 * 1000 },
                              { label: 'Permanent', ms: null },
                            ].map(opt => (
                              <button key={opt.label} onClick={() => muteUser(msg.user_id, opt.ms)}
                                className="px-3 py-2 text-xs font-bold text-left hover:bg-slate-700 text-orange-300 whitespace-nowrap">
                                🔇 {opt.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </span>
                  )}
                </div>
                <span className="text-slate-300 break-all pl-1">{msg.message}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="flex gap-2 px-3 py-2 border-t border-slate-700/40 shrink-0" style={{ background: '#0f172a', paddingBottom: 'calc(0.5rem + 72px)' }}>
            <input
              className="flex-1 rounded-lg px-3 py-2 text-white outline-none border border-slate-600 focus:border-blue-500"
              style={{ background: '#1e293b', minHeight: 40, fontSize: 16 }}
              placeholder="Écrire un message…"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendChat(); }}
              maxLength={200}
            />
            <button
              onClick={sendChat}
              disabled={!chatInput.trim()}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold disabled:opacity-40 shrink-0"
            >
              ➤
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showPicker && (
        <PokemonPicker
          state={state}
          onPick={(pokemonId, isShiny) => {
            onSetFavoritePokemon({ pokemonId, isShiny });
            setShowPicker(false);
            setJustPlaced(true);
            setTimeout(() => setJustPlaced(false), 1500);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}

      {interactionTarget && !showRace && !showDuel && (
        <InteractionModal
          target={interactionTarget}
          onWave={handleWave}
          onRace={handleRace}
          onDuel={handleDuel}
          onClose={() => setInteractionTarget(null)}
        />
      )}

      {showRace && interactionTarget && myFav && (
        <RaceModal
          myPokemonId={myFav.pokemonId}
          myIsShiny={myFav.isShiny ?? false}
          myLevel={getPokemonLevelFromState(state, myFav.pokemonId)}
          myRarity={mySpriteData?.rarity ?? 'commun'}
          opponentPokemonId={interactionTarget.pokemonId}
          opponentIsShiny={interactionTarget.isShiny}
          opponentLevel={interactionTarget.level}
          opponentRarity={interactionTarget.rarity}
          opponentName={interactionTarget.username}
          onResult={(won) => { if (won) onTrainingWin?.(); }}
          onClose={() => { setShowRace(false); setInteractionTarget(null); }}
        />
      )}

      {showDuel && interactionTarget && myFav && (
        <DuelModal
          myPokemonId={myFav.pokemonId}
          myIsShiny={myFav.isShiny ?? false}
          myLevel={getPokemonLevelFromState(state, myFav.pokemonId)}
          myRarity={mySpriteData?.rarity ?? 'commun'}
          opponentPokemonId={interactionTarget.pokemonId}
          opponentIsShiny={interactionTarget.isShiny}
          opponentLevel={interactionTarget.level}
          opponentRarity={interactionTarget.rarity}
          opponentName={interactionTarget.username}
          onResult={(won) => { if (won) onTrainingWin?.(); }}
          onClose={() => { setShowDuel(false); setInteractionTarget(null); }}
        />
      )}

    </div>
  );
}
