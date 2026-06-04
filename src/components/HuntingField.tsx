import { useEffect, useRef, useState, useCallback } from 'react';
import { ZoneBackground } from './ZoneBackground';
import { SpawnedPokemonCard } from './SpawnedPokemonCard';
import { HUD } from './HUD';
import { useGameState } from '../hooks/useGameState';
import { useSpawner } from '../hooks/useSpawner';
import { POKEMON_BY_ID } from '../data/gen1';
import { NARUTO_BY_ID } from '../data/naruto';
import { ZONE_BY_ID, ZONE_ORDER } from '../data/zones';

const ZONE_GROUND: Record<string, { ground: string; bush: string }> = {
  zone1: { ground: 'linear-gradient(to top, #14532d 0%, #166534 40%, transparent 100%)', bush: 'linear-gradient(to top, #15803d, #22c55e)' },
  zone2: { ground: 'linear-gradient(to top, #0c4a6e 0%, #075985 40%, transparent 100%)', bush: 'linear-gradient(to top, #0369a1, #38bdf8)' },
  zone3: { ground: 'linear-gradient(to top, #1c1917 0%, #292524 40%, transparent 100%)', bush: 'linear-gradient(to top, #44403c, #78716c)' },
  zone4: { ground: 'linear-gradient(to top, #14532d 0%, #166534 40%, transparent 100%)', bush: 'linear-gradient(to top, #15803d, #86efac)' },
  zone5: { ground: 'linear-gradient(to top, #1e1b4b 0%, #2e1065 40%, transparent 100%)', bush: 'linear-gradient(to top, #4c1d95, #7c3aed)' },
  zone6: { ground: 'linear-gradient(to top, #2e1065 0%, #4a1d96 40%, transparent 100%)', bush: 'linear-gradient(to top, #6d28d9, #a855f7)' },
  zone7: { ground: 'linear-gradient(to top, #7c2d12 0%, #9a3412 40%, transparent 100%)', bush: 'linear-gradient(to top, #b45309, #f97316)' },
  zone8: { ground: 'linear-gradient(to top, #1c1917 0%, #292524 40%, transparent 100%)', bush: 'linear-gradient(to top, #57534e, #a8a29e)' },
  ligue: { ground: 'linear-gradient(to top, #0f0a1e 0%, #1e1040 40%, transparent 100%)', bush: 'linear-gradient(to top, #312e81, #6366f1)' },
  zone_libre: { ground: 'linear-gradient(to top, #1e1b4b 0%, #312e81 40%, transparent 100%)', bush: 'linear-gradient(to top, #4f46e5, #818cf8)' },
};
import { PokemonData } from '../types';
import { NewCaptureModal } from './NewCaptureModal';
import { ZoneInfoPanel } from './ZoneInfoPanel';
import { BossFightPanel } from './BossFightPanel';

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
  onOpenVillage: () => void;
  onOpenSkins: () => void;
  onOpenFusion: () => void;
  onOpenRaid: () => void;
  onOpenWrapped: () => void;
  onChangeUniverse: () => void;
  gameState: ReturnType<typeof useGameState>;
}

interface NewCaptureInfo {
  pokemonName: string;
  pokemonId: number;
  isShiny: boolean;
  rarity: string;
}

export function HuntingField({ onOpenCollection, onOpenTeam, onOpenAdmin, isAdmin, onOpenLures, onOpenQuests, onOpenDuels, onOpenVillage, onOpenSkins, onOpenFusion, onOpenRaid, onOpenWrapped, onChangeUniverse, gameState }: Props) {
  const spawner = useSpawner(gameState);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [cooldownSecs, setCooldownSecs] = useState(0);
  const [onCooldown, setOnCooldown] = useState(false);
  const [newCaptureInfo, setNewCaptureInfo] = useState<NewCaptureInfo | null>(null);
  const [showZoneInfo, setShowZoneInfo] = useState(false);
  const [showBossFight, setShowBossFight] = useState(false);
  const processingRef = useRef<Set<string>>(new Set());
  const capturingRef = useRef(false);

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
    (uid: string, pokemonId: number, characterId: string | undefined, isShiny: boolean, x: number, y: number) => {
      if (capturingRef.current) return; // LOCK: only one capture at a time
      if (processingRef.current.has(uid)) return;
      if (gameState.isOnCooldown()) return;

      capturingRef.current = true;
      processingRef.current.add(uid);

      spawner.capture(uid);

      setTimeout(() => {
        if (characterId && gameState.state.activeUniverse === 'naruto') {
          const char = NARUTO_BY_ID[characterId];
          if (!char) {
            processingRef.current.delete(uid);
            capturingRef.current = false;
            return;
          }
          const pts = gameState.addNarutoCapture(characterId, isShiny, char.rarity);
          if (pts > 0) {
            addNotification(`+${pts} pts !`, x, y, true);
            addNotification('Nouveau !', x, y - 8, true);
            setNewCaptureInfo({ pokemonName: char.name, pokemonId: 0, isShiny, rarity: char.rarity });
          }
        } else {
          const pokemon = POKEMON_BY_ID[pokemonId];
          if (!pokemon) {
            processingRef.current.delete(uid);
            capturingRef.current = false;
            return;
          }
          const pts = gameState.addCapture(pokemonId, isShiny, pokemon.rarity);
          if (pts > 0) {
            addNotification(`+${pts} pts !`, x, y, true);
            addNotification('Nouveau !', x, y - 8, true);
            setNewCaptureInfo({ pokemonName: pokemon.name, pokemonId, isShiny, rarity: pokemon.rarity });
          }
        }
        processingRef.current.delete(uid);
        capturingRef.current = false; // UNLOCK
      }, 1350);
    },
    [spawner, gameState, addNotification]
  );

  const isNaruto = gameState.state.activeUniverse === 'naruto';
  const capturedCount = isNaruto
    ? Object.keys(gameState.state.narutoCollection).filter(id => (gameState.state.narutoCollection[id] ?? 0) > 0).length
    : Object.keys(gameState.state.normalCollection).length;
  const totalPokemon = isNaruto ? 30 : 151;
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
  const bossDefeated = !!gameState.state.zoneProgress?.bossDefeated?.[gameState.state.zoneProgress?.currentZoneId ?? 'zone1'];
  const bossUnlocked = !bossDefeated && zoneCaughtCount >= zoneNeeded && zoneNeeded > 0;

  const zoneGround = ZONE_GROUND[currentZoneId] ?? ZONE_GROUND['zone1'];

  return (
    <div className="relative w-full overflow-hidden" style={{ height: 'calc(100dvh - 72px)', maxHeight: 'calc(100dvh - 72px)' }}>
      {/* Zone-specific background */}
      <ZoneBackground zoneId={currentZoneId} />

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
        let pokemonData: PokemonData | null = null;
        if (s.characterId) {
          const char = NARUTO_BY_ID[s.characterId];
          if (char) {
            pokemonData = { id: 0, name: char.name, rarity: char.rarity };
          }
        } else {
          pokemonData = POKEMON_BY_ID[s.pokemonId] ?? null;
        }
        if (!pokemonData) return null;
        return (
          <SpawnedPokemonCard
            key={s.uid}
            spawned={s}
            pokemonData={pokemonData}
            narutoSpriteUrl={s.characterId ? NARUTO_BY_ID[s.characterId]?.spriteUrl : undefined}
            onCapture={() => handleCapture(s.uid, s.pokemonId, s.characterId, s.isShiny, s.x, s.y)}
            disabled={gameState.isOnCooldown()}
            leaving={spawner.leavingUids.has(s.uid)}
            facingRight={s.vx >= 0}
          />
        );
      })}

      {/* HUD */}
      <HUD
        points={gameState.state.points}
        activeLure={gameState.state.activeLure}
        cooldownRemaining={cooldownSecs}
        isOnCooldown={onCooldown}
        saveStatus={gameState.saveStatus}
        onOpenCollection={onOpenCollection}
        onOpenTeam={onOpenTeam}
        onOpenAdmin={onOpenAdmin}
        isAdmin={isAdmin}
        onOpenLures={onOpenLures}
        onOpenQuests={onOpenQuests}
        onOpenDuels={onOpenDuels}
        onOpenVillage={onOpenVillage}
        onOpenSkins={onOpenSkins}
        onOpenFusion={onOpenFusion}
        onOpenRaid={onOpenRaid}
        onOpenWrapped={onOpenWrapped}
        onChangeUniverse={onChangeUniverse}
        onOpenZoneInfo={() => setShowZoneInfo(true)}
        capturedCount={capturedCount}
        totalPokemon={totalPokemon}
        questsCompleted={questsCompleted}
        activeUniverse={gameState.state.activeUniverse}
        currentZoneName={currentZoneName}
        missingInZone={missingInZone}
        zoneCaughtCount={zoneCaughtCount}
        zoneTotal={zoneIds.length}
        zoneNeeded={zoneNeeded}
        bossName={currentZone?.boss?.name}
        bossUnlocked={bossUnlocked}
        bossDefeated={bossDefeated}
        onFightBoss={() => setShowBossFight(true)}
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
          }}
        >
          {n.text}
        </div>
      ))}

      {/* Zone info panel */}
      {showZoneInfo && <ZoneInfoPanel state={gameState.state} onClose={() => setShowZoneInfo(false)} />}

      {/* Zone nav arrows */}
      {canGoPrev && (
        <button
          onClick={() => gameState.setCurrentZone(prevZoneId!)}
          className="absolute left-2 top-1/2 z-20 -translate-y-1/2 bg-black/60 hover:bg-black/80 border border-slate-600 rounded-xl px-2 py-3 text-white font-black text-xl transition-all"
          title={ZONE_BY_ID[prevZoneId!]?.name}
        >
          ‹
        </button>
      )}
      {canGoNext && (
        <button
          onClick={() => gameState.setCurrentZone(nextZoneId!)}
          className="absolute right-2 top-1/2 z-20 -translate-y-1/2 bg-black/60 hover:bg-black/80 border border-slate-600 rounded-xl px-2 py-3 text-white font-black text-xl transition-all"
          title={ZONE_BY_ID[nextZoneId!]?.name}
        >
          ›
        </button>
      )}

      {/* Boss fight */}
      {showBossFight && currentZone?.boss && (
        <BossFightPanel
          zone={currentZone}
          state={gameState.state}
          onClose={() => setShowBossFight(false)}
          onAddXp={(pokemonId, xp) => gameState.addPokemonXp(pokemonId, xp)}
          onVictory={(zoneId, nextZoneId) => {
            gameState.defeatZoneBoss(zoneId, nextZoneId);
            gameState.spendPoints(-100);
            // Auto-navigate to next zone, panel stays open to show result screen
            if (nextZoneId) gameState.setCurrentZone(nextZoneId);
          }}
        />
      )}

      {/* New capture modal */}
      {newCaptureInfo && (
        <NewCaptureModal
          pokemonName={newCaptureInfo.pokemonName}
          pokemonId={newCaptureInfo.pokemonId}
          isShiny={newCaptureInfo.isShiny}
          rarity={newCaptureInfo.rarity as import('../types').Rarity}
          onDismiss={() => setNewCaptureInfo(null)}
        />
      )}
    </div>
  );
}
