import { useState, useRef, useEffect } from 'react';
import { Rarity, RARITY_COLORS, RARITY_LABELS } from '../types';
import { POKEMON_BY_ID, POKEMON_BY_RARITY } from '../data/gen1';
import { playSfxCapture, playSfxShinyCapture, playSfxQuestComplete } from '../lib/audio';

interface Props {
  onClose: (result: { pokemonId: number; isShiny: boolean; rarity: Rarity } | null) => void;
}

const POOL_RARITIES: Rarity[] = ['commun', 'peu_commun', 'rare', 'elite'];
const POOL_WEIGHTS: Record<Rarity, number> = { commun: 50, peu_commun: 12, rare: 4, elite: 1, legendaire: 0 };

function pickWeighted(): { pokemonId: number; rarity: Rarity } {
  const totalW = POOL_RARITIES.reduce((s, r) => s + POOL_WEIGHTS[r], 0);
  let rand = Math.random() * totalW;
  for (const r of POOL_RARITIES) {
    rand -= POOL_WEIGHTS[r];
    if (rand <= 0) {
      const pool = POKEMON_BY_RARITY[r] ?? [];
      if (pool.length === 0) continue;
      return { pokemonId: pool[Math.floor(Math.random() * pool.length)].id, rarity: r };
    }
  }
  const fb = POKEMON_BY_RARITY['commun']![0];
  return { pokemonId: fb.id, rarity: 'commun' };
}

// Each item is ITEM_W px wide, no margin/gap
const ITEM_W     = 80;
const TOTAL      = 60;   // items in reel
const WIN_IDX    = 50;   // winner at index 50 (0-based)
const VISIBLE    = 5;    // visible items at once
const CONTAINER_W = VISIBLE * ITEM_W; // 400px

// Target translateX so WIN_IDX item is centered in the visible strip
const TARGET_X = -(WIN_IDX * ITEM_W + ITEM_W / 2 - CONTAINER_W / 2);

function buildReel(winner: { pokemonId: number; rarity: Rarity; isShiny: boolean }) {
  return Array.from({ length: TOTAL }, (_, i) =>
    i === WIN_IDX ? winner : { ...pickWeighted(), isShiny: false }
  );
}

const RARITY_BG: Record<Rarity, string> = {
  commun:     '#1e293b',
  peu_commun: '#14532d',
  rare:       '#1e3a5f',
  elite:      '#3b1d5c',
  legendaire: '#7c2d12',
};

type Phase = 'intro' | 'spinning' | 'reveal' | 'done';

export function CaseOpenScreen({ onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [reel, setReel] = useState<Array<{ pokemonId: number; rarity: Rarity; isShiny: boolean }>>([]);
  const [winner, setWinner] = useState<{ pokemonId: number; rarity: Rarity; isShiny: boolean } | null>(null);
  // Two separate states: position (no transition) and animated (with transition)
  const [offset, setOffset] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number }[]>([]);
  const spinningRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Clear timers on unmount
  useEffect(() => () => { timersRef.current.forEach(clearTimeout); }, []);

  function addTimer(fn: () => void, ms: number) {
    const id = setTimeout(fn, ms);
    timersRef.current.push(id);
  }

  function openCase() {
    if (spinningRef.current) return;
    spinningRef.current = true;

    const isShiny = Math.random() < 0.002;
    const base = pickWeighted();
    const win = { ...base, isShiny };

    setWinner(win);
    setReel(buildReel(win));
    setOffset(0);        // snap to start — no transition
    setAnimating(false);
    setPhase('spinning');

    // Wait one frame for React to render the reel at offset=0,
    // then start the transition to TARGET_X
    addTimer(() => {
      setAnimating(true);
      setOffset(TARGET_X);
    }, 80);

    // Reveal winner after spin (4s transition + 0.1s buffer)
    addTimer(() => {
      setAnimating(false); // lock position
      setPhase('reveal');
      if (isShiny) {
        playSfxShinyCapture();
        burst(win.rarity, true);
      } else if (win.rarity === 'elite') {
        playSfxQuestComplete();
        burst(win.rarity, false);
      } else {
        playSfxCapture();
      }
    }, 4200);

    addTimer(() => setPhase('done'), 5200);
  }

  function burst(rarity: Rarity, shiny: boolean) {
    const color = shiny ? '#fde047' : RARITY_COLORS[rarity];
    setParticles(Array.from({ length: 16 }, (_, i) => ({ id: i, x: 20 + Math.random() * 60, y: 20 + Math.random() * 60 })));
    void color; // used in CSS via inline style below
    addTimer(() => setParticles([]), 2000);
  }

  const bossData = winner ? POKEMON_BY_ID[winner.pokemonId] : null;
  const particleColor = winner?.isShiny ? '#fde047' : winner ? RARITY_COLORS[winner.rarity] : '#fff';

  return (
    <div className="fixed inset-0 z-[700] bg-black/95 flex flex-col items-center justify-center"
      style={{ height: '100dvh' }}>

      {/* Particles */}
      {particles.map(p => (
        <div key={p.id} className="absolute pointer-events-none"
          style={{
            left: `${p.x}%`, top: `${p.y}%`,
            width: 8, height: 8, borderRadius: '50%',
            background: particleColor,
            boxShadow: `0 0 8px ${particleColor}`,
            animation: 'kc-particle 1.8s ease-out forwards',
          }} />
      ))}

      {phase === 'intro' && (
        <div className="flex flex-col items-center gap-8 px-8 text-center">
          <div style={{ fontSize: '5rem' }}>🎰</div>
          <div>
            <h2 className="text-white font-black text-2xl mb-2">Capsule Katchii</h2>
            <p className="text-slate-400 text-sm">Un Pokémon aléatoire jusqu'à rareté Épique.</p>
            <p className="text-slate-400 text-sm mt-1">✨ 0,2% de chance d'obtenir un Shiny !</p>
          </div>
          <div className="bg-slate-800/60 rounded-xl border border-slate-700/40 p-4 w-full max-w-xs">
            <div className="text-xs text-slate-400 mb-2 font-bold uppercase tracking-wider">Contenu</div>
            {([['commun', '74.6%'], ['peu_commun', '17.9%'], ['rare', '5.97%'], ['elite', '1.49%']] as [Rarity, string][]).map(([r, pct]) => (
              <div key={r} className="flex justify-between py-1">
                <span className="text-xs font-semibold" style={{ color: RARITY_COLORS[r] }}>{RARITY_LABELS[r]}</span>
                <span className="text-xs text-slate-500">{pct}</span>
              </div>
            ))}
          </div>
          <button onClick={openCase}
            className="w-full max-w-xs py-4 rounded-2xl font-black text-xl transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg,#f59e0b,#ef7c00)', color: '#fff' }}>
            🎰 Ouvrir !
          </button>
          <button onClick={() => onClose(null)} className="text-slate-500 text-sm">Annuler</button>
        </div>
      )}

      {(phase === 'spinning' || phase === 'reveal' || phase === 'done') && (
        <div className="flex flex-col items-center gap-6 w-full px-4">
          <h2 className="text-white font-black text-xl">🎰 Capsule Katchii</h2>

          {/* Reel strip */}
          <div className="relative" style={{ width: CONTAINER_W, overflow: 'hidden' }}>
            {/* Side fade */}
            <div className="absolute inset-0 z-10 pointer-events-none"
              style={{ background: 'linear-gradient(to right,#000 0%,transparent 18%,transparent 82%,#000 100%)' }} />
            {/* Center highlight tick */}
            <div className="absolute inset-y-0 z-20 pointer-events-none"
              style={{
                left: '50%', transform: 'translateX(-50%)',
                width: ITEM_W,
                outline: '2px solid #f59e0b',
                borderRadius: 8,
              }} />

            <div style={{
              display: 'flex',
              width: TOTAL * ITEM_W,
              transform: `translateX(${offset}px)`,
              transition: animating ? 'transform 4s cubic-bezier(0.04, 0.8, 0.1, 1)' : 'none',
              willChange: 'transform',
            }}>
              {reel.map((item, i) => {
                const p = POKEMON_BY_ID[item.pokemonId];
                const isWin = i === WIN_IDX && phase !== 'spinning';
                const color = RARITY_COLORS[item.rarity];
                return (
                  <div key={i} style={{
                    width: ITEM_W, flexShrink: 0,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    padding: '8px 4px', gap: 2,
                    background: isWin
                      ? (item.isShiny ? 'linear-gradient(135deg,#78350f,rgba(253,224,71,0.3))' : RARITY_BG[item.rarity])
                      : RARITY_BG[item.rarity],
                    border: isWin
                      ? `2px solid ${item.isShiny ? '#fde047' : color}`
                      : `1px solid ${color}33`,
                    borderRadius: 8,
                    boxShadow: isWin
                      ? `0 0 24px ${item.isShiny ? '#fde047aa' : color + 'aa'}`
                      : 'none',
                  }}>
                    <img
                      src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${item.isShiny ? 'shiny/' : ''}${item.pokemonId}.png`}
                      width={48} height={48}
                      style={{
                        imageRendering: 'pixelated',
                        filter: item.isShiny ? 'drop-shadow(0 0 6px #fde047)' : undefined,
                      }}
                      draggable={false}
                    />
                    <span style={{
                      fontSize: '0.45rem', color,
                      textAlign: 'center', lineHeight: 1.2,
                    }}>{p?.name ?? '???'}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Result */}
          {(phase === 'reveal' || phase === 'done') && winner && bossData && (
            <div className="flex flex-col items-center gap-4 text-center"
              style={{ animation: 'kc-fadein 0.5s ease' }}>
              <span className="text-xs font-black px-3 py-1 rounded-full"
                style={{
                  color: winner.isShiny ? '#fde047' : RARITY_COLORS[winner.rarity],
                  background: (winner.isShiny ? '#fde047' : RARITY_COLORS[winner.rarity]) + '22',
                  border: `1px solid ${winner.isShiny ? '#fde047' : RARITY_COLORS[winner.rarity]}66`,
                }}>
                {winner.isShiny ? '✨ SHINY !' : RARITY_LABELS[winner.rarity]}
              </span>

              <img
                src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${winner.isShiny ? 'shiny/' : ''}${winner.pokemonId}.png`}
                width={96} height={96}
                style={{
                  imageRendering: 'pixelated',
                  filter: winner.isShiny
                    ? 'drop-shadow(0 0 16px #fde047)'
                    : `drop-shadow(0 0 12px ${RARITY_COLORS[winner.rarity]})`,
                  animation: 'bounce-pokemon 1s ease-in-out infinite',
                }}
              />
              <div className="text-white font-black text-2xl">
                {winner.isShiny && '✨ '}{bossData.name}
              </div>

              {phase === 'done' && (
                <button onClick={() => onClose(winner)}
                  className="mt-2 px-8 py-3 rounded-xl font-black text-base active:scale-95 transition-all"
                  style={{ background: 'linear-gradient(135deg,#f59e0b,#ef7c00)', color: '#fff' }}>
                  Récupérer !
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes kc-particle {
          0%   { opacity:1; transform:scale(1) translate(0,0); }
          100% { opacity:0; transform:scale(0.3) translate(0,-60px); }
        }
        @keyframes kc-fadein {
          from { opacity:0; transform:translateY(8px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>
    </div>
  );
}
