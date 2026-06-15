import { useState, useEffect } from 'react';
import { GameState } from '../types';
import { supabase } from '../lib/supabase';
import { calcMaxHp } from '../data/combatEngine';
import { GEN1_STATS } from '../data/gen1Stats';
import { POKEMON_BY_ID } from '../data/gen1';
import { TeamMember } from './TeamBuilder';

interface ChampionData {
  username: string;
  team: Array<{ pokemonId: number; isShiny: boolean }>;
  since: string;
}

const DEFAULT_CHAMPION: ChampionData = {
  username: 'Eliantest',
  team: [
    { pokemonId: 150, isShiny: false },
    { pokemonId: 145, isShiny: false },
    { pokemonId: 146, isShiny: false },
  ],
  since: 'Depuis toujours',
};

const CHAMPION_LEVEL = 80;

function toTeamMember(pokemonId: number, isShiny: boolean, level: number): TeamMember {
  const stats = GEN1_STATS[pokemonId];
  const baseHp = stats?.hp ?? 50;
  const maxHp = calcMaxHp(baseHp, level);
  return { pokemonId, isShiny, level, xp: 0, currentHp: maxHp, maxHp };
}

function spriteUrl(pokemonId: number, isShiny: boolean) {
  return isShiny
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${pokemonId}.png`
    : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;
}

interface Props {
  state: GameState;
  username: string;
  onClose: () => void;
  onChallenge: (playerTeam: TeamMember[], enemyTeam: TeamMember[], enemyName: string, onDone: (won: boolean) => void) => void;
}

export function ThroneScreen({ state, username, onClose, onChallenge }: Props) {
  const [champion, setChampion] = useState<ChampionData>(DEFAULT_CHAMPION);
  const [phase, setPhase] = useState<'view' | 'pick'>('view');
  const [selectedTeamIdx, setSelectedTeamIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('game_saves').select('state').eq('user_id', '__throne__').single()
      .then(({ data }) => {
        if (data?.state) setChampion(data.state as ChampionData);
        setLoading(false);
      }, () => setLoading(false));
  }, []);

  const savedTeams = state.savedTeams ?? [];

  async function saveChampion(newChampion: ChampionData) {
    setSaving(true);
    await supabase.from('game_saves').upsert({ user_id: '__throne__', state: newChampion, updated_at: new Date().toISOString() });
    setSaving(false);
  }

  function handleChallenge() {
    if (selectedTeamIdx === null) return;
    const team = savedTeams[selectedTeamIdx];
    if (!team) return;
    const playerTeam = team.members.map(m => toTeamMember(m.pokemonId, m.isShiny ?? false, m.level));
    const enemyTeam = champion.team.map(m => toTeamMember(m.pokemonId, m.isShiny, CHAMPION_LEVEL));
    onChallenge(playerTeam, enemyTeam, champion.username, async (won) => {
      if (won) {
        const newChampion: ChampionData = {
          username,
          team: team.members.slice(0, 3).map(m => ({ pokemonId: m.pokemonId, isShiny: m.isShiny ?? false })),
          since: new Date().toISOString(),
        };
        setChampion(newChampion);
        await saveChampion(newChampion);
        setResultMsg('👑 Tu es le nouveau Champion du Trône !');
      } else {
        setResultMsg('💀 Défaite — le champion tient son trône.');
      }
      setPhase('view');
      setSelectedTeamIdx(null);
    });
  }

  const sinceLabel = (() => {
    if (champion.since === 'Depuis toujours') return 'Depuis toujours';
    try {
      return new Date(champion.since).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch { return ''; }
  })();

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-slate-900 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <h1 className="text-yellow-400 font-black text-2xl tracking-wide">👑 Trône</h1>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-xl px-2">✕</button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-slate-400">Chargement…</div>
      ) : phase === 'view' ? (
        <div className="flex-1 flex flex-col items-center px-5 gap-6 pb-10">
          {resultMsg && (
            <div className="w-full max-w-md bg-yellow-900/40 border border-yellow-500/50 rounded-2xl px-4 py-3 text-yellow-300 font-bold text-center text-sm">
              {resultMsg}
            </div>
          )}

          {/* Throne card */}
          <div
            className="w-full max-w-md rounded-3xl p-6 flex flex-col items-center gap-4 border-2"
            style={{
              background: 'linear-gradient(160deg, #1a1200 0%, #2d1f00 50%, #1a1200 100%)',
              borderColor: '#f59e0b',
              boxShadow: '0 0 40px rgba(245,158,11,0.25), inset 0 0 30px rgba(245,158,11,0.05)',
            }}
          >
            <div className="text-6xl">👑</div>
            <div>
              <p className="text-yellow-400 font-black text-xl text-center">{champion.username}</p>
              <p className="text-yellow-600 text-xs text-center mt-0.5">Champion du Trône · {sinceLabel}</p>
            </div>

            {/* Champion team */}
            <div className="flex gap-4 justify-center">
              {champion.team.map((m, i) => {
                const poke = POKEMON_BY_ID[m.pokemonId];
                return (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <img
                      src={spriteUrl(m.pokemonId, m.isShiny)}
                      alt={poke?.name ?? `#${m.pokemonId}`}
                      width={56}
                      height={56}
                      style={{ imageRendering: 'pixelated', filter: 'drop-shadow(0 0 8px rgba(245,158,11,0.6))' }}
                      draggable={false}
                    />
                    <span className="text-yellow-300 text-[0.55rem] font-bold">{poke?.name ?? `#${m.pokemonId}`}</span>
                    {m.isShiny && <span className="text-yellow-400 text-[0.5rem]">✨</span>}
                  </div>
                );
              })}
            </div>

            <p className="text-slate-400 text-xs text-center">Niveau {CHAMPION_LEVEL}</p>
          </div>

          {/* Challenge button */}
          {savedTeams.length > 0 ? (
            <button
              onClick={() => setPhase('pick')}
              className="w-full max-w-md py-4 rounded-2xl font-black text-lg text-black"
              style={{ background: 'linear-gradient(90deg, #f59e0b, #ef4444)', boxShadow: '0 4px 20px rgba(245,158,11,0.4)' }}
            >
              ⚔️ Affronter le Champion
            </button>
          ) : (
            <div className="w-full max-w-md bg-slate-800 rounded-2xl p-4 text-center text-slate-400 text-sm">
              Crée d'abord une équipe dans <strong className="text-white">Équipe</strong> pour challenger le champion.
            </div>
          )}

          <p className="text-slate-600 text-xs text-center max-w-sm">
            Bats l'équipe du champion pour monter sur le trône. Aucun cooldown — tu peux enchaîner les tentatives.
          </p>
        </div>
      ) : (
        /* Team picker */
        <div className="flex-1 flex flex-col px-5 pb-10 gap-4">
          <p className="text-slate-300 text-sm font-bold">Choisis une équipe pour affronter <span className="text-yellow-400">{champion.username}</span> :</p>
          <div className="flex flex-col gap-3">
            {savedTeams.map((team, idx) => (
              <button
                key={team.id}
                onClick={() => setSelectedTeamIdx(idx)}
                className={`w-full rounded-2xl p-4 border-2 transition-all text-left ${
                  selectedTeamIdx === idx
                    ? 'border-yellow-500 bg-yellow-900/30'
                    : 'border-slate-700 bg-slate-800/60 hover:border-slate-500'
                }`}
              >
                <p className="text-white font-bold text-sm mb-2">{team.name}</p>
                <div className="flex gap-2">
                  {team.members.slice(0, 3).map((m, i) => (
                    <img
                      key={i}
                      src={spriteUrl(m.pokemonId, m.isShiny ?? false)}
                      alt=""
                      width={40}
                      height={40}
                      style={{ imageRendering: 'pixelated' }}
                      draggable={false}
                    />
                  ))}
                </div>
              </button>
            ))}
          </div>

          <div className="flex gap-3 mt-2">
            <button
              onClick={() => { setPhase('view'); setSelectedTeamIdx(null); }}
              className="flex-1 py-3 rounded-2xl border border-slate-600 text-slate-300 font-bold"
            >
              Annuler
            </button>
            <button
              onClick={handleChallenge}
              disabled={selectedTeamIdx === null || saving}
              className="flex-1 py-3 rounded-2xl font-black text-black disabled:opacity-40"
              style={{ background: 'linear-gradient(90deg, #f59e0b, #ef4444)' }}
            >
              {saving ? '…' : '⚔️ Combattre'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
