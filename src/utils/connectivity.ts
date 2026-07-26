/**
 * Connectivity status type matching the store's connection.status field.
 */
export type ConnectivityStatus = 'connected' | 'degraded' | 'disconnected';

/**
 * Threshold in milliseconds above which latency is considered degraded.
 * Matches the 300ms threshold used in the socket handler's pong handling.
 */
export const DEGRADED_LATENCY_THRESHOLD_MS = 300;

/**
 * Derives connectivity status from socket alive state and measured latency.
 *
 * Rules:
 * - Socket not alive → 'disconnected'
 * - Socket alive and latency >= threshold → 'degraded'
 * - Socket alive and latency < threshold → 'connected'
 *
 * @param isSocketAlive - Whether the WebSocket connection is currently open
 * @param latencyMs - Last measured round-trip latency in milliseconds
 * @returns The derived connectivity status
 */
export function deriveConnectivityStatus(
  isSocketAlive: boolean,
  latencyMs: number
): ConnectivityStatus {
  if (!isSocketAlive) {
    return 'disconnected';
  }

  if (latencyMs >= DEGRADED_LATENCY_THRESHOLD_MS) {
    return 'degraded';
  }

  return 'connected';
}
