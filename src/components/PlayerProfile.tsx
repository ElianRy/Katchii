import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { POKEMON_BY_ID } from '../data/gen1';
import { RARITY_COLORS } from '../types';
import { playerLevelFromXp, xpToNextLevel, getPlayerGrade } from '../lib/playerLevel';
import { ShinySprite } from './ShinySprite';
import type { TeamMember } from './TeamBuilder';
import TcgCard from './TcgCard';
import { CARDS_BY_ID, TCG_RARITY_COLOR } from '../data/tcgData';

interface Props {
  userId: string;
  username: string;
  isOnline?: boolean;
  lastSeen?: string;
  onClose: () => void;
  onBattle3v3?: (enemyPokemon: Array<{ pokemonId: number; level: number; isShiny?: boolean }>, enemyName: string) => void;
  onPvpChallenge?: (userId: string, username: string, opponentTeam: TeamMember[]) => void;
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

export function PlayerProfile({ userId, username, isOnline, lastSeen, onClose, onBattle3v3: _onBattle3v3, onPvpChallenge }: Props) {
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

  const tcgFavoriteCard = state?.tcgFavoriteCard as string | undefined;

  const normalCount = Object.values(normal).filter(v => v > 0).length;
  const shinyCount  = Object.values(shiny).filter(v  => v > 0).length;

  const grade   = getPlayerGrade(playerXp);
  const { progress, needed } = xpToNextLevel(playerXp);
  const level   = playerLevelFromXp(playerXp);

  // Team to display: partyTeam from PC (active equipped party)
  const partyTeam = (state?.partyTeam as number[] | undefined) ?? [];
  const pokemonLevels = (state?.pokemonLevels as Record<number, { level: number }>) ?? {};

  // Sorted owned pokemon ids (rarity desc then id)
  const ownedIds = Object.entries(normal)
    .filter(([, c]) => c > 0)
    .map(([id]) => Number(id))
    .sort((a, b) => {
      const ra = RARITY_ORDER[POKEMON_BY_ID[a]?.rarity ?? 'commun'] ?? 0;
      const rb = RARITY_ORDER[POKEMON_BY_ID[b]?.rarity ?? 'commun'] ?? 0;
      return rb !== ra ? rb - ra : b - a;
    });

  const teamToShow: Array<{ pokemonId: number; isShiny: boolean; level: number }> = partyTeam.length > 0
    ? partyTeam.filter(id => (normal[id] ?? 0) > 0).map(id => ({ pokemonId: id, isShiny: (shiny[id] ?? 0) > 0, level: pokemonLevels[id]?.level ?? 1 }))
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
  const [profileFilter, setProfileFilter] = useState<'all' | 'manquants' | 'shinies'>('all');
  // All 151 gen1 IDs
  const ALL_151 = Array.from({ length: 151 }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-slate-950" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="shrink-0 px-4 pb-3 border-b border-slate-700 flex items-center gap-3" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}>
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

          {/* ── PvP challenge button ── */}
          {onPvpChallenge && teamToShow.length >= 1 && (
            <button
              onClick={() => onPvpChallenge(userId, username, teamToShow as TeamMember[])}
              className="w-full py-2 rounded-xl font-black text-sm"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: 'white', boxShadow: '0 0 12px #a855f733' }}
            >
              ⚔️ Défier en PvP
            </button>
          )}

          {/* ── Carte favorite ── */}
          {tcgFavoriteCard && CARDS_BY_ID[tcgFavoriteCard] && (
            <div className="flex flex-col items-center gap-2">
              <span style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.1em' }}>
                🎴 CARTE FAVORITE
              </span>
              <div style={{ filter: `drop-shadow(0 0 12px ${TCG_RARITY_COLOR[CARDS_BY_ID[tcgFavoriteCard].tcgRarity]}88)` }}>
                <TcgCard card={CARDS_BY_ID[tcgFavoriteCard]} size="md" />
              </div>
            </div>
          )}

          {/* ── Pokédex ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-300 font-bold text-sm">📚 Pokédex ({normalCount}/151)</span>
              {shinyCount > 0 && <span className="text-yellow-400 text-xs">{shinyCount} ✨</span>}
            </div>
            {/* Filter buttons */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {([['all', 'Tous'], ['manquants', 'Manquants'], ['shinies', 'Shinies']] as const).map(([f, label]) => (
                <button
                  key={f}
                  onClick={() => setProfileFilter(f)}
                  style={{
                    padding: '4px 10px', borderRadius: 99, fontSize: '0.65rem', fontWeight: 700,
                    fontFamily: 'monospace', cursor: 'pointer', border: 'none',
                    background: profileFilter === f ? '#3b82f6' : 'rgba(255,255,255,0.08)',
                    color: profileFilter === f ? 'white' : '#94a3b8',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {(() => {
              // Compute display list based on filter
              let displayIds: number[];
              if (profileFilter === 'shinies') {
                displayIds = ALL_151.filter(id => (shiny[id] ?? 0) > 0);
              } else if (profileFilter === 'manquants') {
                const missingCount = ALL_151.filter(id => (normal[id] ?? 0) === 0).length;
                if (missingCount === 0) {
                  return <div className="text-slate-500 text-sm text-center py-6">🎉 Aucun Pokémon manquant !</div>;
                }
                displayIds = ALL_151; // show all 151, grayed if not owned
              } else {
                displayIds = ownedIds; // already sorted by rarity desc
              }
              if (displayIds.length === 0) {
                return <div className="text-slate-600 text-sm text-center py-4">Aucun Pokémon</div>;
              }
              return (
                <div style={{
                  background: '#c8dce8',
                  backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,40,0.04) 0px, rgba(0,0,40,0.04) 1px, transparent 1px, transparent 3px)',
                  borderRadius: 12,
                  padding: 8,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: 4,
                  maxHeight: 240,
                  overflowY: 'auto',
                }}>
                  {displayIds.map(id => {
                    const p = POKEMON_BY_ID[id];
                    const isS = (shiny[id] ?? 0) > 0;
                    const isOwned = (normal[id] ?? 0) > 0;
                    const rarityColor = p ? RARITY_COLORS[p.rarity] : '#888';
                    if (!p) return null;
                    const isGreyed = profileFilter === 'manquants' && !isOwned;
                    return (
                      <div key={id} style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                        padding: '4px 2px', borderRadius: 6,
                        background: isGreyed ? 'rgba(180,200,220,0.3)' : 'rgba(255,255,255,0.5)',
                        borderTop: `2px solid ${isGreyed ? 'rgba(100,150,200,0.15)' : rarityColor}`,
                        border: '1px solid rgba(100,150,200,0.3)',
                        opacity: isGreyed ? 0.45 : 1,
                      }}>
                        <ShinySprite pokemonId={id} isShiny={isS && !isGreyed} width={36} height={36}
                          style={{ filter: isGreyed ? 'brightness(0) opacity(0.3)' : `drop-shadow(0 0 3px ${rarityColor})` }} />
                        <span style={{ fontSize: '0.45rem', color: isGreyed ? '#6a8aaa' : '#1a2a3a', fontFamily: 'monospace', textAlign: 'center', lineHeight: 1.2 }}>{isGreyed ? '???' : p.name}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
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
