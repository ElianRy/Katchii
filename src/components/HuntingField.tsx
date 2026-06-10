import { useEffect, useRef, useState, useCallback } from 'react';
import { TutorialOverlay, isTutorialDone } from './TutorialOverlay';
import { HUNT_TUTORIAL } from './TutorialContent';
import { ZoneBackground } from './ZoneBackground';
import { SpawnedPokemonCard } from './SpawnedPokemonCard';
import { HUD } from './HUD';
import { useGameState } from '../hooks/useGameState';
import { useSpawner } from '../hooks/useSpawner';
import { POKEMON_BY_ID } from '../data/gen1';
import { Zone, ZONE_BY_ID, ZONE_ORDER } from '../data/zones';
import { ZoneUnlockCondition } from '../types';
import { playZoneMusic, stopMusic, playSfxCapture, playSfxShinyCapture, playCatchPoke } from '../lib/audio';

const ZONE_GROUND: Record<string, { ground: string; bush: string }> = {
  zone1: { ground: 'linear-gradient(to top, #14532d 0%, #166534 40%, transparent 100%)', bush: 'linear-gradient(to top, #15803d, #22c55e)' },
  zone2: { ground: 'linear-gradient(to top, #0c4a6e 0%, #075985 40%, transparent 100%)', bush: 'linear-gradient(to top, #0369a1, #38bdf8)' },
  zone3: { ground: 'linear-gradient(to top, #1c1917 0%, #292524 40%, transparent 100%)', bush: 'linear-gradient(to top, #44403c, #78716c)' },
  zone4: { ground: 'linear-gradient(to top, #14532d 0%, #166534 40%, transparent 100%)', bush: 'linear-gradient(to top, #15803d, #86efac)' },
  zone5: { ground: 'linear-gradient(to top, #1e1b4b 0%, #2e1065 40%, transparent 100%)', bush: 'linear-gradient(to top, #4c1d95, #7c3aed)' },
  zone6: { ground: 'linear-gradient(to top, #2e1065 0%, #4a1d96 40%, transparent 100%)', bush: 'linear-gradient(to top, #6d28d9, #a855f7)' },
  zone7: { ground: 'linear-gradient(to top, #7c2d12 0%, #9a3412 40%, transparent 100%)', bush: 'linear-gradient(to top, #b45309, #f97316)' },
  zone8: { ground: 'linear-gradient(to top, #1c1917 0%, #292524 40%, transparent 100%)', bush: 'linear-gradient(to top, #57534e, #a8a29e)' },
  zone_libre: { ground: 'linear-gradient(to top, #1e1b4b 0%, #312e81 40%, transparent 100%)', bush: 'linear-gradient(to top, #4f46e5, #818cf8)' },
};
import { NewCaptureModal } from './NewCaptureModal';
import { ZoneInfoPanel } from './ZoneInfoPanel';
import { BossFightPanel } from './BossFightPanel';
import { LeagueChallengeScreen } from './LeagueChallengeScreen';

interface Notification {
  id: number;
  text: string;
  x: number;
  y: number;
  isNew: boolean;
}

let notifCounter = 0;


interface Props {
  onOpenCollection: () => void;
  onOpenTeam: () => void;
  onOpenAdmin?: () => void;
  isAdmin?: boolean;
  onOpenLures: () => void;
  onOpenQuests: () => void;
  onOpenDuels: () => void;
  onOpenRaid: () => void;
  onOpenWrapped: () => void;
  onChangeUniverse: () => void;
  onOpenSettings?: () => void;
  gameState: ReturnType<typeof useGameState>;
}

interface NewCaptureInfo {
  pokemonName: string;
  pokemonId: number;
  isShiny: boolean;
  rarity: string;
  level: number;
  totalCaught: number;
}

export function HuntingField({ onOpenCollection, onOpenTeam, onOpenAdmin, isAdmin, onOpenLures, onOpenQuests, onOpenDuels, onOpenRaid, onOpenWrapped, onChangeUniverse, onOpenSettings, gameState }: Props) {
  const spawner = useSpawner(gameState);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [cooldownSecs, setCooldownSecs] = useState(0);
  const [onCooldown, setOnCooldown] = useState(false);
  const [newCaptureInfo, setNewCaptureInfo] = useState<NewCaptureInfo | null>(null);
  const [showZoneInfo, setShowZoneInfo] = useState(false);
  const [showBossFight, setShowBossFight] = useState(false);
  const [fightZone, setFightZone] = useState<Zone | null>(null);
  const [discoveredZone, setDiscoveredZone] = useState<{ name: string; pokemonIds: number[] } | null>(null);
  const [bossReadyAnim, setBossReadyAnim] = useState(false);
  const prevBossUnlockedRef = useRef(false);
  const [zoneTransition, setZoneTransition] = useState<'left' | 'right' | null>(null);
  const processingRef = useRef<Set<string>>(new Set());
  const capturingRef = useRef(false);
  const [showTutorial, setShowTutorial] = useState(() => !isTutorialDone('hunt'));

  // Update cooldown every second
  useEffect(() => {
    const id = setInterval(() => {
      setCooldownSecs(gameState.cooldownRemaining());
      setOnCooldown(gameState.isOnCooldown());
    }, 500);
    return () => clearInterval(id);
  }, [gameState]);

  const addNotification = useCallback((text: string, x: number, y: number, isNew: boolean) => {
    const id = notifCounter++;
    setNotifications((prev) => [...prev, { id, text, x, y, isNew }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 1500);
  }, []);

  const handleCapture = useCallback(
    (uid: string, pokemonId: number, _characterId: string | undefined, isShiny: boolean, x: number, y: number) => {
      if (capturingRef.current) return; // LOCK: only one capture at a time
      if (processingRef.current.has(uid)) return;
      if (gameState.isOnCooldown()) return;

      capturingRef.current = true;
      processingRef.current.add(uid);

      spawner.capture(uid);

      setTimeout(() => {
        const pokemon = POKEMON_BY_ID[pokemonId];
        if (!pokemon) {
          processingRef.current.delete(uid);
          capturingRef.current = false;
          return;
        }
        const isDoublon = !isShiny && (gameState.state.normalCollection[pokemonId] ?? 0) > 0;
        const doubonLevel = gameState.state.pokemonLevels?.[pokemonId]?.level ?? 1;
        const doublonXp = doubonLevel * doubonLevel;
        const { pts, level: pokemonLevel } = gameState.addCapture(pokemonId, isShiny, pokemon.rarity);
        const totalCaught = Object.values(gameState.state.normalCollection as Record<number,number>).filter(v => v > 0).length + Object.values(gameState.state.shinyCollection as Record<number,number>).filter(v => v > 0).length;
        const isEpic = pokemon.rarity === 'legendaire' || isShiny;
        // Capture sounds
        playCatchPoke();
        if (!isDoublon) {
          if (isEpic) setTimeout(() => playSfxShinyCapture(), 300);
          else setTimeout(() => playSfxCapture(), 300);
        }
        if (pts > 0) {
          addNotification(`+${pts} pts !`, x, y, true);
          addNotification('Nouveau !', x, y - 8, true);
          setNewCaptureInfo({ pokemonName: pokemon.name, pokemonId, isShiny, rarity: pokemon.rarity, level: pokemonLevel, totalCaught });
        } else if (isDoublon) {
          addNotification(`+${doublonXp} XP !`, x, y, true);
          addNotification('Doublon !', x, y - 8, false);
          if (isEpic) {
            setNewCaptureInfo({ pokemonName: pokemon.name, pokemonId, isShiny, rarity: pokemon.rarity, level: pokemonLevel, totalCaught });
          }
        } else if (isShiny) {
          // Shiny duplicate (pts===0, not counted as isDoublon because isShiny)
          addNotification(`+${doublonXp} XP !`, x, y, true);
          addNotification('Doublon Shiny !', x, y - 8, false);
          setNewCaptureInfo({ pokemonName: pokemon.name, pokemonId, isShiny: true, rarity: pokemon.rarity, level: pokemonLevel, totalCaught });
        }
        processingRef.current.delete(uid);
        capturingRef.current = false; // UNLOCK
      }, 700);
    },
    [spawner, gameState, addNotification]
  );

  const capturedCount = Object.keys(gameState.state.normalCollection).length;
  const totalPokemon = 151;
  const questsCompleted = gameState.state.dailyQuests.quests.filter(
    (q) => q.completed && !q.rewardClaimed
  ).length;

  const currentZoneId = gameState.state.zoneProgress?.currentZoneId ?? 'zone1';
  const currentZone = ZONE_BY_ID[currentZoneId];

  const currentZoneIdx = ZONE_ORDER.indexOf(currentZoneId);
  const prevZoneId = currentZoneIdx > 0 ? ZONE_ORDER[currentZoneIdx - 1] : null;
  const nextZoneId = currentZoneIdx >= 0 && currentZoneIdx < ZONE_ORDER.length - 1 ? ZONE_ORDER[currentZoneIdx + 1] : null;
  const unlockedZones = gameState.state.zoneProgress?.unlockedZones ?? ['zone1'];
  const canGoNext = nextZoneId !== null && unlockedZones.includes(nextZoneId);
  const canGoPrev = prevZoneId !== null;
  const currentZoneName = currentZone ? currentZone.name : 'Forêt de Pallet';
  const zoneIds = currentZone?.pokemonIds ?? [];
  const missingInZone = zoneIds.filter(id => (gameState.state.normalCollection[id] ?? 0) === 0);
  const zoneCaughtCount = zoneIds.filter(id => (gameState.state.normalCollection[id] ?? 0) > 0).length;
  const zoneNeeded = currentZone ? Math.ceil(zoneIds.length * currentZone.completionThreshold) : 0;
  const bossDefeated = !!gameState.state.zoneProgress?.bossDefeated?.[currentZoneId];

  function checkUnlockCondition(cond: ZoneUnlockCondition | null | undefined): boolean {
    if (!cond) return false;
    const s = gameState.state;
    const totalDiff = Object.keys(s.normalCollection).filter(id => (s.normalCollection[Number(id)] ?? 0) > 0).length;
    switch (cond.type) {
      case 'total_pokemon':
        return totalDiff >= cond.count;
      case 'daily_quests_completed': {
        const baseline = (s.questsBaselineAtUnlock ?? {})[currentZoneId] ?? 0;
        const sinceUnlock = (s.questsCompletedTotal ?? 0) - baseline;
        return sinceUnlock + s.dailyQuests.quests.filter(q => q.completed && !q.rewardClaimed).length >= cond.count;
      }
      case 'capture_n_times':
        return ((s.pokemonCaptureCount ?? {})[cond.pokemonId] ?? 0) >= cond.count;
      case 'duel_wins':
        return s.duels.wins >= cond.count;
      case 'training_battles':
        return ((s.trainingBattlesByZone ?? {})[currentZoneId] ?? 0) >= cond.count;
      case 'pokemon_level_in_team':
        return Object.values(s.pokemonLevels ?? {}).some(l => l.level >= cond.level);
      case 'shiny_captures':
        return (s.shinyCapturesTotal ?? 0) >= cond.count;
    }
  }

  const bossUnlocked = !bossDefeated && !!currentZone?.boss && checkUnlockCondition(currentZone.unlockCondition);

  // Show animation when boss condition first becomes fulfilled
  useEffect(() => {
    if (bossUnlocked && !prevBossUnlockedRef.current) {
      setBossReadyAnim(true);
      setTimeout(() => setBossReadyAnim(false), 4000);
    }
    prevBossUnlockedRef.current = bossUnlocked;
  }, [bossUnlocked]);

  function getConditionDisplay(cond: ZoneUnlockCondition | null | undefined): { label: string; progress: number } {
    if (!cond) return { label: '', progress: 0 };
    const s = gameState.state;
    const totalDiff = Object.keys(s.normalCollection).filter(id => (s.normalCollection[Number(id)] ?? 0) > 0).length;
    switch (cond.type) {
      case 'total_pokemon': return { label: `${totalDiff}/${cond.count} pokémon`, progress: totalDiff / cond.count };
      case 'daily_quests_completed': {
        const baseline = (s.questsBaselineAtUnlock ?? {})[currentZoneId] ?? 0;
        const done = (s.questsCompletedTotal ?? 0) - baseline + s.dailyQuests.quests.filter(q => q.completed && !q.rewardClaimed).length;
        return { label: `${done}/${cond.count} quêtes`, progress: done / cond.count };
      }
      case 'capture_n_times': {
        const n = ((s.pokemonCaptureCount ?? {})[cond.pokemonId] ?? 0);
        const name = POKEMON_BY_ID[cond.pokemonId]?.name ?? `#${cond.pokemonId}`;
        return { label: `${n}/${cond.count} ${name}`, progress: n / cond.count };
      }
      case 'duel_wins': return { label: `${s.duels.wins}/${cond.count} victoires`, progress: s.duels.wins / cond.count };
      case 'training_battles': {
        const n = (s.trainingBattlesByZone ?? {})[currentZoneId] ?? 0;
        return { label: `${n}/${cond.count} entraînements`, progress: n / cond.count };
      }
      case 'pokemon_level_in_team': {
        const maxLvl = Math.max(0, ...Object.values(s.pokemonLevels ?? {}).map(l => l.level));
        return { label: `Niv. max: ${maxLvl}/${cond.level}`, progress: maxLvl / cond.level };
      }
      case 'shiny_captures': {
        const n = s.shinyCapturesTotal ?? 0;
        return { label: `${n}/${cond.count} shiny`, progress: n / cond.count };
      }
    }
  }

  const { label: conditionLabel, progress: conditionProgress } = getConditionDisplay(currentZone?.unlockCondition);

  function getConditionDescription(cond: ZoneUnlockCondition | null | undefined): string {
    if (!cond) return '';
    switch (cond.type) {
      case 'total_pokemon': return `Capture ${cond.count} Pokémon différents pour débloquer le combat.`;
      case 'daily_quests_completed': return `Complète ${cond.count} quêtes journalières aujourd'hui pour débloquer le combat.`;
      case 'capture_n_times': return `Capture ${POKEMON_BY_ID[cond.pokemonId]?.name ?? `#${cond.pokemonId}`} ${cond.count} fois (doublons compris) pour débloquer le combat.`;
      case 'duel_wins': return `Remporte ${cond.count} victoires en duel (PokeParc inclus) pour débloquer le combat.`;
      case 'training_battles': return `Effectue ${cond.count} entraînements (victoires ou défaites) depuis n'importe quelle zone pour débloquer le combat.`;
      case 'pokemon_level_in_team': return `Entraîne un Pokémon jusqu'au niveau ${cond.level} pour débloquer le combat.`;
      case 'shiny_captures': return `Capture ${cond.count} Pokémon Shiny pour débloquer le combat.`;
    }
  }
  const conditionDescription = getConditionDescription(currentZone?.unlockCondition);

  const zoneGround = ZONE_GROUND[currentZoneId] ?? ZONE_GROUND['zone1'];

  return (
    <div className="relative w-full overflow-hidden" style={{ height: 'calc(100dvh - 72px)', maxHeight: 'calc(100dvh - 72px)' }}>
      {/* Zone-specific background */}
      <ZoneBackground key={currentZoneId} zoneId={currentZoneId} />

      {/* Ground gradient */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{
          height: '20%',
          background: zoneGround.ground,
        }}
      />

      {/* Spawned Characters */}
      {spawner.spawned.map((s) => {
        const pokemonData = POKEMON_BY_ID[s.pokemonId] ?? null;
        if (!pokemonData) return null;
        return (
          <SpawnedPokemonCard
            key={s.uid}
            spawned={s}
            pokemonData={pokemonData}
            onCapture={() => handleCapture(s.uid, s.pokemonId, s.characterId, s.isShiny, s.x, s.y)}
            disabled={gameState.isOnCooldown()}
            leaving={spawner.leavingUids.has(s.uid)}
            fading={spawner.fadingUids.has(s.uid)}
            facingRight={s.vx >= 0}
            alreadyCaught={!!gameState.state.normalCollection[s.pokemonId]}
          />
        );
      })}

      {/* HUD */}
      <HUD
        points={gameState.state.points}
        activeLure={gameState.state.activeLure}
        cooldownRemaining={cooldownSecs}
        isOnCooldown={onCooldown}
        onOpenCollection={onOpenCollection}
        onOpenTeam={onOpenTeam}
        onOpenAdmin={onOpenAdmin}
        isAdmin={isAdmin}
        onOpenLures={onOpenLures}
        onOpenQuests={onOpenQuests}
        onOpenDuels={onOpenDuels}
        onOpenRaid={onOpenRaid}
        onOpenWrapped={onOpenWrapped}
        onChangeUniverse={onChangeUniverse}
        onOpenSettings={onOpenSettings}
        onOpenZoneInfo={() => setShowZoneInfo(true)}
        capturedCount={capturedCount}
        totalPokemon={totalPokemon}
        questsCompleted={questsCompleted}
        currentZoneName={currentZoneName}
        missingInZone={missingInZone}
        zoneCaughtCount={zoneCaughtCount}
        zoneTotal={zoneIds.length}
        zoneNeeded={zoneNeeded}
        bossName={currentZone?.boss?.name}
        bossUnlocked={bossUnlocked}
        bossDefeated={bossDefeated}
        conditionLabel={conditionLabel}
        conditionProgress={conditionProgress}
        conditionDescription={conditionDescription}
        onFightBoss={() => { setFightZone(currentZone ?? null); setShowBossFight(true); }}
      />


      {/* Floating notifications */}
      {notifications.map((n) => (
        <div
          key={n.id}
          className="absolute pointer-events-none z-30 animate-float-up font-bold text-shadow-lg"
          style={{
            left: `${n.x}%`,
            top: `${n.y}%`,
            color: n.isNew ? '#facc15' : '#4ade80',
            fontSize: '1rem',
            textShadow: '0 0 8px rgba(0,0,0,0.9)',
            transform: 'translateX(-50%)',
            whiteSpace: 'nowrap',
          }}
        >
          {n.text}
        </div>
      ))}

      {/* Boss ready animation */}
      {bossReadyAnim && currentZone?.boss && (
        <div className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center"
          style={{ animation: 'fadeIn 0.3s ease' }}>
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(239,68,68,0.18) 0%, transparent 70%)' }} />
          <div className="bg-black/85 border-2 border-red-500 rounded-3xl px-8 py-5 text-center shadow-2xl"
            style={{ animation: 'boss-ready-pop 0.5s cubic-bezier(.175,.885,.32,1.275) forwards', maxWidth: 300 }}>
            <div style={{ fontSize: '2.5rem' }}>⚔️</div>
            <div className="text-red-400 font-black text-xl mt-1">DÉFI DÉBLOQUÉ !</div>
            <div className="text-white font-bold mt-1">{currentZone.boss.name}</div>
            <div className="text-slate-400 text-sm mt-0.5">{currentZone.boss.title}</div>
            <div className="text-yellow-400 text-xs mt-2 font-bold">Tu peux maintenant l'affronter !</div>
          </div>
        </div>
      )}

      {/* Zone info panel */}
      {showZoneInfo && <ZoneInfoPanel state={gameState.state} onClose={() => setShowZoneInfo(false)} />}

      {/* Zone transition overlay with directional slide */}
      {zoneTransition && (
        <>
          {/* Dark fade overlay */}
          <div className="absolute inset-0 z-50 pointer-events-none bg-black"
            style={{ animation: 'zone-fade-overlay 0.45s ease-out forwards' }} />
          {/* Slide hint — subtle nudge in travel direction */}
          <div className="absolute inset-0 z-49 pointer-events-none"
            style={{ animation: `zone-slide-in-${zoneTransition === 'right' ? 'right' : 'left'} 0.45s ease-out forwards` }} />
        </>
      )}

      {/* Zone nav arrows */}
      {canGoPrev && (
        <button
          onClick={() => {
            setZoneTransition('left');
            spawner.clearSpawned();
            stopMusic(0.3);
            gameState.setCurrentZone(prevZoneId!);
            setTimeout(() => { playZoneMusic(prevZoneId!); setZoneTransition(null); }, 400);
          }}
          className="absolute left-2 top-1/2 z-20 -translate-y-1/2 bg-black/60 hover:bg-black/80 border border-slate-600 rounded-xl px-2 py-3 text-white font-black text-xl"
          title={ZONE_BY_ID[prevZoneId!]?.name}
        >
          ‹
        </button>
      )}
      {canGoNext && (
        <button
          onClick={() => {
            setZoneTransition('right');
            spawner.clearSpawned();
            stopMusic(0.3);
            gameState.setCurrentZone(nextZoneId!);
            setTimeout(() => { playZoneMusic(nextZoneId!); setZoneTransition(null); }, 400);
          }}
          className="absolute right-2 top-1/2 z-20 -translate-y-1/2 bg-black/60 hover:bg-black/80 border border-slate-600 rounded-xl px-2 py-3 text-white font-black text-xl"
          title={ZONE_BY_ID[nextZoneId!]?.name}
        >
          ›
        </button>
      )}

      {/* League challenge (zone8 boss → special 3-fight flow) */}
      {showBossFight && fightZone?.id === 'zone8' && (
        <LeagueChallengeScreen
          state={gameState.state}
          onClose={() => { setShowBossFight(false); setFightZone(null); setTimeout(() => playZoneMusic(currentZoneId), 1000); }}
          onAddXp={(pokemonId, xp) => gameState.addPokemonXp(pokemonId, xp)}
          onVictory={() => {
            gameState.defeatZoneBoss('zone8', 'zone_libre');
            gameState.spendPoints(-100);
          }}
          onZoneDiscovered={() => {
            const nz = ZONE_BY_ID['zone_libre'];
            if (nz) setDiscoveredZone({ name: nz.name, pokemonIds: nz.pokemonIds.slice(0, 8) });
          }}
        />
      )}

      {/* Regular boss fight — all zones except zone8 */}
      {showBossFight && fightZone?.boss && fightZone.id !== 'zone8' && (
        <BossFightPanel
          zone={fightZone}
          state={gameState.state}
          onClose={() => { setShowBossFight(false); setFightZone(null); setTimeout(() => playZoneMusic(currentZoneId), 1000); }}
          onAddXp={(pokemonId, xp) => gameState.addPokemonXp(pokemonId, xp)}
          onVictory={(zoneId, nextZoneId) => {
            gameState.defeatZoneBoss(zoneId, nextZoneId);
            gameState.spendPoints(-100);
          }}
          onZoneDiscovered={() => {
            const nz = fightZone && ZONE_BY_ID[ZONE_ORDER[ZONE_ORDER.indexOf(fightZone.id) + 1]];
            if (nz) setDiscoveredZone({ name: nz.name, pokemonIds: nz.pokemonIds.slice(0, 8) });
          }}
        />
      )}

      {/* Zone discovery overlay */}
      {discoveredZone && (
        <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center"
          style={{ background: 'rgba(2,6,23,0.92)' }}
          onClick={() => setDiscoveredZone(null)}
        >
          <div className="text-center px-6 max-w-sm w-full" style={{ animation: 'badge-pop 0.5s ease-out both' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🗺️</div>
            <div className="font-black text-white text-2xl tracking-wide mb-1"
              style={{ textShadow: '0 0 24px rgba(99,102,241,0.9)' }}>
              NOUVELLE ZONE !
            </div>
            <div className="font-black text-indigo-300 text-xl mb-4">{discoveredZone.name}</div>
            <div className="text-slate-400 text-xs mb-3 font-semibold uppercase tracking-wider">Pokémon disponibles</div>
            <div className="flex flex-wrap justify-center gap-2 mb-5">
              {discoveredZone.pokemonIds.map(id => {
                const p = POKEMON_BY_ID[id];
                return (
                  <div key={id} className="flex flex-col items-center gap-0.5">
                    <img
                      src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`}
                      width={48} height={48}
                      style={{ imageRendering: 'pixelated', filter: 'drop-shadow(0 0 4px rgba(99,102,241,0.6))' }}
                      alt={p?.name ?? ''}
                    />
                    <span className="text-slate-400 text-xs">{p?.name ?? '???'}</span>
                  </div>
                );
              })}
            </div>
            <div className="text-slate-500 text-xs">Appuie pour continuer</div>
          </div>
        </div>
      )}

      {/* New capture modal */}
      {newCaptureInfo && (
        <NewCaptureModal
          pokemonName={newCaptureInfo.pokemonName}
          pokemonId={newCaptureInfo.pokemonId}
          isShiny={newCaptureInfo.isShiny}
          rarity={newCaptureInfo.rarity as import('../types').Rarity}
          level={newCaptureInfo.level}
          totalCaught={newCaptureInfo.totalCaught}
          onDismiss={() => setNewCaptureInfo(null)}
        />
      )}

      {showTutorial && (
        <TutorialOverlay tutorialKey="hunt" steps={HUNT_TUTORIAL} onDone={() => setShowTutorial(false)} />
      )}
    </div>
  );
}
