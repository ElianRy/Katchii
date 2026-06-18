/**
 * PvP — Supabase Realtime / postgres_changes helpers
 *
 * SQL à exécuter dans l'éditeur Supabase avant d'utiliser ce module :
 *
 * CREATE TABLE IF NOT EXISTS pvp_challenges (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   challenger_id   UUID NOT NULL,
 *   challenger_name TEXT NOT NULL,
 *   challenged_id   UUID NOT NULL,
 *   status TEXT NOT NULL DEFAULT 'pending',   -- 'pending'|'accepted'|'declined'|'cancelled'
 *   created_at TIMESTAMPTZ DEFAULT now()
 * );
 * ALTER TABLE pvp_challenges ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "pvp_challenges_all" ON pvp_challenges USING (auth.uid() = challenger_id OR auth.uid() = challenged_id) WITH CHECK (auth.uid() = challenger_id);
 *
 * CREATE TABLE IF NOT EXISTS pvp_sessions (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   challenge_id UUID REFERENCES pvp_challenges(id),
 *   host_id   UUID NOT NULL,
 *   guest_id  UUID NOT NULL,
 *   host_team  JSONB,
 *   guest_team JSONB,
 *   host_ready  BOOLEAN DEFAULT false,
 *   guest_ready BOOLEAN DEFAULT false,
 *   status TEXT NOT NULL DEFAULT 'team_select',  -- 'team_select'|'active'|'finished'
 *   winner_id UUID,
 *   created_at TIMESTAMPTZ DEFAULT now()
 * );
 * ALTER TABLE pvp_sessions ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "pvp_sessions_all" ON pvp_sessions USING (auth.uid() = host_id OR auth.uid() = guest_id);
 */

import { supabase } from './supabase';
import type { TeamMember } from '../components/TeamBuilder';
import type { PokemonType } from '../data/pokemonTypes';

// ── Types ────────────────────────────────────────────────────────────────────

export interface PvpChallenge {
  id: string;
  challenger_id: string;
  challenger_name: string;
  challenged_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  created_at: string;
}

export interface PvpSession {
  id: string;
  challenge_id: string;
  host_id: string;
  guest_id: string;
  host_team: TeamMember[] | null;
  guest_team: TeamMember[] | null;
  host_ready: boolean;
  guest_ready: boolean;
  status: 'team_select' | 'active' | 'finished';
  winner_id: string | null;
}

// Résultat sérialisable d'une attaque (transmis par le host via broadcast)
export interface PvpMoveResult {
  damage: number;
  effectiveness: number;
  moveName: string;
  isCrit: boolean;
  isMiss: boolean;
  moveType: PokemonType;
  recoil: number;
  hits: number;
  appliedStatus?: string | null;
  statBoost?: { stat: string; target: 'self' | 'foe'; stages: number } | null;
  drainHeal?: number;
  allStatBoosted?: boolean;
  appliedSeed?: boolean;
  failedSpecial?: string;
}

// Payload broadcasté après chaque tour par le host
export interface PvpTurnPayload {
  turnNumber: number;
  playerMoveIndex: number;
  enemyMoveIndex: number;
  pResult: PvpMoveResult;
  eResult: PvpMoveResult;
}

// ── Challenge ────────────────────────────────────────────────────────────────

export async function sendChallenge(
  challengerId: string,
  challengerName: string,
  challengedId: string,
): Promise<{ challenge: PvpChallenge | null; errorMsg?: string }> {
  // Annuler les défis en attente de ce challenger
  await supabase
    .from('pvp_challenges')
    .update({ status: 'cancelled' })
    .eq('challenger_id', challengerId)
    .eq('status', 'pending');

  const { data, error } = await supabase
    .from('pvp_challenges')
    .insert({ challenger_id: challengerId, challenger_name: challengerName, challenged_id: challengedId })
    .select()
    .single();
  if (error) {
    console.error('[pvp] sendChallenge:', error);
    return { challenge: null, errorMsg: `${error.code ?? ''} ${error.message ?? ''}`.trim() };
  }
  return { challenge: data as PvpChallenge };
}

export async function cancelChallenge(challengeId: string): Promise<void> {
  await supabase.from('pvp_challenges').update({ status: 'cancelled' }).eq('id', challengeId);
}

export async function acceptChallenge(
  challengeId: string,
  hostId: string,
  guestId: string,
): Promise<PvpSession | null> {
  const { data, error } = await supabase
    .from('pvp_sessions')
    .insert({ challenge_id: challengeId, host_id: hostId, guest_id: guestId })
    .select()
    .single();
  if (error) { console.error('[pvp] acceptChallenge:', error); return null; }
  await supabase.from('pvp_challenges').update({ status: 'accepted' }).eq('id', challengeId);
  // Broadcast directly to challenger — more reliable than postgres_changes
  await supabase.channel(`pvp_signal_${challengeId}`)
    .send({ type: 'broadcast', event: 'challenge_response', payload: { status: 'accepted', sessionId: data.id } });
  return data as PvpSession;
}

export async function declineChallenge(challengeId: string): Promise<void> {
  await supabase.from('pvp_challenges').update({ status: 'declined' }).eq('id', challengeId);
  await supabase.channel(`pvp_signal_${challengeId}`)
    .send({ type: 'broadcast', event: 'challenge_response', payload: { status: 'declined' } });
}

// Récupère le défi en attente envoyé par challengerId à challengedId
export async function getPendingChallenge(
  challengerId: string,
  challengedId: string,
): Promise<PvpChallenge | null> {
  const { data } = await supabase
    .from('pvp_challenges')
    .select()
    .eq('challenger_id', challengerId)
    .eq('challenged_id', challengedId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as PvpChallenge | null;
}

// ── Session ──────────────────────────────────────────────────────────────────

export async function submitTeam(
  sessionId: string,
  isHost: boolean,
  team: TeamMember[],
): Promise<void> {
  const update = isHost
    ? { host_team: team, host_ready: true }
    : { guest_team: team, guest_ready: true };
  await supabase.from('pvp_sessions').update(update).eq('id', sessionId);
}

export async function activateSession(sessionId: string): Promise<void> {
  await supabase.from('pvp_sessions').update({ status: 'active' }).eq('id', sessionId);
}

export async function finishSession(sessionId: string, winnerId: string): Promise<void> {
  await supabase.from('pvp_sessions').update({ status: 'finished', winner_id: winnerId }).eq('id', sessionId);
}

// ── Subscriptions ────────────────────────────────────────────────────────────

export function subscribeToIncomingChallenges(
  userId: string,
  onChallenge: (c: PvpChallenge) => void,
) {
  return supabase
    .channel(`pvp_in_${userId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'pvp_challenges',
      filter: `challenged_id=eq.${userId}`,
    }, p => onChallenge(p.new as PvpChallenge))
    .subscribe();
}

// Broadcast-based subscription (replaces postgres_changes for challenge status)
export function subscribeToChallengeResponse(
  challengeId: string,
  onResponse: (status: 'accepted' | 'declined', sessionId?: string) => void,
) {
  return supabase
    .channel(`pvp_signal_${challengeId}`)
    .on('broadcast', { event: 'challenge_response' }, ({ payload }) => {
      onResponse(payload.status, payload.sessionId);
    })
    .subscribe();
}

export function subscribeToSession(
  sessionId: string,
  onUpdate: (s: PvpSession) => void,
) {
  return supabase
    .channel(`pvp_sess_${sessionId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'pvp_sessions',
      filter: `id=eq.${sessionId}`,
    }, p => onUpdate(p.new as PvpSession))
    .subscribe();
}

// Canal broadcast pour les moves pendant le combat
export function getPvpBattleChannel(sessionId: string) {
  return supabase.channel(`pvp_battle_${sessionId}`);
}
