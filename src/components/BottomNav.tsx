import { useState } from 'react';
import { View } from '../types';

interface Props {
  currentView: View;
  onNavigate: (view: View) => void;
  questsCompleted: number;
}

export const BOTTOM_NAV_HEIGHT = 72;

const MAIN_ITEMS = [
  { view: 'hunt'       as View, icon: '🎯', label: 'Chasse',     color: 'text-white',       active: 'bg-white/10' },
  { view: 'collection' as View, icon: '📚', label: 'Collection', color: 'text-blue-400',    active: 'bg-blue-900/30' },
  { view: 'team'       as View, icon: '⚔️', label: 'Équipe',     color: 'text-emerald-400', active: 'bg-emerald-900/30' },
  { view: 'pokepark'   as View, icon: '🌿', label: 'PokéParc',   color: 'text-green-300',   active: 'bg-green-900/30' },
];

const MENU_ITEMS = [
  { view: 'lures'  as View, icon: '🎣', label: 'Leurres',  color: '#c084fc' },
  { view: 'duels'  as View, icon: '🥊', label: 'Duels',    color: '#f87171' },
  { view: 'village'as View, icon: '🏘️', label: 'Village',  color: '#fbbf24' },
  { view: 'skins'  as View, icon: '🎨', label: 'Skins',    color: '#f472b6' },
  { view: 'fusion' as View, icon: '⚗️', label: 'Fusion',   color: '#c084fc' },
  { view: 'raid'   as View, icon: '🐉', label: 'Raid',     color: '#f87171' },
];

export function BottomNav({ currentView, onNavigate, questsCompleted }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  const inMenu = MENU_ITEMS.some(i => i.view === currentView);

  const handleNavigate = (view: View) => {
    setMenuOpen(false);
    onNavigate(view);
  };

  return (
    <>
      {/* Overflow menu sheet */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-[190]"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="absolute bottom-[72px] left-0 right-0 bg-black/95 border-t border-slate-700/60 backdrop-blur-sm px-4 py-3"
            onClick={e => e.stopPropagation()}
          >
            <div className="grid grid-cols-3 gap-2">
              {MENU_ITEMS.map(item => (
                <button
                  key={item.view}
                  onClick={() => handleNavigate(item.view)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all ${
                    currentView === item.view ? 'bg-white/10 ring-1 ring-white/20' : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <span className="text-2xl leading-none">{item.icon}</span>
                  <span className="text-xs font-bold" style={{ color: item.color }}>{item.label}</span>
                </button>
              ))}
            </div>

            {/* Quests inside menu */}
            <div className="mt-2 pt-2 border-t border-slate-700/40 flex justify-center">
              <button
                onClick={() => handleNavigate('quests')}
                className={`relative flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                  currentView === 'quests' ? 'bg-green-900/40 text-green-300' : 'text-slate-400 hover:text-green-300'
                }`}
              >
                <span>📋</span>
                <span>Quêtes</span>
                {questsCompleted > 0 && (
                  <span className="bg-yellow-500 text-black text-[0.5rem] font-black rounded-full w-4 h-4 flex items-center justify-center">
                    {questsCompleted}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main nav bar */}
      <div className="fixed bottom-0 left-0 right-0 z-[200] pointer-events-none" style={{ height: BOTTOM_NAV_HEIGHT }}>
        <div className="flex items-center justify-around h-full bg-black/90 border-t border-slate-700/60 backdrop-blur-sm px-1 pointer-events-auto">
          {MAIN_ITEMS.map(item => (
            <button
              key={item.view}
              onClick={() => handleNavigate(item.view)}
              className={`relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${item.color} ${
                currentView === item.view ? `${item.active} ring-1 ring-white/20` : 'hover:bg-white/5'
              }`}
            >
              <span className="text-2xl leading-none">{item.icon}</span>
              <span className="text-[0.6rem] font-bold leading-none">{item.label}</span>
            </button>
          ))}

          {/* Menu "···" button */}
          <div className="flex flex-col items-center gap-0.5">
            <button
              onClick={() => setMenuOpen(o => !o)}
              className={`relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${
                menuOpen || inMenu ? 'bg-white/10 ring-1 ring-white/20 text-white' : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              <span className="text-2xl leading-none font-black tracking-widest">···</span>
              <span className="text-[0.6rem] font-bold leading-none">Menu</span>
              {(questsCompleted > 0 || inMenu) && (
                <span className={`absolute top-1 right-1 w-2 h-2 rounded-full ${questsCompleted > 0 ? 'bg-yellow-500' : 'bg-slate-500'}`} />
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
