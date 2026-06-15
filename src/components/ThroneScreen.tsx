import { useState, useEffect, useRef } from 'react';
import { GameState } from '../types';
import { supabase } from '../lib/supabase';
import { calcMaxHp } from '../data/combatEngine';
import { GEN1_STATS } from '../data/gen1Stats';
import { POKEMON_BY_ID } from '../data/gen1';
import { TeamMember } from './TeamBuilder';

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
  const { data } = await supabase.from('game_saves').select('state').eq('user_id', '__throne__').single();
  if (data?.state) return data.state as ThroneData;
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

  // Include current champion's live elapsed time as a virtual record
  const currentDuration = currentChampion && currentChampion.since !== 'Depuis toujours'
    ? now - new Date(currentChampion.since).getTime() : 0;

  const allRecords = currentDuration > 0
    ? [...records, { username: currentChampion!.username, duration: currentDuration, start: currentChampion!.since, end: '' }]
    : records;

  // Longest single reign (including current)
  const longest = [...allRecords].sort((a, b) => b.duration - a.duration).slice(0, 5);
  // Total time per user (including current)
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
      {/* Longest single reign */}
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

      {/* Total time */}
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

const MAX_AFK_MS = 5 * 60 * 60 * 1000; // 5h
const COINS_PER_MINUTE = 10;

function calcUnclaimedCoins(since: string, lastClaim: string | undefined): { coins: number; claimFrom: number; claimTo: number } {
  const sinceMs = new Date(since).getTime();
  const claimFrom = lastClaim ? new Date(lastClaim).getTime() : sinceMs;
  const maxClaimTo = sinceMs + MAX_AFK_MS;
  const claimTo = Math.min(Date.now(), maxClaimTo);
  const minutes = Math.floor((claimTo - claimFrom) / 60000);
  return { coins: Math.max(0, minutes * COINS_PER_MINUTE), claimFrom, claimTo };
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
  const [throneData, setThroneData] = useState<ThroneData | null>(null);
  const [phase, setPhase] = useState<'view' | 'pick_mode' | 'pick_pokemon'>('view');
  const [selectedPokemon, setSelectedPokemon] = useState<Array<{ pokemonId: number; isShiny: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [coinPopup, setCoinPopup] = useState<{ coins: number } | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  /* Initial load + realtime */
  useEffect(() => {
    (async () => {
      const data = await loadThroneData();
      const finalData: ThroneData = data ?? { champion: null, records: [], coinClaims: {} };
      setThroneData(finalData);
      setLoading(false);

      // Check for unclaimed throne coins
      if (finalData.champion?.username === username && finalData.champion.since !== 'Depuis toujours') {
        const { coins } = calcUnclaimedCoins(
          finalData.champion.since,
          finalData.coinClaims?.[username]
        );
        if (coins > 0) setCoinPopup({ coins });
      }
    })();

    const channel = supabase.channel('throne_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_saves', filter: 'user_id=eq.__throne__' }, (payload) => {
        const d = (payload.new as { state?: ThroneData })?.state;
        if (d) setThroneData(d);
      })
      .subscribe();
    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, []);

  const champion = throneData?.champion;
  const records = throneData?.records ?? [];

  /* Favorite team */
  const favTeamId = state.favoriteTeamId;
  const favTeam = favTeamId ? (state.savedTeams ?? []).find(t => t.id === favTeamId) : null;

  async function launchBattle(playerPokemon: Array<{ pokemonId: number; isShiny: boolean }>) {
    if (!champion || !throneData) return;
    const playerTeam = playerPokemon.map(m => toTeamMember(m.pokemonId, m.isShiny, state.pokemonLevels?.[m.pokemonId]?.level ?? 30));
    const enemyTeam = champion.team.map(m => toTeamMember(m.pokemonId, m.isShiny, CHAMPION_LEVEL));
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
        await supabase.from('game_saves').upsert({ user_id: '__throne__', state: newData, updated_at: now });
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
    await supabase.from('game_saves').upsert({ user_id: '__throne__', state: newData, updated_at: now });
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

  const togglePokemon = (pokemonId: number, isShiny: boolean) => {
    setSelectedPokemon(prev => {
      const idx = prev.findIndex(p => p.pokemonId === pokemonId);
      if (idx >= 0) return prev.filter((_, i) => i !== idx);
      if (prev.length >= 3) return prev; // max 3
      return [...prev, { pokemonId, isShiny }];
    });
  };

  /* ── View ── */
  if (loading) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900">
        <div className="text-yellow-400 text-lg animate-pulse">Chargement…</div>
      </div>
    );
  }

  if (phase === 'pick_mode') {
    return (
      <div className="fixed inset-0 z-40 flex flex-col bg-slate-900">
        <div className="flex items-center justify-between px-5 pt-6 pb-4 shrink-0">
          <h1 className="text-yellow-400 font-black text-xl">⚔️ Choisir son équipe</h1>
          <button onClick={() => setPhase('view')} className="text-slate-400 hover:text-white text-xl px-2">✕</button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-5 pb-10">
          {favTeam && (
            <button
              onClick={useFavoriteTeam}
              className="w-full max-w-md rounded-2xl p-5 border-2 border-yellow-600 bg-yellow-900/30 text-left"
            >
              <p className="text-yellow-300 font-black text-sm mb-1">⭐ Équipe favorite — {favTeam.name}</p>
              <div className="flex gap-3 mt-2">
                {favTeam.members.slice(0, 3).map((m, i) => (
                  <div key={i} className="flex flex-col items-center gap-0.5">
                    <img src={spriteUrl(m.pokemonId, m.isShiny ?? false)} alt="" width={48} height={48}
                      style={{ imageRendering: 'pixelated' }} draggable={false} />
                    <span className="text-white text-[0.5rem]">{POKEMON_BY_ID[m.pokemonId]?.name}</span>
                  </div>
                ))}
              </div>
            </button>
          )}
          <button
            onClick={() => setPhase('pick_pokemon')}
            className="w-full max-w-md rounded-2xl p-5 border-2 border-slate-600 bg-slate-800/60 text-left hover:border-slate-400"
          >
            <p className="text-white font-black text-sm">🎮 Choisir 3 Pokémon manuellement</p>
            <p className="text-slate-400 text-xs mt-1">Sélectionne exactement 3 Pokémon de ta collection</p>
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'pick_pokemon') {
    return (
      <div className="fixed inset-0 z-40 flex flex-col bg-slate-900">
        <div className="flex items-center justify-between px-5 pt-6 pb-3 shrink-0 border-b border-slate-700">
          <div>
            <h1 className="text-white font-black text-lg">Choisis 3 Pokémon</h1>
            <p className="text-slate-400 text-xs">{selectedPokemon.length}/3 sélectionnés</p>
          </div>
          <button onClick={() => { setPhase('pick_mode'); setSelectedPokemon([]); }} className="text-slate-400 hover:text-white text-xl px-2">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="grid grid-cols-5 gap-2">
            {caughtIds.map(id => {
              const isShiny = (state.shinyCollection?.[id] ?? 0) > 0;
              const selected = selectedPokemon.some(p => p.pokemonId === id);
              const maxed = selectedPokemon.length >= 3 && !selected;
              return (
                <button
                  key={id}
                  onClick={() => !maxed && togglePokemon(id, isShiny)}
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
                </button>
              );
            })}
          </div>
        </div>
        <div className="px-5 py-4 shrink-0 border-t border-slate-700">
          <button
            onClick={() => launchBattle(selectedPokemon)}
            disabled={selectedPokemon.length !== 3}
            className="w-full py-4 rounded-2xl font-black text-lg text-black disabled:opacity-40"
            style={{ background: 'linear-gradient(90deg, #f59e0b, #ef4444)' }}
          >
            ⚔️ Combattre avec cette équipe
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
                +{coinPopup.coins} 💎
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
            {/* Crown + name */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-7xl" style={{ filter: 'drop-shadow(0 0 20px rgba(245,158,11,0.9))', animation: 'float-throne 3s ease-in-out infinite' }}>👑</span>
              <span className="text-yellow-300 font-black text-2xl tracking-wide" style={{ textShadow: '0 0 30px rgba(245,158,11,0.7)' }}>
                {champion.username}
              </span>
            </div>

            {/* Champion Pokémon — big animated sprites on throne */}
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
                      <img
                        src={spriteUrl(m.pokemonId, m.isShiny)}
                        alt={poke?.name ?? `#${m.pokemonId}`}
                        width={sizes[i]} height={sizes[i]}
                        style={{ imageRendering: 'pixelated', filter: glow }}
                        draggable={false}
                      />
                      <span className="text-yellow-200 text-xs font-bold">{poke?.name ?? `#${m.pokemonId}`}</span>
                      {m.isShiny && <span className="text-yellow-400" style={{ fontSize: '0.55rem' }}>✨ Shiny</span>}
                    </div>
                  );
                })}
              </div>

              {/* Live timer */}
              {champion.since !== 'Depuis toujours' ? (
                <LiveTimer since={champion.since} />
              ) : (
                <div className="text-yellow-500/60 text-sm font-bold">Depuis toujours</div>
              )}
            </div>

            {/* Challenge button */}
            {caughtIds.length >= 3 ? (
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
      `}</style>
    </div>
  );
}
