import { useState, useEffect } from 'react';
import type { TcgCardDef } from '../data/tcgData';
import { TCG_RARITY_COLOR } from '../data/tcgData';
import TcgCard from './TcgCard';

interface BoosterOpeningProps {
  cards: TcgCardDef[];
  onClose: () => void;
}

export default function BoosterOpening({ cards, onClose }: BoosterOpeningProps) {
  const [phase, setPhase] = useState<'closed' | 'tearing' | 'cards'>('closed');
  const [revealedCount, setRevealedCount] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('tearing'), 300);
    const t2 = setTimeout(() => setPhase('cards'), 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    if (phase !== 'cards') return;
    let i = 0;
    const reveal = () => {
      if (i < cards.length) {
        i++;
        setRevealedCount(i);
        setTimeout(reveal, i < cards.length ? 250 : 0);
      }
    };
    const t = setTimeout(reveal, 200);
    return () => clearTimeout(t);
  }, [phase, cards.length]);

  const allRevealed = revealedCount >= cards.length;
  const lastCard = cards[cards.length - 1];
  const lastCardColor = TCG_RARITY_COLOR[lastCard.tcgRarity];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.92)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Booster tear animation */}
      {phase === 'tearing' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 160, height: 220, margin: '0 auto',
            background: 'linear-gradient(160deg, #1d4ed8, #7c3aed)',
            borderRadius: 16, border: '3px solid #a5b4fc',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 48, boxShadow: '0 0 40px #7c3aed88',
            animation: 'boosterShake 0.3s ease-in-out infinite',
          }}>
            🎴
          </div>
          <p style={{ color: '#a5b4fc', fontFamily: 'monospace', marginTop: 16, fontSize: '0.85rem' }}>
            Ouverture du booster...
          </p>
        </div>
      )}

      {/* Cards reveal */}
      {phase === 'cards' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%', maxWidth: 500 }}>
          {/* Cards strip */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center',
            padding: '0 16px', maxHeight: 380, overflowY: 'auto',
          }}>
            {cards.map((card, idx) => {
              const revealed = idx < revealedCount;
              const isLast = idx === cards.length - 1;
              return (
                <div
                  key={`${card.cardId}-${idx}`}
                  onClick={() => revealed && setSelectedIdx(idx)}
                  style={{
                    opacity: revealed ? 1 : 0,
                    transform: revealed ? 'scale(1) translateY(0)' : 'scale(0.5) translateY(20px)',
                    transition: 'all 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    filter: isLast && revealed ? `drop-shadow(0 0 12px ${lastCardColor})` : 'none',
                  }}
                >
                  <TcgCard card={card} size="sm" />
                </div>
              );
            })}
          </div>

          {allRevealed && (
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button
                onClick={() => setSelectedIdx(cards.length - 1)}
                style={{
                  background: `${lastCardColor}33`, border: `1px solid ${lastCardColor}`,
                  color: lastCardColor, fontFamily: 'monospace', fontWeight: 900,
                  padding: '8px 20px', borderRadius: 8, cursor: 'pointer', fontSize: '0.8rem',
                }}
              >
                ✦ Voir la rare
              </button>
              <button
                onClick={onClose}
                style={{
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
                  color: 'white', fontFamily: 'monospace', fontWeight: 700,
                  padding: '8px 20px', borderRadius: 8, cursor: 'pointer', fontSize: '0.8rem',
                }}
              >
                Fermer
              </button>
            </div>
          )}
        </div>
      )}

      {/* Full card zoom */}
      {selectedIdx !== null && (
        <div
          onClick={() => setSelectedIdx(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <TcgCard card={cards[selectedIdx]} size="lg" />
            <p style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.75rem' }}>
              Tap pour fermer
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes boosterShake {
          0%,100% { transform: rotate(-3deg) scale(1.02); }
          50% { transform: rotate(3deg) scale(1.02); }
        }
      `}</style>
    </div>
  );
}
