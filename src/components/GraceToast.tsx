import { useEffect, useRef } from 'react';

interface GraceToastProps {
  playerName: string;
  onDismiss?: () => void;
}

/**
 * Dark toast with orange accent for grace period notification.
 */
export function GraceToast({ playerName, onDismiss }: GraceToastProps) {
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Haptic feedback (mobile devices)
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
      // Audio may not be available in all environments
    }

    // Auto-dismiss after 3.5 seconds
    dismissTimerRef.current = setTimeout(() => {
      onDismiss?.();
    }, 3500);

    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, [onDismiss]);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`
        fixed top-4 left-1/2 -translate-x-1/2 z-50
        w-11/12 max-w-sm px-4 py-3 rounded-xl
        bg-[#1a2e1f] border border-[#FF6B35] shadow-lg
        animate-[slideDown_0.3s_ease-out]
        flex items-center justify-between gap-2
      `}
    >
      <span className="text-white font-semibold text-sm">
        ⚡ <span className="text-[#FF6B35]">{playerName}</span> said STOP! 10 seconds left.
      </span>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className={`
            shrink-0 w-6 h-6 flex items-center justify-center
            rounded-full text-[#8aaa8a] hover:bg-[#2a4a32]
            transition-colors duration-150
          `}
        >
          ✕
        </button>
      )}
    </div>
  );
}
