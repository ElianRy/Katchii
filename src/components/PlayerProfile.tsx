import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { POKEMON_BY_ID } from '../data/gen1';
import { RARITY_COLORS } from '../types';

interface Props {
  userId: string;
  username: string;
  isOnline?: boolean;
  lastSeen?: string;
  onClose: () => void;
}

function formatLastSeen(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return "moins d'1 min";
  if (diff < 60) return `${diff} min`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}j`;
}

export function PlayerProfile({ userId, username, isOnline, lastSeen, onClose }: Props) {
  const [state, setState] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('game_saves').select('state').eq('user_id', userId).single()
      .then(({ data }) => {
        setState(data?.state as Record<string, unknown> ?? null);
        setLoading(false);
      });
  }, [userId]);

  const normal = (state?.normalCollection as Record<number, number>) ?? {};
  const shiny  = (state?.shinyCollection as Record<number, number>) ?? {};
  const duels  = (state?.duels as { wins?: number; losses?: number; rankingPoints?: number }) ?? {};
  const showcase = (state?.showcase as Array<{ pokemonId: number; isShiny: boolean }>) ?? [];
  const points = (state?.points as number) ?? 0;
  const playerXp = (state?.playerXp as number) ?? 0;

  const normalCount = Object.values(normal).filter(v => v > 0).length;
  const shinyCount  = Object.values(shiny).filter(v  => v > 0).length;

  // Best 6 pokemon by rarity
  const rarityRank: Record<string, number> = { commun:0, peu_commun:1, rare:2, elite:3, legendaire:4 };
  const topPokemon = Object.entries(normal)
    .filter(([, c]) => c > 0)
    .map(([id]) => Number(id))
    .sort((a, b) => {
      const ra = rarityRank[POKEMON_BY_ID[a]?.rarity ?? 'commun'] ?? 0;
      const rb = rarityRank[POKEMON_BY_ID[b]?.rarity ?? 'commun'] ?? 0;
      return rb !== ra ? rb - ra : b - a;
    })
    .slice(0, 6);

  const isPokelian = username.toLowerCase() === 'pokelian';

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-slate-950" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700 shrink-0">
        <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl px-1">←</button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-black text-lg truncate" style={{ color: isPokelian ? '#ef4444' : 'white' }}>
              {username}
            </span>
            {isOnline && <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />}
          </div>
          <p className="text-xs text-slate-400">
            {isOnline ? '🟢 En ligne' : lastSeen ? `⏱ Connecté il y a ${formatLastSeen(lastSeen)}` : ''}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-slate-500 animate-pulse text-sm">Chargement…</div>
      ) : !state ? (
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">Profil indisponible</div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-8 flex flex-col gap-5">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Points', value: points, color: '#f59e0b' },
              { label: 'Pokédex', value: `${normalCount}/151`, color: '#3b82f6' },
              { label: 'Shinies', value: shinyCount, color: '#fde047' },
              { label: 'Victoires', value: duels.wins ?? 0, color: '#22c55e' },
              { label: 'Défaites', value: duels.losses ?? 0, color: '#f87171' },
              { label: 'ELO', value: duels.rankingPoints ?? 0, color: '#a855f7' },
            ].map(s => (
              <div key={s.label} className="bg-slate-800/60 rounded-xl p-3 text-center border border-slate-700/40">
                <div className="font-black text-lg" style={{ color: s.color }}>{s.value}</div>
                <div className="text-slate-400 text-xs">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Showcase */}
          {showcase.length > 0 && (
            <div>
              <h3 className="text-slate-300 font-bold text-sm mb-2">✨ Vitrine</h3>
              <div className="flex gap-3 flex-wrap">
                {showcase.map((s, i) => {
                  const p = POKEMON_BY_ID[s.pokemonId];
                  return p ? (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <img
                        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${s.isShiny ? 'shiny/' : ''}${s.pokemonId}.png`}
                        width={56} height={56}
                        style={{ imageRendering: 'pixelated', filter: `drop-shadow(0 0 6px ${RARITY_COLORS[p.rarity]})` }}
                        alt={p.name}
                      />
                      <span className="text-xs text-slate-300 font-bold">{p.name}</span>
                      {s.isShiny && <span className="text-yellow-400 text-xs">✨</span>}
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* Top pokemon */}
          {topPokemon.length > 0 && (
            <div>
              <h3 className="text-slate-300 font-bold text-sm mb-2">🏆 Top Pokémon</h3>
              <div className="flex flex-wrap gap-2">
                {topPokemon.map(id => {
                  const p = POKEMON_BY_ID[id];
                  const isShiny = (shiny[id] ?? 0) > 0;
                  return p ? (
                    <div key={id} className="flex flex-col items-center gap-0.5">
                      <img
                        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${isShiny ? 'shiny/' : ''}${id}.png`}
                        width={48} height={48}
                        style={{ imageRendering: 'pixelated', filter: `drop-shadow(0 0 4px ${RARITY_COLORS[p.rarity]})` }}
                        alt={p.name}
                      />
                      <span className="text-xs text-slate-400" style={{ fontSize: '0.6rem' }}>{p.name}</span>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* XP */}
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/40">
            <div className="text-slate-400 text-xs mb-1">XP Joueur</div>
            <div className="text-yellow-400 font-black text-xl">{playerXp.toLocaleString()} XP</div>
          </div>
        </div>
      )}
    </div>
  );
}
