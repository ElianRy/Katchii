import React, { useState, useEffect, useCallback, useRef } from 'react';
import { playBattleMusic, playShinyBattleSfx, playLeagueBattleMusic, stopMusic, playVictory, playLeagueVictory, playSfxDefeat, playPokemonCry, playHit, playHitSuper, playHitLow, playDeath } from '../lib/audio';
import { RARITY_COLORS, Rarity } from '../types';
import { POKEMON_BY_ID } from '../data/gen1';
import { ShinySprite } from './ShinySprite';

function spriteFilter(pokemonId: number, _isShiny: boolean, _size = 4): string {
  const rarity = (POKEMON_BY_ID[pokemonId]?.rarity ?? 'commun') as Rarity;
  if (rarity === 'legendaire') return 'drop-shadow(0 0 6px #f59e0b) drop-shadow(0 0 12px #fde04799)';
  return `drop-shadow(0 0 4px ${RARITY_COLORS[rarity]})`;
}
import { POKEMON_TYPE, TYPE_COLORS, PokemonType } from '../data/pokemonTypes';
import {
  calcDamage, calcStruggle, chooseEnemyMoveIndex,
  emptyStages, getMoveListRaw, emptyStatus, checkCanAct, applyMajorStatus,
  calcEndOfTurnDamage, statusLabel, playerGoesFirst as calcTurnOrder,
  registerMoves,
} from '../data/combatEngine';
import type { Stages, StatusState, RawMove, MoveResult } from '../data/combatEngine';
import { MOVES } from '../data/gen1Moves';
registerMoves(MOVES as Parameters<typeof registerMoves>[0]);
import type { } from '../data/gen1Stats';
import { TeamMember } from './TeamBuilder';
import type { PokemonInstanceData } from '../types';
import type { PvpMoveResult } from '../lib/pvp';

interface PvpTurnOverride {
  playerMoveIndex: number;
  enemyMoveIndex: number;
  pResult?: PvpMoveResult;
  eResult?: PvpMoveResult;
}

const SHINY_INTRO_STARS: { color: string; dur: string; delay: string; sym: string; size: number; anim: string }[] = [
  { color: '#fde047', dur: '1.2s', delay: '0s',    sym: '✦', size: 18, anim: 'park-persp-a' },
  { color: '#f472b6', dur: '1.0s', delay: '-0.3s', sym: '★', size: 16, anim: 'park-persp-b' },
  { color: '#60a5fa', dur: '1.5s', delay: '-0.6s', sym: '✦', size: 17, anim: 'park-persp-c' },
  { color: '#4ade80', dur: '1.1s', delay: '-0.9s', sym: '✧', size: 15, anim: 'park-persp-d' },
  { color: '#ffffff', dur: '1.4s', delay: '-0.4s', sym: '★', size: 16, anim: 'park-persp-e' },
  { color: '#c084fc', dur: '1.0s', delay: '-0.7s', sym: '✦', size: 17, anim: 'park-persp-a' },
];

interface Props {
  playerTeam: TeamMember[];
  enemyTeam: TeamMember[];
  bossName?: string;
  onBattleEnd: (won: boolean, xpGains: Record<number, number>, finalTeam?: TeamMember[], enemyDmg?: Record<number, number>) => void;
  playerDamageMult?: number;
  isLeague?: boolean;
  suppressVictorySound?: boolean;
  keepMusic?: boolean;
  keepMusicOnUnmount?: boolean;
  autoCombat?: boolean;
  onAutoCombatChange?: (v: boolean) => void;
  speedLevel?: number;
  onSpeedLevelChange?: (v: number) => void;
  onQuit?: () => void;
  trainerImage?: string;
  trainerColor?: string;
  sideOverlay?: React.ReactNode;
  pokemonData?: Record<number, PokemonInstanceData>;
  pokemonMoves?: Record<number, number[]>;
  pokemonCustomMoves?: Record<number, string[]>;
  pvpControls?: {
    isWaiting: boolean;
    onMoveSelect: (moveIndex: number) => void;
    pendingPayload: PvpTurnOverride | null;
    onTurnComputed?: (payload: Required<PvpTurnOverride>) => void;
  };
}

interface FighterState extends TeamMember {
  currentHp: number;
  currentPP: number[];
  stages: Stages;
  statusState: StatusState;
  isSeeded?: boolean;
  chargingMove?: { moveId: string; moveIndex: number } | null;
  // Morphing (Transform) — ephemeral, only lives during combat
  transformOriginalId?: number;
  transformMoveOverride?: RawMove[];
}

interface LogEntry { text: string; color: string; }

interface AttackEvent {
  attacker: 'player' | 'enemy';
  type: PokemonType;
  uid: number;
}

interface FloatingDmg {
  id: number;
  value: number;
  target: 'player' | 'enemy';
  effectiveness: number;
  isCrit?: boolean;
  isMiss?: boolean;
}

// Precomputed stars
const STARS = Array.from({ length: 40 }, (_, i) => ({
  size: 1 + (i * 0.7) % 2.5,
  top: (i * 37 + 7) % 60,
  left: (i * 53 + 11) % 100,
  opacity: 0.2 + (i * 0.23) % 0.7,
  dur: 1.5 + (i * 0.4) % 2.5,
  del: (i * 0.37) % 2.5,
}));

let dmgCounter = 0;
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

const CONFETTI_BATTLE = Array.from({ length: 22 }, (_, i) => ({
  color: ['#fbbf24','#f472b6','#60a5fa','#4ade80','#fb923c','#c084fc'][i % 6],
  cx: `${(i * 37 + 11) % 100 - 50}px`,
  cdx: `${((i * 23) % 60) - 30}px`,
  cr: `${(i * 47) % 720 - 360}deg`,
  left: `${(i * 37 + 11) % 100}%`,
  delay: `${(i * 0.06).toFixed(2)}s`,
  dur: `${0.7 + (i % 5) * 0.1}s`,
}));

// ── VFX duration map (ms) ───────────────────────────────────────────────────
const VFX_DURATION: Partial<Record<PokemonType | 'status', number>> = {
  normal: 850, fire: 1300, water: 1400, grass: 1400,
  electric: 1150, ice: 950, fighting: 950, poison: 1250,
  ground: 1300, flying: 1100, psychic: 1450, bug: 1250,
  rock: 1150, ghost: 1550, dragon: 1450,
};
const VFX_STATUS_DURATION = 1250;

// ── Precomputed random particle offsets (deterministic, no Math.random in render) ──
const FIRE_PARTICLES = Array.from({ length: 8 }, (_, i) => ({
  tx: (i % 2 === 0 ? 1 : -1) * (180 + (i * 17) % 60),
  ty: -(120 + (i * 23) % 60),
  size: 10 + (i * 5) % 14,
  delay: i * 0.055,
  hue: i * 15,
}));
const WATER_PARTICLES = Array.from({ length: 7 }, (_, i) => ({
  tx: (i % 2 === 0 ? 1 : -1) * (160 + (i * 19) % 55),
  ty: -(100 + (i * 17) % 55),
  w: 16 + (i * 7) % 18,
  h: 8 + (i * 5) % 10,
  delay: i * 0.06,
}));
const LEAF_PARTICLES = Array.from({ length: 4 }, (_, i) => ({
  tx: (i % 2 === 0 ? 1 : -1) * (170 + i * 20),
  ty: -(90 + i * 22),
  delay: i * 0.1,
  color: i % 2 === 0 ? '#4ade80' : '#22c55e',
}));

// ── New particle-based TypeVfx ───────────────────────────────────────────────
function TypeVfx({ type, direction, uid: _uid, moveName }: { type: PokemonType; direction: 'ltr' | 'rtl'; uid: number; moveName?: string }) {
  const isLtr = direction === 'ltr';
  type P = React.CSSProperties;

  // Origin: attacker position (approximate % in arena)
  const ox = isLtr ? 'calc(max(7%, calc(50% - 220px)) + 50px)' : 'calc(100% - max(7%, calc(50% - 220px)) - 90px)';
  const oy = isLtr ? '58%' : '18%';

  // Sign of tx/ty flipped for rtl
  const sign = isLtr ? 1 : -1;


  switch (type) {
    case 'fire': return (
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 15 } as P}>
        {FIRE_PARTICLES.map((p, i) => (
          <div key={i} style={{
            position: 'absolute', left: ox, top: oy,
            width: p.size, height: p.size, borderRadius: '50%',
            background: `radial-gradient(circle at 35% 35%, #FF6B1A, #FFD700)`,
            filter: 'drop-shadow(0 0 4px #FF4500)',
            '--vfx-tx': `${p.tx * sign}px`,
            '--vfx-ty': `${p.ty}px`,
            animationDelay: `${p.delay}s`,
            animation: `vfx-fire-particle-${direction} 0.62s ease-in forwards`,
          } as P} />
        ))}
        {/* Impact flash on target */}
        <div style={{
          position: 'absolute',
          left: isLtr ? 'calc(100% - max(7%, calc(50% - 220px)) - 130px)' : 'calc(max(7%, calc(50% - 220px)) + 10px)',
          top: isLtr ? '10%' : '52%',
          width: 90, height: 90, borderRadius: 8,
          background: 'rgba(239,68,68,0.55)',
          mixBlendMode: 'color-burn' as React.CSSProperties['mixBlendMode'],
          animationDelay: '0.35s',
          animation: 'vfx-fire-flash 0.3s ease-out forwards',
        } as P} />
      </div>
    );

    case 'water': {
      const isSurf = moveName === 'Surf';
      if (isSurf) return (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 15, overflow: 'hidden' } as P}>
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: 0, height: '100%',
            background: 'linear-gradient(180deg, rgba(14,165,233,0) 0%, rgba(14,165,233,0.7) 60%, rgba(56,189,248,0.85) 100%)',
            animation: 'vfx-surf-wave 0.7s ease-out forwards',
          } as P} />
        </div>
      );
      return (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 15 } as P}>
          {WATER_PARTICLES.map((p, i) => (
            <div key={i} style={{
              position: 'absolute', left: ox, top: oy,
              width: p.w, height: p.h, borderRadius: 4,
              background: 'rgba(56,189,248,0.75)',
              border: '1px solid rgba(125,211,252,0.6)',
              '--vfx-tx': `${p.tx * sign}px`,
              '--vfx-ty': `${p.ty}px`,
              animationDelay: `${p.delay}s`,
              animation: `vfx-water-bubble-${direction} 0.65s ease-in forwards`,
            } as P} />
          ))}
        </div>
      );
    }

    case 'grass': {
      const isVine = moveName === 'Fouet Lianes';
      if (isVine) return (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 15 } as P}>
          {[0, 1].map(i => (
            <div key={i} style={{
              position: 'absolute',
              left: isLtr ? '15%' : 'auto', right: isLtr ? 'auto' : '15%',
              top: `${38 + i * 14}%`,
              width: '55%', height: 5,
              background: 'linear-gradient(90deg, #166534, #4ade80)',
              borderRadius: 3,
              filter: 'drop-shadow(0 0 4px #4ade80)',
              transformOrigin: isLtr ? 'left center' : 'right center',
              animationDelay: `${i * 0.08}s`,
              animation: `vfx-vine-${direction} 0.65s ease-out forwards`,
            } as P} />
          ))}
        </div>
      );
      return (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 15 } as P}>
          {LEAF_PARTICLES.map((p, i) => (
            <div key={i} style={{
              position: 'absolute', left: ox, top: oy,
              width: 16, height: 12, borderRadius: '50% 50% 0 50%',
              background: p.color,
              filter: `drop-shadow(0 0 4px ${p.color})`,
              '--vfx-tx': `${p.tx * sign}px`,
              '--vfx-ty': `${p.ty}px`,
              animationDelay: `${p.delay}s`,
              animation: `vfx-leaf-spin-${direction} 0.7s ease-in forwards`,
            } as P} />
          ))}
        </div>
      );
    }

    case 'electric': {
      // SVG zigzag points (ltr: left-bottom → right-top)
      const pts = isLtr
        ? '15,80 25,60 18,45 38,32 30,18 52,10 44,3 72,20'
        : '85,20 75,40 82,55 62,68 70,82 48,90 56,97 28,80';
      return (
        <>
          {/* White screen flash */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 14,
            background: 'rgba(255,255,255,0.85)',
            animation: 'vfx-screen-flash 0.35s ease-out forwards',
          } as P} />
          {/* Zigzag SVG */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 15 } as P}
            viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <filter id="glow-elec"><feGaussianBlur stdDeviation="1.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            </defs>
            <polyline points={pts} fill="none" stroke="#facc15" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" filter="url(#glow-elec)"
              style={{ strokeDasharray: 300, strokeDashoffset: 300, animation: 'vfx-bolt-draw 0.25s ease-out forwards, vfx-bolt-fade 0.35s 0.25s ease-out forwards' }} />
            <polyline points={pts} fill="none" stroke="white" strokeWidth="0.8"
              strokeLinecap="round" strokeLinejoin="round"
              style={{ strokeDasharray: 300, strokeDashoffset: 300, animation: 'vfx-bolt-draw 0.22s ease-out forwards, vfx-bolt-fade 0.3s 0.22s ease-out forwards' }} />
          </svg>
        </>
      );
    }

    case 'ice': {
      // 5 ice shards as thin rotated rectangles
      const shards = [0,1,2,3,4].map(i => ({
        tx: (i % 2 === 0 ? 1 : -1) * (150 + i * 22) * sign,
        ty: -(80 + i * 20),
        rot: -30 + i * 15,
        delay: i * 0.05,
      }));
      return (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 15 } as P}>
          {shards.map((s, i) => (
            <div key={i} style={{
              position: 'absolute', left: ox, top: oy,
              width: 8, height: 22, borderRadius: 2,
              background: 'linear-gradient(180deg, rgba(186,230,253,0.95), rgba(56,189,248,0.7))',
              border: '1px solid rgba(147,197,253,0.8)',
              filter: 'drop-shadow(0 0 5px #bae6fd)',
              transform: `rotate(${s.rot}deg)`,
              '--vfx-tx': `${s.tx}px`,
              '--vfx-ty': `${s.ty}px`,
              animationDelay: `${s.delay}s`,
              animation: `vfx-fire-particle-${direction} 0.4s ease-out forwards`,
            } as P} />
          ))}
        </div>
      );
    }

    case 'psychic': {
      const tgtLeft = isLtr ? 'calc(100% - max(7%, calc(50% - 220px)) - 110px)' : 'calc(max(7%, calc(50% - 220px)) + 20px)';
      const tgtTop = isLtr ? '18%' : '56%';
      const rings = [0,1,2].map(i => ({ delay: 0.3 + i * 0.14, size: 36 + i * 16 }));
      return (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 15 } as P}>
          {/* Orb traveling */}
          <div style={{
            position: 'absolute', left: ox, top: oy,
            width: 20, height: 20, borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 35%, #f0abfc, #a855f7)',
            filter: 'drop-shadow(0 0 8px #d946ef)',
            '--vfx-tx': `${190 * sign}px`,
            '--vfx-ty': `${-150}px`,
            animation: `vfx-fire-particle-${direction} 0.6s ease-in-out forwards`,
          } as P} />
          {/* Expanding rings at target */}
          {rings.map((r, i) => (
            <div key={i} style={{
              position: 'absolute', left: tgtLeft, top: tgtTop,
              width: r.size, height: r.size, borderRadius: '50%',
              border: '2px solid #e879f9',
              marginLeft: -r.size / 2, marginTop: -r.size / 2,
              filter: 'drop-shadow(0 0 6px #a855f7)',
              opacity: 0,
              animationDelay: `${r.delay}s`,
              animation: 'psyring-expand 0.55s ease-out forwards',
            } as P} />
          ))}
        </div>
      );
    }

    case 'fighting': {
      const impacts = [
        { tx: 170 * sign, ty: -100, size: 24, delay: 0, color: '#f97316' },
        { tx: 150 * sign, ty: -120, size: 18, delay: 0.1, color: '#fbbf24' },
        { tx: 190 * sign, ty: -80,  size: 14, delay: 0.18, color: '#fb923c' },
      ];
      return (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 15 } as P}>
          {impacts.map((p, i) => (
            <div key={i} style={{
              position: 'absolute', left: ox, top: oy,
              width: p.size, height: p.size, borderRadius: '50%',
              background: p.color,
              filter: `drop-shadow(0 0 6px ${p.color})`,
              '--vfx-tx': `${p.tx}px`,
              '--vfx-ty': `${p.ty}px`,
              animationDelay: `${p.delay}s`,
              animation: `vfx-fire-particle-${direction} 0.45s ease-in forwards`,
            } as P} />
          ))}
        </div>
      );
    }

    case 'poison': {
      const blobs = [0,1,2,3].map(i => ({
        tx: (i % 2 === 0 ? 1 : -1) * (140 + i * 25) * sign,
        ty: -(90 + i * 18),
        size: 12 + (i * 4) % 10,
        delay: i * 0.08,
      }));
      return (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 15 } as P}>
          {blobs.map((b, i) => (
            <div key={i} style={{
              position: 'absolute', left: ox, top: oy,
              width: b.size, height: b.size, borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 35%, #e879f9, #7e22ce)',
              border: '1px solid #d946ef',
              filter: 'drop-shadow(0 0 4px #a855f7)',
              '--vfx-tx': `${b.tx}px`,
              '--vfx-ty': `${b.ty}px`,
              animationDelay: `${b.delay}s`,
              animation: `vfx-fire-particle-${direction} 0.7s ease-in-out forwards`,
            } as P} />
          ))}
        </div>
      );
    }

    case 'ghost': {
      const wisps = [0,1,2].map(i => ({
        tx: (i % 2 === 0 ? 1 : -1) * (120 + i * 40) * sign,
        ty: -(100 + i * 30),
        size: 18 + i * 6,
        delay: i * 0.12,
      }));
      return (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 15 } as P}>
          {wisps.map((w, i) => (
            <div key={i} style={{
              position: 'absolute', left: ox, top: oy,
              width: w.size, height: w.size, borderRadius: '50% 50% 40% 40%',
              background: 'radial-gradient(circle at 40% 35%, rgba(167,139,250,0.8), rgba(76,29,149,0.4))',
              filter: 'drop-shadow(0 0 8px #7c3aed) blur(1px)',
              '--vfx-tx': `${w.tx}px`,
              '--vfx-ty': `${w.ty}px`,
              animationDelay: `${w.delay}s`,
              animation: `vfx-fire-particle-${direction} 0.8s ease-in-out forwards`,
            } as P} />
          ))}
        </div>
      );
    }

    case 'ground': {
      const rocks = [0,1,2,3].map(i => ({
        tx: (i % 2 === 0 ? 1 : -1) * (155 + i * 22) * sign,
        ty: -(60 + i * 25),
        size: 14 + (i * 6) % 12,
        delay: i * 0.07,
      }));
      return (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 15 } as P}>
          {rocks.map((r, i) => (
            <div key={i} style={{
              position: 'absolute', left: ox, top: oy,
              width: r.size, height: r.size, borderRadius: 3,
              background: 'linear-gradient(135deg, #78716c, #44403c)',
              filter: 'drop-shadow(0 0 3px #92400e)',
              '--vfx-tx': `${r.tx}px`,
              '--vfx-ty': `${r.ty}px`,
              animationDelay: `${r.delay}s`,
              animation: `vfx-fire-particle-${direction} 0.65s ease-in forwards`,
            } as P} />
          ))}
        </div>
      );
    }

    case 'flying': {
      return (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 15 } as P}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              position: 'absolute',
              left: isLtr ? `${10 + i * 3}%` : 'auto',
              right: isLtr ? 'auto' : `${10 + i * 3}%`,
              top: isLtr ? `${44 + i * 7}%` : `${12 + i * 7}%`,
              width: `${70 - i * 15}%`, height: 4 - i,
              background: 'linear-gradient(90deg, rgba(186,230,253,0), rgba(186,230,253,0.9), rgba(186,230,253,0))',
              filter: 'drop-shadow(0 0 3px #7dd3fc)',
              animationDelay: `${i * 0.07}s`,
              animation: `wind-slash-${direction} 0.6s ease-in-out forwards`,
            } as P} />
          ))}
        </div>
      );
    }

    case 'rock': {
      const rockParts = [0,1,2].map(i => ({
        tx: (i % 2 === 0 ? 1 : -1) * (160 + i * 25) * sign,
        ty: -(80 + i * 28),
        size: 16 + i * 5,
        delay: i * 0.09,
      }));
      return (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 15 } as P}>
          {rockParts.map((r, i) => (
            <div key={i} style={{
              position: 'absolute', left: ox, top: oy,
              width: r.size, height: r.size * 0.85, borderRadius: 3,
              background: 'linear-gradient(135deg, #a8a29e, #57534e)',
              filter: 'drop-shadow(0 0 4px #a8a29e)',
              '--vfx-tx': `${r.tx}px`,
              '--vfx-ty': `${r.ty}px`,
              animationDelay: `${r.delay}s`,
              animation: `vfx-fire-particle-${direction} 0.55s ease-in forwards`,
            } as P} />
          ))}
        </div>
      );
    }

    case 'dragon': {
      const dParts = [0,1,2].map(i => ({
        tx: (180 + i * 15) * sign,
        ty: -(130 + i * 12),
        size: 20 - i * 4,
        delay: i * 0.1,
        color: i === 0 ? '#818cf8' : '#a5b4fc',
      }));
      return (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 15 } as P}>
          {dParts.map((p, i) => (
            <div key={i} style={{
              position: 'absolute', left: ox, top: oy,
              width: p.size, height: p.size, borderRadius: '50%',
              background: p.color,
              filter: `drop-shadow(0 0 10px #4f46e5)`,
              '--vfx-tx': `${p.tx}px`,
              '--vfx-ty': `${p.ty}px`,
              animationDelay: `${p.delay}s`,
              animation: `vfx-fire-particle-${direction} 0.75s ease-in-out forwards`,
            } as P} />
          ))}
        </div>
      );
    }

    default: {
      // Normal / bug / steel / unknown — dash + impact sparks
      const sparks = [0,1,2,3].map(i => ({
        tx: (i % 2 === 0 ? 1 : -1) * (150 + i * 18) * sign,
        ty: -(80 + i * 20),
        size: 10 + i * 3,
        delay: i * 0.06,
      }));
      return (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 15 } as P}>
          {sparks.map((s, i) => (
            <div key={i} style={{
              position: 'absolute', left: ox, top: oy,
              width: s.size, height: s.size, borderRadius: '50%',
              background: '#fde68a',
              filter: 'drop-shadow(0 0 5px #fbbf24)',
              '--vfx-tx': `${s.tx}px`,
              '--vfx-ty': `${s.ty}px`,
              animationDelay: `${s.delay}s`,
              animation: `vfx-fire-particle-${direction} 0.42s ease-in forwards`,
            } as P} />
          ))}
        </div>
      );
    }
  }
}

// Helper to get PP array for a pokemon (4 moves), respecting custom move selection
function initPP(pokemonId: number, customIndices?: number[], customSlugs?: string[]): number[] {
  const rawMoves = getMoveListRaw(pokemonId, customIndices, customSlugs);
  if (rawMoves.length > 0) return rawMoves.map(m => m.pp ?? 15);
  return [15, 15, 15, 15];
}

type DisplayMove = { name: string; type: string; power: number; pp: number; category: string; description?: string; multiHit?: boolean; highCrit?: boolean; accuracy?: number };

// Helper to get move list for display, respecting custom move selection
function getMoveList(pokemonId: number, customIndices?: number[], customSlugs?: string[]): DisplayMove[] {
  return getMoveListRaw(pokemonId, customIndices, customSlugs) as DisplayMove[];
}

// ── Status block VFX (sleep ZZZ / paralysis flash / freeze / burn) ──────────
function StatusBlockVfx({ condition, uid: _uid }: { condition: string | null; uid: number }) {
  type P = React.CSSProperties;
  const base: P = { position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20 };

  if (condition === 'slp') {
    return (
      <div style={base}>
        {(['Z','Z','z'] as string[]).map((char, i) => (
          <span key={i} style={{
            position: 'absolute',
            top: `${15 + i * 14}%`, left: `${30 + i * 12}%`,
            fontSize: `${1.1 - i * 0.18}rem`, fontWeight: 900, color: '#94a3b8',
            textShadow: '0 0 8px #64748b',
            animation: `slp-zzz-${i} ${0.9 + i * 0.15}s ${i * 0.18}s ease-out forwards`,
          } as P}>{char}</span>
        ))}
      </div>
    );
  }

  if (condition === 'par') {
    return (
      <div style={{ ...base, borderRadius: 8, background: '#facc1555',
        animation: 'par-flash 0.7s ease-out forwards' }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '1.8rem', filter: 'drop-shadow(0 0 8px #facc15)', animation: 'par-flash 0.7s ease-out forwards' }}>⚡</span>
        </div>
      </div>
    );
  }

  if (condition === 'frz') {
    return (
      <div style={{ ...base, borderRadius: 8, background: '#bae6fd44',
        animation: 'frz-pulse 0.8s ease-out forwards' }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '2rem', filter: 'drop-shadow(0 0 10px #38bdf8)', animation: 'frz-pulse 0.8s ease-out forwards' }}>❄️</span>
        </div>
      </div>
    );
  }

  if (condition === 'brn') {
    return (
      <div style={{ ...base, borderRadius: 8, background: '#f9731622',
        animation: 'brn-flicker 0.7s ease-out forwards' }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '1.8rem', filter: 'drop-shadow(0 0 8px #f97316)', animation: 'brn-flicker 0.7s ease-out forwards' }}>🔥</span>
        </div>
      </div>
    );
  }

  return null;
}

// ── Poison bubbles VFX ───────────────────────────────────────────────────────
function PoisonBubblesVfx({ uid: _uid }: { uid: number }) {
  type P = React.CSSProperties;
  const bubbles = [
    { size: 10, left: '20%', top: '55%', anim: 'psn-bubble-0', dur: '0.9s', delay: '0s'   },
    { size: 7,  left: '55%', top: '60%', anim: 'psn-bubble-1', dur: '1.0s', delay: '0.1s' },
    { size: 12, left: '35%', top: '50%', anim: 'psn-bubble-2', dur: '0.85s', delay: '0.05s' },
    { size: 8,  left: '70%', top: '65%', anim: 'psn-bubble-3', dur: '0.95s', delay: '0.15s' },
  ];
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20 } as P}>
      {bubbles.map((b, i) => (
        <div key={i} style={{
          position: 'absolute', left: b.left, top: b.top,
          width: b.size, height: b.size, borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 35%, #e879f9, #7c3aed)',
          border: '1px solid #d946ef',
          filter: 'drop-shadow(0 0 3px #a855f7)',
          animation: `${b.anim} ${b.dur} ${b.delay} ease-out forwards`,
        } as P} />
      ))}
    </div>
  );
}

// ── Morph VFX overlays ───────────────────────────────────────────────────────
function MorphBlinkOverlay({ uid: _uid }: { uid: number }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 25, borderRadius: 8,
      background: 'radial-gradient(ellipse at 50% 60%, #a855f7cc 0%, #7c3aed44 55%, transparent 80%)',
      animation: 'morph-blink-overlay 0.35s steps(2) forwards',
    }} />
  );
}

function ParalysisAppliedVfx({ uid: _uid }: { uid: number }) {
  const sparks = [0, 1, 2, 3, 4];
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 25 }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 60%, #facc1555 0%, transparent 70%)',
        animation: 'par-flash 0.5s ease-out forwards',
      }} />
      {sparks.map(i => (
        <span key={i} style={{
          position: 'absolute',
          left: `${15 + i * 16}%`,
          top: `${30 + (i % 3) * 20}%`,
          fontSize: `${0.9 + (i % 2) * 0.4}rem`,
          animation: `vfx-fire-particle-up ${0.45 + i * 0.07}s ${i * 0.06}s ease-out forwards`,
          filter: 'drop-shadow(0 0 6px #fde047)',
        }}>⚡</span>
      ))}
    </div>
  );
}

function PoisonAppliedVfx({ uid: _uid }: { uid: number }) {
  const bubbles = [
    { left: '20%', top: '60%', size: 1.4, delay: '0s',    dur: '0.9s' },
    { left: '45%', top: '55%', size: 1.1, delay: '0.12s', dur: '1.0s' },
    { left: '65%', top: '65%', size: 1.6, delay: '0.06s', dur: '0.85s' },
    { left: '35%', top: '50%', size: 1.0, delay: '0.2s',  dur: '0.95s' },
  ];
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 25 }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 60%, #a855f733 0%, transparent 70%)',
        animation: 'morph-blink-overlay 0.5s ease-out forwards',
      }} />
      {bubbles.map((b, i) => (
        <span key={i} style={{
          position: 'absolute',
          left: b.left, top: b.top,
          fontSize: `${b.size}rem`,
          animation: `psn-bubble-${i} ${b.dur} ${b.delay} ease-out forwards`,
          filter: 'drop-shadow(0 0 5px #c084fc)',
        }}>☠️</span>
      ))}
    </div>
  );
}

function SleepAppliedZzz({ uid: _uid }: { uid: number }) {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 25 }}>
      {(['Z', 'Z', 'z'] as string[]).map((char, i) => (
        <span key={i} style={{
          position: 'absolute',
          left: `${25 + i * 18}%`,
          top: `${40 - i * 18}%`,
          fontSize: `${1.6 - i * 0.25}rem`,
          fontWeight: 900,
          color: '#94a3b8',
          textShadow: '0 0 12px #64748b, 0 0 24px #475569',
          animation: `slp-zzz-${i} ${1.0 + i * 0.2}s ${i * 0.25}s ease-out forwards`,
        }}>
          {char}
        </span>
      ))}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export function BattleScreen({
  playerTeam, enemyTeam, bossName: _bossName, onBattleEnd,
  playerDamageMult = 1, isLeague = false,
  suppressVictorySound = false, keepMusic = false, keepMusicOnUnmount = false,
  autoCombat,
  onQuit, trainerImage, trainerColor, sideOverlay, pokemonData, pokemonMoves,
  pokemonCustomMoves, pvpControls,
}: Props) {

  const initFighters = (team: TeamMember[], useCurrentHp: boolean): FighterState[] =>
    team.map(m => ({
      ...m,
      currentHp: useCurrentHp && m.currentHp > 0 ? m.currentHp : m.maxHp,
      currentPP: initPP(m.pokemonId, pokemonMoves?.[m.pokemonId], pokemonCustomMoves?.[m.pokemonId]),
      stages: emptyStages(),
      statusState: emptyStatus(),
    }));

  const [playerFighters, setPlayerFighters] = useState<FighterState[]>(() => initFighters(playerTeam, true));
  const playerFightersRef = useRef<FighterState[]>(initFighters(playerTeam, true));
  const enemyFightersRef = useRef<FighterState[]>(initFighters(enemyTeam, false));
  const boostActiveRef = useRef(playerDamageMult > 1);
  const [boostActive, setBoostActive] = useState(playerDamageMult > 1);
  const [enemyFighters, setEnemyFighters] = useState<FighterState[]>(() => initFighters(enemyTeam, false));
  const [playerIdx, setPlayerIdx] = useState(0);
  const [enemyIdx, setEnemyIdx] = useState(0);
  const playerIdxRef = useRef(0);
  const enemyIdxRef = useRef(0);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [phase, setPhase] = useState<'intro' | 'player_turn' | 'resolving' | 'switch' | 'end'>('intro');
  const phaseRef = useRef<'intro' | 'player_turn' | 'resolving' | 'switch' | 'end'>('intro');
  const [attackEvt, setAttackEvt] = useState<AttackEvent | null>(null);
  const [floatingDmg, setFloatingDmg] = useState<FloatingDmg[]>([]);
  const [hitFlash, setHitFlash] = useState<'player' | 'enemy' | null>(null);
  const won = useRef(false);
  const battleDone = useRef(false);
  const enemyDmgRef = useRef<Record<number, number>>({});
  const playerStatsRef = useRef<Record<number, { toursSurTerrain: number; degatsInfliges: number }>>(
    Object.fromEntries(playerTeam.map(m => [m.pokemonId, { toursSurTerrain: 0, degatsInfliges: 0 }]))
  );
  const koEnemyLevelsRef = useRef<number[]>([]);
  const [trainerKoAnim, setTrainerKoAnim] = useState(false);
  const prevEfHp = useRef<number | null>(null);
  const isMasterTrainer = trainerColor === '#a855f7';
  const [shinyIntro, setShinyIntro] = useState(false);
  const [shakePokemon, setShakePokemon] = useState<'player' | 'enemy' | null>(null);
  const [tooltipMoveIdx, setTooltipMoveIdx] = useState<number | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);
  const turnNumberRef = useRef(0);
  const [showFullLog, setShowFullLog] = useState(false);
  const logScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (showFullLog && logScrollRef.current) logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight;
  }, [showFullLog, log]);

  useEffect(() => { playerFightersRef.current = playerFighters; }, [playerFighters]);
  useEffect(() => { enemyFightersRef.current = enemyFighters; }, [enemyFighters]);
  useEffect(() => { playerIdxRef.current = playerIdx; }, [playerIdx]);
  useEffect(() => { enemyIdxRef.current = enemyIdx; }, [enemyIdx]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // Trainer KO reaction
  useEffect(() => {
    const hp = enemyFighters[enemyIdx]?.currentHp ?? null;
    if (hp !== null && prevEfHp.current !== null && prevEfHp.current > 0 && hp === 0) {
      setTrainerKoAnim(true);
      const t = setTimeout(() => setTrainerKoAnim(false), 900);
      return () => clearTimeout(t);
    }
    prevEfHp.current = hp;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enemyFighters, enemyIdx]);

  const [statusAnim, setStatusAnim] = useState<{ target: 'player' | 'enemy'; positive: boolean; uid: number } | null>(null);
  const [spriteBounce, setSpriteBounce] = useState<{ target: 'player' | 'enemy'; type: 'buff' | 'debuff'; uid: number } | null>(null);
  const [hitEffect, setHitEffect] = useState<{ target: 'player' | 'enemy'; uid: number } | null>(null);
  const [statusBlockOverlay, setStatusBlockOverlay] = useState<{ target: 'player' | 'enemy'; condition: string | null; uid: number } | null>(null);
  const [poisonBubbles, setPoisonBubbles] = useState<{ target: 'player' | 'enemy'; uid: number } | null>(null);
  const [morphVfxState, setMorphVfxState] = useState<{ target: 'player' | 'enemy'; phase: 'blink' | 'squish'; uid: number } | null>(null);
  const [sleepApplied, setSleepApplied] = useState<{ target: 'player' | 'enemy'; uid: number } | null>(null);
  const [paralysisApplied, setParalysisApplied] = useState<{ target: 'player' | 'enemy'; uid: number } | null>(null);
  const [poisonApplied, setPoisonApplied] = useState<{ target: 'player' | 'enemy'; uid: number } | null>(null);
  const addLog = useCallback((text: string, color = '#e2e8f0') => {
    setLog(prev => [...prev.slice(-100), { text, color }]);
  }, []);

  // HeartGold-style dialog box state (3 visible lines: 2 prev + current typing)
  const [hgDialog, setHgDialog] = useState({ prevLines: [] as string[], curLine: '', curFull: '', nextIdx: 0, showArrow: false });
  useEffect(() => {
    const d = hgDialog;
    if (d.curLine.length < d.curFull.length) {
      const t = setTimeout(() => setHgDialog(p => ({ ...p, curLine: p.curFull.slice(0, p.curLine.length + 1), showArrow: false })), 18);
      return () => clearTimeout(t);
    }
    if (d.nextIdx < log.length) {
      const pause = d.curFull.length > 0 ? 350 : 0;
      const t = setTimeout(() => setHgDialog(p => {
        const next = log[p.nextIdx];
        if (!next) return p;
        return { prevLines: [...p.prevLines, p.curFull].slice(-3), curLine: '', curFull: next.text, nextIdx: p.nextIdx + 1, showArrow: false };
      }), pause);
      return () => clearTimeout(t);
    }
    if (d.curFull.length > 0 && !d.showArrow) setHgDialog(p => ({ ...p, showArrow: true }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hgDialog, log]);

  // Intro → battle
  useEffect(() => {
    if (phase !== 'intro') return;
    const hasShiny = [...playerTeam, ...enemyTeam].some(m => m.isShiny);
    if (!keepMusic) { if (isLeague) playLeagueBattleMusic(); else playBattleMusic(); }
    if (hasShiny) { playShinyBattleSfx(); setShinyIntro(true); setTimeout(() => setShinyIntro(false), 2500); }
    const t1 = setTimeout(() => {
      setShakePokemon('player');
      if (playerTeam[0]) playPokemonCry(playerTeam[0].pokemonId);
      setTimeout(() => setShakePokemon(null), 600);
    }, 1400);
    const t2 = setTimeout(() => {
      setShakePokemon('enemy');
      if (enemyTeam[0]) playPokemonCry(enemyTeam[0].pokemonId);
      setTimeout(() => setShakePokemon(null), 600);
    }, 2100);
    const t3 = setTimeout(() => { phaseRef.current = 'player_turn'; setPhase('player_turn'); }, 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => () => { if (!keepMusicOnUnmount) stopMusic(0.5); }, [keepMusicOnUnmount]);

  // PvP: when a pre-computed turn payload arrives, trigger execution
  const executeTurnRef = useRef<((idx: number, pvp?: PvpTurnOverride) => Promise<void>) | null>(null);
  useEffect(() => {
    const payload = pvpControls?.pendingPayload;
    if (!payload) return;
    if (phaseRef.current !== 'player_turn') return;
    executeTurnRef.current?.(payload.playerMoveIndex, payload);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pvpControls?.pendingPayload]);

  // Auto-trigger turn 2 of a charging move (e.g. Lance-Soleil)
  useEffect(() => {
    if (phase !== 'player_turn' || pvpControls) return;
    const charging = playerFightersRef.current[playerIdxRef.current]?.chargingMove;
    if (!charging) return;
    const t = setTimeout(() => {
      if (phaseRef.current === 'player_turn') executeTurnRef.current?.(charging.moveIndex);
    }, 700);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (phase !== 'player_turn' || !autoCombat || pvpControls) return;
    const delay = 800 + Math.random() * 200;
    const t = setTimeout(() => {
      if (phaseRef.current !== 'player_turn') return;
      const pIdx = playerIdxRef.current;
      const eIdx = enemyIdxRef.current;
      const pf = playerFightersRef.current;
      const ef = enemyFightersRef.current;
      const pFighter = pf[pIdx];
      const eFighter = ef[eIdx];
      if (!pFighter || !eFighter) return;
      const eTypes = (POKEMON_TYPE[eFighter.pokemonId] ?? ['normal']) as PokemonType[];
      const pCustomSlugs = pokemonCustomMoves?.[pFighter.pokemonId];
      const pMoves = getMoveListRaw(pFighter.pokemonId, pokemonMoves?.[pFighter.pokemonId], pCustomSlugs);
      const autoIdx = chooseEnemyMoveIndex(
        pFighter.pokemonId, eTypes, pFighter.currentPP,
        pFighter.stages, turnNumberRef.current,
        eFighter.statusState, pFighter.statusState, pMoves,
      );
      executeTurn(autoIdx < 0 ? 0 : autoIdx);
    }, delay);
    return () => clearTimeout(t);
  }, [phase, autoCombat]);

  const addDmg = useCallback((value: number, target: 'player' | 'enemy', effectiveness: number, isCrit?: boolean, isMiss?: boolean) => {
    const id = dmgCounter++;
    setFloatingDmg(prev => [...prev, { id, value, target, effectiveness, isCrit, isMiss }]);
    setTimeout(() => setFloatingDmg(prev => prev.filter(d => d.id !== id)), 1100);
  }, []);

  const hpColor = (pct: number) => pct > 0.5 ? '#22c55e' : pct > 0.25 ? '#f59e0b' : '#ef4444';

  // Handle end phase
  useEffect(() => {
    if (phase === 'end') {
      const wonSnap = won.current;
      boostActiveRef.current = false;
      setBoostActive(false);
      if (!wonSnap) { stopMusic(0.3); if (!suppressVictorySound) playSfxDefeat(); }

      // ── Nouveau système XP ────────────────────────────────────────────────
      const xpBase = koEnemyLevelsRef.current.reduce((sum, lvl) => sum + lvl * 20, 0);
      const snap: Record<number, number> = {};

      if (xpBase > 0) {
        const stats = playerStatsRef.current;
        const totalDmg = Object.values(stats).reduce((s, st) => s + st.degatsInfliges, 0);
        const totalTours = Object.values(stats).reduce((s, st) => s + st.toursSurTerrain, 0);
        const defeatMult = wonSnap ? 1 : 0.4;

        playerTeam.forEach(m => {
          const id = m.pokemonId;
          const st = stats[id] ?? { toursSurTerrain: 0, degatsInfliges: 0 };
          let xpCalc: number;
          if (st.toursSurTerrain === 0 && st.degatsInfliges === 0) {
            // Participation passive (banc)
            xpCalc = xpBase * 0.15;
          } else {
            const ratioDmg = totalDmg > 0 ? st.degatsInfliges / totalDmg : 0;
            const ratioTours = totalTours > 0 ? st.toursSurTerrain / totalTours : 0;
            xpCalc = xpBase * (ratioDmg * 0.5 + ratioTours * 0.5);
          }
          snap[id] = Math.max(1, Math.floor(xpCalc * defeatMult));
        });
      }
      const finalTeam: TeamMember[] = playerFightersRef.current.map(f => {
        const { transformOriginalId, transformMoveOverride, ...rest } = f as FighterState;
        return transformOriginalId !== undefined
          ? { ...rest, pokemonId: transformOriginalId }
          : { ...rest };
      });
      setTimeout(() => onBattleEnd(wonSnap, snap, finalTeam, enemyDmgRef.current), 1800);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const [switchMenuOpen, setSwitchMenuOpen] = useState(false);

  const handleSwitch = useCallback((idx: number) => {
    playerIdxRef.current = idx;
    setPlayerIdx(idx);
    const name = POKEMON_BY_ID[playerFighters[idx]?.pokemonId]?.name ?? '???';
    addLog(`Allez ${name} !`, '#4ade80');
    setShakePokemon('player');
    if (playerFighters[idx]) playPokemonCry(playerFighters[idx].pokemonId);
    setTimeout(() => {
      setShakePokemon(null);
      phaseRef.current = 'player_turn';
      setPhase('player_turn');
    }, 700);
  }, [playerFighters, addLog]);

  // Switch volontaire en cours de combat — coûte un tour (l'ennemi attaque)
  const handleVoluntarySwitch = useCallback(async (idx: number) => {
    if (battleDone.current || phaseRef.current !== 'player_turn') return;
    setSwitchMenuOpen(false);
    phaseRef.current = 'resolving';
    setPhase('resolving');

    const eIdx = enemyIdxRef.current;
    let pf = [...playerFightersRef.current];
    let ef = [...enemyFightersRef.current];
    const eFighter = ef[eIdx];
    const flush = () => { playerFightersRef.current = pf; enemyFightersRef.current = ef; setPlayerFighters([...pf]); setEnemyFighters([...ef]); };

    // Effectuer le changement
    playerIdxRef.current = idx;
    const newName = POKEMON_BY_ID[pf[idx]?.pokemonId]?.name ?? '???';
    addLog(`Go, ${newName} !`, '#4ade80');
    setShakePokemon('player');
    if (pf[idx]) playPokemonCry(pf[idx].pokemonId);
    await sleep(1250);
    setShakePokemon(null);
    setPlayerIdx(idx);

    // L'ennemi attaque pendant le changement
    if (!battleDone.current && eFighter) {
      const eInst = pokemonData?.[eFighter.pokemonId];
      const pFighterNew = pf[idx];
      const pInst = pokemonData?.[pFighterNew?.pokemonId];
      const eName = POKEMON_BY_ID[eFighter.pokemonId]?.name ?? '???';
      const eCanActResult = checkCanAct(eFighter.statusState);
      ef[eIdx] = { ...ef[eIdx], statusState: eCanActResult.nextStatus };

      if (!eCanActResult.canAct) {
        const cond = ef[eIdx].statusState.condition;
        addLog(cond === 'slp' ? `${eName} dort profondément.` : `${eName} est complètement paralysé(e) ! Il ne peut pas bouger !`, '#94a3b8');
      } else {
        const ePlayerTypes = (POKEMON_TYPE[pFighterNew?.pokemonId ?? 0] ?? ['normal']) as PokemonType[];
        const eMoveIndex = chooseEnemyMoveIndex(
          eFighter.pokemonId, ePlayerTypes, eFighter.currentPP, eFighter.stages, turnNumberRef.current,
          { condition: null }, eFighter.statusState,
        );
        turnNumberRef.current++;
        const eResult = eMoveIndex < 0
          ? calcStruggle(eFighter.pokemonId, eFighter.level, pFighterNew.pokemonId, pFighterNew.level, eInst, pInst)
          : calcDamage(eFighter.pokemonId, eFighter.level, pFighterNew.pokemonId, pFighterNew.level, eMoveIndex, eInst, pInst, eFighter.stages, emptyStages(), undefined, eFighter.statusState, { condition: null });

        const ePP = [...ef[eIdx].currentPP];
        if (eMoveIndex >= 0 && ePP[eMoveIndex] > 0) ePP[eMoveIndex]--;
        ef[eIdx] = { ...ef[eIdx], currentPP: ePP };

        addLog(`${eName} utilise ${eResult.moveName} !`, '#fde68a');
        const uid = dmgCounter++;
        setAttackEvt({ attacker: 'enemy', type: eResult.moveType, uid });
        await sleep(VFX_DURATION[eResult.moveType] ?? 820);
        setAttackEvt(null);

        if (!eResult.isMiss && eResult.damage > 0) {
          const newPHp = Math.max(0, pf[idx].currentHp - eResult.damage);
          pf[idx] = { ...pf[idx], currentHp: newPHp };
          flush();
          if      (eResult.effectiveness === 0) { /* immunité */ }
          else if (eResult.effectiveness >= 2)   playHitSuper();
          else if (eResult.effectiveness < 1)    playHitLow();
          else                                   playHit();
          const hUid = dmgCounter++;
          setHitFlash('player');
          setHitEffect({ target: 'player', uid: hUid });
          setTimeout(() => { setHitFlash(null); setHitEffect(e => e?.uid === hUid ? null : e); }, 450);
          addDmg(eResult.damage, 'player', eResult.effectiveness, eResult.isCrit, false);
        } else if (eResult.isMiss) {
          addLog(`L'attaque de ${eName} a raté !`, '#94a3b8');
        }

        await sleep(850);

        if (pf[idx].currentHp <= 0) {
          addLog(`${newName} est mis K.O. !`, '#f87171');
          playDeath();
          flush();
          enemyDmgRef.current[eFighter.pokemonId] = (enemyDmgRef.current[eFighter.pokemonId] ?? 0) + eResult.damage;
          const nextP = pf.findIndex((f, i) => i !== idx && f.currentHp > 0);
          if (nextP < 0 && pf.every(f => f.currentHp <= 0)) {
            battleDone.current = true; won.current = false;
            phaseRef.current = 'end'; setPhase('end');
          } else {
            phaseRef.current = 'switch'; setPhase('switch');
          }
          return;
        }
      }
    }

    flush();
    phaseRef.current = 'player_turn';
    setPhase('player_turn');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerFighters, enemyFighters, addLog, addDmg, pokemonData]);

  // ── Core turn execution (async — strict sequential VFX → damage → sound) ──
  const executeTurn = useCallback(async (playerMoveIndex: number, pvpPayload?: PvpTurnOverride) => {
    if (battleDone.current || phaseRef.current !== 'player_turn') return;
    phaseRef.current = 'resolving';
    setPhase('resolving');

    const pIdx = playerIdxRef.current;
    const eIdx = enemyIdxRef.current;

    // Work on local mutable copies, sync back to React via flush()
    let pf = [...playerFightersRef.current];
    let ef = [...enemyFightersRef.current];

    const pFighter = pf[pIdx];
    const eFighter = ef[eIdx];
    if (!pFighter || !eFighter) return;

    const pInst = pokemonData?.[pFighter.pokemonId];
    const eInst = pokemonData?.[eFighter.pokemonId];
    const pName = POKEMON_BY_ID[pFighter.pokemonId]?.name ?? '???';
    const eName = POKEMON_BY_ID[eFighter.pokemonId]?.name ?? '???';

    const flush = () => {
      playerFightersRef.current = pf;
      enemyFightersRef.current = ef;
      setPlayerFighters([...pf]);
      setEnemyFighters([...ef]);
    };

    // Status: check who can act
    const pCanActResult = checkCanAct(pFighter.statusState);
    const eCanActResult = checkCanAct(eFighter.statusState);
    pf[pIdx] = { ...pf[pIdx], statusState: pCanActResult.nextStatus };
    ef[eIdx] = { ...ef[eIdx], statusState: eCanActResult.nextStatus };

    if (pCanActResult.wokeUp) addLog(`${pName} se réveille !`, '#86efac');
    if (eCanActResult.wokeUp) addLog(`${eName} se réveille !`, '#86efac');

    // Enemy AI
    const ePlayerTypes = (POKEMON_TYPE[pFighter.pokemonId] ?? ['normal']) as PokemonType[];
    const pCustomSlugs = pokemonCustomMoves?.[pFighter.pokemonId];
    const pRawMoves = getMoveListRaw(pFighter.pokemonId, pokemonMoves?.[pFighter.pokemonId], pCustomSlugs);
    const eMoveIndexAI = chooseEnemyMoveIndex(
      eFighter.pokemonId, ePlayerTypes, eFighter.currentPP, eFighter.stages, turnNumberRef.current,
      pFighter.statusState, eFighter.statusState
    );
    // 2-turn move or PvP: override eMoveIndex
    const eMoveIndex = ef[eIdx]?.chargingMove
      ? ef[eIdx].chargingMove!.moveIndex
      : pvpPayload ? pvpPayload.enemyMoveIndex : eMoveIndexAI;
    turnNumberRef.current++;
    const activePId = pf[pIdx].transformOriginalId ?? pf[pIdx].pokemonId;
    if (playerStatsRef.current[activePId]) {
      playerStatsRef.current[activePId].toursSurTerrain++;
    } else {
      playerStatsRef.current[activePId] = { toursSurTerrain: 1, degatsInfliges: 0 };
    }

    // Turn order
    const goesFirst = calcTurnOrder(
      playerMoveIndex, eMoveIndex < 0 ? 0 : eMoveIndex,
      pFighter.pokemonId, eFighter.pokemonId,
      pFighter.level, eFighter.level,
      pFighter.stages, eFighter.stages,
      pFighter.statusState, eFighter.statusState,
      pInst, eInst, pRawMoves,
    );

    // PP deduction
    const pHasMoves = getMoveList(pFighter.pokemonId, pokemonMoves?.[pFighter.pokemonId], pCustomSlugs).length > 0;
    const playerUsesStruggle = pHasMoves && pFighter.currentPP[playerMoveIndex] <= 0;
    const pPP = [...pf[pIdx].currentPP];
    if (!playerUsesStruggle && pHasMoves && pPP[playerMoveIndex] > 0) pPP[playerMoveIndex]--;
    pf[pIdx] = { ...pf[pIdx], currentPP: pPP };
    const ePP = [...ef[eIdx].currentPP];
    if (eMoveIndex >= 0 && ePP[eMoveIndex] > 0) ePP[eMoveIndex]--;
    ef[eIdx] = { ...ef[eIdx], currentPP: ePP };

    // Raw move references for transform detection
    const pEffectiveMoves = pf[pIdx].transformMoveOverride ?? pRawMoves;
    const pRawMoveSelected: RawMove | undefined = !playerUsesStruggle && pHasMoves ? pEffectiveMoves[playerMoveIndex] : undefined;
    const eEffectiveMoves = ef[eIdx].transformMoveOverride
      ?? getMoveListRaw(ef[eIdx].pokemonId, pokemonMoves?.[ef[eIdx].pokemonId], pokemonCustomMoves?.[ef[eIdx].pokemonId]);
    const eRawMoveSelected: RawMove | undefined = eMoveIndex >= 0 ? eEffectiveMoves[eMoveIndex] : undefined;

    // Calculate results upfront (Gen 1 style — pre-calculated)
    // Transform moves bypass calcDamage — their result is a no-op placeholder
    const TRANSFORM_PLACEHOLDER: MoveResult = { damage: 0, effectiveness: 1, moveName: 'Morphing', isCrit: false, isMiss: false, moveType: 'normal' as PokemonType, recoil: 0, hits: 0 };
    const boostMult = boostActiveRef.current && pIdx === 0 ? playerDamageMult : 1;
    const pStages = { ...pf[pIdx].stages, attack: pf[pIdx].stages.attack + (boostMult > 1 ? 1 : 0) };
    let pResult: MoveResult = (pRawMoveSelected?.id === 'transform' || pRawMoveSelected?.name === 'Métamorph')
      ? TRANSFORM_PLACEHOLDER
      : playerUsesStruggle
        ? calcStruggle(pFighter.pokemonId, pFighter.level, eFighter.pokemonId, eFighter.level, pInst, eInst)
        : calcDamage(pFighter.pokemonId, pFighter.level, eFighter.pokemonId, eFighter.level, playerMoveIndex, pInst, eInst, pStages, eFighter.stages, pEffectiveMoves, pFighter.statusState, eFighter.statusState);
    let eResult: MoveResult = (eRawMoveSelected?.id === 'transform' || eRawMoveSelected?.name === 'Métamorph')
      ? TRANSFORM_PLACEHOLDER
      : eMoveIndex < 0
        ? calcStruggle(eFighter.pokemonId, eFighter.level, pFighter.pokemonId, pFighter.level, eInst, pInst)
        : calcDamage(eFighter.pokemonId, eFighter.level, pFighter.pokemonId, pFighter.level, eMoveIndex, eInst, pInst, eFighter.stages, pFighter.stages, eEffectiveMoves, eFighter.statusState, pFighter.statusState);
    // PvP guest: use host-computed results; PvP host: broadcast computed results
    if (pvpPayload?.pResult) {
      pResult = pvpPayload.pResult as unknown as MoveResult;
      eResult = pvpPayload.eResult as unknown as MoveResult;
    } else if (pvpControls?.onTurnComputed) {
      pvpControls.onTurnComputed({ playerMoveIndex, enemyMoveIndex: eMoveIndex, pResult, eResult });
    }

    const STAT_FR: Record<string, string> = {
      attack: "l'Attaque", defense: 'la Défense',
      spAttack: "l'Atk Spé", spDefense: 'la Déf Spé', speed: 'la Vitesse',
    };
    const STATUS_FR: Record<string, string> = {
      par: 'paralysé(e) ! Il risque de ne plus pouvoir bouger',
      brn: 'brûlé(e)',
      psn: 'empoisonné(e)',
      tox: 'gravement empoisonné(e)',
      slp: 'endormi(e)',
      frz: 'gelé(e)',
    };

    const applyBoostToFighter = (f: FighterState, boost: typeof pResult.statBoost, fighterName: string, animTarget: 'player' | 'enemy'): FighterState => {
      if (!boost) return f;
      const cur = f.stages[boost.stat as keyof typeof f.stages] ?? 0;
      if (boost.stages > 0 && cur >= 6) { addLog(`La stat de ${fighterName} ne peut plus monter !`, '#94a3b8'); return f; }
      if (boost.stages < 0 && cur <= -6) { addLog(`La stat de ${fighterName} ne peut plus baisser !`, '#94a3b8'); return f; }
      const next = Math.max(-6, Math.min(6, cur + boost.stages));
      const statFr = STAT_FR[boost.stat] ?? boost.stat;
      const magnitude = Math.abs(boost.stages) >= 2 ? ' fortement' : '';
      const verb = boost.stages > 0 ? `augmente${magnitude}` : `baisse${magnitude}`;
      addLog(`${statFr.charAt(0).toUpperCase() + statFr.slice(1)} de ${fighterName} ${verb} !`, boost.stages > 0 ? '#4ade80' : '#f87171');
      setSpriteBounce({ target: animTarget, type: boost.stages > 0 ? 'buff' : 'debuff', uid: dmgCounter++ });
      setTimeout(() => setSpriteBounce(null), 700);
      return { ...f, stages: { ...f.stages, [boost.stat]: next } };
    };

    // ── Morphing (Transform) effect ──────────────────────────────────────────
    const executeTransformEffect = async (
      isPlayer: boolean, atkIdx: number, defIdx: number, atkName: string, defName: string,
    ): Promise<void> => {
      const atkArr = isPlayer ? pf : ef;
      const defArr = isPlayer ? ef : pf;
      const atkSide: 'player' | 'enemy' = isPlayer ? 'player' : 'enemy';

      if (atkArr[atkIdx].transformOriginalId !== undefined) {
        addLog(`${atkName} est déjà transformé(e) !`, '#94a3b8');
        return;
      }

      const morphUid = dmgCounter++;

      // Phase 1 — purple blink overlay 350ms
      setMorphVfxState({ target: atkSide, phase: 'blink', uid: morphUid });
      await sleep(600);

      // Phase 2 — squish (scaleX 1→0→1); apply state change at peak (invisible at 250ms)
      setMorphVfxState({ target: atkSide, phase: 'squish', uid: morphUid });
      await sleep(450);

      // ── Apply transform at peak of squish (sprite is invisible) ──
      const target = defArr[defIdx];
      // Use the target's already-copied moves if it too is transformed
      const srcMoves: RawMove[] = target.transformMoveOverride
        ?? getMoveListRaw(
            target.pokemonId,
            pokemonMoves?.[target.pokemonId],
            pokemonCustomMoves?.[target.pokemonId],
          );
      // All copied PP are capped at 5 (Gen 4 rule)
      const copiedMoves: RawMove[] = srcMoves.map(m => ({ ...m, pp: 5 }));

      if (isPlayer) {
        pf[atkIdx] = {
          ...pf[atkIdx],
          pokemonId: target.pokemonId,
          transformOriginalId: pf[atkIdx].pokemonId,
          transformMoveOverride: copiedMoves,
          stages: { ...target.stages },           // copy target's stat stages
          currentPP: copiedMoves.map(() => 5),
        };
      } else {
        ef[atkIdx] = {
          ...ef[atkIdx],
          pokemonId: target.pokemonId,
          transformOriginalId: ef[atkIdx].pokemonId,
          transformMoveOverride: copiedMoves,
          stages: { ...target.stages },
          currentPP: copiedMoves.map(() => 5),
        };
      }
      flush();
      playPokemonCry(target.pokemonId);

      // Let the sprite re-expand (remaining 250ms of squish)
      await sleep(500);
      setMorphVfxState(null);
      addLog(`${atkName} se transforme en ${defName} !`, '#c084fc');
      await sleep(700);
    };

    // ── Execute one attacker's turn ──
    const executeOneAttack = async (
      result: typeof pResult,
      attackerSide: 'player' | 'enemy',
      canActResult: ReturnType<typeof checkCanAct>,
      rawMove?: RawMove,
    ): Promise<boolean> => { // returns true if target fainted
      const isPlayer = attackerSide === 'player';
      const atkName  = isPlayer ? pName : eName;
      const defName  = isPlayer ? eName : pName;
      const atkIdx   = isPlayer ? pIdx  : eIdx;
      const defIdx   = isPlayer ? eIdx  : pIdx;
      const atkSide  = attackerSide;
      const defSide  = (isPlayer ? 'enemy' : 'player') as 'player' | 'enemy';

      // Status block
      if (!canActResult.canAct) {
        const cond = (isPlayer ? pf : ef)[atkIdx].statusState.condition;
        if (cond === 'slp') addLog(`${atkName} dort profondément.`, '#94a3b8');
        else addLog(`${atkName} est complètement paralysé(e) ! Il ne peut pas bouger !`, '#94a3b8');
        const uid = dmgCounter++;
        setStatusBlockOverlay({ target: atkSide, condition: cond, uid });
        await sleep(1600);
        setStatusBlockOverlay(s => s?.uid === uid ? null : s);
        return false;
      }

      // Morphing: delegate entirely to transform handler, no damage
      if (rawMove?.id === 'transform' || rawMove?.name === 'Métamorph') {
        addLog(`${atkName} utilise Morphing !`, '#fde68a');
        await executeTransformEffect(isPlayer, atkIdx, defIdx, atkName, defName);
        return false;
      }

      // Lance-Soleil: 2-turn charge mechanic
      if (rawMove?.id === 'solar-beam') {
        const atkArr = isPlayer ? pf : ef;
        if (!atkArr[atkIdx].chargingMove) {
          // Turn 1 — charge
          addLog(`${atkName} utilise ${result.moveName} !`, '#fde68a');
          await sleep(150);
          const uid2 = dmgCounter++;
          setAttackEvt({ attacker: atkSide, type: 'grass', uid: uid2 });
          await sleep(1250);
          setAttackEvt(null);
          addLog(`${atkName} se gorge de lumière !`, '#adff2f');
          const storedIdx = isPlayer ? playerMoveIndex : eMoveIndex;
          if (isPlayer) pf[atkIdx] = { ...pf[atkIdx], chargingMove: { moveId: 'solar-beam', moveIndex: storedIdx } };
          else ef[atkIdx] = { ...ef[atkIdx], chargingMove: { moveId: 'solar-beam', moveIndex: storedIdx } };
          flush();
          return false;
        } else {
          // Turn 2 — clear flag and proceed with normal damage
          if (isPlayer) pf[atkIdx] = { ...pf[atkIdx], chargingMove: null };
          else ef[atkIdx] = { ...ef[atkIdx], chargingMove: null };
          flush();
        }
      }

      const isStatusOnly = result.damage === 0 && !!result.statBoost && !result.isMiss;

      // Step A: log "[Name] utilise [Move]!"
      addLog(`${atkName} utilise ${result.moveName} !`, '#fde68a');
      await sleep(150);

      // Step B: VFX — await completion before applying damage
      if (isStatusOnly) {
        const positive = result.statBoost!.stages > 0;
        const animTarget = result.statBoost!.target === 'self' ? atkSide : defSide;
        setStatusAnim({ target: animTarget, positive, uid: dmgCounter++ });
        await sleep(VFX_STATUS_DURATION);
        setStatusAnim(null);
      } else if ((result.hits || 1) <= 1) {
        // Single-hit: full VFX before damage
        const uid = dmgCounter++;
        setAttackEvt({ attacker: atkSide, type: result.moveType, uid });
        await sleep(VFX_DURATION[result.moveType] ?? 820);
        setAttackEvt(null);
      }

      // failedSpecial
      if (result.failedSpecial === 'not-sleeping') {
        addLog('Mais ça n\'a aucun effet !', '#94a3b8');
        return false;
      }

      // Miss
      if (result.isMiss) {
        addLog(`L'attaque de ${atkName} a raté !`, '#94a3b8');
        addDmg(0, defSide, 1, false, true);
        return false;
      }

      // Step C: apply damage (with multi-hit support)
      if (result.damage > 0) {
        const hitCount = Math.max(1, result.hits || 1);
        const perHitDmg = hitCount > 1 ? Math.max(1, Math.floor(result.damage / hitCount)) : result.damage;
        const hitVfxDuration = Math.round((VFX_DURATION[result.moveType] ?? 820) * 0.55);
        let totalApplied = 0;

        for (let h = 0; h < hitCount; h++) {
          const defArr2 = isPlayer ? ef : pf;
          if (defArr2[defIdx].currentHp <= 0) break;

          // VFX per hit for multi-hit moves
          if (hitCount > 1) {
            const uid = dmgCounter++;
            setAttackEvt({ attacker: atkSide, type: result.moveType, uid });
            await sleep(hitVfxDuration);
            setAttackEvt(null);
          }

          const dmgThisHit = h === hitCount - 1 ? result.damage - totalApplied : perHitDmg;
          const newHp = Math.max(0, defArr2[defIdx].currentHp - dmgThisHit);
          if (isPlayer) ef[defIdx] = { ...ef[defIdx], currentHp: newHp };
          else          pf[defIdx] = { ...pf[defIdx], currentHp: newHp };
          totalApplied += dmgThisHit;
          flush();

          // hit sound — silent on immunity
          if      (result.effectiveness === 0) { /* aucun son : immunité */ }
          else if (result.effectiveness >= 2)   playHitSuper();
          else if (result.effectiveness < 1)    playHitLow();
          else                                  playHit();

          // hit flash + floating damage
          setHitFlash(defSide);
          const hUid = dmgCounter++;
          setHitEffect({ target: defSide, uid: hUid });
          setTimeout(() => { setHitFlash(null); setHitEffect(e => e?.uid === hUid ? null : e); }, 350);
          addDmg(dmgThisHit, defSide, result.effectiveness, result.isCrit && h === 0, false);

          if (h < hitCount - 1) await sleep(300);
        }

        if (isPlayer && totalApplied > 0) {
          const dmgTrackId = pf[pIdx].transformOriginalId ?? pf[pIdx].pokemonId;
          if (playerStatsRef.current[dmgTrackId]) {
            playerStatsRef.current[dmgTrackId].degatsInfliges += totalApplied;
          } else {
            playerStatsRef.current[dmgTrackId] = { toursSurTerrain: 0, degatsInfliges: totalApplied };
          }
        }
        if (result.isCrit) addLog('Coup critique !', '#fbbf24');
        if (hitCount > 1) addLog(`${hitCount} fois de suite !`, '#fbbf24');
        if (result.effectiveness >= 2) addLog('C\'est super efficace !', isPlayer ? '#4ade80' : '#f87171');
        else if (result.effectiveness < 1 && result.effectiveness > 0) addLog('Ça ne semble pas très efficace...', '#94a3b8');
      } else if (result.effectiveness === 0) {
        addDmg(0, defSide, 0, false, false);
        addLog('Ça n\'a aucun effet...', '#94a3b8');
      } else if (!isStatusOnly && !result.appliedStatus) {
        addLog('Ça n\'a aucun effet...', '#94a3b8');
      }

      // FRZ thaw on fire move
      if (result.cureDefenderStatus) {
        const defArr = isPlayer ? ef : pf;
        if (defArr[defIdx].statusState.condition === 'frz') {
          addLog(`${defName} a dégel grâce à la chaleur !`, '#38bdf8');
          if (isPlayer) ef[defIdx] = { ...ef[defIdx], statusState: { condition: null } };
          else          pf[defIdx] = { ...pf[defIdx], statusState: { condition: null } };
        }
      }

      // Stat boosts
      if (result.statBoost?.target === 'self') {
        if (isPlayer) pf[atkIdx] = applyBoostToFighter(pf[atkIdx], result.statBoost!, atkName, atkSide);
        else          ef[atkIdx] = applyBoostToFighter(ef[atkIdx], result.statBoost!, atkName, atkSide);
        flush();
      }
      if (result.statBoost?.target === 'foe') {
        if (isPlayer) ef[defIdx] = applyBoostToFighter(ef[defIdx], result.statBoost!, defName, defSide);
        else          pf[defIdx] = applyBoostToFighter(pf[defIdx], result.statBoost!, defName, defSide);
        flush();
      }
      if (result.allStatBoosted) {
        const allStats: Array<{ stat: keyof typeof pFighter.stages; stages: number; target: 'self' | 'foe' }> = [
          { stat: 'attack', stages: 1, target: 'self' },
          { stat: 'defense', stages: 1, target: 'self' },
          { stat: 'spAttack', stages: 1, target: 'self' },
          { stat: 'spDefense', stages: 1, target: 'self' },
          { stat: 'speed', stages: 1, target: 'self' },
        ];
        for (const b of allStats) {
          if (isPlayer) pf[atkIdx] = applyBoostToFighter(pf[atkIdx], b, atkName, atkSide);
          else          ef[atkIdx] = applyBoostToFighter(ef[atkIdx], b, atkName, atkSide);
        }
        flush();
      }

      // Drain heal
      if (result.drainHeal && result.drainHeal > 0) {
        if (isPlayer) pf[atkIdx] = { ...pf[atkIdx], currentHp: Math.min(pf[atkIdx].maxHp, pf[atkIdx].currentHp + result.drainHeal) };
        else          ef[atkIdx] = { ...ef[atkIdx], currentHp: Math.min(ef[atkIdx].maxHp, ef[atkIdx].currentHp + result.drainHeal) };
        addLog(`${atkName} récupère des PV !`, '#86efac');
        flush();
      }

      // Recoil
      if (result.recoil > 0) {
        if (isPlayer) pf[atkIdx] = { ...pf[atkIdx], currentHp: Math.max(0, pf[atkIdx].currentHp - result.recoil) };
        else          ef[atkIdx] = { ...ef[atkIdx], currentHp: Math.max(0, ef[atkIdx].currentHp - result.recoil) };
        addLog(`${atkName} est blessé(e) par le choc en retour !`, '#f87171');
        flush();
      }

      // Seed
      if (result.appliedSeed) {
        if (isPlayer) ef[defIdx] = { ...ef[defIdx], isSeeded: true };
        else          pf[defIdx] = { ...pf[defIdx], isSeeded: true };
        addLog(`${defName} est ensemencé(e) par la Vampigraine !`, '#86efac');
      }

      // Step E: pause
      await sleep(850);

      // Check if target fainted
      const defArr = isPlayer ? ef : pf;
      return defArr[defIdx].currentHp <= 0;
    };

    const handleEnemyKo = () => {
      addLog(`${eName} est mis K.O. !`, '#f87171');
      playDeath();
      koEnemyLevelsRef.current.push(eFighter.level);
      flush();
      const nextE = ef.findIndex((f, i) => i > eIdx && f.currentHp > 0);
      if (nextE < 0 && ef.every(f => f.currentHp <= 0)) {
        battleDone.current = true; won.current = true;
        stopMusic(0);
        if (!suppressVictorySound) { isLeague ? playLeagueVictory() : playVictory(); }
        phaseRef.current = 'end'; setPhase('end');
      } else if (nextE >= 0) {
        enemyIdxRef.current = nextE;
        setEnemyIdx(nextE);
        phaseRef.current = 'player_turn'; setPhase('player_turn');
      }
    };

    const handlePlayerKo = () => {
      addLog(`${pName} est mis K.O. !`, '#f87171');
      playDeath();
      enemyDmgRef.current[eFighter.pokemonId] = (enemyDmgRef.current[eFighter.pokemonId] ?? 0) + eResult.damage;
      if (pIdx === 0 && boostActiveRef.current) { boostActiveRef.current = false; setBoostActive(false); }
      flush();
      const nextP = pf.findIndex((f, i) => i > pIdx && f.currentHp > 0);
      if (nextP < 0 && pf.every(f => f.currentHp <= 0)) {
        battleDone.current = true; won.current = false;
        phaseRef.current = 'end'; setPhase('end');
      } else {
        phaseRef.current = 'switch'; setPhase('switch');
      }
    };

    // ── Helper : appliquer l'altération d'état d'un attaquant sur sa cible ──
    // Appelé immédiatement après l'attaque (pas en fin de tour) pour que le sommeil
    // infligé par le premier attaquant bloque le second dans le même tour (règle Gen 4).
    const applyAttackerStatus = (attacker: 'player' | 'enemy', result: typeof pResult) => {
      if (!result.appliedStatus) return;
      const triggerStatusVfx = (target: 'player' | 'enemy') => {
        const st = result.appliedStatus;
        const uid = dmgCounter++;
        if (st === 'slp') {
          setSleepApplied({ target, uid });
          setTimeout(() => setSleepApplied(s => s?.uid === uid ? null : s), 2000);
        } else if (st === 'par') {
          setParalysisApplied({ target, uid });
          setTimeout(() => setParalysisApplied(s => s?.uid === uid ? null : s), 1200);
        } else if (st === 'psn' || st === 'tox') {
          setPoisonApplied({ target, uid });
          setTimeout(() => setPoisonApplied(s => s?.uid === uid ? null : s), 1200);
        }
      };
      if (attacker === 'player') {
        const ns = applyMajorStatus(ef[eIdx].statusState, result.appliedStatus);
        if (ns) {
          addLog(`${eName} est ${STATUS_FR[result.appliedStatus] ?? result.appliedStatus} !`, statusLabel(result.appliedStatus)?.color ?? '#fde68a');
          ef[eIdx] = { ...ef[eIdx], statusState: ns };
          flush();
          triggerStatusVfx('enemy');
        }
      } else {
        const ns = applyMajorStatus(pf[pIdx].statusState, result.appliedStatus);
        if (ns) {
          addLog(`${pName} est ${STATUS_FR[result.appliedStatus] ?? result.appliedStatus} !`, statusLabel(result.appliedStatus)?.color ?? '#fde68a');
          pf[pIdx] = { ...pf[pIdx], statusState: ns };
          flush();
          triggerStatusVfx('player');
        }
      }
    };

    // Vérifie si le statut vient d'être appliqué à l'instant et bloque instantanément
    // (sommeil, gel — pas la paralysie qui n'agit qu'au tour suivant).
    const isFreshBlock = (cond: string | null) => cond === 'slp' || cond === 'frz';

    // ── Execute in turn order ──
    if (goesFirst) {
      // ── Premier : le joueur ──
      const eKo = await executeOneAttack(pResult, 'player', pCanActResult, pRawMoveSelected);
      if (battleDone.current) return;
      if (eKo) { handleEnemyKo(); return; }
      if (pf[pIdx].currentHp <= 0) { handlePlayerKo(); return; }

      // Applique immédiatement l'état du joueur sur l'adversaire
      if (pCanActResult.canAct) applyAttackerStatus('player', pResult);

      // Si l'adversaire vient d'être endormi/gelé CE tour-ci → annule son action
      const eFreshlyBlocked = isFreshBlock(ef[eIdx].statusState.condition ?? null);
      const eCanActFinal = eFreshlyBlocked ? { ...eCanActResult, canAct: false } : eCanActResult;

      // ── Second : l'adversaire ──
      await executeOneAttack(eResult, 'enemy', eCanActFinal, eRawMoveSelected);
      if (battleDone.current) return;

      // Applique l'état de l'adversaire uniquement s'il a effectivement agi
      if (!eFreshlyBlocked && eCanActResult.canAct) applyAttackerStatus('enemy', eResult);
    } else {
      // ── Premier : l'adversaire ──
      const pKo = await executeOneAttack(eResult, 'enemy', eCanActResult, eRawMoveSelected);
      if (battleDone.current) return;
      if (pKo) { handlePlayerKo(); return; }
      if (ef[eIdx].currentHp <= 0) { handleEnemyKo(); return; }

      // Applique immédiatement l'état de l'adversaire sur le joueur
      if (eCanActResult.canAct) applyAttackerStatus('enemy', eResult);

      // Si le joueur vient d'être endormi/gelé CE tour-ci → annule son action
      const pFreshlyBlocked = isFreshBlock(pf[pIdx].statusState.condition ?? null);
      const pCanActFinal = pFreshlyBlocked ? { ...pCanActResult, canAct: false } : pCanActResult;

      // ── Second : le joueur ──
      await executeOneAttack(pResult, 'player', pCanActFinal, pRawMoveSelected);
      if (battleDone.current) return;

      // Applique l'état du joueur uniquement s'il a effectivement agi
      if (!pFreshlyBlocked && pCanActResult.canAct) applyAttackerStatus('player', pResult);
    }

    // ── End-of-turn: BRN/PSN/TOX ──
    const pEot = calcEndOfTurnDamage(pf[pIdx].maxHp, pf[pIdx].statusState);
    if (pEot.damage > 0) {
      const pEotCond = pf[pIdx].statusState.condition;
      pf[pIdx] = { ...pf[pIdx], currentHp: Math.max(0, pf[pIdx].currentHp - pEot.damage), statusState: pEot.nextStatus };
      addDmg(pEot.damage, 'player', 1);
      if (pEotCond === 'psn' || pEotCond === 'tox') addLog(`${pName} est blessé(e) par le poison !`, '#a855f7');
      else if (pEotCond === 'brn') addLog(`${pName} souffre de sa brûlure !`, '#f97316');
      const c = pf[pIdx].statusState.condition;
      if (c === 'psn' || c === 'tox') {
        const uid = dmgCounter++;
        setPoisonBubbles({ target: 'player', uid });
        setTimeout(() => setPoisonBubbles(b => b?.uid === uid ? null : b), 1100);
        const uid2 = dmgCounter++;
        setPoisonApplied({ target: 'player', uid: uid2 });
        setTimeout(() => setPoisonApplied(s => s?.uid === uid2 ? null : s), 1100);
      }
      flush();
    }
    const eEot = calcEndOfTurnDamage(ef[eIdx].maxHp, ef[eIdx].statusState);
    if (eEot.damage > 0) {
      const eEotCond = ef[eIdx].statusState.condition;
      ef[eIdx] = { ...ef[eIdx], currentHp: Math.max(0, ef[eIdx].currentHp - eEot.damage), statusState: eEot.nextStatus };
      addDmg(eEot.damage, 'enemy', 1);
      if (eEotCond === 'psn' || eEotCond === 'tox') addLog(`${eName} est blessé(e) par le poison !`, '#a855f7');
      else if (eEotCond === 'brn') addLog(`${eName} souffre de sa brûlure !`, '#f97316');
      const c = ef[eIdx].statusState.condition;
      if (c === 'psn' || c === 'tox') {
        const uid = dmgCounter++;
        setPoisonBubbles({ target: 'enemy', uid });
        setTimeout(() => setPoisonBubbles(b => b?.uid === uid ? null : b), 1100);
        const uid2 = dmgCounter++;
        setPoisonApplied({ target: 'enemy', uid: uid2 });
        setTimeout(() => setPoisonApplied(s => s?.uid === uid2 ? null : s), 1100);
      }
      flush();
    }

    // ── Leech Seed drain ──
    if (pf[pIdx].isSeeded) {
      const sd = Math.floor(pf[pIdx].maxHp / 8);
      pf[pIdx] = { ...pf[pIdx], currentHp: Math.max(0, pf[pIdx].currentHp - sd) };
      ef[eIdx] = { ...ef[eIdx], currentHp: Math.min(ef[eIdx].maxHp, ef[eIdx].currentHp + sd) };
      addDmg(sd, 'player', 1);
      addLog(`${pName} est drainé(e) par la Vampigraine !`, '#86efac');
      addLog(`${eName} récupère des PV grâce à la Vampigraine !`, '#86efac');
      flush();
    }
    if (ef[eIdx].isSeeded) {
      const sd = Math.floor(ef[eIdx].maxHp / 8);
      ef[eIdx] = { ...ef[eIdx], currentHp: Math.max(0, ef[eIdx].currentHp - sd) };
      pf[pIdx] = { ...pf[pIdx], currentHp: Math.min(pf[pIdx].maxHp, pf[pIdx].currentHp + sd) };
      addDmg(sd, 'enemy', 1);
      addLog(`${eName} est drainé(e) par la Vampigraine !`, '#86efac');
      addLog(`${pName} récupère des PV grâce à la Vampigraine !`, '#86efac');
      flush();
    }

    if (battleDone.current) return;

    // ── Check final KOs ──
    if (ef[eIdx].currentHp <= 0) { handleEnemyKo(); return; }
    if (pf[pIdx].currentHp <= 0) { handlePlayerKo(); return; }

    // ── Both alive → next player turn ──
    phaseRef.current = 'player_turn';
    setPhase('player_turn');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerIdx, enemyIdx, addLog, addDmg, pokemonData]);

  const activePF = playerFighters[playerIdx];
  const activeEF = enemyFighters[enemyIdx];
  const playerMoves = activePF
    ? (activePF.transformMoveOverride
        ? activePF.transformMoveOverride as DisplayMove[]
        : getMoveList(activePF.pokemonId, pokemonMoves?.[activePF.pokemonId], pokemonCustomMoves?.[activePF.pokemonId]))
    : [];
  const allPPEmpty = activePF ? activePF.currentPP.every(pp => pp <= 0) : false;

  // Long press handlers
  const startLongPress = (idx: number) => {
    longPressFiredRef.current = false;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      setTooltipMoveIdx(idx);
    }, 300);
  };
  executeTurnRef.current = executeTurn;

  const endLongPress = (idx: number) => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    if (longPressFiredRef.current) return;
    if (tooltipMoveIdx !== null) { setTooltipMoveIdx(null); return; }
    if (phase !== 'player_turn') return;

    // Feedback immédiat si le pokémon est endormi ou paralysé
    const pFighter = playerFightersRef.current[playerIdxRef.current];
    const cond = pFighter?.statusState?.condition;
    if (cond === 'slp' || cond === 'par') {
      const uid = dmgCounter++;
      setStatusBlockOverlay({ target: 'player', condition: cond, uid });
      setTimeout(() => setStatusBlockOverlay(s => s?.uid === uid ? null : s), 1600);
    }

    if (pvpControls) {
      pvpControls.onMoveSelect(idx);
      phaseRef.current = 'resolving'; setPhase('resolving');
    } else {
      executeTurn(idx);
    }
  };

  // ── INTRO PHASE ─────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="fixed inset-0 z-[600] flex flex-col" style={{ background: '#020617' }}>
        {sideOverlay && <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 35 }}>{sideOverlay}</div>}
        <div className="relative flex-1 overflow-hidden">
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(ellipse at 50% 20%, #1e1b4b 0%, #0f0720 55%, #020617 100%)',
          }} />

          {/* Enemy pokemon */}
          <div className="absolute" style={{ top:'calc(5% + env(safe-area-inset-top, 0px))', right:'max(7%, calc(50% - 220px))', animation:'battle-enter-enemy 0.7s cubic-bezier(.175,.885,.32,1.275) forwards' }}>
            <div className="bg-black/75 rounded-xl px-3 py-2 border border-slate-600/50 mb-2 min-w-[140px]">
              <div className="flex items-center gap-1.5 mb-1">
                {trainerImage && (
                  <img src={trainerImage} alt="" draggable={false}
                    style={{ width: 30, height: 40, objectFit: 'contain', objectPosition: 'top center', flexShrink: 0,
                      filter: isMasterTrainer ? `drop-shadow(0 0 6px ${trainerColor})` : 'drop-shadow(0 1px 4px rgba(0,0,0,0.8))',
                      animation: isMasterTrainer ? 'trainer-master-float 2s ease-in-out infinite' : undefined,
                    }} />
                )}
                <div className="flex flex-1 justify-between items-center">
                  <span className="text-white font-black text-sm">{POKEMON_BY_ID[enemyFighters[0]?.pokemonId ?? 0]?.name ?? '???'}</span>
                  <span className="text-slate-400 text-xs">Nv.{enemyFighters[0]?.level}</span>
                </div>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2.5">
                <div className="h-2.5 rounded-full" style={{ width:'100%', background:'#22c55e' }} />
              </div>
            </div>
            <div className="flex justify-end">
              {enemyFighters[0] && (
                <div className="relative inline-flex items-center justify-center"
                  style={shakePokemon === 'enemy' ? { animation: 'pokemon-shake 0.6s ease-in-out' } : undefined}>
                  <ShinySprite pokemonId={enemyFighters[0].pokemonId} isShiny={enemyFighters[0].isShiny ?? false} width={88} height={88} flip
                    style={{ filter: spriteFilter(enemyFighters[0].pokemonId, enemyFighters[0].isShiny ?? false) }} />
                  {shinyIntro && enemyFighters[0].isShiny && SHINY_INTRO_STARS.map((s, i) => (
                    <div key={i} style={{ position:'absolute', left:'50%', top:'50%', width:0, height:0, zIndex:10,
                      animation:`${s.anim} ${s.dur} ${s.delay} linear infinite` } as React.CSSProperties}>
                      <span style={{ position:'absolute', transform:'translate(-50%,-50%)', color:s.color, fontSize:s.size,
                        fontWeight:900, textShadow:`0 0 8px ${s.color}`, lineHeight:1, userSelect:'none' }}>{s.sym}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Player pokemon */}
          <div className="absolute" style={{ bottom:'13%', left:'max(7%, calc(50% - 220px))', animation:'battle-enter-player 0.7s cubic-bezier(.175,.885,.32,1.275) forwards' }}>
            {playerFighters[0] && (
              <div className="relative inline-flex items-center justify-center"
                style={shakePokemon === 'player' ? { animation: 'pokemon-shake 0.6s ease-in-out' } : undefined}>
                <ShinySprite pokemonId={playerFighters[0].pokemonId} isShiny={playerFighters[0].isShiny ?? false} width={96} height={96}
                  style={{ filter: spriteFilter(playerFighters[0].pokemonId, playerFighters[0].isShiny ?? false) }} />
                {shinyIntro && playerFighters[0].isShiny && SHINY_INTRO_STARS.map((s, i) => (
                  <div key={i} style={{ position:'absolute', left:'50%', top:'50%', width:0, height:0, zIndex:10,
                    animation:`${s.anim} ${s.dur} ${s.delay} linear infinite` } as React.CSSProperties}>
                    <span style={{ position:'absolute', transform:'translate(-50%,-50%)', color:s.color, fontSize:s.size,
                      fontWeight:900, textShadow:`0 0 8px ${s.color}`, lineHeight:1, userSelect:'none' }}>{s.sym}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="bg-black/75 rounded-xl px-3 py-2 border border-slate-600/50 mt-2 min-w-[140px]">
              <div className="flex justify-between items-center mb-1">
                <span className="text-white font-black text-sm">{POKEMON_BY_ID[playerFighters[0]?.pokemonId ?? 0]?.name ?? '???'}</span>
                <span className="text-slate-400 text-xs">Nv.{playerFighters[0]?.level}</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2.5">
                <div className="h-2.5 rounded-full" style={{ width:'100%', background:'#22c55e' }} />
              </div>
            </div>
          </div>

          {/* VS */}
          <div className="absolute inset-x-0 top-1/2 flex justify-center"
            style={{ animation:'battle-vs 0.5s 0.4s ease-out both' }}>
            <span className="font-black" style={{
              fontSize:'5rem',
              background:'linear-gradient(135deg, #ef4444, #f97316)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
              filter:'drop-shadow(0 0 20px #ef4444)',
            }}>VS</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[600] flex flex-col" style={{ background: '#020617' }}>
      {sideOverlay && <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 35 }}>{sideOverlay}</div>}

      {/* ── Arena ── */}
      <div className="relative overflow-hidden" style={{ flex: '1 1 0', minHeight: 0 }}>
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at 50% 20%, #1e1b4b 0%, #0f0720 55%, #020617 100%)',
        }} />
        {STARS.map((s, i) => (
          <div key={i} className="absolute rounded-full bg-white pointer-events-none" style={{
            width: s.size, height: s.size, top: `${s.top}%`, left: `${s.left}%`,
            opacity: s.opacity, animation: `arena-twinkle ${s.dur}s ease-in-out ${s.del}s infinite`,
          }} />
        ))}
        <div className="absolute inset-x-0 top-0 pointer-events-none" style={{
          height: '55%', background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.07) 0%, transparent 70%)',
        }} />
        <div className="absolute bottom-0 inset-x-0 pointer-events-none" style={{
          height: '38%', background: 'linear-gradient(to top, rgba(30,27,75,0.85) 0%, transparent 100%)',
        }} />
        <div className="absolute inset-y-0 pointer-events-none" style={{
          left: '50%', width: 1, background: 'linear-gradient(to bottom, transparent, rgba(148,163,184,0.12), transparent)',
        }} />

        {/* Platform enemy */}
        <div className="absolute pointer-events-none" style={{
          top: '38%', right: 'max(12%, calc(50% - 200px))', width: 110, height: 22,
          background: 'radial-gradient(ellipse, rgba(248,113,113,0.55) 0%, transparent 100%)',
          borderRadius: '50%', filter: 'blur(5px)', animation: 'platform-pulse 2.2s ease-in-out infinite',
        }} />
        {/* Platform player */}
        <div className="absolute pointer-events-none" style={{
          bottom: '28%', left: 'max(12%, calc(50% - 200px))', width: 110, height: 22,
          background: 'radial-gradient(ellipse, rgba(74,222,128,0.55) 0%, transparent 100%)',
          borderRadius: '50%', filter: 'blur(5px)', animation: 'platform-pulse 2.2s ease-in-out 0.4s infinite',
        }} />

        {attackEvt && <TypeVfx key={attackEvt.uid} type={attackEvt.type} direction={attackEvt.attacker === 'player' ? 'ltr' : 'rtl'} uid={attackEvt.uid} moveName={attackEvt.attacker === 'player' ? playerMoves[playerIdx]?.name : undefined} />}
        {hitFlash && <div className="absolute inset-0 pointer-events-none battle-hit-flash" style={{ background: hitFlash === 'player' ? 'rgba(239,68,68,0.2)' : 'rgba(250,204,21,0.13)' }} />}
        {/* Status move animation — rendered inside sprites below */}

        {/* Floating damage */}
        {floatingDmg.map(d => {
          const color = d.isMiss ? '#94a3b8' : d.isCrit ? '#fbbf24' : d.effectiveness === 0 ? '#94a3b8' : '#ef4444';
          const pos = d.target === 'enemy'
            ? { top: '14%', right: 'max(7%, calc(50% - 220px))' }
            : { bottom: '32%', left: 'max(7%, calc(50% - 220px))' };
          return (
            <div key={d.id} className="absolute pointer-events-none" style={{
              ...pos, zIndex: 20,
              fontSize: d.isCrit ? '1.8rem' : d.effectiveness >= 2 ? '1.6rem' : d.effectiveness === 0 ? '1rem' : '1.2rem',
              fontWeight: 900, color,
              textShadow: d.isCrit ? `0 0 18px #fbbf24, 0 0 32px #f59e0b` : `0 0 12px ${color}`,
              animation: 'dmg-float 1.6s ease-out forwards', transform: 'translateX(-50%)',
            }}>
              {d.isMiss ? 'RATÉ!' : d.value === 0 && d.effectiveness === 0 ? 'IMMUNISÉ' : `−${d.value}`}
              {d.isCrit && <div style={{ fontSize: '0.6rem', textAlign: 'center', color: '#fde047', letterSpacing: '0.1em' }}>CRITIQUE !</div>}
              {!d.isMiss && d.effectiveness >= 2 && (
                <div style={{ fontSize: '0.58rem', textAlign: 'center', color: '#fde047', fontWeight: 900, letterSpacing: '0.04em', marginTop: 2 }}>
                  C'est très efficace !
                </div>
              )}
              {!d.isMiss && d.effectiveness > 0 && d.effectiveness < 1 && (
                <div style={{ fontSize: '0.52rem', textAlign: 'center', color: '#94a3b8', marginTop: 2 }}>
                  Pas très efficace…
                </div>
              )}
            </div>
          );
        })}

        {/* Enemy info + sprite */}
        <div className="absolute" style={{ top: 'calc(5% + env(safe-area-inset-top, 0px))', right: 'max(7%, calc(50% - 220px))' }}>
          <div className="bg-black/75 rounded-xl px-3 py-2 border border-slate-600/50 mb-2 min-w-[140px]"
            style={{ borderColor: isMasterTrainer ? `${trainerColor}55` : undefined, boxShadow: isMasterTrainer ? `0 0 12px ${trainerColor}33` : undefined }}>
            <div className="flex items-center gap-1.5 mb-1">
              {trainerImage && (
                <div style={{ flexShrink: 0, position: 'relative' }}>
                  {isMasterTrainer && <div style={{ position: 'absolute', inset: -3, borderRadius: 4, background: `radial-gradient(ellipse, ${trainerColor}55 0%, transparent 70%)`, animation: 'trainer-master-float 2s ease-in-out infinite' }} />}
                  <img src={trainerImage} alt="" draggable={false}
                    style={{ width: 28, height: 38, objectFit: 'contain', objectPosition: 'top center', display: 'block', position: 'relative',
                      filter: isMasterTrainer ? `drop-shadow(0 0 5px ${trainerColor}) drop-shadow(0 0 10px ${trainerColor}88)` : 'drop-shadow(0 1px 4px rgba(0,0,0,0.9))',
                      animation: trainerKoAnim ? 'trainer-ko-react 0.9s ease-out' : isMasterTrainer ? 'trainer-master-float 2s ease-in-out infinite' : undefined,
                    }} />
                </div>
              )}
              <div className="flex flex-1 justify-between items-center min-w-0">
                <span className="text-white font-black text-sm truncate">{POKEMON_BY_ID[activeEF?.pokemonId ?? 0]?.name ?? '???'}</span>
                <span className="text-slate-400 text-xs ml-1 shrink-0">Nv.{activeEF?.level}</span>
              </div>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2.5">
              <div className="h-2.5 rounded-full transition-all duration-700"
                style={{ width: `${activeEF ? (activeEF.currentHp / activeEF.maxHp) * 100 : 0}%`, background: hpColor(activeEF ? activeEF.currentHp / activeEF.maxHp : 0) }} />
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <div className="flex gap-1">
                {(() => { const sl = statusLabel(activeEF?.statusState?.condition ?? null); return sl ? <span className="font-black rounded px-1" style={{ background: sl.color + '33', color: sl.color, fontSize: '0.45rem', border: `1px solid ${sl.color}` }}>{sl.text}</span> : null; })()}
              </div>
              <span className="text-slate-400 text-xs">{activeEF?.currentHp}/{activeEF?.maxHp}</span>
            </div>
            <div className="flex gap-1 mt-1">
              {(POKEMON_TYPE[activeEF?.pokemonId ?? 0] ?? []).map(t => (
                <span key={t} className="text-white font-bold rounded px-1" style={{ background: TYPE_COLORS[t as PokemonType] ?? '#888', fontSize: '0.42rem' }}>
                  {t.toUpperCase()}
                </span>
              ))}
            </div>
          </div>
          <div className={`flex justify-end relative ${attackEvt?.attacker === 'enemy' ? 'battle-lunge-left' : ''} ${activeEF?.currentHp === 0 ? 'opacity-30' : ''} ${spriteBounce?.target === 'enemy' ? (spriteBounce.type === 'buff' ? 'pokemon-buff' : 'pokemon-debuff') : ''} ${hitEffect?.target === 'enemy' ? 'vfx-hit-target-left' : ''} ${attackEvt?.type === 'electric' && attackEvt.attacker === 'player' ? 'vfx-electric-vibrate' : ''} ${morphVfxState?.target === 'enemy' && morphVfxState.phase === 'squish' ? 'morph-squish' : ''}`}>
            {activeEF && <ShinySprite pokemonId={activeEF.pokemonId} isShiny={activeEF.isShiny ?? false} width={88} height={88} flip
              style={{ filter: spriteFilter(activeEF.pokemonId, activeEF.isShiny ?? false) }} />}
            {/* Status block overlay on enemy */}
            {statusBlockOverlay?.target === 'enemy' && <StatusBlockVfx condition={statusBlockOverlay.condition} uid={statusBlockOverlay.uid} />}
            {/* Poison bubbles on enemy */}
            {poisonBubbles?.target === 'enemy' && <PoisonBubblesVfx uid={poisonBubbles.uid} />}
            {/* Morph VFX on enemy */}
            {morphVfxState?.target === 'enemy' && morphVfxState.phase === 'blink' && <MorphBlinkOverlay uid={morphVfxState.uid} />}
            {/* Sleep applied Zzz on enemy */}
            {sleepApplied?.target === 'enemy' && <SleepAppliedZzz uid={sleepApplied.uid} />}
            {/* Paralysis applied VFX on enemy */}
            {paralysisApplied?.target === 'enemy' && <ParalysisAppliedVfx uid={paralysisApplied.uid} />}
            {/* Poison applied VFX on enemy */}
            {poisonApplied?.target === 'enemy' && <PoisonAppliedVfx uid={poisonApplied.uid} />}
            {/* Stat arrow animation on enemy */}
            {statusAnim?.target === 'enemy' && (() => {
              const up = statusAnim.positive;
              const arrowColor = up ? '#ff8c00' : '#4488ff';
              const arrowChar = up ? '▲' : '▼';
              const animName = up ? 'stat-arrow-up' : 'stat-arrow-down';
              return (
                <div key={statusAnim.uid} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, pointerEvents: 'none', zIndex: 30 }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{ fontSize: '1.5rem', fontWeight: 900, color: arrowColor, textShadow: `0 0 8px ${arrowColor}, 0 0 16px ${arrowColor}`, animation: `${animName} 1.1s ${i * 0.12}s ease-out forwards`, opacity: 0 }}>{arrowChar}</span>
                  ))}
                </div>
              );
            })()}
          </div>
          <div className="flex gap-1.5 justify-end mt-1">
            {enemyFighters.map((f, i) => (
              <div key={i} className={`w-3 h-3 rounded-full ${i === enemyIdx ? 'ring-2 ring-white' : ''} ${f.currentHp > 0 ? 'bg-red-400' : 'bg-slate-600'}`} />
            ))}
          </div>
        </div>

        {/* Player info + sprite */}
        <div className="absolute" style={{ bottom: '13%', left: 'max(7%, calc(50% - 220px))' }}>
          <div className="flex gap-1.5 mb-1">
            {playerFighters.map((f, i) => (
              <div key={i} className={`w-3 h-3 rounded-full ${i === playerIdx ? 'ring-2 ring-white' : ''} ${f.currentHp > 0 ? 'bg-green-400' : 'bg-slate-600'}`} />
            ))}
          </div>
          <div className={`relative ${attackEvt?.attacker === 'player' ? 'battle-lunge-right' : ''} ${activePF?.currentHp === 0 ? 'opacity-30' : ''} ${spriteBounce?.target === 'player' ? (spriteBounce.type === 'buff' ? 'pokemon-buff' : 'pokemon-debuff') : ''} ${hitEffect?.target === 'player' ? 'vfx-hit-target-right' : ''} ${attackEvt?.type === 'electric' && attackEvt.attacker === 'enemy' ? 'vfx-electric-vibrate' : ''} ${morphVfxState?.target === 'player' && morphVfxState.phase === 'squish' ? 'morph-squish' : ''}`}>
            {activePF && <ShinySprite pokemonId={activePF.pokemonId} isShiny={activePF.isShiny ?? false} width={96} height={96}
              style={{ filter: spriteFilter(activePF.pokemonId, activePF.isShiny ?? false, 12) }} />}
            {/* Status block overlay on player */}
            {statusBlockOverlay?.target === 'player' && <StatusBlockVfx condition={statusBlockOverlay.condition} uid={statusBlockOverlay.uid} />}
            {/* Poison bubbles on player */}
            {poisonBubbles?.target === 'player' && <PoisonBubblesVfx uid={poisonBubbles.uid} />}
            {/* Morph VFX on player */}
            {morphVfxState?.target === 'player' && morphVfxState.phase === 'blink' && <MorphBlinkOverlay uid={morphVfxState.uid} />}
            {/* Sleep applied Zzz on player */}
            {sleepApplied?.target === 'player' && <SleepAppliedZzz uid={sleepApplied.uid} />}
            {/* Paralysis applied VFX on player */}
            {paralysisApplied?.target === 'player' && <ParalysisAppliedVfx uid={paralysisApplied.uid} />}
            {/* Poison applied VFX on player */}
            {poisonApplied?.target === 'player' && <PoisonAppliedVfx uid={poisonApplied.uid} />}
            {/* Stat arrow animation on player */}
            {statusAnim?.target === 'player' && (() => {
              const up = statusAnim.positive;
              const arrowColor = up ? '#ff8c00' : '#4488ff';
              const arrowChar = up ? '▲' : '▼';
              const animName = up ? 'stat-arrow-up' : 'stat-arrow-down';
              return (
                <div key={statusAnim.uid} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, pointerEvents: 'none', zIndex: 30 }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{ fontSize: '1.5rem', fontWeight: 900, color: arrowColor, textShadow: `0 0 8px ${arrowColor}, 0 0 16px ${arrowColor}`, animation: `${animName} 1.1s ${i * 0.12}s ease-out forwards`, opacity: 0 }}>{arrowChar}</span>
                  ))}
                </div>
              );
            })()}
          </div>
          <div className="bg-black/75 rounded-xl px-3 py-2 border border-slate-600/50 mt-2 min-w-[140px]">
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-1 min-w-0">
                <span className="text-white font-black text-sm truncate">{POKEMON_BY_ID[activePF?.pokemonId ?? 0]?.name ?? '???'}</span>
                {boostActive && playerIdx === 0 && (
                  <span className="font-black shrink-0" style={{ fontSize: '0.48rem', color: '#f87171' }}>⚔️+25%</span>
                )}
              </div>
              <span className="text-slate-400 text-xs shrink-0 ml-1">Nv.{activePF?.level}</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2.5">
              <div className="h-2.5 rounded-full transition-all duration-700"
                style={{ width: `${activePF ? (activePF.currentHp / activePF.maxHp) * 100 : 0}%`, background: hpColor(activePF ? activePF.currentHp / activePF.maxHp : 0) }} />
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <div className="flex gap-1">
                {(() => { const sl = statusLabel(activePF?.statusState?.condition ?? null); return sl ? <span className="font-black rounded px-1" style={{ background: sl.color + '33', color: sl.color, fontSize: '0.45rem', border: `1px solid ${sl.color}` }}>{sl.text}</span> : null; })()}
              </div>
              <span className="text-slate-400 text-xs">{activePF?.currentHp}/{activePF?.maxHp}</span>
            </div>
            <div className="flex gap-1 mt-1">
              {(POKEMON_TYPE[activePF?.pokemonId ?? 0] ?? []).map(t => (
                <span key={t} className="text-white font-bold rounded px-1" style={{ background: TYPE_COLORS[t as PokemonType] ?? '#888', fontSize: '0.42rem' }}>
                  {t.toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* VS faded */}
        {phase !== 'end' && (
          <div className="absolute inset-x-0 top-1/2 flex justify-center pointer-events-none" style={{ transform: 'translateY(-50%)' }}>
            <div className="text-slate-500/30 font-black text-6xl">VS</div>
          </div>
        )}

        {/* End banner */}
        {phase === 'end' && (
          <>
            {won.current && CONFETTI_BATTLE.map((c, i) => (
              <div key={i} style={{
                position: 'absolute', top: 0, left: c.left, width: 9, height: 9, borderRadius: 2, background: c.color,
                '--cx': c.cx, '--cdx': c.cdx, '--cr': c.cr,
                animation: `confetti-fall ${c.dur} ${c.delay} ease-in forwards`,
                pointerEvents: 'none', zIndex: 24,
              } as React.CSSProperties} />
            ))}
            <div className="absolute inset-x-0 top-1/2 flex flex-col items-center gap-2 pointer-events-none"
              style={{ transform: 'translateY(-50%)', zIndex: 25 }}>
              {won.current ? (
                <>
                  <div style={{ fontSize: '4rem', animation: 'victory-trophy 0.7s cubic-bezier(.175,.885,.32,1.275) forwards' }}>🏆</div>
                  <div className="font-black" style={{
                    fontSize: '2.8rem',
                    background: 'linear-gradient(90deg, #fbbf24, #4ade80, #60a5fa)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 0 16px #fbbf24)',
                    animation: 'victory-title 0.6s 0.3s ease-out both',
                  }}>VICTOIRE !</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '4rem', animation: 'victory-trophy 0.6s ease-out forwards' }}>💀</div>
                  <div className="font-black text-red-400 text-4xl"
                    style={{ textShadow: '0 0 20px #ef4444', animation: 'victory-title 0.5s 0.25s ease-out both' }}>
                    DÉFAITE…
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* Switch overlay */}
        {phase === 'switch' && (
          <div className="absolute inset-0 z-30 bg-black/80 flex flex-col items-center justify-center gap-4 px-6">
            <div className="text-white font-black text-xl text-center">Choisissez votre prochain Pokémon !</div>
            <div className="flex gap-3 flex-wrap justify-center">
              {playerFighters.map((f, i) => {
                if (f.currentHp <= 0 || i === playerIdx) return null;
                const p = POKEMON_BY_ID[f.pokemonId];
                const hpPct = f.currentHp / f.maxHp;
                return (
                  <button key={i} onClick={() => handleSwitch(i)}
                    className="flex flex-col items-center bg-slate-800/90 border-2 border-slate-500 hover:border-yellow-400 rounded-2xl px-4 py-3 transition-all hover:scale-105">
                    <ShinySprite pokemonId={f.pokemonId} isShiny={f.isShiny ?? false} width={64} height={64} compact
                      style={{ filter: spriteFilter(f.pokemonId, f.isShiny ?? false, 6) }} />
                    <span className="text-white font-bold text-sm mt-1">{p?.name}</span>
                    <span className="text-slate-400 text-xs">Nv.{f.level}</span>
                    <div className="w-16 bg-slate-700 rounded-full h-2 mt-1">
                      <div className="h-2 rounded-full" style={{ width: `${hpPct * 100}%`, background: hpColor(hpPct) }} />
                    </div>
                    <span className="text-xs mt-0.5" style={{ color: hpColor(hpPct) }}>{f.currentHp}/{f.maxHp}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Transition bar between arena and UI ── */}
      <div style={{ height: 6, background: 'linear-gradient(180deg, #1a1a2e 0%, #3a3050 40%, #706890 100%)', boxShadow: '0 -2px 0 #0a0a18' }} />

      {/* ── Battle log + Move buttons ── */}
      <div className="shrink-0" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)', background: '#c8c0b0', boxShadow: 'inset 0 2px 0 #fffef8' }}>
        {/* HeartGold-style dialog box */}
        <div
          style={{
            margin: '6px 8px 4px',
            background: '#f0ece0',
            border: '3px solid #111',
            borderRadius: 6,
            boxShadow: '3px 3px 0 #111, inset 2px 2px 0 #fffef8, inset -2px -2px 0 #a09880',
            padding: '6px 12px 6px',
            minHeight: 70,
            position: 'relative',
            cursor: log.length > 0 ? 'pointer' : 'default',
          }}
          onClick={() => { if (log.length > 0) setShowFullLog(v => !v); }}
        >
          {/* Full log overlay */}
          {showFullLog && (
            <div
              style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, zIndex: 50, background: 'rgba(2,6,23,0.95)', borderRadius: '6px 6px 0 0', border: '3px solid #111', borderBottom: 'none', maxHeight: '50vh', overflowY: 'auto', padding: '6px 10px' }}
              ref={logScrollRef}
              onClick={e => { e.stopPropagation(); setShowFullLog(false); }}
            >
              {log.map((entry, i) => (
                <div key={i} style={{ color: entry.color, fontSize: '0.55rem', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.8 }}>{entry.text}</div>
              ))}
            </div>
          )}
          {/* History icon */}
          {log.length > 0 && (
            <span style={{ position: 'absolute', top: 3, right: 8, fontSize: '0.55rem', color: '#706890', opacity: 0.7 }}>📜</span>
          )}
          {/* Previous lines (history) */}
          {hgDialog.prevLines.map((line, i) => (
            <div key={i} style={{ fontSize: '0.52rem', color: '#888', lineHeight: 1.75, fontFamily: "'Press Start 2P', monospace", opacity: 0.4 + i * 0.25 }}>
              {line || ' '}
            </div>
          ))}
          {/* Current line (typing) */}
          <div style={{ fontSize: '0.52rem', color: '#111', lineHeight: 1.75, fontFamily: "'Press Start 2P', monospace", minHeight: '0.9rem' }}>
            {hgDialog.curLine}
            {!hgDialog.showArrow && hgDialog.curLine.length < hgDialog.curFull.length && (
              <span style={{ display: 'inline-block', width: 6, height: 10, background: '#333', verticalAlign: 'middle', marginLeft: 1, animation: 'hg-blink-cursor 0.55s step-end infinite' }} />
            )}
          </div>
          {/* Blinking ▼ arrow when done */}
          {hgDialog.showArrow && (
            <span style={{ position: 'absolute', bottom: 4, right: 10, fontSize: '0.6rem', color: '#706890', animation: 'hg-blink-arrow 0.7s step-end infinite' }}>▼</span>
          )}
        </div>

        {/* Long press tooltip */}
        {tooltipMoveIdx !== null && playerMoves[tooltipMoveIdx] && (() => {
          const m = playerMoves[tooltipMoveIdx];
          const pp = activePF?.currentPP[tooltipMoveIdx] ?? 0;
          const typeColor = TYPE_COLORS[m.type as PokemonType] ?? '#475569';
          return (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70"
              onPointerUp={() => setTooltipMoveIdx(null)}
              onTouchEnd={() => setTooltipMoveIdx(null)}>
              <div className="mx-4 rounded-2xl p-4 max-w-xs w-full"
                style={{ background: '#0f172a', border: `2px solid ${typeColor}`, boxShadow: `0 0 24px ${typeColor}66` }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-black text-white text-base">{m.name}</span>
                  <span className="px-2 py-0.5 rounded text-white font-bold text-xs" style={{ background: typeColor }}>{m.type.toUpperCase()}</span>
                  {m.highCrit && <span className="text-yellow-400 text-xs">⚡ Crit+</span>}
                  {m.multiHit && <span className="text-purple-400 text-xs">×2–5</span>}
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                  <div className="bg-slate-800 rounded-lg py-1.5">
                    <div className="text-slate-400 text-xs">Puissance</div>
                    <div className="text-white font-black">{m.power > 0 ? m.power : '—'}</div>
                  </div>
                  <div className="bg-slate-800 rounded-lg py-1.5">
                    <div className="text-slate-400 text-xs">Précision</div>
                    <div className="text-white font-black">{m.accuracy ?? 100}%</div>
                  </div>
                  <div className="bg-slate-800 rounded-lg py-1.5">
                    <div className="text-slate-400 text-xs">PP</div>
                    <div className="font-black" style={{ color: pp === 0 ? '#ef4444' : pp <= 2 ? '#f59e0b' : '#4ade80' }}>{pp}/{m.pp}</div>
                  </div>
                </div>
                <div className="text-slate-400 text-xs mb-1 uppercase tracking-wide">
                  {m.category === 'status' ? 'Statut' : m.category === 'physical' ? 'Physique' : 'Spécial'}
                </div>
                {m.description && <div className="text-slate-200 text-sm">{m.description}</div>}
                <div className="mt-3 text-center text-slate-500 text-xs">Relâchez pour fermer</div>
              </div>
            </div>
          );
        })()}

        {/* Move selection — shown during player_turn */}
        {(phase === 'player_turn' || phase === 'resolving') && (
          <div className="px-2 pb-2 pt-1">
            {playerMoves.length > 0 ? (
              <div className="grid grid-cols-2 gap-1.5">
                {playerMoves.map((move, i) => {
                  const pp = activePF?.currentPP[i] ?? 0;
                  const isCharging = !!(activePF?.chargingMove);
                  const isThisChargingMove = activePF?.chargingMove?.moveIndex === i;
                  const disabled = phase === 'resolving' || pp <= 0 || !!autoCombat || !!(pvpControls?.isWaiting) || isCharging;
                  const typeColor = TYPE_COLORS[move.type as PokemonType] ?? '#888';
                  const ppLow = pp <= Math.floor((move.pp ?? 15) / 4);
                  return (
                    <button key={i}
                      disabled={disabled}
                      onPointerDown={() => !disabled && startLongPress(i)}
                      onPointerUp={() => !disabled && endLongPress(i)}
                      onPointerLeave={() => { if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressFiredRef.current = false; } }}
                      onTouchStart={e => { e.preventDefault(); !disabled && startLongPress(i); }}
                      onTouchEnd={e => { e.preventDefault(); !disabled && endLongPress(i); }}
                      onClick={e => e.preventDefault()}
                      className="relative text-left select-none"
                      style={{
                        background: disabled && !isThisChargingMove ? '#d8d0c0' : '#f0ece0',
                        border: isThisChargingMove ? `3px dashed #e8a000` : `3px solid ${typeColor}`,
                        borderRadius: 6,
                        boxShadow: `2px 2px 0 #111, inset 2px 2px 0 #fffef8, inset -2px -2px 0 #c0b8a8`,
                        padding: '6px 10px 5px',
                        opacity: disabled && !isThisChargingMove ? 0.55 : 1,
                        WebkitTapHighlightColor: 'transparent',
                      }}>
                      <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.52rem', color: '#111', lineHeight: 1.4, marginBottom: 4 }}>
                        {isThisChargingMove ? '☀️ Prêt !' : move.name}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span style={{
                          fontFamily: "'Press Start 2P', monospace", fontSize: '0.38rem', fontWeight: 700,
                          background: typeColor, color: 'white', padding: '1px 4px', borderRadius: 3,
                        }}>{move.type.slice(0,6).toUpperCase()}</span>
                        <span style={{
                          fontFamily: "'Press Start 2P', monospace", fontSize: '0.34rem',
                          background: move.category === 'physical' ? '#c84020' : move.category === 'special' ? '#4060c8' : '#508030',
                          color: 'white', padding: '1px 3px', borderRadius: 3,
                        }}>{move.category === 'physical' ? 'PHY' : move.category === 'special' ? 'SPÉ' : 'STA'}</span>
                        <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.42rem', color: ppLow ? '#c00' : '#333' }}>
                          PP {pp}/{move.pp ?? 15}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : allPPEmpty ? (
              <button
                disabled={phase === 'resolving'}
                onPointerUp={() => {
                  if (phase !== 'player_turn') return;
                  if (pvpControls) { pvpControls.onMoveSelect(0); phaseRef.current = 'resolving'; setPhase('resolving'); }
                  else executeTurn(0);
                }}
                className="w-full text-center"
                style={{ background: '#f0ece0', border: '3px solid #706890', borderRadius: 6, boxShadow: '2px 2px 0 #111, inset 2px 2px 0 #fffef8, inset -2px -2px 0 #c0b8a8', padding: '10px', opacity: phase === 'resolving' ? 0.5 : 1 }}>
                <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.55rem', color: '#111' }}>Lutte</span>
              </button>
            ) : null}

            {pvpControls?.isWaiting && (
              <div className="mt-1.5 py-2.5 rounded text-center text-slate-400 text-xs animate-pulse"
                style={{ background: '#1e293b', border: '1px solid #334155', fontFamily: "'Press Start 2P', monospace", fontSize: '0.45rem' }}>
                ⏳ En attente de l'adversaire…
              </div>
            )}

            {(phase === 'player_turn' || phase === 'resolving') && !pvpControls && (
              <div className="mt-1.5 flex gap-1.5" style={{ opacity: phase === 'resolving' ? 0.45 : 1, pointerEvents: phase === 'resolving' ? 'none' : 'auto' }}>
                {playerFighters.filter((f, i) => i !== playerIdx && f.currentHp > 0).length > 0 && (
                  <button
                    onClick={() => setSwitchMenuOpen(true)}
                    className="flex-1 flex items-center justify-center"
                    style={{
                      background: '#3060c8', border: '3px solid #1a3880', borderRadius: 6,
                      boxShadow: '2px 2px 0 #111, inset 2px 2px 0 #6090e8, inset -2px -2px 0 #182860',
                      padding: '7px 4px',
                      fontFamily: "'Press Start 2P', monospace", fontSize: '0.42rem', color: 'white',
                      WebkitTapHighlightColor: 'transparent',
                    }}>
                    CHANGER
                  </button>
                )}
                {onQuit && (
                  <button
                    onClick={onQuit}
                    className="flex-1 flex items-center justify-center"
                    style={{
                      background: '#3060c8', border: '3px solid #1a3880', borderRadius: 6,
                      boxShadow: '2px 2px 0 #111, inset 2px 2px 0 #6090e8, inset -2px -2px 0 #182860',
                      padding: '7px 4px',
                      fontFamily: "'Press Start 2P', monospace", fontSize: '0.42rem', color: 'white',
                      WebkitTapHighlightColor: 'transparent',
                    }}>
                    FUITE
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Voluntary switch menu */}
        {switchMenuOpen && (
          <div className="absolute inset-0 z-50 bg-black/85 flex flex-col items-center justify-center gap-3 px-5">
            <div className="text-white font-black text-base text-center">Changer de Pokémon</div>
            <div className="text-slate-400 text-xs text-center mb-1">L'ennemi attaquera pendant le changement</div>
            <div className="flex flex-col gap-2 w-full max-w-xs">
              {playerFighters.map((f, i) => {
                if (i === playerIdx || f.currentHp <= 0) return null;
                const p = POKEMON_BY_ID[f.pokemonId];
                const hpPct = f.currentHp / f.maxHp;
                const hpCol = hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#f59e0b' : '#ef4444';
                return (
                  <button key={i} onClick={() => handleVoluntarySwitch(i)}
                    className="flex items-center gap-3 bg-slate-800/90 border-2 border-slate-600 hover:border-yellow-400 rounded-xl px-3 py-2 transition-all text-left">
                    <ShinySprite pokemonId={f.pokemonId} isShiny={f.isShiny ?? false} width={48} height={48} compact
                      style={{ filter: spriteFilter(f.pokemonId, f.isShiny ?? false, 6), flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-bold text-sm">{p?.name}</div>
                      <div className="text-slate-400 text-xs">Nv.{f.level}</div>
                      <div className="w-full bg-slate-700 rounded-full h-1.5 mt-1">
                        <div className="h-1.5 rounded-full" style={{ width: `${hpPct * 100}%`, background: hpCol }} />
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: hpCol }}>{f.currentHp}/{f.maxHp} PV</div>
                    </div>
                  </button>
                );
              })}
            </div>
            <button onClick={() => setSwitchMenuOpen(false)} className="mt-1 text-slate-500 hover:text-slate-300 text-xs py-1">
              Annuler
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
