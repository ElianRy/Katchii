import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { POKEMON_BY_ID } from '../data/gen1';
import { RARITY_COLORS } from '../types';
import { playerLevelFromXp, xpToNextLevel, getPlayerGrade } from '../lib/playerLevel';

interface Props {
  userId: string;
  username: string;
  isOnline?: boolean;
  lastSeen?: string;
  onClose: () => void;
  onBattle3v3?: (enemyPokemon: Array<{ pokemonId: number; level: number; isShiny?: boolean }>, enemyName: string) => void;
}

function formatLastSeen(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return "moins d'1 min";
  if (diff < 60) return `${diff} min`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}j`;
  return `${Math.floor(d / 7)} sem.`;
}

const RARITY_ORDER: Record<string, number> = { commun: 0, peu_commun: 1, rare: 2, elite: 3, legendaire: 4 };

type Tab = 'stats' | 'collection';

export function PlayerProfile({ userId, username, isOnline, lastSeen, onClose, onBattle3v3 }: Props) {
  const [state, setState] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [fallbackLastSeen, setFallbackLastSeen] = useState<string | undefined>(undefined);
  const effectiveLastSeen = lastSeen ?? fallbackLastSeen;
  const [tab, setTab] = useState<Tab>('stats');

  useEffect(() => {
    supabase.from('game_saves').select('state, updated_at').eq('user_id', userId).single()
      .then(({ data }) => {
        setState(data?.state as Record<string, unknown> ?? null);
        // If no lastSeen from presence, use updated_at from game_saves as fallback
        if (!lastSeen && data?.updated_at) {
          setFallbackLastSeen(data.updated_at as string);
        }
        setLoading(false);
      });
  }, [userId]);

  const normal  = (state?.normalCollection as Record<number, number>) ?? {};
  const shiny   = (state?.shinyCollection  as Record<number, number>) ?? {};
  const duels   = (state?.duels as { wins?: number; losses?: number; rankingPoints?: number }) ?? {};
  const showcase = (state?.showcase as Array<{ pokemonId: number; isShiny: boolean }>) ?? [];
  const points  = (state?.points  as number) ?? 0;
  const playerXp = (state?.playerXp as number) ?? 0;

  const normalCount = Object.values(normal).filter(v => v > 0).length;
  const shinyCount  = Object.values(shiny).filter(v  => v > 0).length;

  const grade   = getPlayerGrade(playerXp);
  const { progress, needed } = xpToNextLevel(playerXp);
  const level   = playerLevelFromXp(playerXp);

  // Full collection sorted by rarity desc then id
  const ownedIds = Object.entries(normal)
    .filter(([, c]) => c > 0)
    .map(([id]) => Number(id))
    .sort((a, b) => {
      const ra = RARITY_ORDER[POKEMON_BY_ID[a]?.rarity ?? 'commun'] ?? 0;
      const rb = RARITY_ORDER[POKEMON_BY_ID[b]?.rarity ?? 'commun'] ?? 0;
      return rb !== ra ? rb - ra : b - a;
    });

  const isPokelian = username.toLowerCase() === 'pokelian';

  const winRate = (duels.wins ?? 0) + (duels.losses ?? 0) > 0
    ? Math.round(((duels.wins ?? 0) / ((duels.wins ?? 0) + (duels.losses ?? 0))) * 100)
    : null;

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-slate-950" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="shrink-0 border-b border-slate-700">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl px-1">←</button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-black text-lg truncate" style={{ color: isPokelian ? '#ef4444' : 'white' }}>
                {username}
              </span>
              {isOnline && <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />}
              <span className="text-base shrink-0">{grade.icon}</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
                style={{ background: `${grade.color}22`, color: grade.color, border: `1px solid ${grade.color}44` }}>
                {grade.grade}
              </span>
            </div>
            <p className="text-xs mt-0.5">
              {isOnline
                ? <span className="text-green-400 font-semibold">🟢 En ligne maintenant</span>
                : effectiveLastSeen
                  ? <span className="text-slate-400">Connecté il y a {formatLastSeen(effectiveLastSeen)}</span>
                  : <span className="text-slate-600">Jamais connecté</span>}
            </p>
          </div>
        </div>

        {/* Level bar */}
        {!loading && state && (
          <div className="px-4 pb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold" style={{ color: grade.color }}>Nv. {level}</span>
              <span className="text-xs text-slate-500">{playerXp.toLocaleString()} XP · encore {needed.toLocaleString()} XP</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div className="h-2.5 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(1, progress) * 100}%`, background: `linear-gradient(90deg, ${grade.color}88, ${grade.color})` }} />
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-t border-slate-800">
          {(['stats', 'collection'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2.5 text-xs font-bold transition-colors"
              style={{
                color: tab === t ? grade.color : '#64748b',
                borderBottom: tab === t ? `2px solid ${grade.color}` : '2px solid transparent',
              }}>
              {t === 'stats' ? '📊 Stats' : `📚 Collection (${normalCount})`}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-slate-500 animate-pulse text-sm">Chargement…</div>
      ) : !state ? (
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">Profil indisponible</div>
      ) : tab === 'stats' ? (
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-8 flex flex-col gap-4">

          {/* Key stats grid */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: '⭐', label: 'Points', value: points.toLocaleString(), color: '#f59e0b' },
              { icon: '📚', label: 'Pokédex', value: `${normalCount} / 151`, color: '#3b82f6' },
              { icon: '✨', label: 'Shinies', value: shinyCount, color: '#fde047' },
              { icon: '🥊', label: 'ELO duel', value: duels.rankingPoints ?? 0, color: '#a78bfa' },
            ].map(s => (
              <div key={s.label} className="bg-slate-800/60 rounded-2xl p-3 border border-slate-700/40 flex items-center gap-3">
                <span className="text-2xl">{s.icon}</span>
                <div>
                  <div className="font-black text-base leading-none" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-slate-500 text-xs mt-0.5">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Duel record */}
          <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/40">
            <div className="text-slate-300 font-bold text-sm mb-3">⚔️ Duels</div>
            <div className="flex gap-4 items-center">
              <div className="flex-1 text-center">
                <div className="font-black text-2xl text-green-400">{duels.wins ?? 0}</div>
                <div className="text-slate-500 text-xs">Victoires</div>
              </div>
              <div className="flex-1 text-center">
                <div className="font-black text-2xl text-red-400">{duels.losses ?? 0}</div>
                <div className="text-slate-500 text-xs">Défaites</div>
              </div>
              {winRate !== null && (
                <div className="flex-1 text-center">
                  <div className="font-black text-2xl" style={{ color: winRate >= 50 ? '#22c55e' : '#f87171' }}>{winRate}%</div>
                  <div className="text-slate-500 text-xs">Win rate</div>
                </div>
              )}
            </div>
            {(duels.wins ?? 0) + (duels.losses ?? 0) > 0 && (
              <div className="mt-3 w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                <div className="h-2 rounded-full" style={{
                  width: `${winRate ?? 0}%`,
                  background: 'linear-gradient(90deg, #22c55e, #4ade80)',
                }} />
              </div>
            )}
          </div>

          {/* Showcase */}
          {showcase.length > 0 && (
            <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/40">
              <div className="text-slate-300 font-bold text-sm mb-3">✨ Vitrine</div>
              <div className="flex gap-4 flex-wrap">
                {showcase.map((s, i) => {
                  const p = POKEMON_BY_ID[s.pokemonId];
                  return p ? (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <img
                        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${s.isShiny ? 'shiny/' : ''}${s.pokemonId}.png`}
                        width={60} height={60}
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

          {/* Pokédex completion bar */}
          <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-300 font-bold text-sm">📖 Pokédex</span>
              <span className="text-blue-400 font-black text-sm">{normalCount} / 151</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden mb-1">
              <div className="h-2.5 rounded-full" style={{
                width: `${(normalCount / 151) * 100}%`,
                background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
              }} />
            </div>
            {shinyCount > 0 && (
              <div className="text-xs text-yellow-400 mt-1">✨ {shinyCount} shiny{shinyCount > 1 ? 's' : ''}</div>
            )}
          </div>

          {/* Last seen */}
          <div className="text-center py-1">
            {isOnline
              ? <span className="text-green-400 text-sm font-semibold">🟢 Actif maintenant</span>
              : effectiveLastSeen
                ? <span className="text-slate-500 text-sm">Dernière connexion : {formatLastSeen(effectiveLastSeen)}</span>
                : null}
          </div>

          {/* 3v3 challenge */}
          {onBattle3v3 && !loading && state && ownedIds.length >= 1 && (
            <button
              onClick={() => {
                const RARITY_RANK: Record<string, number> = { commun: 0, peu_commun: 1, rare: 2, elite: 3, legendaire: 4 };
                const pokemonLevels = (state?.pokemonLevels as Record<number, { level: number }>) ?? {};
                const top3 = ownedIds.slice(0, 9)
                  .sort((a, b) => {
                    const la = pokemonLevels[a]?.level ?? 1;
                    const lb = pokemonLevels[b]?.level ?? 1;
                    if (lb !== la) return lb - la;
                    const ra = RARITY_RANK[POKEMON_BY_ID[a]?.rarity ?? 'commun'] ?? 0;
                    const rb = RARITY_RANK[POKEMON_BY_ID[b]?.rarity ?? 'commun'] ?? 0;
                    return rb - ra;
                  })
                  .slice(0, 3)
                  .map(id => ({
                    pokemonId: id,
                    level: pokemonLevels[id]?.level ?? 1,
                    isShiny: (shiny[id] ?? 0) > 0,
                  }));
                onBattle3v3(top3, username);
              }}
              className="w-full py-3 rounded-2xl font-black text-base"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: 'white', boxShadow: '0 0 16px #a855f744' }}
            >
              ⚔️ Défier en 3v3
            </button>
          )}
        </div>
      ) : (
        /* ── COLLECTION TAB ── */
        <div className="flex-1 overflow-y-auto px-3 py-3 pb-8">
          {ownedIds.length === 0 ? (
            <div className="text-center text-slate-500 py-16 text-sm">Aucun Pokémon capturé</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {ownedIds.map(id => {
                const p = POKEMON_BY_ID[id];
                const isS = (shiny[id] ?? 0) > 0;
                const count = normal[id] ?? 0;
                const rarityColor = p ? RARITY_COLORS[p.rarity] : '#888';
                return p ? (
                  <div key={id} className="flex flex-col items-center gap-0.5 rounded-xl p-1.5 border"
                    style={{ borderColor: `${rarityColor}44`, background: `${rarityColor}08`, minWidth: 56 }}>
                    <img
                      src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${isS ? 'shiny/' : ''}${id}.png`}
                      width={48} height={48}
                      style={{ imageRendering: 'pixelated', filter: `drop-shadow(0 0 4px ${rarityColor})` }}
                      alt={p.name}
                    />
                    <span className="text-slate-300 font-bold" style={{ fontSize: '0.58rem' }}>{p.name}</span>
                    {isS && <span className="text-yellow-400" style={{ fontSize: '0.55rem' }}>✨</span>}
                    {count > 1 && <span className="text-slate-500" style={{ fontSize: '0.55rem' }}>×{count}</span>}
                  </div>
                ) : null;
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
