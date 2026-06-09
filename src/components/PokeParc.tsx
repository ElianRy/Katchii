import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { GameState, RARITY_COLORS } from '../types';
import { POKEMON_BY_ID } from '../data/gen1';
import { POKEMON_TYPE } from '../data/pokemonTypes';
import { getPlayerGrade, PARK_XP_PER_TICK } from '../lib/playerLevel';
import { xpToNextLevel } from '../data/combatEngine';

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
  onSetLastParkXpAt?: (ts: number) => void;
  onTrainingWin?: () => void;
  onParkDuelResult?: (won: boolean, eloDelta: number) => void;
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

// ---- Shiny perspective orbit stars (same system as wild spawn, less intense) ----
const PARK_ORBIT_STARS: { color: string; dur: string; delay: string; sym: string; size: number; anim: string; layer: 'front' | 'back' }[] = [
  { color: '#fde047', dur: '3.2s', delay: '0s',    sym: '✦', size: 14, anim: 'shiny-persp-a', layer: 'front' },
  { color: '#f472b6', dur: '2.6s', delay: '-0.9s', sym: '★', size: 12, anim: 'shiny-persp-b', layer: 'back'  },
  { color: '#60a5fa', dur: '4.0s', delay: '-1.7s', sym: '✦', size: 13, anim: 'shiny-persp-c', layer: 'front' },
  { color: '#fbbf24', dur: '2.2s', delay: '-0.4s', sym: '✧', size: 11, anim: 'shiny-persp-d', layer: 'back'  },
  { color: '#ffffff', dur: '3.6s', delay: '-2.1s', sym: '★', size: 12, anim: 'shiny-persp-e', layer: 'front' },
  { color: '#4ade80', dur: '2.9s', delay: '-1.3s', sym: '✦', size: 13, anim: 'shiny-persp-a', layer: 'back'  },
  { color: '#c084fc', dur: '2.4s', delay: '-1.5s', sym: '✧', size: 12, anim: 'shiny-persp-d', layer: 'front' },
  { color: '#fb923c', dur: '3.8s', delay: '-2.8s', sym: '★', size: 11, anim: 'shiny-persp-b', layer: 'back'  },
];

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
  pokemonId, isShiny, mood, username, isMine, onClick, waveTarget, wins, isOnline,
}: {
  pokemonId: number; isShiny: boolean; mood: Mood; username: string;
  isMine: boolean; onClick?: () => void; waveTarget?: boolean; wins?: number; isOnline?: boolean;
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

  const filter = isShiny ? undefined : `drop-shadow(0 0 5px ${rarityColor})`;
  const imgAnimation = isShiny
    ? `shiny-img-rainbow 3s linear infinite${spriteAnim ? ', ' + spriteAnim : ''}`
    : spriteAnim || undefined;

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

      {/* Sprite + shiny orbit stars */}
      <div style={{ position: 'relative', width: 56, height: 56, display: 'inline-block' }}>
        {/* Shiny stars BEHIND sprite */}
        {isShiny && PARK_ORBIT_STARS.filter(s => s.layer === 'back').map((star, i) => (
          <div key={`b${i}`} style={{
            position: 'absolute', left: 28, top: 28, width: 0, height: 0, zIndex: 0,
            animation: `${star.anim} ${star.dur} ${star.delay} linear infinite`,
          } as React.CSSProperties}>
            <span style={{
              position: 'absolute', transform: 'translate(-50%,-50%)',
              color: star.color, fontSize: star.size, fontWeight: 900,
              textShadow: `0 0 6px ${star.color}, 0 0 12px ${star.color}88`,
              lineHeight: 1, userSelect: 'none',
            }}>{star.sym}</span>
          </div>
        ))}
        {err ? (
          <div style={{
            width: 56, height: 56,
            background: `linear-gradient(135deg, ${rarityColor}33, ${rarityColor}11)`,
            border: `1px solid ${rarityColor}66`,
            borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, filter, position: 'relative', zIndex: 1,
          }}>?</div>
        ) : (
          <img
            src={getSpriteUrl(pokemonId, isShiny)}
            width={56} height={56}
            style={{ imageRendering: 'pixelated', objectFit: 'contain', filter, animation: imgAnimation, position: 'relative', zIndex: 1 }}
            onError={() => setErr(true)}
            draggable={false}
            alt={data?.name ?? '?'}
          />
        )}
        {/* Shiny stars IN FRONT of sprite */}
        {isShiny && PARK_ORBIT_STARS.filter(s => s.layer === 'front').map((star, i) => (
          <div key={`f${i}`} style={{
            position: 'absolute', left: 28, top: 28, width: 0, height: 0, zIndex: 5,
            animation: `${star.anim} ${star.dur} ${star.delay} linear infinite`,
          } as React.CSSProperties}>
            <span style={{
              position: 'absolute', transform: 'translate(-50%,-50%)',
              color: star.color, fontSize: star.size, fontWeight: 900,
              textShadow: `0 0 6px ${star.color}, 0 0 12px ${star.color}88`,
              lineHeight: 1, userSelect: 'none',
            }}>{star.sym}</span>
          </div>
        ))}
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
          {isMine ? '★ ' : ''}{isOnline && !isMine && <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: '#4ade80', marginRight: 2, verticalAlign: 'middle' }} />}<span style={username?.toLowerCase() === 'pokelian' && !isMine ? { color: '#ef4444' } : {}}>{username}</span>
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
      className="fixed inset-0 z-[600] flex items-center justify-center bg-black/80"
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
    <div className="fixed inset-0 z-[550] flex items-center justify-center bg-black/50" onClick={onClose}>
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
  myPokemonId, myIsShiny, myLevel, myRarity, myElo,
  opponentPokemonId, opponentIsShiny, opponentLevel, opponentRarity, opponentName,
  onClose, onResult,
}: {
  myPokemonId: number; myIsShiny: boolean; myLevel: number; myRarity: string; myElo: number;
  opponentPokemonId: number; opponentIsShiny: boolean; opponentLevel: number; opponentRarity: string;
  opponentName: string; onClose: () => void; onResult: (won: boolean, eloDelta: number) => void;
}) {
  const myData = POKEMON_BY_ID[myPokemonId];
  const oppData = POKEMON_BY_ID[opponentPokemonId];
  const myScore = myLevel * (RARITY_SCORE[myRarity] ?? 1);
  const oppScore = opponentLevel * (RARITY_SCORE[opponentRarity] ?? 1);
  const won = useRef(Math.random() < myScore / (myScore + oppScore)).current;

  // Elo calculation
  const oppElo = 600 + opponentLevel * 8 * ((RARITY_SCORE[opponentRarity] ?? 1) / 4);
  const expected = 1 / (1 + Math.pow(10, (oppElo - myElo) / 400));
  const rawDelta = Math.round(32 * ((won ? 1 : 0) - expected));
  const eloDelta = Math.max(-20, Math.min(20, rawDelta));
  const newElo = Math.max(100, myElo + eloDelta);

  const [phase, setPhase] = useState<'flash' | 'result'>('flash');
  const resultSent = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setPhase('result');
      if (!resultSent.current) { resultSent.current = true; onResult(won, eloDelta); }
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  const myRarityColor = myData ? RARITY_COLORS[myData.rarity] : '#6b7280';
  const oppRarityColor = oppData ? RARITY_COLORS[oppData.rarity] : '#6b7280';

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/85">
      <div className="bg-slate-800 rounded-2xl border border-slate-600 shadow-2xl p-5 w-80 max-w-[95vw]">
        {/* Sprites */}
        <div className="flex justify-around items-end mb-4">
          <div className="flex flex-col items-center gap-1">
            <img src={getSpriteUrl(myPokemonId, myIsShiny)} width={56} height={56}
              style={{ imageRendering: 'pixelated', filter: `drop-shadow(0 0 8px ${myRarityColor})` }} alt="me" />
            <span className="text-xs text-yellow-400 font-bold truncate max-w-[80px] text-center">Toi</span>
          </div>
          <div className="text-3xl font-black text-white">VS</div>
          <div className="flex flex-col items-center gap-1">
            <img src={getSpriteUrl(opponentPokemonId, opponentIsShiny)} width={56} height={56}
              style={{ imageRendering: 'pixelated', transform: 'scaleX(-1)', filter: `drop-shadow(0 0 8px ${oppRarityColor})` }} alt="opp" />
            <span className="text-xs text-slate-300 font-bold truncate max-w-[80px] text-center">{opponentName}</span>
          </div>
        </div>

        {phase === 'flash' && (
          <div className="text-center py-4">
            <div className="text-4xl animate-pulse">⚔️</div>
            <div className="text-sm text-slate-400 mt-2 animate-pulse">Combat en cours…</div>
          </div>
        )}

        {phase === 'result' && (
          <div className="text-center">
            <div className="text-5xl mb-2">{won ? '🏆' : '💀'}</div>
            <div className="font-black text-xl mb-1" style={{ color: won ? '#fbbf24' : '#ef4444' }}>
              {won ? 'VICTOIRE !' : 'Défaite…'}
            </div>
            <div className="text-xs text-slate-400 mb-3">
              {won ? `Tu as battu ${opponentName} !` : `${opponentName} était trop fort.`}
            </div>

            {/* Elo change */}
            <div className="bg-slate-700/60 rounded-xl px-4 py-3 mb-4 text-center">
              <div className="text-xs text-slate-400 mb-1">Elo PokéParc</div>
              <div className="flex items-center justify-center gap-2">
                <span className="font-black text-lg text-white">{newElo}</span>
                <span className="font-bold text-sm" style={{ color: eloDelta >= 0 ? '#4ade80' : '#f87171' }}>
                  {eloDelta >= 0 ? '+' : ''}{eloDelta}
                </span>
              </div>
            </div>

            <button onClick={onClose} className="w-full py-2 rounded-xl bg-slate-600 text-white font-black text-sm">
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
  const [search, setSearch] = React.useState('');
  const owned = Object.entries(state.normalCollection)
    .filter(([, count]) => count > 0)
    .map(([id]) => Number(id))
    .sort((a, b) => a - b);

  const shinyOwned = new Set(Object.entries(state.shinyCollection).filter(([, c]) => c > 0).map(([id]) => Number(id)));

  const filtered = owned.filter(id => {
    if (!search) return true;
    return (POKEMON_BY_ID[id]?.name ?? '').toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="fixed inset-0 z-[550] flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="bg-slate-800 rounded-2xl border border-slate-600 p-4 w-80 max-w-[95vw] max-h-[75vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="font-black text-white mb-2 text-center">Choisir ton Pokémon</div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher…"
          className="mb-2 bg-slate-700 border border-slate-500 rounded-xl px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
        <div className="overflow-y-auto flex-1 grid grid-cols-4 gap-2 pb-2">
          {filtered.map(id => {
            const data = POKEMON_BY_ID[id];
            const isShiny = shinyOwned.has(id);
            const rarityColor = data ? RARITY_COLORS[data.rarity] : '#6b7280';
            return (
              <button
                key={id}
                onClick={() => { onPick(id, isShiny); onClose(); }}
                className="relative flex flex-col items-center gap-0.5 p-1 rounded-lg bg-slate-700/50 hover:bg-slate-600/50"
              >
                <div className="relative">
                  <img
                    src={getSpriteUrl(id, isShiny)} width={36} height={36}
                    style={{
                      imageRendering: 'pixelated',
                      filter: isShiny ? 'drop-shadow(0 0 4px #fde047)' : `drop-shadow(0 0 3px ${rarityColor})`,
                    }}
                    alt={data?.name}
                  />
                  {isShiny && (
                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}>
                      {[0,1,2,3].map(i => {
                        const angle = (i / 4) * Math.PI * 2;
                        const r = 20;
                        return (
                          <div key={i} className="shiny-sparkle" style={{
                            position: 'absolute',
                            left: Math.cos(angle) * r + 18,
                            top: Math.sin(angle) * r + 18,
                            '--sp-color': ['#fde047','#f472b6','#60a5fa','#4ade80'][i],
                            '--sp-duration': `${1.0 + i * 0.2}s`,
                            '--sp-delay': `${i * 0.25}s`,
                          } as React.CSSProperties} />
                        );
                      })}
                    </div>
                  )}
                </div>
                <span className="text-[0.45rem] text-slate-300 truncate w-full text-center">{data?.name}</span>
                {isShiny && <span className="text-[0.4rem] text-yellow-400 font-bold">✨ Shiny</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}


// ---- Main Component ----
export function PokeParc({ state, username, isAdmin = false, onClose, onSetFavoritePokemon, onAddPlayerXp, onAddPokemonXp, onSetLastParkXpAt, onTrainingWin, onParkDuelResult }: Props) {
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
  const [parkRevealed, setParkRevealed] = useState(!!state.favoritePokemon);
  const [xpPop, setXpPop] = useState<{ xp: number; key: number } | null>(null);
  const [offlineParkXp, setOfflineParkXp] = useState<{ xp: number; pokemonId: number; isShiny: boolean; levelBefore: number; levelAfter: number; xpBefore: number; xpAfter: number } | null>(null);
  const [xpBarFill, setXpBarFill] = useState(0);
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
  const adminChanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
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
    const HIDDEN_USERS = ['elian', 'resteappu', 'test'];
    const filterPresence = (rows: PresenceRow[]) =>
      rows.filter(r => !HIDDEN_USERS.includes(r.username?.toLowerCase() ?? ''));

    supabase.from('pokepark_presence').select('*').then(({ data }) => {
      if (data) setPresence(filterPresence(data as PresenceRow[]));
    });

    const chan = supabase.channel('pokepark_presence_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pokepark_presence' }, payload => {
        if (payload.eventType === 'DELETE') {
          setPresence(prev => prev.filter(p => p.user_id !== (payload.old as PresenceRow).user_id));
        } else {
          const row = payload.new as PresenceRow;
          if (HIDDEN_USERS.includes(row.username?.toLowerCase() ?? '')) return;
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

  // Broadcast channel for moderation (delete/mute) — propagates to all connected clients
  useEffect(() => {
    const chan = supabase.channel('katchii_moderation')
      .on('broadcast', { event: 'delete' }, ({ payload }) => {
        const { msgId } = payload as { msgId: string };
        setChat(prev => prev.filter(m => m.id !== msgId));
      })
      .on('broadcast', { event: 'mute' }, ({ payload }) => {
        const { userId, expiry } = payload as { userId: string; expiry: number | null };
        setMutedUsers(prev => { const next = new Map(prev).set(userId, expiry); saveMuted(next); return next; });
      })
      .on('broadcast', { event: 'unmute' }, ({ payload }) => {
        const { userId } = payload as { userId: string };
        setMutedUsers(prev => { const next = new Map(prev); next.delete(userId); saveMuted(next); return next; });
      })
      .subscribe();
    adminChanRef.current = chan;
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

  // Park XP tick — every 2 min, player + pokemon earn XP scaled by pokemon level
  // Offline XP: on mount, award XP for time away (capped at 30h, only notified after 1h)
  useEffect(() => {
    if (!myFav) return;
    const data = POKEMON_BY_ID[myFav.pokemonId];
    const rarityBase = PARK_XP_PER_TICK[data?.rarity ?? 'commun'] ?? 5;
    const lastAt = state.lastParkXpAt;
    if (lastAt) {
      const elapsed = Date.now() - lastAt;
      const THREE_MIN = 3 * 60 * 1000;
      const FIVE_HOURS = 5 * 60 * 60 * 1000;
      const TICK_MS = 2 * 60 * 1000;
      if (elapsed >= THREE_MIN) {
        const cappedElapsed = Math.min(elapsed, FIVE_HOURS);
        const ticks = Math.floor(cappedElapsed / TICK_MS);
        if (ticks > 0) {
          const levelBefore = state.pokemonLevels?.[myFav.pokemonId]?.level ?? 1;
          const xpBefore = state.pokemonLevels?.[myFav.pokemonId]?.xp ?? 0;
          const xpPerTick = Math.floor(rarityBase * (1 + levelBefore * 0.4) * (myFav.isShiny ? 2 : 1));
          const totalXp = ticks * xpPerTick;
          // Compute level after (simulate leveling)
          let lAfter = levelBefore;
          let xpAcc = xpBefore + totalXp;
          while (lAfter < 100 && xpAcc >= xpToNextLevel(lAfter)) { xpAcc -= xpToNextLevel(lAfter); lAfter++; }
          if (lAfter >= 100) xpAcc = 0;
          onAddPlayerXp(totalXp);
          onAddPokemonXp(myFav.pokemonId, totalXp);
          setOfflineParkXp({ xp: totalXp, pokemonId: myFav.pokemonId, isShiny: myFav.isShiny ?? false, levelBefore, levelAfter: lAfter, xpBefore, xpAfter: xpAcc });
          setXpBarFill(0);
          setTimeout(() => setXpBarFill(100), 100);
        }
      }
      onSetLastParkXpAt?.(Date.now());
    } else {
      onSetLastParkXpAt?.(Date.now());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live park XP tick every 2 min
  useEffect(() => {
    if (!myFav) return;
    const data = POKEMON_BY_ID[myFav.pokemonId];
    const rarityBase = PARK_XP_PER_TICK[data?.rarity ?? 'commun'] ?? 5;
    const id = setInterval(() => {
      const level = state.pokemonLevels?.[myFav.pokemonId]?.level ?? 1;
      const xp = Math.floor(rarityBase * (1 + level * 0.4) * (myFav.isShiny ? 2 : 1));
      onAddPlayerXp(xp);
      onAddPokemonXp(myFav.pokemonId, xp);
      onSetLastParkXpAt?.(Date.now());
      setXpPop({ xp, key: Date.now() });
      setTimeout(() => setXpPop(null), 2000);
    }, 2 * 60 * 1000);
    return () => clearInterval(id);
  }, [myFav, onAddPlayerXp, onAddPokemonXp, onSetLastParkXpAt]);

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
    // Block muted users from sending
    if (myUserId && isMuted(myUserId)) {
      setChatInput('');
      return;
    }
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
    adminChanRef.current?.send({ type: 'broadcast', event: 'delete', payload: { msgId } });
    const { error } = await supabase.from('pokepark_chat').delete().eq('id', msgId);
    if (error) console.error('[chat] delete error:', error.message, error.code);
  };

  const muteUser = (userId: string, durationMs: number | null) => {
    const expiry = durationMs === null ? null : Date.now() + durationMs;
    setMutedUsers(prev => { const next = new Map(prev).set(userId, expiry); saveMuted(next); return next; });
    adminChanRef.current?.send({ type: 'broadcast', event: 'mute', payload: { userId, expiry } });
    setMuteMenuFor(null);
  };

  const unmuteUser = (userId: string) => {
    setMutedUsers(prev => { const next = new Map(prev); next.delete(userId); saveMuted(next); return next; });
    adminChanRef.current?.send({ type: 'broadcast', event: 'unmute', payload: { userId } });
  };

  const isMuted = (userId: string) => {
    const exp = mutedUsers.get(userId);
    if (exp === undefined) return false;
    if (exp === null) return true;
    if (Date.now() < exp) return true;
    setMutedUsers(prev => { const next = new Map(prev); next.delete(userId); saveMuted(next); return next; });
    return false;
  };


  const handleWave = () => {
    if (!interactionTarget) return;
    const target = interactionTarget;
    setWaveTarget(target.userId);
    setInteractionTarget(null);
    setTimeout(() => setWaveTarget(null), 2000);
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

      {/* Offline XP modal */}
      {offlineParkXp !== null && (() => {
        const pkData = POKEMON_BY_ID[offlineParkXp.pokemonId];
        const spriteUrl = offlineParkXp.isShiny
          ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${offlineParkXp.pokemonId}.png`
          : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${offlineParkXp.pokemonId}.png`;
        const rarityColor = pkData ? RARITY_COLORS[pkData.rarity] : '#6b7280';
        const { levelBefore, levelAfter, xpAfter } = offlineParkXp;
        const levelsGained = levelAfter - levelBefore;
        const xpNeeded = levelAfter >= 100 ? 1 : xpToNextLevel(levelAfter);
        const xpPct = levelAfter >= 100 ? 100 : Math.min(100, Math.floor(xpAfter / xpNeeded * 100));
        return (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70" onClick={() => setOfflineParkXp(null)}>
            <div className="bg-slate-900 border border-yellow-400/40 rounded-3xl px-8 py-6 text-center shadow-2xl max-w-xs w-full mx-4" onClick={e => e.stopPropagation()}>
              <div className="text-yellow-300 font-black text-base mb-3">🌿 Bienvenue au PokéParc !</div>
              <img
                src={spriteUrl} alt={pkData?.name ?? ''}
                width={96} height={96}
                className="mx-auto"
                style={{
                  imageRendering: 'pixelated',
                  filter: offlineParkXp.isShiny
                    ? 'drop-shadow(0 0 12px #fde047) drop-shadow(0 0 24px #f0abfc88)'
                    : `drop-shadow(0 0 10px ${rarityColor})`,
                  animation: 'bounce-pokemon 1.2s ease-in-out infinite',
                }}
              />
              {levelsGained > 0 ? (
                <div className="text-yellow-400 font-black text-3xl mt-2">
                  ⬆️ +{levelsGained} niveau{levelsGained > 1 ? 'x' : ''} !
                </div>
              ) : (
                <div className="text-white font-black text-xl mt-2">{pkData?.name ?? 'Ton Pokémon'} a progressé !</div>
              )}
              <div className="text-white/70 font-bold text-base mt-1">+{offlineParkXp.xp} XP</div>
              <div className="text-slate-400 text-xs mt-1 mb-3">
                {levelsGained > 0
                  ? `Niv. ${levelBefore} → ${levelAfter} · ${pkData?.name ?? 'Ton Pokémon'} s'est entraîné !`
                  : `${pkData?.name ?? 'Ton Pokémon'} s'est entraîné pendant ton absence !`}
              </div>
              {/* XP bar — same as TeamBuilder */}
              <div className="mb-1">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Niv. {levelAfter}{levelAfter >= 100 ? ' MAX' : ''}</span>
                  <span>{levelAfter >= 100 ? 'MAX' : `${xpAfter} / ${xpNeeded} XP`}</span>
                </div>
                <div className="w-full bg-slate-700/60 rounded-full overflow-hidden" style={{ height: 6 }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${xpBarFill * xpPct / 100}%`,
                      background: `linear-gradient(90deg, ${rarityColor}, #fbbf24)`,
                      transition: 'width 1.8s cubic-bezier(0.4,0,0.2,1)',
                      boxShadow: `0 0 6px ${rarityColor}88`,
                    }}
                  />
                </div>
              </div>
              <button
                onClick={() => setOfflineParkXp(null)}
                className="mt-4 px-8 py-2 rounded-xl font-black text-sm text-black"
                style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}
              >
                Super !
              </button>
            </div>
          </div>
        );
      })()}

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

          {/* Dark overlay before first pokemon is placed */}
          {!parkRevealed && (
            <div className="absolute inset-0 flex items-center justify-center z-10" style={{ background: 'rgba(2,6,23,0.92)' }}>
              <button
                onClick={() => setShowPicker(true)}
                className="px-6 py-3 rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-transform"
                style={{ background: 'linear-gradient(90deg,#fbbf24,#f59e0b)', color: '#000' }}
              >
                ➕ Ajouter un Pokémon
              </button>
            </div>
          )}

          {/* Reveal animation overlay — plays once after placement */}
          {justPlaced && (
            <div
              className="absolute inset-0 z-10 pointer-events-none"
              style={{ animation: 'park-reveal 1.4s ease-out forwards' }}
            />
          )}

          {/* Player count */}
          <div className="absolute top-2 left-2">
            <div className="text-xs text-slate-400 bg-black/40 rounded px-2 py-0.5">
              {others.length + (myFav ? 1 : 0)} joueurs en ligne
            </div>
          </div>

          {/* Other players — hidden until park is revealed */}
          {parkRevealed && others.map(p => {
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
                  isOnline={Date.now() - new Date(p.updated_at).getTime() < 60000}
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
              {xpPop && (
                <div
                  key={xpPop.key}
                  className="absolute left-1/2 pointer-events-none font-black text-sm text-yellow-300"
                  style={{
                    transform: 'translateX(-50%)',
                    top: '-28px',
                    textShadow: '0 1px 6px #000',
                    animation: 'park-xp-pop 2s ease-out forwards',
                    zIndex: 30,
                    whiteSpace: 'nowrap',
                  }}
                >
                  +{xpPop.xp} XP ✨
                </div>
              )}
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

          {/* Change / remove pokemon buttons */}
          {myFav && (
            <div className="absolute bottom-2 right-2 flex gap-1">
              <button
                onClick={async () => {
                  onSetFavoritePokemon(null);
                  setParkRevealed(false);
                  if (myUserId) {
                    await supabase.from('pokepark_presence').delete().eq('user_id', myUserId);
                  }
                }}
                className="text-xs px-2 py-1 rounded-lg bg-black/50 text-red-400 border border-red-900/60"
              >
                Retirer
              </button>
              <button
                onClick={() => setShowPicker(true)}
                className="text-xs px-2 py-1 rounded-lg bg-black/50 text-slate-400 border border-slate-700/60"
              >
                Changer
              </button>
            </div>
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
                  {canMute && (
                    <span className="ml-auto flex items-center gap-1 shrink-0">
                      {/* Delete — admin + pokelian (tous les messages y compris les leurs) */}
                      <button onClick={() => deleteMessage(msg.id)}
                        className="text-red-500 hover:text-red-400 px-1 rounded text-xs" title="Supprimer">🗑️</button>
                      {/* Mute / unmute — admin + pokelian (pas sur ses propres messages) */}
                      {msg.user_id !== myUserId && <div className="relative">
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
                      </div>}
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
            setParkRevealed(true);
            setJustPlaced(true);
            setTimeout(() => setJustPlaced(false), 1500);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}

      {interactionTarget && !showRace && !showDuel && createPortal(
        <InteractionModal
          target={interactionTarget}
          onWave={handleWave}
          onRace={handleRace}
          onDuel={handleDuel}
          onClose={() => setInteractionTarget(null)}
        />,
        document.body
      )}

      {showRace && interactionTarget && myFav && createPortal(<RaceModal
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
        />, document.body)}

      {showDuel && interactionTarget && myFav && createPortal(
        <DuelModal
          myPokemonId={myFav.pokemonId}
          myIsShiny={myFav.isShiny ?? false}
          myLevel={getPokemonLevelFromState(state, myFav.pokemonId)}
          myRarity={mySpriteData?.rarity ?? 'commun'}
          myElo={state.parkElo ?? 1000}
          opponentPokemonId={interactionTarget.pokemonId}
          opponentIsShiny={interactionTarget.isShiny}
          opponentLevel={interactionTarget.level}
          opponentRarity={interactionTarget.rarity}
          opponentName={interactionTarget.username}
          onResult={(won, eloDelta) => {
            if (won) onTrainingWin?.();
            onParkDuelResult?.(won, eloDelta);
          }}
          onClose={() => { setShowDuel(false); setInteractionTarget(null); }}
        />,
        document.body
      )}

    </div>
  );
}
