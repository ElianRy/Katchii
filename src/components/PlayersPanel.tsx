import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { POKEMON_BY_ID } from '../data/gen1';
import { RARITY_COLORS } from '../types';

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
}

interface Props {
  onClose: () => void;
}

export function PlayersPanel({ onClose }: Props) {
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<'points' | 'collection' | 'shiny' | 'rank'>('points');

  useEffect(() => {
    supabase.from('game_saves').select('state, user_id').then(({ data, error }) => {
      if (error || !data) { setLoading(false); return; }
      const rows: PlayerRow[] = data.map(row => {
        const s = row.state as Record<string, unknown> | null;
        if (!s) return null;
        const normal = s.normalCollection as Record<number, number> ?? {};
        const shiny  = s.shinyCollection  as Record<number, number> ?? {};
        const village = s.village as { favoritePokemon?: { pokemonId: number; isShiny: boolean } | null } | null;
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

        return {
          user_id: row.user_id,
          username: (s.username as string) ?? '?',
          points: (s.points as number) ?? 0,
          normalCount,
          shinyCount,
          topPokemon: bestId ? { pokemonId: bestId, isShiny: (shiny[bestId] ?? 0) > 0 } : (village?.favoritePokemon ?? null),
          duelWins:   duels?.wins ?? 0,
          duelLosses: duels?.losses ?? 0,
          rankingPoints: duels?.rankingPoints ?? 0,
        } as PlayerRow;
      }).filter(Boolean) as PlayerRow[];
      setPlayers(rows);
      setLoading(false);
    });
  }, []);

  const sorted = [...players].sort((a, b) => {
    if (sort === 'points') return b.points - a.points;
    if (sort === 'collection') return b.normalCount - a.normalCount;
    if (sort === 'shiny') return b.shinyCount - a.shinyCount;
    return b.rankingPoints - a.rankingPoints;
  });

  const MEDAL = ['🥇', '🥈', '🥉'];

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-slate-950" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 shrink-0">
        <div>
          <h2 className="text-white font-black text-xl">👥 Joueurs</h2>
          <p className="text-slate-400 text-xs">{players.length} dresseurs actifs</p>
        </div>
        <button onClick={onClose} className="text-slate-400 text-2xl px-2">✕</button>
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
          const topData = p.topPokemon ? POKEMON_BY_ID[p.topPokemon.pokemonId] : null;
          const spriteUrl = p.topPokemon
            ? p.topPokemon.isShiny
              ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${p.topPokemon.pokemonId}.png`
              : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.topPokemon.pokemonId}.png`
            : null;

          const rankColor = i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : '#475569';
          const isTopThree = i < 3;

          return (
            <div
              key={p.user_id}
              className="flex items-center gap-3 px-4 py-3 border-b border-slate-800/60"
              style={{
                background: isTopThree ? `${rankColor}08` : undefined,
              }}
            >
              {/* Rank */}
              <div className="shrink-0 w-8 text-center">
                {i < 3
                  ? <span className="text-xl">{MEDAL[i]}</span>
                  : <span className="text-sm font-bold text-slate-500">#{i + 1}</span>
                }
              </div>

              {/* Top pokemon sprite */}
              <div className="shrink-0 w-10 h-10 flex items-center justify-center">
                {spriteUrl ? (
                  <img
                    src={spriteUrl}
                    width={40} height={40}
                    style={{
                      imageRendering: 'pixelated',
                      filter: topData ? `drop-shadow(0 0 4px ${RARITY_COLORS[topData.rarity]})` : undefined,
                    }}
                    alt=""
                  />
                ) : (
                  <div className="text-2xl text-slate-600">?</div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="font-black text-white text-sm truncate">{p.username}</div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 flex-wrap">
                  <span>⭐ {p.points} pts</span>
                  <span>📚 {p.normalCount}/151</span>
                  {p.shinyCount > 0 && <span>✨ {p.shinyCount}</span>}
                  {p.rankingPoints > 0 && <span>🥊 {p.rankingPoints} ELO</span>}
                </div>
              </div>

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
    </div>
  );
}
