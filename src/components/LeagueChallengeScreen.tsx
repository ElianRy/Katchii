import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GameState, RARITY_COLORS } from '../types';
import { POKEMON_BY_ID } from '../data/gen1';
import { POKEMON_TYPE, TYPE_COLORS } from '../data/pokemonTypes';
import { TeamMember } from './TeamBuilder';
import { BattleScreen } from './BattleScreen';
import { ShinySprite } from './ShinySprite';
import { calcMaxHp } from '../data/combatEngine';
import { playLeagueVictory, playLeagueBattleMusic, stopMusic, playMusic, playShinySpawnLoud } from '../lib/audio';

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
  | 'victory' | 'defeat';

const TRAINER_CONFIGS = [
  {
    id: 'peter' as const,
    name: 'Peter',
    title: "Maître d'Arène",
    image: '/trainers/peter.png',
    companion: { pokemonId: 149, isShiny: false, image: '/trainers/dragonite.png' },
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
    companion: { pokemonId: 53, isShiny: false, image: '/trainers/persian.png' },
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
    name: 'Maître Berix',
    title: 'Champion de la Ligue',
    image: '/trainers/master.png',
    companion: { pokemonId: 65, isShiny: true, image: '/trainers/alakazam.png' },
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
    <div className="fixed inset-0 z-[600] flex flex-col bg-slate-950">
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
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-slate-400 text-xs">Nv.{lvData.level}</span>
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                      style={{ background: `${rarityColor}22`, color: rarityColor, fontSize: '0.55rem' }}>
                      {p.rarity.toUpperCase().replace('_', ' ')}
                    </span>
                    {(POKEMON_TYPE[id] ?? []).map(t => (
                      <span key={t} className="text-white font-bold rounded px-1 py-0.5"
                        style={{ background: TYPE_COLORS[t] ?? '#888', fontSize: '0.48rem' }}>
                        {t.toUpperCase()}
                      </span>
                    ))}
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
      <div className="fixed bottom-0 left-0 right-0 z-[610] p-4 bg-slate-950/98 border-t border-slate-800">
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
    <div className="fixed inset-0 z-[600] flex flex-col bg-slate-950">
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
      <div className="fixed bottom-0 left-0 right-0 z-[610] p-4 bg-slate-950/98 border-t border-slate-800">
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
  const maxPick = Math.min(3, survivors.length);
  const [selected, setSelected] = useState<number[]>([]);
  const masterColor = '#a855f7';

  const toggle = (i: number) => {
    setSelected(prev => {
      if (prev.includes(i)) return prev.filter(x => x !== i);
      if (prev.length >= maxPick) return prev;
      return [...prev, i];
    });
  };

  return (
    <div className="fixed inset-0 z-[600] flex flex-col" style={{ background: 'linear-gradient(160deg, #0a0010 0%, #000005 100%)' }}>
      <div className="px-4 pt-6 pb-3 shrink-0 border-b border-purple-900/50">
        <h2 className="text-white font-black text-xl">⚡ Combat Final</h2>
        <p className="text-slate-300 text-sm mt-0.5">
          Choisissez <span className="text-purple-400 font-bold">{maxPick} Pokémon</span> pour affronter le Maître de la Ligue
        </p>
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
      <div className="fixed bottom-0 left-0 right-0 z-[610] p-4 bg-black/98 border-t border-purple-900/50">
        <div className="text-center text-slate-500 text-xs mb-2">{selected.length}/{maxPick} Pokémon sélectionnés</div>
        <button disabled={selected.length !== maxPick} onClick={() => onConfirm(selected.map(i => survivors[i]))}
          className="w-full py-4 rounded-2xl font-black text-lg text-white transition-all"
          style={{
            background: selected.length === maxPick
              ? 'linear-gradient(90deg, #7c3aed, #a855f7, #c026d3)'
              : '#1f1f2e',
            boxShadow: selected.length === maxPick ? '0 0 20px rgba(168,85,247,0.5)' : 'none',
          }}>
          {selected.length === maxPick ? '⚡ Affronter le Maître !' : `Choisissez ${maxPick - selected.length} Pokémon de plus`}
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

  const isGiovanni = trainer.id === 'giovanni';

  useEffect(() => {
    if (isGiovanni && lineIdx === 0) playMusic('giovanni');
    if (isMaster && lineIdx === 1) playMusic('combat_berix');
  }, [isGiovanni, isMaster, lineIdx]);

  const advance = () => {
    if (lineIdx < trainer.dialogues.length - 1) {
      setVisible(false);
      setTimeout(() => { setLineIdx(i => i + 1); setVisible(true); }, 180);
    } else {
      onDone();
    }
  };

  return (
    <div className="fixed inset-0 z-[600] flex flex-col select-none" style={{ background: trainer.bg }} onClick={advance}>
      {isMaster && (
        <div className="absolute inset-0 pointer-events-none"
          style={{ animation: 'league-lightning 4s ease-in-out infinite', background: 'rgba(168,85,247,0.05)' }} />
      )}
      {/* Side effects cover the ENTIRE screen including header */}
      {isMaster && <MasterSideEffects />}

      <div className="px-5 pt-5 pb-2 shrink-0" style={{ position: 'relative', zIndex: 5 }}>
        <div className="font-black text-2xl tracking-wide" style={{ color: trainer.color, textShadow: `0 0 20px ${trainer.color}66` }}>
          {trainer.name}
        </div>
        <div className="text-slate-400 text-sm font-semibold">{trainer.title}</div>
      </div>

      <div className="flex-1 relative overflow-hidden min-h-0">

        <div className="absolute bottom-0 w-full h-40 pointer-events-none" style={{
          background: `radial-gradient(ellipse at 50% 100%, ${trainer.color}35 0%, transparent 70%)`,
        }} />

        {/* Trainer always centered */}
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-center pointer-events-none">
          <img src={trainer.image} alt={trainer.name} draggable={false}
            className="relative select-none shrink-0"
            style={{
              height: isMaster ? 'min(85vw, 360px)' : trainer.id === 'giovanni' ? 'min(80vw, 330px)' : 'min(70vw, 290px)',
              zIndex: 10,
              objectFit: 'contain', objectPosition: 'bottom',
              filter: isMaster && lineIdx === 0
                ? 'brightness(0) drop-shadow(0 0 24px rgba(168,85,247,0.3))'
                : isMaster
                  ? `brightness(1) drop-shadow(0 0 24px ${trainer.color}99)`
                  : `drop-shadow(0 0 14px ${trainer.color}55)`,
              transition: isMaster ? 'filter 1.2s ease-out, transform 0.8s cubic-bezier(0.34,1.56,0.64,1)' : undefined,
              transform: isMaster && lineIdx === 0 ? 'scale(0.9)' : 'scale(1)',
              animation: isMaster ? 'league-trainer-appear 0.6s ease-out' : 'badge-pop 0.5s ease-out',
            }}
          />
        </div>

        {/* Companion */}
        {(!isMaster || lineIdx >= 3) && (
          isMaster ? (
            <AlakazamReveal trainer={trainer} key="alakazam-reveal" />
          ) : (
            <div className="absolute pointer-events-none"
              style={{
                right: trainer.id === 'peter' ? '-6%' : '18%',
                bottom: trainer.id === 'peter' ? '-4%' : '0',
                width: trainer.id === 'peter' ? 'min(66vw, 275px)' : 'min(46vw, 185px)',
                height: trainer.id === 'peter' ? 'min(66vw, 275px)' : 'min(46vw, 185px)',
                zIndex: 11,
                animation: 'badge-pop 0.5s ease-out both',
              }}>
              <img src={trainer.companion.image}
                alt={POKEMON_BY_ID[trainer.companion.pokemonId]?.name ?? ''}
                draggable={false} className="w-full h-full select-none"
                style={{ objectFit: 'contain', objectPosition: 'bottom',
                  filter: `drop-shadow(0 0 10px ${trainer.color}77)` }} />
            </div>
          )
        )}
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

/* ── MASTER BATTLE SIDE EFFECTS — energy pillars left & right ── */
function MasterSideEffects() {
  const SPARKS = Array.from({ length: 10 }, (_, i) => ({
    bottom: `${5 + i * 9}%`,
    delay: `${(i * 0.25).toFixed(2)}s`,
    dur: `${1.4 + (i % 3) * 0.5}s`,
  }));
  const BOLTS_L = ['10%','28%','48%','65%','82%'];
  const BOLTS_R = ['12%','32%','52%','68%','86%'];
  const TOP_BOLTS = ['15%','32%','50%','68%','84%'];

  const pillar = (side: 'left' | 'right') => (
    <div className="absolute top-0 bottom-0 pointer-events-none z-[215]"
      style={{ [side]: 0, width: 28 }}>
      <div className="absolute inset-0"
        style={{
          background: side === 'left'
            ? 'linear-gradient(to right, rgba(168,85,247,0.55), transparent)'
            : 'linear-gradient(to left, rgba(168,85,247,0.55), transparent)',
          animation: `side-energy-${side === 'left' ? 'l' : 'r'} ${side === 'left' ? '1.7s' : '2.1s'} ease-in-out infinite`,
        }} />
      {(side === 'left' ? BOLTS_L : BOLTS_R).map((top, i) => (
        <div key={i} className="absolute text-purple-300 text-xs font-black select-none"
          style={{
            top, [side]: 2,
            animation: `side-lightning-bolt ${1.5 + i * 0.5}s ${(i * 0.35).toFixed(1)}s ease-in-out infinite`,
            textShadow: '0 0 8px #a855f7',
          }}>⚡</div>
      ))}
      {SPARKS.map((s, i) => (
        <div key={i} className="absolute w-1 h-1 rounded-full pointer-events-none"
          style={{
            bottom: s.bottom, [side]: 6,
            background: i % 3 === 0 ? '#e879f9' : i % 3 === 1 ? '#a855f7' : '#c026d3',
            animation: `side-spark ${s.dur} ${s.delay} ease-out infinite`,
            boxShadow: '0 0 4px #a855f7',
          }} />
      ))}
    </div>
  );

  return (
    <>
      {pillar('left')}
      {pillar('right')}
      {/* Top horizontal energy bar */}
      <div className="absolute top-0 left-0 right-0 pointer-events-none z-[215]" style={{ height: 26 }}>
        <div className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(168,85,247,0.6), transparent)',
            animation: 'side-energy-top 1.9s ease-in-out infinite',
          }} />
        {TOP_BOLTS.map((left, i) => (
          <div key={i} className="absolute text-purple-300 text-xs font-black select-none"
            style={{
              top: 2, left,
              animation: `side-lightning-bolt ${1.6 + i * 0.4}s ${(i * 0.28).toFixed(1)}s ease-in-out infinite`,
              textShadow: '0 0 8px #a855f7',
            }}>⚡</div>
        ))}
      </div>
    </>
  );
}

/* ── ALAKAZAM STAR-BURST REVEAL ── */
const ALAKA_SPARKLES = [
  { top:'3%',left:'10%',sz:20,del:'0.1s',dur:'1.2s'},{ top:'8%',left:'78%',sz:16,del:'0s',dur:'1.0s'},
  { top:'30%',left:'2%',sz:18,del:'0.2s',dur:'1.4s'},{ top:'20%',left:'88%',sz:14,del:'0.05s',dur:'1.7s'},
  { top:'55%',left:'62%',sz:16,del:'0.35s',dur:'1.1s'},{ top:'6%',left:'44%',sz:13,del:'0.15s',dur:'1.5s'},
  { top:'45%',left:'18%',sz:15,del:'0.4s',dur:'1.2s'},{ top:'65%',left:'80%',sz:12,del:'0.08s',dur:'1.6s'},
  { top:'15%',left:'33%',sz:19,del:'0.5s',dur:'1.0s'},{ top:'72%',left:'38%',sz:14,del:'0.28s',dur:'1.3s'},
  { top:'38%',left:'52%',sz:11,del:'0.6s',dur:'1.1s'},{ top:'82%',left:'14%',sz:16,del:'0.18s',dur:'1.4s'},
  { top:'50%',left:'90%',sz:13,del:'0.42s',dur:'1.2s'},{ top:'25%',left:'58%',sz:15,del:'0.65s',dur:'0.9s'},
];

function AlakazamReveal({ trainer }: { trainer: { companion: { image: string; pokemonId: number }; color: string } }) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setRevealed(true);
    playShinySpawnLoud();
  }, []);

  const size = 'min(52vw, 215px)';

  return (
    <div className="absolute pointer-events-none"
      style={{ right: '2%', bottom: 'min(14vw, 60px)', width: size, height: size, zIndex: 11 }}>

      {/* Initial starburst flash */}
      {!revealed && (
        <div className="absolute inset-0 flex items-center justify-center">
          {/* 8 rays expanding outward */}
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="absolute pointer-events-none"
              style={{
                width: 3, height: '55%',
                background: 'linear-gradient(to top, #fde047, rgba(168,85,247,0.6), transparent)',
                transformOrigin: 'bottom center',
                transform: `rotate(${i * 45}deg) translateX(-50%)`,
                top: '0%', left: '50%',
                animation: 'legendary-ray 0.8s ease-out forwards',
                '--angle': `${i * 45}deg`,
              } as React.CSSProperties} />
          ))}
          {/* Central glow */}
          <div className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(ellipse, rgba(253,224,71,0.9) 0%, rgba(168,85,247,0.5) 40%, transparent 70%)',
              animation: 'pokeball-flash 0.8s ease-out forwards',
            }} />
        </div>
      )}

      {/* Alakazam — appears with scale-in when revealed */}
      {revealed && (
        <>
          <div className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 50% 55%, rgba(253,224,71,0.2) 0%, rgba(96,165,250,0.12) 35%, rgba(168,85,247,0.1) 60%, transparent 80%)',
              animation: 'aura-pulse 1.6s ease-in-out infinite',
            }} />
          <img src={trainer.companion.image} alt="" draggable={false}
            className="w-full h-full select-none"
            style={{
              objectFit: 'contain', objectPosition: 'bottom',
              animation: 'alakazam-appear 0.6s cubic-bezier(0.34,1.56,0.64,1) both, alakazam-float 3s 0.6s ease-in-out infinite',
              filter: 'drop-shadow(0 0 8px #fde047) drop-shadow(0 0 18px #a855f7)',
            }} />
          {ALAKA_SPARKLES.map((s, i) => (
            <div key={i} className="absolute pointer-events-none"
              style={{ top: s.top, left: s.left, width: s.sz, height: s.sz,
                animation: `shiny-sparkle ${s.dur} ${s.del} ease-in-out infinite` }}>
              <svg viewBox="0 0 10 10" width={s.sz} height={s.sz}>
                <path d="M5 0 L5.6 4.4 L10 5 L5.6 5.6 L5 10 L4.4 5.6 L0 5 L4.4 4.4 Z"
                  fill="#fde047" stroke="#fbbf24" strokeWidth="0.3"
                  style={{ filter: 'drop-shadow(0 0 4px #fde047)' }} />
              </svg>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

/* ── EPIC MASTER INTRO — slow cinematic reveal ── */
function EpicIntroScreen({ onDone }: { onDone: () => void }) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    const t = setTimeout(() => onDoneRef.current(), 6000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[600] flex flex-col items-center justify-center overflow-hidden" style={{ background: '#000' }}>
      <MasterSideEffects />
      {/* Radial purple glow — appears progressively */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 70% 70% at 50% 55%, rgba(120,40,200,0.4) 0%, transparent 70%)',
        animation: 'master-reveal 5s 0.3s ease-out forwards',
        opacity: 0,
      }} />

      {/* Trainer image — centered, fades in slowly from pure black */}
      <div className="relative z-10 flex items-center justify-center w-full flex-1">
        <img src="/trainers/master.png" alt="Le Maître" draggable={false}
          className="select-none pointer-events-none"
          style={{
            maxHeight: 'min(68vh, 400px)',
            maxWidth: '80vw',
            objectFit: 'contain',
            animation: 'master-reveal 4.5s 0.5s ease-out forwards',
            opacity: 0,
          }}
        />
      </div>

      {/* Title — slides up after image is visible */}
      <div className="z-10 text-center px-8 pb-10 shrink-0"
        style={{ animation: 'league-title-enter 0.9s 3.5s cubic-bezier(0.175,0.885,0.32,1.275) both' }}>
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
          MAÎTRE BERIX
        </div>
        <div className="text-purple-400 font-bold text-base tracking-wide">Champion de la Ligue</div>
      </div>
    </div>
  );
}

/* ── DEFEAT SCREEN ── */
interface DefeatStats {
  lostAgainst: string;
  trainerColor: string;
  damageByEnemy: Array<{ pokemonId: number; damage: number; level: number }>;
}

function DefeatScreen({ stats, onRetry, onClose }: {
  stats: DefeatStats;
  onRetry: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[600] flex flex-col items-center justify-center overflow-y-auto px-4 py-8"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #1a0505 0%, #050000 60%, #000 100%)' }}>
      <div style={{ fontSize: '5rem', animation: 'victory-trophy 0.7s cubic-bezier(0.175,0.885,0.32,1.275) forwards' }}>💀</div>

      <div className="text-center mt-3 mb-5" style={{ animation: 'victory-title 0.6s 0.2s ease-out both' }}>
        <h2 className="font-black text-4xl text-red-400 mb-1" style={{ textShadow: '0 0 30px rgba(239,68,68,0.6)' }}>
          Dommage…
        </h2>
        <p className="text-slate-400 text-base font-semibold">
          Vaincu par{' '}
          <span className="font-black" style={{ color: stats.trainerColor }}>{stats.lostAgainst}</span>
        </p>
      </div>

      {/* Damage breakdown by enemy pokemon — ALL shown, sorted by dmg desc */}
      {stats.damageByEnemy.length > 0 && (
        <div className="w-full max-w-sm rounded-2xl border border-red-900/40 bg-black/60 p-4 mb-4"
          style={{ animation: 'badge-pop 0.5s 0.4s ease-out both', boxShadow: '0 0 20px rgba(239,68,68,0.1)' }}>
          <div className="text-red-400 font-black text-xs mb-3 uppercase tracking-widest">Équipe adverse</div>
          {[...stats.damageByEnemy]
            .sort((a, b) => b.damage - a.damage)
            .map((row, i) => {
              const totalDmg = stats.damageByEnemy.reduce((s, r) => s + r.damage, 0);
              const pct = totalDmg > 0 ? row.damage / totalDmg : 0;
              const pkData = POKEMON_BY_ID[row.pokemonId];
              const pName = pkData?.name ?? `#${row.pokemonId}`;
              const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${row.pokemonId}.png`;
              const rarityColor = pkData ? RARITY_COLORS[pkData.rarity] : '#6b7280';
              const types = POKEMON_TYPE[row.pokemonId] ?? [];
              return (
                <div key={i} className="py-2 border-b border-slate-800/60 last:border-0">
                  <div className="flex items-center gap-2">
                    <img src={spriteUrl} width={44} height={44}
                      style={{ imageRendering: 'pixelated', filter: `drop-shadow(0 0 4px ${rarityColor})`, flexShrink: 0 }} alt={pName} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-white text-sm font-black truncate">{pName}</span>
                        <span className="text-slate-400 text-xs shrink-0">Nv.{row.level}</span>
                      </div>
                      {/* Type badges */}
                      <div className="flex gap-1 mt-0.5 mb-1">
                        {types.map(t => (
                          <span key={t} className="text-white font-bold rounded px-1.5 py-0.5"
                            style={{ background: TYPE_COLORS[t as keyof typeof TYPE_COLORS] ?? '#6b7280', fontSize: '0.5rem' }}>
                            {t.toUpperCase()}
                          </span>
                        ))}
                      </div>
                      {/* Damage bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-800 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct * 100}%`, background: row.damage > 0 ? 'linear-gradient(90deg,#ef4444,#f97316)' : 'transparent' }} />
                        </div>
                        <span className="text-xs font-black shrink-0" style={{ color: row.damage > 0 ? '#f87171' : '#475569', minWidth: 40, textAlign: 'right' }}>
                          {row.damage > 0 ? `${row.damage} dmg` : '0 dmg'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      <p className="text-slate-500 text-xs text-center max-w-xs mb-6" style={{ animation: 'badge-pop 0.5s 0.6s ease-out both' }}>
        Reviens plus fort — les HP seront restaurés pour le prochain essai.
      </p>

      <div className="flex flex-col gap-3 w-full max-w-sm" style={{ animation: 'badge-pop 0.5s 0.7s ease-out both' }}>
        <button onClick={onRetry} className="w-full py-4 rounded-2xl font-black text-lg text-black"
          style={{ background: 'linear-gradient(90deg, #ef4444, #f97316)', boxShadow: '0 0 20px rgba(239,68,68,0.4)' }}>
          🔄 Réessayer
        </button>
        <button onClick={onClose} className="w-full py-3 rounded-2xl font-bold text-base text-slate-400 border border-slate-700">
          ✕ Quitter
        </button>
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
    <div className="fixed inset-0 z-[600] overflow-y-auto"
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

  // Preload trainer images so they appear instantly in battle
  useEffect(() => {
    ['/trainers/peter.png', '/trainers/giovanni.webp', '/trainers/master.png',
     '/trainers/dragonite.png', '/trainers/persian.png', '/trainers/alakazam.png'].forEach(src => {
      const img = new Image(); img.src = src;
    });
  }, []);
  const [defeatStats, setDefeatStats] = useState<DefeatStats | null>(null);

  const OPPONENT_META: Record<string, { name: string; color: string }> = {
    dialogue_giovanni: { name: 'Peter',      color: '#ef4444' },
    dialogue_master:   { name: 'Giovanni',   color: '#9ca3af' },
    victory:           { name: 'Maître Berix',  color: '#a855f7' },
  };

  const handleTeamConfirm = useCallback((ids: number[]) => {
    const team: TeamMember[] = ids.map(id => {
      const lvData = state.pokemonLevels?.[id] ?? { level: 1, xp: 0 };
      const isShiny = !!(state.shinyCollection?.[id]);
      const maxHp = calcMaxHp(id, lvData.level);
      return { pokemonId: id, level: lvData.level, xp: lvData.xp, isShiny, currentHp: maxHp, maxHp };
    });
    setCurrentTeam(team);
    setRetrying(false);
    setDefeatStats(null);
    playLeagueBattleMusic();
    setPhase('dialogue_peter');
  }, [state]);

  const handleBattleEnd = useCallback(
    (nextPhase: Phase, enemySpecs: ReadonlyArray<{ pokemonId: number; level: number; isShiny?: boolean }>) =>
      (won: boolean, xpGains: Record<number, number>, finalTeam?: TeamMember[], enemyDmg?: Record<number, number>) => {
        Object.entries(xpGains).forEach(([id, xp]) => onAddXp(Number(id), xp));
        if (!won) {
          const meta = OPPONENT_META[nextPhase] ?? { name: 'ton adversaire', color: '#ef4444' };
          // Include ALL enemy pokemon, even those with 0 damage
          const damageByEnemy = enemySpecs.map(s => ({
            pokemonId: s.pokemonId,
            level: s.level,
            damage: enemyDmg?.[s.pokemonId] ?? 0,
          }));
          setDefeatStats({
            lostAgainst: meta.name,
            trainerColor: meta.color,
            damageByEnemy,
          });
          setRetrying(true);
          setPhase('defeat');
          return;
        }
        if (finalTeam) {
          const survivors = finalTeam.filter(m => m.currentHp > 0);
          setCurrentTeam(survivors);
        }
        if (nextPhase === 'dialogue_giovanni') {
          setTimeout(() => playMusic('giovanni'), 300); // after BattleScreen unmount cleanup
        } else if (nextPhase === 'dialogue_master') {
          // Giovanni beaten — stop music completely; combat_berix plays at Berix reveal
          stopMusic(0.3);
        } else if (nextPhase === 'victory' && !victoryHandled) {
          setVictoryHandled(true);
          stopMusic(0.5);
          setTimeout(() => playLeagueVictory(), 600);
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
      <div className="fixed inset-0 z-[600]">
        <BattleScreen isLeague suppressVictorySound playerTeam={currentTeam} enemyTeam={buildEnemyTeam(TRAINER_CONFIGS[0].teamSpec)}
          bossName="Peter" trainerImage="/trainers/peter.png" trainerColor="#ef4444" onBattleEnd={handleBattleEnd('dialogue_giovanni', TRAINER_CONFIGS[0].teamSpec)}
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
      <div className="fixed inset-0 z-[600]">
        <BattleScreen keepMusic suppressVictorySound playerTeam={currentTeam} enemyTeam={buildEnemyTeam(TRAINER_CONFIGS[1].teamSpec)}
          bossName="Giovanni" trainerImage="/trainers/giovanni.webp" trainerColor="#9ca3af" onBattleEnd={handleBattleEnd('dialogue_master', TRAINER_CONFIGS[1].teamSpec)}
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
      <div className="fixed inset-0 z-[600]">
        <div className="absolute inset-0 pointer-events-none z-10"
          style={{ boxShadow: 'inset 0 0 50px rgba(168,85,247,0.4)', animation: 'aura-pulse 1.2s ease-in-out infinite' }} />
        <BattleScreen keepMusic playerTeam={masterTeam} enemyTeam={buildEnemyTeam(TRAINER_CONFIGS[2].teamSpec)}
          bossName="⚡ Maître Berix ⚡"
          trainerImage="/trainers/master.png" trainerColor="#a855f7"
          sideOverlay={<MasterSideEffects />}
          onBattleEnd={handleBattleEnd('victory', TRAINER_CONFIGS[2].teamSpec)}
          onQuit={() => { setRetrying(true); setPhase('team_select'); }} />
      </div>
    );
  }
  if (phase === 'defeat' && defeatStats) {
    return <DefeatScreen stats={defeatStats}
      onRetry={() => { setPhase('team_select'); }}
      onClose={onClose} />;
  }
  if (phase === 'victory') {
    return <VictoryFinalScreen onClose={onClose} onZoneDiscovered={onZoneDiscovered} />;
  }
  return null;
}
