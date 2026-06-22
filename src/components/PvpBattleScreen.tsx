/**
 * PvpBattleScreen — wraps BattleScreen for PvP with Supabase Realtime turn sync.
 *
 * Host (challenger): calculates damage via calcDamage, broadcasts full PvpTurnPayload.
 * Guest (challenged): receives PvpTurnPayload, applies results without recalculating.
 *
 * Both players share their pokemonCustomMoves at battle start so the host can
 * correctly compute move names/types for the guest's pokemon.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { BattleScreen } from './BattleScreen';
import type { PvpPersistedState, PvpStateSync } from './BattleScreen';
import { getPvpBattleChannel, finishSession, subscribeToSession } from '../lib/pvp';
import type { PvpSession } from '../lib/pvp';
import type { TeamMember } from './TeamBuilder';
import { supabase } from '../lib/supabase';

interface Props {
  session: PvpSession;
  isHost: boolean;
  myTeam: TeamMember[];
  opponentTeam: TeamMember[];
  opponentName: string;
  userId: string;
  pokemonCustomMoves?: Record<number, string[]>;
  onBattleEnd: (won: boolean) => void;
  onQuit: () => void;
}

type PvpPayload = {
  playerMoveIndex: number;
  enemyMoveIndex: number;
  pResult?: Record<string, unknown>;
  eResult?: Record<string, unknown>;
};

const pvpStateKey = (sessionId: string) => `pvp_state_${sessionId}`;

export function PvpBattleScreen({ session, isHost, myTeam, opponentTeam, opponentName, userId, pokemonCustomMoves, onBattleEnd }: Props) {
  const [isWaiting, setIsWaiting] = useState(false);
  const [pendingStateSync, setPendingStateSync] = useState<PvpStateSync | null>(null);
  const lastSentMoveRef = useRef<number | null>(null);
  const [savedState] = useState<PvpPersistedState | null>(() => {
    try {
      const raw = localStorage.getItem(pvpStateKey(session.id));
      return raw ? (JSON.parse(raw) as PvpPersistedState) : null;
    } catch { return null; }
  });
  const [pendingPayload, setPendingPayload] = useState<PvpPayload | null>(null);
  const [forceEnd, setForceEnd] = useState<boolean | null>(null);
  const [opponentSwitchIdx, setOpponentSwitchIdx] = useState<number | null>(null);
  const [opponentVoluntarySwitchIdx, setOpponentVoluntarySwitchIdx] = useState<number | null>(null);
  const [opponentCustomMoves, setOpponentCustomMoves] = useState<Record<number, string[]>>({});
  const [opponentIsSwitching, setOpponentIsSwitching] = useState(false);
  const myMoveRef = useRef<number | null>(null);
  const opponentMoveRef = useRef<number | null>(null);
  const channelRef = useRef<ReturnType<typeof getPvpBattleChannel> | null>(null);
  const battleEndedRef = useRef(false);

  // Subscribe to session updates so we know when the opponent abandons (session becomes 'finished')
  useEffect(() => {
    const chan = subscribeToSession(session.id, updated => {
      if (updated.status !== 'finished') return;
      if (battleEndedRef.current) return;
      battleEndedRef.current = true;
      const won = updated.winner_id === userId;
      // Trigger victory/defeat screen via BattleScreen forceEnd — user clicks FERMER to proceed
      setForceEnd(won);
    });
    return () => { supabase.removeChannel(chan); };
  }, [session.id, userId]);

  useEffect(() => {
    const channel = getPvpBattleChannel(session.id);
    channelRef.current = channel;

    channel.on('broadcast', { event: 'player_move' }, ({ payload }) => {
      if (!isHost) return; // guest doesn't need to listen for this
      const { moveIndex } = payload as { moveIndex: number };
      opponentMoveRef.current = moveIndex;
      tryStartTurn();
    });

    // Opponent signals they need to pick a replacement after KO
    channel.on('broadcast', { event: 'pvp_needs_switch' }, () => {
      setOpponentIsSwitching(true);
    });

    // KO-forced switch (opponent selected new pokemon after their pokemon fainted)
    channel.on('broadcast', { event: 'pvp_switch' }, ({ payload }) => {
      const { switchIdx } = payload as { switchIdx: number };
      setOpponentIsSwitching(false);
      setOpponentSwitchIdx(null);
      setTimeout(() => setOpponentSwitchIdx(switchIdx), 0);
    });

    // Voluntary switch (free action, no KO involved)
    channel.on('broadcast', { event: 'pvp_voluntary_switch' }, ({ payload }) => {
      const { switchIdx } = payload as { switchIdx: number };
      setOpponentVoluntarySwitchIdx(null);
      setTimeout(() => setOpponentVoluntarySwitchIdx(switchIdx), 0);
    });

    channel.on('broadcast', { event: 'turn_payload' }, ({ payload }) => {
      if (isHost) return; // host calculates, guest applies
      const full = payload as PvpPayload;
      // Guest: flip perspective — my moves are "enemy" from host's view
      const guestPayload: PvpPayload = {
        playerMoveIndex: full.enemyMoveIndex,
        enemyMoveIndex: full.playerMoveIndex,
        pResult: full.eResult,
        eResult: full.pResult,
      };
      // Reset first so BattleScreen's useEffect always sees a fresh change
      setPendingPayload(null);
      setTimeout(() => { setPendingPayload(guestPayload); setIsWaiting(false); }, 0);
    });

    // Opponent shares their pokemon custom moves so damage/names compute correctly
    channel.on('broadcast', { event: 'custom_moves_share' }, ({ payload }) => {
      const { customMoves } = payload as { customMoves: Record<number, string[]> };
      if (customMoves) setOpponentCustomMoves(customMoves);
    });

    // Guest receives host's authoritative state sync after each turn
    channel.on('broadcast', { event: 'pvp_state_sync' }, ({ payload }) => {
      if (isHost) return;
      setPendingStateSync(payload as PvpStateSync);
    });

    channel.subscribe();

    // Broadcast own custom moves after subscribe; retry once in case opponent subscribed late
    const sendMoves = () => {
      channel.send({ type: 'broadcast', event: 'custom_moves_share', payload: { customMoves: pokemonCustomMoves ?? {} } });
    };
    setTimeout(sendMoves, 400);
    setTimeout(sendMoves, 2500);

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id, isHost]);

  // Retry: guest re-broadcasts player_move every 4s while waiting (handles dropped broadcasts)
  useEffect(() => {
    if (!isWaiting || isHost || lastSentMoveRef.current === null) return;
    const move = lastSentMoveRef.current;
    const id = setInterval(() => {
      if (!isWaiting || lastSentMoveRef.current === null) { clearInterval(id); return; }
      channelRef.current?.send({ type: 'broadcast', event: 'player_move', payload: { moveIndex: move } });
    }, 4000);
    return () => clearInterval(id);
  }, [isWaiting, isHost]);

  // Retry: host re-checks if both moves are already available (handles state sync issues)
  useEffect(() => {
    if (!isWaiting || !isHost) return;
    const id = setInterval(() => {
      if (myMoveRef.current !== null && opponentMoveRef.current !== null) tryStartTurn();
    }, 2000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWaiting, isHost]);

  const tryStartTurn = useCallback(() => {
    if (!isHost) return;
    const myMove = myMoveRef.current;
    const opMove = opponentMoveRef.current;
    if (myMove === null || opMove === null) return;
    // No pResult/eResult — BattleScreen (host) will compute them then call onTurnComputed
    setPendingPayload({ playerMoveIndex: myMove, enemyMoveIndex: opMove });
    setIsWaiting(false);
  }, [isHost]);

  const handleMoveSelect = useCallback((moveIndex: number) => {
    myMoveRef.current = moveIndex;
    lastSentMoveRef.current = moveIndex;
    setIsWaiting(true);
    if (isHost) {
      tryStartTurn();
    } else {
      channelRef.current?.send({ type: 'broadcast', event: 'player_move', payload: { moveIndex } });
    }
  }, [isHost, tryStartTurn]);

  const handleTurnComputed = useCallback((payload: { playerMoveIndex: number; enemyMoveIndex: number; pResult: unknown; eResult: unknown }) => {
    channelRef.current?.send({ type: 'broadcast', event: 'turn_payload', payload });
    myMoveRef.current = null;
    opponentMoveRef.current = null;
    lastSentMoveRef.current = null;
    setPendingPayload(null);
  }, []);

  const handleTurnResolved = useCallback((sync: PvpStateSync) => {
    // Host broadcasts authoritative state to guest after each turn
    channelRef.current?.send({ type: 'broadcast', event: 'pvp_state_sync', payload: sync });
  }, []);

  const handleSwitchNeeded = useCallback(() => {
    channelRef.current?.send({ type: 'broadcast', event: 'pvp_needs_switch', payload: {} });
  }, []);

  const handleBattleEnd = useCallback(async (won: boolean) => {
    try { localStorage.removeItem(pvpStateKey(session.id)); } catch {}
    if (!battleEndedRef.current) {
      battleEndedRef.current = true;
      const winnerId = won ? userId : (isHost ? session.guest_id : session.host_id);
      try { await finishSession(session.id, winnerId); } catch {}
    }
    onBattleEnd(won);
  }, [userId, isHost, session, onBattleEnd]);

  const handleAbandon = useCallback(async () => {
    if (battleEndedRef.current) return;
    battleEndedRef.current = true;
    try { localStorage.removeItem(pvpStateKey(session.id)); } catch {}
    const winnerId = isHost ? session.guest_id : session.host_id;
    try { await finishSession(session.id, winnerId); } catch {}
    setForceEnd(false);
  }, [isHost, session]);

  return (
    <BattleScreen
      playerTeam={myTeam}
      enemyTeam={opponentTeam}
      bossName={opponentName}
      onBattleEnd={handleBattleEnd}
      onQuit={handleAbandon}
      suppressVictorySound={false}
      keepMusic={false}
      pokemonCustomMoves={pokemonCustomMoves}
      enemyPokemonCustomMoves={opponentCustomMoves}
      pvpControls={{
        isWaiting,
        onMoveSelect: handleMoveSelect,
        pendingPayload: pendingPayload as Parameters<typeof BattleScreen>[0]['pvpControls'] extends { pendingPayload: infer T } ? T : never,
        onTurnComputed: isHost ? handleTurnComputed : undefined,
        onTurnResolved: isHost ? handleTurnResolved : undefined,
        pendingStateSync,
        onAbandon: handleAbandon,
        forceEnd,
        onSwitchNeeded: handleSwitchNeeded,
        opponentIsSwitching,
        onSwitch: (newIdx: number, voluntary?: boolean) => {
          if (voluntary) {
            channelRef.current?.send({ type: 'broadcast', event: 'pvp_voluntary_switch', payload: { switchIdx: newIdx } });
          } else {
            channelRef.current?.send({ type: 'broadcast', event: 'pvp_switch', payload: { switchIdx: newIdx } });
          }
        },
        opponentSwitchIdx,
        opponentVoluntarySwitchIdx,
        sessionId: session.id,
        savedState,
      }}
    />
  );
}
