import { useState, useEffect } from 'react';
import { TutorialOverlay, isTutorialDone } from './TutorialOverlay';
import { TEAM_TUTORIAL } from './TutorialContent';
import { GameState, RARITY_COLORS } from '../types';
import { GEN1_POKEMON, POKEMON_BY_ID } from '../data/gen1';
import { POKEMON_TYPE, TYPE_COLORS } from '../data/pokemonTypes';
import { calcMaxHp, calcAttack, xpToNextLevel } from '../data/combatEngine';
import { BattleScreen } from './BattleScreen';
import { ShinySprite } from './ShinySprite';

export interface TeamMember {
  pokemonId: number;
  isShiny?: boolean;
  level: number;
  xp: number;
  currentHp: number;
  maxHp: number;
}

interface Difficulty {
  id: string;
  label: string;
  emoji: string;
  enemyLevel: number;
  color: string;
  xpMultiplier: number;
  description: string;
}



const ZONE_LEVEL_RANGE: Record<string, [number, number]> = {
  zone1: [5, 20], zone2: [15, 35], zone3: [25, 50],
  zone4: [35, 65], zone5: [50, 75], zone6: [60, 85],
  zone7: [70, 95], zone8: [80, 100], ligue: [85, 100], zone_libre: [85, 100],
};

function buildEnemyTeam(zoneId: string): TeamMember[] {
  const [minLv, maxLv] = ZONE_LEVEL_RANGE[zoneId] ?? [10, 30];
  const rarities: string[] = maxLv <= 25 ? ['commun', 'commun', 'peu_commun']
    : maxLv <= 40 ? ['commun', 'peu_commun', 'peu_commun']
    : maxLv <= 55 ? ['peu_commun', 'peu_commun', 'rare']
    : maxLv <= 70 ? ['peu_commun', 'rare', 'rare']
    : ['rare', 'elite', 'elite'];
  const picked: number[] = [];
  for (const rarity of rarities) {
    const pool = GEN1_POKEMON.filter(p => p.rarity === rarity && !picked.includes(p.id));
    if (pool.length > 0) picked.push(pool[Math.floor(Math.random() * pool.length)].id);
  }
  while (picked.length < 3) {
    const p = GEN1_POKEMON[Math.floor(Math.random() * GEN1_POKEMON.length)];
    if (!picked.includes(p.id)) picked.push(p.id);
  }
  return picked.map(id => {
    const level = minLv + Math.floor(Math.random() * (maxLv - minLv + 1));
    const maxHp = calcMaxHp(id, level);
    return { pokemonId: id, level, xp: 0, currentHp: maxHp, maxHp };
  });
}

interface LevelUpNotif {
  pokemonId: number;
  newLevel: number;
}

interface Props {
  state: GameState;
  currentZoneId?: string;
  getPokemonLevel?: (id: number) => { level: number; xp: number };
  onConfirm?: (team: TeamMember[]) => void;
  onAddXp?: (pokemonId: number, xp: number) => void;
  onBattleWin?: (pokemonIds: number[]) => void;
  onTrainingBattle?: () => void;
  onClose: () => void;
  title?: string;
  savedTeams?: Array<{ id: string; name: string; members: TeamMember[] }>;
  favoriteTeamId?: string;
  onSaveTeam?: (name: string, members: TeamMember[]) => void;
  onDeleteTeam?: (id: string) => void;
  onSetFavoriteTeamId?: (id: string | undefined) => void;
  onMarkTutorialDone?: () => void;
}

export function TeamBuilder({ state, currentZoneId, onConfirm, onAddXp, onBattleWin, onTrainingBattle, onClose, title = 'Mon équipe', savedTeams, favoriteTeamId, onSaveTeam, onDeleteTeam, onSetFavoriteTeamId, onMarkTutorialDone }: Props) {
  const [showTutorial, setShowTutorial] = useState(() =>
    !state.completedTutorials?.includes('team') && !isTutorialDone('team')
  );
  const [selected, setSelected] = useState<number[]>([]);
  const [sort, setSort] = useState<'level' | 'rarity'>('level');
  const [mode, setMode] = useState<'team' | 'battle' | 'result' | 'savedTeams'>('team');
  const [chosenDifficulty, setChosenDifficulty] = useState<Difficulty | null>(null);
  const [enemyTeam, setEnemyTeam] = useState<TeamMember[]>([]);
  const [battleResult, setBattleResult] = useState<{ won: boolean; xpGains: Record<number, number> } | null>(null);
  const [autoCombat, setAutoCombat] = useState(false);
  const [battleSpeed, setBattleSpeed] = useState(0);
  const [levelUps, setLevelUps] = useState<LevelUpNotif[]>([]);
  const [showNameInput, setShowNameInput] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewTeam, setViewTeam] = useState<{ id: string; name: string; members: TeamMember[] } | null>(null);

  const owned = GEN1_POKEMON.filter(p =>
    (state.normalCollection[p.id] ?? 0) > 0 || (state.shinyCollection[p.id] ?? 0) > 0
  );

  const sorted = [...owned].sort((a, b) => {
    if (sort === 'level') {
      const la = state.pokemonLevels?.[a.id]?.level ?? 1;
      const lb = state.pokemonLevels?.[b.id]?.level ?? 1;
      return lb - la || a.id - b.id;
    }
    const order = ['legendaire', 'elite', 'rare', 'peu_commun', 'commun'];
    return order.indexOf(a.rarity) - order.indexOf(b.rarity) || a.id - b.id;
  });

  const toggle = (id: number) => {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const handleSave = () => {
    if (selected.length === 0) return;
    const team: TeamMember[] = selected.map(id => {
      const lvData = state.pokemonLevels?.[id] ?? { level: 1, xp: 0 };
      const maxHp = calcMaxHp(id, lvData.level);
      const isShiny = (state.shinyCollection[id] ?? 0) > 0;
      return { pokemonId: id, isShiny, level: lvData.level, xp: lvData.xp, currentHp: maxHp, maxHp };
    });
    onConfirm?.(team);
  };

  const startBattle = () => {
    if (selected.length === 0) return;
    const zoneId = currentZoneId ?? 'zone1';
    const ZONE_XP_MULT: Record<string, number> = {
      zone1: 1, zone2: 1.5, zone3: 2, zone4: 2.5, zone5: 3, zone6: 3.5, zone7: 4, zone8: 5, ligue: 6, zone_libre: 5
    };
    const mult = ZONE_XP_MULT[zoneId] ?? 1;
    const pseudoDiff: Difficulty = { id: zoneId, label: zoneId, emoji: '⚔️', enemyLevel: 0, color: '#f59e0b', xpMultiplier: mult, description: '' };
    setChosenDifficulty(pseudoDiff);
    setEnemyTeam(buildEnemyTeam(zoneId));
    setMode('battle');
  };

  const handleBattleEnd = (won: boolean, xpGains: Record<number, number>) => {
    setBattleResult({ won, xpGains });

    // Compute level-ups
    const ups: LevelUpNotif[] = [];
    Object.entries(xpGains).forEach(([idStr, xp]) => {
      const id = Number(idStr);
      const current = state.pokemonLevels?.[id] ?? { level: 1, xp: 0 };
      let level = current.level;
      let xpAcc = current.xp + Math.floor(xp * (chosenDifficulty?.xpMultiplier ?? 1));
      const newLevel = (() => {
        let l = level;
        while (l < 100 && xpAcc >= xpToNextLevel(l)) { xpAcc -= xpToNextLevel(l); l++; }
        return l;
      })();
      if (newLevel > level) ups.push({ pokemonId: id, newLevel });
      if (onAddXp) onAddXp(id, Math.floor(xp * (chosenDifficulty?.xpMultiplier ?? 1)));
    });
    setLevelUps(ups);
    if (won) onBattleWin?.(selected);
    onTrainingBattle?.();
    if (autoCombat) {
      setBattleResult({ won, xpGains });
      setMode('result');
      setTimeout(() => {
        setBattleResult(null);
        startBattle();
      }, 2000);
    } else {
      setBattleResult({ won, xpGains });
      setMode('result');
    }
  };

  // Dismiss level-up notifs after a few seconds
  useEffect(() => {
    if (levelUps.length === 0) return;
    const t = setTimeout(() => setLevelUps([]), 4000);
    return () => clearTimeout(t);
  }, [levelUps]);

  if (mode === 'battle' && chosenDifficulty) {
    const playerTeam: TeamMember[] = selected.map(id => {
      const lvData = state.pokemonLevels?.[id] ?? { level: 1, xp: 0 };
      const maxHp = calcMaxHp(id, lvData.level);
      const isShiny = (state.shinyCollection[id] ?? 0) > 0;
      return { pokemonId: id, isShiny, level: lvData.level, xp: lvData.xp, currentHp: maxHp, maxHp };
    });
    return (
      <BattleScreen
        playerTeam={playerTeam}
        enemyTeam={enemyTeam}
        bossName={`Dresseur ${chosenDifficulty.label}`}
        onBattleEnd={handleBattleEnd}
        autoCombat={autoCombat}
        suppressVictorySound={autoCombat}
        onAutoCombatChange={setAutoCombat}
        speedLevel={battleSpeed}
        onSpeedLevelChange={setBattleSpeed}
        onQuit={() => { setMode('team'); setBattleResult(null); }}
      />
    );
  }

  // Saved teams detail view
  if (mode === 'savedTeams') {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col" style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }}>
        <div className="flex items-center gap-3 px-4 pb-3 border-b border-slate-700 shrink-0" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}>
          <button onClick={() => { setViewTeam(null); setMode('team'); }} className="text-slate-400 hover:text-white text-xl px-1">←</button>
          <h2 className="text-white font-black text-xl flex-1">📋 Équipes sauvegardées</h2>
        </div>
        {!viewTeam ? (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {(!savedTeams || savedTeams.length === 0) && (
              <div className="text-center text-slate-500 py-16">
                <div className="text-4xl mb-2">📋</div>
                <p>Aucune équipe sauvegardée</p>
              </div>
            )}
            {savedTeams?.map(t => {
              const isFav = favoriteTeamId === t.id;
              return (
              <div key={t.id} className="bg-slate-800 rounded-2xl p-4 border"
                style={{ borderColor: isFav ? '#fbbf2466' : 'rgb(51,65,85)', boxShadow: isFav ? '0 0 12px #fbbf2422' : undefined }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {isFav && <span className="text-yellow-400 text-base" title="Équipe favorite">⭐</span>}
                    <span className="text-white font-black text-base">{t.name}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onSetFavoriteTeamId?.(isFav ? undefined : t.id)}
                      className="text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-all"
                      style={{
                        background: isFav ? '#92400e' : 'transparent',
                        borderColor: isFav ? '#fbbf24' : 'rgb(100,116,139)',
                        color: isFav ? '#fbbf24' : '#94a3b8',
                      }}
                      title={isFav ? 'Retirer des favoris' : 'Définir comme équipe favorite pour les 3v3'}
                    >{isFav ? '★ Favori' : '☆ Favoris'}</button>
                    <button
                      onClick={() => { setSelected(t.members.map(m => m.pokemonId).slice(0, 3)); setMode('team'); }}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-700 text-white"
                    >Charger</button>
                    <button
                      onClick={() => onDeleteTeam?.(t.id)}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-700/80 text-white"
                    >🗑</button>
                  </div>
                </div>
                <button className="w-full" onClick={() => setViewTeam(t)}>
                  <div className="flex gap-3 justify-center">
                    {t.members.slice(0, 3).map(m => {
                      const p = POKEMON_BY_ID[m.pokemonId];
                      const color = p ? RARITY_COLORS[p.rarity] : '#6b7280';
                      const types = POKEMON_TYPE[m.pokemonId] ?? ['normal'];
                      return (
                        <div key={m.pokemonId} className="flex flex-col items-center gap-1 bg-slate-700/60 rounded-xl p-2 flex-1">
                          <ShinySprite pokemonId={m.pokemonId} isShiny={m.isShiny ?? false} width={48} height={48} compact />
                          <span className="text-white font-bold text-center" style={{ fontSize: '0.6rem' }}>{p?.name ?? '???'}</span>
                          <span className="font-black text-xs" style={{ color }}>Nv.{m.level}</span>
                          <div className="flex gap-0.5 flex-wrap justify-center">
                            {types.map(ty => (
                              <span key={ty} className="text-white font-bold rounded px-1" style={{ background: TYPE_COLORS[ty] ?? '#888', fontSize: '0.42rem' }}>
                                {ty.toUpperCase().slice(0, 4)}
                              </span>
                            ))}
                          </div>
                          <div className="flex gap-1 text-slate-400" style={{ fontSize: '0.5rem' }}>
                            <span>❤️{calcMaxHp(m.pokemonId, m.level)}</span>
                            <span>⚔️{calcAttack(m.pokemonId, m.level)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-slate-500 text-xs mt-2 text-center">Appuyer pour voir les stats détaillées →</div>
                </button>
              </div>
            );})}

          </div>
        ) : (
          // Detail view for a single saved team
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            <button onClick={() => setViewTeam(null)} className="text-slate-400 text-sm flex items-center gap-1">← Retour aux équipes</button>
            <h3 className="text-yellow-400 font-black text-xl text-center">{viewTeam.name}</h3>
            {viewTeam.members.slice(0, 3).map(m => {
              const p = POKEMON_BY_ID[m.pokemonId];
              const color = p ? RARITY_COLORS[p.rarity] : '#6b7280';
              const types = POKEMON_TYPE[m.pokemonId] ?? ['normal'];
              const xpPct = m.level >= 100 ? 100 : Math.min(100, Math.floor(m.xp / xpToNextLevel(m.level) * 100));
              const hp = calcMaxHp(m.pokemonId, m.level);
              const atk = calcAttack(m.pokemonId, m.level);
              return (
                <div key={m.pokemonId} className="bg-slate-800 rounded-2xl p-4 border border-slate-700 flex gap-4 items-start">
                  <ShinySprite pokemonId={m.pokemonId} isShiny={m.isShiny ?? false} width={72} height={72} />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-black text-lg">{p?.name ?? '???'}</span>
                      {m.isShiny && <span style={{ filter: 'drop-shadow(0 0 3px #fde047)', fontSize: 14 }}>✨</span>}
                    </div>
                    <div className="flex gap-1">
                      {types.map(ty => (
                        <span key={ty} className="text-white font-bold rounded px-1.5 py-0.5 text-xs" style={{ background: TYPE_COLORS[ty] ?? '#888' }}>
                          {ty.toUpperCase()}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm" style={{ color }}>Niveau {m.level}</span>
                    </div>
                    {/* XP bar */}
                    <div>
                      <div className="flex justify-between text-xs text-slate-400 mb-0.5">
                        <span>XP</span>
                        <span>{m.level >= 100 ? 'MAX' : `${m.xp} / ${xpToNextLevel(m.level)}`}</span>
                      </div>
                      <div className="w-full bg-slate-700/60 rounded-full overflow-hidden" style={{ height: 6 }}>
                        <div className="h-full rounded-full" style={{
                          width: `${xpPct}%`,
                          background: m.level >= 100 ? '#fbbf24' : 'linear-gradient(90deg, #60a5fa, #a78bfa)',
                        }} />
                      </div>
                    </div>
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <div className="bg-slate-700/50 rounded-xl p-2 text-center">
                        <div className="text-red-400 text-xs font-bold">❤️ PV</div>
                        <div className="text-white font-black">{hp}</div>
                      </div>
                      <div className="bg-slate-700/50 rounded-xl p-2 text-center">
                        <div className="text-orange-400 text-xs font-bold">⚔️ Attaque</div>
                        <div className="text-white font-black">{atk}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col" style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pb-3 border-b border-slate-700 shrink-0" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl px-1">←</button>
        <div>
          <h2 className="text-white font-black text-xl">⚔️ {title}</h2>
          <p className="text-slate-400 text-sm">{selected.length}/3 Pokémon sélectionnés</p>
        </div>
      </div>

      {/* Level-up notifications */}
      {levelUps.length > 0 && (
        <div className="absolute top-20 z-50 flex flex-col items-center gap-2 pointer-events-none" style={{ left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>
          {levelUps.map((lu, i) => {
            const p = POKEMON_BY_ID[lu.pokemonId];
            return (
              <div
                key={i}
                className="bg-yellow-400 text-black font-black px-4 py-2 rounded-2xl text-sm shadow-lg"
                style={{ animation: 'appear 0.4s ease-out, float-up 3.5s 0.5s ease-out forwards' }}
              >
                🎉 {p?.name ?? '???'} monte au niveau {lu.newLevel} !
              </div>
            );
          })}
        </div>
      )}

      {/* Result panel */}
      {mode === 'result' && battleResult && (
        <div className="absolute inset-0 z-40 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-sm border border-slate-700 flex flex-col gap-4">
            <div className="text-center">
              <div className="text-5xl mb-2">{battleResult.won ? '🏆' : '💀'}</div>
              <h3 className={`font-black text-2xl ${battleResult.won ? 'text-green-400' : 'text-red-400'}`}>
                {battleResult.won ? 'Victoire !' : 'Défaite…'}
              </h3>
            </div>
            <div className="flex flex-col gap-2">
              {Object.entries(battleResult.xpGains).map(([idStr, rawXp]) => {
                const id = Number(idStr);
                const xp = Math.floor(rawXp * (chosenDifficulty?.xpMultiplier ?? 1));
                const p = POKEMON_BY_ID[id];
                return (
                  <div key={id} className="flex items-center gap-2 bg-slate-800 rounded-xl px-3 py-2">
                    <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`} width={32} height={32} style={{ imageRendering: 'pixelated' }} />
                    <span className="text-white text-sm flex-1">{p?.name ?? '???'}</span>
                    <span className="text-yellow-400 font-black text-sm">+{xp} XP</span>
                  </div>
                );
              })}
            </div>
            {autoCombat ? (
              <div className="flex items-center justify-center gap-2 bg-indigo-900/40 rounded-xl px-3 py-2 border border-indigo-500/50 animate-pulse">
                <span className="text-indigo-300 text-sm">⚡</span>
                <span className="text-indigo-300 text-xs font-bold">Combat auto en cours…</span>
              </div>
            ) : (
              <button
                onClick={() => { setMode('team'); setBattleResult(null); }}
                className="w-full py-3 rounded-2xl font-black text-black"
                style={{ background: 'linear-gradient(90deg, #22c55e, #16a34a)' }}
              >
                Continuer
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sort tabs */}
      <div className="flex gap-2 px-4 py-2 border-b border-slate-700/50 shrink-0">
        {(['level', 'rarity'] as const).map(s => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
              sort === s ? 'bg-yellow-500 text-black' : 'bg-slate-700 text-slate-300'
            }`}
          >
            {s === 'level' ? '📊 Par niveau' : '⭐ Par rareté'}
          </button>
        ))}
      </div>

      {/* Pokemon grid */}
      <div className="flex-1 overflow-y-auto p-3">
        <input
          type="text"
          placeholder="Rechercher un Pokémon…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm placeholder-slate-500 outline-none focus:border-yellow-500 mb-2"
        />
        {(() => {
          const filtered = searchQuery.trim()
            ? sorted.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
            : sorted;
          return (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {filtered.map(p => {
            const lvData = state.pokemonLevels?.[p.id] ?? { level: 1, xp: 0 };
            const isShiny = (state.shinyCollection[p.id] ?? 0) > 0;
            const sel = selected.includes(p.id);
            const types = POKEMON_TYPE[p.id] ?? ['normal'];
            const color = RARITY_COLORS[p.rarity];
            const atk = calcAttack(p.id, lvData.level);
            const hp = calcMaxHp(p.id, lvData.level);
            const xpPct = lvData.level >= 100 ? 100 : Math.min(100, Math.floor(lvData.xp / xpToNextLevel(lvData.level) * 100));

            return (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                  sel
                    ? 'border-yellow-400 bg-yellow-900/30 scale-105'
                    : 'border-slate-600/30 bg-slate-800/40 hover:border-slate-500'
                }`}
              >
                {/* Sprite */}
                <div className="relative">
                  <ShinySprite
                    pokemonId={p.id} isShiny={isShiny} width={52} height={52}
                    compact
                    style={{ filter: sel ? `drop-shadow(0 0 6px ${color})` : 'none' }}
                  />
                  {sel && (
                    <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-black rounded-full w-4 h-4 flex items-center justify-center text-xs font-black z-10">
                      {selected.indexOf(p.id) + 1}
                    </div>
                  )}
                </div>

                {/* Name */}
                <span className="text-white font-bold text-center leading-tight" style={{ fontSize: '0.58rem' }}>
                  {p.name}
                </span>

                {/* Level */}
                <span className="font-black text-xs" style={{ color }}>
                  Nv.{lvData.level}
                </span>

                {/* XP bar */}
                <div className="w-full bg-slate-700/60 rounded-full overflow-hidden" style={{ height: 4 }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${xpPct}%`,
                      background: lvData.level >= 100 ? '#fbbf24' : 'linear-gradient(90deg, #60a5fa, #a78bfa)',
                    }}
                  />
                </div>
                <span style={{ fontSize: '0.42rem', color: '#64748b' }}>
                  {lvData.level >= 100 ? 'MAX' : `${lvData.xp}/${xpToNextLevel(lvData.level)} XP`}
                </span>

                {/* Type badges */}
                <div className="flex gap-0.5 flex-wrap justify-center">
                  {types.map(t => (
                    <span
                      key={t}
                      className="text-white font-bold rounded px-1"
                      style={{ background: TYPE_COLORS[t] ?? '#888', fontSize: '0.42rem' }}
                    >
                      {t.toUpperCase().slice(0, 4)}
                    </span>
                  ))}
                </div>

                {/* Stats */}
                <div className="flex gap-1 text-slate-400" style={{ fontSize: '0.48rem' }}>
                  <span>❤️{hp}</span>
                  <span>⚔️{atk}</span>
                </div>
              </button>
            );
          })}
        </div>
          );
        })()}

        {owned.length === 0 && (
          <div className="text-center text-slate-500 py-16">
            <div className="text-4xl mb-2">😢</div>
            <p>Aucun Pokémon capturé !</p>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="shrink-0 px-4 py-3 border-t border-slate-700 bg-slate-900/80">
        {/* Selected preview */}
        <div className="flex gap-2 mb-3 justify-center">
          {[0, 1, 2].map(i => {
            const id = selected[i];
            if (!id) return (
              <div key={i} className="w-14 h-14 rounded-xl border-2 border-dashed border-slate-600 flex items-center justify-center text-slate-600 text-xs">
                Vide
              </div>
            );
            const lvData = state.pokemonLevels?.[id] ?? { level: 1, xp: 0 };
            const isShinySlot = (state.shinyCollection[id] ?? 0) > 0;
            return (
              <div key={i} className="flex flex-col items-center">
                <ShinySprite pokemonId={id} isShiny={isShinySlot} width={52} height={52} />
                <span className="text-yellow-400 text-xs font-bold">Nv.{lvData.level}</span>
              </div>
            );
          })}
        </div>

        {/* Name input — shown when saving a named team */}
        {showNameInput && (
          <div className="flex gap-2 mb-2">
            <input
              className="flex-1 rounded-xl bg-slate-800 text-white px-3 py-2 text-sm border border-slate-600 outline-none"
              placeholder="Nom de l'équipe…"
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  if (!teamName.trim() || selected.length === 0) return;
                  const members: TeamMember[] = selected.map(id => {
                    const lvData = state.pokemonLevels?.[id] ?? { level: 1, xp: 0 };
                    const maxHp = calcMaxHp(id, lvData.level);
                    const isShiny = (state.shinyCollection[id] ?? 0) > 0;
                    return { pokemonId: id, isShiny, level: lvData.level, xp: lvData.xp, currentHp: maxHp, maxHp };
                  });
                  onSaveTeam?.(teamName.trim(), members);
                  setTeamName('');
                  setShowNameInput(false);
                }
              }}
              autoFocus
            />
            <button
              onClick={() => {
                if (!teamName.trim() || selected.length === 0) return;
                const members: TeamMember[] = selected.map(id => {
                  const lvData = state.pokemonLevels?.[id] ?? { level: 1, xp: 0 };
                  const maxHp = calcMaxHp(id, lvData.level);
                  const isShiny = (state.shinyCollection[id] ?? 0) > 0;
                  return { pokemonId: id, isShiny, level: lvData.level, xp: lvData.xp, currentHp: maxHp, maxHp };
                });
                onSaveTeam?.(teamName.trim(), members);
                setTeamName('');
                setShowNameInput(false);
              }}
              className="px-3 py-2 rounded-xl bg-green-600 text-white text-sm font-bold"
            >
              ✓
            </button>
            <button
              onClick={() => { setShowNameInput(false); setTeamName(''); }}
              className="px-3 py-2 rounded-xl bg-slate-700 text-white text-sm"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex gap-2">
          {/* Big Enregistrer button — opens name input (not shown when onConfirm is set) */}
          {onSaveTeam && !onConfirm && (
            <button
              onClick={() => { if (selected.length > 0) setShowNameInput(v => !v); }}
              disabled={selected.length === 0}
              className="flex-1 py-3 rounded-2xl font-black text-sm text-black disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: selected.length > 0 ? 'linear-gradient(90deg, #22c55e, #16a34a)' : '#374151' }}
            >
              💾 Enregistrer
            </button>
          )}

          {/* Voir équipes button */}
          {onSaveTeam && (
            <button
              onClick={() => setMode('savedTeams')}
              className="px-3 py-3 rounded-2xl font-black text-sm"
              style={{ background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', color: '#fff' }}
              title="Voir les équipes sauvegardées"
            >
              🥊
            </button>
          )}

          {/* Trainer battle */}
          <button
            onClick={() => {
              if (selected.length === 0) return;
              if (onConfirm) { handleSave(); return; }
              startBattle();
            }}
            disabled={selected.length === 0}
            className="flex-1 py-3 rounded-2xl font-black text-sm text-black disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: selected.length > 0 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : '#374151' }}
          >
            🥊 Entraînement
          </button>
        </div>
      </div>
      {showTutorial && (
        <TutorialOverlay tutorialKey="team" steps={TEAM_TUTORIAL} onDone={() => { setShowTutorial(false); onMarkTutorialDone?.(); }} bottomOffset={72} />
      )}
    </div>
  );
}
