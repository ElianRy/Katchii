import React, { useState, useCallback, useEffect } from 'react';
import { GameState, RARITY_COLORS } from '../types';
import { POKEMON_BY_ID } from '../data/gen1';
import { TeamMember } from './TeamBuilder';
import { BattleScreen } from './BattleScreen';
import { ShinySprite } from './ShinySprite';
import { calcMaxHp } from '../data/combatEngine';

interface Props {
  state: GameState;
  onClose: () => void;
  onVictory: () => void;
  onAddXp: (pokemonId: number, xp: number) => void;
  onZoneDiscovered?: () => void;
}

type Phase =
  | 'team_select'
  | 'dialogue_peter'    | 'starter_peter'    | 'battle_peter'
  | 'dialogue_giovanni' | 'starter_giovanni' | 'battle_giovanni'
  | 'dialogue_master'   | 'master_pick3'     | 'epic_intro' | 'battle_master'
  | 'victory';

const TRAINER_CONFIGS = [
  {
    id: 'peter' as const,
    name: 'Peter',
    title: "Maître d'Arène",
    image: '/trainers/peter.png',
    dialogues: [
      "Hm... un nouveau challenger.",
      "Tu es arrivé jusqu'ici. C'est déjà une prouesse.",
      "Mais moi, Peter, Maître d'Arène, je n'ai encore jamais été vaincu.",
      "Prépare ton équipe. Et bonne chance — tu en auras besoin.",
    ],
    teamSpec: [
      { pokemonId: 149, level: 83 },
      { pokemonId: 130, level: 81 },
      { pokemonId: 59,  level: 85 },
    ],
    color: '#ef4444',
    bg: 'linear-gradient(160deg, #1a0505 0%, #0a0000 100%)',
    accentBg: 'rgba(239,68,68,0.08)',
  },
  {
    id: 'giovanni' as const,
    name: 'Giovanni',
    title: 'Chef de la Team Rocket',
    image: '/trainers/giovanni.webp',
    dialogues: [
      "...",
      "Tu as réussi à battre Peter. Impressionnant.",
      "Mais moi, Giovanni — je ne te laisserai pas aller plus loin.",
      "La Team Rocket ne connaît pas la défaite.",
      "Montre-moi ce que tu vaux. Et prépare-toi à perdre.",
    ],
    teamSpec: [
      { pokemonId: 53,  level: 84 },
      { pokemonId: 112, level: 86 },
      { pokemonId: 34,  level: 88 },
    ],
    color: '#9ca3af',
    bg: 'linear-gradient(160deg, #0a0a0a 0%, #050505 100%)',
    accentBg: 'rgba(156,163,175,0.06)',
  },
  {
    id: 'master' as const,
    name: 'Le Maître',
    title: 'Champion de la Ligue',
    image: '/trainers/master.png',
    dialogues: [
      "...",
      "Tiens, tiens.",
      "On dirait que quelqu'un a réussi à se frayer un chemin jusqu'ici.",
      "Dois-je m'en impressionner ? Non.",
      "Peter et Giovanni sont de bons larbins. Pas plus.",
      "Moi... je suis une autre catégorie.",
      "J'espère que ce combat ne sera pas un mega tunnel.",
      "Montre-moi quelque chose d'intéressant. Si tu en es capable.",
    ],
    teamSpec: [
      { pokemonId: 94,  level: 92 },
      { pokemonId: 149, level: 94 },
      { pokemonId: 65,  level: 98, isShiny: true },
    ],
    color: '#a855f7',
    bg: 'linear-gradient(160deg, #0a0010 0%, #000005 100%)',
    accentBg: 'rgba(168,85,247,0.1)',
  },
] as const;

function buildEnemyTeam(specs: ReadonlyArray<{ pokemonId: number; level: number; isShiny?: boolean }>): TeamMember[] {
  return specs.map(s => {
    const maxHp = calcMaxHp(s.pokemonId, s.level);
    return { pokemonId: s.pokemonId, level: s.level, xp: 0, isShiny: s.isShiny ?? false, currentHp: maxHp, maxHp };
  });
}

/* ── TEAM SELECTION ── */
function TeamSelectScreen({ state, retrying, onConfirm, onClose }: {
  state: GameState;
  retrying: boolean;
  onConfirm: (team: number[]) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'level_desc' | 'level_asc' | 'rarity'>('level_desc');

  const rarityOrder = ['legendaire', 'elite', 'rare', 'peu_commun', 'commun'];

  const ownedIds = Array.from(new Set([
    ...Object.keys(state.normalCollection).map(Number),
    ...Object.keys(state.shinyCollection ?? {}).map(Number),
  ])).sort((a, b) => {
    const pa = POKEMON_BY_ID[a], pb = POKEMON_BY_ID[b];
    const la = state.pokemonLevels?.[a]?.level ?? 1;
    const lb = state.pokemonLevels?.[b]?.level ?? 1;
    if (sort === 'level_desc') return lb - la;
    if (sort === 'level_asc') return la - lb;
    return rarityOrder.indexOf(pa?.rarity ?? 'commun') - rarityOrder.indexOf(pb?.rarity ?? 'commun');
  });

  const filtered = ownedIds.filter(id => {
    const p = POKEMON_BY_ID[id];
    return p && p.name.toLowerCase().includes(search.toLowerCase());
  });

  const toggle = (id: number) => {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 9) return prev;
      return [...prev, id];
    });
  };

  return (
    <div className="fixed inset-0 z-[210] flex flex-col bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 shrink-0">
        <div>
          <h2 className="text-white font-black text-lg">🏆 Défi de la Ligue</h2>
          <p className="text-slate-400 text-xs">
            {retrying ? '❌ Défaite — choisis à nouveau ton équipe' : 'Max 9 Pokémon · même équipe pour les 3 combats · HP non restaurés'}
          </p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl px-2">✕</button>
      </div>

      {/* Opponents row */}
      <div className="flex gap-2 px-3 pt-2 pb-1 shrink-0">
        {TRAINER_CONFIGS.map((t, i) => (
          <div key={t.id} className="flex-1 rounded-xl p-2 border text-center"
            style={{ borderColor: `${t.color}44`, background: t.accentBg }}>
            <div className="text-xs font-black" style={{ color: t.color }}>Combat {i + 1} — {t.name}</div>
            <div className="text-slate-400 text-xs">max Nv.{Math.max(...t.teamSpec.map(s => s.level))}</div>
          </div>
        ))}
      </div>

      {/* Warning */}
      <div className="mx-3 mb-1 mt-1 px-3 py-1.5 rounded-xl bg-yellow-950/40 border border-yellow-700/30 shrink-0">
        <p className="text-yellow-300 text-xs font-semibold">⚠️ HP non restaurés entre les combats — KO = absent du combat suivant</p>
      </div>

      {/* Sort + search */}
      <div className="px-3 py-1.5 flex gap-2 shrink-0">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher..."
          className="flex-1 bg-slate-800 text-white rounded-xl px-3 py-1.5 text-sm border border-slate-700 outline-none"
        />
        <div className="flex gap-1 shrink-0">
          {([['level_desc', '↓Nv'], ['level_asc', '↑Nv'], ['rarity', '★']] as const).map(([k, label]) => (
            <button key={k} onClick={() => setSort(k)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{
                background: sort === k ? '#6366f1' : 'rgba(255,255,255,0.05)',
                color: sort === k ? 'white' : '#94a3b8',
                border: sort === k ? '1px solid #818cf8' : '1px solid rgba(255,255,255,0.1)',
              }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Selection count */}
      <div className="px-3 pb-1 shrink-0">
        <div className="text-slate-500 text-xs">{selected.length}/9 sélectionnés</div>
      </div>

      {/* Pokemon list */}
      <div className="flex-1 overflow-y-auto px-3 pb-28">
        <div className="flex flex-col gap-1.5">
          {filtered.map(id => {
            const p = POKEMON_BY_ID[id];
            if (!p) return null;
            const isSelected = selected.includes(id);
            const lvData = state.pokemonLevels?.[id] ?? { level: 1 };
            const isShiny = !!state.shinyCollection?.[id];
            const rarityColor = RARITY_COLORS[p.rarity];
            return (
              <button key={id} onClick={() => toggle(id)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl border-2 transition-all text-left"
                style={{
                  borderColor: isSelected ? '#fbbf24' : 'rgba(255,255,255,0.08)',
                  background: isSelected ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.02)',
                }}>
                {/* Sprite — compact mode to avoid sparkle lag */}
                <div className="relative shrink-0">
                  <ShinySprite pokemonId={id} isShiny={isShiny} width={44} height={44} alt={p.name} compact />
                  {isShiny && <span className="absolute -top-1 -right-1 text-xs leading-none">✨</span>}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-white font-bold text-sm truncate">{p.name}</span>
                    {isShiny && <span className="text-xs font-bold text-yellow-400 shrink-0">SHINY</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-slate-400 text-xs">Nv.{lvData.level}</span>
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                      style={{ background: `${rarityColor}22`, color: rarityColor, fontSize: '0.55rem' }}>
                      {p.rarity.toUpperCase().replace('_', ' ')}
                    </span>
                  </div>
                </div>
                {/* Checkmark */}
                <div className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: isSelected ? '#fbbf24' : 'rgba(255,255,255,0.08)' }}>
                  {isSelected && <span className="text-black font-black text-xs">✓</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-[220] p-4 bg-slate-950/98 border-t border-slate-800">
        <button disabled={selected.length < 1} onClick={() => onConfirm(selected)}
          className="w-full py-4 rounded-2xl font-black text-lg transition-all"
          style={{
            background: selected.length >= 1 ? 'linear-gradient(90deg, #f59e0b, #ef4444, #a855f7)' : '#374151',
            color: selected.length >= 1 ? 'black' : '#6b7280',
          }}>
          {selected.length < 1 ? 'Sélectionne tes Pokémon' : `⚔️ Commencer avec ${selected.length} Pokémon !`}
        </button>
      </div>
    </div>
  );
}

/* ── STARTER SELECT ── */
function StarterSelectScreen({ team, trainerName, trainerColor, onConfirm }: {
  team: TeamMember[];
  trainerName: string;
  trainerColor: string;
  onConfirm: (orderedTeam: TeamMember[]) => void;
}) {
  const [starterIdx, setStarterIdx] = useState(0);

  const handleConfirm = () => {
    const reordered = [
      team[starterIdx],
      ...team.filter((_, i) => i !== starterIdx),
    ];
    onConfirm(reordered);
  };

  return (
    <div className="fixed inset-0 z-[210] flex flex-col bg-slate-950">
      <div className="px-4 pt-6 pb-3 shrink-0 border-b border-slate-800">
        <h2 className="text-white font-black text-xl">⚔️ Qui commence ?</h2>
        <p className="text-slate-400 text-sm mt-0.5">Choisissez le Pokémon qui débutera le combat contre <span style={{ color: trainerColor }}>{trainerName}</span></p>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 pb-28">
        <div className="flex flex-col gap-2">
          {team.map((m, i) => {
            const p = POKEMON_BY_ID[m.pokemonId];
            const hpPct = m.currentHp / m.maxHp;
            const hpColor = hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#f59e0b' : '#ef4444';
            const isChosen = i === starterIdx;
            return (
              <button key={i} onClick={() => setStarterIdx(i)}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all"
                style={{
                  borderColor: isChosen ? trainerColor : 'rgba(255,255,255,0.1)',
                  background: isChosen ? `${trainerColor}15` : 'rgba(255,255,255,0.03)',
                  boxShadow: isChosen ? `0 0 12px ${trainerColor}44` : 'none',
                }}>
                <ShinySprite pokemonId={m.pokemonId} isShiny={m.isShiny ?? false} width={52} height={52} alt={p?.name ?? ''} compact />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold">{p?.name ?? '???'}</span>
                    {m.isShiny && <span className="text-xs text-yellow-400 font-bold">✨ SHINY</span>}
                    <span className="text-slate-400 text-xs ml-auto">Nv.{m.level}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-2 rounded-full bg-slate-700 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${hpPct * 100}%`, background: hpColor }} />
                    </div>
                    <span className="text-xs shrink-0" style={{ color: hpColor }}>{m.currentHp}/{m.maxHp} HP</span>
                  </div>
                </div>
                {isChosen && (
                  <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-black text-sm"
                    style={{ background: trainerColor, color: 'black' }}>→</div>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 z-[220] p-4 bg-slate-950/98 border-t border-slate-800">
        <button onClick={handleConfirm}
          className="w-full py-4 rounded-2xl font-black text-lg text-black"
          style={{ background: `linear-gradient(90deg, ${trainerColor}, ${trainerColor}aa)` }}>
          ⚔️ Commencer le combat !
        </button>
      </div>
    </div>
  );
}

/* ── MASTER PICK 3 ── */
function MasterPick3Screen({ survivors, onConfirm }: {
  survivors: TeamMember[];
  onConfirm: (team: TeamMember[]) => void;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const masterColor = '#a855f7';

  const toggle = (i: number) => {
    setSelected(prev => {
      if (prev.includes(i)) return prev.filter(x => x !== i);
      if (prev.length >= 3) return prev;
      return [...prev, i];
    });
  };

  return (
    <div className="fixed inset-0 z-[210] flex flex-col" style={{ background: 'linear-gradient(160deg, #0a0010 0%, #000005 100%)' }}>
      <div className="px-4 pt-6 pb-3 shrink-0 border-b border-purple-900/50">
        <h2 className="text-white font-black text-xl">⚡ Combat Final</h2>
        <p className="text-slate-300 text-sm mt-0.5">Choisissez <span className="text-purple-400 font-bold">3 Pokémon</span> pour affronter le Maître de la Ligue</p>
        <p className="text-slate-500 text-xs mt-0.5">HP non restaurés · uniquement vos survivants</p>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 pb-28">
        <div className="flex flex-col gap-2">
          {survivors.map((m, i) => {
            const p = POKEMON_BY_ID[m.pokemonId];
            const hpPct = m.currentHp / m.maxHp;
            const hpColor = hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#f59e0b' : '#ef4444';
            const isChosen = selected.includes(i);
            const choiceNum = selected.indexOf(i) + 1;
            return (
              <button key={i} onClick={() => toggle(i)}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all"
                style={{
                  borderColor: isChosen ? masterColor : 'rgba(255,255,255,0.1)',
                  background: isChosen ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.03)',
                  boxShadow: isChosen ? '0 0 12px rgba(168,85,247,0.4)' : 'none',
                }}>
                <ShinySprite pokemonId={m.pokemonId} isShiny={m.isShiny ?? false} width={52} height={52} alt={p?.name ?? ''} compact />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold">{p?.name ?? '???'}</span>
                    {m.isShiny && <span className="text-xs text-yellow-400 font-bold">✨</span>}
                    <span className="text-slate-400 text-xs ml-auto">Nv.{m.level}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-2 rounded-full bg-slate-700 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${hpPct * 100}%`, background: hpColor }} />
                    </div>
                    <span className="text-xs shrink-0" style={{ color: hpColor }}>{m.currentHp}/{m.maxHp}</span>
                  </div>
                </div>
                {isChosen && (
                  <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-black text-sm"
                    style={{ background: masterColor, color: 'black' }}>{choiceNum}</div>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 z-[220] p-4 bg-black/98 border-t border-purple-900/50">
        <div className="text-center text-slate-500 text-xs mb-2">{selected.length}/3 Pokémon sélectionnés</div>
        <button disabled={selected.length !== 3} onClick={() => onConfirm(selected.map(i => survivors[i]))}
          className="w-full py-4 rounded-2xl font-black text-lg text-white transition-all"
          style={{
            background: selected.length === 3
              ? 'linear-gradient(90deg, #7c3aed, #a855f7, #c026d3)'
              : '#1f1f2e',
            boxShadow: selected.length === 3 ? '0 0 20px rgba(168,85,247,0.5)' : 'none',
          }}>
          {selected.length === 3 ? '⚡ Affronter le Maître !' : `Choisissez ${3 - selected.length} Pokémon de plus`}
        </button>
      </div>
    </div>
  );
}

/* ── DIALOGUE SCREEN ── */
function DialogueScreen({ trainer, onDone }: {
  trainer: typeof TRAINER_CONFIGS[number];
  onDone: () => void;
}) {
  const [lineIdx, setLineIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const isMaster = trainer.id === 'master';

  const advance = () => {
    if (lineIdx < trainer.dialogues.length - 1) {
      setVisible(false);
      setTimeout(() => { setLineIdx(i => i + 1); setVisible(true); }, 180);
    } else {
      onDone();
    }
  };

  return (
    <div className="fixed inset-0 z-[210] flex flex-col select-none" style={{ background: trainer.bg }} onClick={advance}>
      {isMaster && (
        <div className="absolute inset-0 pointer-events-none"
          style={{ animation: 'league-lightning 4s ease-in-out infinite', background: 'rgba(168,85,247,0.05)' }} />
      )}

      <div className="px-5 pt-5 pb-2 shrink-0">
        <div className="font-black text-2xl tracking-wide" style={{ color: trainer.color, textShadow: `0 0 20px ${trainer.color}66` }}>
          {trainer.name}
        </div>
        <div className="text-slate-400 text-sm font-semibold">{trainer.title}</div>
      </div>

      <div className="flex-1 flex items-end justify-center relative overflow-hidden min-h-0">
        <div className="absolute bottom-0 w-72 h-56 pointer-events-none" style={{
          background: `radial-gradient(ellipse at 50% 100%, ${trainer.color}2a 0%, transparent 70%)`,
        }} />
        <img src={trainer.image} alt={trainer.name} draggable={false}
          className="relative z-10 select-none pointer-events-none"
          style={{
            height: 'min(62vw, 260px)',
            objectFit: 'contain', objectPosition: 'bottom',
            filter: isMaster ? `drop-shadow(0 0 24px ${trainer.color}99)` : `drop-shadow(0 0 14px ${trainer.color}55)`,
            animation: isMaster ? 'league-trainer-appear 0.6s ease-out' : 'badge-pop 0.5s ease-out',
          }}
        />
      </div>

      <div className="px-4 pb-5 pt-3 shrink-0">
        <div className="rounded-2xl px-5 py-4 border-2 relative"
          style={{
            background: 'rgba(5,5,15,0.95)',
            borderColor: trainer.color,
            boxShadow: `0 0 0 1px ${trainer.color}33, 0 0 30px ${trainer.color}22`,
            minHeight: 90,
          }}>
          <p className="font-bold text-base leading-relaxed transition-opacity duration-200"
            style={{
              opacity: visible ? 1 : 0,
              color: lineIdx === trainer.dialogues.length - 1 && isMaster ? trainer.color : '#f1f5f9',
              fontSize: lineIdx === trainer.dialogues.length - 1 && isMaster ? '1.05rem' : '1rem',
              textShadow: isMaster ? '0 1px 8px rgba(0,0,0,0.8)' : 'none',
            }}>
            {trainer.dialogues[lineIdx]}
          </p>
          <div className="flex items-center justify-between mt-3">
            <div className="flex gap-1">
              {trainer.dialogues.map((_, i) => (
                <div key={i} className="rounded-full transition-all"
                  style={{
                    width: i === lineIdx ? 12 : 6, height: 6,
                    background: i <= lineIdx ? trainer.color : 'rgba(255,255,255,0.15)',
                  }} />
              ))}
            </div>
            {lineIdx < trainer.dialogues.length - 1 && (
              <span className="text-slate-500 text-xs animate-pulse">Appuyer pour continuer ▶</span>
            )}
          </div>
        </div>

        {lineIdx === trainer.dialogues.length - 1 && (
          <button onClick={e => { e.stopPropagation(); onDone(); }}
            className="w-full mt-3 py-4 rounded-2xl font-black text-lg text-white"
            style={{
              background: isMaster
                ? 'linear-gradient(90deg, #7c3aed, #a855f7, #c026d3)'
                : `linear-gradient(90deg, ${trainer.color}, ${trainer.color}bb)`,
              boxShadow: isMaster ? `0 0 30px ${trainer.color}66` : 'none',
              animation: isMaster ? 'aura-pulse 1.5s ease-in-out infinite' : undefined,
            }}>
            ⚔️ {isMaster ? 'COMBATTRE LE MAÎTRE !' : `Combattre ${trainer.name} !`}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── EPIC MASTER INTRO — slow cinematic reveal ── */
function EpicIntroScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 5500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-[210] flex flex-col items-center justify-end overflow-hidden" style={{ background: '#000' }}>
      {/* Slow purple atmosphere glow — appears after 1.5s */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% 80%, rgba(120,40,200,0.35) 0%, transparent 70%)',
        animation: 'league-flash 5.5s ease-out forwards',
      }} />

      {/* Trainer image — fades in slowly from darkness */}
      <div className="relative z-10 flex items-end justify-center w-full"
        style={{ height: 'min(85vw, 360px)' }}>
        <img src="/trainers/master.png" alt="Le Maître" draggable={false}
          className="select-none pointer-events-none"
          style={{
            height: '100%',
            objectFit: 'contain', objectPosition: 'bottom',
            animation: 'master-reveal 4s 0.5s ease-out forwards',
            opacity: 0,
            filter: 'drop-shadow(0 0 30px rgba(168,85,247,0.6))',
          }}
        />
      </div>

      {/* Title — appears after image is visible */}
      <div className="z-10 text-center px-8 pb-12 pt-6"
        style={{ animation: 'league-title-enter 0.9s 3s cubic-bezier(0.175,0.885,0.32,1.275) both' }}>
        <div className="text-slate-400 text-xs font-bold tracking-widest uppercase mb-2">Combat Final</div>
        <div className="font-black mb-1"
          style={{
            fontSize: 'clamp(2.5rem, 10vw, 3.5rem)',
            lineHeight: 1.3,
            paddingTop: 4,
            background: 'linear-gradient(90deg, #7c3aed, #a855f7, #c026d3)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 20px rgba(168,85,247,0.8))',
          }}>
          LE MAÎTRE
        </div>
        <div className="text-purple-400 font-bold text-base tracking-wide">Champion de la Ligue</div>
      </div>
    </div>
  );
}

/* ── VICTORY FINAL ── */
function VictoryFinalScreen({ onClose, onZoneDiscovered }: { onClose: () => void; onZoneDiscovered?: () => void }) {
  const CONFETTI = Array.from({ length: 24 }, (_, i) => ({
    color: ['#fbbf24','#f472b6','#60a5fa','#4ade80','#fb923c','#a855f7','#34d399'][i % 7],
    left: `${(i * 41 + 7) % 100}%`,
    cx: `${((i * 23) % 60) - 30}px`,
    cdx: `${((i * 17) % 40) - 20}px`,
    cr: `${(i * 53) % 720 - 360}deg`,
    delay: `${(i * 0.06).toFixed(2)}s`,
    dur: `${0.9 + (i % 5) * 0.1}s`,
  }));
  return (
    <div className="fixed inset-0 z-[210] overflow-y-auto"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #1a0a3a 0%, #050010 60%, #000005 100%)' }}>
      {CONFETTI.map((c, i) => (
        <div key={i} style={{
          position: 'fixed', top: 0, left: c.left, width: 10, height: 10,
          borderRadius: 2, background: c.color,
          '--cx': c.cx, '--cdx': c.cdx, '--cr': c.cr,
          animation: `confetti-fall ${c.dur} ${c.delay} ease-in both`,
          pointerEvents: 'none', zIndex: 1,
        } as React.CSSProperties} />
      ))}
      <div className="flex flex-col items-center gap-5 p-6 py-10 relative z-10">
        <div style={{ fontSize: '5rem', animation: 'victory-trophy 0.8s cubic-bezier(0.175,0.885,0.32,1.275) forwards' }}>🏆</div>
        <div className="text-center" style={{ animation: 'victory-title 0.7s 0.3s ease-out both' }}>
          <h2 className="font-black text-4xl mb-1"
            style={{
              background: 'linear-gradient(90deg, #fbbf24, #a855f7, #60a5fa)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 20px rgba(251,191,36,0.5))',
            }}>CHAMPION !</h2>
          <p className="text-slate-300 font-bold text-lg">Tu as conquis la Ligue Pokémon !</p>
        </div>
        <div className="bg-slate-900/80 rounded-2xl p-5 border border-yellow-500/30 w-full max-w-sm text-center"
          style={{ animation: 'badge-pop 0.5s 0.6s ease-out both', boxShadow: '0 0 30px rgba(251,191,36,0.2)' }}>
          <div className="text-yellow-400 font-black text-lg mb-2">🎉 Félicitations !</div>
          <p className="text-slate-300 text-sm leading-relaxed">
            Tu as battu Peter, Giovanni et le Maître de la Ligue.<br />Tu es le nouveau Champion de Kanto !
          </p>
        </div>
        <div className="bg-purple-950/60 rounded-2xl p-5 border border-purple-500/40 w-full max-w-sm"
          style={{ animation: 'badge-pop 0.5s 0.9s ease-out both', boxShadow: '0 0 20px rgba(168,85,247,0.2)' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🌌</span>
            <div>
              <div className="text-purple-300 font-black text-base">Zone Libre</div>
              <div className="text-purple-500 text-xs">Débloquée !</div>
            </div>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed mb-3">
            La <span className="text-purple-300 font-bold">Zone Libre</span> est maintenant accessible. C'est la zone ultime où <span className="text-yellow-400 font-bold">tous les 151 Pokémon de Kanto</span> peuvent apparaître — y compris les légendaires.
          </p>
          {[
            { icon: '✨', text: 'Artikodin, Électhor, Sulfura, Mewtwo et Mew peuvent spawner' },
            { icon: '🌟', text: 'Complète le Pokédex entier — tous les 151' },
            { icon: '⭐', text: 'Des étoiles brillent dans le ciel de la zone' },
            { icon: '♾️', text: 'Pas de limite — continue à capturer et à progresser !' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2 mb-1">
              <span className="shrink-0">{item.icon}</span>
              <span className="text-slate-400 text-xs">{item.text}</span>
            </div>
          ))}
        </div>
        <button onClick={() => { onZoneDiscovered?.(); onClose(); }}
          className="w-full max-w-sm py-4 rounded-2xl font-black text-xl text-black"
          style={{
            background: 'linear-gradient(90deg, #fbbf24, #a855f7)',
            animation: 'badge-pop 0.5s 1.2s ease-out both',
            boxShadow: '0 0 30px rgba(251,191,36,0.4)',
          }}>
          🌌 Aller en Zone Libre →
        </button>
      </div>
    </div>
  );
}

/* ── MAIN ── */
export function LeagueChallengeScreen({ state, onClose, onVictory, onAddXp, onZoneDiscovered }: Props) {
  const [phase, setPhase] = useState<Phase>('team_select');
  const [currentTeam, setCurrentTeam] = useState<TeamMember[]>([]);
  const [masterTeam, setMasterTeam] = useState<TeamMember[]>([]);
  const [retrying, setRetrying] = useState(false);
  const [victoryHandled, setVictoryHandled] = useState(false);

  const handleTeamConfirm = useCallback((ids: number[]) => {
    const team: TeamMember[] = ids.map(id => {
      const lvData = state.pokemonLevels?.[id] ?? { level: 1, xp: 0 };
      const isShiny = !!(state.shinyCollection?.[id]);
      const maxHp = calcMaxHp(id, lvData.level);
      return { pokemonId: id, level: lvData.level, xp: lvData.xp, isShiny, currentHp: maxHp, maxHp };
    });
    setCurrentTeam(team);
    setRetrying(false);
    setPhase('dialogue_peter');
  }, [state]);

  const handleBattleEnd = useCallback(
    (nextPhase: Phase) =>
      (won: boolean, xpGains: Record<number, number>, finalTeam?: TeamMember[]) => {
        Object.entries(xpGains).forEach(([id, xp]) => onAddXp(Number(id), xp));
        if (!won) {
          setRetrying(true);
          setPhase('team_select');
          return;
        }
        if (finalTeam) {
          const survivors = finalTeam.filter(m => m.currentHp > 0);
          setCurrentTeam(survivors);
        }
        if (nextPhase === 'victory' && !victoryHandled) {
          setVictoryHandled(true);
          onVictory();
        }
        setPhase(nextPhase);
      },
    [onAddXp, onVictory, victoryHandled]
  );

  if (phase === 'team_select') {
    return <TeamSelectScreen state={state} retrying={retrying} onConfirm={handleTeamConfirm} onClose={onClose} />;
  }
  if (phase === 'dialogue_peter') {
    return <DialogueScreen trainer={TRAINER_CONFIGS[0]} onDone={() => setPhase('starter_peter')} />;
  }
  if (phase === 'starter_peter') {
    return <StarterSelectScreen team={currentTeam} trainerName="Peter" trainerColor="#ef4444"
      onConfirm={t => { setCurrentTeam(t); setPhase('battle_peter'); }} />;
  }
  if (phase === 'battle_peter') {
    return (
      <div className="fixed inset-0 z-[210]">
        <BattleScreen playerTeam={currentTeam} enemyTeam={buildEnemyTeam(TRAINER_CONFIGS[0].teamSpec)}
          bossName="Peter" onBattleEnd={handleBattleEnd('dialogue_giovanni')}
          onQuit={() => { setRetrying(true); setPhase('team_select'); }} />
      </div>
    );
  }
  if (phase === 'dialogue_giovanni') {
    return <DialogueScreen trainer={TRAINER_CONFIGS[1]} onDone={() => setPhase('starter_giovanni')} />;
  }
  if (phase === 'starter_giovanni') {
    return <StarterSelectScreen team={currentTeam} trainerName="Giovanni" trainerColor="#9ca3af"
      onConfirm={t => { setCurrentTeam(t); setPhase('battle_giovanni'); }} />;
  }
  if (phase === 'battle_giovanni') {
    return (
      <div className="fixed inset-0 z-[210]">
        <BattleScreen playerTeam={currentTeam} enemyTeam={buildEnemyTeam(TRAINER_CONFIGS[1].teamSpec)}
          bossName="Giovanni" onBattleEnd={handleBattleEnd('dialogue_master')}
          onQuit={() => { setRetrying(true); setPhase('team_select'); }} />
      </div>
    );
  }
  if (phase === 'dialogue_master') {
    return <DialogueScreen trainer={TRAINER_CONFIGS[2]} onDone={() => setPhase('master_pick3')} />;
  }
  if (phase === 'master_pick3') {
    return <MasterPick3Screen survivors={currentTeam}
      onConfirm={t => { setMasterTeam(t); setPhase('epic_intro'); }} />;
  }
  if (phase === 'epic_intro') {
    return <EpicIntroScreen onDone={() => setPhase('battle_master')} />;
  }
  if (phase === 'battle_master') {
    return (
      <div className="fixed inset-0 z-[210]">
        <div className="absolute inset-0 pointer-events-none z-10"
          style={{ boxShadow: 'inset 0 0 50px rgba(168,85,247,0.4)', animation: 'aura-pulse 1.2s ease-in-out infinite' }} />
        <BattleScreen playerTeam={masterTeam} enemyTeam={buildEnemyTeam(TRAINER_CONFIGS[2].teamSpec)}
          bossName="⚡ Le Maître ⚡" onBattleEnd={handleBattleEnd('victory')}
          onQuit={() => { setRetrying(true); setPhase('team_select'); }} />
      </div>
    );
  }
  if (phase === 'victory') {
    return <VictoryFinalScreen onClose={onClose} onZoneDiscovered={onZoneDiscovered} />;
  }
  return null;
}
