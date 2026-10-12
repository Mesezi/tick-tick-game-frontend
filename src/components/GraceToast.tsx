import { useEffect, useRef } from 'react';
import { Bell, X } from 'lucide-react';

interface GraceToastProps {
  playerName: string;
  onDismiss?: () => void;
}

/**
 * GraceToast — amber school-bell alert for grace period.
 * "Someone called STOP!" — classroom feel.
 */
export function GraceToast({ playerName, onDismiss }: GraceToastProps) {
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    navigator.vibrate?.(100);

    // Audio ping
    try {
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
      setTimeout(() => ctx.close(), 500);
    } catch {
      // Audio unavailable
    }

    dismissTimerRef.current = setTimeout(() => onDismiss?.(), 3500);
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [onDismiss]);

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-sm px-4 py-3 rounded-2xl flex items-center justify-between gap-2 animate-[slideDown_0.3s_ease-out]"
      style={{
        background: '#4a3520',
        border: '2px solid #d97706',
        boxShadow: '0 8px 28px rgba(0,0,0,0.4), 0 0 0 1px rgba(217,119,6,0.2)',
      }}
    >
      <span className="font-semibold text-sm font-hand text-chalk-white flex items-center gap-1.5">
        <Bell className="w-4 h-4 text-school-amber shrink-0" />
        <span className="text-school-amber">{playerName}</span>
        {' '}said STOP! Hurry up!
      </span>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full transition-colors duration-150 active:scale-90 text-desk"
          style={{ background: 'rgba(107,68,35,0.5)' }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
