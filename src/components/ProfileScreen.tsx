import { GameState, RARITY_COLORS } from '../types';
import { POKEMON_BY_ID } from '../data/gen1';
import { playerLevelFromXp, xpToNextLevel, getPlayerGrade } from '../lib/playerLevel';
import { ShinySprite } from './ShinySprite';

interface Props {
  username: string;
  state: GameState;
  onClose: () => void;
  onLogout: () => void;
}

function formatPlayTime(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  if (h === 0) return `${min}min`;
  return `${h}h ${min}min`;
}

const RARITY_ORDER: Record<string, number> = { commun: 0, peu_commun: 1, rare: 2, elite: 3, legendaire: 4 };

export function ProfileScreen({ username, state, onClose, onLogout }: Props) {

  const normal = state.normalCollection;
  const shiny  = state.shinyCollection;
  const points = state.points;
  const playerXp = state.playerXp ?? 0;
  const totalPlayTimeMs = state.stats?.totalPlayTimeMs ?? 0;

  const normalCount = Object.values(normal).filter(v => v > 0).length;
  const shinyCount  = Object.values(shiny).filter(v  => v > 0).length;

  const grade   = getPlayerGrade(playerXp);
  const { progress, needed } = xpToNextLevel(playerXp);
  const level   = playerLevelFromXp(playerXp);

  // Favorite team from savedTeams
  const savedTeams = state.savedTeams ?? [];
  const favoriteTeam = savedTeams.find(t => t.id === state.favoriteTeamId);

  // Sorted owned pokemon ids
  const ownedIds = Object.entries(normal)
    .filter(([, c]) => c > 0)
    .map(([id]) => Number(id))
    .sort((a, b) => {
      const ra = RARITY_ORDER[POKEMON_BY_ID[a]?.rarity ?? 'commun'] ?? 0;
      const rb = RARITY_ORDER[POKEMON_BY_ID[b]?.rarity ?? 'commun'] ?? 0;
      return rb !== ra ? rb - ra : b - a;
    });

  // Team to display: favorite or top 3
  const pokemonLevels = (state.pokemonLevels ?? {}) as Record<number, { level: number }>;
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
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="shrink-0 px-4 pb-3 border-b border-slate-700 flex items-center gap-3" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl px-1">←</button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-black text-lg truncate" style={{ color: isPokelian ? '#ef4444' : 'white' }}>
              {username}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Dresseur Katchii</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xl">{grade.icon}</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: `${grade.color}22`, color: grade.color, border: `1px solid ${grade.color}44` }}>
            {grade.grade}
          </span>
        </div>
      </div>

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

        {/* ── Pokédex ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-300 font-bold text-sm">📚 Pokédex ({normalCount}/151)</span>
            {shinyCount > 0 && <span className="text-yellow-400 text-xs">{shinyCount} ✨</span>}
          </div>
          {ownedIds.length === 0 ? (
            <div className="text-slate-600 text-sm text-center py-4">Aucun Pokémon capturé</div>
          ) : (
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
              {ownedIds.map(id => {
                const p = POKEMON_BY_ID[id];
                const isS = (shiny[id] ?? 0) > 0;
                const rarityColor = p ? RARITY_COLORS[p.rarity] : '#888';
                return p ? (
                  <div key={id} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                    padding: '4px 2px', borderRadius: 6,
                    background: 'rgba(255,255,255,0.5)',
                    borderTop: `2px solid ${rarityColor}`,
                    border: '1px solid rgba(100,150,200,0.3)',
                  }}>
                    <ShinySprite pokemonId={id} isShiny={isS} width={36} height={36}
                      style={{ filter: `drop-shadow(0 0 3px ${rarityColor})` }} />
                    <span style={{ fontSize: '0.45rem', color: '#1a2a3a', fontFamily: 'monospace', textAlign: 'center', lineHeight: 1.2 }}>{p.name}</span>
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

        {/* ── Logout ── */}
        <button
          onClick={onLogout}
          className="w-full py-3 rounded-2xl font-bold text-sm border border-red-500/30 text-red-400 hover:bg-red-900/20 transition-colors mt-2"
        >
          Se déconnecter
        </button>

      </div>
    </div>
  );
}
