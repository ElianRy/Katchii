/**
 * PvpChallengePopup — overlay global de notification de défi entrant.
 *
 * Comportement :
 *  - Affiché au-dessus de tout (z-[800]) quand un défi est reçu.
 *  - "Fermer" cache le popup SANS refuser : un indicateur persistant reste sur le profil de l'envoyeur.
 *  - "Accepter" → déclenche onAccept(challenge).
 *  - "Refuser" → déclenche onDecline(challenge) et ferme.
 */
import { useEffect, useState } from 'react';
import type { PvpChallenge } from '../lib/pvp';

interface Props {
  challenge: PvpChallenge | null;
  onAccept: (challenge: PvpChallenge) => void;
  onDecline: (challenge: PvpChallenge) => void;
  onDismiss: () => void; // ferme le popup, garde le défi actif
}

export function PvpChallengePopup({ challenge, onAccept, onDecline, onDismiss }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (challenge) {
      setVisible(true);
    }
  }, [challenge?.id]);

  if (!challenge || !visible) return null;

  return (
    <div
      className="fixed inset-0 z-[800] flex items-end justify-center pointer-events-none"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 90px)' }}
    >
      <div
        className="pointer-events-auto mx-4 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
          border: '2px solid #7c3aed',
          boxShadow: '0 0 32px #7c3aed55, 0 8px 32px rgba(0,0,0,0.7)',
          animation: 'pvp-popup-in 0.35s cubic-bezier(.175,.885,.32,1.275) both',
        }}
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-3 flex items-center gap-3">
          <div className="text-3xl" style={{ filter: 'drop-shadow(0 0 8px #f59e0b)' }}>⚔️</div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-black text-base leading-tight truncate">
              Défi 3v3 !
            </div>
            <div className="text-purple-200 text-sm truncate">
              <span className="font-bold text-yellow-300">{challenge.challenger_name}</span> vous défie en combat !
            </div>
          </div>
          {/* Fermer (dismiss sans refuser) */}
          <button
            onClick={() => { setVisible(false); onDismiss(); }}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors shrink-0"
            style={{ lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {/* Pulsing divider */}
        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #7c3aed, transparent)' }} />

        {/* Actions */}
        <div className="flex gap-2 px-4 py-3">
          <button
            onClick={() => { setVisible(false); onDecline(challenge); }}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-300 hover:text-white transition-colors"
            style={{ background: '#374151', border: '1px solid #4b5563' }}
          >
            Refuser
          </button>
          <button
            onClick={() => { setVisible(false); onAccept(challenge); }}
            className="flex-1 py-2.5 rounded-xl text-sm font-black text-white transition-all active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              boxShadow: '0 0 16px #a855f755',
            }}
          >
            ⚔️ Accepter
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pvp-popup-in {
          from { opacity: 0; transform: translateY(40px) scale(0.92); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
      `}</style>
    </div>
  );
}

// ── Indicateur persistant sur le profil ──────────────────────────────────────
// Affiché à la place du bouton "Défier" quand un défi de CE joueur est en attente.

interface PendingIndicatorProps {
  challengerName: string;
  onAccept: () => void;
  onDecline: () => void;
}

export function PvpPendingIndicator({ challengerName, onAccept, onDecline }: PendingIndicatorProps) {
  return (
    <div
      className="w-full rounded-xl overflow-hidden"
      style={{ border: '2px solid #7c3aed', background: '#1e1b4b' }}
    >
      <div className="px-3 py-2 flex items-center gap-2">
        <span
          className="text-purple-300 font-bold text-xs"
          style={{ animation: 'pvp-blink 1.2s ease-in-out infinite' }}
        >
          ⚔️ Défi en attente de {challengerName}
        </span>
        <style>{`
          @keyframes pvp-blink { 0%,100%{opacity:1} 50%{opacity:0.4} }
        `}</style>
      </div>
      <div className="flex border-t border-purple-900">
        <button
          onClick={onDecline}
          className="flex-1 py-2 text-xs text-slate-400 hover:text-white transition-colors"
        >
          Refuser
        </button>
        <button
          onClick={onAccept}
          className="flex-1 py-2 text-xs font-black text-white"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
        >
          Accepter
        </button>
      </div>
    </div>
  );
}
