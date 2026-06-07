import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View } from '../types';
import { POKEMON_TYPE } from '../data/pokemonTypes';

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
  { view: 'collection' as View, icon: '📚', label: 'Collection', color: 'text-blue-400',    active: 'bg-blue-900/30' },
  { view: 'team'       as View, icon: '⚔️', label: 'Équipe',     color: 'text-emerald-400', active: 'bg-emerald-900/30' },
  { view: 'pokepark'   as View, icon: '🌿', label: 'PokéParc',   color: 'text-green-300',   active: 'bg-green-900/30' },
];

const MENU_ITEMS = [
  { view: 'lures'   as View, icon: '🎣', label: 'Leurres',    color: '#c084fc' },
  { view: 'duels'   as View, icon: '🥊', label: 'Duels',      color: '#f87171' },
  { view: 'raid'    as View, icon: '🐉', label: 'Raid',       color: '#f87171' },
  { view: 'clan'    as View, icon: '🛡️', label: 'Clan',       color: '#fbbf24' },
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

const ORBIT_COLORS_A = ['#fde047', '#f472b6', '#60a5fa', '#4ade80', '#fb923c', '#c084fc'];
const ORBIT_COLORS_B = ['#f0abfc', '#fbbf24', '#a5f3fc', '#fde047', '#86efac', '#f472b6'];

function NavShinySparkles({ spriteSize = 52 }: { spriteSize?: number }) {
  const cx = spriteSize / 2;
  const cy = spriteSize / 2;

  // Inner orbit: 6 stars close to sprite, fast
  const innerR = 18;
  const innerStars = useMemo(() => [0,1,2,3,4,5].map(i => ({
    id: i,
    color: ORBIT_COLORS_A[i],
    delay: `${-(i / 6 * 1.8).toFixed(2)}s`,
  })), []);

  // Outer orbit: 4 larger stars, slower, opposite direction
  const outerR = 30;
  const outerStars = useMemo(() => [0,1,2,3].map(i => ({
    id: i,
    color: ORBIT_COLORS_B[i],
    delay: `${-(i / 4 * 3.0).toFixed(2)}s`,
  })), []);

  // Scattered random twinkling stars at fixed positions (deterministic)
  const twinkleStars = useMemo(() => [
    { x: cx - 22, y: cy - 18, color: '#fde047', dur: '1.1s', delay: '0s' },
    { x: cx + 20, y: cy - 20, color: '#f472b6', dur: '1.4s', delay: '0.3s' },
    { x: cx + 24, y: cy + 10, color: '#60a5fa', dur: '0.9s', delay: '0.6s' },
    { x: cx - 20, y: cy + 16, color: '#4ade80', dur: '1.2s', delay: '0.9s' },
    { x: cx - 8,  y: cy - 28, color: '#c084fc', dur: '1.5s', delay: '0.4s' },
    { x: cx + 10, y: cy - 26, color: '#fbbf24', dur: '1.0s', delay: '1.1s' },
    { x: cx + 28, y: cy - 4,  color: '#a5f3fc', dur: '1.3s', delay: '0.7s' },
    { x: cx - 26, y: cy - 2,  color: '#fb923c', dur: '0.8s', delay: '1.4s' },
  ], [cx, cy]);

  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: spriteSize, height: spriteSize, pointerEvents: 'none', overflow: 'visible' }}>
      {/* Rainbow shimmer underneath */}
      <div style={{
        position: 'absolute',
        left: cx - 30, top: cy - 30,
        width: 60, height: 60,
        borderRadius: '50%',
        background: 'conic-gradient(from 0deg, #fde04788, #f472b688, #60a5fa88, #4ade8088, #c084fc88, #fbbf2488, #fde04788)',
        animation: 'shiny-orbit 3s linear infinite',
        opacity: 0.22,
        filter: 'blur(4px)',
      }} />

      {/* Inner fast orbit — 6 stars */}
      {innerStars.map(sp => (
        <div key={`in${sp.id}`} style={{
          position: 'absolute',
          left: cx - innerR, top: cy - innerR,
          width: innerR * 2, height: innerR * 2,
          animation: 'shiny-orbit 1.8s linear infinite',
          animationDelay: sp.delay,
          pointerEvents: 'none',
        }}>
          <div className="shiny-sparkle" style={{
            position: 'absolute', width: 10, height: 10,
            left: innerR - 5, top: -5,
            '--sp-color': sp.color,
            '--sp-duration': '0.7s',
            '--sp-delay': sp.delay,
          } as React.CSSProperties} />
        </div>
      ))}

      {/* Outer slower orbit — 4 bigger stars, reverse */}
      {outerStars.map(sp => (
        <div key={`out${sp.id}`} style={{
          position: 'absolute',
          left: cx - outerR, top: cy - outerR,
          width: outerR * 2, height: outerR * 2,
          animation: 'shiny-orbit-rev 3s linear infinite',
          animationDelay: sp.delay,
          pointerEvents: 'none',
        }}>
          <div className="shiny-sparkle" style={{
            position: 'absolute', width: 14, height: 14,
            left: outerR - 7, top: -7,
            '--sp-color': sp.color,
            '--sp-duration': '1.1s',
            '--sp-delay': sp.delay,
          } as React.CSSProperties} />
        </div>
      ))}

      {/* Scattered twinkling at various positions */}
      {twinkleStars.map((sp, i) => (
        <div key={`tw${i}`} className="shiny-sparkle" style={{
          position: 'absolute',
          width: 8, height: 8,
          left: sp.x - 4, top: sp.y - 4,
          '--sp-color': sp.color,
          '--sp-duration': sp.dur,
          '--sp-delay': sp.delay,
        } as React.CSSProperties} />
      ))}
    </div>
  );
}

function FavoritePokemon({ pokemonId, isShiny }: { pokemonId: number; isShiny?: boolean }) {
  const [posX, setPosX] = useState(50);
  const [mood, setMood] = useState<NavMood>('happy');
  const [facingRight, setFacingRight] = useState(true);
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);
  const [attacks, setAttacks] = useState<AttackEmoji[]>([]);
  const lastTapRef = useRef<number>(0);
  const heartCounterRef = useRef(0);
  const attackCounterRef = useRef(0);

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
    const id = setInterval(() => {
      const types = POKEMON_TYPE[pokemonId] ?? ['normal'];
      const type = types[Math.floor(Math.random() * types.length)];
      const emoji = TYPE_ATTACK_EMOJI[type] ?? '⭐';
      const newId = attackCounterRef.current++;
      setAttacks(prev => [...prev, { id: newId, emoji }]);
      setTimeout(() => setAttacks(prev => prev.filter(a => a.id !== newId)), 1000);
    }, 2000);
    return () => clearInterval(id);
  }, [mood, pokemonId]);

  const handleClick = useCallback(() => {
    const now = Date.now();
    const delta = now - lastTapRef.current;
    lastTapRef.current = now;
    if (delta < 500) {
      const newHearts: FloatingHeart[] = Array.from({ length: 5 }, () => ({
        id: heartCounterRef.current++,
        x: (Math.random() - 0.5) * 40,
      }));
      setHearts(prev => [...prev, ...newHearts]);
      setTimeout(() => {
        setHearts(prev => prev.filter(h => !newHearts.some(nh => nh.id === h.id)));
      }, 1400);
    }
  }, []);

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
        bottom: 68,
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
        {isShiny && <NavShinySparkles spriteSize={52} />}
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

export function BottomNav({ currentView, onNavigate, questsCompleted, favoritePokemon, onOpenQuests, onShowPlayers }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  const inMenu = MENU_ITEMS.some(i => i.view === currentView);
  const hideCompanion = currentView === 'pokepark';

  const handleNavigate = (view: View) => {
    setMenuOpen(false);
    onNavigate(view);
  };

  return (
    <>

      {/* Overflow menu sheet with slide-up animation */}
      <div
        className="fixed inset-0 z-[190]"
        style={{ pointerEvents: menuOpen ? 'auto' : 'none' }}
        onClick={() => setMenuOpen(false)}
      >
        <div
          className="absolute bottom-[72px] left-0 right-0 bg-black/95 border-t border-slate-700/60 backdrop-blur-sm px-4 py-3"
          style={{
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
                onClick={() => handleNavigate(item.view)}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all ${
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
      <div className="fixed bottom-0 left-0 right-0 z-[200] pointer-events-none" style={{ height: BOTTOM_NAV_HEIGHT }}>
        {/* Favorite pokemon wandering above the nav */}
        {favoritePokemon && !hideCompanion && (
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

          {/* Quêtes button — same style as Menu */}
          {onOpenQuests && (
            <button
              onClick={onOpenQuests}
              className={`relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${
                currentView === 'quests' ? 'text-yellow-400' : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              <span className="text-2xl leading-none">📋</span>
              <span className="text-[0.6rem] font-bold leading-none">Quêtes{questsCompleted > 0 ? ` (${questsCompleted})` : ''}</span>
              {currentView === 'quests' && (
                <span className="absolute" style={{ bottom: 2, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%', background: '#fbbf24', opacity: 0.9 }} />
              )}
              {questsCompleted > 0 && currentView !== 'quests' && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-yellow-500" />
              )}
            </button>
          )}

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

