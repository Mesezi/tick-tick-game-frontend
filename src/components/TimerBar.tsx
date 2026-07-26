import { useState, useEffect } from 'react';
import type { TimerBarProps } from '../types';
import { calcRemainingSeconds } from '../utils/timer';

/**
 * Large countdown number — green normally, orange during grace/low time.
 */
export function TimerBar({ endsAt, isGracePeriod }: TimerBarProps) {
  const [remaining, setRemaining] = useState(() =>
    calcRemainingSeconds(endsAt, Date.now())
  );

  useEffect(() => {
    setRemaining(calcRemainingSeconds(endsAt, Date.now()));

    const interval = setInterval(() => {
      const secs = calcRemainingSeconds(endsAt, Date.now());
      setRemaining(secs);
    }, 1000);

    return () => clearInterval(interval);
  }, [endsAt]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const display = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  const isLow = remaining <= 10;

  return (
    <div
      className="text-center"
      role="timer"
      aria-live="polite"
      aria-label={`${remaining} seconds remaining`}
    >
      <span
        className={`text-4xl font-bold tabular-nums tracking-tight font-heading ${
          isGracePeriod
            ? 'text-[#FF6B35]'
            : isLow
              ? 'text-[#FF6B35]'
              : 'text-[#00ff88]'
        }`}
      >
        {display}
      </span>
      {isGracePeriod && (
        <p className="text-xs text-[#FF6B35] mt-1 font-medium uppercase tracking-wide">
          Grace period
        </p>
      )}
    </div>
  );
}
