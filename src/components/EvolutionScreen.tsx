import { useState, useEffect, useRef } from 'react';
import { ShinySprite } from './ShinySprite';
import { playPokemonCry } from '../lib/audio';

const BASE_URL = 'https://kbegumpzvyjagfikjdxi.supabase.co/storage/v1/object/public/sounds';

interface Props {
  oldPokemonId: number;
  newPokemonId: number;
  oldName: string;
  newName: string;
  choices?: number[];
  choiceNames?: Record<number, string>;
  ownedIds?: number[];
  onComplete: () => void;
  onCancel: () => void;
}

export function EvolutionScreen({ oldPokemonId, newPokemonId, oldName, newName, choices, choiceNames, ownedIds, onComplete, onCancel }: Props) {
  const [phase, setPhase] = useState<'pick' | 'charging' | 'flashing' | 'white' | 'complete'>(choices && choices.length > 0 ? 'pick' : 'charging');
  const [resolvedNewId, setResolvedNewId] = useState<number>(newPokemonId);
  const [resolvedNewName, setResolvedNewName] = useState<string>(newName);
  const [showOld, setShowOld] = useState(true);
  const [typeText, setTypeText] = useState('');
  const evoAudioRef = useRef<HTMLAudioElement | null>(null);
  const cancelledRef = useRef(false);
  const fullText = `Félicitations ! ${oldName} a évolué en ${resolvedNewName} !`;

  useEffect(() => {
    if (phase === 'pick') return;
    const evo = new Audio(`${BASE_URL}/evolution.mp3`);
    evo.loop = true;
    evo.volume = 0.5;
    evo.play().catch(() => {});
    evoAudioRef.current = evo;
    return () => { evo.pause(); evo.src = ''; };
  }, [phase]);

  useEffect(() => {
    if (phase === 'pick') return;
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
        playPokemonCry(resolvedNewId);
        setTimeout(() => {
          const congrats = new Audio(`${BASE_URL}/congrats.mp3`);
          congrats.volume = 0.5;
          congrats.play().catch(() => {});
        }, 800);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [phase, resolvedNewId]);

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

  const handlePick = (id: number, name: string) => {
    setResolvedNewId(id);
    setResolvedNewName(name);
    setPhase('charging');
  };

  if (phase === 'pick' && choices && choices.length > 0) {
    const owned = new Set(ownedIds ?? []);
    return (
      <div className="fixed inset-0 z-[850] flex flex-col items-center justify-center bg-black px-6">
        <div className="text-white text-2xl font-black mb-2">Que se passe-t-il ?!</div>
        <ShinySprite pokemonId={oldPokemonId} isShiny={false} width={100} height={100}
          style={{ filter: 'brightness(0) invert(1)', opacity: 0.8, marginBottom: 16 }} />
        <div className="text-yellow-300 font-black text-base mb-4 text-center">
          {oldName} peut évoluer !<br />
          <span className="text-white/70 font-normal text-sm">Choisissez son évolution :</span>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          {choices.map(id => {
            const name = choiceNames?.[id] ?? `#${id}`;
            const alreadyOwned = owned.has(id);
            return (
              <button
                key={id}
                disabled={alreadyOwned}
                onClick={() => !alreadyOwned && handlePick(id, name)}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all active:scale-95"
                style={{
                  background: alreadyOwned ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.12)',
                  border: `2px solid ${alreadyOwned ? 'rgba(255,255,255,0.1)' : '#fbbf24'}`,
                  opacity: alreadyOwned ? 0.4 : 1,
                }}
              >
                <ShinySprite pokemonId={id} isShiny={false} width={52} height={52} />
                <div className="flex flex-col items-start">
                  <span className="text-white font-black text-base">{name}</span>
                  {alreadyOwned && <span className="text-white/40 text-xs">Déjà capturé</span>}
                </div>
              </button>
            );
          })}
        </div>
        <button
          onClick={onCancel}
          className="mt-6 text-white/50 text-sm px-4 py-2 rounded-lg border border-white/15"
        >
          Annuler
        </button>
      </div>
    );
  }

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
            pokemonId={showOld ? oldPokemonId : resolvedNewId}
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
          <ShinySprite pokemonId={resolvedNewId} isShiny={false} width={140} height={140} />
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
