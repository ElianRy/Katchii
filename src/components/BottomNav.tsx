import { View } from '../types';

interface Props {
  currentView: View;
  onNavigate: (view: View) => void;
  questsCompleted: number;
}

const NAV_ITEMS: Array<{ view: View; icon: string; label: string; color: string; hoverBg: string }> = [
  { view: 'hunt',       icon: '🎯', label: 'Chasse',     color: 'text-white',       hoverBg: 'hover:bg-slate-700/40' },
  { view: 'collection', icon: '📚', label: 'Collection', color: 'text-blue-400',    hoverBg: 'hover:bg-blue-900/30' },
  { view: 'team',       icon: '⚔️', label: 'Équipe',     color: 'text-emerald-400', hoverBg: 'hover:bg-emerald-900/30' },
  { view: 'lures',      icon: '🎣', label: 'Leurres',    color: 'text-purple-400',  hoverBg: 'hover:bg-purple-900/30' },
  { view: 'quests',     icon: '📋', label: 'Quêtes',     color: 'text-green-400',   hoverBg: 'hover:bg-green-900/30' },
  { view: 'duels',      icon: '🥊', label: 'Duels',      color: 'text-red-400',     hoverBg: 'hover:bg-red-900/30' },
  { view: 'village',    icon: '🏘️', label: 'Village',    color: 'text-yellow-400',  hoverBg: 'hover:bg-yellow-900/30' },
  { view: 'skins',      icon: '🎨', label: 'Skins',      color: 'text-pink-400',    hoverBg: 'hover:bg-pink-900/30' },
  { view: 'fusion',     icon: '⚗️', label: 'Fusion',     color: 'text-purple-300',  hoverBg: 'hover:bg-purple-900/30' },
  { view: 'raid',       icon: '🐉', label: 'Raid',       color: 'text-red-300',     hoverBg: 'hover:bg-red-900/30' },
  { view: 'wrapped',    icon: '🎁', label: 'Wrapped',    color: 'text-yellow-300',  hoverBg: 'hover:bg-yellow-900/30' },
];

export function BottomNav({ currentView, onNavigate, questsCompleted }: Props) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[200] pointer-events-none">
      <div className="flex items-center justify-around bg-black/85 border-t border-slate-700/60 backdrop-blur-sm px-1 py-2 pointer-events-auto overflow-x-auto">
        {NAV_ITEMS.map(item => (
          <button
            key={item.view}
            onClick={() => onNavigate(item.view)}
            className={`relative flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-colors shrink-0 ${item.color} ${item.hoverBg} ${
              currentView === item.view ? 'bg-white/10 ring-1 ring-white/20' : ''
            }`}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span className="text-[0.55rem] font-bold leading-none">{item.label}</span>
            {item.view === 'quests' && questsCompleted > 0 && (
              <span className="absolute top-0.5 right-0.5 bg-yellow-500 text-black text-[0.5rem] font-black rounded-full w-3.5 h-3.5 flex items-center justify-center">
                {questsCompleted}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
