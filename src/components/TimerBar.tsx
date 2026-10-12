import { useState, useEffect } from 'react';
import type { TimerBarProps } from '../types';
import { calcRemainingSeconds } from '../utils/timer';

/**
 * TimerBar — chalk-style countdown.
 * Brown → amber → red as time runs low.
 * During grace period shows warm amber.
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

  // Classroom colour logic: brown → amber → red
  const timerColor = isGracePeriod || isLow
    ? isLow ? '#c0392b' : '#d97706'
    : '#8b5e3c';

  return (
    <div
      className="text-center"
      role="timer"
      aria-live="polite"
      aria-label={`${remaining} seconds remaining`}
    >
      <span
        className="text-4xl font-bold tabular-nums tracking-tight font-display"
        style={{
          color: timerColor,
          textShadow: `0 0 12px ${timerColor}40`,
          transition: 'color 0.3s ease',
        }}
      >
        {display}
      </span>
      {isGracePeriod && (
        <p className="text-sm mt-1 font-bold uppercase tracking-widest font-hand text-school-amber">
          Grace period
        </p>
      )}
    </div>
  );
}
