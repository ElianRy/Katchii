import { useState, useEffect } from 'react';
import { GEN1_POKEMON, POKEMON_BY_ID } from '../data/gen1';
import { ZONE_ORDER, ZONE_BY_ID } from '../data/zones';
import { useGameState } from '../hooks/useGameState';
import { supabase } from '../lib/supabase';
import { throneRead, throneWrite, throneReadAllPlayers, adminBanUser } from '../lib/supabaseAdmin';
import type { ThroneData } from './ThroneScreen';
import type { GameState } from '../types';

interface Props {
  gameState: ReturnType<typeof useGameState>;
  onClose: () => void;
}

const RARITY_COLORS_ADMIN: Record<string, string> = {
  commun: '#94a3b8', peu_commun: '#4ade80', rare: '#60a5fa', elite: '#c084fc', legendaire: '#fbbf24',
};

type Tab = 'pokemon' | 'zones' | 'joueurs' | 'stats' | 'throne';

interface PlayerRow {
  username: string;
  userId?: string;
  normalCount: number;
  shinyCount: number;
  avgLevel: number;
  points: number;
  zone: string;
  updatedAt?: string;
  raw: GameState;
}

function fmtDuration(ms: number) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function AdminPanel({ gameState, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('pokemon');

  // feedback toast
  const [feedback, setFeedback] = useState('');
  const flash = (msg: string) => { setFeedback(msg); setTimeout(() => setFeedback(''), 2200); };

  // pokemon tab
  const [filter, setFilter] = useState('');

  // throne tab
  const [throneData, setThroneData] = useState<ThroneData | null>(null);
  const [throneLoading, setThroneLoading] = useState(false);
  const [manualUsername, setManualUsername] = useState('');

  // players tab
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [playerSearch, setPlayerSearch] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerRow | null>(null);
  const [giveCoinsAmt, setGiveCoinsAmt] = useState('1000');
  const [deletePokemonId, setDeletePokemonId] = useState('');
  const [playerSortBy, setPlayerSortBy] = useState<'name' | 'pokemon' | 'level' | 'coins'>('pokemon');

  // stats tab
  const [statsData, setStatsData] = useState<{
    totalPlayers: number;
    totalCaptures: number;
    topPokemon: Array<{ id: number; count: number }>;
    topPlayers: Array<{ username: string; count: number }>;
    avgLevel: number;
    shinyHunters: Array<{ username: string; count: number }>;
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Load throne on tab switch
  useEffect(() => {
    if (tab === 'throne' && !throneData) loadThrone();
    if (tab === 'joueurs' && players.length === 0) loadPlayers();
    if (tab === 'stats' && !statsData) loadStats();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Throne ────────────────────────────────────────────────────────────────
  const loadThrone = async () => {
    setThroneLoading(true);
    const [state, allPlayers] = await Promise.all([throneRead(), throneReadAllPlayers()]);
    setThroneData((state as ThroneData) ?? null);
    setThroneLoading(false);
    // players list is now loaded separately
    if (players.length === 0) loadPlayers();
    void allPlayers; // used via players state
  };

  const setManualChampion = async (newUsername: string) => {
    if (!newUsername.trim()) return;
    const { data: allSaves } = await supabase.from('game_saves').select('state');
    let team: Array<{ pokemonId: number; isShiny: boolean }> = [];
    if (allSaves) {
      for (const row of allSaves) {
        const s = row.state as { username?: string; favoriteTeamId?: string; savedTeams?: Array<{ id: string; members: Array<{ pokemonId: number; isShiny?: boolean }> }>; pokemonLevels?: Record<number, { level: number }> } | null;
        if (!s) continue;
        if ((s.username ?? '').toLowerCase() === newUsername.toLowerCase()) {
          const favTeam = s.favoriteTeamId ? (s.savedTeams ?? []).find(t => t.id === s.favoriteTeamId) : null;
          if (favTeam) { team = favTeam.members.slice(0, 3).map(m => ({ pokemonId: m.pokemonId, isShiny: m.isShiny ?? false })); break; }
          const topIds = Object.entries(s.pokemonLevels ?? {}).sort(([, a], [, b]) => b.level - a.level).slice(0, 3).map(([id]) => Number(id));
          if (topIds.length) { team = topIds.map(id => ({ pokemonId: id, isShiny: false })); break; }
        }
      }
    }
    const now = new Date().toISOString();
    const prev = throneData;
    const newRecords = [...(prev?.records ?? [])];
    if (prev?.champion && prev.champion.since !== 'Depuis toujours') {
      newRecords.push({ username: prev.champion.username, duration: Date.now() - new Date(prev.champion.since).getTime(), start: prev.champion.since, end: now });
    }
    const newData: ThroneData = { champion: { username: newUsername, team, since: now }, records: newRecords, coinClaims: throneData?.coinClaims ?? {} };
    const err = await throneWrite(newData);
    if (err) { flash(`❌ ${err}`); return; }
    setThroneData(newData);
    setManualUsername('');
    flash(`👑 ${newUsername} est maintenant champion !`);
  };

  const deleteRecord = async (idx: number) => {
    if (!throneData) return;
    const newRecords = throneData.records.filter((_, i) => i !== idx);
    const err = await throneWrite({ ...throneData, records: newRecords });
    if (err) { flash(`❌ ${err}`); return; }
    setThroneData({ ...throneData, records: newRecords });
    flash('🗑️ Record supprimé.');
  };

  // ── Players ───────────────────────────────────────────────────────────────
  const loadPlayers = async () => {
    setPlayersLoading(true);
    const { data } = await supabase.from('game_saves').select('user_id, state, updated_at').neq('user_id', '00000000-0000-0000-0000-000000000001');
    if (!data) { setPlayersLoading(false); return; }
    const rows: PlayerRow[] = data.flatMap(row => {
      const s = row.state as GameState | null;
      if (!s) return [];
      if ((s.username ?? '').toLowerCase() === 'elian') return [];
      const levels = Object.values(s.pokemonLevels ?? {}).map(l => l.level);
      const normalCount = Object.values(s.normalCollection ?? {}).filter(v => v > 0).length;
      const shinyCount = Object.values(s.shinyCollection ?? {}).filter(v => v > 0).length;
      const result: PlayerRow = {
        username: s.username ?? '???',
        userId: row.user_id as string | undefined,
        normalCount,
        shinyCount,
        avgLevel: levels.length ? Math.round(levels.reduce((a, b) => a + b, 0) / levels.length) : 0,
        points: s.points ?? 0,
        zone: s.zoneProgress?.currentZoneId ?? 'zone1',
        updatedAt: row.updated_at as string | undefined,
        raw: s,
      };
      return [result];
    });
    setPlayers(rows);
    setPlayersLoading(false);
  };

  const handleGiveCoins = async (player: PlayerRow) => {
    const amt = parseInt(giveCoinsAmt);
    if (isNaN(amt) || amt <= 0) return;
    // Update in Supabase directly (admin bypass)
    const { data } = await supabase.from('game_saves').select('state').eq('user_id', player.userId).single();
    if (!data) { flash('❌ Save introuvable'); return; }
    const s = data.state as GameState;
    const updated = { ...s, points: (s.points ?? 0) + amt };
    const { error } = await supabase.from('game_saves').update({ state: updated }).eq('user_id', player.userId);
    if (error) { flash(`❌ ${error.message}`); return; }
    flash(`✅ +${amt} pièces à ${player.username}`);
    setSelectedPlayer(null);
    loadPlayers();
  };

  const handleBan = async (player: PlayerRow) => {
    if (!player.userId) { flash('❌ userId manquant'); return; }
    if (!confirm(`Bannir définitivement ${player.username} ?`)) return;
    const res = await adminBanUser(player.userId);
    if (res.error) { flash(`❌ ${res.error}`); return; }
    flash(`🚫 ${player.username} banni.`);
    setSelectedPlayer(null);
    loadPlayers();
  };

  const handleDeletePokemon = async (player: PlayerRow, pokemonIdStr: string, isShiny: boolean) => {
    const pokemonId = parseInt(pokemonIdStr);
    if (isNaN(pokemonId) || pokemonId <= 0) { flash('❌ ID invalide'); return; }
    if (!player.userId) { flash('❌ userId manquant'); return; }
    if (!confirm(`Supprimer le Pokémon #${pokemonId}${isShiny ? ' (shiny)' : ''} de ${player.username} ?`)) return;
    const { data } = await supabase.from('game_saves').select('state').eq('user_id', player.userId).single();
    if (!data) { flash('❌ Save introuvable'); return; }
    const s = data.state as GameState;
    const updated = { ...s };
    if (isShiny) {
      const sc = { ...(updated.shinyCollection ?? {}) };
      delete sc[pokemonId];
      updated.shinyCollection = sc;
    } else {
      const nc = { ...(updated.normalCollection ?? {}) };
      delete nc[pokemonId];
      updated.normalCollection = nc;
    }
    // Remove from party
    if (updated.partyTeam) {
      updated.partyTeam = updated.partyTeam.filter(id => id !== pokemonId);
    }
    // Remove from PC boxes
    if (updated.pcBoxes) {
      updated.pcBoxes = updated.pcBoxes.map(box => box.filter(id => id !== pokemonId));
    }
    const { error } = await supabase.from('game_saves').update({ state: updated }).eq('user_id', player.userId);
    if (error) { flash(`❌ ${error.message}`); return; }
    flash(`✅ Pokémon #${pokemonId} supprimé de ${player.username}`);
    setDeletePokemonId('');
    loadPlayers();
  };

  const handleResetSave = async (player: PlayerRow) => {
    if (!player.userId) { flash('❌ userId manquant'); return; }
    if (!confirm(`Réinitialiser la save de ${player.username} ? Action irréversible !`)) return;
    const { error } = await supabase.from('game_saves').delete().eq('user_id', player.userId);
    if (error) { flash(`❌ ${error.message}`); return; }
    flash(`🔄 Save de ${player.username} supprimée.`);
    setSelectedPlayer(null);
    loadPlayers();
  };

  const sortedPlayers = [...players]
    .filter(p => p.username.toLowerCase().includes(playerSearch.toLowerCase()))
    .sort((a, b) => {
      if (playerSortBy === 'name') return a.username.localeCompare(b.username);
      if (playerSortBy === 'pokemon') return b.normalCount - a.normalCount;
      if (playerSortBy === 'level') return b.avgLevel - a.avgLevel;
      return b.points - a.points;
    });

  // ── Stats ─────────────────────────────────────────────────────────────────
  const loadStats = async () => {
    setStatsLoading(true);
    const { data } = await supabase.from('game_saves').select('state').neq('user_id', '00000000-0000-0000-0000-000000000001');
    if (!data) { setStatsLoading(false); return; }
    const pokemonCounts: Record<number, number> = {};
    let totalCaptures = 0;
    let totalLevels = 0;
    let totalLevelCount = 0;
    const playerCounts: Array<{ username: string; count: number }> = [];
    const shinyHunters: Array<{ username: string; count: number }> = [];

    for (const row of data) {
      const s = row.state as GameState | null;
      if (!s) continue;
      if ((s.username ?? '').toLowerCase() === 'elian') continue;
      const username = s.username ?? '???';
      let playerTotal = 0;
      for (const [idStr, cnt] of Object.entries(s.normalCollection ?? {})) {
        if ((cnt as number) > 0) {
          const id = Number(idStr);
          pokemonCounts[id] = (pokemonCounts[id] ?? 0) + 1;
          totalCaptures++;
          playerTotal++;
        }
      }
      playerCounts.push({ username, count: playerTotal });
      const shinyCount = Object.values(s.shinyCollection ?? {}).filter(v => v > 0).length;
      if (shinyCount > 0) shinyHunters.push({ username, count: shinyCount });
      for (const l of Object.values(s.pokemonLevels ?? {})) {
        totalLevels += (l as { level: number }).level;
        totalLevelCount++;
      }
    }

    const topPokemon = Object.entries(pokemonCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([id, count]) => ({ id: Number(id), count }));

    setStatsData({
      totalPlayers: data.length,
      totalCaptures,
      topPokemon,
      topPlayers: playerCounts.sort((a, b) => b.count - a.count).slice(0, 10),
      avgLevel: totalLevelCount ? Math.round(totalLevels / totalLevelCount) : 0,
      shinyHunters: shinyHunters.sort((a, b) => b.count - a.count).slice(0, 5),
    });
    setStatsLoading(false);
  };

  // ── Pokemon tab helpers ───────────────────────────────────────────────────
  const filtered = GEN1_POKEMON.filter(p =>
    p.name.toLowerCase().includes(filter.toLowerCase()) || String(p.id).includes(filter)
  );

  const giveAll = () => { gameState.adminGiveAllMax(); flash('✅ Tous les Pokémon ajoutés (niveau 100) !'); };
  const giveAllShiny = () => { GEN1_POKEMON.forEach(p => gameState.addCapture(p.id, true, p.rarity)); flash('✨ Tous les Shiny ajoutés !'); };
  const givePokemon = (id: number, isShiny = false) => {
    const p = POKEMON_BY_ID[id]; if (!p) return;
    gameState.addCapture(id, isShiny, p.rarity);
    flash(`✅ ${p.name}${isShiny ? ' ✨' : ''} ajouté !`);
  };
  const addPoints = (amount: number) => { gameState.spendPoints(-amount); flash(`💰 +${amount} pièces !`); };

  // ── Zones tab helpers ─────────────────────────────────────────────────────
  const setZone = (zoneId: string) => {
    gameState.setCurrentZone(zoneId);
    const idx = ZONE_ORDER.indexOf(zoneId);
    for (let i = 0; i < idx; i++) {
      const z = ZONE_BY_ID[ZONE_ORDER[i]];
      const next = ZONE_ORDER[i + 1] ?? null;
      if (z?.boss) gameState.defeatZoneBoss(ZONE_ORDER[i], next);
    }
    flash(`📍 Zone "${ZONE_BY_ID[zoneId]?.name}" débloquée !`);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const TABS: { id: Tab; label: string; emoji: string }[] = [
    { id: 'pokemon', label: 'Pokémon', emoji: '🎮' },
    { id: 'zones',   label: 'Zones',   emoji: '🗺️' },
    { id: 'joueurs', label: 'Joueurs', emoji: '👥' },
    { id: 'stats',   label: 'Stats',   emoji: '📊' },
    { id: 'throne',  label: 'Trône',   emoji: '👑' },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col" style={{ background: '#0a0a14' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 shrink-0" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top,0px))', paddingBottom: '0.75rem', background: '#1a0505', borderBottom: '2px solid #7f1d1d' }}>
        <div className="flex items-center gap-2">
          <span className="text-xl">🔧</span>
          <div>
            <h2 className="text-white font-black text-base leading-none">Panneau Admin</h2>
            <p className="text-red-400 text-xs mt-0.5">Mode développeur</p>
          </div>
        </div>
        <button onClick={onClose} className="text-red-400 hover:text-white text-xl px-2 font-bold">✕</button>
      </div>

      {/* Toast */}
      {feedback && (
        <div className="absolute top-20 left-1/2 z-50 -translate-x-1/2 bg-green-400 text-black font-black px-4 py-2 rounded-xl text-sm shadow-xl whitespace-nowrap">
          {feedback}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex shrink-0 border-b border-slate-800" style={{ background: '#0f0f1a' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 py-2 flex flex-col items-center gap-0.5 transition-colors"
            style={{ color: tab === t.id ? '#f87171' : '#64748b', borderBottom: tab === t.id ? '2px solid #ef4444' : '2px solid transparent', fontSize: '0.55rem', fontWeight: 900 }}
          >
            <span style={{ fontSize: '1rem' }}>{t.emoji}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">

        {/* ── POKÉMON ─────────────────────────────────────────────────────── */}
        {tab === 'pokemon' && (
          <div className="p-4 flex flex-col gap-3">
            {/* My stats */}
            <div className="rounded-xl p-3 grid grid-cols-3 gap-2" style={{ background: '#1e293b', border: '1px solid #334155' }}>
              <div className="flex flex-col items-center">
                <span className="text-white font-black text-lg">{Object.values(gameState.state.normalCollection).filter(v => v > 0).length}</span>
                <span className="text-slate-400 text-xs">Pokémon</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-yellow-400 font-black text-lg">{Object.values(gameState.state.shinyCollection).filter(v => v > 0).length}</span>
                <span className="text-slate-400 text-xs">Shiny</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-green-400 font-black text-lg">{gameState.state.points}</span>
                <span className="text-slate-400 text-xs">Pièces</span>
              </div>
            </div>

            {/* Coins */}
            <div className="rounded-xl p-3" style={{ background: '#1e293b', border: '1px solid #334155' }}>
              <p className="text-slate-300 font-bold text-xs mb-2">💰 Ajouter des pièces</p>
              <div className="flex gap-2 flex-wrap">
                {[100, 500, 1000, 5000, 10000].map(n => (
                  <button key={n} onClick={() => addPoints(n)}
                    className="px-3 py-1.5 rounded-lg font-bold text-xs"
                    style={{ background: '#78350f33', color: '#fbbf24', border: '1px solid #78350f' }}>
                    +{n}
                  </button>
                ))}
              </div>
            </div>

            {/* Bulk */}
            <div className="flex gap-2">
              <button onClick={giveAll} className="flex-1 py-2 rounded-xl font-black text-sm text-black" style={{ background: '#4ade80' }}>✅ Tout donner (nv.100)</button>
              <button onClick={giveAllShiny} className="flex-1 py-2 rounded-xl font-black text-sm text-black" style={{ background: '#fbbf24' }}>✨ Tout Shiny</button>
            </div>
            <button
              onClick={() => { gameState.adminGiveAllTcgCards?.(); flash('🎴 Toutes les cartes TCG données !'); }}
              className="w-full py-2 rounded-xl font-black text-sm text-black"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #1d4ed8)', color: 'white' }}
            >
              🎴 Toutes les cartes TCG
            </button>

            {/* Search + grid */}
            <input
              type="text" placeholder="Rechercher..." value={filter}
              onChange={e => setFilter(e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-sm outline-none"
              style={{ background: '#1e293b', color: 'white', border: '1px solid #475569' }}
            />
            <div className="grid grid-cols-3 gap-2">
              {filtered.map(p => {
                const owned = (gameState.state.normalCollection[p.id] ?? 0) > 0;
                const color = RARITY_COLORS_ADMIN[p.rarity];
                return (
                  <div key={p.id} className="flex flex-col items-center gap-1 p-2 rounded-xl" style={{ background: '#1e293b', border: `1px solid ${owned ? color + '44' : '#1e293b'}` }}>
                    <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`}
                      width={44} height={44} style={{ imageRendering: 'pixelated', filter: owned ? `drop-shadow(0 0 4px ${color})` : 'grayscale(1) brightness(0.4)' }} />
                    <span style={{ fontSize: '0.5rem', color: owned ? '#e2e8f0' : '#475569', textAlign: 'center' }}>{p.name}</span>
                    <div className="flex gap-1 w-full">
                      <button onClick={() => givePokemon(p.id, false)} className="flex-1 rounded-lg py-0.5 font-bold" style={{ background: color + '33', color, fontSize: '0.55rem' }}>+1</button>
                      <button onClick={() => givePokemon(p.id, true)} className="flex-1 rounded-lg py-0.5 font-bold" style={{ background: '#78350f33', color: '#fbbf24', fontSize: '0.55rem' }}>✨</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── ZONES ───────────────────────────────────────────────────────── */}
        {tab === 'zones' && (
          <div className="p-4 flex flex-col gap-2">
            <p className="text-slate-500 text-xs mb-1">Téléporte et débloque instantanément n'importe quelle zone.</p>
            {ZONE_ORDER.filter(z => z !== 'ligue').map(zoneId => {
              const zone = ZONE_BY_ID[zoneId];
              if (!zone) return null;
              const isCurrent = (gameState.state.zoneProgress?.currentZoneId ?? 'zone1') === zoneId;
              const bossDefeated = !!gameState.state.zoneProgress?.bossDefeated?.[zoneId];
              return (
                <div key={zoneId}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border text-left cursor-pointer"
                  style={{ borderColor: isCurrent ? '#ef4444' : '#1e293b', background: isCurrent ? '#450a0a' : '#0f172a' }}
                  onClick={() => setZone(zoneId)}>
                  <span className="text-xl">{isCurrent ? '📍' : bossDefeated ? '✅' : '🔒'}</span>
                  <div className="flex-1">
                    <div className="text-white font-bold text-sm">{zone.name}</div>
                    <div className="text-slate-500 text-xs">{zone.description}</div>
                  </div>
                  {bossDefeated && (
                    <button onClick={e => { e.stopPropagation(); gameState.resetBossDefeated(zoneId); flash(`🔄 Boss de ${zone.name} réinitialisé`); }}
                      className="text-xs font-bold px-2 py-1 rounded-lg shrink-0"
                      style={{ background: '#7c2d1233', color: '#fb923c', border: '1px solid #7c2d1266' }}>
                      🔄 Reset
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── JOUEURS ─────────────────────────────────────────────────────── */}
        {tab === 'joueurs' && (
          <div className="p-4 flex flex-col gap-3">
            {selectedPlayer ? (
              // Player detail
              <div className="flex flex-col gap-3">
                <button onClick={() => setSelectedPlayer(null)} className="flex items-center gap-2 text-slate-400 text-sm font-bold">← Retour</button>
                <div className="rounded-xl p-4" style={{ background: '#1e293b', border: '1px solid #334155' }}>
                  <div className="font-black text-white text-lg mb-1">{selectedPlayer.username}</div>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div style={{ color: '#94a3b8' }}>Pokémon : <span className="text-white font-bold">{selectedPlayer.normalCount}</span></div>
                    <div style={{ color: '#94a3b8' }}>Shiny : <span className="text-yellow-400 font-bold">{selectedPlayer.shinyCount}</span></div>
                    <div style={{ color: '#94a3b8' }}>Niv. moyen : <span className="text-green-400 font-bold">{selectedPlayer.avgLevel}</span></div>
                    <div style={{ color: '#94a3b8' }}>Pièces : <span className="text-yellow-400 font-bold">{selectedPlayer.points}</span></div>
                    <div style={{ color: '#94a3b8' }}>Zone : <span className="text-blue-400 font-bold">{selectedPlayer.zone}</span></div>
                    {selectedPlayer.updatedAt && (
                      <div style={{ color: '#94a3b8' }}>Actif : <span className="text-white font-bold">{new Date(selectedPlayer.updatedAt).toLocaleDateString('fr-FR')}</span></div>
                    )}
                  </div>

                  {/* Give coins */}
                  <div className="mb-3">
                    <p className="text-slate-400 text-xs font-bold mb-1">💰 Donner des pièces</p>
                    <div className="flex gap-2">
                      <input type="number" value={giveCoinsAmt} onChange={e => setGiveCoinsAmt(e.target.value)}
                        className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                        style={{ background: '#0f172a', color: 'white', border: '1px solid #334155' }} />
                      <button onClick={() => handleGiveCoins(selectedPlayer)}
                        className="px-4 py-2 rounded-lg font-bold text-sm text-black"
                        style={{ background: '#fbbf24' }}>Envoyer</button>
                    </div>
                  </div>

                  {/* Delete Pokémon */}
                  <div className="mb-3">
                    <p className="text-slate-400 text-xs font-bold mb-1">🗑️ Supprimer un Pokémon</p>
                    <div className="flex gap-2 mb-1">
                      <input type="number" value={deletePokemonId} onChange={e => setDeletePokemonId(e.target.value)}
                        placeholder="ID Pokémon"
                        className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                        style={{ background: '#0f172a', color: 'white', border: '1px solid #334155' }} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleDeletePokemon(selectedPlayer, deletePokemonId, false)}
                        className="flex-1 py-2 rounded-lg text-xs font-bold"
                        style={{ background: '#1e3a5f', color: '#93c5fd', border: '1px solid #1d4ed8' }}>
                        Supprimer normal
                      </button>
                      <button onClick={() => handleDeletePokemon(selectedPlayer, deletePokemonId, true)}
                        className="flex-1 py-2 rounded-lg text-xs font-bold"
                        style={{ background: '#78350f', color: '#fde68a', border: '1px solid #d97706' }}>
                        Supprimer shiny
                      </button>
                    </div>
                  </div>

                  {/* Danger zone */}
                  <div className="rounded-lg p-3" style={{ background: '#450a0a', border: '1px solid #7f1d1d' }}>
                    <p className="text-red-400 text-xs font-black mb-2">⚠️ Zone dangereuse</p>
                    <div className="flex gap-2">
                      <button onClick={() => handleResetSave(selectedPlayer)}
                        className="flex-1 py-2 rounded-lg text-xs font-bold"
                        style={{ background: '#7f1d1d', color: '#fca5a5' }}>
                        🔄 Reset save
                      </button>
                      <button onClick={() => handleBan(selectedPlayer)}
                        className="flex-1 py-2 rounded-lg text-xs font-bold"
                        style={{ background: '#3b0a0a', color: '#f87171', border: '1px solid #7f1d1d' }}>
                        🚫 Bannir
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Player list
              <>
                <div className="flex gap-2">
                  <input type="text" placeholder="Rechercher un joueur..." value={playerSearch}
                    onChange={e => setPlayerSearch(e.target.value)}
                    className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
                    style={{ background: '#1e293b', color: 'white', border: '1px solid #475569' }} />
                  <button onClick={loadPlayers} className="px-3 py-2 rounded-xl text-sm font-bold"
                    style={{ background: '#1e293b', color: '#94a3b8', border: '1px solid #475569' }}>↻</button>
                </div>

                <div className="flex gap-1">
                  {(['pokemon', 'level', 'coins', 'name'] as const).map(s => (
                    <button key={s} onClick={() => setPlayerSortBy(s)}
                      className="flex-1 py-1 rounded-lg text-xs font-bold"
                      style={{ background: playerSortBy === s ? '#1d4ed8' : '#1e293b', color: playerSortBy === s ? 'white' : '#64748b' }}>
                      {s === 'pokemon' ? '🎮' : s === 'level' ? '⬆️' : s === 'coins' ? '💰' : '🔤'}
                    </button>
                  ))}
                </div>

                {playersLoading ? (
                  <div className="text-slate-400 text-sm animate-pulse text-center py-8">Chargement…</div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {sortedPlayers.map(p => (
                      <button key={p.username} onClick={() => setSelectedPlayer(p)}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl text-left"
                        style={{ background: '#0f172a', border: '1px solid #1e293b' }}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm"
                          style={{ background: '#1e3a5f', color: '#93c5fd' }}>
                          {p.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-bold text-sm truncate">{p.username}</div>
                          <div className="text-slate-500 text-xs">{p.normalCount} Pokémon · Niv.{p.avgLevel} moy.</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-yellow-400 font-bold text-xs">{p.points} 🪙</div>
                          {p.shinyCount > 0 && <div className="text-yellow-300 text-xs">✨ {p.shinyCount}</div>}
                        </div>
                      </button>
                    ))}
                    {sortedPlayers.length === 0 && !playersLoading && (
                      <div className="text-slate-500 text-sm text-center py-8">Aucun joueur trouvé</div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── STATS ───────────────────────────────────────────────────────── */}
        {tab === 'stats' && (
          <div className="p-4 flex flex-col gap-3">
            {statsLoading ? (
              <div className="text-slate-400 text-sm animate-pulse text-center py-8">Calcul des statistiques…</div>
            ) : !statsData ? (
              <button onClick={loadStats} className="py-3 rounded-xl font-bold text-sm" style={{ background: '#1e293b', color: '#94a3b8' }}>Charger les stats</button>
            ) : (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Joueurs', value: statsData.totalPlayers, color: '#60a5fa' },
                    { label: 'Captures totales', value: statsData.totalCaptures, color: '#4ade80' },
                    { label: 'Niv. moyen global', value: statsData.avgLevel, color: '#a78bfa' },
                    { label: 'Pokémon uniques captés', value: statsData.topPokemon.length, color: '#fbbf24' },
                  ].map(c => (
                    <div key={c.label} className="rounded-xl p-3 flex flex-col items-center" style={{ background: '#0f172a', border: `1px solid ${c.color}33` }}>
                      <span className="font-black text-2xl" style={{ color: c.color }}>{c.value}</span>
                      <span className="text-slate-400 text-xs text-center">{c.label}</span>
                    </div>
                  ))}
                </div>

                {/* Top Pokémon */}
                <div className="rounded-xl p-3" style={{ background: '#0f172a', border: '1px solid #1e293b' }}>
                  <p className="text-white font-black text-sm mb-2">🏆 Pokémon les plus capturés</p>
                  <div className="flex flex-col gap-1">
                    {statsData.topPokemon.map((entry, i) => {
                      const p = POKEMON_BY_ID[entry.id];
                      return (
                        <div key={entry.id} className="flex items-center gap-2">
                          <span className="text-slate-500 text-xs w-4">{i + 1}.</span>
                          <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${entry.id}.png`}
                            width={24} height={24} style={{ imageRendering: 'pixelated' }} />
                          <span className="text-slate-300 text-xs flex-1">{p?.name ?? `#${entry.id}`}</span>
                          <span className="text-green-400 font-bold text-xs">{entry.count} joueurs</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Top players */}
                <div className="rounded-xl p-3" style={{ background: '#0f172a', border: '1px solid #1e293b' }}>
                  <p className="text-white font-black text-sm mb-2">👥 Top joueurs (collection)</p>
                  <div className="flex flex-col gap-1">
                    {statsData.topPlayers.map((p, i) => (
                      <div key={p.username} className="flex items-center gap-2">
                        <span className="text-slate-500 text-xs w-4">{i + 1}.</span>
                        <span className="text-slate-300 text-xs flex-1 font-bold">{p.username}</span>
                        <span className="text-blue-400 font-bold text-xs">{p.count} Pokémon</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shiny hunters */}
                {statsData.shinyHunters.length > 0 && (
                  <div className="rounded-xl p-3" style={{ background: '#0f172a', border: '1px solid #78350f44' }}>
                    <p className="text-white font-black text-sm mb-2">✨ Chasseurs de Shiny</p>
                    <div className="flex flex-col gap-1">
                      {statsData.shinyHunters.map((p, i) => (
                        <div key={p.username} className="flex items-center gap-2">
                          <span className="text-slate-500 text-xs w-4">{i + 1}.</span>
                          <span className="text-slate-300 text-xs flex-1 font-bold">{p.username}</span>
                          <span className="text-yellow-400 font-bold text-xs">✨ {p.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button onClick={loadStats} className="py-2 rounded-xl text-xs font-bold"
                  style={{ background: '#1e293b', color: '#64748b' }}>↻ Actualiser</button>
              </>
            )}
          </div>
        )}

        {/* ── TRÔNE ───────────────────────────────────────────────────────── */}
        {tab === 'throne' && (
          <div className="p-4 flex flex-col gap-3">
            {throneLoading ? (
              <div className="text-yellow-400 text-sm animate-pulse text-center py-8">Chargement…</div>
            ) : (
              <>
                {/* Current champion */}
                <div className="rounded-xl p-4" style={{ background: '#0f172a', border: '1px solid #78350f66' }}>
                  <p className="font-black text-sm mb-2" style={{ color: '#fbbf24' }}>👑 Champion actuel</p>
                  {throneData?.champion ? (
                    <div>
                      <p className="text-white font-bold text-base">{throneData.champion.username}</p>
                      <p className="text-slate-400 text-xs mb-2">{throneData.champion.since === 'Depuis toujours' ? 'Depuis toujours' : new Date(throneData.champion.since).toLocaleString('fr-FR')}</p>
                      <div className="flex gap-2 mb-3">
                        {throneData.champion.team.map((m, i) => (
                          <img key={i} src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${m.pokemonId}.png`}
                            alt="" width={36} height={36} style={{ imageRendering: 'pixelated' }} draggable={false} />
                        ))}
                      </div>
                      {throneData.champion.since !== 'Depuis toujours' && (
                        <button onClick={async () => {
                          const now = new Date().toISOString();
                          const newData: ThroneData = { ...throneData, champion: { ...throneData.champion!, since: now } };
                          const err = await throneWrite(newData);
                          if (!err) { setThroneData(newData); flash('⏱️ Temps réinitialisé'); }
                          else flash('Erreur: ' + String(err));
                        }} className="text-xs px-3 py-1 rounded-lg font-bold"
                          style={{ background: '#ef444422', color: '#f87171', border: '1px solid #ef444444' }}>
                          ⏱️ Réinitialiser le compteur
                        </button>
                      )}
                    </div>
                  ) : <p className="text-slate-500 text-sm">Aucun champion défini</p>}
                </div>

                {/* Set champion */}
                <div className="rounded-xl p-4" style={{ background: '#0f172a', border: '1px solid #334155' }}>
                  <p className="text-white font-black text-sm mb-3">⚔️ Définir un champion</p>
                  <div className="flex gap-2 mb-3">
                    <input value={manualUsername} onChange={e => setManualUsername(e.target.value)}
                      placeholder="Nom d'utilisateur..."
                      className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                      style={{ background: '#1e293b', color: 'white', border: '1px solid #475569' }} />
                    <button onClick={() => manualUsername.trim() && setManualChampion(manualUsername.trim())}
                      disabled={!manualUsername.trim()}
                      className="px-3 py-2 rounded-lg text-sm font-bold disabled:opacity-40"
                      style={{ background: 'linear-gradient(135deg,#f59e0b,#ef7c00)', color: 'white' }}>
                      👑 OK
                    </button>
                  </div>
                  {players.length > 0 && (
                    <div className="flex flex-col gap-1 max-h-44 overflow-y-auto">
                      {players.map(p => (
                        <button key={p.username} onClick={() => setManualChampion(p.username)}
                          className="flex items-center justify-between px-3 py-2 rounded-xl border text-left"
                          style={{ borderColor: throneData?.champion?.username === p.username ? '#f59e0b' : '#1e293b', background: throneData?.champion?.username === p.username ? '#78350f33' : '#1e293b' }}>
                          <span className="font-bold text-sm text-white">{p.username}</span>
                          {throneData?.champion?.username === p.username && <span className="text-yellow-400 text-xs font-black">👑</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Records */}
                <div className="rounded-xl p-4" style={{ background: '#0f172a', border: '1px solid #334155' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white font-black text-sm">📋 Historique des règnes</p>
                    <button onClick={loadThrone} className="text-slate-500 text-xs hover:text-white">↻</button>
                  </div>
                  {(throneData?.records ?? []).length === 0 ? (
                    <p className="text-slate-500 text-xs">Aucun règne enregistré.</p>
                  ) : (
                    <div className="flex flex-col gap-1 max-h-52 overflow-y-auto">
                      {[...(throneData?.records ?? [])].reverse().map((r, i, arr) => (
                        <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: '#1e293b' }}>
                          <div>
                            <span className="text-white text-sm font-bold">{r.username}</span>
                            <span className="text-slate-400 text-xs ml-2">{fmtDuration(r.duration)}</span>
                          </div>
                          <button onClick={() => deleteRecord(arr.length - 1 - i)} className="text-red-500 hover:text-red-400 text-sm px-2">🗑️</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
