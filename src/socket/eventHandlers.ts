import { useGameStore } from '../store/gameStore';
import { socketHandler } from './socketHandler';
import { playSound } from '../audio/soundManager';
import { showToast } from '../components/toastStore';
import type {
  StateSnapshot,
  RoundStartPayload,
  GraceStartedPayload,
  RoundLockedPayload,
  RoundResultsPayload,
  MatchSummaryPayload,
  PlayerConnectedPayload,
  PlayerDisconnectedPayload,
  PlayerReconnectedPayload,
  PlayerEliminatedPayload,
  AnswerAckPayload,
  StateTransitionPayload,
  SocketErrorPayload,
  ValidationErrorPayload,
} from '../types';

/**
 * A non-host player intentionally left the room.
 */
function handlePlayerLeft(payload: unknown): void {
  const data = payload as { userId: string; displayName: string };
  if (!data?.userId) {
    console.error('[EventHandler] Invalid player-left payload:', payload);
    return;
  }

  const store = useGameStore.getState();
  const room = store.room;
  if (!room) return;

  store.setRoom({
    ...room,
    players: room.players.filter((p) => p.id !== data.userId && p.userId !== data.userId),
  });

  if (data.displayName) {
    showToast(`${data.displayName} left the room`, 'info');
  }
}

/**
 * Host left — leadership transferred to another player.
 */
function handleHostChanged(payload: unknown): void {
  const data = payload as { newHostId: string; displayName: string };
  if (!data?.newHostId) {
    console.error('[EventHandler] Invalid host-changed payload:', payload);
    return;
  }

  const store = useGameStore.getState();
  const room = store.room;
  if (!room) return;

  store.setRoom({ ...room, hostId: data.newHostId });

  const myUserId = store.session?.userId;
  if (data.newHostId === myUserId) {
    showToast('You are now the host!', 'host');
  } else if (data.displayName) {
    showToast(`${data.displayName} is now the host`, 'host');
  }
}

/**
 * Received on join/reconnect. Full room state to hydrate the store.
 */
function handleStateSnapshot(payload: unknown): void {
  const data = payload as StateSnapshot;
  if (!data?.room || !data?.players) {
    console.error('[EventHandler] Invalid state-snapshot payload:', payload);
    return;
  }

  const store = useGameStore.getState();

  // Map server room state to our store shape
  store.setRoom({
    roomCode: data.room.code,
    hostId: data.room.hostId,
    players: data.players,
    settings: {
      roundDuration: data.room.roundDuration,
      totalRounds: data.room.totalRounds,
      categoryPackId: '',
    },
    status: mapRoomStatus(data.room.status),
  });

  // Map current round if active
  if (data.currentRound) {
    const phase = deriveRoundPhase(data.currentRound);
    store.setRound({
      roundNumber: data.currentRound.roundNumber,
      totalRounds: data.room.totalRounds,
      letter: data.currentRound.letter,
      categories: data.currentRound.categories,
      phase,
      endsAt: data.currentRound.endTimestamp ?? 0,
      graceEndsAt: data.currentRound.graceEndTimestamp ?? undefined,
    });
  }

  // Restore answers from server (server-authoritative)
  if (data.myAnswers) {
    useGameStore.setState({ answers: data.myAnswers });
  }
}

/**
 * Someone joined the room.
 */
function handlePlayerConnected(payload: unknown): void {
  const data = payload as PlayerConnectedPayload;
  if (!data?.playerId) {
    console.error('[EventHandler] Invalid player-connected payload:', payload);
    return;
  }

  const store = useGameStore.getState();
  const room = store.room;
  if (!room) return;

  // Add player if not already present
  if (room.players.some((p) => p.id === data.playerId)) return;

  store.setRoom({
    ...room,
    players: [
      ...room.players,
      {
        id: data.playerId,
        userId: data.playerId,
        displayName: data.displayName,
        avatarId: data.avatarId || '',
        status: 'CONNECTED',
        totalScore: 0,
      },
    ],
  });

  showToast(`${data.displayName} joined the room`, 'join');
  playSound('playerJoin');
}

/**
 * Someone lost connection.
 */
function handlePlayerDisconnected(payload: unknown): void {
  const data = payload as PlayerDisconnectedPayload;
  if (!data?.playerId) {
    console.error('[EventHandler] Invalid player-disconnected payload:', payload);
    return;
  }

  const store = useGameStore.getState();
  const room = store.room;
  if (!room) return;

  // Update player status
  store.setRoom({
    ...room,
    players: room.players.map((p) =>
      p.id === data.playerId ? { ...p, status: 'DISCONNECTED' as const } : p
    ),
  });

  // Add to disconnected players tracking
  store.addDisconnectedPlayer({
    playerId: data.playerId,
    displayName: data.displayName,
    avatarId: '',
    expiresAt: Date.now() + 60000, // 60s default grace window
  });
}

/**
 * Someone came back.
 */
function handlePlayerReconnected(payload: unknown): void {
  const data = payload as PlayerReconnectedPayload;
  if (!data?.playerId) {
    console.error('[EventHandler] Invalid player-reconnected payload:', payload);
    return;
  }

  const store = useGameStore.getState();
  const room = store.room;
  if (!room) return;

  // Update player status back to connected
  store.setRoom({
    ...room,
    players: room.players.map((p) =>
      p.id === data.playerId ? { ...p, status: 'CONNECTED' as const } : p
    ),
  });

  store.removeDisconnectedPlayer(data.playerId);
}

/**
 * Player missed reconnect window — eliminated.
 */
function handlePlayerEliminated(payload: unknown): void {
  const data = payload as PlayerEliminatedPayload;
  if (!data?.playerId) {
    console.error('[EventHandler] Invalid player-eliminated payload:', payload);
    return;
  }

  const store = useGameStore.getState();
  const room = store.room;
  if (!room) return;

  store.setRoom({
    ...room,
    players: room.players.map((p) =>
      p.id === data.playerId ? { ...p, status: 'ELIMINATED' as const } : p
    ),
  });

  store.removeDisconnectedPlayer(data.playerId);
}

/**
 * New round begins.
 */
function handleRoundStart(payload: unknown): void {
  const data = payload as RoundStartPayload;
  if (!data?.roundNumber || !data?.letter || !data?.categories) {
    console.error('[EventHandler] Invalid round-start payload:', payload);
    return;
  }

  const store = useGameStore.getState();
  const totalRounds = store.room?.settings?.totalRounds ?? data.roundNumber;

  store.setRound({
    roundNumber: data.roundNumber,
    totalRounds,
    letter: data.letter,
    categories: data.categories,
    phase: 'input', // go straight to input, letter is shown inline
    endsAt: data.endTimestamp,
  });
}

/**
 * Server confirmed our answer was saved.
 */
function handleAnswerAck(payload: unknown): void {
  const data = payload as AnswerAckPayload;
  if (!data?.category) {
    console.error('[EventHandler] Invalid answer-ack payload:', payload);
    return;
  }
  // Answer acknowledged — no store mutation needed, just confirmation
  // Could be used for UI feedback (checkmark per field)
}

/**
 * Someone hit stop, grace period begins.
 */
function handleGraceStarted(payload: unknown): void {
  const data = payload as GraceStartedPayload;
  if (!data?.triggeredBy || !data?.graceEndTimestamp) {
    console.error('[EventHandler] Invalid grace-started payload:', payload);
    return;
  }

  const store = useGameStore.getState();
  const round = store.round;
  if (!round) return;

  store.setRound({
    ...round,
    phase: 'grace',
    graceEndsAt: data.graceEndTimestamp,
    graceTriggeredBy: data.triggeredBy.displayName,
  });

  showToast(`⚡ ${data.triggeredBy.displayName} said STOP! 15 seconds left.`, 'stop');
}

/**
 * No more submissions accepted.
 */
function handleRoundLocked(payload: unknown): void {
  const data = payload as RoundLockedPayload;
  if (!data) {
    console.error('[EventHandler] Invalid round-locked payload:', payload);
    return;
  }

  const store = useGameStore.getState();
  store.setPhase('locked');
}

/**
 * Round scoring complete — show results.
 */
function handleRoundResults(payload: unknown): void {
  const data = payload as RoundResultsPayload;
  if (!data?.players) {
    console.error('[EventHandler] Invalid round-results payload:', payload);
    return;
  }

  const store = useGameStore.getState();
  const round = store.round;
  if (!round) return;

  // Snapshot current rankings before overwriting so the UI can show deltas
  const existing = store.roundResults;
  if (existing?.players?.length) {
    const sorted = [...existing.players].sort((a, b) => b.totalScore - a.totalScore);
    const snapshot: Record<string, number> = {};
    sorted.forEach((p, i) => { snapshot[p.playerId] = i + 1; });
    store.setPreviousRoundRanks(snapshot);
  }

  // Store the full results payload for the results screen
  store.setRound({
    ...round,
    phase: 'results',
  });

  useGameStore.setState({ roundResults: data });
}

/**
 * All rounds done — show final summary.
 */
function handleMatchSummary(payload: unknown): void {
  const data = payload as MatchSummaryPayload;
  if (!data?.podium) {
    console.error('[EventHandler] Invalid match-summary payload:', payload);
    return;
  }

  const store = useGameStore.getState();

  // Mark room as completed so the router can navigate to leaderboard after match summary
  const room = store.room;
  if (room) {
    store.setRoom({ ...room, status: 'completed' });
  }

  // Clear round data — game is over
  store.setRound(null);

  store.setMatchResults({
    podium: data.podium,
    allPlayers: data.allPlayers,
    totalDuration: data.totalDuration,
    shareCardUrl: data.shareCardUrl,
  });
}

/**
 * Room lifecycle ended.
 */
function handleRoomClosed(_payload: unknown): void {
  const store = useGameStore.getState();
  // If we have match results, don't reset — let the user view them
  // Just mark the room as completed
  if (store.matchResults) {
    const room = store.room;
    if (room) {
      store.setRoom({ ...room, status: 'completed' });
    }
    return;
  }
  // Otherwise fully reset
  store.reset();
}

/**
 * AI re-evaluation corrected scores.
 */
function handleScoresUpdated(payload: unknown): void {
  // Same shape as round-results — update the displayed results
  const data = payload as RoundResultsPayload;
  if (!data?.players) {
    console.error('[EventHandler] Invalid scores-updated payload:', payload);
    return;
  }
  useGameStore.setState({ roundResults: data });
}

/**
 * Room state machine transition.
 */
function handleStateTransition(payload: unknown): void {
  const data = payload as StateTransitionPayload;
  if (!data?.to) {
    console.error('[EventHandler] Invalid state-transition payload:', payload);
    return;
  }

  const store = useGameStore.getState();
  const room = store.room;
  if (!room) return;

  store.setRoom({
    ...room,
    status: mapRoomStatus(data.to),
  });
}

/**
 * Server error.
 */
function handleError(payload: unknown): void {
  const data = payload as SocketErrorPayload;
  console.error('[EventHandler] Server error:', data?.code, data?.message);

  // Suppress "must join room" errors — these are stale emits after room closes
  if (data?.message?.toLowerCase().includes('must join the room')) {
    return;
  }

  showToast(data?.message || 'Something went wrong', 'error');
}

/**
 * Validation error.
 */
function handleValidationError(payload: unknown): void {
  const data = payload as ValidationErrorPayload;
  console.error('[EventHandler] Validation error for event:', data?.event, data?.errors);
}

// ===== Helpers =====

function mapRoomStatus(serverStatus: string): 'waiting' | 'in_progress' | 'completed' {
  switch (serverStatus) {
    case 'LOBBY':
      return 'waiting';
    case 'IN_PROGRESS':
    case 'ROUND_SCORING':
    case 'ROUND_SUMMARY':
      return 'in_progress';
    case 'MATCH_SUMMARY':
    case 'CLOSED':
      return 'completed';
    default:
      return 'waiting';
  }
}

function deriveRoundPhase(currentRound: {
  isLocked: boolean;
  graceEndTimestamp: number | null;
  endTimestamp: number | null;
}): 'input' | 'grace' | 'locked' {
  if (currentRound.isLocked) return 'locked';
  if (currentRound.graceEndTimestamp && currentRound.graceEndTimestamp > Date.now()) return 'grace';
  return 'input';
}

// ===== Rematch Event Handlers =====

function handleRematchRequested(payload: unknown): void {
  const data = payload as { requestedBy: { playerId: string; displayName: string } };
  if (!data?.requestedBy) {
    console.error('[EventHandler] Invalid rematch-requested payload:', payload);
    return;
  }

  const store = useGameStore.getState();
  store.setRematch({
    status: 'pending',
    requestedBy: data.requestedBy,
    accepted: [],
    declined: [],
    newRoomCode: null,
    cancelReason: null,
  });

  showToast(`${data.requestedBy.displayName} wants a rematch!`, 'info');
}

function handleRematchUpdate(payload: unknown): void {
  const data = payload as { accepted: string[]; declined: string[]; total: number };
  if (!data) {
    console.error('[EventHandler] Invalid rematch-update payload:', payload);
    return;
  }

  const store = useGameStore.getState();
  store.setRematch({
    accepted: data.accepted ?? [],
    declined: data.declined ?? [],
    total: data.total ?? 0,
  });
}

function handleRematchReady(payload: unknown): void {
  const data = payload as { newRoomCode: string; players: unknown[] };
  if (!data?.newRoomCode) {
    console.error('[EventHandler] Invalid rematch-ready payload:', payload);
    return;
  }

  const store = useGameStore.getState();
  store.setRematch({
    status: 'ready',
    newRoomCode: data.newRoomCode,
  });

  // Auto-navigate: emit join-room for the new room
  socketHandler.emit('join-room', { roomCode: data.newRoomCode });

  showToast('Rematch ready! Joining new room...', 'success');
}

function handleRematchCancelled(payload: unknown): void {
  const data = payload as { reason: string };

  const store = useGameStore.getState();
  store.setRematch({
    status: 'cancelled',
    cancelReason: data?.reason || 'Rematch cancelled',
  });

  showToast(data?.reason || 'Rematch cancelled', 'info');
}

// ===== Registration Function =====

/**
 * Registers all server event handlers on the socket handler.
 * Call this once after socket handler is initialized.
 */
export function registerEventHandlers(): void {
  socketHandler.onEvent('state-snapshot', handleStateSnapshot);
  socketHandler.onEvent('player-connected', handlePlayerConnected);
  socketHandler.onEvent('player-left', handlePlayerLeft);
  socketHandler.onEvent('host-changed', handleHostChanged);
  socketHandler.onEvent('player-disconnected', handlePlayerDisconnected);
  socketHandler.onEvent('player-reconnected', handlePlayerReconnected);
  socketHandler.onEvent('player-eliminated', handlePlayerEliminated);
  socketHandler.onEvent('round-start', handleRoundStart);
  socketHandler.onEvent('answer-ack', handleAnswerAck);
  socketHandler.onEvent('grace-started', handleGraceStarted);
  socketHandler.onEvent('round-locked', handleRoundLocked);
  socketHandler.onEvent('round-results', handleRoundResults);
  socketHandler.onEvent('match-summary', handleMatchSummary);
  socketHandler.onEvent('room-closed', handleRoomClosed);
  socketHandler.onEvent('scores-updated', handleScoresUpdated);
  socketHandler.onEvent('state-transition', handleStateTransition);
  socketHandler.onEvent('error', handleError);
  socketHandler.onEvent('validation-error', handleValidationError);
  socketHandler.onEvent('rematch-requested', handleRematchRequested);
  socketHandler.onEvent('rematch-update', handleRematchUpdate);
  socketHandler.onEvent('rematch-ready', handleRematchReady);
  socketHandler.onEvent('rematch-cancelled', handleRematchCancelled);
}

/**
 * Unregisters all server event handlers from the socket handler.
 */
export function unregisterEventHandlers(): void {
  socketHandler.offEvent('state-snapshot');
  socketHandler.offEvent('player-connected');
  socketHandler.offEvent('player-left');
  socketHandler.offEvent('host-changed');
  socketHandler.offEvent('player-disconnected');
  socketHandler.offEvent('player-reconnected');
  socketHandler.offEvent('player-eliminated');
  socketHandler.offEvent('round-start');
  socketHandler.offEvent('answer-ack');
  socketHandler.offEvent('grace-started');
  socketHandler.offEvent('round-locked');
  socketHandler.offEvent('round-results');
  socketHandler.offEvent('match-summary');
  socketHandler.offEvent('room-closed');
  socketHandler.offEvent('scores-updated');
  socketHandler.offEvent('state-transition');
  socketHandler.offEvent('error');
  socketHandler.offEvent('validation-error');
  socketHandler.offEvent('rematch-requested');
  socketHandler.offEvent('rematch-update');
  socketHandler.offEvent('rematch-ready');
  socketHandler.offEvent('rematch-cancelled');
}

// Export individual handlers for testing
export const eventHandlers = {
  handleStateSnapshot,
  handlePlayerConnected,
  handlePlayerDisconnected,
  handlePlayerReconnected,
  handlePlayerEliminated,
  handleRoundStart,
  handleAnswerAck,
  handleGraceStarted,
  handleRoundLocked,
  handleRoundResults,
  handleMatchSummary,
  handleRoomClosed,
  handleScoresUpdated,
  handleStateTransition,
  handleError,
  handleValidationError,
};
