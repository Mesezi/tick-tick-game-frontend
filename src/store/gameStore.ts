import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  PlayerInfo,
  RoomSettings,
  RoundPhase,
  RoundResultsPayload,
  PodiumEntry,
  SessionData,
} from '../types';
import { persistenceLayer } from '../persistence/persistenceLayer';

// ===== Store State Shape =====

export interface GameStore {
  // Session slice
  session: {
    token: string;
    userId: string;
    displayName: string | null;
    avatarId: string;
    isAuthenticated: boolean;
    deviceId: string;
  } | null;

  // Room slice
  room: {
    roomCode: string;
    hostId: string;
    players: PlayerInfo[];
    settings: RoomSettings;
    status: 'waiting' | 'in_progress' | 'completed';
  } | null;

  // Round slice
  round: {
    roundNumber: number;
    totalRounds: number;
    letter: string;
    categories: string[];
    phase: RoundPhase;
    endsAt: number;
    graceEndsAt?: number;
    graceTriggeredBy?: string;
  } | null;

  // Answers slice (category → answer for current round)
  answers: Record<string, string>;

  // Round results (full scoring breakdown from server)
  roundResults: RoundResultsPayload | null;

  // Previous round's rank snapshot for delta indicators (playerId → rank)
  previousRoundRanks: Record<string, number> | null;

  // Connection slice
  connection: {
    status: 'connected' | 'degraded' | 'disconnected';
    latencyMs: number;
    reconnectAttempts: number;
  };

  // Disconnection tracking
  disconnectedPlayers: Array<{
    playerId: string;
    displayName: string;
    avatarId: string;
    expiresAt: number;
  }>;

  // Match results (set after match-summary)
  matchResults: {
    podium: PodiumEntry[];
    allPlayers: { playerId: string; displayName: string; avatarId: string; totalScore: number }[];
    totalDuration: number;
    shareCardUrl: string;
  } | null;

  // Rematch state
  rematch: {
    status: 'idle' | 'requested' | 'pending' | 'ready' | 'cancelled';
    requestedBy: { playerId: string; displayName: string } | null;
    accepted: string[];
    declined: string[];
    total: number;
    newRoomCode: string | null;
    cancelReason: string | null;
  };

  // Transient navigation flag (not persisted) — controls whether landing screen was dismissed
  hasPassedLanding: boolean;

  // Actions
  setSession: (session: GameStore['session']) => void;
  setRoom: (room: GameStore['room']) => void;
  setRound: (round: GameStore['round']) => void;
  setAnswer: (category: string, value: string) => void;
  setPhase: (phase: RoundPhase) => void;
  setConnection: (connection: Partial<GameStore['connection']>) => void;
  addDisconnectedPlayer: (player: GameStore['disconnectedPlayers'][0]) => void;
  removeDisconnectedPlayer: (playerId: string) => void;
  setMatchResults: (results: GameStore['matchResults']) => void;
  setRematch: (rematch: Partial<GameStore['rematch']>) => void;
  setHasPassedLanding: (val: boolean) => void;
  setPreviousRoundRanks: (ranks: Record<string, number> | null) => void;
  reset: () => void;
}

// ===== Initial State =====

const initialState: Omit<GameStore,
  | 'setSession' | 'setRoom' | 'setRound' | 'setAnswer' | 'setPhase'
  | 'setConnection' | 'addDisconnectedPlayer' | 'removeDisconnectedPlayer'
  | 'setMatchResults' | 'setRematch' | 'setHasPassedLanding' | 'setPreviousRoundRanks' | 'reset'
> = {
  session: null,
  room: null,
  round: null,
  answers: {},
  roundResults: null,
  previousRoundRanks: null,
  connection: {
    status: 'disconnected',
    latencyMs: 0,
    reconnectAttempts: 0,
  },
  disconnectedPlayers: [],
  matchResults: null,
  hasPassedLanding: false,
  rematch: {
    status: 'idle',
    requestedBy: null,
    accepted: [],
    declined: [],
    total: 0,
    newRoomCode: null,
    cancelReason: null,
  },
};

// ===== Store Creation =====

export const useGameStore = create<GameStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    setSession: (session) => {
      set({ session });
      if (session) {
        const sessionData: SessionData = {
          token: session.token,
          userId: session.userId,
          displayName: session.displayName,
          avatarId: session.avatarId,
          isAuthenticated: session.isAuthenticated,
          deviceId: session.deviceId,
        };
        persistenceLayer.saveSession(sessionData);
      }
    },

    setRoom: (room) => set({ room }),

    setRound: (round) => {
      const currentRound = get().round;
      const isNewRound = !currentRound || (round && round.roundNumber !== currentRound.roundNumber);

      if (isNewRound) {
        // New round — clear answers (keep roundResults until UI transitions)
        set({ round, answers: {} });
        const roomCode = get().room?.roomCode;
        if (roomCode) {
          persistenceLayer.clearAnswers(roomCode);
        }
      } else {
        // Same round — just update round data, preserve answers
        set({ round });
      }
    },

    setAnswer: (category, value) => {
      const newAnswers = { ...get().answers, [category]: value };
      set({ answers: newAnswers });
      // Persist answers to localStorage
      const roomCode = get().room?.roomCode;
      if (roomCode) {
        persistenceLayer.saveAnswers(roomCode, newAnswers);
      }
    },

    setPhase: (phase) => {
      const round = get().round;
      if (round) {
        set({ round: { ...round, phase } });
      }
    },

    setConnection: (connection) => {
      set({ connection: { ...get().connection, ...connection } });
    },

    addDisconnectedPlayer: (player) => {
      const current = get().disconnectedPlayers;
      // Avoid duplicates
      if (current.some((p) => p.playerId === player.playerId)) return;
      set({ disconnectedPlayers: [...current, player] });
    },

    removeDisconnectedPlayer: (playerId) => {
      set({
        disconnectedPlayers: get().disconnectedPlayers.filter(
          (p) => p.playerId !== playerId
        ),
      });
    },

    setMatchResults: (results) => set({ matchResults: results }),

    setRematch: (rematch) => {
      set({ rematch: { ...get().rematch, ...rematch } });
    },

    setHasPassedLanding: (val) => set({ hasPassedLanding: val }),

    setPreviousRoundRanks: (ranks) => set({ previousRoundRanks: ranks }),

    reset: () => set({ ...initialState }),
  }))
);
