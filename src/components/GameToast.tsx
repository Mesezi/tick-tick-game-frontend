import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export type GameToastVariant = 'stop' | 'join' | 'info' | 'host' | 'success' | 'error';

interface GameToastProps {
  message: string;
  variant?: GameToastVariant;
  visible: boolean;
  toastId?: number; // bump this to reset the auto-dismiss timer
  onDismiss: () => void;
  duration?: number; // ms, default 3500
}

const VARIANT_STYLES: Record<GameToastVariant, { bg: string; border: string; accent: string; icon: string }> = {
  stop:    { bg: '#2a1500', border: '#ffb800', accent: '#ffb800', icon: '🛑' },
  join:    { bg: '#0d2018', border: '#00d060', accent: '#00d060', icon: '👋' },
  info:    { bg: '#0d2018', border: '#6baf80', accent: '#6baf80', icon: 'ℹ️' },
  host:    { bg: '#1a1800', border: '#ffb800', accent: '#ffb800', icon: '👑' },
  success: { bg: '#0d2018', border: '#00d060', accent: '#00d060', icon: '✅' },
  error:   { bg: '#1f0a0a', border: '#ff3b5c', accent: '#ff3b5c', icon: '⚠️' },
};

/**
 * In-game toast — slides down from the top with a spring animation.
 * Replaces sonner globally. Render once in App.tsx and call showToast() anywhere.
 */
export function GameToast({
  message,
  variant = 'info',
  visible,
  toastId,
  onDismiss,
  duration = 3500,
}: GameToastProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const styles = VARIANT_STYLES[variant];

  // Reset timer whenever toastId changes (new toast while one is visible)
  useEffect(() => {
    if (!visible) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(onDismiss, duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, toastId, duration, onDismiss]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={toastId}
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 320 }}
          role="alert"
          aria-live="polite"
          className="fixed top-0 inset-x-0 z-[100] flex justify-center px-4 pt-3 pointer-events-none"
          style={{ maxWidth: '600px', margin: '0 auto' }}
        >
          <div
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-xl pointer-events-auto"
            style={{
              background: styles.bg,
              borderColor: styles.border,
              boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px ${styles.border}33`,
            }}
          >
            <span className="text-xl shrink-0" aria-hidden="true">{styles.icon}</span>
            <p className="flex-1 text-sm font-bold" style={{ color: styles.accent }}>
              {message}
            </p>
            <button
              onClick={onDismiss}
              className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full transition-all active:scale-90 text-xs"
              style={{ color: styles.accent, background: `${styles.border}22` }}
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
