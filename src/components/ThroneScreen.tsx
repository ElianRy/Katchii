import { useState, useEffect, useRef } from 'react';
import { TutorialOverlay, isTutorialDone } from './TutorialOverlay';
import { THRONE_TUTORIAL } from './TutorialContent';
import { GameState } from '../types';
import { supabase } from '../lib/supabase';
import { throneRead, throneWrite } from '../lib/supabaseAdmin';
import { calcMaxHp } from '../data/combatEngine';
import { getMoveListRaw } from '../data/combatEngine';
import { GEN1_STATS } from '../data/gen1Stats';
import { POKEMON_BY_ID } from '../data/gen1';
import { TeamMember } from './TeamBuilder';
import { MOVES } from '../data/gen1Moves';
import { getAvailableMoves } from '../data/gen1Movepools';
import { TYPE_COLORS, POKEMON_TYPE } from '../data/pokemonTypes';

/* ─── Data model ────────────────────────────────────────────────── */
export interface ThroneRecord {
  username: string;
  duration: number; // ms
  start: string;   // ISO
  end: string;     // ISO
}

export interface ThroneData {
  champion: {
    username: string;
    team: Array<{ pokemonId: number; isShiny: boolean }>;
    since: string; // ISO
  } | null;
  records: ThroneRecord[];
  coinClaims: Record<string, string>; // username -> ISO of last claim
}

const CHAMPION_LEVEL = 80;

/* ─── Helpers ───────────────────────────────────────────────────── */
async function loadThroneData(): Promise<ThroneData | null> {
  const state = await throneRead();
  if (state) return state as ThroneData;
  return null;
}

function toTeamMember(pokemonId: number, isShiny: boolean, level: number): TeamMember {
  const stats = GEN1_STATS[pokemonId];
  const maxHp = calcMaxHp(stats?.hp ?? 50, level);
  return { pokemonId, isShiny, level, xp: 0, currentHp: maxHp, maxHp };
}

function spriteUrl(id: number, shiny: boolean) {
  return shiny
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${id}.png`
    : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}j ${h % 24}h ${m % 60}m`;
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

/* ─── Live reign timer ──────────────────────────────────────────── */
function LiveTimer({ since }: { since: string }) {
  const [elapsed, setElapsed] = useState(Date.now() - new Date(since).getTime());
  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - new Date(since).getTime()), 1000);
    return () => clearInterval(id);
  }, [since]);
  const s = Math.floor(elapsed / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-yellow-500/70 text-xs uppercase tracking-widest font-bold">Sur le trône depuis</span>
      <div className="flex items-end gap-1 text-yellow-300 font-black tabular-nums" style={{ textShadow: '0 0 20px rgba(245,158,11,0.8)' }}>
        {d > 0 && <><span className="text-4xl">{d}</span><span className="text-lg mb-1 mr-1">j</span></>}
        {(d > 0 || h % 24 > 0) && <><span className="text-4xl">{String(h % 24).padStart(2, '0')}</span><span className="text-lg mb-1 mr-1">h</span></>}
        <span className="text-4xl">{String(m % 60).padStart(2, '0')}</span><span className="text-lg mb-1 mr-1">m</span>
        <span className="text-4xl">{String(s % 60).padStart(2, '0')}</span><span className="text-lg mb-1">s</span>
      </div>
    </div>
  );
}

/* ─── Leaderboard ───────────────────────────────────────────────── */
function Leaderboard({ records, currentChampion }: { records: ThroneRecord[]; currentChampion?: { username: string; since: string } }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);

  const currentDuration = currentChampion && currentChampion.since !== 'Depuis toujours'
    ? now - new Date(currentChampion.since).getTime() : 0;

  const allRecords = currentDuration > 0
    ? [...records, { username: currentChampion!.username, duration: currentDuration, start: currentChampion!.since, end: '' }]
    : records;

  const longest = [...allRecords].sort((a, b) => b.duration - a.duration).slice(0, 5);
  const totals: Record<string, number> = {};
  for (const r of allRecords) {
    totals[r.username] = (totals[r.username] ?? 0) + r.duration;
  }
  const totalList = Object.entries(totals).sort(([, a], [, b]) => b - a).slice(0, 5);

  if (allRecords.length === 0) {
    return (
      <div className="text-slate-600 text-xs text-center py-2">Aucun règne enregistré pour l'instant.</div>
    );
  }

  return (
    <div className="w-full max-w-md flex flex-col gap-4">
      <div className="bg-slate-800/60 rounded-2xl p-4 border border-amber-800/30">
        <p className="text-amber-400 font-black text-xs uppercase tracking-wider mb-3">⏱ Règne le plus long</p>
        {longest.map((r, i) => (
          <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-700/40 last:border-0">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-black ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : 'text-amber-700'}`}>
                {i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
              </span>
              <span className="text-white text-sm font-bold">{r.username}</span>
              {r.end === '' && <span className="text-[0.5rem] text-red-400 font-bold">EN COURS</span>}
            </div>
            <span className="text-yellow-300 text-sm font-mono font-bold">{formatDuration(r.duration)}</span>
          </div>
        ))}
      </div>

      <div className="bg-slate-800/60 rounded-2xl p-4 border border-amber-800/30">
        <p className="text-amber-400 font-black text-xs uppercase tracking-wider mb-3">🏆 Temps total sur le trône</p>
        {totalList.map(([username, total], i) => (
          <div key={username} className="flex items-center justify-between py-1.5 border-b border-slate-700/40 last:border-0">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-black ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : 'text-amber-700'}`}>
                {i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
              </span>
              <span className="text-white text-sm font-bold">{username}</span>
            </div>
            <span className="text-yellow-300 text-sm font-mono font-bold">{formatDuration(total)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const MAX_AFK_MS = 5 * 60 * 60 * 1000;
const COINS_PER_MINUTE = 10;

function calcUnclaimedCoins(since: string, lastClaim: string | undefined): { coins: number; claimFrom: number; claimTo: number } {
  const sinceMs = new Date(since).getTime();
  const claimFrom = lastClaim ? new Date(lastClaim).getTime() : sinceMs;
  const maxClaimTo = sinceMs + MAX_AFK_MS;
  const claimTo = Math.min(Date.now(), maxClaimTo);
  const minutes = Math.floor((claimTo - claimFrom) / 60000);
  return { coins: Math.max(0, minutes * COINS_PER_MINUTE), claimFrom, claimTo };
}

/* ─── Gold Particles ───────────────────────────────────────────── */
const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  left: `${5 + Math.random() * 90}%`,
  top: `${5 + Math.random() * 85}%`,
  emoji: ['✦', '✧', '★'][i % 3],
  color: ['#f59e0b', '#fbbf24', '#ef4444', '#f97316'][i % 4],
  delay: `${(Math.random() * 3).toFixed(1)}s`,
  duration: `${(2 + Math.random() * 3).toFixed(1)}s`,
  size: `${0.7 + Math.random() * 0.8}rem`,
}));

/* ─── Pokemon Detail Sheet ─────────────────────────────────────── */
interface PokemonDetailSheetProps {
  pokemonId: number;
  isShiny: boolean;
  level: number;
  customMoves: string[];
  onMovesChange: (moves: string[]) => void;
  onClose: () => void;
}

function PokemonDetailSheet({ pokemonId, isShiny, level, customMoves, onMovesChange, onClose }: PokemonDetailSheetProps) {
  const poke = POKEMON_BY_ID[pokemonId];
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const availableMoves = getAvailableMoves(pokemonId, level);
  const defaultMoves = getMoveListRaw(pokemonId).map(m => m.id).filter((id): id is string => !!id);
  const currentMoves = customMoves.length === 4 ? customMoves : defaultMoves.slice(0, 4);

  const statData = GEN1_STATS[pokemonId];
  const baseHp = statData?.hp ?? 45;
  const baseAtk = statData?.attack ?? 45;
  const baseDef = statData?.defense ?? 45;
  const baseSpd = statData?.speed ?? 45;

  const calcStat = (base: number) => Math.round(base * level / 100);

  const statBars = [
    { label: 'HP', value: calcStat(baseHp), color: '#22c55e', base: baseHp },
    { label: 'ATK', value: calcStat(baseAtk), color: '#ef4444', base: baseAtk },
    { label: 'DEF', value: calcStat(baseDef), color: '#3b82f6', base: baseDef },
    { label: 'VIT', value: calcStat(baseSpd), color: '#eab308', base: baseSpd },
  ];

  const getTypeColor = (type: string): string => {
    return (TYPE_COLORS as Record<string, string>)[type] ?? '#6b7280';
  };

  const getMoveColor = (moveId: string): string => {
    const move = MOVES[moveId];
    if (!move) return '#374151';
    return getTypeColor(move.type);
  };

  const pokeTypes = POKEMON_TYPE[pokemonId] ?? [];

  return (
    <div className="fixed inset-0 z-[600] flex items-end" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div
        className="w-full bg-slate-900 rounded-t-3xl max-h-[70vh] overflow-y-auto"
        style={{ animation: 'throne-sheet-up 0.3s ease-out' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 pt-4 pb-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-4">
            <img src={spriteUrl(pokemonId, isShiny)} alt={poke?.name} width={64} height={64}
              style={{ imageRendering: 'pixelated', filter: isShiny ? 'drop-shadow(0 0 8px #fde047)' : 'drop-shadow(0 0 6px #f59e0b)' }} />
            <div>
              <div className="text-white font-black text-lg">{poke?.name ?? `#${pokemonId}`}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="bg-yellow-500/20 text-yellow-300 text-xs font-bold px-2 py-0.5 rounded-full border border-yellow-500/40">
                  Nv. {level}
                </span>
                {pokeTypes.map((t: string, i: number) => (
                  <span key={i} className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                    style={{ background: getTypeColor(t) }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Stat bars */}
          <div className="mb-4 space-y-2">
            {statBars.map(s => (
              <div key={s.label} className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 w-8">{s.label}</span>
                <div className="flex-1 bg-slate-700/60 rounded-full h-2 overflow-hidden">
                  <div className="h-full rounded-full" style={{
                    width: `${Math.min(100, (s.base / 255) * 100)}%`,
                    background: s.color,
                    boxShadow: `0 0 4px ${s.color}88`,
                  }} />
                </div>
                <span className="text-xs font-bold text-white w-8 text-right">{s.value}</span>
              </div>
            ))}
          </div>

          {/* Move slots */}
          <div className="mb-4">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Capacités</p>
            <div className="grid grid-cols-2 gap-2">
              {currentMoves.map((moveId, slotIdx) => {
                const move = MOVES[moveId];
                const bgColor = getMoveColor(moveId);
                if (editingSlot === slotIdx) {
                  return (
                    <div key={slotIdx} className="col-span-2 bg-slate-800 rounded-xl p-2 border border-slate-600">
                      <div className="text-xs text-slate-400 font-bold mb-2">Slot {slotIdx + 1} — choisir une capacité :</div>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {availableMoves.map(mid => {
                          const mv = MOVES[mid];
                          if (!mv) return null;
                          return (
                            <button key={mid}
                              className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold text-white flex items-center justify-between active:scale-95 transition-transform"
                              style={{ background: getTypeColor(mv.type) + 'cc' }}
                              onClick={() => {
                                const next = [...currentMoves];
                                next[slotIdx] = mid;
                                onMovesChange(next);
                                setEditingSlot(null);
                              }}
                            >
                              <span>{mv.name}</span>
                              <span className="text-white/70">{mv.power > 0 ? `${mv.power} pwr` : '—'}</span>
                            </button>
                          );
                        })}
                      </div>
                      <button onClick={() => setEditingSlot(null)} className="mt-2 text-xs text-slate-500 underline">Annuler</button>
                    </div>
                  );
                }
                return (
                  <button key={slotIdx}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-white text-left flex items-center justify-between active:scale-95 transition-transform"
                    style={{ background: bgColor + 'cc', border: `1px solid ${bgColor}88` }}
                    onClick={() => setEditingSlot(slotIdx)}
                  >
                    <span className="truncate">{move?.name ?? moveId}</span>
                    <span className="text-white/60 ml-1 shrink-0">{move?.power && move.power > 0 ? move.power : '—'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button onClick={onClose}
            className="w-full py-3 rounded-2xl font-black text-sm text-white"
            style={{ background: 'linear-gradient(90deg, #374151, #1f2937)' }}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Props ─────────────────────────────────────────────────────── */
interface Props {
  state: GameState;
  username: string;
  onClose: () => void;
  onChallenge: (playerTeam: TeamMember[], enemyTeam: TeamMember[], enemyName: string, onDone: (won: boolean) => void) => void;
  onClaimCoins: (amount: number) => void;
}

/* ─── Main component ────────────────────────────────────────────── */
export function ThroneScreen({ state, username, onClose, onChallenge, onClaimCoins }: Props) {
  const [showTutorial, setShowTutorial] = useState(() => !isTutorialDone('throne'));
  const [throneData, setThroneData] = useState<ThroneData | null>(null);
  const [phase, setPhase] = useState<'view' | 'pick_mode' | 'pick_pokemon' | 'confirm'>('view');
  const [selectedPokemon, setSelectedPokemon] = useState<Array<{ pokemonId: number; isShiny: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [coinPopup, setCoinPopup] = useState<{ coins: number } | null>(null);
  const [detailSheet, setDetailSheet] = useState<{ pokemonId: number; isShiny: boolean; level: number } | null>(null);
  const [customMoves, setCustomMoves] = useState<Record<number, string[]>>({});
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Initial load + realtime */
  useEffect(() => {
    (async () => {
      const data = await loadThroneData();
      const finalData: ThroneData = data ?? { champion: null, records: [], coinClaims: {} };
      setThroneData(finalData);
      setLoading(false);

      if (finalData.champion?.username === username && finalData.champion.since !== 'Depuis toujours') {
        const { coins } = calcUnclaimedCoins(
          finalData.champion.since,
          finalData.coinClaims?.[username]
        );
        if (coins > 0) setCoinPopup({ coins });
      }
    })();

    const THRONE_UUID = '__throne__';
    const channel = supabase.channel('throne_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_saves', filter: `user_id=eq.${THRONE_UUID}` }, (payload) => {
        const d = (payload.new as { state?: ThroneData })?.state;
        if (d) setThroneData(d);
      })
      .subscribe();
    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, []);

  const champion = throneData?.champion;
  const records = throneData?.records ?? [];

  const favTeamId = state.favoriteTeamId;
  const favTeam = favTeamId ? (state.savedTeams ?? []).find(t => t.id === favTeamId) : null;

  async function launchBattle(playerPokemon: Array<{ pokemonId: number; isShiny: boolean }>, customMovesArg?: Record<number, string[]>) {
    if (!champion || !throneData) return;
    const playerTeam = playerPokemon.map(m => toTeamMember(m.pokemonId, m.isShiny, state.pokemonLevels?.[m.pokemonId]?.level ?? 30));
    const enemyTeam = champion.team.map(m => toTeamMember(m.pokemonId, m.isShiny, CHAMPION_LEVEL));
    void customMovesArg; // stored in state, displayed in confirm screen; passed for future use
    setPhase('view');
    setSelectedPokemon([]);
    onChallenge(playerTeam, enemyTeam, champion.username, async (won) => {
      if (won) {
        const now = new Date().toISOString();
        const prevSince = champion.since === 'Depuis toujours' ? null : champion.since;
        const newRecords = [...records];
        if (prevSince) {
          newRecords.push({ username: champion.username, duration: Date.now() - new Date(prevSince).getTime(), start: prevSince, end: now });
        }
        const newData: ThroneData = {
          champion: {
            username,
            team: playerPokemon.slice(0, 3),
            since: now,
          },
          records: newRecords,
          coinClaims: throneData.coinClaims ?? {},
        };
        await throneWrite(newData);
        setThroneData(newData);
        setResultMsg('👑 Tu es le nouveau Champion du Trône !');
      } else {
        setResultMsg('💀 Défaite — le champion tient son trône.');
      }
    });
  }

  async function claimCoins() {
    if (!coinPopup || !throneData) return;
    const now = new Date().toISOString();
    const updatedClaims = { ...(throneData.coinClaims ?? {}), [username]: now };
    const newData: ThroneData = { ...throneData, coinClaims: updatedClaims };
    await throneWrite(newData);
    setThroneData(newData);
    onClaimCoins(coinPopup.coins);
    setCoinPopup(null);
  }

  function useFavoriteTeam() {
    if (!favTeam) return;
    launchBattle(favTeam.members.slice(0, 3).map(m => ({ pokemonId: m.pokemonId, isShiny: m.isShiny ?? false })));
  }

  const caughtIds = Object.entries(state.normalCollection ?? {})
    .filter(([, n]) => n > 0)
    .map(([id]) => Number(id));

  // Sort by level desc
  const sortedCaughtIds = [...caughtIds].sort((a, b) =>
    (state.pokemonLevels?.[b]?.level ?? 1) - (state.pokemonLevels?.[a]?.level ?? 1)
  );

  const togglePokemon = (pokemonId: number, isShiny: boolean) => {
    setSelectedPokemon(prev => {
      const idx = prev.findIndex(p => p.pokemonId === pokemonId);
      if (idx >= 0) return prev.filter((_, i) => i !== idx);
      if (prev.length >= 3) return prev;
      return [...prev, { pokemonId, isShiny }];
    });
  };

  const handleLongPressStart = (pokemonId: number, isShiny: boolean, level: number) => {
    longPressTimerRef.current = setTimeout(() => {
      setDetailSheet({ pokemonId, isShiny, level });
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900">
        <div className="text-yellow-400 text-lg animate-pulse">Chargement…</div>
      </div>
    );
  }

  /* ── Pick Mode ── */
  if (phase === 'pick_mode') {
    return (
      <div className="fixed inset-0 z-40 flex flex-col overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0a0000 0%, #1a0a00 50%, #0d0500 100%)' }}>

        <style>{`
          @keyframes throne-spark { 0%,100%{opacity:0.2;transform:scale(0.8) translateY(0)} 50%{opacity:1;transform:scale(1.2) translateY(-8px)} }
          @keyframes throne-particle-drift { 0%{transform:translate(0,0) rotate(0deg);opacity:0.6} 100%{transform:translate(var(--dx,20px),var(--dy,-40px)) rotate(360deg);opacity:0} }
          @keyframes throne-crown-glow { 0%,100%{filter:drop-shadow(0 0 20px #f59e0b) drop-shadow(0 0 40px #f59e0b88);transform:translateY(0) scale(1)} 50%{filter:drop-shadow(0 0 30px #fbbf24) drop-shadow(0 0 60px #fbbf2488);transform:translateY(-6px) scale(1.05)} }
          @keyframes throne-title-pulse { 0%,100%{text-shadow:0 0 20px #f59e0b,0 0 40px #ef444488} 50%{text-shadow:0 0 30px #fbbf24,0 0 60px #ef444488,0 0 80px #f97316} }
          @keyframes throne-sheet-up { from{transform:translateY(100%)} to{transform:translateY(0)} }
          @keyframes float-throne { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
          @keyframes throne-float-a { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-10px) scale(1.04)} }
          @keyframes throne-float-b { 0%,100%{transform:translateY(-5px) scale(1.03)} 50%{transform:translateY(3px) scale(1)} }
        `}</style>

        {/* Gold particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {PARTICLES.map(p => (
            <div key={p.id} className="absolute" style={{
              left: p.left, top: p.top,
              color: p.color,
              fontSize: p.size,
              animation: `throne-spark ${p.duration} ${p.delay} ease-in-out infinite`,
              textShadow: `0 0 8px ${p.color}`,
            }}>
              {p.emoji}
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-6 pb-2 shrink-0 relative z-10">
          <button onClick={() => setPhase('view')} className="text-amber-500/70 hover:text-amber-300 text-xl px-2">✕</button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-5 pb-10 relative z-10">
          {/* Crown */}
          <div className="text-center">
            <div className="text-8xl" style={{ animation: 'throne-crown-glow 3s ease-in-out infinite', display: 'inline-block' }}>
              👑
            </div>
          </div>

          {/* Title */}
          <div className="text-center">
            <h1 className="font-black text-3xl tracking-wide uppercase"
              style={{
                background: 'linear-gradient(90deg, #f59e0b, #ef4444, #f59e0b)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: 'throne-title-pulse 2s ease-in-out infinite',
              }}>
              {champion?.username === username ? 'CHANGER MON ÉQUIPE' : 'DÉFIER LE CHAMPION'}
            </h1>
            <p className="text-amber-700/70 text-sm mt-1 font-bold">Choisissez votre équipe de combat</p>
          </div>

          {/* Favorite team card */}
          {favTeam && (
            <button
              onClick={useFavoriteTeam}
              className="w-full max-w-md rounded-2xl p-5 text-left transition-all active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #1a0800 0%, #2d1200 100%)',
                border: '2px solid #f59e0b',
                boxShadow: '0 0 20px #f59e0b44, inset 0 0 20px #f59e0b0a',
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-yellow-400 text-lg">⭐</span>
                <p className="text-yellow-300 font-black text-sm">Équipe Favorite</p>
                <span className="ml-auto bg-yellow-500/20 text-yellow-300 text-xs px-2 py-0.5 rounded-full border border-yellow-500/40 font-bold">
                  {favTeam.name}
                </span>
              </div>
              <div className="flex gap-4 justify-center">
                {favTeam.members.slice(0, 3).map((m, i) => {
                  const lvl = state.pokemonLevels?.[m.pokemonId]?.level ?? 1;
                  return (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <img src={spriteUrl(m.pokemonId, m.isShiny ?? false)} alt="" width={52} height={52}
                        style={{ imageRendering: 'pixelated', filter: 'drop-shadow(0 0 6px #f59e0b88)' }} draggable={false} />
                      <span className="text-amber-200 text-[0.5rem] font-bold">{POKEMON_BY_ID[m.pokemonId]?.name}</span>
                      <span className="bg-yellow-600/30 text-yellow-300 text-[0.45rem] px-1.5 py-0.5 rounded-full font-black border border-yellow-600/30">
                        Nv.{lvl}
                      </span>
                    </div>
                  );
                })}
              </div>
            </button>
          )}

          {/* Manual pick card */}
          <button
            onClick={() => setPhase('pick_pokemon')}
            className="w-full max-w-md rounded-2xl p-5 text-left transition-all active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #0d0d1a 0%, #1a1a2e 100%)',
              border: '2px solid #4b5563',
              boxShadow: 'inset 0 0 20px rgba(255,255,255,0.02)',
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">⚔️</span>
              <div>
                <p className="text-white font-black text-sm">Choisir manuellement</p>
                <p className="text-slate-500 text-xs mt-0.5">Sélectionne 3 Pokémon de ta collection</p>
              </div>
              <span className="ml-auto text-slate-500 text-xl">›</span>
            </div>
          </button>
        </div>
      </div>
    );
  }

  /* ── Pick Pokemon ── */
  if (phase === 'pick_pokemon') {
    return (
      <div className="fixed inset-0 z-40 flex flex-col bg-slate-900">
        <style>{`
          @keyframes throne-sheet-up { from{transform:translateY(100%)} to{transform:translateY(0)} }
        `}</style>
        <div className="flex items-center justify-between px-5 pt-6 pb-3 shrink-0 border-b border-slate-700">
          <div>
            <h1 className="text-white font-black text-lg">Choisis 3 Pokémon</h1>
            <p className="text-slate-400 text-xs">{selectedPokemon.length}/3 sélectionnés · Maintiens pour voir les stats</p>
          </div>
          <button onClick={() => { setPhase('pick_mode'); setSelectedPokemon([]); }} className="text-slate-400 hover:text-white text-xl px-2">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="grid grid-cols-5 gap-2">
            {sortedCaughtIds.map(id => {
              const isShiny = (state.shinyCollection?.[id] ?? 0) > 0;
              const level = state.pokemonLevels?.[id]?.level ?? 1;
              const selected = selectedPokemon.some(p => p.pokemonId === id);
              const maxed = selectedPokemon.length >= 3 && !selected;
              return (
                <button
                  key={id}
                  onPointerDown={() => handleLongPressStart(id, isShiny, level)}
                  onPointerUp={() => {
                    handleLongPressEnd();
                    if (!maxed) togglePokemon(id, isShiny);
                  }}
                  onPointerLeave={handleLongPressEnd}
                  onPointerCancel={handleLongPressEnd}
                  disabled={maxed}
                  className={`flex flex-col items-center rounded-xl p-1.5 border-2 transition-all ${
                    selected ? 'border-yellow-500 bg-yellow-900/40' : 'border-slate-700 bg-slate-800/40'
                  } disabled:opacity-30`}
                >
                  <img src={spriteUrl(id, isShiny)} alt="" width={40} height={40}
                    style={{ imageRendering: 'pixelated' }} draggable={false} />
                  <span className="text-[0.45rem] text-slate-300 leading-tight text-center mt-0.5 w-full truncate">
                    {POKEMON_BY_ID[id]?.name ?? `#${id}`}
                  </span>
                  <span className="bg-yellow-600/30 text-yellow-300 text-[0.4rem] px-1 py-0.5 rounded-full font-black mt-0.5 border border-yellow-700/30">
                    Nv.{level}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="px-5 pt-4 pb-[calc(1rem+72px)] shrink-0 border-t border-slate-700">
          <button
            onClick={() => { if (selectedPokemon.length === 3) setPhase('confirm'); }}
            disabled={selectedPokemon.length !== 3}
            className="w-full py-4 rounded-2xl font-black text-lg text-black disabled:opacity-40"
            style={{ background: 'linear-gradient(90deg, #f59e0b, #ef4444)' }}
          >
            ⚔️ Confirmer l'équipe
          </button>
        </div>

        {/* Pokemon detail bottom sheet */}
        {detailSheet && (
          <PokemonDetailSheet
            pokemonId={detailSheet.pokemonId}
            isShiny={detailSheet.isShiny}
            level={detailSheet.level}
            customMoves={customMoves[detailSheet.pokemonId] ?? []}
            onMovesChange={(moves) => setCustomMoves(prev => ({ ...prev, [detailSheet.pokemonId]: moves }))}
            onClose={() => setDetailSheet(null)}
          />
        )}
      </div>
    );
  }

  /* ── Confirm ── */
  if (phase === 'confirm') {
    const teamPower = selectedPokemon.reduce((sum, p) => {
      const lvl = state.pokemonLevels?.[p.pokemonId]?.level ?? 1;
      return sum + lvl * 3;
    }, 0);

    const getTeamMoveIds = (pokemonId: number): string[] => {
      const custom = customMoves[pokemonId];
      if (custom && custom.length === 4) return custom;
      return getMoveListRaw(pokemonId).map(m => m.id).filter((id): id is string => !!id).slice(0, 4);
    };

    const getMoveColor = (moveId: string): string => {
      const move = MOVES[moveId];
      if (!move) return '#374151';
      return (TYPE_COLORS as Record<string, string>)[move.type] ?? '#374151';
    };

    return (
      <div className="fixed inset-0 z-40 flex flex-col bg-slate-900 overflow-y-auto"
        style={{ background: 'linear-gradient(160deg, #0a0800 0%, #1a1000 50%, #0d0a00 100%)' }}>
        <style>{`
          @keyframes throne-title-pulse { 0%,100%{text-shadow:0 0 20px #f59e0b,0 0 40px #ef444488} 50%{text-shadow:0 0 30px #fbbf24,0 0 60px #ef444488,0 0 80px #f97316} }
        `}</style>

        <div className="flex items-center justify-between px-5 pt-6 pb-2 shrink-0">
          <h1 className="text-yellow-400 font-black text-xl" style={{ animation: 'throne-title-pulse 2s ease-in-out infinite' }}>
            ⚔️ Mon Équipe
          </h1>
          <button onClick={() => setPhase('pick_pokemon')} className="text-slate-400 hover:text-white text-sm px-2">← Modifier</button>
        </div>

        <div className="flex-1 px-4 py-4 flex flex-col gap-4">
          {/* Team cards */}
          <div className="grid grid-cols-3 gap-3">
            {selectedPokemon.map((p, i) => {
              const level = state.pokemonLevels?.[p.pokemonId]?.level ?? 1;
              const poke = POKEMON_BY_ID[p.pokemonId];
              const moveIds = getTeamMoveIds(p.pokemonId);
              const confirmStatData = GEN1_STATS[p.pokemonId];
              const stats = {
                hp: confirmStatData?.hp ?? 45,
                atk: confirmStatData?.attack ?? 45,
                def: confirmStatData?.defense ?? 45,
                spd: confirmStatData?.speed ?? 45,
              };
              const calcStat = (base: number) => Math.round(base * level / 100);
              return (
                <div key={i} className="flex flex-col items-center gap-2 rounded-2xl p-3"
                  style={{
                    background: 'linear-gradient(160deg, #1a1000, #2a1800)',
                    border: '1px solid #f59e0b44',
                    boxShadow: '0 0 12px #f59e0b11',
                  }}>
                  <img src={spriteUrl(p.pokemonId, p.isShiny)} alt="" width={64} height={64}
                    style={{ imageRendering: 'pixelated', filter: 'drop-shadow(0 0 8px #f59e0b88)' }} draggable={false} />
                  <div className="text-center">
                    <p className="text-white font-black text-xs truncate w-full">{poke?.name ?? `#${p.pokemonId}`}</p>
                    <span className="bg-yellow-600/30 text-yellow-300 text-[0.45rem] px-1.5 py-0.5 rounded-full font-black border border-yellow-600/30">
                      Nv.{level}
                    </span>
                  </div>
                  {/* Mini stats */}
                  <div className="w-full grid grid-cols-2 gap-0.5 text-[0.45rem] text-center">
                    <span className="text-green-400 font-bold">HP {calcStat(stats.hp)}</span>
                    <span className="text-red-400 font-bold">ATK {calcStat(stats.atk)}</span>
                    <span className="text-blue-400 font-bold">DEF {calcStat(stats.def)}</span>
                    <span className="text-yellow-400 font-bold">VIT {calcStat(stats.spd)}</span>
                  </div>
                  {/* Move pills */}
                  <div className="w-full flex flex-col gap-0.5">
                    {moveIds.map((mid, mi) => {
                      const mv = MOVES[mid];
                      const bg = getMoveColor(mid);
                      return (
                        <div key={mi} className="rounded px-1.5 py-0.5 text-[0.4rem] text-white font-bold truncate"
                          style={{ background: bg + 'cc' }}>
                          {mv?.name ?? mid}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Power score */}
          <div className="flex items-center justify-center gap-2 py-3 rounded-2xl"
            style={{ background: 'linear-gradient(90deg, #1a0800, #2a1000, #1a0800)', border: '1px solid #f59e0b33' }}>
            <span className="text-amber-500 text-sm font-bold">⚡ Puissance totale :</span>
            <span className="text-yellow-300 font-black text-lg">{teamPower}</span>
          </div>

          {/* Launch button */}
          {champion?.username === username ? (
            <button
              onClick={async () => {
                if (!throneData || !champion) return;
                const newData: ThroneData = {
                  ...throneData,
                  champion: { ...champion, team: selectedPokemon.map(p => ({ pokemonId: p.pokemonId, isShiny: p.isShiny })) },
                };
                await throneWrite(newData);
                setThroneData(newData);
                setPhase('view');
                setSelectedPokemon([]);
              }}
              className="w-full py-4 rounded-2xl font-black text-lg text-black"
              style={{
                background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                boxShadow: '0 4px 24px rgba(245,158,11,0.5)',
              }}
            >
              👑 Mettre à jour mon équipe
            </button>
          ) : (
            <button
              onClick={() => launchBattle(selectedPokemon, customMoves)}
              className="w-full py-4 rounded-2xl font-black text-lg text-black"
              style={{
                background: 'linear-gradient(90deg, #f59e0b, #ef4444)',
                boxShadow: '0 4px 24px rgba(245,158,11,0.5)',
              }}
            >
              ⚔️ Lancer le combat !
            </button>
          )}

          <button
            onClick={() => setPhase('pick_pokemon')}
            className="w-full py-3 rounded-2xl font-bold text-sm text-slate-400 border border-slate-700"
          >
            ← Modifier l'équipe
          </button>
        </div>
      </div>
    );
  }

  /* ── Main throne view ── */
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-slate-900 overflow-y-auto"
      style={{ background: 'linear-gradient(180deg, #0a0800 0%, #1a1000 40%, #0d0a00 100%)' }}>
      <div className="flex items-center justify-between px-5 pt-6 pb-2 shrink-0">
        <h1 className="text-yellow-400 font-black text-2xl tracking-wide">👑 Trône</h1>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-xl px-2">✕</button>
      </div>

      <div className="flex flex-col items-center px-5 gap-8 pb-12 pt-2">

        {resultMsg && (
          <div className="w-full max-w-md bg-yellow-900/40 border border-yellow-500/50 rounded-2xl px-4 py-3 text-yellow-300 font-bold text-center text-sm">
            {resultMsg}
          </div>
        )}

        {/* Coin claim popup */}
        {coinPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={claimCoins}>
            <div
              className="w-80 rounded-3xl border-2 border-yellow-500 flex flex-col items-center gap-4 p-7"
              style={{ background: 'linear-gradient(160deg, #1a1000, #2a1800)', boxShadow: '0 0 60px rgba(245,158,11,0.5)' }}
              onClick={e => e.stopPropagation()}
            >
              <span className="text-6xl" style={{ animation: 'float-throne 2s ease-in-out infinite' }}>💰</span>
              <div className="text-center">
                <p className="text-yellow-300 font-black text-xl">Revenus du Trône</p>
                <p className="text-slate-400 text-sm mt-1">Tu étais sur le Trône</p>
              </div>
              <div className="text-yellow-400 font-black text-4xl tabular-nums" style={{ textShadow: '0 0 20px rgba(245,158,11,0.8)' }}>
                +{coinPopup.coins} 🪙
              </div>
              <button
                onClick={claimCoins}
                className="w-full py-3 rounded-2xl font-black text-lg text-black"
                style={{ background: 'linear-gradient(90deg, #f59e0b, #fbbf24)' }}
              >
                Réclamer
              </button>
            </div>
          </div>
        )}

        {/* Throne visual */}
        {champion ? (
          <div className="w-full max-w-md flex flex-col items-center gap-5">
            <div className="flex flex-col items-center gap-1">
              <span className="text-7xl" style={{ filter: 'drop-shadow(0 0 20px rgba(245,158,11,0.9))', animation: 'float-throne 3s ease-in-out infinite' }}>👑</span>
              <span className="text-yellow-300 font-black text-2xl tracking-wide" style={{ textShadow: '0 0 30px rgba(245,158,11,0.7)' }}>
                {champion.username}
              </span>
            </div>

            <div
              className="w-full rounded-3xl border-2 flex flex-col items-center gap-4 py-6 px-4"
              style={{
                background: 'linear-gradient(160deg, #1a1000 0%, #2a1a00 50%, #1a1000 100%)',
                borderColor: '#f59e0b',
                boxShadow: '0 0 60px rgba(245,158,11,0.3), inset 0 0 40px rgba(245,158,11,0.05)',
              }}
            >
              <div className="flex justify-center gap-8 items-end">
                {champion.team.map((m, i) => {
                  const poke = POKEMON_BY_ID[m.pokemonId];
                  const anims = ['throne-float-a', 'throne-float-b', 'throne-float-a'];
                  const sizes = [80, 96, 80];
                  const glow = m.isShiny
                    ? 'drop-shadow(0 0 14px #fde047) drop-shadow(0 0 28px #f59e0b)'
                    : 'drop-shadow(0 0 10px rgba(245,158,11,0.7)) drop-shadow(0 0 20px rgba(245,158,11,0.3))';
                  return (
                    <div key={i} className="flex flex-col items-center gap-1" style={{ animation: `${anims[i]} ${2.5 + i * 0.4}s ease-in-out infinite` }}>
                      <div className={`relative inline-block${m.isShiny ? ' shiny-rainbow' : ''}`}>
                        <img
                          src={spriteUrl(m.pokemonId, m.isShiny)}
                          alt={poke?.name ?? `#${m.pokemonId}`}
                          width={sizes[i]} height={sizes[i]}
                          style={{ imageRendering: 'pixelated', filter: glow }}
                          draggable={false}
                        />
                        {m.isShiny && (
                          <>
                            <span className="absolute pointer-events-none" style={{ top: '10%', left: '50%', fontSize: '0.7rem', animation: 'pokedex-star-orbit-a 2s linear infinite', transformOrigin: '0 0' }}>⭐</span>
                            <span className="absolute pointer-events-none" style={{ top: '50%', left: '10%', fontSize: '0.6rem', animation: 'pokedex-star-orbit-b 2.5s linear infinite', transformOrigin: '0 0' }}>✦</span>
                            <span className="absolute pointer-events-none" style={{ top: '80%', left: '80%', fontSize: '0.5rem', animation: 'pokedex-star-orbit-c 1.8s linear infinite', transformOrigin: '0 0' }}>★</span>
                          </>
                        )}
                      </div>
                      <span className="text-yellow-200 text-xs font-bold">{poke?.name ?? `#${m.pokemonId}`}</span>
                    </div>
                  );
                })}
              </div>

              {champion.since !== 'Depuis toujours' ? (
                <LiveTimer since={champion.since} />
              ) : (
                <div className="text-yellow-500/60 text-sm font-bold">Depuis toujours</div>
              )}
            </div>

            {champion?.username === username ? (
              <button
                onClick={() => setPhase('pick_mode')}
                className="w-full py-4 rounded-2xl font-black text-lg text-black"
                style={{ background: 'linear-gradient(90deg, #f59e0b, #fbbf24)', boxShadow: '0 4px 24px rgba(245,158,11,0.5)' }}
              >
                👑 Changer mon équipe du Trône
              </button>
            ) : caughtIds.length >= 3 ? (
              <button
                onClick={() => setPhase('pick_mode')}
                className="w-full py-4 rounded-2xl font-black text-lg text-black"
                style={{ background: 'linear-gradient(90deg, #f59e0b, #ef4444)', boxShadow: '0 4px 24px rgba(245,158,11,0.5)' }}
              >
                ⚔️ Affronter le Champion
              </button>
            ) : (
              <div className="w-full bg-slate-800/80 rounded-2xl p-4 text-center text-slate-400 text-sm">
                Capture au moins 3 Pokémon pour challenger le champion.
              </div>
            )}
          </div>
        ) : (
          <div className="w-full max-w-md flex flex-col items-center gap-4 py-10">
            <span className="text-8xl opacity-30">👑</span>
            <p className="text-slate-500 text-center text-base font-bold">Le trône est vide.</p>
            <p className="text-slate-600 text-center text-sm">Aucun champion pour l'instant.</p>
          </div>
        )}

        {/* Leaderboard */}
        <div className="w-full max-w-md" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
          <h2 className="text-amber-400 font-black text-sm uppercase tracking-wider mb-4">📊 Classement des Champions</h2>
          <Leaderboard records={records} currentChampion={champion ? { username: champion.username, since: champion.since } : undefined} />
        </div>
      </div>

      <style>{`
        @keyframes float-throne {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes throne-float-a {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-10px) scale(1.04); }
        }
        @keyframes throne-float-b {
          0%, 100% { transform: translateY(-5px) scale(1.03); }
          50% { transform: translateY(3px) scale(1); }
        }
        @keyframes throne-sheet-up { from{transform:translateY(100%)} to{transform:translateY(0)} }
      `}</style>
      {showTutorial && (
        <TutorialOverlay
          steps={THRONE_TUTORIAL}
          tutorialKey="throne"
          onDone={() => setShowTutorial(false)}
          bottomOffset={80}
        />
      )}
    </div>
  );
}
