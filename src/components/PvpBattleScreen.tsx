/**
 * PvpBattleScreen — wraps BattleScreen for PvP with Supabase Realtime turn sync.
 *
 * Host (challenger): calculates damage via calcDamage, broadcasts full PvpTurnPayload.
 * Guest (challenged): receives PvpTurnPayload, applies results without recalculating.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { BattleScreen } from './BattleScreen';
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

export function PvpBattleScreen({ session, isHost, myTeam, opponentTeam, opponentName, userId, pokemonCustomMoves, onBattleEnd }: Props) {
  const [isWaiting, setIsWaiting] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<PvpPayload | null>(null);
  const [forceEnd, setForceEnd] = useState<boolean | null>(null);
  const [opponentSwitchIdx, setOpponentSwitchIdx] = useState<number | null>(null);
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
      // Trigger victory/defeat screen via BattleScreen forceEnd
      setForceEnd(won);
      // Give BattleScreen time to show end screen, then cleanup
      setTimeout(() => onBattleEnd(won), 3000);
    });
    return () => { supabase.removeChannel(chan); };
  }, [session.id, userId, onBattleEnd]);

  useEffect(() => {
    const channel = getPvpBattleChannel(session.id);
    channelRef.current = channel;

    channel.on('broadcast', { event: 'player_move' }, ({ payload }) => {
      if (!isHost) return; // guest doesn't need to listen for this
      const { moveIndex } = payload as { moveIndex: number };
      opponentMoveRef.current = moveIndex;
      tryStartTurn();
    });

    channel.on('broadcast', { event: 'pvp_switch' }, ({ payload }) => {
      const { switchIdx } = payload as { switchIdx: number };
      // Reset to null first so useEffect re-fires if same index selected again
      setOpponentSwitchIdx(null);
      setTimeout(() => setOpponentSwitchIdx(switchIdx), 0);
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

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id, isHost]);

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
    setIsWaiting(true);
    if (isHost) {
      // Host waits for guest's move broadcast
      tryStartTurn();
    } else {
      // Guest broadcasts move to host
      channelRef.current?.send({ type: 'broadcast', event: 'player_move', payload: { moveIndex } });
    }
  }, [isHost, tryStartTurn]);

  const handleTurnComputed = useCallback((payload: { playerMoveIndex: number; enemyMoveIndex: number; pResult: unknown; eResult: unknown }) => {
    // Host: broadcast full payload to guest, then reset state
    channelRef.current?.send({ type: 'broadcast', event: 'turn_payload', payload });
    // Reset for next turn
    myMoveRef.current = null;
    opponentMoveRef.current = null;
    setPendingPayload(null);
  }, []);

  const handleBattleEnd = useCallback(async (won: boolean) => {
    if (battleEndedRef.current) return;
    battleEndedRef.current = true;
    const winnerId = won ? userId : (isHost ? session.guest_id : session.host_id);
    await finishSession(session.id, winnerId);
    onBattleEnd(won);
  }, [userId, isHost, session, onBattleEnd]);

  const handleAbandon = useCallback(async () => {
    if (battleEndedRef.current) return;
    battleEndedRef.current = true;
    const winnerId = isHost ? session.guest_id : session.host_id;
    await finishSession(session.id, winnerId);
    onBattleEnd(false);
  }, [isHost, session, onBattleEnd]);

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
      pvpControls={{
        isWaiting,
        onMoveSelect: handleMoveSelect,
        pendingPayload: pendingPayload as Parameters<typeof BattleScreen>[0]['pvpControls'] extends { pendingPayload: infer T } ? T : never,
        onTurnComputed: isHost ? handleTurnComputed : undefined,
        onAbandon: handleAbandon,
        forceEnd,
        onSwitch: (newIdx: number) => {
          channelRef.current?.send({ type: 'broadcast', event: 'pvp_switch', payload: { switchIdx: newIdx } });
        },
        opponentSwitchIdx,
      }}
    />
  );
}
