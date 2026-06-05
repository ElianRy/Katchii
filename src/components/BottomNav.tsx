import { useState, useEffect, useRef, useCallback } from 'react';
import { View } from '../types';
import { POKEMON_TYPE } from '../data/pokemonTypes';

interface Props {
  currentView: View;
  onNavigate: (view: View) => void;
  questsCompleted: number;
  favoritePokemon?: { pokemonId: number; isShiny?: boolean } | null;
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

type Mood = 'happy' | 'sleep' | 'attack';

const TYPE_ATTACK_EMOJI: Record<string, string> = {
  fire: '🔥', water: '💧', grass: '🌿', electric: '⚡', ice: '❄️',
  fighting: '👊', poison: '☠️', ground: '🌍', flying: '🌪️', psychic: '🔮',
  bug: '🐛', rock: '🪨', ghost: '👻', dragon: '🐉', normal: '⭐',
};

interface FloatingHeart {
  id: number;
  x: number;
}

interface AttackEmoji {
  id: number;
  emoji: string;
}

function FavoritePokemon({ pokemonId, isShiny }: { pokemonId: number; isShiny?: boolean }) {
  const [posX, setPosX] = useState(50);
  const [mood, setMood] = useState<Mood>('happy');
  const [facingRight, setFacingRight] = useState(true);
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);
  const [attacks, setAttacks] = useState<AttackEmoji[]>([]);
  const lastClickRef = useRef<number>(0);
  const heartCounterRef = useRef(0);
  const attackCounterRef = useRef(0);

  const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${isShiny ? 'shiny/' : ''}${pokemonId}.png`;

  // Change position every 3s
  useEffect(() => {
    const id = setInterval(() => {
      setPosX(prev => {
        const next = 10 + Math.random() * 80;
        setFacingRight(next > prev);
        return next;
      });
    }, 3000);
    return () => clearInterval(id);
  }, []);

  // Change mood every 15-25s
  useEffect(() => {
    const schedule = () => {
      const delay = 15000 + Math.random() * 10000;
      return setTimeout(() => {
        const moods: Mood[] = ['happy', 'sleep', 'attack'];
        setMood(moods[Math.floor(Math.random() * moods.length)]);
        timeoutRef.current = schedule();
      }, delay);
    };
    const timeoutRef = { current: schedule() };
    return () => clearTimeout(timeoutRef.current);
  }, []);

  // Attack emojis every 2.5s when in attack mood
  useEffect(() => {
    if (mood !== 'attack') return;
    const id = setInterval(() => {
      const types = POKEMON_TYPE[pokemonId] ?? ['normal'];
      const type = types[Math.floor(Math.random() * types.length)];
      const emoji = TYPE_ATTACK_EMOJI[type] ?? '⭐';
      const newId = attackCounterRef.current++;
      setAttacks(prev => [...prev, { id: newId, emoji }]);
      setTimeout(() => {
        setAttacks(prev => prev.filter(a => a.id !== newId));
      }, 1200);
    }, 2500);
    return () => clearInterval(id);
  }, [mood, pokemonId]);

  const handleClick = useCallback(() => {
    const now = Date.now();
    if (now - lastClickRef.current < 400) {
      // Double tap — spawn 3 hearts
      const newHearts: FloatingHeart[] = Array.from({ length: 3 }, () => {
        const id = heartCounterRef.current++;
        return { id, x: (Math.random() - 0.5) * 30 };
      });
      setHearts(prev => [...prev, ...newHearts]);
      setTimeout(() => {
        setHearts(prev => prev.filter(h => !newHearts.some(nh => nh.id === h.id)));
      }, 1200);
    }
    lastClickRef.current = now;
  }, []);

  let spriteAnim = 'bounce-pokemon 1.8s ease-in-out infinite';
  if (mood === 'sleep') spriteAnim = 'none';
  if (mood === 'attack') spriteAnim = 'wiggle 0.4s ease-in-out infinite';

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 64,
        left: `${posX}%`,
        transform: 'translateX(-50%)',
        transition: 'left 1.2s ease-in-out',
        zIndex: 10,
        cursor: 'pointer',
        userSelect: 'none',
      }}
      onClick={handleClick}
    >
      {/* Floating hearts */}
      {hearts.map(h => (
        <div
          key={h.id}
          style={{
            position: 'absolute',
            bottom: 36,
            left: `calc(50% + ${h.x}px)`,
            transform: 'translateX(-50%)',
            fontSize: 14,
            animation: 'float-heart 1.2s ease-out forwards',
            pointerEvents: 'none',
          }}
        >
          ❤️
        </div>
      ))}

      {/* Attack emojis */}
      {attacks.map(a => (
        <div
          key={a.id}
          style={{
            position: 'absolute',
            bottom: 36,
            left: facingRight ? '100%' : '-40%',
            fontSize: 16,
            animation: 'float-heart 1.2s ease-out forwards',
            pointerEvents: 'none',
          }}
        >
          {a.emoji}
        </div>
      ))}

      {/* Zzz for sleep */}
      {mood === 'sleep' && (
        <div
          style={{
            position: 'absolute',
            bottom: 32,
            left: '60%',
            fontSize: 12,
            animation: 'float-heart 2s ease-out infinite',
            pointerEvents: 'none',
            opacity: 0.85,
          }}
        >
          💤
        </div>
      )}

      <img
        src={spriteUrl}
        width={32}
        height={32}
        style={{
          imageRendering: 'pixelated',
          transform: facingRight ? undefined : 'scaleX(-1)',
          animation: spriteAnim,
          display: 'block',
          filter: isShiny ? 'drop-shadow(0 0 4px #fde047)' : undefined,
        }}
        draggable={false}
        alt=""
      />
    </div>
  );
}

export function BottomNav({ currentView, onNavigate, questsCompleted, favoritePokemon }: Props) {
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
        {/* Favorite pokemon wandering above the nav */}
        {favoritePokemon && (
          <FavoritePokemon
            pokemonId={favoritePokemon.pokemonId}
            isShiny={favoritePokemon.isShiny}
          />
        )}

        <div
          className="flex items-center justify-around h-full backdrop-blur-sm px-1 pointer-events-auto"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(15,23,42,0.95) 100%)',
            borderTop: '1px solid rgba(148,163,184,0.2)',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
            borderRadius: '20px 20px 0 0',
          }}
        >
          {MAIN_ITEMS.map(item => (
            <button
              key={item.view}
              onClick={() => handleNavigate(item.view)}
              className={`relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${item.color} ${
                currentView === item.view ? 'hover:bg-white/5' : 'hover:bg-white/5'
              }`}
            >
              <span className="text-2xl leading-none">{item.icon}</span>
              <span className="text-[0.6rem] font-bold leading-none">{item.label}</span>
              {/* Active dot indicator */}
              {currentView === item.view && (
                <span
                  className="absolute"
                  style={{
                    bottom: 2,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: 'white',
                    opacity: 0.9,
                  }}
                />
              )}
            </button>
          ))}

          {/* Menu "···" button */}
          <div className="flex flex-col items-center gap-0.5">
            <button
              onClick={() => setMenuOpen(o => !o)}
              className={`relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${
                menuOpen || inMenu ? 'text-white' : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              <span className="text-2xl leading-none font-black tracking-widest">···</span>
              <span className="text-[0.6rem] font-bold leading-none">Menu</span>
              {(questsCompleted > 0 || inMenu) && (
                <span className={`absolute top-1 right-1 w-2 h-2 rounded-full ${questsCompleted > 0 ? 'bg-yellow-500' : 'bg-slate-500'}`} />
              )}
              {/* Active dot for menu */}
              {inMenu && (
                <span
                  className="absolute"
                  style={{
                    bottom: 2,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: 'white',
                    opacity: 0.9,
                  }}
                />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Keyframes for floating hearts */}
      <style>{`
        @keyframes float-heart {
          0%   { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-40px); }
        }
      `}</style>
    </>
  );
}
