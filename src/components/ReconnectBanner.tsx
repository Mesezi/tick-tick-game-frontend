import { useState, useEffect, useCallback } from 'react';
import type { ReconnectBannerProps } from '../types';
import { calcRemainingSeconds } from '../utils/timer';
import { AvatarDisplay } from './AvatarDisplay';

/**
 * ReconnectBanner — classroom notice for disconnected players.
 * Amber warning, countdown in red when critical.
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

  const isUrgent = remainingSeconds <= 5;

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md px-4 py-3 rounded-2xl flex items-center gap-3"
      style={{
        background: '#4a3520',
        border: `2px solid ${isUrgent ? '#c0392b' : '#d97706'}`,
        boxShadow: '0 8px 28px rgba(0,0,0,0.4)',
        transition: 'border-color 0.3s ease',
      }}
    >
      {/* Avatar */}
      <AvatarDisplay
        avatarId={disconnectedPlayer.avatarId}
        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold font-hand text-chalk-white object-contain"
        imageClassName="object-contain"
      />

      {/* Message */}
      <span className="font-semibold text-sm font-hand text-chalk-white">
        🔌{' '}
        <span className="text-school-amber">{disconnectedPlayer.name}</span>
        {' '}disconnected —{' '}
        <span
          className={`tabular-nums font-bold ${isUrgent ? 'text-school-red' : 'text-school-amber'}`}
        >
          {remainingSeconds}s
        </span>
        {' '}to rejoin
      </span>
    </div>
  );
}
