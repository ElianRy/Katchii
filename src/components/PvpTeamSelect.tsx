/**
 * PvpTeamSelect — Sélection des 3 Pokémon pour le combat PvP.
 *
 * UX :
 *  - Clic court    : toggle sélection (max 3)
 *  - Appui long (500ms) : ouvre un modal de détails du Pokémon (stats calculées)
 *  - Section "Équipes sauvegardées" permet de valider une équipe en un clic
 *  - Bouton "Valider" actif quand exactement 3 Pokémon sont sélectionnés
 */
import React, { useState, useRef, useCallback, useMemo } from 'react';
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

const RARITY_ORDER: Record<string, number> = {
  commun: 0, peu_commun: 1, rare: 2, elite: 3, legendaire: 4,
};

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
    { label: 'PV',      val: hp },
    { label: 'ATT',     val: atk },
    { label: 'DEF',     val: def },
    { label: 'ATK SPÉ', val: spa },
    { label: 'DÉF SPÉ', val: spd },
    { label: 'VIT',     val: spe },
  ];
  const maxStat = Math.max(...stats.map(s => s.val), 1);

  return (
    <div
      className="fixed inset-0 z-[900] flex items-center justify-center bg-black/75 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs rounded-2xl overflow-hidden"
        style={{ background: '#0f172a', border: `2px solid ${rarityColor}`, boxShadow: `0 0 32px ${rarityColor}44` }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
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

        {/* Stats */}
        <div className="px-4 pb-4 flex flex-col gap-1.5">
          {stats.map(({ label, val }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-slate-400 text-xs w-16 shrink-0">{label}</span>
              <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (val / maxStat) * 100)}%`,
                    background: `linear-gradient(90deg, ${rarityColor}99, ${rarityColor})`,
                  }}
                />
              </div>
              <span className="text-white font-bold text-xs w-8 text-right">{val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PvpTeamSelect({ ownedPokemon, savedTeams, favoriteTeamId, opponentName, onConfirm, onCancel }: Props) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [detailMon, setDetailMon] = useState<OwnedPokemon | null>(null);
  const [activeTab, setActiveTab] = useState<'collection' | 'teams'>('teams');
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);

  // Sort collection by rarity desc then level desc
  const sorted = useMemo(() => [...ownedPokemon].sort((a, b) => {
    const pa = POKEMON_BY_ID[a.pokemonId];
    const pb = POKEMON_BY_ID[b.pokemonId];
    const ra = RARITY_ORDER[pa?.rarity ?? 'commun'] ?? 0;
    const rb = RARITY_ORDER[pb?.rarity ?? 'commun'] ?? 0;
    if (rb !== ra) return rb - ra;
    return b.level - a.level;
  }), [ownedPokemon]);

  const favoriteTeam = savedTeams.find(t => t.id === favoriteTeamId);

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

  const confirmFromSavedTeam = useCallback((team: SavedTeam) => {
    onConfirm(team.members.slice(0, 3));
  }, [onConfirm]);

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

  return (
    <div className="fixed inset-0 z-[700] flex flex-col bg-slate-950"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>

      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-slate-800">
        <div className="flex items-center justify-between mb-1">
          <button onClick={onCancel} className="text-slate-400 hover:text-white text-sm py-1">← Annuler</button>
          <span className="text-slate-500 text-xs">vs {opponentName}</span>
        </div>
        <div className="text-white font-black text-xl">Choisissez votre équipe</div>
        <div className="text-slate-400 text-sm">Sélectionnez 3 Pokémon · Appui long pour les stats</div>

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
        {(['teams', 'collection'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 py-2.5 text-sm font-bold transition-colors"
            style={{ color: activeTab === tab ? '#a855f7' : '#64748b', borderBottom: activeTab === tab ? '2px solid #a855f7' : '2px solid transparent' }}
          >
            {tab === 'teams' ? '⭐ Équipes' : '📚 Collection'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-3">

        {activeTab === 'teams' && (
          <div className="flex flex-col gap-3">
            {savedTeams.length === 0 ? (
              <div className="text-slate-600 text-sm text-center py-8">
                Aucune équipe sauvegardée.<br/>
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
                    onClick={() => confirmFromSavedTeam(team)}
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

        {activeTab === 'collection' && (
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

      {/* Footer confirm */}
      {activeTab === 'collection' && (
        <div className="shrink-0 px-4 pb-4 pt-2 border-t border-slate-800">
          <button
            disabled={selectedIds.length !== 3}
            onClick={confirmSelection}
            className="w-full py-3.5 rounded-xl font-black text-white text-base transition-all"
            style={{
              background: selectedIds.length === 3
                ? 'linear-gradient(135deg, #7c3aed, #a855f7)'
                : '#1e293b',
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
