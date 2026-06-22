import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View } from '../types';
import { POKEMON_TYPE } from '../data/pokemonTypes';
import { playSfxConfirm, playPokemonCry } from '../lib/audio';

interface Props {
  currentView: View;
  onNavigate: (view: View) => void;
  questsCompleted: number;
  favoritePokemon?: { pokemonId: number; isShiny?: boolean } | null;
  onOpenQuests?: () => void;
  onShowPlayers?: () => void;
}

export const BOTTOM_NAV_HEIGHT = 72;

const MAIN_ITEMS = [
  { view: 'hunt'       as View, icon: '🎯', label: 'Chasse',     color: 'text-white',       active: 'bg-white/10' },
  { view: 'collection' as View, icon: '📚', label: 'Pokédex',    color: 'text-blue-400',    active: 'bg-blue-900/30' },
  { view: 'team'       as View, icon: '🖥️', label: 'PC',         color: 'text-emerald-400', active: 'bg-emerald-900/30' },
  { view: 'pokepark'   as View, icon: '🌿', label: 'PokéParc',   color: 'text-green-300',   active: 'bg-green-900/30' },
  { view: 'throne'     as View, icon: '👑', label: 'Trône',      color: 'text-yellow-400',  active: 'bg-yellow-900/30' },
];

const MENU_ITEMS = [
  { view: 'shop'    as View, icon: '🏪', label: 'Boutique',   color: '#34d399' },
  { view: 'profile' as View, icon: '👤', label: 'Mon profil', color: '#60a5fa' },
];

type NavMood = 'happy' | 'sleep' | 'attack' | 'dance' | 'excited';

const TYPE_ATTACK_EMOJI: Record<string, string> = {
  fire: '🔥', water: '💧', grass: '🌿', electric: '⚡', ice: '❄️',
  fighting: '👊', poison: '☠️', ground: '🌍', flying: '🌪️', psychic: '🔮',
  bug: '🐛', rock: '🪨', ghost: '👻', dragon: '🐉', normal: '⭐',
};

interface FloatingHeart { id: number; x: number }
interface AttackEmoji { id: number; emoji: string }

const NAV_ORBIT_STARS: { color: string; dur: string; delay: string; sym: string; size: number; anim: string; layer: 'front' | 'back' }[] = [
  { color: '#fde047', dur: '3.2s', delay: '0s',    sym: '✦', size: 9,  anim: 'park-persp-a', layer: 'front' },
  { color: '#f472b6', dur: '2.6s', delay: '-0.9s', sym: '★', size: 8,  anim: 'park-persp-b', layer: 'back'  },
  { color: '#60a5fa', dur: '4.0s', delay: '-1.7s', sym: '✦', size: 9,  anim: 'park-persp-c', layer: 'front' },
  { color: '#fbbf24', dur: '2.2s', delay: '-0.4s', sym: '✧', size: 7,  anim: 'park-persp-d', layer: 'back'  },
  { color: '#ffffff', dur: '3.6s', delay: '-2.1s', sym: '★', size: 8,  anim: 'park-persp-e', layer: 'front' },
  { color: '#4ade80', dur: '2.9s', delay: '-1.3s', sym: '✦', size: 9,  anim: 'park-persp-a', layer: 'back'  },
];


function FavoritePokemon({ pokemonId, isShiny }: { pokemonId: number; isShiny?: boolean }) {
  const [posX, setPosX] = useState(50);
  const [mood, setMood] = useState<NavMood>('happy');
  const [facingRight, setFacingRight] = useState(true);
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);
  const [attacks, setAttacks] = useState<AttackEmoji[]>([]);
  const lastTapRef = useRef<number>(0);
  const heartCounterRef = useRef(0);
  const attackCounterRef = useRef(0);
  const mountedRef = useRef(true);
  const heartTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      heartTimersRef.current.forEach(clearTimeout);
      heartTimersRef.current = [];
    };
  }, []);

  const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${isShiny ? 'shiny/' : ''}${pokemonId}.png`;

  // Move every 6s (slower)
  useEffect(() => {
    const id = setInterval(() => {
      setPosX(prev => {
        const next = 8 + Math.random() * 82;
        setFacingRight(next > prev);
        return next;
      });
    }, 6000);
    return () => clearInterval(id);
  }, []);

  // Change mood every 25-45s
  useEffect(() => {
    const schedule = (): ReturnType<typeof setTimeout> => {
      const delay = 25000 + Math.random() * 20000;
      return setTimeout(() => {
        const moods: NavMood[] = ['happy', 'happy', 'sleep', 'attack', 'dance', 'excited'];
        setMood(moods[Math.floor(Math.random() * moods.length)]);
        timeoutRef.current = schedule();
      }, delay);
    };
    const timeoutRef = { current: schedule() };
    return () => clearTimeout(timeoutRef.current);
  }, []);

  // Attack emojis when in attack mood
  useEffect(() => {
    if (mood !== 'attack') return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const id = setInterval(() => {
      if (!mountedRef.current) return;
      const types = POKEMON_TYPE[pokemonId] ?? ['normal'];
      const type = types[Math.floor(Math.random() * types.length)];
      const emoji = TYPE_ATTACK_EMOJI[type] ?? '⭐';
      const newId = attackCounterRef.current++;
      setAttacks(prev => [...prev, { id: newId, emoji }]);
      const t = setTimeout(() => { if (mountedRef.current) setAttacks(prev => prev.filter(a => a.id !== newId)); }, 1000);
      timers.push(t);
    }, 2000);
    return () => { clearInterval(id); timers.forEach(clearTimeout); };
  }, [mood, pokemonId]);

  const handleClick = useCallback(() => {
    if (!mountedRef.current) return;
    lastTapRef.current = Date.now();
    const newHearts: FloatingHeart[] = Array.from({ length: 4 }, (_, i) => ({
      id: heartCounterRef.current++,
      x: (i % 2 === 0 ? -1 : 1) * (10 + Math.random() * 20),
    }));
    setHearts(prev => [...prev, ...newHearts]);
    const t = setTimeout(() => {
      if (mountedRef.current) setHearts(prev => prev.filter(h => !newHearts.some(nh => nh.id === h.id)));
    }, 1400);
    heartTimersRef.current.push(t);
    playPokemonCry(pokemonId);
  }, [pokemonId]);

  const MOOD_ANIM: Record<NavMood, string> = {
    happy:   'bounce-pokemon 1.8s ease-in-out infinite',
    excited: 'bounce-pokemon 0.6s ease-in-out infinite',
    dance:   'sway 1.0s ease-in-out infinite',
    attack:  'wiggle 0.4s ease-in-out infinite',
    sleep:   'none',
  };

  const MOOD_BADGE: Record<NavMood, string | null> = {
    happy:   null,
    excited: '✨',
    dance:   '🎵',
    attack:  null,
    sleep:   '💤',
  };

  const badge = MOOD_BADGE[mood];
  const spriteAnim = MOOD_ANIM[mood];
  // Gen1 sprites face LEFT by default → scaleX(-1) to face right
  const flipTransform = facingRight ? 'scaleX(-1)' : 'scaleX(1)';

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 'calc(68px + env(safe-area-inset-bottom, 0px))',
        left: `${posX}%`,
        transform: 'translateX(-50%)',
        transition: 'left 3s ease-in-out',
        zIndex: 10,
        cursor: 'pointer',
        userSelect: 'none',
        touchAction: 'manipulation',
      }}
      onClick={handleClick}
    >
      {/* Floating hearts */}
      {hearts.map(h => (
        <div key={h.id} style={{
          position: 'absolute',
          bottom: 54,
          left: `calc(50% + ${h.x}px)`,
          transform: 'translateX(-50%)',
          fontSize: 14,
          animation: 'float-heart 1.4s ease-out forwards',
          pointerEvents: 'none',
        }}>❤️</div>
      ))}

      {/* Attack emojis */}
      {attacks.map(a => (
        <div key={a.id} style={{
          position: 'absolute',
          bottom: 20,
          left: facingRight ? '100%' : '-10%',
          fontSize: 32,
          animation: `nav-attack-${facingRight ? 'r' : 'l'} 1.2s ease-out forwards`,
          pointerEvents: 'none',
          filter: 'drop-shadow(0 0 6px currentColor)',
        }}>{a.emoji}</div>
      ))}

      {/* Mood badge */}
      {badge && (
        <div style={{
          position: 'absolute',
          bottom: 52,
          left: '60%',
          fontSize: 13,
          animation: 'zzz-float 2s ease-in-out infinite',
          pointerEvents: 'none',
        }}>{badge}</div>
      )}

      {/* Flip wrapper — direction; inner img handles bounce/wiggle animation */}
      <div style={{ transform: flipTransform, transition: 'transform 0.3s ease', display: 'inline-block', position: 'relative', width: 52, height: 52 }}>
        {isShiny && NAV_ORBIT_STARS.map((star, i) => (
          <div key={i} style={{
            position: 'absolute', left: 26, top: 26, width: 0, height: 0,
            zIndex: star.layer === 'front' ? 5 : 0,
            animation: `${star.anim} ${star.dur} ${star.delay} linear infinite`,
            pointerEvents: 'none',
          } as React.CSSProperties}>
            <span style={{
              position: 'absolute', transform: 'translate(-50%,-50%)',
              color: star.color, fontSize: star.size, fontWeight: 900,
              textShadow: `0 0 5px ${star.color}, 0 0 10px ${star.color}88`,
              lineHeight: 1, userSelect: 'none',
            }}>{star.sym}</span>
          </div>
        ))}
        <img
          src={spriteUrl}
          width={52}
          height={52}
          style={{
            imageRendering: 'pixelated',
            animation: spriteAnim,
            display: 'block',
            filter: isShiny ? 'drop-shadow(0 0 4px #fde047)' : 'drop-shadow(0 0 3px rgba(255,255,255,0.3))',
          }}
          draggable={false}
          alt=""
        />
      </div>
    </div>
  );
}

export function BottomNav({ currentView, onNavigate, favoritePokemon, onShowPlayers }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  const inMenu = MENU_ITEMS.some(i => i.view === currentView);
  const hideCompanion = currentView === 'pokepark';

  const handleNavigate = (view: View) => {
    playSfxConfirm();
    setMenuOpen(false);
    onNavigate(view);
  };

  return (
    <>

      {/* Overflow menu sheet with slide-up animation */}
      <div
        className="fixed inset-0 z-[490]"
        style={{ pointerEvents: menuOpen ? 'auto' : 'none' }}
        onClick={() => setMenuOpen(false)}
      >
        <div
          className="absolute left-0 right-0 bg-black/95 border-t border-slate-700/60 backdrop-blur-sm px-4 py-3"
          style={{
            bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
            transform: menuOpen ? 'translateY(0)' : 'translateY(100%)',
            opacity: menuOpen ? 1 : 0,
            transition: 'transform 0.28s cubic-bezier(0.32,0.72,0,1), opacity 0.2s ease',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div className="grid grid-cols-3 gap-2">
            {MENU_ITEMS.map(item => (
              <button
                key={item.view}
                onClick={() => !('soon' in item && item.soon) && handleNavigate(item.view)}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all relative ${
                  'soon' in item && item.soon ? 'opacity-40 cursor-default' :
                  currentView === item.view ? 'bg-white/10 ring-1 ring-white/20' : 'bg-white/5 active:bg-white/10'
                }`}
              >
                <span className="text-2xl leading-none">{item.icon}</span>
                <span className="text-xs font-bold" style={{ color: item.color }}>{item.label}</span>
              </button>
            ))}
            {onShowPlayers && (
              <button
                onClick={() => { setMenuOpen(false); onShowPlayers(); }}
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all bg-white/5 active:bg-white/10"
              >
                <span className="text-2xl leading-none">👥</span>
                <span className="text-xs font-bold" style={{ color: '#34d399' }}>Joueurs</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main nav bar */}
      <div className="fixed bottom-0 left-0 right-0 z-[500] pointer-events-none">
        {/* Favorite pokemon wandering above the nav */}
        {favoritePokemon && !hideCompanion && (
          <FavoritePokemon
            pokemonId={favoritePokemon.pokemonId}
            isShiny={favoritePokemon.isShiny}
          />
        )}

        <div
          className="flex items-center justify-around backdrop-blur-sm px-1 pointer-events-auto"
          style={{
            height: BOTTOM_NAV_HEIGHT,
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
              className={`relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${item.color} hover:bg-white/5`}
            >
              <span className="text-2xl leading-none">{item.icon}</span>
              <span className="text-[0.6rem] font-bold leading-none">{item.label}</span>
              {currentView === item.view && (
                <span className="absolute" style={{
                  bottom: 2, left: '50%', transform: 'translateX(-50%)',
                  width: 4, height: 4, borderRadius: '50%', background: 'white', opacity: 0.9,
                }} />
              )}
            </button>
          ))}

          {/* Menu "···" button */}
          <button
            onClick={() => setMenuOpen(o => !o)}
            className={`relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${
              menuOpen || inMenu ? 'text-white' : 'text-slate-400 hover:bg-white/5'
            }`}
          >
            <span className="text-2xl leading-none font-black tracking-widest" style={{
              transform: menuOpen ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.25s ease',
              display: 'inline-block',
            }}>···</span>
            <span className="text-[0.6rem] font-bold leading-none">Menu</span>
            {inMenu && (
              <span className="absolute" style={{
                bottom: 2, left: '50%', transform: 'translateX(-50%)',
                width: 4, height: 4, borderRadius: '50%', background: 'white', opacity: 0.9,
              }} />
            )}
          </button>
        </div>
        {/* Extend background color into home-bar safe area */}
        <div className="pointer-events-auto" style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          background: 'rgba(0,0,0,0.97)',
        }} />
      </div>

      <style>{`
        @keyframes float-heart {
          0%   { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-50px); }
        }
        @keyframes nav-attack-r {
          0%   { opacity: 1; transform: translate(0, 0) scale(1.4); }
          60%  { opacity: 1; transform: translate(55px, -25px) scale(1.1); }
          100% { opacity: 0; transform: translate(90px, -35px) scale(0.5); }
        }
        @keyframes nav-attack-l {
          0%   { opacity: 1; transform: translate(0, 0) scale(1.4); }
          60%  { opacity: 1; transform: translate(-55px, -25px) scale(1.1); }
          100% { opacity: 0; transform: translate(-90px, -35px) scale(0.5); }
        }
      `}</style>
    </>
  );
}

