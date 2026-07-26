import { io, Socket } from 'socket.io-client';
import { useGameStore } from '../store/gameStore';

/**
 * Socket.io handler implementing real-time communication with the
 * Naija Categories Game backend. Handles connection, reconnection,
 * event emission/listening, and latency tracking via time-sync.
 */

export interface SocketHandler {
  connect(url: string, token: string): void;
  disconnect(): void;
  emit(event: string, payload: unknown): void;
  onEvent(event: string, handler: (payload: unknown) => void): void;
  offEvent(event: string): void;
  getLatency(): number;
  isConnected(): boolean;
  getSocket(): Socket | null;
  getTimeOffset(): number;
}

const MAX_RECONNECT_ATTEMPTS = 5;
const TIME_SYNC_INTERVAL_MS = 30000;

class SocketHandlerImpl implements SocketHandler {
  private socket: Socket | null = null;
  private latencyMs: number = 0;
  private timeOffset: number = 0; // serverTime - clientTime
  private timeSyncTimer: ReturnType<typeof setInterval> | null = null;
  private eventHandlers: Map<string, (payload: unknown) => void> = new Map();

  connect(url: string, token: string): void {
    // Disconnect existing socket if any
    if (this.socket) {
      this.disconnect();
    }

    this.socket = io(url, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 16000,
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', this.handleConnect.bind(this));
    this.socket.on('disconnect', this.handleDisconnect.bind(this));
    this.socket.on('connect_error', this.handleConnectError.bind(this));

    // Re-register all existing event handlers on the new socket
    for (const [event, handler] of this.eventHandlers) {
      this.socket.on(event, handler);
    }
  }

  disconnect(): void {
    this.stopTimeSyncInterval();
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    useGameStore.getState().setConnection({
      status: 'disconnected',
      reconnectAttempts: 0,
    });
  }

  emit(event: string, payload: unknown): void {
    if (!this.socket?.connected) {
      console.warn('[SocketHandler] Cannot emit, socket not connected:', event);
      return;
    }
    this.socket.emit(event, payload);
  }

  onEvent(event: string, handler: (payload: unknown) => void): void {
    this.eventHandlers.set(event, handler);
    if (this.socket) {
      this.socket.on(event, handler);
    }
  }

  offEvent(event: string): void {
    const handler = this.eventHandlers.get(event);
    if (handler && this.socket) {
      this.socket.off(event, handler);
    }
    this.eventHandlers.delete(event);
  }

  getLatency(): number {
    return this.latencyMs;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  getTimeOffset(): number {
    return this.timeOffset;
  }

  private handleConnect(): void {
    console.info('[SocketHandler] Connected:', this.socket?.id);

    useGameStore.getState().setConnection({
      status: 'connected',
      latencyMs: 0,
      reconnectAttempts: 0,
    });

    this.startTimeSyncInterval();
    // Initial time sync
    this.sendTimeSync();
  }

  private handleDisconnect(reason: string): void {
    console.warn('[SocketHandler] Disconnected:', reason);
    this.stopTimeSyncInterval();

    useGameStore.getState().setConnection({ status: 'disconnected' });
  }

  private handleConnectError(err: Error): void {
    console.error('[SocketHandler] Connection error:', err.message);

    const attempts = (this.socket?.io as unknown as { _reconnecting?: number })?._reconnecting ?? 0;

    useGameStore.getState().setConnection({
      status: 'disconnected',
      reconnectAttempts: attempts,
    });

    // If auth failed, don't keep trying
    if (err.message === 'AUTH_FAILED') {
      console.error('[SocketHandler] Auth failed, stopping reconnection');
      this.socket?.disconnect();
    }
  }

  private startTimeSyncInterval(): void {
    this.stopTimeSyncInterval();
    this.timeSyncTimer = setInterval(() => {
      this.sendTimeSync();
    }, TIME_SYNC_INTERVAL_MS);
  }

  private stopTimeSyncInterval(): void {
    if (this.timeSyncTimer) {
      clearInterval(this.timeSyncTimer);
      this.timeSyncTimer = null;
    }
  }

  private sendTimeSync(): void {
    if (!this.socket?.connected) return;

    const roomCode = useGameStore.getState().room?.roomCode;
    if (!roomCode) return;

    const sendTime = Date.now();
    this.socket.emit('time-sync', { roomCode });

    // Listen for the response (one-time)
    this.socket.once('time-sync-response', (data: { serverTime: number }) => {
      const receiveTime = Date.now();
      const roundTrip = receiveTime - sendTime;
      this.latencyMs = Math.round(roundTrip / 2);
      this.timeOffset = data.serverTime - receiveTime + this.latencyMs;

      // Update connection status based on latency
      const status = this.latencyMs > 300 ? 'degraded' : 'connected';
      useGameStore.getState().setConnection({
        status,
        latencyMs: this.latencyMs,
      });
    });
  }
}

// Singleton instance
export const socketHandler: SocketHandler = new SocketHandlerImpl();
