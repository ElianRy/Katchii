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

function PokeBallBack({ size }: { size: { w: number; h: number } }) {
  const r = size.w * 0.06;
  return (
    <div style={{
      width: size.w, height: size.h, borderRadius: r, overflow: 'hidden', flexShrink: 0,
      border: '2px solid #1e293b', position: 'relative', background: '#1e293b',
    }}>
      {/* Red top half */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', background: '#dc2626' }} />
      {/* White bottom half */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', background: '#f1f5f9' }} />
      {/* Black divider */}
      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 3, background: '#0f172a', transform: 'translateY(-50%)' }} />
      {/* Center circle outer */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        width: size.w * 0.32, height: size.w * 0.32,
        borderRadius: '50%', background: '#0f172a',
        transform: 'translate(-50%, -50%)',
      }} />
      {/* Center circle inner */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        width: size.w * 0.2, height: size.w * 0.2,
        borderRadius: '50%', background: '#f1f5f9',
        transform: 'translate(-50%, -50%)',
      }} />
    </div>
  );
}

const CARD_SIZE = { w: 90, h: 126 };

export default function BoosterOpening({ cards, boosterCount, onClose, onOpenAnother }: BoosterOpeningProps) {
  const [flipped, setFlipped] = useState<boolean[]>(Array(cards.length).fill(false));
  const [suspense, setSuspense] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [burstIdx, setBurstIdx] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function flipSequence() {
      for (let i = 0; i < cards.length - 1; i++) {
        await new Promise(r => setTimeout(r, 350));
        if (cancelled) return;
        setFlipped(prev => { const n = [...prev]; n[i] = true; return n; });
      }
      // Last card: suspense
      await new Promise(r => setTimeout(r, 600));
      if (cancelled) return;
      setSuspense(true);
      await new Promise(r => setTimeout(r, 1600));
      if (cancelled) return;
      setSuspense(false);
      const lastIdx = cards.length - 1;
      const lastCard = cards[lastIdx];
      const isImpressive = lastCard.tcgRarity === 'ultra' || lastCard.tcgRarity === 'secret' || (lastCard.tcgRarity === 'rare' && lastCard.isHolo);
      if (isImpressive) setBurstIdx(lastIdx);
      setFlipped(prev => { const n = [...prev]; n[lastIdx] = true; return n; });
      setRevealed(true);
    }
    flipSequence();
    return () => { cancelled = true; };
  }, [cards]);

  const lastCard = cards[cards.length - 1];
  const lastColor = TCG_RARITY_COLOR[lastCard.tcgRarity];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.93)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20,
    }}>
      {/* Cards strip */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center',
        padding: '0 16px', maxWidth: 500,
      }}>
        {cards.map((card, idx) => {
          const isLastCard = idx === cards.length - 1;
          const isFlipped = flipped[idx];
          const isImpressive = card.tcgRarity === 'ultra' || card.tcgRarity === 'secret' || (card.tcgRarity === 'rare' && card.isHolo);
          const burst = burstIdx === idx;
          return (
            <div key={idx} style={{ position: 'relative', perspective: 600 }}>
              <div style={{
                transformStyle: 'preserve-3d',
                transition: 'transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: isFlipped ? 'rotateY(180deg)' : 'none',
                animation: isLastCard && suspense ? 'suspense-shake 0.4s ease-in-out infinite' : 'none',
              }}>
                {/* Back */}
                <div style={{ backfaceVisibility: 'hidden', position: isFlipped ? 'absolute' : 'relative' }}>
                  <PokeBallBack size={CARD_SIZE} />
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
              {/* Burst effect on reveal */}
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

      {/* Buttons */}
      {revealed && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
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
        </div>
      )}

      {/* Last card label */}
      {revealed && (
        <p style={{ color: lastColor, fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 700, textShadow: `0 0 8px ${lastColor}` }}>
          ✦ {lastCard.pokemonName} — {lastCard.isHolo ? 'HOLO · ' : ''}{lastCard.tcgRarity.toUpperCase()}
        </p>
      )}

      <style>{`
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
    </div>
  );
}
