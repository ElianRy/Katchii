import { useState, useEffect, useCallback } from 'react';
import { GameState, RARITY_COLORS, Rarity } from '../types';
import { POKEMON_BY_ID } from '../data/gen1';
import { supabase } from '../lib/supabase';
import { calcMaxHp } from '../data/combatEngine';
import { TeamMember } from './TeamBuilder';

interface Props {
  state: GameState;
  userId: string;
  username: string;
  isAdmin: boolean;
  onStartBattle: (
    playerTeam: TeamMember[],
    bossTeam: TeamMember[],
    bossName: string,
    onDone: (totalDamage: number, won: boolean) => void
  ) => void;
  onRewardXp: (pokemonId: number, xp: number) => void;
  onRewardLure: (type: 'rare' | 'epique', count: number) => void;
  onClose: () => void;
}

interface RaidRow {
  id: string;
  date: string;
  pokemon_id: number;
  is_shiny: boolean;
  level: number;
  max_hp: number;
  current_hp: number;
  status: 'pending' | 'active' | 'defeated' | 'expired';
  starts_at: string;
  ends_at: string;
}

interface ParticipantRow {
  id: string;
  raid_id: string;
  user_id: string;
  username: string;
  damage_dealt: number;
  is_exhausted: boolean;
  rewarded: boolean;
}

const EPIC_LEGENDARY_IDS: number[] = [
  3, 6, 9, 34, 31, 59, 65, 68, 94, 130,  // elite
  144, 145, 146, 150, 151,                  // legendaire
];

function pickRaidBoss(): { pokemonId: number; isShiny: boolean; level: number; maxHp: number } {
  const pokemonId = EPIC_LEGENDARY_IDS[Math.floor(Math.random() * EPIC_LEGENDARY_IDS.length)];
  const isShiny = Math.random() < 0.15;
  const level = 60 + Math.floor(Math.random() * 21); // 60-80
  const baseHp = calcMaxHp(pokemonId, level);
  // Scale up so boss has ~15k-20k effective HP that needs team effort
  const maxHp = baseHp * 25 + Math.floor(Math.random() * 5000);
  return { pokemonId, isShiny, level, maxHp };
}


function getNextRaidTime(): string {
  const now = new Date();
  const cetOffset = 1; // approximate CET
  const cetHour = (now.getUTCHours() + cetOffset) % 24;
  if (cetHour < 20) {
    const msUntil = (20 - cetHour) * 3600000 - now.getMinutes() * 60000;
    const h = Math.floor(msUntil / 3600000);
    const m = Math.floor((msUntil % 3600000) / 60000);
    return `dans ${h}h${m.toString().padStart(2, '0')}`;
  }
  return 'demain à 20h';
}

function HpBar({ current, max }: { current: number; max: number }) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  const color = pct > 50 ? '#22c55e' : pct > 25 ? '#f59e0b' : '#ef4444';
  return (
    <div className="w-full bg-slate-700 rounded-full h-5 overflow-hidden border border-slate-600 relative">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }}
      />
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white/80">
        {Math.max(0, current).toLocaleString()} / {max.toLocaleString()}
      </span>
    </div>
  );
}

export function RaidPanel({ state, userId, username, isAdmin, onStartBattle, onRewardXp, onRewardLure, onClose }: Props) {
  const [raid, setRaid] = useState<RaidRow | null>(null);
  const [myParticipation, setMyParticipation] = useState<ParticipantRow | null>(null);
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [rewardMsg, setRewardMsg] = useState('');

  const fetchRaid = useCallback(async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('raids')
      .select('*')
      .eq('date', today)
      .in('status', ['active', 'defeated'])
      .maybeSingle();
    setRaid(data ?? null);
    if (data) {
      const { data: parts } = await supabase
        .from('raid_participants')
        .select('*')
        .eq('raid_id', data.id)
        .order('damage_dealt', { ascending: false });
      setParticipants(parts ?? []);
      setMyParticipation(parts?.find(p => p.user_id === userId) ?? null);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchRaid();
  }, [fetchRaid]);

  // Real-time HP subscription
  useEffect(() => {
    if (!raid) return;
    const channel = supabase
      .channel(`raid-${raid.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'raids',
        filter: `id=eq.${raid.id}`,
      }, payload => {
        setRaid(prev => prev ? { ...prev, ...(payload.new as Partial<RaidRow>) } : prev);
      })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'raid_participants',
        filter: `raid_id=eq.${raid.id}`,
      }, () => {
        // Refresh participants on any change
        supabase.from('raid_participants')
          .select('*')
          .eq('raid_id', raid.id)
          .order('damage_dealt', { ascending: false })
          .then(({ data }) => {
            setParticipants(data ?? []);
            setMyParticipation(data?.find(p => p.user_id === userId) ?? null);
          });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [raid?.id, userId]);

  const handleCreateRaid = async () => {
    setCreating(true);
    const boss = pickRaidBoss();
    const today = new Date().toISOString().split('T')[0];
    // starts_at = today 20h CET, ends_at = today 22h CET (approximate UTC)
    const startsAt = new Date(`${today}T19:00:00Z`).toISOString(); // 20h CET = 19h UTC
    const endsAt = new Date(`${today}T21:00:00Z`).toISOString();   // 22h CET = 21h UTC
    const { data, error } = await supabase.from('raids').upsert({
      date: today,
      pokemon_id: boss.pokemonId,
      is_shiny: boss.isShiny,
      level: boss.level,
      max_hp: boss.maxHp,
      current_hp: boss.maxHp,
      status: 'active',
      starts_at: startsAt,
      ends_at: endsAt,
    }, { onConflict: 'date' }).select().single();
    setCreating(false);
    if (!error && data) setRaid(data as RaidRow);
  };

  const handleFight = () => {
    if (!raid || raid.status !== 'active') return;
    if (myParticipation?.is_exhausted) return;

    const boss = POKEMON_BY_ID[raid.pokemon_id];
    if (!boss) return;

    // Build player team (favorite or top 3)
    const playerTeam = buildPlayerTeam(state);
    if (playerTeam.length === 0) return;

    // Boss team: single pokemon at raid level, scaled HP = remaining HP (capped for display)
    const displayHp = Math.min(raid.current_hp, calcMaxHp(raid.pokemon_id, raid.level) * 8);
    const bossTeam: TeamMember[] = [{
      pokemonId: raid.pokemon_id,
      isShiny: raid.is_shiny,
      level: raid.level,
      xp: 0,
      currentHp: displayHp,
      maxHp: displayHp,
    }];

    const bossLabel = `${raid.is_shiny ? '✨ ' : ''}${boss.name} (Raid Lv.${raid.level})`;

    onStartBattle(playerTeam, bossTeam, bossLabel, async (totalDamage, won) => {
      if (!raid) return;
      // Clamp damage to remaining HP
      const clampedDamage = Math.min(totalDamage, Math.max(0, raid.current_hp));

      // Upsert participation row
      const existing = myParticipation;
      const newDamage = (existing?.damage_dealt ?? 0) + clampedDamage;
      await supabase.from('raid_participants').upsert({
        ...(existing ? { id: existing.id } : {}),
        raid_id: raid.id,
        user_id: userId,
        username,
        damage_dealt: newDamage,
        is_exhausted: !won ? true : (existing?.is_exhausted ?? false),
        rewarded: existing?.rewarded ?? false,
      }, { onConflict: 'raid_id,user_id' });

      // Atomically decrement HP
      await supabase.rpc('decrement_raid_hp', {
        raid_id_param: raid.id,
        damage_param: clampedDamage,
      });

      // Refresh local state
      fetchRaid();
    });
  };

  const handleClaimReward = async () => {
    if (!raid || !myParticipation || myParticipation.rewarded || raid.status !== 'defeated') return;
    const dmgPct = Math.min(1, myParticipation.damage_dealt / raid.max_hp);

    // XP reward for each pokemon in team
    const team = buildPlayerTeam(state);
    const xpPerPokemon = Math.floor(dmgPct * 8000);
    for (const m of team) {
      onRewardXp(m.pokemonId, xpPerPokemon);
    }

    // Lure rewards
    const lureCount = Math.max(1, Math.floor(dmgPct * 5));
    onRewardLure('epique', lureCount);

    // Mark rewarded
    await supabase.from('raid_participants')
      .update({ rewarded: true })
      .eq('id', myParticipation.id);

    setMyParticipation(prev => prev ? { ...prev, rewarded: true } : prev);
    setRewardMsg(`+${xpPerPokemon} XP par Pokémon · +${lureCount} Leurre${lureCount > 1 ? 's' : ''} Épique${lureCount > 1 ? 's' : ''} !`);
  };

  const bossData = raid ? POKEMON_BY_ID[raid.pokemon_id] : null;
  const isExhausted = myParticipation?.is_exhausted ?? false;
  const alreadyRewarded = myParticipation?.rewarded ?? false;

  return (
    <div className="fixed inset-0 bg-slate-950 text-white z-50 flex flex-col" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pb-3 border-b border-slate-700 shrink-0" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl px-1">←</button>
        <div>
          <h2 className="text-xl font-black text-red-400">🐉 Raid</h2>
          <p className="text-xs text-slate-400">Combat coopératif quotidien · 20h–22h</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4"
        style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px) + 1rem)' }}>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-slate-400 text-sm animate-pulse">Chargement…</div>
          </div>
        ) : !raid ? (
          /* No active raid */
          <div className="flex flex-col items-center justify-center gap-6 py-12 text-center">
            <div className="text-7xl">🐉</div>
            <div>
              <div className="text-xl font-bold text-white mb-2">Aucun raid aujourd'hui</div>
              <div className="text-slate-400 text-sm">Prochain raid {getNextRaidTime()}</div>
              <div className="text-slate-500 text-xs mt-2">Les raids ont lieu tous les jours de 20h à 22h</div>
            </div>
            {isAdmin && (
              <button
                onClick={handleCreateRaid}
                disabled={creating}
                className="px-6 py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
                style={{ background: '#dc2626', color: '#fff', opacity: creating ? 0.5 : 1 }}
              >
                {creating ? 'Création…' : '⚙️ Créer un raid (Admin)'}
              </button>
            )}
          </div>
        ) : (
          <div className="max-w-lg mx-auto flex flex-col gap-5">
            {/* Boss card */}
            <div
              className="rounded-2xl border p-5 flex flex-col items-center gap-4"
              style={{
                background: raid.status === 'defeated' ? 'rgba(0,0,0,0.4)' : 'rgba(220,38,38,0.08)',
                borderColor: raid.status === 'defeated' ? '#22c55e44' : '#ef444444',
              }}
            >
              <div className="text-xs font-bold uppercase tracking-widest"
                style={{ color: raid.status === 'defeated' ? '#22c55e' : '#f87171' }}>
                {raid.status === 'defeated' ? '✅ Raid terminé' : '⚔️ Raid en cours'}
              </div>

              {/* Boss sprite */}
              <div className="relative">
                {raid.status === 'active' && (
                  <div className="absolute inset-0 rounded-full animate-pulse"
                    style={{ boxShadow: '0 0 50px 20px #ef444455' }} />
                )}
                <img
                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${raid.is_shiny ? 'shiny/' : ''}${raid.pokemon_id}.png`}
                  alt={bossData?.name}
                  width={112}
                  height={112}
                  style={{
                    imageRendering: 'pixelated',
                    filter: raid.status === 'defeated'
                      ? 'grayscale(1) brightness(0.5)'
                      : raid.is_shiny
                        ? 'drop-shadow(0 0 12px #fde047)'
                        : 'drop-shadow(0 0 12px #ef4444)',
                  }}
                />
              </div>

              <div>
                <div className="text-xl font-black text-center"
                  style={{ color: bossData ? RARITY_COLORS[bossData.rarity as Rarity] : '#fff' }}>
                  {raid.is_shiny && '✨ '}{bossData?.name ?? `#${raid.pokemon_id}`}
                </div>
                <div className="text-slate-400 text-xs text-center">Niveau {raid.level}</div>
              </div>

              {/* HP bar */}
              <div className="w-full">
                <HpBar current={raid.current_hp} max={raid.max_hp} />
              </div>

              {/* Stats */}
              <div className="flex gap-6 text-center">
                <div>
                  <div className="text-lg font-bold text-blue-400">{participants.length}</div>
                  <div className="text-xs text-slate-400">joueur{participants.length !== 1 ? 's' : ''}</div>
                </div>
                {myParticipation && (
                  <div>
                    <div className="text-lg font-bold text-yellow-400">
                      {myParticipation.damage_dealt.toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-400">tes dégâts</div>
                  </div>
                )}
                <div>
                  <div className="text-lg font-bold text-orange-400">
                    {myParticipation
                      ? `${Math.round(myParticipation.damage_dealt / raid.max_hp * 100)}%`
                      : '0%'}
                  </div>
                  <div className="text-xs text-slate-400">ta contribution</div>
                </div>
              </div>
            </div>

            {/* Participants list */}
            {participants.length > 0 && (
              <div className="bg-slate-800/60 rounded-xl border border-slate-700/40 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-700/40">
                  <span className="text-slate-300 text-xs font-bold uppercase tracking-wider">Participants</span>
                </div>
                {participants.map((p, i) => {
                  const isMe = p.user_id === userId;
                  const pct = Math.round(p.damage_dealt / raid.max_hp * 100);
                  return (
                    <div key={p.id}
                      className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-700/20 last:border-0"
                      style={{ background: isMe ? 'rgba(251,191,36,0.06)' : undefined }}>
                      <span className="text-sm w-5 text-center text-slate-500">{i + 1}</span>
                      <span className="flex-1 text-sm font-semibold"
                        style={{ color: isMe ? '#fbbf24' : '#e2e8f0' }}>
                        {p.username}{isMe ? ' (vous)' : ''}
                        {p.is_exhausted && <span className="text-slate-500 text-xs ml-1">💀</span>}
                      </span>
                      <span className="text-xs text-slate-400">{p.damage_dealt.toLocaleString()} dmg</span>
                      <span className="text-xs font-bold"
                        style={{ color: pct > 30 ? '#f59e0b' : '#60a5fa' }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Action area */}
            {raid.status === 'active' && (
              <>
                {isExhausted ? (
                  <div className="rounded-xl border border-slate-700/40 p-4 text-center bg-slate-800/40">
                    <div className="text-2xl mb-2">💀</div>
                    <div className="text-white font-bold mb-1">Ton équipe est KO</div>
                    <div className="text-slate-400 text-sm">Tu es spectateur. Si le boss est vaincu avant 22h, tu recevras des récompenses !</div>
                  </div>
                ) : (
                  <button
                    onClick={handleFight}
                    className="w-full py-4 rounded-xl font-black text-lg transition-all active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #dc2626, #7f1d1d)', color: '#fff' }}
                  >
                    ⚔️ Combattre !
                  </button>
                )}
              </>
            )}

            {raid.status === 'defeated' && (
              <>
                {myParticipation && !alreadyRewarded && (
                  <div>
                    {rewardMsg ? (
                      <div className="rounded-xl bg-green-900/30 border border-green-500/40 p-4 text-center">
                        <div className="text-2xl mb-1">🎉</div>
                        <div className="text-green-400 font-bold">{rewardMsg}</div>
                      </div>
                    ) : (
                      <button
                        onClick={handleClaimReward}
                        className="w-full py-4 rounded-xl font-black text-lg transition-all active:scale-95"
                        style={{ background: 'linear-gradient(135deg, #f59e0b, #ef7c00)', color: '#fff' }}
                      >
                        🎁 Réclamer les récompenses !
                      </button>
                    )}
                  </div>
                )}
                {(!myParticipation || alreadyRewarded) && (
                  <div className="rounded-xl bg-slate-800/40 border border-slate-700/40 p-4 text-center">
                    {alreadyRewarded
                      ? <div className="text-green-400 font-bold">✅ Récompenses déjà réclamées</div>
                      : <div className="text-slate-400 text-sm">Tu n'as pas participé à ce raid</div>
                    }
                  </div>
                )}
              </>
            )}

            {isAdmin && raid.status === 'active' && (
              <button
                onClick={async () => {
                  await supabase.from('raids').update({ status: 'defeated', current_hp: 0 }).eq('id', raid.id);
                  fetchRaid();
                }}
                className="w-full py-2 rounded-xl text-xs text-slate-500 border border-slate-700/40 transition-all active:scale-95"
              >
                ⚙️ Terminer le raid (Admin)
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function buildPlayerTeam(state: GameState): TeamMember[] {
  const favTeam = state.favoriteTeamId
    ? state.savedTeams?.find(t => t.id === state.favoriteTeamId)
    : null;
  if (favTeam && favTeam.members.length > 0) {
    return favTeam.members.slice(0, 3).map(m => {
      const level = state.pokemonLevels?.[m.pokemonId]?.level ?? m.level;
      const xp = state.pokemonLevels?.[m.pokemonId]?.xp ?? m.xp;
      return { pokemonId: m.pokemonId, isShiny: m.isShiny, level, xp,
        currentHp: calcMaxHp(m.pokemonId, level), maxHp: calcMaxHp(m.pokemonId, level) };
    });
  }
  return Object.entries(state.normalCollection)
    .filter(([, c]) => (c as number) > 0)
    .map(([id]) => Number(id))
    .sort((a, b) => {
      const la = state.pokemonLevels?.[a]?.level ?? 1;
      const lb = state.pokemonLevels?.[b]?.level ?? 1;
      return lb - la;
    })
    .slice(0, 3)
    .map(id => {
      const level = state.pokemonLevels?.[id]?.level ?? 1;
      const xp = state.pokemonLevels?.[id]?.xp ?? 0;
      const isShiny = (state.shinyCollection[id] ?? 0) > 0;
      return { pokemonId: id, isShiny, level, xp,
        currentHp: calcMaxHp(id, level), maxHp: calcMaxHp(id, level) };
    });
}

// Keep legacy exports for backward compat
export function getWeekId(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
  return `${now.getFullYear()}-${String(weekNum).padStart(2, '0')}`;
}
export function todayDate(): string { return new Date().toISOString().split('T')[0]; }
export function getBestTeam(state: GameState): number[] { return buildPlayerTeam(state).map(m => m.pokemonId); }
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getTeamDamage(_state?: GameState): number { return 0; }
