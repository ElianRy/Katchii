import { useState, useRef } from 'react';
import { Rarity, RARITY_COLORS, RARITY_LABELS } from '../types';
import { POKEMON_BY_ID, POKEMON_BY_RARITY } from '../data/gen1';
import { playSfxCapture, playSfxShinyCapture, playSfxQuestComplete } from '../lib/audio';

interface Props {
  onClose: (result: { pokemonId: number; isShiny: boolean; rarity: Rarity } | null) => void;
}

// Pool: all pokemon up to elite (no legendaire)
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
      const p = pool[Math.floor(Math.random() * pool.length)];
      return { pokemonId: p.id, rarity: r };
    }
  }
  const fallback = POKEMON_BY_RARITY['commun']![0];
  return { pokemonId: fallback.id, rarity: 'commun' };
}

const ITEM_W = 80;     // px per reel item
const TOTAL_ITEMS = 60;
const WINNER_IDX = 52; // index in reel where winner lands (close to end)
const VISIBLE = 5;     // items visible

function buildReel(winner: { pokemonId: number; rarity: Rarity; isShiny: boolean }) {
  const items: Array<{ pokemonId: number; rarity: Rarity; isShiny: boolean }> = [];
  for (let i = 0; i < TOTAL_ITEMS; i++) {
    if (i === WINNER_IDX) {
      items.push(winner);
    } else {
      const p = pickWeighted();
      items.push({ ...p, isShiny: false });
    }
  }
  return items;
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
  const [translateX, setTranslateX] = useState(0);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string }[]>([]);
  const spinningRef = useRef(false);

  function openCase() {
    if (spinningRef.current) return;
    spinningRef.current = true;

    const isShiny = Math.random() < 0.002; // 0.2%
    const base = pickWeighted();
    const win = { ...base, isShiny };
    setWinner(win);

    const reelItems = buildReel(win);
    setReel(reelItems);
    setPhase('spinning');

    // Center of winner item in reel: WINNER_IDX * ITEM_W + ITEM_W/2
    // We want it centered in the visible strip (VISIBLE * ITEM_W / 2 = center)
    // translateX to apply: -(winnerCenter - visibleCenter)
    const winnerCenter = WINNER_IDX * ITEM_W + ITEM_W / 2;
    const visibleCenter = (VISIBLE * ITEM_W) / 2;
    const targetX = -(winnerCenter - visibleCenter);

    // Start from 0, then animate to target after a tick
    setTranslateX(0);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTranslateX(targetX);
      });
    });

    // After spin completes, reveal
    setTimeout(() => {
      setPhase('reveal');
      if (isShiny) {
        playSfxShinyCapture();
        spawnParticles(win.rarity, true);
      } else if (win.rarity === 'elite') {
        playSfxQuestComplete();
        spawnParticles(win.rarity, false);
      } else {
        playSfxCapture();
      }
    }, 4200);

    setTimeout(() => setPhase('done'), 5200);
  }

  function spawnParticles(rarity: Rarity, shiny: boolean) {
    const color = shiny ? '#fde047' : RARITY_COLORS[rarity];
    const ps = Array.from({ length: 18 }, (_, i) => ({
      id: i, x: 20 + Math.random() * 60, y: 20 + Math.random() * 60, color,
    }));
    setParticles(ps);
    setTimeout(() => setParticles([]), 2000);
  }

  const bossData = winner ? POKEMON_BY_ID[winner.pokemonId] : null;

  return (
    <div className="fixed inset-0 z-[700] bg-black/95 flex flex-col items-center justify-center"
      style={{ height: '100dvh' }}>

      {/* Particles */}
      {particles.map(p => (
        <div key={p.id} className="absolute pointer-events-none"
          style={{
            left: `${p.x}%`, top: `${p.y}%`,
            width: 8, height: 8, borderRadius: '50%',
            background: p.color,
            animation: 'particle-burst 1.8s ease-out forwards',
            boxShadow: `0 0 8px ${p.color}`,
          }} />
      ))}

      {phase === 'intro' && (
        <div className="flex flex-col items-center gap-8 px-8 text-center">
          <div style={{ fontSize: '5rem' }}>🎰</div>
          <div>
            <h2 className="text-white font-black text-2xl mb-2">Capsule Katchii</h2>
            <p className="text-slate-400 text-sm">Un Pokémon aléatoire jusqu'à rareté Épique.</p>
            <p className="text-slate-400 text-sm">0,2% de chance d'obtenir un ✨ Shiny !</p>
          </div>
          <div className="bg-slate-800/60 rounded-xl border border-slate-700/40 p-4 w-full max-w-xs">
            <div className="text-xs text-slate-400 mb-2 font-bold uppercase tracking-wider">Contenu possible</div>
            {(['commun', 'peu_commun', 'rare', 'elite'] as Rarity[]).map(r => (
              <div key={r} className="flex items-center justify-between py-1">
                <span className="text-xs font-semibold" style={{ color: RARITY_COLORS[r] }}>{RARITY_LABELS[r]}</span>
                <span className="text-xs text-slate-500">
                  {r === 'commun' ? '74.6%' : r === 'peu_commun' ? '17.9%' : r === 'rare' ? '5.97%' : '1.49%'}
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={openCase}
            className="w-full max-w-xs py-4 rounded-2xl font-black text-xl transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #ef7c00)', color: '#fff' }}
          >
            🎰 Ouvrir la capsule !
          </button>
          <button onClick={() => onClose(null)} className="text-slate-500 text-sm">Annuler</button>
        </div>
      )}

      {(phase === 'spinning' || phase === 'reveal' || phase === 'done') && (
        <div className="flex flex-col items-center gap-6 w-full px-4">
          <h2 className="text-white font-black text-xl">🎰 Capsule Katchii</h2>

          {/* Reel */}
          <div className="relative" style={{ width: VISIBLE * ITEM_W, overflow: 'hidden' }}>
            {/* Side fade */}
            <div className="absolute inset-0 z-10 pointer-events-none"
              style={{ background: 'linear-gradient(to right, #000 0%, transparent 20%, transparent 80%, #000 100%)' }} />
            {/* Center marker */}
            <div className="absolute inset-y-0 z-20 pointer-events-none"
              style={{
                left: '50%', transform: 'translateX(-50%)',
                width: ITEM_W,
                boxShadow: '0 0 0 2px #f59e0b',
                borderRadius: 8,
              }} />

            <div
              style={{
                display: 'flex',
                width: TOTAL_ITEMS * ITEM_W,
                transform: `translateX(${translateX}px)`,
                transition: phase === 'spinning' ? `transform 4s cubic-bezier(0.05, 0.75, 0.15, 1)` : 'none',
                willChange: 'transform',
              }}
            >
              {reel.map((item, i) => {
                const p = POKEMON_BY_ID[item.pokemonId];
                const isWinner = i === WINNER_IDX && phase !== 'spinning';
                return (
                  <div key={i}
                    style={{
                      width: ITEM_W, flexShrink: 0,
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      justifyContent: 'center', padding: '8px 4px', gap: 2,
                      background: isWinner
                        ? (item.isShiny ? 'linear-gradient(135deg,#78350f,#fde04788)' : RARITY_BG[item.rarity] + 'ee')
                        : RARITY_BG[item.rarity],
                      border: isWinner
                        ? `2px solid ${item.isShiny ? '#fde047' : RARITY_COLORS[item.rarity]}`
                        : `1px solid ${RARITY_COLORS[item.rarity]}44`,
                      borderRadius: 8,
                      margin: '0 1px',
                      boxShadow: isWinner
                        ? `0 0 20px ${item.isShiny ? '#fde04788' : RARITY_COLORS[item.rarity] + '88'}`
                        : 'none',
                      transition: isWinner ? 'box-shadow 0.4s ease' : 'none',
                    }}
                  >
                    <img
                      src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${item.isShiny ? 'shiny/' : ''}${item.pokemonId}.png`}
                      width={48} height={48}
                      style={{ imageRendering: 'pixelated', filter: item.isShiny ? 'drop-shadow(0 0 6px #fde047)' : undefined }}
                      draggable={false}
                    />
                    <span style={{
                      fontSize: '0.45rem', color: RARITY_COLORS[item.rarity],
                      textAlign: 'center', lineHeight: 1.2, wordBreak: 'break-word',
                    }}>{p?.name ?? '???'}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Result reveal */}
          {(phase === 'reveal' || phase === 'done') && winner && bossData && (
            <div className="flex flex-col items-center gap-4 text-center"
              style={{ animation: 'fadeIn 0.5s ease' }}>
              <div style={{
                padding: '2px 12px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 800,
                color: winner.isShiny ? '#fde047' : RARITY_COLORS[winner.rarity],
                background: (winner.isShiny ? '#fde047' : RARITY_COLORS[winner.rarity]) + '22',
                border: `1px solid ${winner.isShiny ? '#fde047' : RARITY_COLORS[winner.rarity]}66`,
              }}>
                {winner.isShiny ? '✨ SHINY !' : RARITY_LABELS[winner.rarity]}
              </div>

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
                {winner.isShiny ? '✨ ' : ''}{bossData.name}
              </div>

              {phase === 'done' && (
                <button
                  onClick={() => onClose(winner)}
                  className="mt-2 px-8 py-3 rounded-xl font-black text-base transition-all active:scale-95"
                  style={{ background: 'linear-gradient(135deg,#f59e0b,#ef7c00)', color: '#fff' }}
                >
                  Récupérer !
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes particle-burst {
          0%   { opacity: 1; transform: scale(1) translate(0,0); }
          100% { opacity: 0; transform: scale(0.3) translate(${Math.random()>0.5?'':'-'}${30+Math.random()*50}px, -${40+Math.random()*60}px); }
        }
      `}</style>
    </div>
  );
}
