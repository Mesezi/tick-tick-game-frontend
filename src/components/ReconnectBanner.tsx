import { useState, useEffect, useCallback } from 'react';
import type { ReconnectBannerProps } from '../types';
import { calcRemainingSeconds } from '../utils/timer';

/**
 * Dark banner with orange/yellow warning for disconnected players.
 */
export function ReconnectBanner({
  disconnectedPlayer,
  expiresAt,
  onExpire,
}: ReconnectBannerProps & { onExpire?: () => void }) {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() =>
    calcRemainingSeconds(expiresAt, Date.now())
  );

  const recalculate = useCallback(() => {
    const seconds = calcRemainingSeconds(expiresAt, Date.now());
    setRemainingSeconds(seconds);
    return seconds;
  }, [expiresAt]);

  useEffect(() => {
    recalculate();

    const interval = setInterval(() => {
      const seconds = recalculate();
      if (seconds <= 0) {
        clearInterval(interval);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [recalculate, onExpire]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={`
        fixed bottom-4 left-1/2 -translate-x-1/2 z-50
        w-11/12 max-w-md px-4 py-3 rounded-xl
        bg-[#1a2e1f] border border-[#FF6B35] shadow-lg
        flex items-center gap-3
      `}
    >
      {/* Avatar placeholder */}
      <span
        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-[#2a4a32] text-sm font-bold text-white"
        aria-hidden="true"
      >
        {disconnectedPlayer.avatarId}
      </span>

      {/* Message with countdown */}
      <span className="text-white font-semibold text-sm">
        🔌 <span className="text-[#FF6B35]">{disconnectedPlayer.name}</span> disconnected — <span className="text-[#FF6B35] tabular-nums">{remainingSeconds}s</span> to rejoin
      </span>
    </div>
  );
}
