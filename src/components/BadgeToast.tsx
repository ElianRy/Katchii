import { useEffect } from 'react';
import { BADGE_BY_ID } from '../data/badges';

interface Props {
  badgeId: string;
  onDismiss: () => void;
}

export function BadgeToast({ badgeId, onDismiss }: Props) {
  const badge = BADGE_BY_ID[badgeId];

  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!badge) return null;

  return (
    <div
      className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 animate-float-up pointer-events-none"
      style={{ minWidth: 260 }}
    >
      <div className="flex items-center gap-3 bg-yellow-900/90 border border-yellow-400/60 rounded-2xl px-5 py-3 shadow-2xl backdrop-blur-sm">
        <span className="text-3xl">{badge.icon}</span>
        <div>
          <div className="text-yellow-300 font-bold text-sm">🏅 Succès débloqué !</div>
          <div className="text-white font-bold">{badge.label}</div>
          <div className="text-yellow-200/70 text-xs">{badge.secret ? badge.desc : badge.desc}</div>
        </div>
      </div>
    </div>
  );
}
