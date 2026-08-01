import type { GameStore } from '../store/gameStore';

/**
 * Screen identifiers for the game application.
 * Screens are navigated in sequence based on game state.
 */
export type Screen =
  | 'landing'
  | 'avatar-setup'
  | 'lobby'
  | 'room-lobby'
  | 'game'
  | 'match-summary'
  | 'save-progress'
  | 'leaderboard';

/**
 * State shape used by the screen router to derive the active screen.
 * This is a subset of GameStore relevant to navigation decisions.
 */
export interface ScreenRouterState {
  session: GameStore['session'];
  room: GameStore['room'];
  round: GameStore['round'];
  matchResults: GameStore['matchResults'];
  hasPassedLanding: boolean;
}

/**
 * Derives the active screen from the current game state.
 *
 * Navigation rules:
 * - Haven't passed landing yet → Landing
 * - No session → Landing
 * - Session but no avatar/name completed → AvatarSetup
 * - Session with avatar but no room → Lobby
 * - Room in 'waiting' status → RoomLobby
 * - Room in 'in_progress' with active round → Game
 * - Match results present → MatchSummary
 * - Room completed without match results → Leaderboard
 */
export function deriveScreen(state: ScreenRouterState): Screen {
  const { session, room, round, matchResults, hasPassedLanding } = state;

  // Always show landing first on fresh page load
  if (!hasPassedLanding) {
    return 'landing';
  }

  // Passed landing but no session yet → avatar setup (guest creation happens on Continue)
  if (!session) {
    return 'avatar-setup';
  }

  // Session exists but no avatar or display name set → avatar setup
  if (!session.avatarId || !session.displayName) {
    return 'avatar-setup';
  }

  // Match results are available → show match summary
  if (matchResults) {
    return 'match-summary';
  }

  // No room joined → lobby to create/join
  if (!room) {
    return 'lobby';
  }

  // Room is waiting for players → room lobby
  if (room.status === 'waiting') {
    return 'room-lobby';
  }

  // Room is in progress with an active round → game screen
  if (room.status === 'in_progress' && round) {
    return 'game';
  }

  // Room completed → leaderboard
  if (room.status === 'completed') {
    return 'leaderboard';
  }

  // Fallback: room in progress but no round data yet → game screen (waiting for round:start)
  if (room.status === 'in_progress') {
    return 'game';
  }

  return 'lobby';
}
