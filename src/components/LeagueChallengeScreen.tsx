import React, { useState, useCallback, useEffect } from 'react';
import { GameState } from '../types';
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
  | 'dialogue_peter'   | 'battle_peter'
  | 'dialogue_giovanni'| 'battle_giovanni'
  | 'dialogue_master'  | 'epic_intro' | 'battle_master'
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
      "Tu es réellement là.",
      "Personne n'est jamais arrivé devant moi.",
      "Je suis le sommet. La fin du voyage pour tous les dresseurs.",
      "Tu veux te battre contre moi ?",
      "Alors prépare-toi.",
      "JE VAIS TE MONTRER CE QU'EST LA VRAIE PUISSANCE.",
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

/* ── TEAM SELECTION — pick 9, same squad for all 3 fights ── */
function TeamSelectScreen({
  state,
  retrying,
  onConfirm,
  onClose,
}: {
  state: GameState;
  retrying: boolean;
  onConfirm: (team: number[]) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const [search, setSearch] = useState('');

  const ownedIds = Array.from(new Set([
    ...Object.keys(state.normalCollection).map(Number),
    ...Object.keys(state.shinyCollection ?? {}).map(Number),
  ])).sort((a, b) => {
    const la = state.pokemonLevels?.[a]?.level ?? 1;
    const lb = state.pokemonLevels?.[b]?.level ?? 1;
    return lb - la;
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
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 shrink-0">
        <div>
          <h2 className="text-white font-black text-lg">🏆 Défi de la Ligue</h2>
          <p className="text-slate-400 text-xs">
            {retrying
              ? '❌ Défaite — choisissez à nouveau votre équipe'
              : '9 Pokémon · même équipe pour les 3 combats · HP non restaurés'}
          </p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl px-2">✕</button>
      </div>

      {/* Opponents preview */}
      <div className="flex gap-2 px-3 pt-3 pb-2 shrink-0">
        {TRAINER_CONFIGS.map((t, i) => (
          <div key={t.id} className="flex-1 rounded-xl p-2 border text-center"
            style={{ borderColor: `${t.color}33`, background: t.accentBg }}>
            <div className="text-xs font-black mb-0.5" style={{ color: t.color }}>Combat {i + 1}</div>
            <div className="text-white text-xs font-bold">{t.name}</div>
            <div className="text-slate-500 text-xs">Nv. {Math.max(...t.teamSpec.map(s => s.level))}</div>
          </div>
        ))}
      </div>

      {/* Warning */}
      <div className="mx-3 mb-2 px-3 py-2 rounded-xl bg-yellow-950/40 border border-yellow-600/30 shrink-0">
        <p className="text-yellow-300 text-xs font-semibold">
          ⚠️ Les HP ne sont pas restaurés entre les combats. Les Pokémon KO restent KO.
          Choisissez des Pokémon de haut niveau !
        </p>
      </div>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex gap-1 px-3 pb-2 flex-wrap shrink-0">
          {selected.map(id => {
            const p = POKEMON_BY_ID[id];
            const lv = state.pokemonLevels?.[id]?.level ?? 1;
            return (
              <button key={id} onClick={() => toggle(id)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-bold"
                style={{ borderColor: 'rgba(251,191,36,0.5)', background: 'rgba(251,191,36,0.1)', color: '#fbbf24' }}>
                <ShinySprite pokemonId={id} isShiny={!!state.shinyCollection?.[id]} width={16} height={16} alt="" />
                {p?.name.split(' ')[0]} {lv} ✕
              </button>
            );
          })}
        </div>
      )}

      {/* Search */}
      <div className="px-3 pb-2 shrink-0">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un Pokémon..."
          className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm border border-slate-700 outline-none"
        />
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-3 pb-24">
        <div className="grid grid-cols-4 gap-2">
          {filtered.map(id => {
            const p = POKEMON_BY_ID[id];
            if (!p) return null;
            const isSelected = selected.includes(id);
            const lvData = state.pokemonLevels?.[id] ?? { level: 1 };
            const isShiny = !!state.shinyCollection?.[id];
            return (
              <button key={id}
                onClick={() => toggle(id)}
                className="flex flex-col items-center gap-0.5 p-2 rounded-xl border-2 transition-all"
                style={{
                  borderColor: isSelected ? '#fbbf24' : 'rgba(255,255,255,0.1)',
                  background: isSelected ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.03)',
                }}>
                <ShinySprite pokemonId={id} isShiny={isShiny} width={40} height={40} alt={p.name} />
                <span className="text-white text-xs font-bold leading-none">{p.name.split(' ')[0]}</span>
                <span className="text-slate-400 text-xs">Nv.{lvData.level}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CTA */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-slate-950/95 border-t border-slate-800">
        <button
          disabled={selected.length < 1}
          onClick={() => onConfirm(selected)}
          className="w-full py-4 rounded-2xl font-black text-lg transition-all"
          style={{
            background: selected.length >= 1
              ? 'linear-gradient(90deg, #f59e0b, #ef4444, #a855f7)'
              : '#374151',
            color: selected.length >= 1 ? 'black' : '#6b7280',
          }}>
          {selected.length < 1
            ? 'Sélectionnez vos Pokémon'
            : `⚔️ Commencer avec ${selected.length} Pokémon !`}
        </button>
      </div>
    </div>
  );
}

/* ── DIALOGUE SCREEN ── */
function DialogueScreen({
  trainer,
  onDone,
}: {
  trainer: typeof TRAINER_CONFIGS[number];
  onDone: () => void;
}) {
  const [lineIdx, setLineIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const isMaster = trainer.id === 'master';

  const advance = () => {
    if (lineIdx < trainer.dialogues.length - 1) {
      setVisible(false);
      setTimeout(() => { setLineIdx(i => i + 1); setVisible(true); }, 200);
    } else {
      onDone();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: trainer.bg }} onClick={advance}>
      {isMaster && (
        <div className="absolute inset-0 pointer-events-none"
          style={{ animation: 'league-lightning 4s ease-in-out infinite', background: 'rgba(168,85,247,0.06)' }} />
      )}

      <div className="px-5 pt-6 pb-2 shrink-0">
        <div className="font-black text-2xl" style={{ color: trainer.color }}>{trainer.name}</div>
        <div className="text-slate-400 text-sm font-semibold">{trainer.title}</div>
      </div>

      <div className="flex-1 flex items-end justify-center relative overflow-hidden">
        <div className="absolute bottom-0 w-64 h-48 pointer-events-none" style={{
          background: `radial-gradient(ellipse at 50% 100%, ${trainer.color}22 0%, transparent 70%)`,
        }} />
        <img
          src={trainer.image}
          alt={trainer.name}
          className="relative z-10 select-none"
          style={{
            height: '65vw', maxHeight: 280,
            objectFit: 'contain', objectPosition: 'bottom',
            filter: isMaster
              ? `drop-shadow(0 0 20px ${trainer.color}88)`
              : `drop-shadow(0 0 12px ${trainer.color}44)`,
            animation: isMaster ? 'league-trainer-appear 0.6s ease-out' : 'badge-pop 0.5s ease-out',
          }}
          draggable={false}
        />
      </div>

      <div className="px-4 pb-6 pt-2 shrink-0">
        <div className="rounded-2xl p-4 border relative"
          style={{
            background: 'rgba(0,0,0,0.85)',
            borderColor: `${trainer.color}55`,
            boxShadow: `0 0 20px ${trainer.color}22`,
            minHeight: 80,
          }}>
          <p className="text-white font-bold text-base leading-relaxed"
            style={{
              opacity: visible ? 1 : 0,
              transition: 'opacity 0.2s',
              color: lineIdx === trainer.dialogues.length - 1 && isMaster ? trainer.color : 'white',
              fontSize: lineIdx === trainer.dialogues.length - 1 && isMaster ? '1.1rem' : '1rem',
            }}>
            {trainer.dialogues[lineIdx]}
          </p>
          <div className="flex items-center justify-between mt-3">
            <div className="flex gap-1">
              {trainer.dialogues.map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full transition-all"
                  style={{ background: i <= lineIdx ? trainer.color : 'rgba(255,255,255,0.2)' }} />
              ))}
            </div>
            {lineIdx < trainer.dialogues.length - 1 && (
              <span className="text-slate-500 text-xs">Appuyez pour continuer...</span>
            )}
          </div>
        </div>

        {lineIdx === trainer.dialogues.length - 1 && (
          <button
            onClick={e => { e.stopPropagation(); onDone(); }}
            className="w-full mt-3 py-4 rounded-2xl font-black text-lg text-white"
            style={{
              background: isMaster
                ? 'linear-gradient(90deg, #7c3aed, #a855f7, #c026d3)'
                : `linear-gradient(90deg, ${trainer.color}, ${trainer.color}cc)`,
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

/* ── EPIC MASTER INTRO ── */
function EpicIntroScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ background: 'black' }}>
      {[15, 35, 55, 75, 88].map((left, i) => (
        <div key={i} className="absolute top-0 pointer-events-none"
          style={{
            left: `${left}%`, width: 3, height: '100%',
            background: `linear-gradient(to bottom, transparent, rgba(168,85,247,${0.6 + i * 0.08}), transparent)`,
            animation: `league-lightning ${0.15 + i * 0.07}s step-end infinite`,
            animationDelay: `${i * 0.2}s`,
          }} />
      ))}
      <div className="absolute inset-0 pointer-events-none" style={{ animation: 'league-flash 3.2s ease-out forwards' }} />
      <div className="text-center z-10 px-8" style={{ animation: 'league-title-enter 0.8s 0.3s cubic-bezier(0.175,0.885,0.32,1.275) both' }}>
        <div className="text-slate-500 text-sm font-bold tracking-widest uppercase mb-3">Combat Final</div>
        <div className="font-black text-5xl mb-2"
          style={{
            background: 'linear-gradient(90deg, #7c3aed, #a855f7, #c026d3, #a855f7)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 20px rgba(168,85,247,0.8))',
            animation: 'aura-pulse 1s ease-in-out infinite',
          }}>
          LE MAÎTRE
        </div>
        <div className="text-purple-400 font-bold text-lg tracking-wide">Champion de la Ligue</div>
        <div className="text-slate-600 text-xs mt-4 animate-pulse">Le combat commence...</div>
      </div>
    </div>
  );
}

/* ── VICTORY FINAL SCREEN ── */
function VictoryFinalScreen({ onClose, onZoneDiscovered }: { onClose: () => void; onZoneDiscovered?: () => void }) {
  const CONFETTI = Array.from({ length: 24 }, (_, i) => ({
    color: ['#fbbf24', '#f472b6', '#60a5fa', '#4ade80', '#fb923c', '#a855f7', '#34d399'][i % 7],
    left: `${(i * 41 + 7) % 100}%`,
    cx: `${((i * 23) % 60) - 30}px`,
    cdx: `${((i * 17) % 40) - 20}px`,
    cr: `${(i * 53) % 720 - 360}deg`,
    delay: `${(i * 0.06).toFixed(2)}s`,
    dur: `${0.9 + (i % 5) * 0.1}s`,
  }));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto"
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

      <div className="flex flex-col items-center gap-6 p-6 py-10 relative z-10">
        <div style={{ fontSize: '5rem', animation: 'victory-trophy 0.8s cubic-bezier(0.175,0.885,0.32,1.275) forwards' }}>🏆</div>

        <div className="text-center" style={{ animation: 'victory-title 0.7s 0.3s ease-out both' }}>
          <h2 className="font-black text-4xl mb-1"
            style={{
              background: 'linear-gradient(90deg, #fbbf24, #a855f7, #60a5fa)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 20px rgba(251,191,36,0.5))',
            }}>
            CHAMPION !
          </h2>
          <p className="text-slate-300 font-bold text-lg">Tu as conquis la Ligue Pokémon !</p>
        </div>

        <div className="bg-slate-900/80 rounded-2xl p-5 border border-yellow-500/30 w-full max-w-sm text-center"
          style={{ animation: 'badge-pop 0.5s 0.6s ease-out both', boxShadow: '0 0 30px rgba(251,191,36,0.2)' }}>
          <div className="text-yellow-400 font-black text-lg mb-2">🎉 Félicitations !</div>
          <p className="text-slate-300 text-sm leading-relaxed">
            Tu as battu Peter, Giovanni et le Maître de la Ligue.<br />
            Tu es le nouveau Champion de Kanto !
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
            La <span className="text-purple-300 font-bold">Zone Libre</span> est maintenant accessible.
            C'est la zone ultime où <span className="text-yellow-400 font-bold">tous les 151 Pokémon de Kanto</span> peuvent apparaître — y compris les légendaires.
          </p>
          <div className="flex flex-col gap-2">
            {[
              { icon: '✨', text: 'Artikodin, Électhor, Sulfura, Mewtwo et Mew peuvent spawner' },
              { icon: '🌟', text: 'Complète le Pokédex entier — tous les 151' },
              { icon: '⭐', text: 'Des étoiles brillent dans le ciel de la zone' },
              { icon: '♾️', text: 'Pas de limite — continue à capturer et à progresser !' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-base shrink-0">{item.icon}</span>
                <span className="text-slate-400 text-xs">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => { onZoneDiscovered?.(); onClose(); }}
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

/* ── MAIN COMPONENT ── */
export function LeagueChallengeScreen({ state, onClose, onVictory, onAddXp, onZoneDiscovered }: Props) {
  const [phase, setPhase] = useState<Phase>('team_select');
  const [currentTeam, setCurrentTeam] = useState<TeamMember[]>([]);
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
        // Carry over HP from finalTeam (dead pokemon stay dead)
        if (finalTeam) {
          setCurrentTeam(finalTeam.filter(m => m.currentHp > 0));
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
    return <DialogueScreen trainer={TRAINER_CONFIGS[0]} onDone={() => setPhase('battle_peter')} />;
  }
  if (phase === 'battle_peter') {
    return (
      <BattleScreen
        playerTeam={currentTeam}
        enemyTeam={buildEnemyTeam(TRAINER_CONFIGS[0].teamSpec)}
        bossName="Peter"
        onBattleEnd={handleBattleEnd('dialogue_giovanni')}
        onQuit={() => { setRetrying(true); setPhase('team_select'); }}
      />
    );
  }
  if (phase === 'dialogue_giovanni') {
    return <DialogueScreen trainer={TRAINER_CONFIGS[1]} onDone={() => setPhase('battle_giovanni')} />;
  }
  if (phase === 'battle_giovanni') {
    return (
      <BattleScreen
        playerTeam={currentTeam}
        enemyTeam={buildEnemyTeam(TRAINER_CONFIGS[1].teamSpec)}
        bossName="Giovanni"
        onBattleEnd={handleBattleEnd('dialogue_master')}
        onQuit={() => { setRetrying(true); setPhase('team_select'); }}
      />
    );
  }
  if (phase === 'dialogue_master') {
    return <DialogueScreen trainer={TRAINER_CONFIGS[2]} onDone={() => setPhase('epic_intro')} />;
  }
  if (phase === 'epic_intro') {
    return <EpicIntroScreen onDone={() => setPhase('battle_master')} />;
  }
  if (phase === 'battle_master') {
    return (
      <div className="fixed inset-0 z-50">
        <div className="absolute inset-0 pointer-events-none z-10"
          style={{ boxShadow: 'inset 0 0 40px rgba(168,85,247,0.3)', animation: 'aura-pulse 1.2s ease-in-out infinite' }} />
        <BattleScreen
          playerTeam={currentTeam}
          enemyTeam={buildEnemyTeam(TRAINER_CONFIGS[2].teamSpec)}
          bossName="⚡ Le Maître ⚡"
          onBattleEnd={handleBattleEnd('victory')}
          onQuit={() => { setRetrying(true); setPhase('team_select'); }}
        />
      </div>
    );
  }
  if (phase === 'victory') {
    return <VictoryFinalScreen onClose={onClose} onZoneDiscovered={onZoneDiscovered} />;
  }
  return null;
}
