import { useEffect, useState } from 'react';
import { Rarity, RARITY_COLORS, RARITY_LABELS } from '../types';

interface Props {
  pokemonName: string;
  pokemonId: number;
  isShiny: boolean;
  rarity: Rarity;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 3000;

export function NewCaptureModal({ pokemonName, pokemonId, isShiny, rarity, onDismiss }: Props) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / AUTO_DISMISS_MS) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        onDismiss();
      }
    }, 50);
    return () => clearInterval(timer);
  }, [onDismiss]);

  const rarityColor = RARITY_COLORS[rarity];
  const spriteUrl = pokemonId > 0
    ? isShiny
      ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${pokemonId}.png`
      : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onDismiss}
    >
      <div
        className="relative flex flex-col items-center gap-3 rounded-2xl border px-8 py-6 max-w-xs w-full mx-4 cursor-pointer"
        style={{
          background: 'rgba(10,10,30,0.95)',
          border: `2px solid ${rarityColor}88`,
          boxShadow: `0 0 30px ${rarityColor}44`,
        }}
        onClick={onDismiss}
      >
        <button
          className="absolute top-3 right-3 text-slate-400 hover:text-white text-lg leading-none"
          onClick={onDismiss}
          aria-label="Fermer"
        >
          ✕
        </button>
        {/* Title */}
        <div className="text-center">
          <div className="text-2xl mb-1">✨</div>
          <h2 className="text-white font-black text-xl">Nouveau Pokémon !</h2>
        </div>

        {/* Sprite */}
        <div
          className="flex items-center justify-center"
          style={{
            boxShadow: `0 0 20px 8px ${rarityColor}66`,
            borderRadius: '50%',
          }}
        >
          {spriteUrl ? (
            <img
              src={spriteUrl}
              alt={pokemonName}
              width={128}
              height={128}
              style={{ imageRendering: 'pixelated', objectFit: 'contain' }}
            />
          ) : (
            <div
              className="flex items-center justify-center font-bold text-sm"
              style={{ width: 128, height: 128, color: rarityColor }}
            >
              {pokemonName}
            </div>
          )}
        </div>

        {/* Name */}
        <div className="text-center">
          <div
            className="font-black text-xl"
            style={{ color: rarityColor }}
          >
            {isShiny ? '✨ ' : ''}{pokemonName}
          </div>
          <div
            className="text-xs font-bold mt-1 px-3 py-0.5 rounded-full"
            style={{ background: `${rarityColor}22`, color: rarityColor, border: `1px solid ${rarityColor}66` }}
          >
            {RARITY_LABELS[rarity]}
          </div>
        </div>

        {/* Subtitle */}
        <div className="text-slate-400 text-sm">Ajouté à ta collection !</div>

        {/* Progress bar */}
        <div className="w-full bg-slate-700 rounded-full h-1.5">
          <div
            className="h-1.5 rounded-full transition-all"
            style={{ width: `${progress}%`, background: rarityColor }}
          />
        </div>

        <div className="text-slate-500 text-xs">Appuie pour fermer</div>
      </div>
    </div>
  );
}
