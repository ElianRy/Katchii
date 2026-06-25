import { useState, useEffect } from 'react';
import type { TcgCardDef } from '../data/tcgData';
import { TCG_RARITY_COLOR, cardProbability } from '../data/tcgData';
import TcgCard from './TcgCard';

interface BoosterOpeningProps {
  cards: TcgCardDef[];
  boosterCount: number;
  onClose: () => void;
  onOpenAnother: () => void;
}

// Fixed 5-per-row layout
const CARD_SIZE = { w: 62, h: 87 };
const COLS = 5;

type Phase = 'pack' | 'cut' | 'emerge' | 'flip' | 'done';

function Confetti() {
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 1.5}s`,
    duration: `${1.5 + Math.random()}s`,
    color: ['#fbbf24', '#a855f7', '#3b82f6', '#22c55e', '#ef4444', '#ec4899'][i % 6],
    rotate: Math.random() * 360,
    size: 6 + Math.random() * 6,
  }));
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 50 }}>
      {pieces.map((p, i) => (
        <div key={i} style={{
          position: 'absolute', top: '-10px', left: p.left,
          width: p.size, height: p.size,
          background: p.color,
          borderRadius: i % 3 === 0 ? '50%' : i % 3 === 1 ? '2px' : '0',
          transform: `rotate(${p.rotate}deg)`,
          animation: `confetti-fall ${p.duration} ${p.delay} ease-in forwards`,
        }} />
      ))}
    </div>
  );
}

export default function BoosterOpening({ cards, boosterCount, onClose, onOpenAnother }: BoosterOpeningProps) {
  const [phase, setPhase] = useState<Phase>('pack');
  const [cutProgress, setCutProgress] = useState(0);
  const [emergedCount, setEmergedCount] = useState(0);
  const [flipped, setFlipped] = useState<boolean[]>(Array(cards.length).fill(false));
  const [suspense, setSuspense] = useState(false);
  const [burstIdx, setBurstIdx] = useState<number | null>(null);
  const [skipped, setSkipped] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);

  const lastCard = cards[cards.length - 1];
  const lastColor = TCG_RARITY_COLOR[lastCard.tcgRarity];
  const lastIsHolo = lastCard.isHolo;
  const lastIsEpic = (lastCard.tcgRarity === 'ultra' && lastCard.isHolo) || lastCard.tcgRarity === 'secret';

  function skipAll() {
    setSkipped(true);
    setPhase('done');
    setFlipped(Array(cards.length).fill(true));
    setEmergedCount(cards.length);
    if (lastIsEpic) setShowFullscreen(true);
  }

  useEffect(() => {
    if (skipped) return;
    let cancelled = false;

    async function run() {
      await delay(800);
      if (cancelled) return;

      setPhase('cut');
      const start = Date.now();
      const cutDuration = 600;
      const tick = () => {
        const p = Math.min(1, (Date.now() - start) / cutDuration);
        setCutProgress(p);
        if (p < 1 && !cancelled) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      await delay(cutDuration + 100);
      if (cancelled) return;

      setPhase('emerge');
      for (let i = 0; i < cards.length; i++) {
        await delay(150);
        if (cancelled) return;
        setEmergedCount(i + 1);
      }
      await delay(200);
      if (cancelled) return;

      setPhase('flip');
      for (let i = 0; i < cards.length - 1; i++) {
        await delay(320);
        if (cancelled) return;
        setFlipped(prev => { const n = [...prev]; n[i] = true; return n; });
      }

      await delay(500);
      if (cancelled) return;
      setSuspense(true);
      await delay(1500);
      if (cancelled) return;
      setSuspense(false);

      const lastIdx = cards.length - 1;
      const isImpressive = lastCard.tcgRarity === 'ultra' || lastCard.tcgRarity === 'secret' || (lastCard.tcgRarity === 'rare' && lastCard.isHolo);
      if (isImpressive) setBurstIdx(lastIdx);
      setFlipped(prev => { const n = [...prev]; n[lastIdx] = true; return n; });
      setPhase('done');

      if (lastIsEpic) {
        await delay(800);
        if (!cancelled) setShowFullscreen(true);
      }
    }

    run();
    return () => { cancelled = true; };
  }, [cards, skipped, lastCard, lastIsEpic]);

  const showPack = phase === 'pack' || phase === 'cut';
  const showCards = phase === 'emerge' || phase === 'flip' || phase === 'done';

  // Row count for card grid
  const rowCount = Math.ceil(cards.length / COLS);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.95)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
    }}>
      <style>{`
        @keyframes pack-idle {
          0%, 100% { transform: translateY(0) rotate(-1deg); }
          50%       { transform: translateY(-6px) rotate(1deg); }
        }
        @keyframes pack-cut-top {
          0%   { transform: translateY(0); }
          100% { transform: translateY(-80px) rotate(-8deg); opacity: 0; }
        }
        @keyframes card-emerge {
          0%   { transform: translateY(30px) scale(0.85); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes suspense-shake {
          0%, 100% { transform: translateX(-3px); }
          50%       { transform: translateX(3px); }
        }
        @keyframes burst-reveal {
          0%   { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(3); opacity: 0; }
        }
        @keyframes tcg-impressive {
          0%, 100% { box-shadow: 0 0 6px rgba(168,85,247,0.5); }
          50%       { box-shadow: 0 0 16px rgba(168,85,247,0.9), 0 0 32px rgba(168,85,247,0.4); }
        }
        @keyframes tcg-secret-mini {
          0%   { box-shadow: 0 0 8px #ffd70099; }
          50%  { box-shadow: 0 0 20px #fff, 0 0 32px #ffd700; }
          100% { box-shadow: 0 0 8px #ffd70099; }
        }
        @keyframes confetti-fall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes fullscreen-pulse {
          0%, 100% { opacity: 0.85; }
          50%       { opacity: 1; }
        }
        @keyframes fullscreen-card-reveal {
          0%   { transform: scale(0.3) rotate(-15deg); opacity: 0; }
          60%  { transform: scale(1.1) rotate(2deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes fullscreen-glow {
          0%, 100% { box-shadow: 0 0 40px ${lastColor}88, 0 0 80px ${lastColor}44; }
          50%       { box-shadow: 0 0 80px ${lastColor}cc, 0 0 160px ${lastColor}66; }
        }
      `}</style>

      {/* Fullscreen epic reveal */}
      {showFullscreen && (
        <div
          onClick={() => setShowFullscreen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: `radial-gradient(ellipse at center, ${lastColor}22 0%, rgba(0,0,0,0.97) 70%)`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24,
            animation: 'fullscreen-pulse 2s ease-in-out infinite',
            cursor: 'pointer',
          }}
        >
          {lastIsHolo && <Confetti />}
          <div style={{
            animation: 'fullscreen-card-reveal 0.8s cubic-bezier(0.34,1.56,0.64,1) forwards',
            animationFillMode: 'forwards',
          }}>
            <div style={{ animation: 'fullscreen-glow 2s ease-in-out infinite' }}>
              <TcgCard card={lastCard} size="lg" />
            </div>
          </div>
          <p style={{
            color: lastColor, fontFamily: 'monospace', fontWeight: 900, fontSize: '1rem',
            textShadow: `0 0 12px ${lastColor}`,
            textAlign: 'center',
          }}>
            ✦ {lastCard.pokemonName} — {lastCard.isHolo ? 'HOLO · ' : ''}{lastCard.tcgRarity.toUpperCase()}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace', fontSize: '0.7rem' }}>
            Appuie pour continuer
          </p>
        </div>
      )}

      {/* Pack display */}
      {showPack && (
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            width: 120, height: 30,
            background: 'linear-gradient(135deg, #7c3aed, #1d4ed8)',
            borderRadius: '10px 10px 0 0',
            border: '2px solid #a78bfa', borderBottom: 'none',
            animation: phase === 'cut'
              ? `pack-cut-top 0.6s ease-out ${cutProgress > 0.3 ? '0s' : '0.2s'} forwards`
              : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ width: '60%', height: 2, background: 'rgba(255,255,255,0.3)', borderRadius: 1 }} />
          </div>
          <div style={{
            width: 120, height: 170,
            background: 'linear-gradient(160deg, #4c1d95 0%, #1e1b4b 40%, #312e81 100%)',
            borderRadius: '0 0 10px 10px',
            border: '2px solid #6d28d9',
            borderTop: phase === 'cut' ? '2px dashed #a78bfa' : '2px solid #6d28d9',
            position: 'relative', overflow: 'hidden',
            animation: phase === 'pack' ? 'pack-idle 2s ease-in-out infinite' : 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'linear-gradient(180deg, #dc2626 50%, white 50%)',
              border: '3px solid rgba(255,255,255,0.3)', position: 'relative',
            }}>
              <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 3, background: 'rgba(0,0,0,0.5)', transform: 'translateY(-50%)' }} />
              <div style={{ position: 'absolute', top: '50%', left: '50%', width: 14, height: 14, borderRadius: '50%', background: 'white', border: '2px solid rgba(0,0,0,0.3)', transform: 'translate(-50%,-50%)' }} />
            </div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontFamily: 'monospace', fontWeight: 900, fontSize: '0.6rem', letterSpacing: 2 }}>POKÉMON TCG</div>
            <div style={{ position: 'absolute', top: 0, left: '20%', width: 2, height: '100%', background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.12), transparent)' }} />
            <div style={{ position: 'absolute', top: 0, left: '70%', width: 1, height: '100%', background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.08), transparent)' }} />
          </div>
        </div>
      )}

      {/* Cards fixed grid */}
      {showCards && (
        <div>
          {/* Confetti for holo last card (not epic — epic uses fullscreen) */}
          {phase === 'done' && lastIsHolo && !lastIsEpic && <Confetti />}

          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${COLS}, ${CARD_SIZE.w}px)`,
            gap: 6,
            padding: '0 12px',
          }}>
            {/* Pad to full grid if needed */}
            {Array.from({ length: rowCount * COLS }, (_, idx) => {
              const card = cards[idx];
              if (!card) return <div key={idx} style={{ width: CARD_SIZE.w, height: CARD_SIZE.h }} />;

              const emerged = idx < emergedCount;
              const isLastCard = idx === cards.length - 1;
              const isFlipped = flipped[idx];
              const isImpressive = card.tcgRarity === 'ultra' || card.tcgRarity === 'secret' || (card.tcgRarity === 'rare' && card.isHolo);
              const burst = burstIdx === idx;
              return (
                <div key={idx} style={{
                  position: 'relative', perspective: 600,
                  opacity: emerged ? 1 : 0,
                  animation: emerged && !isFlipped ? 'card-emerge 0.3s ease-out' : 'none',
                }}>
                  <div style={{
                    transformStyle: 'preserve-3d',
                    transition: 'transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: isFlipped ? 'rotateY(180deg)' : 'none',
                    animation: isLastCard && suspense ? 'suspense-shake 0.4s ease-in-out infinite' : 'none',
                  }}>
                    {/* Back */}
                    <div style={{ backfaceVisibility: 'hidden', position: isFlipped ? 'absolute' : 'relative' }}>
                      <img
                        src="/card-back.webp"
                        alt="card back"
                        style={{ width: CARD_SIZE.w, height: CARD_SIZE.h, borderRadius: CARD_SIZE.w * 0.06, objectFit: 'cover', display: 'block' }}
                      />
                    </div>
                    {/* Front */}
                    <div style={{
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                      position: isFlipped ? 'relative' : 'absolute', top: 0, left: 0,
                    }}>
                      <TcgCard card={card} size="sm" />
                    </div>
                  </div>
                  {burst && (
                    <div style={{
                      position: 'absolute', inset: -16, borderRadius: '50%', zIndex: 10, pointerEvents: 'none',
                      background: `radial-gradient(circle, ${TCG_RARITY_COLOR[card.tcgRarity]}88 0%, transparent 70%)`,
                      animation: 'burst-reveal 0.8s ease-out forwards',
                    }} />
                  )}
                  {isFlipped && isImpressive && (
                    <div style={{
                      position: 'absolute', inset: -3, borderRadius: 6, zIndex: 5, pointerEvents: 'none',
                      animation: card.tcgRarity === 'secret'
                        ? 'tcg-secret-mini 1.5s ease-in-out infinite'
                        : 'tcg-impressive 2s ease-in-out infinite',
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        {phase !== 'done' && (
          <button onClick={skipAll} style={{
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.5)', borderRadius: 10, padding: '8px 18px',
            fontFamily: 'monospace', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer',
          }}>
            Passer ⏩
          </button>
        )}

        {phase === 'done' && (
          <>
            {boosterCount > 0 && (
              <button onClick={onOpenAnother} style={{
                background: 'linear-gradient(135deg, #7c3aed, #1d4ed8)',
                border: '1px solid #a78bfa', color: 'white',
                borderRadius: 10, padding: '10px 22px',
                fontFamily: 'monospace', fontWeight: 900, fontSize: '0.8rem', cursor: 'pointer',
                boxShadow: '0 0 16px #7c3aed44',
              }}>
                🎴 Ouvrir un autre pack ({boosterCount})
              </button>
            )}
            <button onClick={onClose} style={{
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
              color: 'white', borderRadius: 10, padding: '10px 22px',
              fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
            }}>
              Fermer
            </button>
          </>
        )}
      </div>

      {/* Probability + last card label */}
      {phase === 'done' && (
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: lastColor, fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 700, textShadow: `0 0 8px ${lastColor}`, margin: 0 }}>
            ✦ {lastCard.pokemonName} — {lastCard.isHolo ? 'HOLO · ' : ''}{lastCard.tcgRarity.toUpperCase()}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', fontSize: '0.65rem', margin: '4px 0 0' }}>
            {cardProbability(lastCard)}
          </p>
        </div>
      )}
    </div>
  );
}

function delay(ms: number) {
  return new Promise<void>(res => setTimeout(res, ms));
}
