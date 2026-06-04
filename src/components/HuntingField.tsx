import { useEffect, useRef, useState, useCallback } from 'react';
import { StarField } from './StarField';
import { SpawnedPokemonCard } from './SpawnedPokemonCard';
import { HUD } from './HUD';
import { useGameState } from '../hooks/useGameState';
import { useSpawner } from '../hooks/useSpawner';
import { POKEMON_BY_ID } from '../data/gen1';
import { NARUTO_BY_ID } from '../data/naruto';
import { TERRAIN_SKINS } from './SkinsPanel';
import { ZONE_BY_ID } from '../data/zones';
import { PokemonData } from '../types';
import { NewCaptureModal } from './NewCaptureModal';
import { ZoneInfoPanel } from './ZoneInfoPanel';

interface Notification {
  id: number;
  text: string;
  x: number;
  y: number;
  isNew: boolean;
}

let notifCounter = 0;

const BUSHES = [
  { left: '2%', width: 120, height: 70, delay: 0, duration: 3.2 },
  { left: '18%', width: 90, height: 55, delay: 0.5, duration: 2.8 },
  { left: '38%', width: 140, height: 80, delay: 1.1, duration: 3.5 },
  { left: '58%', width: 100, height: 60, delay: 0.3, duration: 2.6 },
  { left: '78%', width: 110, height: 65, delay: 0.9, duration: 3.1 },
];

interface Props {
  onOpenCollection: () => void;
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

export function HuntingField({ onOpenCollection, onOpenLures, onOpenQuests, onOpenDuels, onOpenVillage, onOpenSkins, onOpenFusion, onOpenRaid, onOpenWrapped, onChangeUniverse, gameState }: Props) {
  const spawner = useSpawner(gameState);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [cooldownSecs, setCooldownSecs] = useState(0);
  const [onCooldown, setOnCooldown] = useState(false);
  const [newCaptureInfo, setNewCaptureInfo] = useState<NewCaptureInfo | null>(null);
  const [showZoneInfo, setShowZoneInfo] = useState(false);
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

  const activeSkin = TERRAIN_SKINS.find(s => s.id === (gameState.state.skins?.activeTerrain ?? 'foret')) ?? TERRAIN_SKINS[0];

  const currentZone = ZONE_BY_ID[gameState.state.zoneProgress?.currentZoneId ?? 'zone1'];
  const currentZoneName = currentZone ? currentZone.name : 'Forêt de Pallet';
  const zoneIds = currentZone?.pokemonIds ?? [];
  const missingInZone = zoneIds.filter(id => (gameState.state.normalCollection[id] ?? 0) === 0);
  const zoneCaughtCount = zoneIds.filter(id => (gameState.state.normalCollection[id] ?? 0) > 0).length;
  const zoneNeeded = currentZone ? Math.ceil(zoneIds.length * currentZone.completionThreshold) : 0;
  const bossDefeated = !!gameState.state.zoneProgress?.bossDefeated?.[gameState.state.zoneProgress?.currentZoneId ?? 'zone1'];
  const bossUnlocked = !bossDefeated && zoneCaughtCount >= zoneNeeded && zoneNeeded > 0;

  return (
    <div className={`relative w-full h-screen overflow-hidden bg-gradient-to-b ${activeSkin.gradient}`}>
      {/* Background */}
      <StarField />

      {/* Ground gradient */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{
          height: '22%',
          background: 'linear-gradient(to top, #14532d 0%, #166534 40%, transparent 100%)',
        }}
      />

      {/* Bushes */}
      {BUSHES.map((bush, i) => (
        <div
          key={i}
          className="absolute bottom-0 animate-bush rounded-t-full"
          style={{
            left: bush.left,
            width: bush.width,
            height: bush.height,
            background: 'linear-gradient(to top, #15803d, #22c55e)',
            '--bush-delay': `${bush.delay}s`,
            '--bush-duration': `${bush.duration}s`,
            boxShadow: '0 -4px 12px rgba(0,0,0,0.3)',
          } as React.CSSProperties}
        />
      ))}

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
        onFightBoss={() => {/* TODO: open boss fight */}}
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
