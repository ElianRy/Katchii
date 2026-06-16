import React, { useState, useEffect, useRef } from 'react';
import { GameState, RARITY_COLORS, RARITY_LABELS, Rarity } from '../types';
import { POKEMON_BY_ID } from '../data/gen1';

interface Props {
  state: GameState;
  onClose: () => void;
}

function formatPlayTime(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  if (h === 0) return `${min}min`;
  return `${h}h ${min}min`;
}

function getRarestPokemon(state: GameState): Array<{ id: number; rarity: string }> {
  const rarityOrder = ['legendaire', 'elite', 'rare', 'peu_commun', 'commun'];
  const results: Array<{ id: number; rarity: string }> = [];
  for (const rarity of rarityOrder) {
    const found = Object.entries(state.normalCollection)
      .filter(([, count]) => count > 0)
      .filter(([id]) => POKEMON_BY_ID[Number(id)]?.rarity === rarity)
      .map(([id]) => ({ id: Number(id), rarity }));
    results.push(...found);
    if (results.length >= 3) break;
  }
  return results.slice(0, 3);
}

function getArenaBadgeCount(state: GameState): number {
  const defeated = state.zoneProgress?.bossDefeated ?? {};
  return Object.values(defeated).filter(Boolean).length;
}

interface SlideProps { state: GameState; username: string; }

const SLIDES: Array<{
  gradient: string;
  render: (props: SlideProps) => React.ReactNode;
}> = [
  {
    gradient: 'from-indigo-900 via-purple-900 to-slate-900',
    render: ({ username }) => (
      <div className="flex flex-col items-center gap-6">
        <div className="text-6xl">🎮</div>
        <div className="text-3xl font-black text-white text-center leading-tight">
          Récap<br />
          <span style={{ background: 'linear-gradient(90deg,#a78bfa,#60a5fa)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
            {username}
          </span>
        </div>
        <div className="text-white/60 text-base">Ton aventure en chiffres</div>
      </div>
    ),
  },
  {
    gradient: 'from-amber-900 via-yellow-900 to-orange-900',
    render: ({ state }) => (
      <div className="flex flex-col items-center gap-5">
        <div className="text-5xl">🪙</div>
        <div className="text-white/80 font-bold text-xl">PokéCoins accumulés</div>
        <div className="text-7xl font-black text-yellow-300">{state.points.toLocaleString()}</div>
        <div className="text-white/60 text-sm">pièces dans ta poche</div>
      </div>
    ),
  },
  {
    gradient: 'from-blue-900 via-cyan-900 to-teal-900',
    render: ({ state }) => {
      const caught = Object.values(state.normalCollection).filter(v => v > 0).length;
      const pct = Math.round((caught / 151) * 100);
      return (
        <div className="flex flex-col items-center gap-5 w-full max-w-xs">
          <div className="text-5xl">📚</div>
          <div className="text-white/80 font-bold text-xl">Pokédex</div>
          <div className="text-7xl font-black text-blue-300">{caught}<span className="text-3xl text-white/40">/151</span></div>
          <div className="w-full bg-white/10 rounded-full h-4 overflow-hidden">
            <div className="h-4 rounded-full transition-all"
              style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#38bdf8,#818cf8)' }} />
          </div>
          <div className="text-white/60 text-sm">{pct}% complété</div>
        </div>
      );
    },
  },
  {
    gradient: 'from-red-900 via-orange-900 to-yellow-900',
    render: ({ state }) => {
      const rarest = getRarestPokemon(state);
      return (
        <div className="flex flex-col items-center gap-4 w-full">
          <div className="text-white/80 font-bold text-xl">Pokémon les plus rares</div>
          {rarest.length === 0 ? (
            <div className="text-white/40 text-lg mt-4">Aucune capture encore !</div>
          ) : (
            <div className="flex gap-4 justify-center flex-wrap mt-2">
              {rarest.map(({ id, rarity }) => {
                const p = POKEMON_BY_ID[id];
                return (
                  <div key={id} className="flex flex-col items-center gap-2">
                    <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`}
                      alt={p?.name} width={80} height={80}
                      style={{ imageRendering: 'pixelated', filter: `drop-shadow(0 0 10px ${RARITY_COLORS[rarity as Rarity]})` }} />
                    <div className="font-black text-white text-sm">{p?.name}</div>
                    <div className="px-2 py-0.5 rounded-full text-xs font-bold text-black"
                      style={{ background: RARITY_COLORS[rarity as Rarity] }}>{RARITY_LABELS[rarity as Rarity]}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    },
  },
  {
    gradient: 'from-pink-900 via-fuchsia-900 to-purple-900',
    render: ({ state }) => {
      const shinyIds = Object.entries(state.shinyCollection)
        .filter(([, c]) => c > 0).map(([id]) => Number(id));
      return (
        <div className="flex flex-col items-center gap-5 w-full">
          <div className="text-5xl" style={{ animation: 'spin 3s linear infinite' }}>✨</div>
          <div className="text-white/80 font-bold text-xl">Shinies capturés</div>
          <div className="text-7xl font-black text-yellow-300">{shinyIds.length}</div>
          {shinyIds.length > 0 && (
            <div className="flex gap-2 flex-wrap justify-center">
              {shinyIds.slice(0, 8).map(id => (
                <img key={id}
                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${id}.png`}
                  width={44} height={44} alt=""
                  style={{ imageRendering: 'pixelated', filter: 'drop-shadow(0 0 6px #fde047)' }} />
              ))}
            </div>
          )}
          {shinyIds.length === 0 && <div className="text-white/40">Continue à chasser !</div>}
        </div>
      );
    },
  },
  {
    gradient: 'from-emerald-900 via-teal-900 to-cyan-900',
    render: ({ state }) => {
      const count = getArenaBadgeCount(state);
      return (
        <div className="flex flex-col items-center gap-5">
          <div className="text-5xl">🏅</div>
          <div className="text-white/80 font-bold text-xl">Badges d'arène</div>
          <div className="text-7xl font-black text-emerald-300">{count}</div>
          <div className="text-white/60 text-base">maîtres d'arène vaincus</div>
          {count >= 7 && <div className="text-yellow-300 font-bold text-lg">🏆 Presque champion !</div>}
          {count === 8 && <div className="text-yellow-300 font-bold text-lg">👑 Champion !</div>}
        </div>
      );
    },
  },
  {
    gradient: 'from-slate-900 via-indigo-950 to-violet-950',
    render: ({ state }) => {
      const ms = state.stats?.totalPlayTimeMs ?? 0;
      return (
        <div className="flex flex-col items-center gap-5">
          <div className="text-5xl">⏰</div>
          <div className="text-white/80 font-bold text-xl">Temps de jeu total</div>
          <div className="text-5xl font-black text-indigo-300">{formatPlayTime(ms)}</div>
          <div className="text-white/50 text-sm">passées à attraper des Pokémon</div>
        </div>
      );
    },
  },
  {
    gradient: 'from-purple-900 via-violet-900 to-indigo-900',
    render: () => (
      <div className="flex flex-col items-center gap-6">
        <div className="text-6xl">🔥</div>
        <div className="text-3xl font-black text-white text-center">Continue comme ça !</div>
        <div className="text-white/70 text-base text-center max-w-xs">
          L'aventure continue. De nouvelles captures t'attendent !
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
  const [fading, setFading] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const username = (state as unknown as Record<string, unknown>).username as string ?? 'Dresseur';

  const goTo = (idx: number) => {
    if (fading || idx < 0 || idx >= SLIDES.length) return;
    setFading(true);
    setTimeout(() => { setSlide(idx); setFading(false); }, 200);
  };

  // Auto-advance every 6s
  useEffect(() => {
    const t = setInterval(() => {
      setSlide(prev => prev < SLIDES.length - 1 ? prev + 1 : prev);
    }, 6000);
    return () => clearInterval(t);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 50) return;
    if (dx < 0) goTo(slide + 1);
    else goTo(slide - 1);
  };

  const current = SLIDES[slide];

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col bg-gradient-to-br ${current.gradient} transition-colors duration-500`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={() => { if (slide < SLIDES.length - 1) goTo(slide + 1); }}
    >
      {/* Close */}
      <div className="absolute top-4 left-4 z-10">
        <button
          onClick={e => { e.stopPropagation(); onClose(); }}
          className="bg-white/20 hover:bg-white/30 rounded-full w-9 h-9 flex items-center justify-center font-bold text-white text-xl"
        >✕</button>
      </div>

      {/* Back arrow (when not on first slide) */}
      {slide > 0 && (
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={e => { e.stopPropagation(); goTo(slide - 1); }}
            className="bg-white/20 hover:bg-white/30 rounded-full w-9 h-9 flex items-center justify-center font-bold text-white text-xl"
          >→</button>
        </div>
      )}

      {/* Slide content */}
      <div
        className="flex-1 flex flex-col items-center justify-center p-8 text-center"
        style={{ opacity: fading ? 0 : 1, transition: 'opacity 0.2s' }}
      >
        {current.render({ state, username })}
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 pb-8" onClick={e => e.stopPropagation()}>
        {SLIDES.map((_, i) => (
          <button key={i} onClick={() => goTo(i)}
            className="rounded-full transition-all"
            style={{ width: i === slide ? 24 : 8, height: 8, background: i === slide ? 'white' : 'rgba(255,255,255,0.3)' }}
          />
        ))}
      </div>

      {slide < SLIDES.length - 1 && (
        <div className="absolute bottom-16 left-0 right-0 text-center text-white/30 text-xs pointer-events-none">
          Appuie ou glisse pour continuer
        </div>
      )}
    </div>
  );
}
