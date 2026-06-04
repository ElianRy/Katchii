import { useState, useEffect } from 'react';
import { GameState, RARITY_COLORS, RARITY_LABELS } from '../types';
import { POKEMON_BY_ID } from '../data/gen1';
import { BADGE_BY_ID } from '../data/badges';

interface Props {
  state: GameState;
  onClose: () => void;
}

interface Slide {
  id: number;
  gradient: string;
  render: (state: GameState) => React.ReactNode;
}

function BigNumber({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-6xl font-black text-white">{value}</div>
      <div className="text-lg text-white/80 font-semibold">{label}</div>
    </div>
  );
}

function getRarestCaught(state: GameState): { id: number; rarity: string } | null {
  const rarityOrder = ['legendaire', 'elite', 'rare', 'peu_commun', 'commun'];
  for (const rarity of rarityOrder) {
    const found = Object.entries(state.normalCollection)
      .filter(([, count]) => count > 0)
      .find(([id]) => POKEMON_BY_ID[Number(id)]?.rarity === rarity);
    if (found) return { id: Number(found[0]), rarity };
  }
  return null;
}

const SLIDES: Slide[] = [
  {
    id: 1,
    gradient: 'from-indigo-900 via-purple-900 to-slate-900',
    render: (state) => (
      <div className="flex flex-col items-center gap-6">
        <div className="text-5xl">🎮</div>
        <div className="text-3xl font-black text-white text-center">
          Ton Année {new Date().getFullYear()} en Review
        </div>
        <BigNumber value={state.points.toLocaleString()} label="points gagnés" />
      </div>
    ),
  },
  {
    id: 2,
    gradient: 'from-yellow-900 via-orange-900 to-red-900',
    render: (state) => {
      const rarest = getRarestCaught(state);
      const pokemon = rarest ? POKEMON_BY_ID[rarest.id] : null;
      return (
        <div className="flex flex-col items-center gap-4">
          <div className="text-2xl font-bold text-white/80">Pokémon le plus rare capturé</div>
          {pokemon ? (
            <>
              <img
                src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${rarest!.id}.png`}
                alt={pokemon.name}
                width={96}
                height={96}
                style={{ imageRendering: 'pixelated' }}
              />
              <div className="text-3xl font-black text-white">{pokemon.name}</div>
              <div
                className="px-4 py-1 rounded-full font-bold text-black text-sm"
                style={{ background: RARITY_COLORS[pokemon.rarity] }}
              >
                {RARITY_LABELS[pokemon.rarity]}
              </div>
            </>
          ) : (
            <div className="text-white/60 text-lg">Aucune capture encore !</div>
          )}
        </div>
      );
    },
  },
  {
    id: 3,
    gradient: 'from-pink-900 via-fuchsia-900 to-purple-900',
    render: (state) => {
      const shinyCount = Object.values(state.shinyCollection).filter((v) => v > 0).length;
      return (
        <div className="flex flex-col items-center gap-5">
          <div className="text-5xl animate-spin" style={{ animationDuration: '3s' }}>✨</div>
          <div className="text-2xl font-bold text-white/80">Shinies capturés</div>
          <BigNumber value={shinyCount} label="créatures brillantes" />
          {shinyCount >= 5 && (
            <div className="text-yellow-300 font-bold text-lg">Incroyable chasseur !</div>
          )}
        </div>
      );
    },
  },
  {
    id: 4,
    gradient: 'from-red-900 via-rose-900 to-orange-900',
    render: (state) => (
      <div className="flex flex-col items-center gap-5">
        <div className="text-5xl">⚔️</div>
        <div className="text-2xl font-bold text-white/80">Duels</div>
        <div className="flex gap-10">
          <div className="flex flex-col items-center gap-1">
            <div className="text-5xl font-black text-green-400">{state.duels.wins}</div>
            <div className="text-white/70 font-semibold">Victoires</div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="text-5xl font-black text-red-400">{state.duels.losses}</div>
            <div className="text-white/70 font-semibold">Défaites</div>
          </div>
        </div>
        <div className="text-lg text-yellow-400 font-bold">
          {state.duels.rankingPoints} pts de classement
        </div>
      </div>
    ),
  },
  {
    id: 5,
    gradient: 'from-emerald-900 via-teal-900 to-cyan-900',
    render: (state) => {
      const earnedBadges = state.badges
        .map((id) => BADGE_BY_ID[id])
        .filter(Boolean);
      return (
        <div className="flex flex-col items-center gap-4">
          <div className="text-5xl">🏆</div>
          <div className="text-2xl font-bold text-white/80">Badges débloqués</div>
          <BigNumber value={earnedBadges.length} label="badges obtenus" />
          <div className="flex flex-wrap justify-center gap-2 max-w-xs">
            {earnedBadges.slice(0, 12).map((b) => (
              <span key={b.id} title={b.label} className="text-2xl">
                {b.icon}
              </span>
            ))}
          </div>
        </div>
      );
    },
  },
  {
    id: 6,
    gradient: 'from-blue-900 via-violet-900 to-indigo-900',
    render: (state) => (
      <div className="flex flex-col items-center gap-5">
        <div className="text-5xl">🔥</div>
        <div className="text-2xl font-bold text-white/80">Meilleure streak de victoires</div>
        <BigNumber value={state.duels.streak} label="victoires consécutives" />
        {state.duels.streak >= 5 && (
          <div className="text-orange-400 font-bold text-lg">🏆 Inarrêtable !</div>
        )}
      </div>
    ),
  },
  {
    id: 7,
    gradient: 'from-slate-900 via-purple-950 to-indigo-950',
    render: () => (
      <div className="flex flex-col items-center gap-6">
        <div className="text-6xl">🔥</div>
        <div className="text-3xl font-black text-white text-center">
          Continue comme ça !
        </div>
        <div className="text-white/70 text-lg text-center max-w-xs">
          Une nouvelle année d'aventures t'attend. À toi de jouer !
        </div>
        <div className="flex gap-3 text-3xl">
          <span>⚡</span><span>✨</span><span>🏆</span><span>⚔️</span>
        </div>
      </div>
    ),
  },
];

export function WrappedPanel({ state, onClose }: Props) {
  const [slide, setSlide] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  const goTo = (idx: number) => {
    if (transitioning) return;
    setTransitioning(true);
    setTimeout(() => {
      setSlide(idx);
      setTransitioning(false);
    }, 200);
  };

  // Auto-advance every 3s
  useEffect(() => {
    const t = setInterval(() => {
      setSlide((prev) => {
        if (prev < SLIDES.length - 1) return prev + 1;
        return prev;
      });
    }, 3000);
    return () => clearInterval(t);
  }, []);

  const current = SLIDES[slide];

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col bg-gradient-to-br ${current.gradient} transition-all duration-500`}
      onClick={() => {
        if (slide < SLIDES.length - 1) goTo(slide + 1);
      }}
    >
      {/* Close */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="bg-white/20 hover:bg-white/30 rounded-full w-9 h-9 flex items-center justify-center font-bold text-white"
        >
          ✕
        </button>
      </div>

      {/* Slide content */}
      <div
        className="flex-1 flex flex-col items-center justify-center p-8 text-center"
        style={{ opacity: transitioning ? 0 : 1, transition: 'opacity 0.2s' }}
      >
        {current.render(state)}
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 pb-8" onClick={(e) => e.stopPropagation()}>
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            onClick={() => goTo(i)}
            className="rounded-full transition-all"
            style={{
              width: i === slide ? 24 : 8,
              height: 8,
              background: i === slide ? 'white' : 'rgba(255,255,255,0.3)',
            }}
          />
        ))}
      </div>

      {/* Tap hint */}
      {slide < SLIDES.length - 1 && (
        <div className="absolute bottom-16 left-0 right-0 text-center text-white/40 text-xs">
          Appuie pour continuer
        </div>
      )}
    </div>
  );
}
