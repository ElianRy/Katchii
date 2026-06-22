import { useState, useEffect, useRef } from 'react';
import { ShinySprite } from './ShinySprite';
import { playPokemonCry, stopMusic } from '../lib/audio';

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
  const [phase, setPhase] = useState<'pick' | 'dialog_start' | 'charging' | 'flashing' | 'white' | 'reveal' | 'complete'>(choices && choices.length > 0 ? 'pick' : 'dialog_start');
  const [resolvedNewId, setResolvedNewId] = useState<number>(newPokemonId);
  const [resolvedNewName, setResolvedNewName] = useState<string>(newName);
  const [showOld, setShowOld] = useState(true);
  const [typeText, setTypeText] = useState('');
  const [textDone, setTextDone] = useState(false);
  const [timer4sDone, setTimer4sDone] = useState(false);
  const [showContinue, setShowContinue] = useState(false);
  const [cancelOverlay, setCancelOverlay] = useState(false);
  const [dialogText, setDialogText] = useState('');
  const evoAudioRef = useRef<HTMLAudioElement | null>(null);
  const cancelledRef = useRef(false);
  const fullText = `${oldName} a évolué en ${resolvedNewName} !`;

  // Start evolution music once on mount (for non-pick phase) — stop background music first
  useEffect(() => {
    if (choices && choices.length > 0) return; // pick phase, wait for handlePick
    stopMusic(0);
    const evo = new Audio(`${BASE_URL}/evolution.mp3`);
    evo.loop = true;
    evo.volume = 0.5;
    evo.play().catch(() => {});
    evoAudioRef.current = evo;
    return () => { evo.pause(); evo.src = ''; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Phase transitions
  useEffect(() => {
    if (phase === 'pick' || phase === 'dialog_start') return;

    if (phase === 'charging') {
      const t = setTimeout(() => {
        if (!cancelledRef.current) setPhase('flashing');
      }, 1500);
      return () => clearTimeout(t);
    }

    if (phase === 'flashing') {
      let count = 0;
      const total = 30;
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
        if (!cancelledRef.current) setPhase('reveal');
      }, 600);
      return () => clearTimeout(t);
    }

    if (phase === 'reveal') {
      if (evoAudioRef.current) { evoAudioRef.current.pause(); evoAudioRef.current = null; }
      playPokemonCry(resolvedNewId);
      const t = setTimeout(() => {
        if (cancelledRef.current) return;
        setPhase('complete');
        setTimeout(() => {
          const congrats = new Audio(`${BASE_URL}/congrats.mp3`);
          congrats.volume = 0.5;
          congrats.play().catch(() => {});
        }, 400);
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [phase, resolvedNewId]);

  // dialog_start phase: typewriter "???" then transition to charging
  useEffect(() => {
    if (phase !== 'dialog_start') return;
    const text = '???';
    setDialogText('');
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDialogText(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, 120);
    const t = setTimeout(() => {
      if (!cancelledRef.current) setPhase('charging');
    }, 1500);
    return () => { clearInterval(interval); clearTimeout(t); };
  }, [phase]);

  // Typewriter effect in complete phase
  useEffect(() => {
    if (phase !== 'complete') return;
    setTypeText('');
    setTextDone(false);
    setShowContinue(false);
    setTimer4sDone(false);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setTypeText(fullText.slice(0, i));
      if (i >= fullText.length) {
        clearInterval(interval);
        setTextDone(true);
      }
    }, 40);
    return () => clearInterval(interval);
  }, [phase, fullText]);

  // 4s timer for complete phase
  useEffect(() => {
    if (phase !== 'complete') return;
    const t = setTimeout(() => setTimer4sDone(true), 4000);
    return () => clearTimeout(t);
  }, [phase]);

  // Show Continuer only when both text done AND 4s elapsed
  useEffect(() => {
    if (textDone && timer4sDone) setShowContinue(true);
  }, [textDone, timer4sDone]);

  const handleCancelClick = () => {
    setCancelOverlay(true);
  };

  const handleConfirmCancel = () => {
    cancelledRef.current = true;
    if (evoAudioRef.current) { evoAudioRef.current.pause(); }
    onCancel();
  };

  const handlePick = (id: number, name: string) => {
    setResolvedNewId(id);
    setResolvedNewName(name);
    // Start music now (was pick phase, music not started yet)
    stopMusic(0);
    const evo = new Audio(`${BASE_URL}/evolution.mp3`);
    evo.loop = true;
    evo.volume = 0.5;
    evo.play().catch(() => {});
    evoAudioRef.current = evo;
    setPhase('dialog_start');
  };

  // Pick phase
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

  return (
    <>
      <style>{`
        @keyframes evo-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
        @keyframes evo-glow-pulse {
          0%, 100% { filter: brightness(0) invert(1) drop-shadow(0 0 8px white); opacity: 0.7; }
          50% { filter: brightness(0) invert(1) drop-shadow(0 0 24px white) drop-shadow(0 0 40px white); opacity: 1; }
        }
      `}</style>

      <div
        className="fixed inset-0 z-[850] flex flex-col items-center justify-center"
        style={{ background: phase === 'white' ? '#ffffff' : '#000000', transition: phase === 'white' ? 'background 0.1s' : 'none' }}
      >
        {/* Cancel overlay */}
        {cancelOverlay && (
          <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)' }}>
            <div style={{ background: '#1f2937', border: '2px solid #374151', borderRadius: 16, padding: '24px 20px', maxWidth: 300, width: '90%', textAlign: 'center' }}>
              <div style={{ color: 'white', fontWeight: 900, fontSize: '1rem', marginBottom: 10 }}>Évolution annulée</div>
              <div style={{ color: '#9ca3af', fontSize: '0.8rem', lineHeight: 1.5, marginBottom: 20 }}>
                Vous avez annulé l'évolution. Vous pouvez le faire évoluer dans votre PC.
              </div>
              <button
                onClick={handleConfirmCancel}
                className="px-8 py-2 rounded-xl font-black text-sm text-black"
                style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}
              >
                OK
              </button>
            </div>
          </div>
        )}

        {/* Cancel button (charging + flashing only) */}
        {(phase === 'charging' || phase === 'flashing') && !cancelOverlay && (
          <div className="absolute bottom-12 left-0 right-0 flex justify-center">
            <button
              onClick={handleCancelClick}
              style={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: '0.85rem',
                padding: '10px 20px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.25)',
                background: 'rgba(255,255,255,0.08)',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ⛔ Annuler l'évolution
            </button>
          </div>
        )}

        {/* dialog_start phase: Pokémon-style dialog box with typewriter */}
        {phase === 'dialog_start' && (
          <div className="flex flex-col items-center gap-6 w-full px-6" style={{ position: 'relative', width: '100%', height: '100%' }}>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
              <ShinySprite pokemonId={oldPokemonId} isShiny={false} width={120} height={120}
                style={{ filter: 'brightness(0) invert(1)', opacity: 0.8 }} />
            </div>
            <div style={{
              position: 'absolute', bottom: 40, left: 16, right: 16,
              background: 'rgba(0,0,0,0.88)',
              border: '3px solid white',
              borderRadius: 8,
              padding: '14px 18px',
              fontFamily: 'monospace',
              color: 'white',
              fontSize: '1.1rem',
              fontWeight: 700,
              minHeight: 64,
              letterSpacing: '0.05em',
            }}>
              {dialogText}
            </div>
          </div>
        )}

        {/* Charging phase: old pokemon with pulsing white glow */}
        {phase === 'charging' && (
          <div className="flex flex-col items-center gap-6">
            <div className="text-white text-2xl font-black animate-pulse">Que se passe-t-il ?!</div>
            <ShinySprite pokemonId={oldPokemonId} isShiny={false} width={120} height={120}
              style={{ animation: 'evo-glow-pulse 0.6s ease-in-out infinite' }} />
          </div>
        )}

        {/* Flashing phase: alternating old/new silhouettes */}
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

        {/* White flash phase */}
        {phase === 'white' && (
          <div style={{ width: '100%', height: '100%', background: 'white' }} />
        )}

        {/* Reveal phase: new pokemon with shake animation */}
        {phase === 'reveal' && (
          <div className="flex flex-col items-center gap-6">
            <div className="text-white text-2xl font-black">Félicitations !</div>
            <div style={{ animation: 'evo-shake 0.15s ease-in-out infinite' }}>
              <ShinySprite pokemonId={resolvedNewId} isShiny={false} width={140} height={140}
                style={{ filter: 'drop-shadow(0 0 16px white) drop-shadow(0 0 32px #fbbf24)' }} />
            </div>
          </div>
        )}

        {/* Complete phase: Pokémon-style dialog box */}
        {phase === 'complete' && (
          <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShinySprite pokemonId={resolvedNewId} isShiny={false} width={140} height={140}
              style={{ filter: 'drop-shadow(0 0 12px #fbbf24)', marginBottom: showContinue ? 80 : 40 }} />
            <div style={{
              position: 'absolute', bottom: showContinue ? 90 : 40, left: 16, right: 16,
              background: 'rgba(0,0,0,0.88)',
              border: '3px solid white',
              borderRadius: 8,
              padding: '14px 18px',
              fontFamily: 'monospace',
              color: 'white',
              fontSize: '1rem',
              fontWeight: 700,
              minHeight: 64,
              letterSpacing: '0.03em',
            }}>
              {typeText}
            </div>
            {showContinue && (
              <button
                onClick={onComplete}
                style={{
                  position: 'absolute', bottom: 40, left: 16, right: 16,
                  padding: '14px',
                  borderRadius: 8,
                  fontFamily: 'monospace',
                  fontWeight: 900,
                  fontSize: '1rem',
                  color: 'black',
                  background: 'linear-gradient(135deg,#fbbf24,#f59e0b)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Continuer ▶
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
