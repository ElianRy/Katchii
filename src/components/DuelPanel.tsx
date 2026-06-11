import { useState, useCallback } from 'react';
import { TutorialOverlay, isTutorialDone } from './TutorialOverlay';
import { DUELS_TUTORIAL } from './TutorialContent';
import { GameState, Rarity, DuelEntry } from '../types';
import { GEN1_POKEMON, POKEMON_BY_ID, POKEMON_BY_RARITY } from '../data/gen1';
import { ShinySprite } from './ShinySprite';
import { POKEMON_TYPE, TYPE_COLORS } from '../data/pokemonTypes';

interface Props {
  state: GameState;
  onClose: () => void;
  onDuelResult: (entry: DuelEntry, pointsDelta: number, fragmentReward: { pokemonId: number } | null, lurePrize: boolean) => void;
  onMarkTutorialDone?: () => void;
}

const RARITY_BONUS: Record<Rarity, number> = {
  commun: 10,
  peu_commun: 20,
  rare: 35,
  elite: 55,
  legendaire: 80,
};

const OPPONENT_NAMES = ['AshKetchum', 'MistyWater', 'BrockRock', 'GaryOak', 'TeamRocket', 'ProfChêne', 'Ondine', 'Pierre'];

function calcStat(pokemonId: number, isShiny: boolean): number {
  const p = POKEMON_BY_ID[pokemonId];
  if (!p) return 0;
  return RARITY_BONUS[p.rarity] + (isShiny ? 10 : 0);
}

function calcTeamScore(team: Array<{ pokemonId: number; isShiny: boolean }>): number {
  return team.reduce((sum, m) => sum + calcStat(m.pokemonId, m.isShiny), 0);
}

function buildOpponentTeam(rankingPoints: number): Array<{ pokemonId: number; isShiny: boolean }> {
  // Scale opponent quality with ranking points
  const level = Math.min(4, Math.floor(rankingPoints / 100));
  const pools: Rarity[][] = [
    ['commun', 'commun', 'commun'],
    ['commun', 'peu_commun', 'commun'],
    ['peu_commun', 'rare', 'peu_commun'],
    ['rare', 'elite', 'rare'],
    ['elite', 'legendaire', 'elite'],
  ];
  const rarityPicks = pools[level];

  const team: Array<{ pokemonId: number; isShiny: boolean }> = [];
  for (const rarity of rarityPicks) {
    const pool = POKEMON_BY_RARITY[rarity];
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const isShiny = Math.random() < 0.05;
    team.push({ pokemonId: pick.id, isShiny });
  }
  return team;
}

type DuelPhase = 'team_select' | 'result';

export function DuelPanel({ state, onClose, onDuelResult, onMarkTutorialDone }: Props) {
  const [showTutorial, setShowTutorial] = useState(() =>
    !state.completedTutorials?.includes('duels') && !isTutorialDone('duels')
  );
  const [selectedTeam, setSelectedTeam] = useState<Array<{ pokemonId: number; isShiny: boolean }>>([]);
  const [phase, setPhase] = useState<DuelPhase>('team_select');
  const [lastResult, setLastResult] = useState<DuelEntry | null>(null);
  const [lastRewards, setLastRewards] = useState<{ points: number; fragment: { pokemonId: number } | null; lure: boolean } | null>(null);

  const ownedPokemon = GEN1_POKEMON.filter(
    (p) => (state.normalCollection[p.id] ?? 0) > 0 || (state.shinyCollection[p.id] ?? 0) > 0
  );

  const toggleMember = useCallback((pokemonId: number, isShiny: boolean) => {
    setSelectedTeam(prev => {
      const idx = prev.findIndex(m => m.pokemonId === pokemonId && m.isShiny === isShiny);
      if (idx >= 0) return prev.filter((_, i) => i !== idx);
      if (prev.length >= 3) return prev;
      return [...prev, { pokemonId, isShiny }];
    });
  }, []);

  const isSelected = (pokemonId: number, isShiny: boolean) =>
    selectedTeam.some(m => m.pokemonId === pokemonId && m.isShiny === isShiny);

  const launchDuel = useCallback(() => {
    if (selectedTeam.length === 0) return;
    const opponentName = OPPONENT_NAMES[Math.floor(Math.random() * OPPONENT_NAMES.length)];
    const opponentTeam = buildOpponentTeam(state.duels.rankingPoints);
    const myScore = calcTeamScore(selectedTeam);
    const opponentScore = calcTeamScore(opponentTeam);
    const won = myScore >= opponentScore; // tie → challenger wins

    const entry: DuelEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      won,
      opponentName,
      opponentTeam,
      myTeam: selectedTeam,
      myScore,
      opponentScore,
      date: new Date().toISOString(),
    };

    // Compute rewards
    let pointsDelta = won ? 15 : 3;
    let fragment: { pokemonId: number } | null = null;
    let lure = false;

    if (won) {
      const caughtIds = Object.keys(state.normalCollection).map(Number).filter(id => (state.normalCollection[id] ?? 0) > 0);
      if (caughtIds.length > 0) {
        const pick = caughtIds[Math.floor(Math.random() * caughtIds.length)];
        fragment = { pokemonId: pick };
      }
      // Streak bonus
      const newStreak = state.duels.streak + 1;
      if (newStreak % 3 === 0) {
        lure = true;
      }
    }

    setLastResult(entry);
    setLastRewards({ points: pointsDelta, fragment, lure });
    setPhase('result');
    onDuelResult(entry, pointsDelta, fragment, lure);
  }, [selectedTeam, state, onDuelResult]);

  const teamScore = calcTeamScore(selectedTeam);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pb-3 border-b border-slate-700 shrink-0" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl px-1">←</button>
        <div>
          <h2 className="text-white font-bold text-xl">⚔️ Duels</h2>
          <p className="text-slate-400 text-sm">
            {state.duels.wins}V / {state.duels.losses}D · 🏆 {state.duels.rankingPoints} pts classement
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {phase === 'team_select' && (
          <div className="flex flex-col gap-4 p-4">
            {/* Current team */}
            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-600/40">
              <h3 className="text-white font-bold mb-3">Ton équipe ({selectedTeam.length}/3)</h3>
              <div className="flex gap-3">
                {[0, 1, 2].map(i => {
                  const member = selectedTeam[i];
                  if (!member) {
                    return (
                      <div key={i} className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-600 flex items-center justify-center text-slate-600 text-xs">
                        Vide
                      </div>
                    );
                  }
                  const p = POKEMON_BY_ID[member.pokemonId];
                  return (
                    <div key={i} className="flex flex-col items-center">
                      <ShinySprite pokemonId={member.pokemonId} isShiny={member.isShiny} width={64} height={64} className="rounded-lg bg-slate-700" alt={p?.name} />
                      <div className="text-center text-xs text-slate-300 mt-1">{calcStat(member.pokemonId, member.isShiny)} pts</div>
                    </div>
                  );
                })}
                <div className="flex items-center ml-auto">
                  <div className="text-yellow-400 font-bold text-lg">{teamScore} pts</div>
                </div>
              </div>
            </div>

            {/* Pick Pokémon */}
            <h3 className="text-white font-bold">Sélectionne tes Pokémon</h3>
            {ownedPokemon.length === 0 && (
              <div className="text-slate-500 text-center py-8">
                <div className="text-3xl mb-2">😢</div>
                <p>Tu n'as encore capturé aucun Pokémon !</p>
              </div>
            )}
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
              {ownedPokemon.map(p => {
                const hasShiny = (state.shinyCollection[p.id] ?? 0) > 0;
                const variants: Array<{ pokemonId: number; isShiny: boolean }> = [{ pokemonId: p.id, isShiny: false }];
                if (hasShiny) variants.push({ pokemonId: p.id, isShiny: true });

                return variants.map(({ pokemonId, isShiny }) => {
                  const sel = isSelected(pokemonId, isShiny);
                  return (
                    <button
                      key={`${pokemonId}-${isShiny}`}
                      onClick={() => toggleMember(pokemonId, isShiny)}
                      className={`flex flex-col items-center gap-1 p-1 rounded-lg border-2 transition-colors ${
                        sel ? 'border-yellow-400 bg-yellow-900/30' : 'border-slate-600/40 bg-slate-800/40 hover:border-slate-500'
                      }`}
                    >
                      <div className="relative">
                        <img
                          src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${isShiny ? 'shiny/' : ''}${pokemonId}.png`}
                          alt={p.name}
                          width={48}
                          height={48}
                          style={{ imageRendering: 'pixelated' }}
                          draggable={false}
                        />
                        {isShiny && <span className="absolute -top-1 -right-1 text-xs">✨</span>}
                        {sel && <span className="absolute -top-1 -left-1 text-xs bg-yellow-400 text-black rounded-full w-4 h-4 flex items-center justify-center font-bold">{selectedTeam.findIndex(m => m.pokemonId === pokemonId && m.isShiny === isShiny) + 1}</span>}
                      </div>
                      <span className="text-xs text-slate-300" style={{ fontSize: '0.6rem' }}>{p.name}</span>
                      <span className="text-xs text-yellow-400" style={{ fontSize: '0.6rem' }}>{calcStat(pokemonId, isShiny)} pts</span>
                      <div className="flex gap-0.5 flex-wrap justify-center">
                        {(POKEMON_TYPE[pokemonId] ?? []).map(t => (
                          <span key={t} className="text-white font-bold rounded px-0.5"
                            style={{ background: TYPE_COLORS[t] ?? '#888', fontSize: '0.38rem' }}>
                            {t.toUpperCase().slice(0,4)}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                });
              })}
            </div>

            <button
              onClick={launchDuel}
              disabled={selectedTeam.length === 0}
              className="mt-2 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 rounded-xl text-lg transition-colors"
            >
              ⚔️ Lancer un défi !
            </button>

            {/* History */}
            {state.duels.history.length > 0 && (
              <div>
                <h3 className="text-white font-bold mb-2">Derniers duels</h3>
                <div className="flex flex-col gap-2">
                  {state.duels.history.slice(0, 5).map(entry => (
                    <div key={entry.id} className={`rounded-xl p-3 border text-sm ${entry.won ? 'border-green-500/40 bg-green-900/20' : 'border-red-500/40 bg-red-900/20'}`}>
                      <div className="flex items-center justify-between">
                        <span className={entry.won ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                          {entry.won ? '✅ Victoire' : '❌ Défaite'} vs {entry.opponentName}
                        </span>
                        <span className="text-slate-400 text-xs">{new Date(entry.date).toLocaleDateString('fr-FR')}</span>
                      </div>
                      <div className="text-slate-300 mt-1">
                        Ton score : {entry.myScore} pts · Adversaire : {entry.opponentScore} pts
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {phase === 'result' && lastResult && lastRewards && (
          <div className="flex flex-col items-center justify-center gap-6 p-6 min-h-full">
            {/* VS display */}
            <div className="flex items-center gap-4 w-full max-w-sm">
              <div className="flex-1 flex flex-col items-center gap-2">
                <div className="text-slate-300 font-bold text-sm">Toi</div>
                <div className="flex gap-1">
                  {lastResult.myTeam.map((m, i) => (
                    <ShinySprite key={i} pokemonId={m.pokemonId} isShiny={m.isShiny} width={40} height={40} className="bg-slate-700 rounded" />
                  ))}
                </div>
                <div className="text-yellow-400 font-bold">{lastResult.myScore} pts</div>
              </div>
              <div className="text-2xl font-black text-slate-400">VS</div>
              <div className="flex-1 flex flex-col items-center gap-2">
                <div className="text-slate-300 font-bold text-sm">{lastResult.opponentName}</div>
                <div className="flex gap-1">
                  {lastResult.opponentTeam.map((m, i) => (
                    <ShinySprite key={i} pokemonId={m.pokemonId} isShiny={m.isShiny} width={40} height={40} className="bg-slate-700 rounded" />
                  ))}
                </div>
                <div className="text-yellow-400 font-bold">{lastResult.opponentScore} pts</div>
              </div>
            </div>

            {/* Result banner */}
            <div className={`text-3xl font-black ${lastResult.won ? 'text-green-400' : 'text-red-400'}`}>
              {lastResult.won ? '🏆 VICTOIRE !' : '💀 DÉFAITE'}
            </div>

            {/* Rewards */}
            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-600/40 w-full max-w-sm">
              <h3 className="text-white font-bold mb-2">Récompenses</h3>
              <div className="flex flex-col gap-1 text-sm">
                <span className="text-yellow-400">+{lastRewards.points} pts classement</span>
                {lastRewards.fragment && (
                  <span className="text-blue-400">
                    +1 fragment : {POKEMON_BY_ID[lastRewards.fragment.pokemonId]?.name}
                  </span>
                )}
                {lastRewards.lure && (
                  <span className="text-purple-400">🎣 Leurre Rare offert (série de 3 victoires !)</span>
                )}
              </div>
            </div>

            <div className="flex gap-3 w-full max-w-sm">
              <button
                onClick={() => setPhase('team_select')}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors"
              >
                Rejouer
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      {showTutorial && (
        <TutorialOverlay tutorialKey="duels" steps={DUELS_TUTORIAL} onDone={() => { setShowTutorial(false); onMarkTutorialDone?.(); }} />
      )}
      </div>
    </div>
  );
}
