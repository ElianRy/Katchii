import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { GameState, RARITY_COLORS } from '../types';
import { POKEMON_BY_ID } from '../data/gen1';

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
  onClose: () => void;
  onUpdateVillage: (updater: (prev: GameState['village']) => GameState['village']) => void;
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

function ParkSprite({
  pokemonId, isShiny, mood, username, isMine, onClick, waveTarget,
}: {
  pokemonId: number; isShiny: boolean; mood: Mood; username: string;
  isMine: boolean; onClick?: () => void; waveTarget?: boolean;
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

      {/* Shiny aura — small tight glow */}
      {isShiny && (
        <>
          <div className="absolute pointer-events-none" style={{
            inset: -4, borderRadius: '50%',
            background: 'conic-gradient(from 0deg, #f87171, #fb923c, #fde047, #4ade80, #60a5fa, #c084fc, #f472b6, #f87171)',
            animation: 'rainbow-spin 2s linear infinite',
            opacity: 0.55, filter: 'blur(3px)',
          }} />
          {/* Sparkle stars */}
          {[
            { top: '-10px', left: '50%', delay: '0s' },
            { top: '10%',  right: '-10px', delay: '0.4s' },
            { bottom: '-8px', left: '50%', delay: '0.8s' },
            { top: '10%',  left: '-10px', delay: '1.2s' },
          ].map((pos, i) => (
            <div key={i} className="absolute pointer-events-none text-yellow-300 leading-none"
              style={{ ...pos, fontSize: '0.65rem', animation: `zzz-float 1.2s ${pos.delay} ease-in-out infinite` }}>
              ✦
            </div>
          ))}
        </>
      )}

      {/* Sprite */}
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

      {/* Username badge */}
      <div className="rounded px-1.5 py-0.5 text-center max-w-[80px] truncate" style={{
        background: isMine ? 'rgba(251,191,36,0.85)' : 'rgba(0,0,0,0.75)',
        color: isMine ? '#000' : rarityColor,
        fontSize: '0.55rem',
        fontWeight: 'bold',
        whiteSpace: 'nowrap',
      }}>
        {isMine ? '★ ' : ''}{username}
      </div>
    </div>
  );
}

// ---- Race Modal ----
function RaceModal({
  myPokemonId, myIsShiny, myLevel, myRarity,
  opponentPokemonId, opponentIsShiny, opponentLevel, opponentRarity, opponentName,
  onClose,
}: {
  myPokemonId: number; myIsShiny: boolean; myLevel: number; myRarity: string;
  opponentPokemonId: number; opponentIsShiny: boolean; opponentLevel: number; opponentRarity: string;
  opponentName: string; onClose: () => void;
}) {
  const myBase = myLevel * (RARITY_SCORE[myRarity] ?? 1);
  const oppBase = opponentLevel * (RARITY_SCORE[opponentRarity] ?? 1);

  const [tapBonus, setTapBonus] = useState(0);
  const [phase, setPhase] = useState<'tap' | 'race' | 'result'>('tap');
  const [countdown, setCountdown] = useState(3);
  const [myPos, setMyPos] = useState(0);
  const [oppPos, setOppPos] = useState(0);
  const [winner, setWinner] = useState<'me' | 'opponent' | null>(null);
  const raceRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const MAX_TAP_BONUS = 15;

  const winPct = Math.min(95, Math.max(5,
    (myBase / (myBase + oppBase)) * 100 + Math.min(tapBonus, MAX_TAP_BONUS)
  ));

  const handleTap = () => {
    if (phase === 'tap') setTapBonus(b => Math.min(b + 0.5, MAX_TAP_BONUS));
  };

  // Countdown → race
  useEffect(() => {
    if (phase !== 'tap') return;
    const t = setTimeout(() => setPhase('race'), 5000);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'tap') return;
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), (5000 - countdown * 1000) <= 0 ? 1000 : 1000);
    return () => clearTimeout(t);
  }, [countdown, phase]);

  // Race simulation
  useEffect(() => {
    if (phase !== 'race') return;
    setMyPos(0); setOppPos(0);

    const mySpeed = winPct / 100 * 2.2 + 0.3;
    const oppSpeed = (100 - winPct) / 100 * 2.2 + 0.3;

    raceRef.current = setInterval(() => {
      setMyPos(p => {
        const next = p + mySpeed + Math.random() * 0.8;
        return Math.min(next, 100);
      });
      setOppPos(p => {
        const next = p + oppSpeed + Math.random() * 0.8;
        return Math.min(next, 100);
      });
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
            <div className="text-center text-2xl font-black text-white mb-2">
              Tape pour booster !
            </div>
            <div className="text-center text-xs text-slate-400 mb-3">La course commence dans {Math.max(0, countdown)}s…</div>
            <div className="flex justify-around text-xs text-slate-300 mb-3">
              <span>Ton avantage : <b className="text-yellow-400">{winPct.toFixed(0)}%</b></span>
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
    <div className="fixed inset-0 z-[400] flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-slate-800 rounded-t-2xl border-t border-slate-600 p-5 w-full max-w-sm pb-8"
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
  onClose,
}: {
  myPokemonId: number; myIsShiny: boolean; myLevel: number; myRarity: string;
  opponentPokemonId: number; opponentIsShiny: boolean; opponentLevel: number; opponentRarity: string;
  opponentName: string; onClose: () => void;
}) {
  const myData = POKEMON_BY_ID[myPokemonId];
  const oppData = POKEMON_BY_ID[opponentPokemonId];
  const myScore = myLevel * (RARITY_SCORE[myRarity] ?? 1);
  const oppScore = opponentLevel * (RARITY_SCORE[opponentRarity] ?? 1);
  const myWinPct = myScore / (myScore + oppScore);

  // Simulate battle: alternate hits, higher score = more damage per hit
  const MAX_HP = 100;
  const [myHp, setMyHp] = useState(MAX_HP);
  const [oppHp, setOppHp] = useState(MAX_HP);
  const [log, setLog] = useState<Array<{ text: string; color: string }>>([]);
  const [phase, setPhase] = useState<'battle' | 'result'>('battle');
  const [winner, setWinner] = useState<'me' | 'opponent' | null>(null);
  const turnRef = useRef(0);
  const myHpRef = useRef(MAX_HP);
  const oppHpRef = useRef(MAX_HP);

  useEffect(() => {
    const interval = setInterval(() => {
      if (myHpRef.current <= 0 || oppHpRef.current <= 0) return;
      turnRef.current += 1;
      const isMyTurn = turnRef.current % 2 === 1;

      const baseDmg = isMyTurn
        ? Math.max(5, Math.round(8 + myWinPct * 12 + Math.random() * 8))
        : Math.max(5, Math.round(8 + (1 - myWinPct) * 12 + Math.random() * 8));

      if (isMyTurn) {
        oppHpRef.current = Math.max(0, oppHpRef.current - baseDmg);
        setOppHp(oppHpRef.current);
        setLog(prev => [...prev.slice(-6), { text: `${myData?.name ?? 'Toi'} inflige ${baseDmg} dégâts !`, color: '#4ade80' }]);
      } else {
        myHpRef.current = Math.max(0, myHpRef.current - baseDmg);
        setMyHp(myHpRef.current);
        setLog(prev => [...prev.slice(-6), { text: `${oppData?.name ?? opponentName} inflige ${baseDmg} dégâts !`, color: '#f87171' }]);
      }

      if (myHpRef.current <= 0 || oppHpRef.current <= 0) {
        clearInterval(interval);
        const w = oppHpRef.current <= 0 ? 'me' : 'opponent';
        setWinner(w);
        setPhase('result');
      }
    }, 600);
    return () => clearInterval(interval);
  }, []);

  const hpColor = (pct: number) => pct > 0.5 ? '#4ade80' : pct > 0.25 ? '#facc15' : '#ef4444';

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80">
      <div className="bg-slate-800 rounded-2xl border border-red-500/40 shadow-2xl p-5 w-80 max-w-[95vw]">
        <div className="text-center font-black text-red-400 text-lg mb-3">⚔️ Duel Pokémon !</div>

        {/* HP bars */}
        <div className="space-y-2 mb-3">
          <div>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-yellow-400 font-bold">Toi — {myData?.name}</span>
              <span className="text-slate-300">{myHp}/100</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2.5">
              <div className="h-2.5 rounded-full transition-all duration-300" style={{ width: `${myHp}%`, background: hpColor(myHp / 100) }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-slate-300 font-bold">{opponentName} — {oppData?.name}</span>
              <span className="text-slate-300">{oppHp}/100</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2.5">
              <div className="h-2.5 rounded-full transition-all duration-300" style={{ width: `${oppHp}%`, background: hpColor(oppHp / 100) }} />
            </div>
          </div>
        </div>

        {/* Sprites */}
        <div className="flex justify-around items-center mb-3">
          <div className="flex flex-col items-center gap-1">
            <img src={getSpriteUrl(myPokemonId, myIsShiny)} width={52} height={52}
              style={{ imageRendering: 'pixelated', opacity: myHp <= 0 ? 0.3 : 1 }} alt="" />
          </div>
          <div className="text-2xl font-black text-slate-500">VS</div>
          <div className="flex flex-col items-center gap-1">
            <img src={getSpriteUrl(opponentPokemonId, opponentIsShiny)} width={52} height={52}
              style={{ imageRendering: 'pixelated', transform: 'scaleX(-1)', opacity: oppHp <= 0 ? 0.3 : 1 }} alt="" />
          </div>
        </div>

        {/* Battle log */}
        <div className="bg-black/40 rounded-lg px-3 py-2 mb-3 min-h-[60px]">
          {log.slice(-3).map((l, i) => (
            <div key={i} className="text-xs" style={{ color: l.color }}>{l.text}</div>
          ))}
        </div>

        {phase === 'result' && (
          <div className="text-center">
            <div className="text-4xl mb-1">{winner === 'me' ? '🏆' : '💀'}</div>
            <div className="font-black text-lg mb-3" style={{ color: winner === 'me' ? '#fbbf24' : '#ef4444' }}>
              {winner === 'me' ? 'VICTOIRE !' : 'Défaite…'}
            </div>
            <button onClick={onClose} className="px-6 py-2 rounded-xl bg-slate-600 text-white font-bold text-sm">
              Fermer
            </button>
          </div>
        )}
        {phase === 'battle' && (
          <div className="text-center text-xs text-slate-500 animate-pulse">Combat en cours…</div>
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
export function PokeParc({ state, username, onClose, onUpdateVillage }: Props) {
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
  const chatEndRef = useRef<HTMLDivElement>(null);
  const wanderRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const myFav = state.village.favoritePokemon;

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

  // Fetch and subscribe to chat
  useEffect(() => {
    supabase.from('pokepark_chat').select('*').order('created_at', { ascending: true }).limit(50)
      .then(({ data }) => { if (data) setChat(data as ChatMessage[]); });

    const chan = supabase.channel('pokepark_chat_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pokepark_chat' }, payload => {
        setChat(prev => [...prev.slice(-99), payload.new as ChatMessage]);
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
    if (!msg || !myUserId) return;
    setChatInput('');
    await supabase.from('pokepark_chat').insert({
      user_id: myUserId,
      username,
      message: msg,
    });
  };

  const handleWave = () => {
    if (!interactionTarget) return;
    setWaveTarget(interactionTarget.userId);
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

  const others = presence.filter(p => p.user_id !== myUserId);
  const mySpriteData = myFav ? POKEMON_BY_ID[myFav.pokemonId] : null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-black/60 border-b border-slate-700/60 shrink-0">
        <div className="font-black text-yellow-400 text-sm">🌿 PokéParc</div>
        <button onClick={onClose} className="text-slate-400 text-xl font-black px-2">✕</button>
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
            height: '55%',
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
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="text-slate-400 text-sm text-center px-6">
                Choisis un Pokémon favori pour rejoindre le parc !
              </div>
              <button
                onClick={() => setShowPicker(true)}
                className="px-4 py-2 rounded-xl bg-yellow-500 text-black font-bold text-sm"
              >
                Choisir mon Pokémon
              </button>
            </div>
          )}

          {/* Player count */}
          <div className="absolute top-2 left-2 text-xs text-slate-400 bg-black/40 rounded px-2 py-0.5">
            {presence.length + (myFav ? 1 : 0)} joueurs en ligne
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
                  }}
                />
              </div>
            );
          })}

          {/* My pokemon */}
          {myFav && (
            <div
              className="absolute"
              style={{
                left: `${myPos.x}%`,
                top: `${myPos.y}%`,
                transform: 'translate(-50%, -50%)',
                transition: 'left 2s ease-in-out, top 2s ease-in-out',
              }}
            >
              <ParkSprite
                pokemonId={myFav.pokemonId}
                isShiny={myFav.isShiny ?? false}
                mood={mood}
                username={username}
                isMine={true}
                onClick={() => setShowPicker(true)}
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
            {chat.map(msg => (
              <div key={msg.id} className="flex gap-2 text-xs">
                <span className="font-bold shrink-0" style={{ color: msg.user_id === myUserId ? '#fbbf24' : '#60a5fa' }}>
                  {msg.username}
                </span>
                <span className="text-slate-300 break-all">{msg.message}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="flex gap-2 px-3 py-2 border-t border-slate-700/40 shrink-0" style={{ background: '#0f172a' }}>
            <input
              className="flex-1 rounded-lg px-3 py-2 text-sm text-white outline-none border border-slate-600 focus:border-blue-500"
              style={{ background: '#1e293b', minHeight: 40 }}
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
            onUpdateVillage(prev => ({ ...prev, favoritePokemon: { pokemonId, isShiny } }));
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
          onClose={() => { setShowDuel(false); setInteractionTarget(null); }}
        />
      )}
    </div>
  );
}
