import { useState, useEffect, useRef } from 'react';
import { ShinySprite } from './ShinySprite';
import { playPokemonCry } from '../lib/audio';

const BASE_URL = 'https://kbegumpzvyjagfikjdxi.supabase.co/storage/v1/object/public/sounds';

interface Props {
  oldPokemonId: number;
  newPokemonId: number;
  oldName: string;
  newName: string;
  onComplete: () => void;
  onCancel: () => void;
}

export function EvolutionScreen({ oldPokemonId, newPokemonId, oldName, newName, onComplete, onCancel }: Props) {
  const [phase, setPhase] = useState<'charging' | 'flashing' | 'white' | 'complete'>('charging');
  const [showOld, setShowOld] = useState(true);
  const [typeText, setTypeText] = useState('');
  const evoAudioRef = useRef<HTMLAudioElement | null>(null);
  const cancelledRef = useRef(false);
  const fullText = `Félicitations ! ${oldName} a évolué en ${newName} !`;

  useEffect(() => {
    const evo = new Audio(`${BASE_URL}/evolution.mp3`);
    evo.loop = true;
    evo.volume = 0.5;
    evo.play().catch(() => {});
    evoAudioRef.current = evo;
    return () => { evo.pause(); evo.src = ''; };
  }, []);

  useEffect(() => {
    if (phase === 'charging') {
      const t = setTimeout(() => { if (!cancelledRef.current) setPhase('flashing'); }, 1500);
      return () => clearTimeout(t);
    }
    if (phase === 'flashing') {
      let count = 0;
      const total = 14;
      const interval = setInterval(() => {
        if (cancelledRef.current) { clearInterval(interval); return; }
        setShowOld(prev => !prev);
        count++;
        if (count >= total) {
          clearInterval(interval);
          setPhase('white');
        }
      }, 150);
      return () => clearInterval(interval);
    }
    if (phase === 'white') {
      const t = setTimeout(() => {
        if (cancelledRef.current) return;
        setPhase('complete');
        if (evoAudioRef.current) { evoAudioRef.current.pause(); }
        playPokemonCry(newPokemonId);
        setTimeout(() => {
          const congrats = new Audio(`${BASE_URL}/congrats.mp3`);
          congrats.volume = 0.5;
          congrats.play().catch(() => {});
        }, 800);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [phase, newPokemonId]);

  useEffect(() => {
    if (phase !== 'complete') return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setTypeText(fullText.slice(0, i));
      if (i >= fullText.length) clearInterval(interval);
    }, 40);
    return () => clearInterval(interval);
  }, [phase, fullText]);

  const handleCancel = () => {
    cancelledRef.current = true;
    if (evoAudioRef.current) { evoAudioRef.current.pause(); }
    onCancel();
  };

  const bg = phase === 'white' ? '#ffffff' : '#000000';

  return (
    <div
      className="fixed inset-0 z-[850] flex flex-col items-center justify-center"
      style={{ background: bg, transition: phase === 'white' ? 'background 0.2s' : 'none' }}
    >
      {(phase === 'charging' || phase === 'flashing') && (
        <button
          onClick={handleCancel}
          className="absolute top-4 right-4 text-white/60 text-sm px-3 py-1.5 rounded-lg border border-white/20"
        >
          Annuler
        </button>
      )}

      {phase === 'charging' && (
        <div className="flex flex-col items-center gap-6">
          <div className="text-white text-2xl font-black animate-pulse">Que se passe-t-il ?!</div>
          <ShinySprite pokemonId={oldPokemonId} isShiny={false} width={120} height={120}
            style={{ filter: 'brightness(0) invert(1)', opacity: 0.8 }} />
        </div>
      )}

      {phase === 'flashing' && (
        <div className="flex flex-col items-center gap-6">
          <div className="text-white text-2xl font-black animate-pulse">Que se passe-t-il ?!</div>
          <ShinySprite
            pokemonId={showOld ? oldPokemonId : newPokemonId}
            isShiny={false}
            width={120} height={120}
            style={{ filter: 'brightness(0) invert(1)', opacity: 0.9 }}
          />
        </div>
      )}

      {phase === 'white' && (
        <div style={{ width: 120, height: 120, background: 'white', borderRadius: 8 }} />
      )}

      {phase === 'complete' && (
        <div className="flex flex-col items-center gap-6 px-6 w-full max-w-xs">
          <ShinySprite pokemonId={newPokemonId} isShiny={false} width={140} height={140} />
          <div className="text-yellow-300 font-black text-lg text-center min-h-[3.5rem]">
            {typeText}
          </div>
          {typeText.length >= fullText.length && (
            <button
              onClick={onComplete}
              className="mt-2 px-8 py-3 rounded-2xl font-black text-base text-black"
              style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b)' }}
            >
              Super !
            </button>
          )}
        </div>
      )}
    </div>
  );
}
