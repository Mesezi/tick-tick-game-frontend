/**
 * Calculates the remaining seconds from a server-provided endsAt timestamp.
 *
 * @param endsAt - Server-provided UTC timestamp in milliseconds when the timer ends
 * @param now - Current UTC timestamp in milliseconds
 * @returns Remaining seconds, clamped to a non-negative integer (ceiled)
 */
export function calcRemainingSeconds(endsAt: number, now: number): number {
  const diffMs = endsAt - now;
  if (diffMs <= 0) {
    return 0;
  }
  return Math.ceil(diffMs / 1000);
}
