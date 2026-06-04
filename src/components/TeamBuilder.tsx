import { useState, useEffect } from 'react';
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

const DIFFICULTIES: Difficulty[] = [
  { id: 'facile',    label: 'Facile',    emoji: '🟢', enemyLevel: 10,  color: '#22c55e', xpMultiplier: 1,   description: 'Niv. ~10' },
  { id: 'normal',    label: 'Normal',    emoji: '🔵', enemyLevel: 25,  color: '#3b82f6', xpMultiplier: 2,   description: 'Niv. ~25' },
  { id: 'difficile', label: 'Difficile', emoji: '🟡', enemyLevel: 45,  color: '#f59e0b', xpMultiplier: 3.5, description: 'Niv. ~45' },
  { id: 'champion',  label: 'Champion',  emoji: '🟠', enemyLevel: 65,  color: '#f97316', xpMultiplier: 5,   description: 'Niv. ~65' },
  { id: 'maitre',    label: 'Maître',    emoji: '🔴', enemyLevel: 85,  color: '#ef4444', xpMultiplier: 8,   description: 'Niv. ~85' },
];

// Generate an enemy team for a given difficulty
function buildEnemyTeam(difficulty: Difficulty): TeamMember[] {
  const pool = GEN1_POKEMON.filter(p => p.rarity === 'commun' || p.rarity === 'peu_commun');
  const picked: number[] = [];
  while (picked.length < 3) {
    const p = pool[Math.floor(Math.random() * pool.length)];
    if (!picked.includes(p.id)) picked.push(p.id);
  }
  const spread = 10;
  return picked.map(id => {
    const level = Math.max(1, difficulty.enemyLevel - spread + Math.floor(Math.random() * spread * 2));
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
  getPokemonLevel?: (id: number) => { level: number; xp: number };
  onConfirm?: (team: TeamMember[]) => void;
  onAddXp?: (pokemonId: number, xp: number) => void;
  onClose: () => void;
  title?: string;
}

export function TeamBuilder({ state, onConfirm, onAddXp, onClose, title = 'Mon équipe' }: Props) {
  const [selected, setSelected] = useState<number[]>([]);
  const [sort, setSort] = useState<'level' | 'rarity'>('level');
  const [mode, setMode] = useState<'team' | 'difficulty' | 'battle' | 'result'>('team');
  const [chosenDifficulty, setChosenDifficulty] = useState<Difficulty | null>(null);
  const [enemyTeam, setEnemyTeam] = useState<TeamMember[]>([]);
  const [battleResult, setBattleResult] = useState<{ won: boolean; xpGains: Record<number, number> } | null>(null);
  const [levelUps, setLevelUps] = useState<LevelUpNotif[]>([]);
  const [savedTeam, setSavedTeam] = useState(false);

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
      return { pokemonId: id, level: lvData.level, xp: lvData.xp, currentHp: maxHp, maxHp };
    });
    onConfirm?.(team);
    setSavedTeam(true);
    setTimeout(() => setSavedTeam(false), 1500);
  };

  const startBattle = (diff: Difficulty) => {
    if (selected.length === 0) return;
    setChosenDifficulty(diff);
    setEnemyTeam(buildEnemyTeam(diff));
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
    setMode('result');
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
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col pb-[72px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 shrink-0">
        <div>
          <h2 className="text-white font-black text-xl">⚔️ {title}</h2>
          <p className="text-slate-400 text-sm">{selected.length}/3 Pokémon sélectionnés</p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl px-2">✕</button>
      </div>

      {/* Level-up notifications */}
      {levelUps.length > 0 && (
        <div className="absolute inset-x-0 top-16 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none">
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
            <button
              onClick={() => { setMode('team'); setBattleResult(null); }}
              className="w-full py-3 rounded-2xl font-black text-black"
              style={{ background: 'linear-gradient(90deg, #22c55e, #16a34a)' }}
            >
              Continuer
            </button>
          </div>
        </div>
      )}

      {/* Difficulty picker */}
      {mode === 'difficulty' && (
        <div className="absolute inset-0 z-40 bg-black/80 flex items-end justify-center p-4 pb-[80px]">
          <div className="bg-slate-900 rounded-2xl w-full max-w-sm border border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
              <h3 className="text-white font-black">Choix de la difficulté</h3>
              <button onClick={() => setMode('team')} className="text-slate-400 hover:text-white text-xl px-1">✕</button>
            </div>
            <div className="flex flex-col gap-1 p-3">
              {DIFFICULTIES.map(diff => (
                <button
                  key={diff.id}
                  onClick={() => startBattle(diff)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 transition-colors text-left"
                >
                  <span className="text-2xl">{diff.emoji}</span>
                  <div className="flex-1">
                    <div className="font-black text-white">{diff.label}</div>
                    <div className="text-xs text-slate-400">{diff.description} — ×{diff.xpMultiplier} XP</div>
                  </div>
                  <div className="text-xs font-bold px-2 py-1 rounded-full" style={{ color: diff.color, background: diff.color + '22' }}>
                    Combattre
                  </div>
                </button>
              ))}
            </div>
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
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {sorted.map(p => {
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

        <div className="flex gap-2">
          {/* Save team */}
          <button
            onClick={handleSave}
            disabled={selected.length === 0}
            className="flex-1 py-3 rounded-2xl font-black text-sm text-black disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style={{ background: selected.length > 0 && !savedTeam ? 'linear-gradient(90deg, #22c55e, #16a34a)' : savedTeam ? '#fbbf24' : '#374151' }}
          >
            {savedTeam ? '✅ Enregistré !' : '💾 Enregistrer'}
          </button>

          {/* Trainer battle */}
          <button
            onClick={() => { if (selected.length === 0) return; if (onConfirm) { handleSave(); } else { setMode('difficulty'); } }}
            disabled={selected.length === 0}
            className="flex-1 py-3 rounded-2xl font-black text-sm text-black disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: selected.length > 0 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : '#374151' }}
          >
            ⚔️ Combattre
          </button>
        </div>
      </div>
    </div>
  );
}
