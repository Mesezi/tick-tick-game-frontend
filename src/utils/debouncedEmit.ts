import type { SocketHandler } from '../socket/socketHandler';

/**
 * Default debounce delay in milliseconds.
 * Balances responsiveness with bandwidth conservation on 2G/3G networks.
 */
export const DEFAULT_DEBOUNCE_MS = 300;

/**
 * Creates a debounced version of socket.emit for a specific event type.
 * Only the final value within the debounce window is emitted to the server.
 *
 * @param socket - The socket handler instance to emit through
 * @param event - The event name to emit
 * @param delayMs - Debounce delay in milliseconds (default: 300ms)
 * @returns A function that accepts a payload and debounces the emission
 */
export function createDebouncedEmit(
  socket: SocketHandler,
  event: string,
  delayMs: number = DEFAULT_DEBOUNCE_MS
): (payload: unknown) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return (payload: unknown) => {
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      socket.emit(event, payload);
    }, delayMs);
  };
}

/**
 * Creates a keyed debounced emitter that maintains separate debounce timers
 * per key. Useful for debouncing per-category answer inputs independently.
 *
 * @param socket - The socket handler instance to emit through
 * @param event - The event name to emit
 * @param delayMs - Debounce delay in milliseconds (default: 300ms)
 * @returns A function that accepts a key and payload, debouncing per key
 */
export function createKeyedDebouncedEmit(
  socket: SocketHandler,
  event: string,
  delayMs: number = DEFAULT_DEBOUNCE_MS
): (key: string, payload: unknown) => void {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  return (key: string, payload: unknown) => {
    const existingTimer = timers.get(key);
    if (existingTimer !== undefined) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      timers.delete(key);
      socket.emit(event, payload);
    }, delayMs);

    timers.set(key, timer);
  };
}
