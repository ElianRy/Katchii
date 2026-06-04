import { useEffect, useRef, useState, useCallback } from 'react';
import { StarField } from './StarField';
import { SpawnedPokemonCard } from './SpawnedPokemonCard';
import { HUD } from './HUD';
import { useGameState } from '../hooks/useGameState';
import { useSpawner } from '../hooks/useSpawner';
import { POKEMON_BY_ID } from '../data/gen1';

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
  gameState: ReturnType<typeof useGameState>;
}

export function HuntingField({ onOpenCollection, onOpenLures, gameState }: Props) {
  const spawner = useSpawner(gameState);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [cooldownSecs, setCooldownSecs] = useState(0);
  const [onCooldown, setOnCooldown] = useState(false);
  const processingRef = useRef<Set<string>>(new Set());

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
    (uid: string, pokemonId: number, isShiny: boolean, x: number, y: number) => {
      if (processingRef.current.has(uid)) return;
      if (gameState.isOnCooldown()) return;
      processingRef.current.add(uid);

      // Start capture animation immediately
      spawner.capture(uid);

      // After pokeball spin completes, register the capture
      setTimeout(() => {
        const pokemon = POKEMON_BY_ID[pokemonId];
        if (!pokemon) return;
        const pts = gameState.addCapture(pokemonId, isShiny, pokemon.rarity);
        if (pts > 0) {
          addNotification(`+${pts} pts !`, x, y, true);
          addNotification('Nouveau !', x, y - 8, true);
        }
        processingRef.current.delete(uid);
      }, 1350);
    },
    [spawner, gameState, addNotification]
  );

  const capturedCount = Object.keys(gameState.state.normalCollection).length;

  return (
    <div className="relative w-full h-screen overflow-hidden">
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

      {/* Spawned Pokémon */}
      {spawner.spawned.map((s) => {
        const pokemon = POKEMON_BY_ID[s.pokemonId];
        if (!pokemon) return null;
        return (
          <SpawnedPokemonCard
            key={s.uid}
            spawned={s}
            pokemonData={pokemon}
            onCapture={() => handleCapture(s.uid, s.pokemonId, s.isShiny, s.x, s.y)}
            disabled={gameState.isOnCooldown()}
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
        capturedCount={capturedCount}
        totalPokemon={151}
      />

      {/* Cooldown overlay */}
      {onCooldown && (
        <div className="absolute inset-0 z-10 pointer-events-none flex items-end justify-center pb-24">
          <div className="bg-black/60 border border-red-500/50 rounded-2xl px-6 py-4 text-center backdrop-blur-sm">
            <div className="text-red-400 font-bold text-lg">⏳ Nouveau Pokémon détecté !</div>
            <div className="text-slate-300 text-sm mt-1">
              Prochaine capture dans{' '}
              <span className="text-yellow-400 font-bold">
                {Math.floor(cooldownSecs / 60)}:{(cooldownSecs % 60).toString().padStart(2, '0')}
              </span>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}
