/**
 * PvpTeamSelect — 3 modes de sélection d'équipe avant un combat PvP.
 *
 * Mode 1 "Équipe Favorite"  : soumet l'équipe marquée ⭐ (masqué si aucune équipe favorite).
 * Mode 2 "Composer"         : grille collection. Clic = sélectionner.
 *                             Appui long (500 ms) = fiche stats + éditeur d'attaques (comme Collection).
 * Mode 3 "Équipes de prêt"  : 3 équipes pré-construites niveau 100.
 *
 * Contrainte de prêt : si l'adversaire choisit une équipe de prêt, l'autre doit en faire autant.
 * Nécessite la colonne `rental_required BOOLEAN DEFAULT false` sur pvp_sessions.
 */
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { ShinySprite } from './ShinySprite';
import { POKEMON_BY_ID } from '../data/gen1';
import { POKEMON_TYPE, TYPE_COLORS } from '../data/pokemonTypes';
import type { PokemonType } from '../data/pokemonTypes';
import { RARITY_COLORS } from '../types';
import type { Rarity } from '../types';
import {
  calcMaxHp, calcAttack, calcDefense, calcSpAttack, calcSpDefense, calcSpeed,
} from '../data/combatEngine';
import { getAvailableMoves } from '../data/gen1Movepools';
import { MOVES } from '../data/gen1Moves';
import type { PokemonInstanceData } from '../types';
import type { TeamMember } from './TeamBuilder';
import { supabase } from '../lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

interface OwnedPokemon {
  pokemonId: number;
  isShiny: boolean;
  level: number;
  xp: number;
  instance?: PokemonInstanceData;
}

interface SavedTeam {
  id: string;
  name: string;
  members: TeamMember[];
}

interface Props {
  ownedPokemon: OwnedPokemon[];
  savedTeams: SavedTeam[];
  favoriteTeamId?: string;
  opponentName: string;
  onConfirm: (team: TeamMember[]) => void;
  onCancel: () => void;
  pokemonCustomMoves?: Record<number, string[]>;
  onSaveCustomMoves?: (pokemonId: number, slugs: string[]) => void;
  sessionId?: string;
  isHost?: boolean;
}

type SelectMode = null | 'compose' | 'rental';
type ComposeTab = 'collection' | 'teams';

const RARITY_ORDER: Record<string, number> = {
  commun: 0, peu_commun: 1, rare: 2, elite: 3, legendaire: 4,
};

// ── Équipes de prêt (niveau 100) ──────────────────────────────────────────────

interface RentalTeamDef {
  name: string;
  emoji: string;
  description: string;
  color: string;
  members: { pokemonId: number }[];
}

const RENTAL_TEAMS: RentalTeamDef[] = [
  {
    name: 'Équilibre Tempête',
    emoji: '🌩️',
    description: 'Feu · Eau · Plante — le trio classique',
    color: '#f97316',
    members: [{ pokemonId: 6 }, { pokemonId: 9 }, { pokemonId: 3 }],
  },
  {
    name: 'Choc Électrique',
    emoji: '⚡',
    description: 'Vitesse · Spectre · Roche',
    color: '#facc15',
    members: [{ pokemonId: 135 }, { pokemonId: 94 }, { pokemonId: 76 }],
  },
  {
    name: 'Force Mentale',
    emoji: '🔮',
    description: 'Psy · Eau · Feu — puissance maximale',
    color: '#a855f7',
    members: [{ pokemonId: 65 }, { pokemonId: 130 }, { pokemonId: 59 }],
  },
];

function buildRentalTeam(def: RentalTeamDef): TeamMember[] {
  return def.members.map(({ pokemonId }) => {
    const hp = calcMaxHp(pokemonId, 100, undefined);
    return { pokemonId, isShiny: false, level: 100, xp: 0, currentHp: hp, maxHp: hp };
  });
}

// ── Modal détails + éditeur d'attaques ────────────────────────────────────────

interface DetailModalProps {
  mon: OwnedPokemon;
  customMoves?: string[];
  onClose: () => void;
  onSaveCustomMoves?: (pokemonId: number, slugs: string[]) => void;
}

function PokemonDetailModal({ mon, customMoves, onClose, onSaveCustomMoves }: DetailModalProps) {
  const p = POKEMON_BY_ID[mon.pokemonId];
  const types = (POKEMON_TYPE[mon.pokemonId] ?? ['normal']) as PokemonType[];
  const inst = mon.instance;
  const hp  = calcMaxHp(mon.pokemonId, mon.level, inst);
  const atk = calcAttack(mon.pokemonId, mon.level, inst);
  const def = calcDefense(mon.pokemonId, mon.level, inst);
  const spa = calcSpAttack(mon.pokemonId, mon.level, inst);
  const spd = calcSpDefense(mon.pokemonId, mon.level, inst);
  const spe = calcSpeed(mon.pokemonId, mon.level, inst);
  const rarity = (p?.rarity ?? 'commun') as Rarity;
  const rarityColor = RARITY_COLORS[rarity];
  const [tab, setTab] = useState<'stats' | 'moves'>('stats');

  const availablePool = getAvailableMoves(mon.pokemonId, mon.level);
  const currentSlugs = customMoves ?? availablePool.slice(0, 4);
  const [editing, setEditing] = useState(false);
  const [pendingMoves, setPendingMoves] = useState<string[]>([...currentSlugs]);

  const stats = [
    { label: 'PV',      val: hp  },
    { label: 'ATT',     val: atk },
    { label: 'DEF',     val: def },
    { label: 'ATK SPÉ', val: spa },
    { label: 'DÉF SPÉ', val: spd },
    { label: 'VIT',     val: spe },
  ];
  const maxStat = Math.max(...stats.map(s => s.val), 1);

  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/80 px-3" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden flex flex-col"
        style={{ background: '#0f172a', border: `2px solid ${rarityColor}`, boxShadow: `0 0 32px ${rarityColor}44`, maxHeight: '85dvh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-2 shrink-0">
          <ShinySprite pokemonId={mon.pokemonId} isShiny={mon.isShiny} width={64} height={64}
            style={{ filter: `drop-shadow(0 0 8px ${rarityColor})` }} />
          <div className="flex-1 min-w-0">
            <div className="text-white font-black text-base truncate">{p?.name ?? '???'}</div>
            <div className="text-slate-400 text-xs">Niveau {mon.level}</div>
            <div className="flex gap-1 flex-wrap mt-1">
              {types.map(t => (
                <span key={t} className="text-white font-bold rounded px-1.5 py-0.5"
                  style={{ background: TYPE_COLORS[t] ?? '#888', fontSize: '0.5rem' }}>
                  {t.toUpperCase()}
                </span>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-1 text-lg self-start">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 shrink-0">
          {(['stats', 'moves'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2 text-xs font-bold transition-colors"
              style={{ color: tab === t ? rarityColor : '#64748b', borderBottom: tab === t ? `2px solid ${rarityColor}` : '2px solid transparent' }}>
              {t === 'stats' ? '📊 Stats' : '⚔️ Attaques'}
            </button>
          ))}
        </div>

        {/* Stats tab */}
        {tab === 'stats' && (
          <div className="px-4 py-3 flex flex-col gap-1.5 overflow-y-auto">
            {stats.map(({ label, val }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="text-slate-400 text-xs w-16 shrink-0">{label}</span>
                <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div className="h-2 rounded-full"
                    style={{ width: `${Math.min(100, (val / maxStat) * 100)}%`, background: `linear-gradient(90deg, ${rarityColor}99, ${rarityColor})` }} />
                </div>
                <span className="text-white font-bold text-xs w-8 text-right">{val}</span>
              </div>
            ))}
          </div>
        )}

        {/* Moves tab */}
        {tab === 'moves' && (
          <div className="px-4 py-3 flex flex-col gap-2 overflow-y-auto flex-1">
            <div className="flex items-center justify-between mb-1 shrink-0">
              <span className="text-slate-400 text-xs font-bold">Attaques actives</span>
              {onSaveCustomMoves && !editing && (
                <button className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: '#3b82f633', color: '#60a5fa', border: '1px solid #3b82f655' }}
                  onClick={() => { setPendingMoves([...currentSlugs]); setEditing(true); }}>
                  Modifier
                </button>
              )}
              {editing && (
                <div className="flex gap-1.5">
                  <button className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: '#ef444433', color: '#f87171', border: '1px solid #ef444455' }}
                    onClick={() => setEditing(false)}>Annuler</button>
                  <button className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: '#22c55e33', color: '#4ade80', border: '1px solid #22c55e55', opacity: pendingMoves.length === 4 ? 1 : 0.4 }}
                    onClick={() => {
                      if (pendingMoves.length === 4) {
                        onSaveCustomMoves?.(mon.pokemonId, pendingMoves);
                        setEditing(false);
                      }
                    }}>Sauvegarder</button>
                </div>
              )}
            </div>

            {!editing ? (
              <div className="flex flex-col gap-1.5">
                {currentSlugs.map(slug => {
                  const m = MOVES[slug];
                  if (!m) return null;
                  const tc = TYPE_COLORS[m.type as PokemonType] ?? '#475569';
                  return (
                    <div key={slug} className="rounded-lg px-2 py-1.5" style={{ background: `${tc}18`, border: `1px solid ${tc}44` }}>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold rounded px-1.5 py-0.5 shrink-0" style={{ background: tc, fontSize: '0.4rem' }}>{m.type.toUpperCase()}</span>
                        <span className="text-white text-xs font-bold flex-1">{m.name}</span>
                        {(m as { power?: number }).power && (m as { power?: number }).power! > 0 && <span className="text-slate-300 text-xs font-black shrink-0">{(m as { power?: number }).power}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div>
                <div className="text-slate-500 text-xs mb-2">{pendingMoves.length}/4 sélectionnées</div>
                <div className="flex flex-col gap-1.5 overflow-y-auto" style={{ maxHeight: '40dvh' }}>
                  {availablePool.map(slug => {
                    const m = MOVES[slug];
                    if (!m) return null;
                    const isSelected = pendingMoves.includes(slug);
                    const tc = TYPE_COLORS[m.type as PokemonType] ?? '#475569';
                    return (
                      <button key={slug} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left"
                        style={{ background: isSelected ? '#3b82f622' : '#ffffff06', border: `1px solid ${isSelected ? '#3b82f6' : '#ffffff11'}` }}
                        onClick={() => {
                          if (isSelected) setPendingMoves(p => p.filter(s => s !== slug));
                          else if (pendingMoves.length < 4) setPendingMoves(p => [...p, slug]);
                        }}>
                        <span className="text-white font-bold rounded px-1.5 py-0.5 shrink-0" style={{ background: tc, fontSize: '0.4rem' }}>{m.type.toUpperCase()}</span>
                        <span className="text-white text-xs font-bold flex-1">{m.name}</span>
                        {isSelected && <span className="text-blue-400 text-xs shrink-0">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export function PvpTeamSelect({
  ownedPokemon, savedTeams, favoriteTeamId, opponentName,
  onConfirm, onCancel,
  pokemonCustomMoves, onSaveCustomMoves,
  sessionId, isHost: _isHost,
}: Props) {
  const [mode, setMode] = useState<SelectMode>(null);
  const [composeTab, setComposeTab] = useState<ComposeTab>('collection');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [detailMon, setDetailMon] = useState<OwnedPokemon | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  // rental_required: true if opponent already picked a rental team
  const [rentalRequired, setRentalRequired] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);

  const favoriteTeam = favoriteTeamId ? savedTeams.find(t => t.id === favoriteTeamId) : null;

  // Subscribe to session to detect rental_required from opponent
  useEffect(() => {
    if (!sessionId) return;
    const chan = supabase
      .channel(`pvp_ts_rental_${sessionId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pvp_sessions', filter: `id=eq.${sessionId}` },
        (payload) => {
          const updated = payload.new as Record<string, unknown>;
          if (updated.rental_required === true) setRentalRequired(true);
        })
      .subscribe();
    return () => { supabase.removeChannel(chan); };
  }, [sessionId]);

  const sorted = useMemo(() => [...ownedPokemon].sort((a, b) => {
    const pa = POKEMON_BY_ID[a.pokemonId];
    const pb = POKEMON_BY_ID[b.pokemonId];
    const ra = RARITY_ORDER[pa?.rarity ?? 'commun'] ?? 0;
    const rb = RARITY_ORDER[pb?.rarity ?? 'commun'] ?? 0;
    if (rb !== ra) return rb - ra;
    return b.level - a.level;
  }), [ownedPokemon]);

  const toggleSelect = useCallback((pokemonId: number) => {
    setSelectedIds(prev => {
      if (prev.includes(pokemonId)) return prev.filter(id => id !== pokemonId);
      if (prev.length >= 3) return prev;
      return [...prev, pokemonId];
    });
  }, []);

  const startLongPress = useCallback((mon: OwnedPokemon) => {
    longPressFired.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      setDetailMon(mon);
    }, 500);
  }, []);

  const endLongPress = useCallback((pokemonId: number) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (!longPressFired.current) toggleSelect(pokemonId);
    longPressFired.current = false;
  }, [toggleSelect]);

  const confirmTeam = useCallback(async (team: TeamMember[], isRental = false) => {
    if (isRental && sessionId) {
      await supabase.from('pvp_sessions').update({ rental_required: true }).eq('id', sessionId);
    }
    setConfirmed(true);
    onConfirm(team);
  }, [onConfirm, sessionId]);

  const confirmSelection = useCallback(() => {
    const members: TeamMember[] = selectedIds.map(id => {
      const mon = ownedPokemon.find(m => m.pokemonId === id)!;
      return {
        pokemonId: id,
        isShiny: mon.isShiny,
        level: mon.level,
        xp: mon.xp,
        currentHp: calcMaxHp(id, mon.level, mon.instance),
        maxHp: calcMaxHp(id, mon.level, mon.instance),
      };
    });
    confirmTeam(members, false);
  }, [selectedIds, ownedPokemon, confirmTeam]);

  // ── Écran d'attente après confirmation ────────────────────────────────────

  if (confirmed) {
    return (
      <div className="fixed inset-0 z-[700] flex flex-col items-center justify-center bg-slate-950 gap-6"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="text-5xl" style={{ animation: 'pvp-blink 1.2s ease-in-out infinite' }}>⚔️</div>
        <div className="text-white font-black text-xl">Équipe confirmée !</div>
        <div className="text-slate-400 text-sm text-center px-8">
          En attente que <span className="text-yellow-300 font-bold">{opponentName}</span> choisisse son équipe…
        </div>
        <div className="flex gap-1 mt-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-slate-600"
              style={{ animation: `pvp-dot-bounce 1.2s ${i * 0.2}s ease-in-out infinite` }} />
          ))}
        </div>
      </div>
    );
  }

  // ── Écran de sélection de mode ─────────────────────────────────────────────

  if (mode === null) {
    return (
      <div className="fixed inset-0 z-[700] flex flex-col bg-slate-950"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="shrink-0 px-4 pt-5 pb-4 border-b border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <button onClick={onCancel} className="text-slate-400 text-sm py-1">← Annuler</button>
            <span className="text-slate-500 text-xs">vs {opponentName}</span>
          </div>
          <div className="text-white font-black text-2xl">⚔️ Combat PvP</div>
          <div className="text-slate-400 text-sm mt-1">
            {rentalRequired
              ? <span className="text-yellow-400 font-bold">⚠️ L'adversaire a choisi une équipe de prêt — vous devez en faire autant.</span>
              : 'Comment voulez-vous composer votre équipe ?'}
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center gap-4 px-5 py-6">

          {/* Bouton 1 — Équipe Favorite (caché si aucune équipe favorite) */}
          {favoriteTeam && !rentalRequired && (
            <button
              onClick={() => confirmTeam(favoriteTeam.members.slice(0, 3), false)}
              className="relative rounded-2xl p-5 text-left transition-transform active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #1e3a1e, #14532d)', border: '2px solid #22c55e', boxShadow: '0 0 20px #22c55e22' }}
            >
              <div className="flex items-center gap-4">
                <div className="text-4xl">⭐</div>
                <div className="flex-1">
                  <div className="text-white font-black text-lg">Équipe Favorite</div>
                  <div className="text-green-300 text-sm mt-0.5">
                    {favoriteTeam.name} — {favoriteTeam.members.slice(0, 3).map(m => POKEMON_BY_ID[m.pokemonId]?.name).join(', ')}
                  </div>
                </div>
                <div className="text-green-400 text-xl">›</div>
              </div>
              <div className="flex gap-2 mt-3">
                {favoriteTeam.members.slice(0, 3).map((m, i) => {
                  const rarity = (POKEMON_BY_ID[m.pokemonId]?.rarity ?? 'commun') as Rarity;
                  return (
                    <div key={i} className="flex flex-col items-center">
                      <ShinySprite pokemonId={m.pokemonId} isShiny={m.isShiny ?? false} width={44} height={44}
                        style={{ filter: `drop-shadow(0 0 4px ${RARITY_COLORS[rarity]})` }} />
                      <span className="text-slate-400" style={{ fontSize: '0.45rem' }}>Nv.{m.level}</span>
                    </div>
                  );
                })}
              </div>
            </button>
          )}

          {/* Bouton 2 — Composer (désactivé si rental requis) */}
          {!rentalRequired && (
            <button
              onClick={() => { setMode('compose'); setComposeTab('collection'); }}
              className="relative rounded-2xl p-5 text-left transition-transform active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81)', border: '2px solid #6366f1', boxShadow: '0 0 20px #6366f122' }}
            >
              <div className="flex items-center gap-4">
                <div className="text-4xl">📚</div>
                <div className="flex-1">
                  <div className="text-white font-black text-lg">Composer mon équipe</div>
                  <div className="text-indigo-300 text-sm mt-0.5">
                    {ownedPokemon.length} Pokémon · Appui long = stats + attaques
                  </div>
                </div>
                <div className="text-indigo-400 text-xl">›</div>
              </div>
            </button>
          )}

          {/* Bouton 3 — Équipes de prêt */}
          <button
            onClick={() => setMode('rental')}
            className="relative rounded-2xl p-5 text-left transition-transform active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #2d1b5e, #4c1d95)', border: '2px solid #a855f7', boxShadow: '0 0 20px #a855f722' }}
          >
            <div className="flex items-center gap-4">
              <div className="text-4xl">🎴</div>
              <div className="flex-1">
                <div className="text-white font-black text-lg">Équipe de prêt</div>
                <div className="text-purple-300 text-sm mt-0.5">
                  3 équipes · Niveau 100 · Force égale garantie
                </div>
              </div>
              <div className="text-purple-400 text-xl">›</div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // ── Mode "Équipes de prêt" ────────────────────────────────────────────────

  if (mode === 'rental') {
    return (
      <div className="fixed inset-0 z-[700] flex flex-col bg-slate-950"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="shrink-0 px-4 pt-4 pb-3 border-b border-slate-800">
          <div className="flex items-center justify-between mb-1">
            <button onClick={() => setMode(null)} className="text-slate-400 text-sm py-1">← Retour</button>
            <span className="text-slate-500 text-xs">vs {opponentName}</span>
          </div>
          <div className="text-white font-black text-xl">🎴 Équipes de prêt</div>
          <div className="text-slate-400 text-sm mt-0.5">Tous les Pokémon sont au Niveau 100</div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-5">
          {RENTAL_TEAMS.map((teamDef, ti) => {
            const team = buildRentalTeam(teamDef);
            return (
              <div key={ti} className="rounded-2xl"
                style={{ border: `2px solid ${teamDef.color}`, boxShadow: `0 0 16px ${teamDef.color}22`, background: `${teamDef.color}0a` }}>

                {/* En-tête */}
                <div className="px-4 pt-3 pb-2">
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: '1.4rem' }}>{teamDef.emoji}</span>
                    <div>
                      <div className="text-white font-black text-sm">{teamDef.name}</div>
                      <div className="text-slate-400" style={{ fontSize: '0.65rem' }}>{teamDef.description}</div>
                    </div>
                    <span className="ml-auto text-xs font-black px-2 py-0.5 rounded-full"
                      style={{ background: `${teamDef.color}33`, color: teamDef.color, border: `1px solid ${teamDef.color}66` }}>
                      Nv.100
                    </span>
                  </div>
                </div>

                {/* Pokémon — ligne horizontale avec scroll si besoin */}
                <div className="flex gap-2 px-4 pb-3">
                  {team.map((m, i) => {
                    const p = POKEMON_BY_ID[m.pokemonId];
                    const rarity = (p?.rarity ?? 'commun') as Rarity;
                    const types = (POKEMON_TYPE[m.pokemonId] ?? ['normal']) as PokemonType[];
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center rounded-xl py-2"
                        style={{ background: '#0f172a', border: `1px solid ${RARITY_COLORS[rarity]}44`, minWidth: 0 }}>
                        <div style={{ width: 56, height: 56, flexShrink: 0 }}>
                          <ShinySprite pokemonId={m.pokemonId} isShiny={false} width={56} height={56}
                            style={{ filter: `drop-shadow(0 0 5px ${RARITY_COLORS[rarity]})` }} />
                        </div>
                        <div className="text-white font-bold text-center leading-tight mt-1 px-1" style={{ fontSize: '0.52rem' }}>
                          {p?.name ?? '???'}
                        </div>
                        <div className="flex gap-0.5 mt-1 flex-wrap justify-center px-1">
                          {types.map(t => (
                            <span key={t} className="text-white rounded px-1" style={{ background: TYPE_COLORS[t] ?? '#888', fontSize: '0.35rem', fontWeight: 700 }}>
                              {t.toUpperCase()}
                            </span>
                          ))}
                        </div>
                        <div className="mt-1.5 grid grid-cols-2 gap-x-2 px-2 w-full" style={{ fontSize: '0.38rem' }}>
                          <span className="text-slate-500 text-right">PV</span><span className="text-green-400 font-bold">{m.maxHp}</span>
                          <span className="text-slate-500 text-right">ATK</span><span className="text-orange-400 font-bold">{calcAttack(m.pokemonId, 100, undefined)}</span>
                          <span className="text-slate-500 text-right">VIT</span><span className="text-blue-400 font-bold">{calcSpeed(m.pokemonId, 100, undefined)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bouton */}
                <div className="px-4 pb-4">
                  <button
                    className="w-full py-3 rounded-xl font-black text-white text-sm active:scale-[0.98]"
                    style={{ background: teamDef.color, boxShadow: `0 0 12px ${teamDef.color}55` }}
                    onPointerUp={() => confirmTeam(team, true)}
                  >
                    {teamDef.emoji} Choisir cette équipe
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Mode "Composer" ───────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-[700] flex flex-col bg-slate-950"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-slate-800">
        <div className="flex items-center justify-between mb-1">
          <button onClick={() => setMode(null)} className="text-slate-400 text-sm py-1">← Retour</button>
          <span className="text-slate-500 text-xs">vs {opponentName}</span>
        </div>
        <div className="text-white font-black text-xl">Composer mon équipe</div>
        <div className="text-slate-400 text-sm">Clic = sélectionner · Appui long = stats + attaques</div>

        {/* Sélection en cours */}
        <div className="flex gap-2 mt-3 min-h-[44px] items-center">
          {selectedIds.length === 0
            ? <span className="text-slate-600 text-xs">Aucun sélectionné</span>
            : selectedIds.map((id, i) => {
                const p = POKEMON_BY_ID[id];
                const mon = ownedPokemon.find(m => m.pokemonId === id);
                const rarity = (p?.rarity ?? 'commun') as Rarity;
                return (
                  <div key={i} className="flex flex-col items-center">
                    <ShinySprite pokemonId={id} isShiny={mon?.isShiny ?? false} width={40} height={40}
                      style={{ filter: `drop-shadow(0 0 4px ${RARITY_COLORS[rarity]})` }} />
                    <span className="text-slate-300 font-bold" style={{ fontSize: '0.45rem' }}>Nv.{mon?.level}</span>
                  </div>
                );
              })
          }
          {Array.from({ length: 3 - selectedIds.length }).map((_, i) => (
            <div key={i} className="w-10 h-10 rounded-full border-2 border-dashed border-slate-700" />
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 shrink-0">
        {(['collection', 'teams'] as const).map(t => (
          <button key={t} onClick={() => setComposeTab(t)}
            className="flex-1 py-2.5 text-sm font-bold transition-colors"
            style={{ color: composeTab === t ? '#a855f7' : '#64748b', borderBottom: composeTab === t ? '2px solid #a855f7' : '2px solid transparent' }}>
            {t === 'collection' ? '📚 Collection' : '⭐ Équipes'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {composeTab === 'teams' && (
          <div className="flex flex-col gap-3">
            {savedTeams.length === 0 ? (
              <div className="text-slate-600 text-sm text-center py-8">
                Aucune équipe sauvegardée.<br /><span className="text-slate-500">Utilisez l'onglet Collection.</span>
              </div>
            ) : savedTeams.map(team => (
              <div key={team.id} className="rounded-xl p-3"
                style={{ background: '#1e293b', border: team.id === favoriteTeamId ? '2px solid #f59e0b' : '1px solid #334155' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-bold text-sm">{team.name}</span>
                  {team.id === favoriteTeamId && <span className="text-yellow-400 text-xs">⭐ Favorite</span>}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-2 flex-1">
                    {team.members.slice(0, 3).map((m, i) => {
                      const p = POKEMON_BY_ID[m.pokemonId];
                      const rarity = (p?.rarity ?? 'commun') as Rarity;
                      return (
                        <div key={i} className="flex flex-col items-center">
                          <ShinySprite pokemonId={m.pokemonId} isShiny={m.isShiny ?? false} width={44} height={44}
                            style={{ filter: `drop-shadow(0 0 5px ${RARITY_COLORS[rarity]})` }} />
                          <span className="text-slate-400 text-xs">{p?.name}</span>
                          <span className="text-slate-500" style={{ fontSize: '0.5rem' }}>Nv.{m.level}</span>
                        </div>
                      );
                    })}
                  </div>
                  <button onClick={() => confirmTeam(team.members.slice(0, 3), false)}
                    className="px-4 py-2 rounded-xl text-sm font-black text-white shrink-0"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
                    Choisir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {composeTab === 'collection' && (
          <div className="grid grid-cols-4 gap-2">
            {sorted.map(mon => {
              const p = POKEMON_BY_ID[mon.pokemonId];
              const rarity = (p?.rarity ?? 'commun') as Rarity;
              const rarityColor = RARITY_COLORS[rarity];
              const isSelected = selectedIds.includes(mon.pokemonId);
              const selIdx = selectedIds.indexOf(mon.pokemonId);
              return (
                <div
                  key={mon.pokemonId}
                  onPointerDown={() => startLongPress(mon)}
                  onPointerUp={() => endLongPress(mon.pokemonId)}
                  onPointerLeave={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
                  onTouchStart={e => { e.preventDefault(); startLongPress(mon); }}
                  onTouchEnd={e => { e.preventDefault(); endLongPress(mon.pokemonId); }}
                  onClick={e => e.preventDefault()}
                  className="flex flex-col items-center rounded-xl p-1.5 cursor-pointer select-none active:scale-95 relative"
                  style={{
                    background: isSelected ? `${rarityColor}22` : '#1e293b',
                    border: `2px solid ${isSelected ? rarityColor : '#334155'}`,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-white font-black"
                      style={{ background: rarityColor, fontSize: '0.5rem' }}>
                      {selIdx + 1}
                    </div>
                  )}
                  <ShinySprite pokemonId={mon.pokemonId} isShiny={mon.isShiny} width={52} height={52}
                    style={{ filter: `drop-shadow(0 0 4px ${rarityColor})` }} />
                  <span className="text-white font-bold text-center leading-tight mt-0.5" style={{ fontSize: '0.5rem' }}>{p?.name}</span>
                  <span className="text-slate-500" style={{ fontSize: '0.45rem' }}>Nv.{mon.level}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {composeTab === 'collection' && (
        <div className="shrink-0 px-4 pb-4 pt-2 border-t border-slate-800">
          <button
            disabled={selectedIds.length !== 3}
            onClick={confirmSelection}
            className="w-full py-3.5 rounded-xl font-black text-white text-base transition-all"
            style={{
              background: selectedIds.length === 3 ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : '#1e293b',
              border: selectedIds.length === 3 ? 'none' : '1px solid #334155',
              color: selectedIds.length === 3 ? 'white' : '#475569',
              opacity: selectedIds.length === 3 ? 1 : 0.6,
              boxShadow: selectedIds.length === 3 ? '0 0 20px #a855f755' : 'none',
            }}>
            {selectedIds.length === 3 ? '⚔️ Confirmer l\'équipe' : `Sélectionnez ${3 - selectedIds.length} Pokémon de plus`}
          </button>
        </div>
      )}

      {detailMon && (
        <PokemonDetailModal
          mon={detailMon}
          customMoves={pokemonCustomMoves?.[detailMon.pokemonId]}
          onClose={() => setDetailMon(null)}
          onSaveCustomMoves={onSaveCustomMoves}
        />
      )}
    </div>
  );
}
