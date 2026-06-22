/**
 * PvpTeamSelect — Flux en 3 étapes :
 *   1. Choisir un mode (Composer | Équipe de prêt)
 *   2. Sélectionner 3 Pokémon ou une équipe de prêt
 *   3. Éditer les attaques de chaque Pokémon, puis confirmer
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

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  opponentName: string;
  isHost?: boolean;
  onConfirm: (team: TeamMember[]) => void;
  onCancel: () => void;
  pokemonCustomMoves?: Record<number, string[]>;
  onSaveCustomMoves?: (pokemonId: number, slugs: string[]) => void;
  sessionId?: string;
}

// ── Équipes de prêt ───────────────────────────────────────────────────────────

interface RentalMember { pokemonId: number; moves: [string, string, string, string]; }
interface RentalTeamDef {
  id: string; name: string; emoji: string; description: string; color: string;
  members: [RentalMember, RentalMember, RentalMember];
}

export const RENTAL_TEAMS: RentalTeamDef[] = [
  {
    id: 'A', name: 'Équilibre Tempête', emoji: '🌩️',
    description: 'Feu · Eau · Plante — le trio classique', color: '#f97316',
    members: [
      { pokemonId: 6,   moves: ['flamethrower', 'fly',         'nasty-plot',   'dragon-rage']   },
      { pokemonId: 9,   moves: ['hydro-pump',   'ice-beam',    'surf',          'blizzard']      },
      { pokemonId: 3,   moves: ['solar-beam',   'sleep-powder','leech-seed',    'razor-leaf']    },
    ],
  },
  {
    id: 'B', name: 'Choc Électrique', emoji: '⚡',
    description: 'Vitesse · Spectre · Roche', color: '#facc15',
    members: [
      { pokemonId: 135, moves: ['discharge',    'thunderbolt', 'agility',       'quick-attack']  },
      { pokemonId: 94,  moves: ['psychic-move', 'night-shade', 'confuse-ray',   'hypnosis']      },
      { pokemonId: 76,  moves: ['rock-slide',   'earthquake',  'ancient-power', 'explosion']     },
    ],
  },
  {
    id: 'C', name: 'Force Mentale', emoji: '🔮',
    description: 'Psy · Eau · Feu — puissance maximale', color: '#a855f7',
    members: [
      { pokemonId: 65,  moves: ['psychic-move', 'calm-mind',   'confuse-ray',   'agility']       },
      { pokemonId: 130, moves: ['waterfall',    'bite',        'swords-dance',  'hydro-pump']    },
      { pokemonId: 59,  moves: ['flame-wheel',  'quick-attack','agility',       'flamethrower']  },
    ],
  },
  {
    id: 'D', name: 'Zone Ombre', emoji: '🌑',
    description: 'Sol · Insecte · Eau/Psy — contrôle total', color: '#6b7280',
    members: [
      { pokemonId: 34,  moves: ['earthquake',   'rock-slide',  'toxic',         'body-slam']     },
      { pokemonId: 123, moves: ['x-scissor',    'swords-dance','aerial-ace',    'quick-attack']  },
      { pokemonId: 121, moves: ['surf',         'psychic-move','ice-beam',      'thunderbolt']   },
    ],
  },
  {
    id: 'E', name: 'Dragon & Glace', emoji: '🐉',
    description: 'Dragon · Glace · Combat — trio dévastateur', color: '#06b6d4',
    members: [
      { pokemonId: 149, moves: ['dragon-rage',  'fly',         'fire-punch',    'hyper-beam']    },
      { pokemonId: 131, moves: ['ice-beam',     'surf',        'body-slam',     'sing']          },
      { pokemonId: 68,  moves: ['submission',   'rock-slide',  'swords-dance',  'quick-attack']  },
    ],
  },
  {
    id: 'F', name: 'Distorsion Psychique', emoji: '🌀',
    description: 'Psy · Normal · Vol — survie et contrôle', color: '#ec4899',
    members: [
      { pokemonId: 97,  moves: ['psychic-move', 'hypnosis',    'amnesia',       'dream-eater']   },
      { pokemonId: 143, moves: ['body-slam',    'crunch',      'amnesia',       'hyper-beam']    },
      { pokemonId: 18,  moves: ['wing-attack',  'aerial-ace',  'agility',       'drill-peck']    },
    ],
  },
];

const RARITY_ORDER: Record<string, number> = { commun: 0, peu_commun: 1, rare: 2, elite: 3, legendaire: 4 };

// ── Petits helpers UI ─────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: PokemonType }) {
  return (
    <span className="text-white rounded px-1 font-bold shrink-0"
      style={{ background: TYPE_COLORS[type] ?? '#888', fontSize: '0.38rem', padding: '1px 4px' }}>
      {type.toUpperCase()}
    </span>
  );
}

function MoveRow({ slug }: { slug: string }) {
  const m = MOVES[slug];
  if (!m) return null;
  const tc = TYPE_COLORS[m.type as PokemonType] ?? '#475569';
  return (
    <div className="flex items-center gap-1.5 rounded-lg px-2 py-1.5"
      style={{ background: `${tc}18`, border: `1px solid ${tc}44` }}>
      <TypeBadge type={m.type as PokemonType} />
      <span className="text-white font-bold flex-1" style={{ fontSize: '0.65rem' }}>{m.name}</span>
      {(m as { power?: number }).power! > 0 && (
        <span className="text-slate-400 font-black" style={{ fontSize: '0.6rem' }}>
          {(m as { power?: number }).power}
        </span>
      )}
    </div>
  );
}

// ── Étape 3 : éditeur d'attaques pour l'équipe sélectionnée ──────────────────

interface MoveEditorStepProps {
  teamIds: number[];
  initialMoves: Record<number, string[]>;   // moves par pokemonId
  opponentName: string;
  isRental: boolean;
  onBack: () => void;
  onConfirm: (moves: Record<number, string[]>) => void;
}

function MoveEditorStep({ teamIds, initialMoves, opponentName, isRental, onBack, onConfirm }: MoveEditorStepProps) {
  const [moveMap, setMoveMap] = useState<Record<number, string[]>>({ ...initialMoves });
  const [activePokemon, setActivePokemon] = useState<number>(teamIds[0]);
  const [editMode, setEditMode] = useState(false);
  const [pendingMoves, setPendingMoves] = useState<string[]>([...(initialMoves[teamIds[0]] ?? [])]);
  const [infoSlug, setInfoSlug] = useState<string | null>(null);

  const current = moveMap[activePokemon] ?? [];
  const availablePool = useMemo(() => getAvailableMoves(activePokemon, 100), [activePokemon]);

  const autoSavePending = (currentId: number, pending: string[], originalMoves: string[]) => {
    if (pending.length === 0) return;
    let toSave = [...pending];
    // Fill missing slots from original moves
    if (toSave.length < 4) {
      for (const s of originalMoves) {
        if (!toSave.includes(s) && toSave.length < 4) toSave.push(s);
      }
    }
    setMoveMap(prev => ({ ...prev, [currentId]: toSave }));
  };

  const selectPokemon = (id: number) => {
    // Auto-save current pokemon if in edit mode
    if (editMode) {
      autoSavePending(activePokemon, pendingMoves, initialMoves[activePokemon] ?? []);
    }
    setActivePokemon(id);
    setPendingMoves([...(moveMap[id] ?? [])]);
    setEditMode(false);
  };

  const saveMoves = () => {
    setMoveMap(prev => ({ ...prev, [activePokemon]: [...pendingMoves] }));
    setEditMode(false);
  };

  const p = POKEMON_BY_ID[activePokemon];
  const rarity = (p?.rarity ?? 'commun') as Rarity;
  const rarityColor = RARITY_COLORS[rarity];
  const types = (POKEMON_TYPE[activePokemon] ?? ['normal']) as PokemonType[];

  const hp  = calcMaxHp(activePokemon, 100, undefined);
  const atk = calcAttack(activePokemon, 100, undefined);
  const def = calcDefense(activePokemon, 100, undefined);
  const spa = calcSpAttack(activePokemon, 100, undefined);
  const spd = calcSpDefense(activePokemon, 100, undefined);
  const spe = calcSpeed(activePokemon, 100, undefined);
  const stats = [
    { label: 'PV', val: hp }, { label: 'ATT', val: atk }, { label: 'DEF', val: def },
    { label: 'ATK S', val: spa }, { label: 'DEF S', val: spd }, { label: 'VIT', val: spe },
  ];
  const maxStat = Math.max(...stats.map(s => s.val), 1);

  return (
    <div className="fixed inset-0 z-[700] flex flex-col bg-slate-950"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>

      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-slate-800">
        <div className="flex items-center justify-between mb-1">
          <button onClick={onBack} className="text-slate-400 text-sm py-1 active:text-white">← Retour</button>
          <span className="text-slate-500 text-xs">vs {opponentName}</span>
        </div>
        <div className="text-white font-black text-lg">⚔️ Modifier les attaques</div>
        <div className="text-slate-400 text-xs mt-0.5">
          {isRental ? 'Équipe de prêt — attaques personnalisables' : 'Équipe personnalisée'}
        </div>

        {/* Sélecteur des 3 pokémon */}
        <div className="flex gap-3 mt-3">
          {teamIds.map(id => {
            const pp = POKEMON_BY_ID[id];
            const rc = RARITY_COLORS[(pp?.rarity ?? 'commun') as Rarity];
            const isActive = id === activePokemon;
            return (
              <button key={id} onClick={() => selectPokemon(id)}
                className="flex flex-col items-center rounded-xl px-2 py-1.5 flex-1 transition-all active:scale-95"
                style={{
                  background: isActive ? `${rc}22` : '#1e293b',
                  border: `2px solid ${isActive ? rc : '#334155'}`,
                  boxShadow: isActive ? `0 0 12px ${rc}44` : 'none',
                }}>
                <ShinySprite pokemonId={id} isShiny={false} width={44} height={44}
                  style={{ filter: `drop-shadow(0 0 4px ${rc})` }} />
                <span className="text-white font-bold mt-0.5" style={{ fontSize: '0.48rem' }}>
                  {pp?.name ?? `#${id}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Fiche du pokémon actif */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">

        {/* Identité */}
        <div className="flex items-center gap-3 pb-2 border-b border-slate-800">
          <ShinySprite pokemonId={activePokemon} isShiny={false} width={56} height={56}
            style={{ filter: `drop-shadow(0 0 8px ${rarityColor})` }} />
          <div>
            <div className="text-white font-black text-base">{p?.name ?? `#${activePokemon}`}</div>
            <div className="text-slate-400 text-xs">Niveau 100</div>
            <div className="flex gap-1 mt-1">{types.map(t => <TypeBadge key={t} type={t} />)}</div>
          </div>
        </div>

        {/* Stats mini — compact grid */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          {stats.map(({ label, val }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="text-slate-500 w-8 shrink-0" style={{ fontSize: '0.52rem' }}>{label}</span>
              <div className="flex-1 bg-slate-800 rounded-full overflow-hidden" style={{ height: 4 }}>
                <div className="h-full rounded-full"
                  style={{ width: `${Math.min(100, (val / maxStat) * 100)}%`, background: `linear-gradient(90deg, ${rarityColor}88, ${rarityColor})` }} />
              </div>
              <span className="text-white font-bold w-7 text-right" style={{ fontSize: '0.55rem' }}>{val}</span>
            </div>
          ))}
        </div>

        {/* Attaques */}
        <div className="flex flex-col gap-2 mt-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-bold">Attaques ({current.length}/4)</span>
            {!editMode ? (
              <button onClick={() => { setPendingMoves([...current]); setEditMode(true); }}
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: '#3b82f633', color: '#60a5fa', border: '1px solid #3b82f655' }}>
                Modifier
              </button>
            ) : (
              <div className="flex gap-1.5">
                <button onClick={() => { setEditMode(false); setPendingMoves([...current]); }}
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: '#ef444433', color: '#f87171', border: '1px solid #ef444455' }}>
                  Annuler
                </button>
                <button onClick={saveMoves}
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: '#22c55e33', color: '#4ade80', border: '1px solid #22c55e55',
                    opacity: pendingMoves.length === 4 ? 1 : 0.4,
                  }}>
                  Valider
                </button>
              </div>
            )}
          </div>

          {!editMode ? (
            <div className="flex flex-col gap-1.5">
              {current.map(slug => (
                <div key={slug} className="relative">
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1"><MoveRow slug={slug} /></div>
                    <button onClick={() => setInfoSlug(s => s === slug ? null : slug)}
                      className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-slate-400 hover:text-white"
                      style={{ background: '#334155', fontSize: '0.55rem', border: '1px solid #475569' }}>
                      i
                    </button>
                  </div>
                  {infoSlug === slug && (() => {
                    const m = MOVES[slug];
                    if (!m) return null;
                    return (
                      <div className="mt-1 rounded-lg px-2 py-1.5 text-xs" style={{ background: '#1e293b', border: '1px solid #334155' }}>
                        {(m as {power?:number}).power! > 0 && <div className="text-slate-300">Puissance : <span className="text-white font-bold">{(m as {power?:number}).power}</span></div>}
                        <div className="text-slate-300">Précision : <span className="text-white font-bold">{m.accuracy}%</span></div>
                        <div className="text-slate-300">PP : <span className="text-white font-bold">{m.pp}</span></div>
                        {m.description && <div className="text-slate-400 mt-0.5 italic">{m.description}</div>}
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <div className="text-slate-500 mb-1" style={{ fontSize: '0.6rem' }}>
                {pendingMoves.length}/4 sélectionnées — touche pour ajouter/retirer
              </div>
              <div className="flex flex-col gap-1">
                {(() => {
                  const displayPool = [...pendingMoves.filter(s => !availablePool.includes(s)), ...availablePool];
                  return displayPool;
                })().map(slug => {
                  const m = MOVES[slug];
                  if (!m) return null;
                  const isSelected = pendingMoves.includes(slug);
                  const tc = TYPE_COLORS[m.type as PokemonType] ?? '#475569';
                  return (
                    <div key={slug} className="relative">
                      <div className="flex items-center gap-1.5">
                        <button
                          className="flex-1 flex items-center gap-2 rounded-lg px-2 py-1.5 text-left"
                          style={{ background: isSelected ? '#3b82f622' : '#ffffff06', border: `1px solid ${isSelected ? '#3b82f6' : '#ffffff11'}` }}
                          onClick={() => {
                            if (isSelected) setPendingMoves(p => p.filter(s => s !== slug));
                            else if (pendingMoves.length < 4) setPendingMoves(p => [...p, slug]);
                          }}>
                          <span className="text-white rounded px-1 font-bold shrink-0"
                            style={{ background: tc, fontSize: '0.38rem', padding: '1px 4px' }}>
                            {m.type.toUpperCase()}
                          </span>
                          <span className="text-white text-xs font-bold flex-1">{m.name}</span>
                          {(m as { power?: number }).power! > 0 && (
                            <span className="text-slate-400 text-xs shrink-0">{(m as { power?: number }).power}</span>
                          )}
                          {isSelected && <span className="text-blue-400 text-xs shrink-0">✓</span>}
                        </button>
                        <button onClick={() => setInfoSlug(s => s === slug ? null : slug)}
                          className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-slate-400 hover:text-white"
                          style={{ background: '#334155', fontSize: '0.55rem', border: '1px solid #475569' }}>
                          i
                        </button>
                      </div>
                      {infoSlug === slug && (() => {
                        if (!m) return null;
                        return (
                          <div className="mt-1 rounded-lg px-2 py-1.5 text-xs" style={{ background: '#1e293b', border: '1px solid #334155' }}>
                            {(m as {power?:number}).power! > 0 && <div className="text-slate-300">Puissance : <span className="text-white font-bold">{(m as {power?:number}).power}</span></div>}
                            <div className="text-slate-300">Précision : <span className="text-white font-bold">{m.accuracy}%</span></div>
                            <div className="text-slate-300">PP : <span className="text-white font-bold">{m.pp}</span></div>
                            {m.description && <div className="text-slate-400 mt-0.5 italic">{m.description}</div>}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bouton confirmer */}
      <div className="shrink-0 px-4 pb-4 pt-2 border-t border-slate-800">
        <button
          onClick={() => {
            // Auto-save current pokemon if still in edit mode
            let finalMap = { ...moveMap };
            if (editMode) {
              let toSave = [...pendingMoves];
              if (toSave.length < 4) {
                for (const s of (initialMoves[activePokemon] ?? [])) {
                  if (!toSave.includes(s) && toSave.length < 4) toSave.push(s);
                }
              }
              finalMap[activePokemon] = toSave;
            }
            onConfirm(finalMap);
          }}
          className="w-full py-3.5 rounded-xl font-black text-white text-base active:scale-[0.98] transition-transform"
          style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', boxShadow: '0 0 24px #a855f755' }}>
          ⚔️ Lancer le combat
        </button>
      </div>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

type Phase = 'mode_select' | 'compose_grid' | 'rental_select' | 'move_editor' | 'waiting';

export function PvpTeamSelect({
  opponentName, isHost, onConfirm, onCancel,
  pokemonCustomMoves, onSaveCustomMoves, sessionId,
}: Props) {
  const [phase, setPhase] = useState<Phase>('rental_select');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedRental, setSelectedRental] = useState<RentalTeamDef | null>(null);
  const [rentalRequired, setRentalRequired] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);
  const [statsModalId, setStatsModalId] = useState<number | null>(null);

  const allPokemon = useMemo(() =>
    [...GEN1_POKEMON].sort((a, b) => {
      const ra = RARITY_ORDER[a.rarity ?? 'commun'] ?? 0;
      const rb = RARITY_ORDER[b.rarity ?? 'commun'] ?? 0;
      return rb !== ra ? rb - ra : a.id - b.id;
    }), []);

  // Sync rental_required + opponent readiness depuis Supabase
  useEffect(() => {
    if (!sessionId) return;
    const chan = supabase
      .channel(`pvp_ts_${sessionId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pvp_sessions', filter: `id=eq.${sessionId}` },
        ({ new: row }) => {
          const r = row as Record<string, unknown>;
          if (r.rental_required === true) setRentalRequired(true);
          // Detect opponent ready: host watches guest_ready, guest watches host_ready
          const oppReadyField = isHost ? 'guest_ready' : 'host_ready';
          if (r[oppReadyField] === true) setOpponentReady(true);
        })
      .subscribe();
    return () => { supabase.removeChannel(chan); };
  }, [sessionId, isHost]);

  // Long-press : uniquement pointer events (pas touch en parallèle)
  const onPointerDown = useCallback((pokemonId: number) => {
    longPressFired.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      setStatsModalId(pokemonId);
    }, 500);
  }, []);

  const onPointerUp = useCallback((pokemonId: number) => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    if (longPressFired.current) { longPressFired.current = false; return; }
    // Clic court = toggle sélection
    setSelectedIds(prev => {
      if (prev.includes(pokemonId)) return prev.filter(id => id !== pokemonId);
      if (prev.length >= 3) return prev;
      return [...prev, pokemonId];
    });
  }, []);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  }, []);

  // Appel final après l'éditeur de moves
  const handleMovesConfirm = useCallback(async (moveMap: Record<number, string[]>) => {
    const teamIds = selectedRental
      ? selectedRental.members.map(m => m.pokemonId)
      : selectedIds;
    const isRental = !!selectedRental;

    // Sauvegarder les moves dans pokemonCustomMoves
    for (const id of teamIds) {
      onSaveCustomMoves?.(id, moveMap[id] ?? []);
    }

    // Mettre à jour rental_required en DB si besoin
    if (isRental && sessionId) {
      await supabase.from('pvp_sessions').update({ rental_required: true }).eq('id', sessionId);
    }

    const team: TeamMember[] = teamIds.map(id => {
      const hp = calcMaxHp(id, 100, undefined);
      return { pokemonId: id, isShiny: false, level: 100, xp: 0, currentHp: hp, maxHp: hp };
    });

    setPhase('waiting');
    onConfirm(team);
  }, [selectedRental, selectedIds, onSaveCustomMoves, sessionId, onConfirm]);

  // ── Écran d'attente ────────────────────────────────────────────────────────
  if (phase === 'waiting') {
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

  // Shared banner — shown on all selection phases when opponent is already ready
  const OpponentReadyBanner = opponentReady ? (
    <div style={{ position: 'fixed', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)', left: '50%', transform: 'translateX(-50%)', zIndex: 800, background: 'linear-gradient(135deg, #14532d, #166534)', border: '1.5px solid #4ade80aa', borderRadius: 24, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 0 20px #4ade8033, 0 4px 12px rgba(0,0,0,0.5)', whiteSpace: 'nowrap', animation: 'pvp-ready-pop 0.4s cubic-bezier(0.175,0.885,0.32,1.275) forwards' }}>
      <span style={{ fontSize: '1rem' }}>✅</span>
      <span style={{ color: '#86efac', fontWeight: 700, fontFamily: 'system-ui', fontSize: '0.875rem' }}><span style={{ color: '#4ade80', fontWeight: 900 }}>{opponentName}</span> est prêt(e) !</span>
    </div>
  ) : null;

  // ── Éditeur de moves ───────────────────────────────────────────────────────
  if (phase === 'move_editor') {
    const teamIds = selectedRental
      ? selectedRental.members.map(m => m.pokemonId)
      : selectedIds;
    const isRental = !!selectedRental;

    // Initialiser les moves : prédéfinis pour rental, custom/défaut pour compose
    const initialMoves: Record<number, string[]> = {};
    if (isRental && selectedRental) {
      for (const m of selectedRental.members) {
        initialMoves[m.pokemonId] = [...m.moves];
      }
    } else {
      for (const id of teamIds) {
        const custom = pokemonCustomMoves?.[id];
        initialMoves[id] = custom?.length === 4 ? [...custom] : getAvailableMoves(id, 100).slice(0, 4);
      }
    }

    return (
      <>
        <MoveEditorStep
          teamIds={teamIds}
          initialMoves={initialMoves}
          opponentName={opponentName}
          isRental={isRental}
          onBack={() => setPhase(isRental ? 'rental_select' : 'compose_grid')}
          onConfirm={handleMovesConfirm}
        />
        {OpponentReadyBanner}
      </>
    );
  }

  // ── Sélection d'équipe de prêt ─────────────────────────────────────────────
  if (phase === 'rental_select') {
    return (
      <div className="fixed inset-0 z-[700] flex flex-col bg-slate-950"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>

        {/* Cancel button */}
        <div className="shrink-0 flex items-center justify-between px-4 pt-4 pb-1">
          <button onClick={onCancel} className="text-slate-400 text-sm py-1 px-1 active:text-white">← Annuler</button>
          <span className="text-slate-500 text-xs">vs <span className="text-slate-300 font-bold">{opponentName}</span></span>
        </div>

        {/* VS Arena */}
        <div className="shrink-0 flex items-center justify-center gap-0 px-4 py-3 relative" style={{ minHeight: 110 }}>
          <div className="flex-1 flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-black border-2 border-indigo-500/60"
              style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81)', boxShadow: '0 0 20px #6366f155' }}>👤</div>
            <span className="text-indigo-300 text-xs font-bold">Toi</span>
          </div>
          <div className="flex-shrink-0 relative" style={{ width: 72 }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle, #a855f755 0%, transparent 70%)', animation: 'pvp-vs-pulse 1.5s ease-in-out infinite' }} />
            <div style={{ position: 'relative', fontSize: '2.2rem', fontWeight: 900, fontFamily: "'Press Start 2P', system-ui, sans-serif", background: 'linear-gradient(135deg, #facc15, #f97316, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textAlign: 'center', lineHeight: 1, animation: 'pvp-vs-zoom 0.6s cubic-bezier(0.175,0.885,0.32,1.275) forwards, pvp-vs-shake 2s 0.7s ease-in-out infinite', filter: 'drop-shadow(0 0 10px #f9731688)' }}>VS</div>
          </div>
          <div className="flex-1 flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-black border-2 border-red-500/60"
              style={{ background: 'linear-gradient(135deg, #3b0a0a, #7f1d1d)', boxShadow: '0 0 20px #ef444455' }}>👤</div>
            <span className="text-red-300 text-xs font-bold">{opponentName}</span>
          </div>
        </div>

        {/* Title */}
        <div className="shrink-0 px-4 pb-3 border-b border-slate-800">
          <div className="text-white font-black text-xl">🎴 Équipes de prêt</div>
          <div className="text-slate-400 text-sm mt-0.5">6 équipes · Niveau 100 · Attaques personnalisables ensuite</div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
          {RENTAL_TEAMS.map(teamDef => (
            <button
              key={teamDef.id}
              className="w-full rounded-2xl text-left active:scale-[0.98] transition-transform"
              style={{ border: `2px solid ${teamDef.color}55`, background: `${teamDef.color}08` }}
              onClick={() => {
                setSelectedRental(teamDef);
                setPhase('move_editor');
              }}
            >
              {/* En-tête */}
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

              {/* 3 Pokémon */}
              <div className="grid grid-cols-3 gap-2 px-3 pb-3">
                {teamDef.members.map((member, mi) => {
                  const pp = POKEMON_BY_ID[member.pokemonId];
                  const rc = RARITY_COLORS[(pp?.rarity ?? 'commun') as Rarity];
                  const types = (POKEMON_TYPE[member.pokemonId] ?? ['normal']) as PokemonType[];
                  const hp = calcMaxHp(member.pokemonId, 100, undefined);
                  return (
                    <div key={mi} className="flex flex-col items-center rounded-xl py-2 px-1"
                      style={{ background: '#0f172a', border: `1px solid ${rc}44` }}>
                      <div style={{ width: 56, height: 56, flexShrink: 0 }}>
                        <ShinySprite pokemonId={member.pokemonId} isShiny={false} width={56} height={56}
                          style={{ filter: `drop-shadow(0 0 5px ${rc})` }} />
                      </div>
                      <span className="text-white font-bold text-center leading-tight mt-1 w-full px-0.5 truncate"
                        style={{ fontSize: '0.5rem' }}>{pp?.name ?? `#${member.pokemonId}`}</span>
                      <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                        {types.map(t => (
                          <span key={t} className="text-white rounded px-1 font-bold"
                            style={{ background: TYPE_COLORS[t] ?? '#888', fontSize: '0.32rem', padding: '1px 3px' }}>
                            {t.toUpperCase()}
                          </span>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-x-1 mt-1 w-full px-1" style={{ fontSize: '0.38rem' }}>
                        <span className="text-slate-500 text-right">PV</span><span className="text-green-400 font-bold">{hp}</span>
                        <span className="text-slate-500 text-right">ATK</span><span className="text-orange-400 font-bold">{calcAttack(member.pokemonId, 100, undefined)}</span>
                        <span className="text-slate-500 text-right">VIT</span><span className="text-blue-400 font-bold">{calcSpeed(member.pokemonId, 100, undefined)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Attaques preview */}
              <div className="px-3 pb-3 grid grid-cols-3 gap-2 border-t border-slate-800/50 pt-2">
                {teamDef.members.map((member, mi) => {
                  const pp = POKEMON_BY_ID[member.pokemonId];
                  return (
                    <div key={mi}>
                      <div className="text-slate-500 font-bold mb-1" style={{ fontSize: '0.5rem' }}>{pp?.name}</div>
                      {member.moves.map(slug => {
                        const m = MOVES[slug];
                        if (!m) return null;
                        const tc = TYPE_COLORS[m.type as PokemonType] ?? '#888';
                        return (
                          <div key={slug} className="flex items-center gap-1 mb-0.5">
                            <span className="text-white rounded font-bold shrink-0"
                              style={{ background: tc, fontSize: '0.3rem', padding: '1px 3px' }}>
                              {m.type.slice(0, 3).toUpperCase()}
                            </span>
                            <span className="text-slate-300 font-bold truncate" style={{ fontSize: '0.48rem' }}>{m.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </button>
          ))}
        </div>
        {OpponentReadyBanner}
      </div>
    );
  }

  // ── Grille Composer ────────────────────────────────────────────────────────
  if (phase === 'compose_grid') {
    return (
      <div className="fixed inset-0 z-[700] flex flex-col bg-slate-950"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>

        <div className="shrink-0 px-4 pt-4 pb-3 border-b border-slate-800">
          <div className="flex items-center justify-between mb-1">
            <button onClick={() => { setPhase('mode_select'); setSelectedIds([]); }}
              className="text-slate-400 text-sm py-1 active:text-white">← Retour</button>
            <span className="text-slate-500 text-xs">vs {opponentName}</span>
          </div>
          <div className="text-white font-black text-xl">Composer mon équipe</div>
          <div className="text-indigo-400 text-xs mt-0.5">Touche = sélectionner · Appui long = voir les stats</div>

          {/* Sélection */}
          <div className="flex items-center gap-2 mt-3 min-h-[52px]">
            {selectedIds.map(id => {
              const pp = POKEMON_BY_ID[id];
              const rc = RARITY_COLORS[(pp?.rarity ?? 'commun') as Rarity];
              return (
                <button key={id} onClick={() => setSelectedIds(prev => prev.filter(x => x !== id))}
                  className="flex flex-col items-center active:scale-90 transition-transform">
                  <div className="relative">
                    <ShinySprite pokemonId={id} isShiny={false} width={44} height={44}
                      style={{ filter: `drop-shadow(0 0 5px ${rc})` }} />
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-white font-black"
                      style={{ fontSize: '0.45rem' }}>✕</div>
                  </div>
                  <span className="text-slate-300 font-bold" style={{ fontSize: '0.42rem' }}>{pp?.name}</span>
                </button>
              );
            })}
            {Array.from({ length: Math.max(0, 3 - selectedIds.length) }).map((_, i) => (
              <div key={i} className="w-11 h-11 rounded-full border-2 border-dashed border-slate-800 flex items-center justify-center">
                <span className="text-slate-700 text-lg font-bold">+</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          <div className="grid grid-cols-4 gap-2">
            {allPokemon.map(pdata => {
              const rarity = (pdata.rarity ?? 'commun') as Rarity;
              const rarityColor = RARITY_COLORS[rarity];
              const isSelected = selectedIds.includes(pdata.id);
              const selIdx = selectedIds.indexOf(pdata.id);
              return (
                <div
                  key={pdata.id}
                  style={{
                    background: isSelected ? `${rarityColor}22` : '#1e293b',
                    border: `2px solid ${isSelected ? rarityColor : '#334155'}`,
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'none',
                    userSelect: 'none',
                    borderRadius: 12,
                    padding: 6,
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    cursor: 'pointer', position: 'relative',
                  }}
                  onPointerDown={() => onPointerDown(pdata.id)}
                  onPointerUp={() => onPointerUp(pdata.id)}
                  onPointerLeave={cancelLongPress}
                  onPointerCancel={cancelLongPress}
                >
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-white font-black z-10"
                      style={{ background: rarityColor, fontSize: '0.5rem' }}>
                      {selIdx + 1}
                    </div>
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

        <div className="shrink-0 px-4 pb-4 pt-2 border-t border-slate-800">
          <button
            disabled={selectedIds.length !== 3}
            onClick={() => setPhase('move_editor')}
            className="w-full py-3.5 rounded-xl font-black text-base transition-all active:scale-[0.98]"
            style={{
              background: selectedIds.length === 3 ? 'linear-gradient(135deg, #6366f1, #a855f7)' : '#1e293b',
              color: selectedIds.length === 3 ? 'white' : '#475569',
              border: selectedIds.length === 3 ? 'none' : '1px solid #334155',
              boxShadow: selectedIds.length === 3 ? '0 0 24px #a855f755' : 'none',
            }}>
            {selectedIds.length === 3 ? '→ Choisir les attaques' : `Sélectionnez encore ${3 - selectedIds.length} Pokémon`}
          </button>
        </div>

        {/* Modal stats (appui long) */}
        {statsModalId !== null && (() => {
          const pp = POKEMON_BY_ID[statsModalId];
          const rc = RARITY_COLORS[(pp?.rarity ?? 'commun') as Rarity];
          const types = (POKEMON_TYPE[statsModalId] ?? ['normal']) as PokemonType[];
          const statsData = [
            { label: 'PV', val: calcMaxHp(statsModalId, 100, undefined) },
            { label: 'ATT', val: calcAttack(statsModalId, 100, undefined) },
            { label: 'DEF', val: calcDefense(statsModalId, 100, undefined) },
            { label: 'ATK S', val: calcSpAttack(statsModalId, 100, undefined) },
            { label: 'DEF S', val: calcSpDefense(statsModalId, 100, undefined) },
            { label: 'VIT', val: calcSpeed(statsModalId, 100, undefined) },
          ];
          const maxS = Math.max(...statsData.map(s => s.val), 1);
          return (
            <div className="fixed inset-0 z-[900] flex items-end justify-center bg-black/70 px-3 pb-6"
              onClick={() => setStatsModalId(null)}>
              <div className="w-full max-w-sm rounded-2xl p-4"
                style={{ background: '#0f172a', border: `2px solid ${rc}`, boxShadow: `0 0 32px ${rc}55` }}
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-3 mb-3">
                  <ShinySprite pokemonId={statsModalId} isShiny={false} width={56} height={56}
                    style={{ filter: `drop-shadow(0 0 8px ${rc})` }} />
                  <div>
                    <div className="text-white font-black text-base">{pp?.name ?? `#${statsModalId}`}</div>
                    <div className="text-slate-400 text-xs">Niveau 100</div>
                    <div className="flex gap-1 mt-1">{types.map(t => <TypeBadge key={t} type={t} />)}</div>
                  </div>
                  <button onClick={() => setStatsModalId(null)} className="ml-auto text-slate-500 text-lg">✕</button>
                </div>
                {statsData.map(({ label, val }) => (
                  <div key={label} className="flex items-center gap-2 mb-1.5">
                    <span className="text-slate-400 w-10 shrink-0" style={{ fontSize: '0.6rem' }}>{label}</span>
                    <div className="flex-1 bg-slate-800 rounded-full overflow-hidden" style={{ height: 6 }}>
                      <div className="h-full rounded-full"
                        style={{ width: `${Math.min(100, (val / maxS) * 100)}%`, background: `linear-gradient(90deg, ${rc}88, ${rc})` }} />
                    </div>
                    <span className="text-white font-bold w-8 text-right" style={{ fontSize: '0.65rem' }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
        {OpponentReadyBanner}
      </div>
    );
  }

  // ── Choix du mode ──────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[700] flex flex-col overflow-hidden"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)', background: 'radial-gradient(ellipse at 50% 30%, #1a0533 0%, #0a0a1a 60%, #000 100%)' }}>

      {/* Animated background sparks */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(18)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${5 + (i * 37 % 90)}%`,
            top: `${10 + (i * 53 % 80)}%`,
            width: i % 3 === 0 ? 3 : 2,
            height: i % 3 === 0 ? 3 : 2,
            borderRadius: '50%',
            background: i % 4 === 0 ? '#f59e0b' : i % 4 === 1 ? '#a855f7' : i % 4 === 2 ? '#6366f1' : '#ffffff',
            opacity: 0.6,
            animation: `pvp-spark-float ${2.5 + (i % 5) * 0.6}s ${(i * 0.3) % 2}s ease-in-out infinite alternate`,
          }} />
        ))}
      </div>

      {/* Top: cancel + "vs" label */}
      <div className="shrink-0 flex items-center justify-between px-4 pt-4 pb-2">
        <button onClick={onCancel} className="text-slate-400 text-sm py-1 px-1 active:text-white" style={{ fontFamily: 'system-ui', letterSpacing: '0.01em' }}>← Annuler</button>
        <span className="text-slate-500 text-xs">vs <span className="text-slate-300 font-bold">{opponentName}</span></span>
      </div>

      {/* VS Arena */}
      <div className="shrink-0 flex items-center justify-center gap-0 px-4 py-4 relative" style={{ minHeight: 140 }}>
        {/* Left trainer chip */}
        <div className="flex-1 flex flex-col items-center gap-1">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-black border-2 border-indigo-500/60"
            style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81)', boxShadow: '0 0 20px #6366f155' }}>
            👤
          </div>
          <span className="text-indigo-300 text-xs font-bold" style={{ fontFamily: 'system-ui' }}>Toi</span>
        </div>

        {/* VS badge */}
        <div className="flex-shrink-0 relative" style={{ width: 80 }}>
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: 'radial-gradient(circle, #a855f755 0%, transparent 70%)',
            animation: 'pvp-vs-pulse 1.5s ease-in-out infinite',
          }} />
          <div style={{
            position: 'relative',
            fontSize: '2.6rem',
            fontWeight: 900,
            fontFamily: "'Press Start 2P', system-ui, sans-serif",
            background: 'linear-gradient(135deg, #facc15, #f97316, #ef4444)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textAlign: 'center',
            lineHeight: 1,
            animation: 'pvp-vs-zoom 0.6s cubic-bezier(0.175,0.885,0.32,1.275) forwards, pvp-vs-shake 2s 0.7s ease-in-out infinite',
            filter: 'drop-shadow(0 0 12px #f9731688) drop-shadow(0 0 24px #f97316aa)',
          }}>VS</div>
          {/* Electric arcs */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', width: 60, height: 60, transform: 'translate(-50%,-50%)', animation: 'pvp-arc-spin 1.8s linear infinite', pointerEvents: 'none' }}>
            {['⚡', '⚡'].map((c, i) => (
              <span key={i} style={{ position: 'absolute', fontSize: '0.7rem', opacity: 0.7, top: i === 0 ? -4 : 'auto', bottom: i === 1 ? -4 : 'auto', left: '50%', transform: 'translateX(-50%)' }}>{c}</span>
            ))}
          </div>
        </div>

        {/* Right trainer chip */}
        <div className="flex-1 flex flex-col items-center gap-1">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-black border-2 border-red-500/60"
            style={{ background: 'linear-gradient(135deg, #3b0a0a, #7f1d1d)', boxShadow: '0 0 20px #ef444455' }}>
            👤
          </div>
          <span className="text-red-300 text-xs font-bold" style={{ fontFamily: 'system-ui' }}>{opponentName}</span>
        </div>
      </div>

      {/* Title */}
      <div className="shrink-0 text-center px-4 mb-2">
        <div className="text-white font-black text-xl" style={{ fontFamily: 'system-ui', letterSpacing: '-0.01em' }}>⚔️ Combat PvP</div>
        {rentalRequired ? (
          <div className="mt-1 text-yellow-400 font-bold text-sm" style={{ fontFamily: 'system-ui' }}>
            ⚠️ {opponentName} a choisi une équipe de prêt — vous devez en faire autant.
          </div>
        ) : (
          <div className="text-slate-400 text-xs mt-0.5" style={{ fontFamily: 'system-ui' }}>Mode compétitif · Gloire uniquement</div>
        )}
      </div>

      {OpponentReadyBanner}

      {/* Mode buttons */}
      <div className="flex-1 flex flex-col justify-center gap-4 px-5 pb-8">
        {!rentalRequired && (
          <button
            onClick={() => setPhase('compose_grid')}
            className="rounded-2xl text-left active:scale-[0.97] transition-transform"
            style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', border: '2px solid #6366f1aa', boxShadow: '0 0 32px #6366f122, 0 4px 24px rgba(0,0,0,0.5)', padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
            {/* Shimmer */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.04) 50%, transparent 60%)', animation: 'pvp-shimmer 3s 0.5s ease-in-out infinite' }} />
            <div className="flex items-center gap-4 relative">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0"
                style={{ background: 'rgba(99,102,241,0.25)', border: '1px solid #6366f155' }}>📚</div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-black text-base leading-tight" style={{ fontFamily: 'system-ui' }}>Composer mon équipe</div>
                <div className="text-indigo-300 text-sm mt-0.5" style={{ fontFamily: 'system-ui' }}>Pokédex complet · Niveau 100</div>
                <div className="text-indigo-400/60 text-xs mt-1" style={{ fontFamily: 'system-ui' }}>Sélection → attaques → combat</div>
              </div>
              <span className="text-indigo-400 text-xl shrink-0">›</span>
            </div>
          </button>
        )}

        <button
          onClick={() => setPhase('rental_select')}
          className="rounded-2xl text-left active:scale-[0.97] transition-transform"
          style={{ background: 'linear-gradient(135deg, #2d1b5e 0%, #4c1d95 100%)', border: '2px solid #a855f7aa', boxShadow: '0 0 32px #a855f722, 0 4px 24px rgba(0,0,0,0.5)', padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.04) 50%, transparent 60%)', animation: 'pvp-shimmer 3s 1.5s ease-in-out infinite' }} />
          <div className="flex items-center gap-4 relative">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0"
              style={{ background: 'rgba(168,85,247,0.25)', border: '1px solid #a855f755' }}>🎴</div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-black text-base leading-tight" style={{ fontFamily: 'system-ui' }}>Équipe de prêt</div>
              <div className="text-purple-300 text-sm mt-0.5" style={{ fontFamily: 'system-ui' }}>6 équipes · Niveau 100 · Équilibrées</div>
              <div className="text-purple-400/60 text-xs mt-1" style={{ fontFamily: 'system-ui' }}>Choix → attaques → combat</div>
            </div>
            <span className="text-purple-400 text-xl shrink-0">›</span>
          </div>
        </button>
      </div>
    </div>
  );
}
