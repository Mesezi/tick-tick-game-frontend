// ===== Core Data Types =====

export interface PlayerInfo {
  id: string;
  userId: string;
  displayName: string;
  avatarId: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'ELIMINATED';
  totalScore: number;
}

export interface RoomSettings {
  roundDuration: number;
  totalRounds: number;
  categoryPackId: string;
}

export interface RoomState {
  code: string;
  status: 'LOBBY' | 'IN_PROGRESS' | 'ROUND_SCORING' | 'ROUND_SUMMARY' | 'MATCH_SUMMARY' | 'CLOSED';
  hostId: string;
  roundDuration: number;
  totalRounds: number;
  currentRound: number;
  currentLetter: string | null;
}

export interface CurrentRound {
  roundNumber: number;
  letter: string;
  categories: string[];
  endTimestamp: number | null; // absolute UTC ms
  graceEndTimestamp: number | null;
  isLocked: boolean;
}

// ===== Server Event Payloads =====

export interface StateSnapshot {
  room: RoomState;
  players: PlayerInfo[];
  currentRound: CurrentRound | null;
  myAnswers: Record<string, string>;
}

export interface RoundStartPayload {
  roundNumber: number;
  letter: string;
  categories: string[];
  endTimestamp: number; // absolute UTC ms
}

export interface GraceStartedPayload {
  triggeredBy: { playerId: string; displayName: string };
  graceEndTimestamp: number;
}

export interface RoundLockedPayload {
  roundNumber: number;
}

export interface AnswerResult {
  category: string;
  rawAnswer: string;
  normalizedForm: string | null;
  isValid: boolean;
  severity: 'exact_match' | 'minor_typo' | 'major_typo' | 'invalid';
  score: number;
  isDuplicate: boolean;
  reason?: string;
}

export interface PlayerRoundResult {
  playerId: string;
  displayName: string;
  avatarId: string;
  roundScore: number;
  totalScore: number;
  answers: AnswerResult[];
}

export interface RoundResultsPayload {
  roundNumber: number;
  letter: string;
  categories: string[];
  players: PlayerRoundResult[];
}

export interface PodiumEntry {
  rank: number;
  playerId: string;
  displayName: string;
  avatarId: string;
  totalScore: number;
}

export interface MatchSummaryPayload {
  podium: PodiumEntry[];
  allPlayers: { playerId: string; displayName: string; avatarId: string; totalScore: number }[];
  totalDuration: number; // ms
  shareCardUrl: string;
}

export interface PlayerConnectedPayload {
  playerId: string;
  displayName: string;
  avatarId: string;
}

export interface PlayerDisconnectedPayload {
  playerId: string;
  displayName: string;
}

export interface PlayerReconnectedPayload {
  playerId: string;
  displayName: string;
}

export interface PlayerEliminatedPayload {
  playerId: string;
  displayName: string;
}

export interface AnswerAckPayload {
  category: string;
  timestamp: number;
}

export interface StateTransitionPayload {
  from: string;
  to: string;
  metadata?: Record<string, unknown>;
}

export interface SocketErrorPayload {
  code: string;
  message: string;
  event?: string;
}

export interface ValidationErrorPayload {
  event: string;
  errors: unknown[];
}

// ===== Round Phase (client-derived from server state) =====

export type RoundPhase = 'reveal' | 'input' | 'grace' | 'locked' | 'results';

// ===== Session Data (local persistence) =====

export interface SessionData {
  token: string;
  userId: string;
  displayName: string | null;
  avatarId: string;
  isAuthenticated: boolean; // true = Google, false = guest
  deviceId: string;
}

// ===== REST API Response Types =====

export interface AuthResponse {
  success: boolean;
  data: {
    token: string;
    guestId?: string;
    user?: {
      id: string;
      email: string;
      displayName: string;
    };
  };
}

export interface UserResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      type: 'GUEST' | 'GOOGLE';
      email: string | null;
      displayName: string | null;
      totalScore: number;
      weeklyScore: number;
      createdAt: string;
    };
  };
}

export interface CategoryPack {
  id: string;
  name: string;
  categories: string[];
}

export interface RoomCreateResponse {
  success: boolean;
  data: {
    roomCode: string;
    [key: string]: unknown;
  };
}

export interface LeaderboardEntry {
  playerId: string;
  displayName: string;
  totalScore: number;
  rank: number;
}

export interface LeaderboardResponse {
  success: boolean;
  data: {
    entries: LeaderboardEntry[];
    page: number;
    limit: number;
    total: number;
  };
}

// ===== Component Prop Interfaces =====

export interface CategoryInputGridProps {
  categories: string[];
  letter: string;
  disabled: boolean;
  answers: Record<string, string>;
  results?: MappedAnswerResult[];
  onAnswerChange: (category: string, value: string) => void;
}

/** Mapped result for UI display (derived from server AnswerResult) */
export interface MappedAnswerResult {
  category: string;
  answer: string;
  points: number;
  maxPoints: number;
  status: 'accepted' | 'partial' | 'rejected';
  aiReason: string;
}

export interface TimerBarProps {
  endsAt: number;
  isGracePeriod: boolean;
  graceDuration?: number;
}

export interface StopButtonProps {
  disabled: boolean;
  onStop: () => void;
}

export interface RoundResultsCardProps {
  results: PlayerRoundResult[];
  currentPlayerId: string;
  roundNumber: number;
  letter: string;
}

export interface PodiumSummaryProps {
  podium: PodiumEntry[];
  currentPlayerId: string;
}

export interface LeaderboardTabsProps {
  activeTab: 'all-time' | 'weekly';
  onTabChange: (tab: 'all-time' | 'weekly') => void;
}

export interface ReconnectBannerProps {
  disconnectedPlayer: { name: string; avatarId: string };
  expiresAt: number;
}

export interface ConnectivityIndicatorProps {
  status: 'connected' | 'degraded' | 'disconnected';
  latencyMs?: number;
}

// ===== Zustand Store Types (for reuse) =====

export interface PlayerPlacement {
  playerId: string;
  displayName: string;
  avatarId: string;
  totalScore: number;
  placement: number;
}

export interface RoundResults {
  results: AnswerResult[];
  totalRoundScore: number;
  cumulativeScore: number;
}

export interface FullStatePayload {
  session: SessionData;
  room: {
    roomCode: string;
    hostId: string;
    players: PlayerInfo[];
    settings: RoomSettings;
    status: 'waiting' | 'in_progress' | 'completed';
  };
  round: {
    roundNumber: number;
    totalRounds: number;
    letter: string;
    categories: string[];
    phase: RoundPhase;
    endsAt: number;
    graceEndsAt?: number;
    graceTriggeredBy?: string;
    results?: RoundResults;
  } | null;
  answers: Record<string, string>;
}
