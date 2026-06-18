/**
 * PvpTeamSelect — Sélection d'équipe avant un combat PvP 3v3.
 *
 * MODE 1 "Composer" : Pokédex complet au Nv.100, clic = sélectionner,
 *                     appui long (>500ms) = stats + éditeur d'attaques.
 * MODE 2 "Équipe de prêt" : 6 équipes fixées Nv.100, sets d'attaques prédéfinis.
 *
 * Contrainte rental : si un joueur prend une équipe de prêt, l'adversaire doit
 * en prendre une aussi (colonne `rental_required BOOLEAN DEFAULT false` dans pvp_sessions).
 */
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { ShinySprite } from './ShinySprite';
import { GEN1_POKEMON, POKEMON_BY_ID } from '../data/gen1';
import { POKEMON_TYPE, TYPE_COLORS } from '../data/pokemonTypes';
import type { PokemonType } from '../data/pokemonTypes';
import { RARITY_COLORS } from '../types';
import type { Rarity } from '../types';
import {
  calcMaxHp, calcAttack, calcDefense, calcSpAttack, calcSpDefense, calcSpeed,
} from '../data/combatEngine';
import { getAvailableMoves } from '../data/gen1Movepools';
import { MOVES } from '../data/gen1Moves';
import type { TeamMember } from './TeamBuilder';
import { supabase } from '../lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  opponentName: string;
  onConfirm: (team: TeamMember[]) => void;
  onCancel: () => void;
  pokemonCustomMoves?: Record<number, string[]>;
  onSaveCustomMoves?: (pokemonId: number, slugs: string[]) => void;
  sessionId?: string;
}

type SelectMode = null | 'compose' | 'rental';

const RARITY_ORDER: Record<string, number> = {
  commun: 0, peu_commun: 1, rare: 2, elite: 3, legendaire: 4,
};

// ── 6 Équipes de prêt (Gen 1 uniquement, Niveau 100) ─────────────────────────

interface RentalMember {
  pokemonId: number;
  moves: [string, string, string, string];
}
interface RentalTeamDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  color: string;
  members: [RentalMember, RentalMember, RentalMember];
}

export const RENTAL_TEAMS: RentalTeamDef[] = [
  {
    id: 'A',
    name: 'Équilibre Tempête',
    emoji: '🌩️',
    description: 'Feu · Eau · Plante — le trio classique',
    color: '#f97316',
    members: [
      { pokemonId: 6,   moves: ['flamethrower', 'fly',       'nasty-plot',  'dragon-rage']    }, // Dracaufeu
      { pokemonId: 9,   moves: ['hydro-pump',   'ice-beam',  'surf',        'recover']         }, // Tortank
      { pokemonId: 3,   moves: ['solar-beam',   'sleep-powder','leech-seed','razor-leaf']      }, // Florizarre
    ],
  },
  {
    id: 'B',
    name: 'Choc Électrique',
    emoji: '⚡',
    description: 'Vitesse · Spectre · Roche',
    color: '#facc15',
    members: [
      { pokemonId: 135, moves: ['discharge',    'thunderbolt', 'agility',    'quick-attack']   }, // Voltali
      { pokemonId: 94,  moves: ['psychic-move', 'night-shade', 'confuse-ray','hypnosis']        }, // Ectoplasma
      { pokemonId: 76,  moves: ['rock-slide',   'earthquake',  'ancient-power','explosion']     }, // Grolem
    ],
  },
  {
    id: 'C',
    name: 'Force Mentale',
    emoji: '🔮',
    description: 'Psy · Eau · Feu — puissance maximale',
    color: '#a855f7',
    members: [
      { pokemonId: 65,  moves: ['psychic-move', 'calm-mind',   'confuse-ray', 'recover']        }, // Alakazam
      { pokemonId: 130, moves: ['waterfall',    'bite',        'swords-dance','hydro-pump']      }, // Léviator
      { pokemonId: 59,  moves: ['flame-wheel',  'quick-attack','agility',     'flamethrower']   }, // Arcanin
    ],
  },
  {
    id: 'D',
    name: 'Zone Ombre',
    emoji: '🌑',
    description: 'Sol · Insecte · Eau/Psy — contrôle total',
    color: '#6b7280',
    members: [
      { pokemonId: 34,  moves: ['earthquake',   'rock-slide',  'toxic',       'body-slam']      }, // Nidoking
      { pokemonId: 123, moves: ['x-scissor',    'swords-dance','aerial-ace',  'quick-attack']   }, // Insécateur
      { pokemonId: 121, moves: ['surf',         'psychic-move','ice-beam',    'recover']         }, // Staross
    ],
  },
  {
    id: 'E',
    name: 'Dragon & Glace',
    emoji: '🐉',
    description: 'Dragon · Glace · Combat — trio dévastateur',
    color: '#06b6d4',
    members: [
      { pokemonId: 149, moves: ['dragon-rage',  'fly',         'fire-punch',  'hyper-beam']     }, // Dracolosse
      { pokemonId: 131, moves: ['ice-beam',     'surf',        'body-slam',   'sing']            }, // Lokhlass
      { pokemonId: 68,  moves: ['submission',   'rock-slide',  'swords-dance','quick-attack']   }, // Mackogneur
    ],
  },
  {
    id: 'F',
    name: 'Distorsion Psychique',
    emoji: '🌀',
    description: 'Psy · Normal · Vol — survie et contrôle',
    color: '#ec4899',
    members: [
      { pokemonId: 97,  moves: ['psychic-move', 'hypnosis',    'amnesia',     'dream-eater']    }, // Hypnomade
      { pokemonId: 143, moves: ['body-slam',    'crunch',      'amnesia',     'hyper-beam']     }, // Ronflex
      { pokemonId: 18,  moves: ['wing-attack',  'aerial-ace',  'agility',     'drill-peck']     }, // Roucarnage
    ],
  },
];

function buildRentalTeam(def: RentalTeamDef): TeamMember[] {
  return def.members.map(({ pokemonId }) => {
    const hp = calcMaxHp(pokemonId, 100, undefined);
    return { pokemonId, isShiny: false, level: 100, xp: 0, currentHp: hp, maxHp: hp };
  });
}

// ── Type badge helper ──────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: PokemonType }) {
  return (
    <span
      className="text-white rounded px-1.5 py-0.5 font-bold shrink-0"
      style={{ background: TYPE_COLORS[type] ?? '#888', fontSize: '0.4rem' }}
    >
      {type.toUpperCase()}
    </span>
  );
}

// ── Move chip helper ───────────────────────────────────────────────────────────

function MoveChip({ slug }: { slug: string }) {
  const m = MOVES[slug];
  if (!m) return null;
  const tc = TYPE_COLORS[m.type as PokemonType] ?? '#475569';
  return (
    <div
      className="flex items-center gap-1.5 rounded px-2 py-1"
      style={{ background: `${tc}18`, border: `1px solid ${tc}44` }}
    >
      <TypeBadge type={m.type as PokemonType} />
      <span className="text-white font-bold" style={{ fontSize: '0.6rem' }}>{m.name}</span>
      {(m as { power?: number }).power && (m as { power?: number }).power! > 0 && (
        <span className="text-slate-400 font-black ml-auto" style={{ fontSize: '0.55rem' }}>
          {(m as { power?: number }).power}
        </span>
      )}
    </div>
  );
}

// ── Modal détails + éditeur d'attaques (mode Composer) ───────────────────────

interface DetailModalProps {
  pokemonId: number;
  customMoves?: string[];
  onClose: () => void;
  onSaveCustomMoves?: (pokemonId: number, slugs: string[]) => void;
}

function PokemonDetailModal({ pokemonId, customMoves, onClose, onSaveCustomMoves }: DetailModalProps) {
  const p = POKEMON_BY_ID[pokemonId];
  const types = (POKEMON_TYPE[pokemonId] ?? ['normal']) as PokemonType[];
  const rarity = (p?.rarity ?? 'commun') as Rarity;
  const rarityColor = RARITY_COLORS[rarity];
  const [tab, setTab] = useState<'stats' | 'moves'>('stats');

  const hp  = calcMaxHp(pokemonId, 100, undefined);
  const atk = calcAttack(pokemonId, 100, undefined);
  const def = calcDefense(pokemonId, 100, undefined);
  const spa = calcSpAttack(pokemonId, 100, undefined);
  const spd = calcSpDefense(pokemonId, 100, undefined);
  const spe = calcSpeed(pokemonId, 100, undefined);

  const availablePool = getAvailableMoves(pokemonId, 100);
  const currentSlugs = customMoves?.length === 4 ? customMoves : availablePool.slice(0, 4);
  const [editing, setEditing] = useState(false);
  const [pendingMoves, setPendingMoves] = useState<string[]>([...currentSlugs]);

  const stats = [
    { label: 'PV',      val: hp },
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
          <ShinySprite pokemonId={pokemonId} isShiny={false} width={64} height={64}
            style={{ filter: `drop-shadow(0 0 8px ${rarityColor})` }} />
          <div className="flex-1 min-w-0">
            <div className="text-white font-black text-base truncate">{p?.name ?? `#${pokemonId}`}</div>
            <div className="text-slate-400 text-xs">Niveau 100</div>
            <div className="flex gap-1 flex-wrap mt-1">
              {types.map(t => <TypeBadge key={t} type={t} />)}
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

        {/* Stats */}
        {tab === 'stats' && (
          <div className="px-4 py-3 flex flex-col gap-2 overflow-y-auto">
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
        )}

        {/* Moves editor */}
        {tab === 'moves' && (
          <div className="px-4 py-3 flex flex-col gap-2 overflow-y-auto flex-1">
            <div className="flex items-center justify-between mb-1 shrink-0">
              <span className="text-slate-400 text-xs font-bold">
                Attaques actives ({currentSlugs.length}/4)
              </span>
              {onSaveCustomMoves && !editing && (
                <button
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: '#3b82f633', color: '#60a5fa', border: '1px solid #3b82f655' }}
                  onClick={() => { setPendingMoves([...currentSlugs]); setEditing(true); }}>
                  Modifier
                </button>
              )}
              {editing && (
                <div className="flex gap-1.5">
                  <button className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: '#ef444433', color: '#f87171', border: '1px solid #ef444455' }}
                    onClick={() => setEditing(false)}>
                    Annuler
                  </button>
                  <button
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: '#22c55e33', color: '#4ade80', border: '1px solid #22c55e55', opacity: pendingMoves.length === 4 ? 1 : 0.4 }}
                    onClick={() => {
                      if (pendingMoves.length === 4) {
                        onSaveCustomMoves?.(pokemonId, pendingMoves);
                        setEditing(false);
                      }
                    }}>
                    Sauvegarder
                  </button>
                </div>
              )}
            </div>

            {!editing ? (
              <div className="flex flex-col gap-1.5">
                {currentSlugs.map(slug => <MoveChip key={slug} slug={slug} />)}
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <div className="text-slate-500 text-xs mb-1">{pendingMoves.length}/4 sélectionnées</div>
                <div className="flex flex-col gap-1 overflow-y-auto" style={{ maxHeight: '38dvh' }}>
                  {availablePool.map(slug => {
                    const m = MOVES[slug];
                    if (!m) return null;
                    const isSelected = pendingMoves.includes(slug);
                    return (
                      <button key={slug}
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left"
                        style={{ background: isSelected ? '#3b82f622' : '#ffffff06', border: `1px solid ${isSelected ? '#3b82f6' : '#ffffff11'}` }}
                        onClick={() => {
                          if (isSelected) setPendingMoves(p => p.filter(s => s !== slug));
                          else if (pendingMoves.length < 4) setPendingMoves(p => [...p, slug]);
                        }}>
                        <TypeBadge type={m.type as PokemonType} />
                        <span className="text-white text-xs font-bold flex-1">{m.name}</span>
                        {(m as { power?: number }).power && (m as { power?: number }).power! > 0 && (
                          <span className="text-slate-400 text-xs shrink-0">{(m as { power?: number }).power}</span>
                        )}
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
  opponentName, onConfirm, onCancel,
  pokemonCustomMoves, onSaveCustomMoves, sessionId,
}: Props) {
  const [mode, setMode] = useState<SelectMode>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [rentalRequired, setRentalRequired] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);
  const [rentalDetailTeam, setRentalDetailTeam] = useState<RentalTeamDef | null>(null);

  // Tous les Pokémon du Pokédex, triés par rareté décroissante
  const allPokemon = useMemo(() =>
    [...GEN1_POKEMON].sort((a, b) => {
      const ra = RARITY_ORDER[a.rarity ?? 'commun'] ?? 0;
      const rb = RARITY_ORDER[b.rarity ?? 'commun'] ?? 0;
      return rb !== ra ? rb - ra : a.id - b.id;
    }),
  []);

  // Écoute rental_required depuis l'adversaire
  useEffect(() => {
    if (!sessionId) return;
    const chan = supabase
      .channel(`pvp_ts_rental_${sessionId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'pvp_sessions',
        filter: `id=eq.${sessionId}`,
      }, ({ new: row }) => {
        if ((row as Record<string, unknown>).rental_required === true) setRentalRequired(true);
      })
      .subscribe();
    return () => { supabase.removeChannel(chan); };
  }, [sessionId]);

  const confirmTeam = useCallback(async (team: TeamMember[], isRental = false) => {
    if (isRental && sessionId) {
      await supabase.from('pvp_sessions').update({ rental_required: true }).eq('id', sessionId);
    }
    setConfirmed(true);
    onConfirm(team);
  }, [onConfirm, sessionId]);

  // ── Long-press handlers ────────────────────────────────────────────────────
  const startLongPress = useCallback((pokemonId: number) => {
    longPressFired.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      setDetailId(pokemonId);
    }, 500);
  }, []);

  const endLongPress = useCallback((pokemonId: number) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (!longPressFired.current) {
      // Clic court = sélectionner / désélectionner
      setSelectedIds(prev => {
        if (prev.includes(pokemonId)) return prev.filter(id => id !== pokemonId);
        if (prev.length >= 3) return prev;
        return [...prev, pokemonId];
      });
    }
    longPressFired.current = false;
  }, []);

  const confirmCompose = useCallback(() => {
    const team: TeamMember[] = selectedIds.map(id => {
      const hp = calcMaxHp(id, 100, undefined);
      return { pokemonId: id, isShiny: false, level: 100, xp: 0, currentHp: hp, maxHp: hp };
    });
    confirmTeam(team, false);
  }, [selectedIds, confirmTeam]);

  // ── Écran d'attente ────────────────────────────────────────────────────────
  if (confirmed) {
    return (
      <div className="fixed inset-0 z-[700] flex flex-col items-center justify-center bg-slate-950 gap-6"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="text-5xl" style={{ animation: 'pvp-blink 1.2s ease-in-out infinite' }}>⚔️</div>
        <div className="text-white font-black text-xl">Équipe confirmée !</div>
        <div className="text-slate-400 text-sm text-center px-8">
          En attente que <span className="text-yellow-300 font-bold">{opponentName}</span> choisisse son équipe…
        </div>
        <div className="flex gap-1.5 mt-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-slate-600"
              style={{ animation: `pvp-dot-bounce 1.2s ${i * 0.2}s ease-in-out infinite` }} />
          ))}
        </div>
      </div>
    );
  }

  // ── Écran de choix du mode ─────────────────────────────────────────────────
  if (mode === null) {
    return (
      <div className="fixed inset-0 z-[700] flex flex-col bg-slate-950"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>

        <div className="shrink-0 px-4 pt-5 pb-4 border-b border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <button onClick={onCancel} className="text-slate-400 text-sm py-1 active:text-white">← Annuler</button>
            <span className="text-slate-500 text-xs">vs <span className="text-slate-300">{opponentName}</span></span>
          </div>
          <div className="text-white font-black text-2xl">⚔️ Combat PvP</div>
          {rentalRequired ? (
            <div className="mt-1.5 text-yellow-400 font-bold text-sm">
              ⚠️ {opponentName} a choisi une équipe de prêt — vous devez en faire autant.
            </div>
          ) : (
            <div className="text-slate-400 text-sm mt-1">Mode compétitif · Aucune récompense</div>
          )}
        </div>

        <div className="flex-1 flex flex-col justify-center gap-5 px-5 py-6">

          {/* Composer — caché si rental requis */}
          {!rentalRequired && (
            <button
              onClick={() => setMode('compose')}
              className="rounded-2xl p-5 text-left transition-transform active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81)', border: '2px solid #6366f1', boxShadow: '0 0 24px #6366f11a' }}
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
                  style={{ background: 'rgba(99,102,241,0.2)' }}>📚</div>
                <div className="flex-1">
                  <div className="text-white font-black text-lg leading-tight">Composer mon équipe</div>
                  <div className="text-indigo-300 text-sm mt-0.5">
                    Pokédex complet · Niveau 100 · Attaques personnalisables
                  </div>
                  <div className="text-indigo-400/70 text-xs mt-1">Appui long sur un Pokémon = éditeur d'attaques</div>
                </div>
                <span className="text-indigo-400 text-2xl">›</span>
              </div>
            </button>
          )}

          {/* Équipe de prêt */}
          <button
            onClick={() => setMode('rental')}
            className="rounded-2xl p-5 text-left transition-transform active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #2d1b5e, #4c1d95)', border: '2px solid #a855f7', boxShadow: '0 0 24px #a855f71a' }}
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
                style={{ background: 'rgba(168,85,247,0.2)' }}>🎴</div>
              <div className="flex-1">
                <div className="text-white font-black text-lg leading-tight">Équipe de prêt</div>
                <div className="text-purple-300 text-sm mt-0.5">
                  6 équipes · Niveau 100 · Parfaitement équilibrées
                </div>
                <div className="text-purple-400/70 text-xs mt-1">Sets d'attaques et types fixes et garantis</div>
              </div>
              <span className="text-purple-400 text-2xl">›</span>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // ── Mode Équipe de prêt ────────────────────────────────────────────────────
  if (mode === 'rental') {
    return (
      <div className="fixed inset-0 z-[700] flex flex-col bg-slate-950"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>

        <div className="shrink-0 px-4 pt-4 pb-3 border-b border-slate-800">
          <div className="flex items-center justify-between mb-1">
            <button onClick={() => setMode(null)} className="text-slate-400 text-sm py-1 active:text-white">← Retour</button>
            <span className="text-slate-500 text-xs">vs {opponentName}</span>
          </div>
          <div className="text-white font-black text-xl">🎴 Équipes de prêt</div>
          <div className="text-slate-400 text-sm mt-0.5">6 équipes — Tous les Pokémon au Niveau 100</div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
          {RENTAL_TEAMS.map(teamDef => {
            const team = buildRentalTeam(teamDef);
            return (
              <div key={teamDef.id} className="rounded-2xl overflow-hidden"
                style={{ border: `2px solid ${teamDef.color}55`, background: `${teamDef.color}08` }}>

                {/* En-tête équipe */}
                <div className="flex items-center gap-3 px-4 pt-3 pb-2">
                  <span style={{ fontSize: '1.5rem' }}>{teamDef.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-black text-sm">{teamDef.name}</div>
                    <div className="text-slate-400" style={{ fontSize: '0.65rem' }}>{teamDef.description}</div>
                  </div>
                  <span className="text-xs font-black px-2 py-0.5 rounded-full shrink-0"
                    style={{ background: `${teamDef.color}33`, color: teamDef.color, border: `1px solid ${teamDef.color}55` }}>
                    Nv.100
                  </span>
                </div>

                {/* Pokémon row */}
                <div className="grid grid-cols-3 gap-2 px-3 pb-3">
                  {teamDef.members.map((member, mi) => {
                    const p = POKEMON_BY_ID[member.pokemonId];
                    const rarity = (p?.rarity ?? 'commun') as Rarity;
                    const types = (POKEMON_TYPE[member.pokemonId] ?? ['normal']) as PokemonType[];
                    const teamMember = team[mi];
                    return (
                      <button
                        key={mi}
                        onClick={() => setRentalDetailTeam(rentalDetailTeam?.id === teamDef.id ? null : teamDef)}
                        className="flex flex-col items-center rounded-xl py-2 px-1 active:scale-95 transition-transform"
                        style={{ background: '#0f172a', border: `1px solid ${RARITY_COLORS[rarity]}55` }}
                      >
                        <div style={{ width: 56, height: 56, flexShrink: 0 }}>
                          <ShinySprite pokemonId={member.pokemonId} isShiny={false} width={56} height={56}
                            style={{ filter: `drop-shadow(0 0 5px ${RARITY_COLORS[rarity]})` }} />
                        </div>
                        <div className="text-white font-bold text-center leading-tight mt-1 w-full px-0.5 truncate"
                          style={{ fontSize: '0.5rem' }}>
                          {p?.name ?? `#${member.pokemonId}`}
                        </div>
                        <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                          {types.map(t => (
                            <span key={t} className="text-white rounded px-1"
                              style={{ background: TYPE_COLORS[t] ?? '#888', fontSize: '0.33rem', fontWeight: 700 }}>
                              {t.toUpperCase()}
                            </span>
                          ))}
                        </div>
                        <div className="mt-1 grid grid-cols-2 gap-x-1.5 w-full px-1" style={{ fontSize: '0.38rem' }}>
                          <span className="text-slate-500 text-right">PV</span>
                          <span className="text-green-400 font-bold">{teamMember.maxHp}</span>
                          <span className="text-slate-500 text-right">ATK</span>
                          <span className="text-orange-400 font-bold">{calcAttack(member.pokemonId, 100, undefined)}</span>
                          <span className="text-slate-500 text-right">VIT</span>
                          <span className="text-blue-400 font-bold">{calcSpeed(member.pokemonId, 100, undefined)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Attaques dépliables */}
                {rentalDetailTeam?.id === teamDef.id && (
                  <div className="px-3 pb-3 flex flex-col gap-2 border-t border-slate-800/50 pt-2">
                    {teamDef.members.map((member, mi) => {
                      const p = POKEMON_BY_ID[member.pokemonId];
                      return (
                        <div key={mi}>
                          <div className="text-slate-400 font-bold mb-1" style={{ fontSize: '0.6rem' }}>
                            {p?.name ?? `#${member.pokemonId}`}
                          </div>
                          <div className="grid grid-cols-2 gap-1">
                            {member.moves.map(slug => <MoveChip key={slug} slug={slug} />)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Bouton choisir */}
                <div className="px-3 pb-3">
                  <button
                    className="w-full py-2.5 rounded-xl font-black text-white text-sm active:scale-[0.97] transition-transform"
                    style={{ background: `linear-gradient(135deg, ${teamDef.color}cc, ${teamDef.color})`, boxShadow: `0 0 16px ${teamDef.color}44` }}
                    onPointerUp={async () => {
                      const team = buildRentalTeam(teamDef);
                      // Sauvegarder les attaques prédéfinies dans pokemonCustomMoves
                      for (const member of teamDef.members) {
                        onSaveCustomMoves?.(member.pokemonId, [...member.moves]);
                      }
                      await confirmTeam(team, true);
                    }}
                  >
                    {teamDef.emoji} Choisir — {teamDef.name}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Mode Composer (Pokédex complet, Nv.100) ────────────────────────────────

  return (
    <div className="fixed inset-0 z-[700] flex flex-col bg-slate-950"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>

      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-slate-800">
        <div className="flex items-center justify-between mb-1">
          <button onClick={() => setMode(null)} className="text-slate-400 text-sm py-1 active:text-white">← Retour</button>
          <span className="text-slate-500 text-xs">vs {opponentName}</span>
        </div>
        <div className="text-white font-black text-xl">Composer mon équipe</div>
        <div className="text-slate-400 text-xs mt-0.5">Clic = sélectionner · Appui long = modifier les attaques</div>

        {/* Sélection en cours */}
        <div className="flex items-center gap-2 mt-3 min-h-[52px]">
          {selectedIds.length === 0
            ? <span className="text-slate-600 text-xs">Choisissez 3 Pokémon</span>
            : selectedIds.map((id) => {
                const p = POKEMON_BY_ID[id];
                const rarity = (p?.rarity ?? 'commun') as Rarity;
                return (
                  <div key={id} className="flex flex-col items-center">
                    <ShinySprite pokemonId={id} isShiny={false} width={44} height={44}
                      style={{ filter: `drop-shadow(0 0 5px ${RARITY_COLORS[rarity]})` }} />
                    <span className="text-slate-300 font-bold" style={{ fontSize: '0.42rem' }}>{p?.name ?? `#${id}`}</span>
                    <span className="text-slate-500" style={{ fontSize: '0.38rem' }}>Nv.100</span>
                  </div>
                );
              })
          }
          {Array.from({ length: Math.max(0, 3 - selectedIds.length) }).map((_, i) => (
            <div key={i} className="w-11 h-11 rounded-full border-2 border-dashed border-slate-800 flex items-center justify-center">
              <span className="text-slate-700 text-lg">+</span>
            </div>
          ))}
        </div>
      </div>

      {/* Grille Pokédex */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="grid grid-cols-4 gap-2">
          {allPokemon.map(pdata => {
            const rarity = (pdata.rarity ?? 'commun') as Rarity;
            const rarityColor = RARITY_COLORS[rarity];
            const isSelected = selectedIds.includes(pdata.id);
            const selIdx = selectedIds.indexOf(pdata.id);
            const hasCustomMoves = (pokemonCustomMoves?.[pdata.id]?.length ?? 0) === 4;
            return (
              <div
                key={pdata.id}
                onPointerDown={() => startLongPress(pdata.id)}
                onPointerUp={() => endLongPress(pdata.id)}
                onPointerLeave={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
                onTouchStart={e => { e.preventDefault(); startLongPress(pdata.id); }}
                onTouchEnd={e => { e.preventDefault(); endLongPress(pdata.id); }}
                onClick={e => e.preventDefault()}
                className="flex flex-col items-center rounded-xl p-1.5 cursor-pointer select-none active:scale-95 relative transition-transform"
                style={{
                  background: isSelected ? `${rarityColor}22` : '#1e293b',
                  border: `2px solid ${isSelected ? rarityColor : '#334155'}`,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {isSelected && (
                  <div className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-white font-black z-10"
                    style={{ background: rarityColor, fontSize: '0.5rem' }}>
                    {selIdx + 1}
                  </div>
                )}
                {hasCustomMoves && !isSelected && (
                  <div className="absolute top-1 left-1 text-blue-400" style={{ fontSize: '0.5rem' }}>⚔</div>
                )}
                <ShinySprite pokemonId={pdata.id} isShiny={false} width={52} height={52}
                  style={{ filter: `drop-shadow(0 0 4px ${rarityColor})` }} />
                <span className="text-white font-bold text-center leading-tight mt-0.5 w-full truncate px-0.5"
                  style={{ fontSize: '0.48rem' }}>{pdata.name}</span>
                <span className="text-slate-500" style={{ fontSize: '0.4rem' }}>Nv.100</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bouton confirmer */}
      <div className="shrink-0 px-4 pb-4 pt-2 border-t border-slate-800">
        <button
          disabled={selectedIds.length !== 3}
          onClick={confirmCompose}
          className="w-full py-3.5 rounded-xl font-black text-base transition-all active:scale-[0.98]"
          style={{
            background: selectedIds.length === 3 ? 'linear-gradient(135deg, #6366f1, #a855f7)' : '#1e293b',
            color: selectedIds.length === 3 ? 'white' : '#475569',
            border: selectedIds.length === 3 ? 'none' : '1px solid #334155',
            boxShadow: selectedIds.length === 3 ? '0 0 24px #a855f755' : 'none',
          }}>
          {selectedIds.length === 3 ? '⚔️ Confirmer l\'équipe' : `Sélectionnez encore ${3 - selectedIds.length} Pokémon`}
        </button>
      </div>

      {/* Modal détails / attaques */}
      {detailId !== null && (
        <PokemonDetailModal
          pokemonId={detailId}
          customMoves={pokemonCustomMoves?.[detailId]}
          onClose={() => setDetailId(null)}
          onSaveCustomMoves={onSaveCustomMoves}
        />
      )}
    </div>
  );
}
