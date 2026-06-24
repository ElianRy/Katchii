import { useState, useEffect } from 'react';
import type { TcgCardDef } from '../data/tcgData';
import { TCG_RARITY_COLOR } from '../data/tcgData';
import TcgCard from './TcgCard';

interface BoosterOpeningProps {
  cards: TcgCardDef[];
  boosterCount: number;
  onClose: () => void;
  onOpenAnother: () => void;
}

const CARD_SIZE = { w: 90, h: 126 };

type Phase = 'pack' | 'cut' | 'emerge' | 'flip' | 'done';

export default function BoosterOpening({ cards, boosterCount, onClose, onOpenAnother }: BoosterOpeningProps) {
  const [phase, setPhase] = useState<Phase>('pack');
  const [cutProgress, setCutProgress] = useState(0); // 0→1
  const [emergedCount, setEmergedCount] = useState(0);
  const [flipped, setFlipped] = useState<boolean[]>(Array(cards.length).fill(false));
  const [suspense, setSuspense] = useState(false);
  const [burstIdx, setBurstIdx] = useState<number | null>(null);
  const [skipped, setSkipped] = useState(false);

  function skipAll() {
    setSkipped(true);
    setPhase('done');
    setFlipped(Array(cards.length).fill(true));
    setEmergedCount(cards.length);
  }

  useEffect(() => {
    if (skipped) return;
    let cancelled = false;

    async function run() {
      // Phase 1: show pack (0.8s)
      await delay(800);
      if (cancelled) return;

      // Phase 2: cut animation (0.6s)
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

      // Phase 3: cards emerge one by one (150ms each)
      setPhase('emerge');
      for (let i = 0; i < cards.length; i++) {
        await delay(150);
        if (cancelled) return;
        setEmergedCount(i + 1);
      }
      await delay(200);
      if (cancelled) return;

      // Phase 4: flip one by one
      setPhase('flip');
      for (let i = 0; i < cards.length - 1; i++) {
        await delay(320);
        if (cancelled) return;
        setFlipped(prev => { const n = [...prev]; n[i] = true; return n; });
      }

      // Last card suspense
      await delay(500);
      if (cancelled) return;
      setSuspense(true);
      await delay(1500);
      if (cancelled) return;
      setSuspense(false);

      const lastIdx = cards.length - 1;
      const lastCard = cards[lastIdx];
      const isImpressive = lastCard.tcgRarity === 'ultra' || lastCard.tcgRarity === 'secret' || (lastCard.tcgRarity === 'rare' && lastCard.isHolo);
      if (isImpressive) setBurstIdx(lastIdx);
      setFlipped(prev => { const n = [...prev]; n[lastIdx] = true; return n; });
      setPhase('done');
    }

    run();
    return () => { cancelled = true; };
  }, [cards, skipped]);

  const lastCard = cards[cards.length - 1];
  const lastColor = TCG_RARITY_COLOR[lastCard.tcgRarity];

  const showPack = phase === 'pack' || phase === 'cut';
  const showCards = phase === 'emerge' || phase === 'flip' || phase === 'done';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.95)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20,
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
          0%   { transform: translateY(40px) scale(0.85); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes suspense-shake {
          0%, 100% { transform: rotateY(0) translateX(-3px); }
          50%       { transform: rotateY(0) translateX(3px); }
        }
        @keyframes burst-reveal {
          0%   { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(3); opacity: 0; }
        }
        @keyframes tcg-impressive {
          0%, 100% { box-shadow: 0 0 10px rgba(168,85,247,0.5); }
          50%       { box-shadow: 0 0 25px rgba(168,85,247,0.9), 0 0 50px rgba(168,85,247,0.4); }
        }
        @keyframes tcg-secret-mini {
          0%   { box-shadow: 0 0 15px #ffd70099; }
          50%  { box-shadow: 0 0 30px #fff, 0 0 50px #ffd700; }
          100% { box-shadow: 0 0 15px #ffd70099; }
        }
      `}</style>

      {/* Pack display */}
      {showPack && (
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Top part of pack (gets cut off) */}
          <div style={{
            width: 120, height: 30,
            background: 'linear-gradient(135deg, #7c3aed, #1d4ed8)',
            borderRadius: '10px 10px 0 0',
            border: '2px solid #a78bfa',
            borderBottom: 'none',
            animation: phase === 'cut'
              ? `pack-cut-top ${0.6}s ease-out ${cutProgress > 0.3 ? '0s' : '0.2s'} forwards`
              : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ width: '60%', height: 2, background: 'rgba(255,255,255,0.3)', borderRadius: 1 }} />
          </div>
          {/* Main pack body */}
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
            {/* Pokéball on pack */}
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'linear-gradient(180deg, #dc2626 50%, white 50%)',
              border: '3px solid rgba(255,255,255,0.3)',
              position: 'relative',
            }}>
              <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 3, background: 'rgba(0,0,0,0.5)', transform: 'translateY(-50%)' }} />
              <div style={{ position: 'absolute', top: '50%', left: '50%', width: 14, height: 14, borderRadius: '50%', background: 'white', border: '2px solid rgba(0,0,0,0.3)', transform: 'translate(-50%,-50%)' }} />
            </div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontFamily: 'monospace', fontWeight: 900, fontSize: '0.6rem', letterSpacing: 2 }}>POKÉMON TCG</div>
            {/* Sheen lines */}
            <div style={{ position: 'absolute', top: 0, left: '20%', width: 2, height: '100%', background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.12), transparent)' }} />
            <div style={{ position: 'absolute', top: 0, left: '70%', width: 1, height: '100%', background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.08), transparent)' }} />
          </div>
        </div>
      )}

      {/* Cards grid */}
      {showCards && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center',
          padding: '0 16px', maxWidth: 500,
        }}>
          {cards.map((card, idx) => {
            const emerged = idx < emergedCount;
            const isLastCard = idx === cards.length - 1;
            const isFlipped = flipped[idx];
            const isImpressive = card.tcgRarity === 'ultra' || card.tcgRarity === 'secret' || (card.tcgRarity === 'rare' && card.isHolo);
            const burst = burstIdx === idx;
            return (
              <div
                key={idx}
                style={{
                  position: 'relative', perspective: 600,
                  opacity: emerged ? 1 : 0,
                  animation: emerged && !isFlipped ? 'card-emerge 0.3s ease-out' : 'none',
                }}
              >
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
                      style={{ width: CARD_SIZE.w, height: CARD_SIZE.h, borderRadius: CARD_SIZE.w * 0.06, flexShrink: 0, objectFit: 'cover', display: 'block' }}
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
                {/* Burst effect */}
                {burst && (
                  <div style={{
                    position: 'absolute', inset: -20, borderRadius: '50%', zIndex: 10, pointerEvents: 'none',
                    background: `radial-gradient(circle, ${TCG_RARITY_COLOR[card.tcgRarity]}88 0%, transparent 70%)`,
                    animation: 'burst-reveal 0.8s ease-out forwards',
                  }} />
                )}
                {/* Impressive glow */}
                {isFlipped && isImpressive && (
                  <div style={{
                    position: 'absolute', inset: -4, borderRadius: 8, zIndex: 5, pointerEvents: 'none',
                    boxShadow: `0 0 20px ${TCG_RARITY_COLOR[card.tcgRarity]}99`,
                    animation: card.tcgRarity === 'secret'
                      ? 'tcg-secret-mini 1.5s ease-in-out infinite'
                      : 'tcg-impressive 2s ease-in-out infinite',
                  }} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        {/* Skip button — only during animation */}
        {phase !== 'done' && (
          <button
            onClick={skipAll}
            style={{
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.5)', borderRadius: 10, padding: '8px 18px',
              fontFamily: 'monospace', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer',
            }}
          >
            Passer ⏩
          </button>
        )}

        {/* After reveal */}
        {phase === 'done' && (
          <>
            {boosterCount > 0 && (
              <button
                onClick={onOpenAnother}
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #1d4ed8)',
                  border: '1px solid #a78bfa', color: 'white',
                  borderRadius: 10, padding: '10px 22px',
                  fontFamily: 'monospace', fontWeight: 900, fontSize: '0.8rem', cursor: 'pointer',
                  boxShadow: '0 0 16px #7c3aed44',
                }}
              >
                🎴 Ouvrir un autre pack ({boosterCount})
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
                color: 'white', borderRadius: 10, padding: '10px 22px',
                fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
              }}
            >
              Fermer
            </button>
          </>
        )}
      </div>

      {/* Last card label */}
      {phase === 'done' && (
        <p style={{ color: lastColor, fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 700, textShadow: `0 0 8px ${lastColor}` }}>
          ✦ {lastCard.pokemonName} — {lastCard.isHolo ? 'HOLO · ' : ''}{lastCard.tcgRarity.toUpperCase()}
        </p>
      )}
    </div>
  );
}

function delay(ms: number) {
  return new Promise<void>(res => setTimeout(res, ms));
}
