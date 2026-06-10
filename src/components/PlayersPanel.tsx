import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
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

interface Props {
  onClose: () => void;
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

export function PlayersPanel({ onClose, onBattle3v3 }: Props) {
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<'points' | 'collection' | 'shiny' | 'rank'>('points');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerRow | null>(null);

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

  const sorted = [...players].sort((a, b) => {
    // Online players always first
    if (a.isOnline && !b.isOnline) return -1;
    if (!a.isOnline && b.isOnline) return 1;
    if (sort === 'points') return b.points - a.points;
    if (sort === 'collection') return b.normalCount - a.normalCount;
    if (sort === 'shiny') return b.shinyCount - a.shinyCount;
    return b.rankingPoints - a.rankingPoints;
  });

  const MEDAL = ['🥇', '🥈', '🥉'];

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-slate-950" style={{ height: '100dvh' }}>
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
          ['points', '⭐ Points'],
          ['collection', '📚 Collection'],
          ['shiny', '✨ Shinies'],
          ['rank', '🥊 Rang duel'],
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
        {!loading && sorted.map((p, i) => {
          const favData = p.favoritePokemon ? POKEMON_BY_ID[p.favoritePokemon.pokemonId] : null;
          const favSpriteUrl = p.favoritePokemon
            ? p.favoritePokemon.isShiny
              ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${p.favoritePokemon.pokemonId}.png`
              : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.favoritePokemon.pokemonId}.png`
            : null;

          const rankColor = i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : '#475569';
          const isTopThree = i < 3;

          const showcaseItems = (p.showcase ?? []).slice(0, 3);

          return (
            <div
              key={p.user_id}
              className="flex items-center gap-3 px-4 py-3 border-b border-slate-800/60 active:bg-white/5 cursor-pointer"
              style={{ background: isTopThree ? `${rankColor}08` : undefined }}
              onClick={() => setSelectedPlayer(p)}
            >
              {/* Rank */}
              <div className="shrink-0 w-8 text-center">
                {i < 3
                  ? <span className="text-xl">{MEDAL[i]}</span>
                  : <span className="text-sm font-bold text-slate-500">#{i + 1}</span>
                }
              </div>

              {/* Favorite pokemon sprite */}
              <div className="shrink-0 w-10 h-10 flex items-center justify-center">
                {favSpriteUrl ? (
                  <img
                    src={favSpriteUrl}
                    width={40} height={40}
                    style={{
                      imageRendering: 'pixelated',
                      filter: favData ? `drop-shadow(0 0 4px ${RARITY_COLORS[favData.rarity]})` : undefined,
                    }}
                    alt=""
                  />
                ) : (
                  <div className="text-2xl text-slate-600">?</div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-black text-sm truncate" style={{ color: p.username?.toLowerCase() === 'pokelian' ? '#ef4444' : 'white' }}>{p.username}</span>
                  {p.isOnline && <span className="shrink-0 w-2 h-2 rounded-full bg-green-400" title="En ligne" />}
                </div>
                <div className="flex items-center gap-1 text-xs mt-0.5">
                  {p.isOnline ? (
                    <span className="text-green-400 font-semibold">En ligne</span>
                  ) : p.lastSeen ? (
                    <span className="text-slate-500">Actif il y a {formatLastSeen(p.lastSeen)}</span>
                  ) : null}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 flex-wrap">
                  <span>⭐ {p.points} pts</span>
                  <span>📚 {p.normalCount}/151</span>
                  {p.shinyCount > 0 && <span>✨ {p.shinyCount}</span>}
                  <span>🥊 {p.duelWins}</span>
                </div>
              </div>

              {/* Showcase previews */}
              {showcaseItems.length > 0 && (
                <div className="shrink-0 flex items-center gap-0.5">
                  {showcaseItems.map((s, si) => {
                    const sUrl = s.isShiny
                      ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${s.pokemonId}.png`
                      : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${s.pokemonId}.png`;
                    const sData = POKEMON_BY_ID[s.pokemonId];
                    return (
                      <img
                        key={si}
                        src={sUrl}
                        width={24} height={24}
                        style={{
                          imageRendering: 'pixelated',
                          filter: sData ? `drop-shadow(0 0 2px ${RARITY_COLORS[sData.rarity]})` : undefined,
                        }}
                        alt=""
                      />
                    );
                  })}
                </div>
              )}

              {/* Score highlight */}
              <div className="shrink-0 text-right">
                <div className="font-black text-sm" style={{ color: rankColor }}>
                  {sort === 'points' ? `${p.points}` :
                   sort === 'collection' ? `${p.normalCount}` :
                   sort === 'shiny' ? `${p.shinyCount}` :
                   `${p.rankingPoints}`}
                </div>
                <div className="text-xs text-slate-600">
                  {sort === 'points' ? 'pts' :
                   sort === 'collection' ? 'pokémon' :
                   sort === 'shiny' ? 'shinies' :
                   'ELO'}
                </div>
              </div>
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
    </div>
  );
}
