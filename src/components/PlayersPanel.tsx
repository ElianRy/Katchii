import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { adminResetPassword, adminBanUser } from '../lib/supabaseAdmin';
import { POKEMON_BY_ID } from '../data/gen1';
import { RARITY_COLORS } from '../types';
import { PlayerProfile } from './PlayerProfile';

interface PlayerRow {
  user_id: string;
  username: string;
  points: number;
  normalCount: number;
  shinyCount: number;
  topPokemon: { pokemonId: number; isShiny: boolean } | null;
  duelWins: number;
  duelLosses: number;
  rankingPoints: number;
  lastSeen?: string; // ISO string from presence
  isOnline?: boolean;
  favoritePokemon?: { pokemonId: number; isShiny: boolean } | null;
  showcase?: Array<{ pokemonId: number; isShiny: boolean }>;
  badgeCount?: number;
}

const MUTE_KEY = 'katchii_muted_users';
const DELETED_KEY = 'katchii_deleted_users';
const PARK_REMOVED_KEY = 'katchii_park_removed_users';

function loadMutedMap(): Map<string, number | null> {
  try {
    const raw = JSON.parse(localStorage.getItem(MUTE_KEY) ?? '[]') as [string, number | null][];
    const now = Date.now();
    return new Map(raw.filter(([, exp]) => exp === null || exp > now));
  } catch { return new Map(); }
}
function saveMutedMap(m: Map<string, number | null>) {
  localStorage.setItem(MUTE_KEY, JSON.stringify([...m.entries()]));
}
function loadSet(key: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(key) ?? '[]') as string[]); }
  catch { return new Set(); }
}
function saveSet(key: string, s: Set<string>) {
  localStorage.setItem(key, JSON.stringify([...s]));
}

function muteRemaining(expiry: number | null): string {
  if (expiry === null) return 'Permanent';
  const ms = expiry - Date.now();
  if (ms <= 0) return 'Expiré';
  const m = Math.ceil(ms / 60000);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}min`;
}

interface Props {
  onClose: () => void;
  isAdmin?: boolean;
  onBattle3v3?: (enemyPokemon: Array<{ pokemonId: number; level: number; isShiny?: boolean }>, enemyName: string) => void;
}

function formatLastSeen(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return 'moins d\'1 min';
  if (diff < 60) return `${diff} min`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}j`;
}

export function PlayersPanel({ onClose, isAdmin = false, onBattle3v3 }: Props) {
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [myUserId, setMyUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyUserId(data.user?.id ?? null));
  }, []);
  const [sort, setSort] = useState<'collection' | 'shiny' | 'alpha'>('alpha');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerRow | null>(null);
  const [adminTarget, setAdminTarget] = useState<PlayerRow | null>(null);
  const [mutedUsers, setMutedUsers] = useState<Map<string, number | null>>(loadMutedMap);
  const [deletedUsers, setDeletedUsers] = useState<Set<string>>(loadSet.bind(null, DELETED_KEY));
  const [parkRemovedUsers, setParkRemovedUsers] = useState<Set<string>>(loadSet.bind(null, PARK_REMOVED_KEY));
  const [adminConfirm, setAdminConfirm] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from('game_saves').select('state, user_id, updated_at'),
      supabase.from('pokepark_presence').select('user_id, updated_at'),
    ]).then(([savesRes, presenceRes]) => {
      const { data, error } = savesRes;
      if (error || !data) { setLoading(false); return; }

      // Build presence map: user_id -> last_seen
      const nowMs = Date.now();
      const presenceMap = new Map<string, { lastSeen: string; isOnline: boolean }>();
      if (presenceRes.data) {
        for (const p of presenceRes.data) {
          const ms = new Date(p.updated_at).getTime();
          presenceMap.set(p.user_id, {
            lastSeen: p.updated_at,
            isOnline: nowMs - ms < 60 * 1000,
          });
        }
      }

      const rows: PlayerRow[] = data.map(row => {
        const s = row.state as Record<string, unknown> | null;
        if (!s) return null;
        const normal = s.normalCollection as Record<number, number> ?? {};
        const shiny  = s.shinyCollection  as Record<number, number> ?? {};
        const duels   = s.duels   as { wins?: number; losses?: number; rankingPoints?: number } | null;
        const normalCount = Object.values(normal).filter(v => v > 0).length;
        const shinyCount  = Object.values(shiny).filter(v  => v > 0).length;

        // Best pokemon: highest rarity, then highest id
        const rarityRank: Record<string, number> = { commun:0, peu_commun:1, rare:2, elite:3, legendaire:4 };
        const bestId = Object.entries(normal)
          .filter(([, c]) => c > 0)
          .map(([id]) => Number(id))
          .sort((a, b) => {
            const ra = rarityRank[POKEMON_BY_ID[a]?.rarity ?? 'commun'] ?? 0;
            const rb = rarityRank[POKEMON_BY_ID[b]?.rarity ?? 'commun'] ?? 0;
            return rb !== ra ? rb - ra : b - a;
          })[0] ?? null;

        const favoritePokemon = (s.favoritePokemon as { pokemonId: number; isShiny: boolean } | null) ?? null;
        const showcase = (s.showcase as Array<{ pokemonId: number; isShiny: boolean }>) ?? [];
        const badgeCount = Array.isArray(s.badges) ? (s.badges as string[]).length : 0;

        const presence = presenceMap.get(row.user_id);
        // Use presence last_seen if available, otherwise fall back to game_saves updated_at
        const lastSeen = presence?.lastSeen ?? (row as Record<string, unknown>).updated_at as string | undefined;
        return {
          user_id: row.user_id,
          username: (s.username as string) ?? '?',
          points: (s.points as number) ?? 0,
          normalCount,
          shinyCount,
          topPokemon: bestId ? { pokemonId: bestId, isShiny: (shiny[bestId] ?? 0) > 0 } : null,
          duelWins:   duels?.wins ?? 0,
          duelLosses: duels?.losses ?? 0,
          rankingPoints: duels?.rankingPoints ?? 0,
          lastSeen,
          isOnline: presence?.isOnline ?? false,
          favoritePokemon,
          showcase,
          badgeCount,
        } as PlayerRow;
      }).filter((r): r is PlayerRow => {
        if (!r || !r.username || r.username === '?') return false;
        const u = r.username.toLowerCase();
        // Hide admin account and test/deleted accounts from the leaderboard
        if (u === 'elian') return false;
        if (u === 'resteappu') return false;
        if (u === 'test') return false;
        return true;
      });
      setPlayers(rows);
      setLoading(false);
    });
  }, []);

  const adminMute = useCallback((userId: string, durationMs: number | null) => {
    const expiry = durationMs === null ? null : Date.now() + durationMs;
    setMutedUsers(prev => { const next = new Map(prev).set(userId, expiry); saveMutedMap(next); return next; });
  }, []);

  const adminUnmute = useCallback((userId: string) => {
    setMutedUsers(prev => { const next = new Map(prev); next.delete(userId); saveMutedMap(next); return next; });
  }, []);

  const adminDeleteUser = useCallback(async (userId: string) => {
    // Try auth-level ban (requires service role key — may fail in prod)
    await adminBanUser(userId);
    // Mark banned in game_saves so the app blocks them even without service key
    const { data: saveRow } = await supabase.from('game_saves').select('state').eq('user_id', userId).single();
    if (saveRow?.state) {
      await supabase.from('game_saves')
        .update({ state: { ...(saveRow.state as object), banned: true } })
        .eq('user_id', userId);
    } else {
      // No existing save — insert a stub so the banned flag persists on re-login
      await supabase.from('game_saves').upsert({ user_id: userId, state: { banned: true } });
    }
    // Remove from pokepark presence
    await supabase.from('pokepark_presence').delete().eq('user_id', userId);
    // Broadcast ban so active sessions log out immediately
    const modChan = supabase.channel('katchii_moderation');
    modChan.subscribe(status => {
      if (status === 'SUBSCRIBED') {
        modChan.send({ type: 'broadcast', event: 'user_banned', payload: { userId } })
          .finally(() => { setTimeout(() => supabase.removeChannel(modChan), 2000); });
      }
    });
    const next = new Set(deletedUsers).add(userId);
    setDeletedUsers(next);
    saveSet(DELETED_KEY, next);
    setAdminTarget(null);
    setAdminConfirm(null);
  }, [deletedUsers]);

  const adminRemoveFromPark = useCallback(async (userId: string) => {
    const next = new Set(parkRemovedUsers).add(userId);
    setParkRemovedUsers(next);
    saveSet(PARK_REMOVED_KEY, next);
    await supabase.from('pokepark_presence').delete().eq('user_id', userId);
    setAdminTarget(null);
  }, [parkRemovedUsers]);

  const sorted = [...players].filter(p => !deletedUsers.has(p.user_id)).sort((a, b) => {
    if (sort === 'collection') return b.normalCount - a.normalCount;
    if (sort === 'shiny') return b.shinyCount - a.shinyCount;
    return a.username.localeCompare(b.username, 'fr', { sensitivity: 'base' });
  });

  return (
    <div className="fixed inset-0 z-[600] flex flex-col bg-slate-950" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700 shrink-0">
        <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl px-1">←</button>
        <div>
          <h2 className="text-white font-black text-xl">👥 Joueurs</h2>
          <p className="text-slate-400 text-xs">{players.length} dresseurs actifs</p>
        </div>
      </div>

      {/* Sort tabs */}
      <div className="flex gap-1.5 px-4 py-2 border-b border-slate-700/50 shrink-0 overflow-x-auto">
        {([
          ['alpha', '🔤 A→Z'],
          ['collection', '📚 Collection'],
          ['shiny', '✨ Shinies'],
        ] as [typeof sort, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSort(key)}
            className="shrink-0 px-3 py-1 rounded-full text-xs font-bold transition-all"
            style={{
              background: sort === key ? '#f59e0b' : 'rgba(255,255,255,0.07)',
              color: sort === key ? '#000' : '#94a3b8',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto pb-24">
        {loading && (
          <div className="flex items-center justify-center py-20 text-slate-500 animate-pulse text-sm">
            Chargement…
          </div>
        )}
        {!loading && sorted.map((p) => {
          const favData = p.favoritePokemon ? POKEMON_BY_ID[p.favoritePokemon.pokemonId] : null;
          const favSpriteUrl = p.favoritePokemon
            ? p.favoritePokemon.isShiny
              ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${p.favoritePokemon.pokemonId}.png`
              : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.favoritePokemon.pokemonId}.png`
            : null;

          const isMe = p.user_id === myUserId;

          return (
            <div
              key={p.user_id}
              className="flex items-center gap-3 px-4 py-3 border-b border-slate-800/60 active:bg-white/5 cursor-pointer"
              style={{ borderLeft: isMe ? '3px solid #fbbf24' : undefined, background: isMe ? 'rgba(251,191,36,0.06)' : undefined }}
              onClick={() => isAdmin ? setAdminTarget(p) : setSelectedPlayer(p)}
            >
              {/* Favorite pokemon sprite */}
              <div className="shrink-0 w-10 h-10 flex items-center justify-center">
                {favSpriteUrl ? (
                  <img src={favSpriteUrl} width={40} height={40}
                    style={{ imageRendering: 'pixelated', filter: favData ? `drop-shadow(0 0 4px ${RARITY_COLORS[favData.rarity]})` : undefined }}
                    alt="" />
                ) : (
                  <div className="text-2xl text-slate-600">?</div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-black text-sm truncate" style={{ color: isMe ? '#fbbf24' : p.username?.toLowerCase() === 'pokelian' ? '#ef4444' : 'white' }}>{p.username}</span>
                  {isMe && <span className="shrink-0 text-[0.6rem] font-black px-1.5 py-0.5 rounded-full" style={{ background: '#fbbf24', color: '#000' }}>Vous</span>}
                  {p.isOnline && <span className="shrink-0 w-2 h-2 rounded-full bg-green-400" />}
                </div>
                <div className="flex items-center gap-1 text-xs mt-0.5">
                  {p.isOnline
                    ? <span className="text-green-400 font-semibold">En ligne</span>
                    : p.lastSeen
                      ? <span className="text-slate-500">Actif il y a {formatLastSeen(p.lastSeen)}</span>
                      : null}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span>📚 {p.normalCount}/151</span>
                  {p.shinyCount > 0 && <span>✨ {p.shinyCount}</span>}
                </div>
              </div>

              {/* Sort score */}
              {sort !== 'alpha' && (
                <div className="shrink-0 text-right">
                  <div className="font-black text-sm text-slate-300">
                    {sort === 'collection' ? p.normalCount : p.shinyCount}
                  </div>
                  <div className="text-xs text-slate-600">
                    {sort === 'collection' ? 'pokémon' : 'shinies'}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {!loading && players.length === 0 && (
          <div className="text-center text-slate-500 py-20 text-sm">
            Aucun joueur trouvé.<br />
            <span className="text-xs text-slate-600">Vérifie les permissions Supabase (game_saves SELECT).</span>
          </div>
        )}
      </div>

      {selectedPlayer && (
        <PlayerProfile
          userId={selectedPlayer.user_id}
          username={selectedPlayer.username}
          isOnline={selectedPlayer.isOnline}
          lastSeen={selectedPlayer.lastSeen}
          onClose={() => setSelectedPlayer(null)}
          onBattle3v3={onBattle3v3}
        />
      )}

      {/* Admin panel */}
      {adminTarget && (
        <AdminPlayerPanel
          player={adminTarget}
          mutedUsers={mutedUsers}
          deletedUsers={deletedUsers}
          parkRemovedUsers={parkRemovedUsers}
          adminConfirm={adminConfirm}
          onMute={adminMute}
          onUnmute={adminUnmute}
          onDeleteUser={adminDeleteUser}
          onRemoveFromPark={adminRemoveFromPark}
          onSetConfirm={setAdminConfirm}
          onViewProfile={() => { setSelectedPlayer(adminTarget); setAdminTarget(null); }}
          onClose={() => { setAdminTarget(null); setAdminConfirm(null); }}
        />
      )}
    </div>
  );
}

interface AdminPanelProps {
  player: PlayerRow;
  mutedUsers: Map<string, number | null>;
  deletedUsers: Set<string>;
  parkRemovedUsers: Set<string>;
  adminConfirm: string | null;
  onMute: (userId: string, ms: number | null) => void;
  onUnmute: (userId: string) => void;
  onDeleteUser: (userId: string) => void;
  onRemoveFromPark: (userId: string) => void;
  onSetConfirm: (v: string | null) => void;
  onViewProfile: () => void;
  onClose: () => void;
}


function AdminPlayerPanel({ player, mutedUsers, deletedUsers, parkRemovedUsers, adminConfirm, onMute, onUnmute, onDeleteUser, onRemoveFromPark, onSetConfirm, onViewProfile, onClose }: AdminPanelProps) {
  const muteExpiry = mutedUsers.get(player.user_id);
  const isMuted = muteExpiry !== undefined && (muteExpiry === null || muteExpiry > Date.now());
  const isDeleted = deletedUsers.has(player.user_id);
  const isRemovedFromPark = parkRemovedUsers.has(player.user_id);
  const [pwResetResult, setPwResetResult] = useState<{ tempPw: string; status: 'pending' | 'done' | 'error'; errorMsg?: string } | null>(null);

  const handlePasswordReset = async () => {
    setPwResetResult({ tempPw: 'katchii2026', status: 'pending' });
    // Change auth password to "katchii2026" via service role
    const { error: pwError } = await adminResetPassword(player.user_id);
    // Store forcePasswordChange flag so app forces change on next login
    const { data: saveData } = await supabase.from('game_saves').select('state').eq('user_id', player.user_id).single();
    if (saveData?.state) {
      const newState = { ...(saveData.state as Record<string, unknown>), forcePasswordChange: true };
      await supabase.from('game_saves').update({ state: newState }).eq('user_id', player.user_id);
    }
    setPwResetResult({ tempPw: 'katchii2026', status: pwError ? 'error' : 'done', errorMsg: pwError ?? undefined });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div className="w-full max-w-md bg-slate-900 border border-red-500/40 rounded-2xl p-5 shadow-2xl overflow-y-auto max-h-[90dvh]"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-red-400 text-xs font-black uppercase tracking-wider">⚙️ Admin</span>
            </div>
            <div className="font-black text-white text-lg">{player.username}</div>
            <div className="text-slate-400 text-xs font-mono">{player.user_id.slice(0, 8)}…</div>
          </div>
          <div className="flex gap-2">
            <button onClick={onViewProfile}
              className="px-3 py-1.5 rounded-lg bg-blue-800/50 text-blue-300 text-xs font-bold">
              Profil
            </button>
            <button onClick={onClose} className="text-slate-400 text-2xl px-1">✕</button>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex gap-2 flex-wrap mb-4">
          {isMuted && (
            <span className="px-2 py-0.5 rounded-full bg-orange-900/50 border border-orange-500/50 text-orange-300 text-xs font-bold">
              🔇 Muté — {muteRemaining(muteExpiry!)}
            </span>
          )}
          {isDeleted && (
            <span className="px-2 py-0.5 rounded-full bg-red-900/50 border border-red-500/50 text-red-300 text-xs font-bold">
              🗑️ Compte supprimé
            </span>
          )}
          {isRemovedFromPark && !isDeleted && (
            <span className="px-2 py-0.5 rounded-full bg-slate-700/80 border border-slate-500/50 text-slate-400 text-xs font-bold">
              🌿 Retiré du parc
            </span>
          )}
        </div>

        {/* Mute section */}
        <div className="bg-slate-800/60 rounded-xl p-3 mb-3">
          <div className="text-xs font-black text-orange-400 mb-2 uppercase">🔇 Mute chat</div>
          {isMuted ? (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300">Durée restante : <span className="font-bold text-orange-300">{muteRemaining(muteExpiry!)}</span></span>
              <button onClick={() => onUnmute(player.user_id)}
                className="px-3 py-1 rounded-lg bg-green-700/60 text-green-300 text-xs font-bold">
                🔊 Démuter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: '5 min',  ms: 5 * 60 * 1000 },
                { label: '15 min', ms: 15 * 60 * 1000 },
                { label: '1 h',    ms: 60 * 60 * 1000 },
                { label: 'Perma',  ms: null },
              ].map(opt => (
                <button key={opt.label} onClick={() => onMute(player.user_id, opt.ms)}
                  className="px-2 py-1.5 rounded-lg bg-orange-900/50 border border-orange-600/40 text-orange-300 text-xs font-bold hover:bg-orange-800/60 transition-all">
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Park section */}
        <div className="bg-slate-800/60 rounded-xl p-3 mb-3">
          <div className="text-xs font-black text-green-400 mb-2 uppercase">🌿 PokéParc</div>
          <button onClick={() => onRemoveFromPark(player.user_id)}
            disabled={isRemovedFromPark}
            className="w-full px-3 py-2 rounded-lg bg-slate-700/60 border border-slate-600/40 text-slate-300 text-xs font-bold disabled:opacity-40 hover:bg-slate-600/60 transition-all">
            {isRemovedFromPark ? '✓ Pokémon retiré du parc' : 'Retirer le pokémon du parc'}
          </button>
        </div>

        {/* Password reset */}
        <div className="bg-slate-800/60 rounded-xl p-3 mb-3">
          <div className="text-xs font-black text-blue-400 mb-2 uppercase">🔑 Mot de passe</div>
          {pwResetResult ? (
            <div className="flex flex-col gap-2">
              {pwResetResult.status === 'pending' && (
                <div className="text-xs text-slate-400 text-center animate-pulse">Réinitialisation en cours…</div>
              )}
              {pwResetResult.status === 'done' && (
                <>
                  <div className="text-xs text-green-400 font-bold">✅ Mot de passe réinitialisé !</div>
                  <div className="flex items-center gap-2 bg-slate-700 rounded-lg px-3 py-2">
                    <span className="font-mono text-sm text-white font-bold flex-1">katchii2026</span>
                    <button onClick={() => navigator.clipboard.writeText('katchii2026')}
                      className="text-xs text-blue-400 font-bold shrink-0">Copier</button>
                  </div>
                  <div className="text-[0.65rem] text-slate-400 leading-snug">
                    Donne ce mot de passe temporaire au joueur. À sa prochaine connexion, il devra immédiatement choisir un nouveau mot de passe.
                  </div>
                </>
              )}
              {pwResetResult.status === 'error' && (
                <>
                  <div className="text-xs text-red-400 font-bold">⚠️ Erreur auth : {pwResetResult.errorMsg}</div>
                  <div className="text-[0.65rem] text-yellow-500">Le flag forcePasswordChange a quand même été posé. Ajoute VITE_SUPABASE_SERVICE_ROLE_KEY dans .env.local pour changer le vrai mot de passe.</div>
                </>
              )}
              <button onClick={() => setPwResetResult(null)}
                className="text-xs text-slate-400 underline text-left">Fermer</button>
            </div>
          ) : (
            <button onClick={handlePasswordReset}
              className="w-full px-3 py-2 rounded-lg bg-blue-900/40 border border-blue-700/40 text-blue-300 text-xs font-bold hover:bg-blue-800/50 transition-all">
              🔑 Réinitialiser le mot de passe
            </button>
          )}
        </div>

        {/* Danger zone */}
        <div className="bg-red-950/30 rounded-xl p-3 border border-red-800/40">
          <div className="text-xs font-black text-red-400 mb-2 uppercase">⚠️ Zone dangereuse</div>
          {adminConfirm === 'delete' ? (
            <div className="flex flex-col gap-2">
              <div className="text-xs text-red-300 font-bold text-center">Bannir <span className="text-white">{player.username}</span> définitivement ?</div>
              <div className="text-[0.6rem] text-slate-400 text-center">Supprime son compte auth — il ne pourra plus jamais se connecter.</div>
              <div className="flex gap-2">
                <button onClick={() => onSetConfirm(null)} className="flex-1 py-2 rounded-lg bg-slate-700 text-slate-300 text-xs font-bold">Annuler</button>
                <button onClick={() => onDeleteUser(player.user_id)}
                  className="flex-1 py-2 rounded-lg bg-red-700 text-white text-xs font-black">
                  Supprimer
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => onSetConfirm('delete')}
              className="w-full px-3 py-2 rounded-lg bg-red-900/50 border border-red-700/50 text-red-300 text-xs font-bold hover:bg-red-800/50 transition-all">
              🚫 Bannir le compte
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
