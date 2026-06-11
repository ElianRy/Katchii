import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { POKEMON_BY_ID } from '../data/gen1';
import { RARITY_COLORS } from '../types';
import { playerLevelFromXp, xpToNextLevel, getPlayerGrade } from '../lib/playerLevel';
import { ShinySprite } from './ShinySprite';

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

function formatPlayTime(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  if (h === 0) return `${min}min`;
  return `${h}h ${min}min`;
}

const RARITY_ORDER: Record<string, number> = { commun: 0, peu_commun: 1, rare: 2, elite: 3, legendaire: 4 };

export function PlayerProfile({ userId, username, isOnline, lastSeen, onClose, onBattle3v3 }: Props) {
  const [state, setState] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [fallbackLastSeen, setFallbackLastSeen] = useState<string | undefined>(undefined);
  const effectiveLastSeen = lastSeen ?? fallbackLastSeen;

  useEffect(() => {
    supabase.from('game_saves').select('state, updated_at').eq('user_id', userId).single()
      .then(({ data }) => {
        setState(data?.state as Record<string, unknown> ?? null);
        if (!lastSeen && data?.updated_at) setFallbackLastSeen(data.updated_at as string);
        setLoading(false);
      });
  }, [userId]);

  const normal = (state?.normalCollection as Record<number, number>) ?? {};
  const shiny  = (state?.shinyCollection  as Record<number, number>) ?? {};
  const points = (state?.points as number) ?? 0;
  const playerXp = (state?.playerXp as number) ?? 0;
  const totalPlayTimeMs = ((state?.stats as Record<string, unknown>)?.totalPlayTimeMs as number) ?? 0;

  const normalCount = Object.values(normal).filter(v => v > 0).length;
  const shinyCount  = Object.values(shiny).filter(v  => v > 0).length;

  const grade   = getPlayerGrade(playerXp);
  const { progress, needed } = xpToNextLevel(playerXp);
  const level   = playerLevelFromXp(playerXp);

  // Favorite team from savedTeams
  const savedTeams = (state?.savedTeams as Array<{ id: string; name: string; members: Array<{ pokemonId: number; isShiny?: boolean; level: number }> }>) ?? [];
  const favoriteTeamId = state?.favoriteTeamId as string | undefined;
  const favoriteTeam = savedTeams.find(t => t.id === favoriteTeamId);

  // Sorted owned pokemon ids (rarity desc then id)
  const ownedIds = Object.entries(normal)
    .filter(([, c]) => c > 0)
    .map(([id]) => Number(id))
    .sort((a, b) => {
      const ra = RARITY_ORDER[POKEMON_BY_ID[a]?.rarity ?? 'commun'] ?? 0;
      const rb = RARITY_ORDER[POKEMON_BY_ID[b]?.rarity ?? 'commun'] ?? 0;
      return rb !== ra ? rb - ra : b - a;
    });

  // Team to display: favorite team or top 3 best pokemon
  const pokemonLevels = (state?.pokemonLevels as Record<number, { level: number }>) ?? {};
  const teamToShow: Array<{ pokemonId: number; isShiny: boolean; level: number }> = favoriteTeam
    ? favoriteTeam.members.slice(0, 3).map(m => ({ pokemonId: m.pokemonId, isShiny: m.isShiny ?? false, level: m.level }))
    : ownedIds.slice(0, 9)
        .sort((a, b) => {
          const la = pokemonLevels[a]?.level ?? 1;
          const lb = pokemonLevels[b]?.level ?? 1;
          if (lb !== la) return lb - la;
          const ra = RARITY_ORDER[POKEMON_BY_ID[a]?.rarity ?? 'commun'] ?? 0;
          const rb = RARITY_ORDER[POKEMON_BY_ID[b]?.rarity ?? 'commun'] ?? 0;
          return rb - ra;
        })
        .slice(0, 3)
        .map(id => ({ pokemonId: id, isShiny: (shiny[id] ?? 0) > 0, level: pokemonLevels[id]?.level ?? 1 }));

  const isPokelian = username.toLowerCase() === 'pokelian';

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-slate-950" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-slate-700 flex items-center gap-3">
        <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl px-1">←</button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-black text-lg truncate" style={{ color: isPokelian ? '#ef4444' : 'white' }}>
              {username}
            </span>
            {isOnline && <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />}
          </div>
          <p className="text-xs mt-0.5">
            {isOnline
              ? <span className="text-green-400 font-semibold">🟢 En ligne maintenant</span>
              : effectiveLastSeen
                ? <span className="text-slate-400">Connecté il y a {formatLastSeen(effectiveLastSeen)}</span>
                : <span className="text-slate-600">Jamais connecté</span>}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xl">{grade.icon}</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: `${grade.color}22`, color: grade.color, border: `1px solid ${grade.color}44` }}>
            {grade.grade}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-slate-500 animate-pulse text-sm">Chargement…</div>
      ) : !state ? (
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">Profil indisponible</div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-5 pb-10">

          {/* ── Favorite team (big sprites) ── */}
          <div className="flex justify-center gap-4">
            {teamToShow.length === 0 ? (
              <div className="text-slate-600 text-sm py-6">Aucun Pokémon capturé</div>
            ) : teamToShow.map((m, i) => {
              const p = POKEMON_BY_ID[m.pokemonId];
              if (!p) return null;
              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <ShinySprite pokemonId={m.pokemonId} isShiny={m.isShiny} width={88} height={88}
                    style={{ filter: `drop-shadow(0 0 8px ${RARITY_COLORS[p.rarity]})` }} />
                  <span className="text-white font-bold text-xs">{p.name}</span>
                  <span className="text-slate-400 text-xs">Nv.{m.level}</span>
                </div>
              );
            })}
          </div>

          {/* ── 3v3 challenge button ── */}
          {onBattle3v3 && teamToShow.length >= 1 && (
            <button
              onClick={() => {
                onBattle3v3(
                  teamToShow.map(m => ({ pokemonId: m.pokemonId, level: m.level, isShiny: m.isShiny })),
                  username
                );
              }}
              className="w-full py-3.5 rounded-2xl font-black text-base"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: 'white', boxShadow: '0 0 20px #a855f744' }}
            >
              ⚔️ Défier en 3v3
            </button>
          )}

          {/* ── Collection ── */}
          <div>
            <div className="text-slate-300 font-bold text-sm mb-3">📚 Collection ({normalCount}/151)</div>
            {ownedIds.length === 0 ? (
              <div className="text-slate-600 text-sm text-center py-4">Aucun Pokémon capturé</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {ownedIds.map(id => {
                  const p = POKEMON_BY_ID[id];
                  const isS = (shiny[id] ?? 0) > 0;
                  const count = normal[id] ?? 0;
                  const rarityColor = p ? RARITY_COLORS[p.rarity] : '#888';
                  return p ? (
                    <div key={id} className="flex flex-col items-center gap-0.5 rounded-xl p-1 border"
                      style={{ borderColor: `${rarityColor}44`, background: `${rarityColor}08`, minWidth: 54 }}>
                      <ShinySprite pokemonId={id} isShiny={isS} width={48} height={48}
                        style={{ filter: `drop-shadow(0 0 4px ${rarityColor})` }} />
                      <span className="text-slate-300 font-bold" style={{ fontSize: '0.55rem' }}>{p.name}</span>
                      {count > 1 && <span className="text-slate-500" style={{ fontSize: '0.5rem' }}>×{count}</span>}
                    </div>
                  ) : null;
                })}
              </div>
            )}
          </div>

          {/* ── Level ── */}
          <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/40">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm" style={{ color: grade.color }}>Nv. {level} — {grade.grade}</span>
              <span className="text-xs text-slate-500">{playerXp.toLocaleString()} XP</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden">
              <div className="h-2.5 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(1, progress) * 100}%`, background: `linear-gradient(90deg, ${grade.color}88, ${grade.color})` }} />
            </div>
            <div className="text-right text-xs text-slate-500 mt-1">encore {needed.toLocaleString()} XP pour le prochain niveau</div>
          </div>

          {/* ── Stats ── */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: '🪙', label: 'PokéCoins', value: points.toLocaleString(), color: '#f59e0b' },
              { icon: '📚', label: 'Pokédex', value: `${normalCount} / 151`, color: '#3b82f6' },
              { icon: '✨', label: 'Shinies', value: shinyCount, color: '#fde047' },
              { icon: '⏰', label: 'Temps de jeu', value: formatPlayTime(totalPlayTimeMs), color: '#4ade80' },
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

        </div>
      )}
    </div>
  );
}
