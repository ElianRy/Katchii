/**
 * PvpTeamSelect — 3 modes de sélection d'équipe avant un combat PvP.
 *
 * Mode 1 "Équipe Favorite"   : soumet l'équipe marquée ⭐, ou liste les équipes sauvegardées.
 * Mode 2 "Composer"          : grille collection + onglet équipes sauvegardées.
 *                              Clic court = toggle sélection, appui long (500 ms) = fiche stats.
 * Mode 3 "Équipes de prêt"   : 3 équipes pré-construites niveau 100.
 */
import { useState, useRef, useCallback, useMemo } from 'react';
import { ShinySprite } from './ShinySprite';
import { POKEMON_BY_ID } from '../data/gen1';
import { POKEMON_TYPE, TYPE_COLORS } from '../data/pokemonTypes';
import type { PokemonType } from '../data/pokemonTypes';
import { RARITY_COLORS } from '../types';
import type { Rarity } from '../types';
import {
  calcMaxHp, calcAttack, calcDefense, calcSpAttack, calcSpDefense, calcSpeed,
} from '../data/combatEngine';
import type { PokemonInstanceData } from '../types';
import type { TeamMember } from './TeamBuilder';

// ── Types internes ────────────────────────────────────────────────────────────

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
}

type SelectMode = null | 'compose' | 'rental';
type ComposeTab = 'collection' | 'teams';

const RARITY_ORDER: Record<string, number> = {
  commun: 0, peu_commun: 1, rare: 2, elite: 3, legendaire: 4,
};

// ── Équipes de prêt (niveau 100) ──────────────────────────────────────────────
// Les statistiques de combat (calcMaxHp etc.) sont calculées au runtime via
// les fonctions existantes, en passant level=100 et instance=undefined (stats de base).

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
    description: 'Feu · Eau · Plante — le trio classique équilibré',
    color: '#f97316',
    members: [
      { pokemonId: 6   }, // Charizard
      { pokemonId: 9   }, // Blastoise
      { pokemonId: 3   }, // Venusaur
    ],
  },
  {
    name: 'Choc Électrique',
    emoji: '⚡',
    description: 'Vitesse · Poison · Roche — attaque et contrôle',
    color: '#facc15',
    members: [
      { pokemonId: 135 }, // Jolteon
      { pokemonId: 94  }, // Gengar
      { pokemonId: 76  }, // Golem
    ],
  },
  {
    name: 'Force Mentale',
    emoji: '🔮',
    description: 'Psy · Eau · Feu — puissance psychique et polyvalence',
    color: '#a855f7',
    members: [
      { pokemonId: 65  }, // Alakazam
      { pokemonId: 130 }, // Gyarados
      { pokemonId: 59  }, // Arcanine
    ],
  },
];

function buildRentalTeam(def: RentalTeamDef): TeamMember[] {
  return def.members.map(({ pokemonId }) => {
    const hp = calcMaxHp(pokemonId, 100, undefined);
    return {
      pokemonId,
      isShiny: false,
      level: 100,
      xp: 0,
      currentHp: hp,
      maxHp: hp,
    };
  });
}

// ── Modal de détails ──────────────────────────────────────────────────────────

interface DetailModalProps {
  mon: OwnedPokemon;
  onClose: () => void;
}

function PokemonDetailModal({ mon, onClose }: DetailModalProps) {
  const p = POKEMON_BY_ID[mon.pokemonId];
  const types = (POKEMON_TYPE[mon.pokemonId] ?? ['normal']) as PokemonType[];
  const inst = mon.instance;
  const hp   = calcMaxHp(mon.pokemonId, mon.level, inst);
  const atk  = calcAttack(mon.pokemonId, mon.level, inst);
  const def  = calcDefense(mon.pokemonId, mon.level, inst);
  const spa  = calcSpAttack(mon.pokemonId, mon.level, inst);
  const spd  = calcSpDefense(mon.pokemonId, mon.level, inst);
  const spe  = calcSpeed(mon.pokemonId, mon.level, inst);
  const rarity = (p?.rarity ?? 'commun') as Rarity;
  const rarityColor = RARITY_COLORS[rarity];

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
    <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/75 px-4" onClick={onClose}>
      <div
        className="w-full max-w-xs rounded-2xl overflow-hidden"
        style={{ background: '#0f172a', border: `2px solid ${rarityColor}`, boxShadow: `0 0 32px ${rarityColor}44` }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <ShinySprite pokemonId={mon.pokemonId} isShiny={mon.isShiny} width={72} height={72}
            style={{ filter: `drop-shadow(0 0 8px ${rarityColor})` }} />
          <div className="flex-1 min-w-0">
            <div className="text-white font-black text-lg truncate">{p?.name ?? '???'}</div>
            <div className="text-slate-400 text-xs mb-1">Niveau {mon.level}</div>
            <div className="flex gap-1 flex-wrap">
              {types.map(t => (
                <span key={t} className="text-white font-bold rounded px-1.5 py-0.5"
                  style={{ background: TYPE_COLORS[t] ?? '#888', fontSize: '0.55rem' }}>
                  {t.toUpperCase()}
                </span>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-1 text-lg self-start">✕</button>
        </div>
        <div className="px-4 pb-4 flex flex-col gap-1.5">
          {stats.map(({ label, val }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-slate-400 text-xs w-16 shrink-0">{label}</span>
              <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                <div className="h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (val / maxStat) * 100)}%`, background: `linear-gradient(90deg, ${rarityColor}99, ${rarityColor})` }} />
              </div>
              <span className="text-white font-bold text-xs w-8 text-right">{val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export function PvpTeamSelect({ ownedPokemon, savedTeams, favoriteTeamId, opponentName, onConfirm, onCancel }: Props) {
  const [mode, setMode] = useState<SelectMode>(null);
  const [composeTab, setComposeTab] = useState<ComposeTab>('collection');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [detailMon, setDetailMon] = useState<OwnedPokemon | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);

  const favoriteTeam = favoriteTeamId ? savedTeams.find(t => t.id === favoriteTeamId) : null;

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
    onConfirm(members);
  }, [selectedIds, ownedPokemon, onConfirm]);

  // ── Rendu : sélection de mode ─────────────────────────────────────────────

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
          <div className="text-slate-400 text-sm mt-1">Comment voulez-vous composer votre équipe ?</div>
        </div>

        <div className="flex-1 flex flex-col justify-center gap-4 px-5 py-6">

          {/* Bouton 1 — Équipe Favorite */}
          <button
            onClick={() => {
              if (favoriteTeam) {
                onConfirm(favoriteTeam.members.slice(0, 3));
              } else if (savedTeams.length > 0) {
                // Pas de favorite définie → afficher la liste des équipes sauvegardées
                setMode('compose');
                setComposeTab('teams');
              } else {
                // Aucune équipe sauvegardée → aller en collection
                setMode('compose');
                setComposeTab('collection');
              }
            }}
            className="relative rounded-2xl p-5 text-left transition-transform active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #1e3a1e, #14532d)', border: '2px solid #22c55e', boxShadow: '0 0 20px #22c55e22' }}
          >
            <div className="flex items-center gap-4">
              <div className="text-4xl">⭐</div>
              <div className="flex-1">
                <div className="text-white font-black text-lg">Équipe Favorite</div>
                <div className="text-green-300 text-sm mt-0.5">
                  {favoriteTeam
                    ? `${favoriteTeam.name} — ${favoriteTeam.members.slice(0, 3).map(m => POKEMON_BY_ID[m.pokemonId]?.name).join(', ')}`
                    : savedTeams.length > 0
                      ? 'Choisir parmi mes équipes sauvegardées'
                      : 'Aucune équipe sauvegardée'}
                </div>
              </div>
              <div className="text-green-400 text-xl">›</div>
            </div>
            {favoriteTeam && (
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
            )}
          </button>

          {/* Bouton 2 — Composer mon équipe */}
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
                  {ownedPokemon.length} Pokémon disponibles · Appui long pour voir les stats
                </div>
              </div>
              <div className="text-indigo-400 text-xl">›</div>
            </div>
          </button>

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
                  3 équipes pré-construites · Niveau 100 · Force égale garantie
                </div>
              </div>
              <div className="text-purple-400 text-xl">›</div>
            </div>
            <div className="flex gap-3 mt-3">
              {RENTAL_TEAMS.map((t, i) => (
                <div key={i} className="flex-1 rounded-xl px-2 py-1.5 text-center"
                  style={{ background: `${t.color}22`, border: `1px solid ${t.color}55` }}>
                  <div style={{ fontSize: '1.1rem' }}>{t.emoji}</div>
                  <div className="text-white font-bold leading-tight mt-0.5" style={{ fontSize: '0.5rem' }}>{t.name}</div>
                </div>
              ))}
            </div>
          </button>
        </div>
      </div>
    );
  }

  // ── Rendu : mode "Équipes de prêt" ────────────────────────────────────────

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
          <div className="text-slate-400 text-sm mt-0.5">Tous les Pokémon sont au Niveau 100 · Statistiques maximales</div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
          {RENTAL_TEAMS.map((teamDef, ti) => {
            const team = buildRentalTeam(teamDef);
            return (
              <div key={ti} className="rounded-2xl overflow-hidden"
                style={{ border: `2px solid ${teamDef.color}`, boxShadow: `0 0 20px ${teamDef.color}22` }}>

                {/* En-tête équipe */}
                <div className="px-4 py-3" style={{ background: `${teamDef.color}18` }}>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: '1.5rem' }}>{teamDef.emoji}</span>
                    <div>
                      <div className="text-white font-black text-base">{teamDef.name}</div>
                      <div className="text-slate-400 text-xs">{teamDef.description}</div>
                    </div>
                    <div className="ml-auto shrink-0 text-xs font-black px-2 py-0.5 rounded-full"
                      style={{ background: `${teamDef.color}33`, color: teamDef.color, border: `1px solid ${teamDef.color}66` }}>
                      Nv. 100
                    </div>
                  </div>
                </div>

                {/* Pokémon */}
                <div className="px-4 py-3 flex gap-3">
                  {team.map((m, i) => {
                    const p = POKEMON_BY_ID[m.pokemonId];
                    const rarity = (p?.rarity ?? 'commun') as Rarity;
                    const types = (POKEMON_TYPE[m.pokemonId] ?? ['normal']) as PokemonType[];
                    const hp = m.maxHp;
                    const atk = calcAttack(m.pokemonId, 100, undefined);
                    const spe = calcSpeed(m.pokemonId, 100, undefined);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center rounded-xl py-2 px-1"
                        style={{ background: '#0f172a', border: `1px solid ${RARITY_COLORS[rarity]}44` }}>
                        <ShinySprite pokemonId={m.pokemonId} isShiny={false} width={52} height={52}
                          style={{ filter: `drop-shadow(0 0 5px ${RARITY_COLORS[rarity]})` }} />
                        <div className="text-white font-bold text-center mt-0.5 leading-tight" style={{ fontSize: '0.55rem' }}>
                          {p?.name ?? '???'}
                        </div>
                        <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                          {types.map(t => (
                            <span key={t} className="text-white rounded px-1" style={{ background: TYPE_COLORS[t] ?? '#888', fontSize: '0.38rem', fontWeight: 700 }}>
                              {t.toUpperCase()}
                            </span>
                          ))}
                        </div>
                        <div className="mt-1.5 flex flex-col gap-0.5 w-full px-1">
                          <div className="flex justify-between" style={{ fontSize: '0.38rem' }}>
                            <span className="text-slate-500">PV</span>
                            <span className="text-green-400 font-bold">{hp}</span>
                          </div>
                          <div className="flex justify-between" style={{ fontSize: '0.38rem' }}>
                            <span className="text-slate-500">ATK</span>
                            <span className="text-orange-400 font-bold">{atk}</span>
                          </div>
                          <div className="flex justify-between" style={{ fontSize: '0.38rem' }}>
                            <span className="text-slate-500">VIT</span>
                            <span className="text-blue-400 font-bold">{spe}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bouton choisir */}
                <div className="px-4 pb-4">
                  <button
                    onClick={() => onConfirm(team)}
                    className="w-full py-3 rounded-xl font-black text-white text-sm transition-transform active:scale-[0.98]"
                    style={{ background: `linear-gradient(135deg, ${teamDef.color}cc, ${teamDef.color})`, boxShadow: `0 0 16px ${teamDef.color}55` }}
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

  // ── Rendu : mode "Composer" ────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-[700] flex flex-col bg-slate-950"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>

      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-slate-800">
        <div className="flex items-center justify-between mb-1">
          <button onClick={() => setMode(null)} className="text-slate-400 text-sm py-1">← Retour</button>
          <span className="text-slate-500 text-xs">vs {opponentName}</span>
        </div>
        <div className="text-white font-black text-xl">Composer mon équipe</div>
        <div className="text-slate-400 text-sm">3 Pokémon · Appui long pour les stats</div>

        {/* Selected badges */}
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
        {(['collection', 'teams'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setComposeTab(tab)}
            className="flex-1 py-2.5 text-sm font-bold transition-colors"
            style={{ color: composeTab === tab ? '#a855f7' : '#64748b', borderBottom: composeTab === tab ? '2px solid #a855f7' : '2px solid transparent' }}
          >
            {tab === 'collection' ? '📚 Collection' : '⭐ Équipes'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-3">

        {composeTab === 'teams' && (
          <div className="flex flex-col gap-3">
            {savedTeams.length === 0 ? (
              <div className="text-slate-600 text-sm text-center py-8">
                Aucune équipe sauvegardée.<br />
                <span className="text-slate-500">Utilisez l'onglet Collection.</span>
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
                          <ShinySprite pokemonId={m.pokemonId} isShiny={m.isShiny ?? false} width={48} height={48}
                            style={{ filter: `drop-shadow(0 0 5px ${RARITY_COLORS[rarity]})` }} />
                          <span className="text-slate-400 text-xs">{p?.name}</span>
                          <span className="text-slate-500" style={{ fontSize: '0.5rem' }}>Nv.{m.level}</span>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => onConfirm(team.members.slice(0, 3))}
                    className="px-4 py-2 rounded-xl text-sm font-black text-white shrink-0"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
                  >
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
                  className="flex flex-col items-center rounded-xl p-1.5 cursor-pointer select-none transition-transform active:scale-95 relative"
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
                  <span className="text-white font-bold text-center leading-tight mt-0.5"
                    style={{ fontSize: '0.5rem' }}>
                    {p?.name}
                  </span>
                  <span className="text-slate-500" style={{ fontSize: '0.45rem' }}>Nv.{mon.level}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer confirm (collection seulement) */}
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
            }}
          >
            {selectedIds.length === 3 ? '⚔️ Confirmer l\'équipe' : `Sélectionnez ${3 - selectedIds.length} Pokémon de plus`}
          </button>
        </div>
      )}

      {/* Detail modal */}
      {detailMon && <PokemonDetailModal mon={detailMon} onClose={() => setDetailMon(null)} />}
    </div>
  );
}
