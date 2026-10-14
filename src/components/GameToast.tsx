import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  XCircle,
  Info,
  OctagonX,
  UserPlus,
  Crown,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type GameToastVariant = 'stop' | 'join' | 'info' | 'host' | 'success' | 'error';

interface GameToastProps {
  message: string;
  variant?: GameToastVariant;
  visible: boolean;
  toastId?: number;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
  duration?: number;
}

interface VariantStyle {
  bg: string;
  border: string;
  accent: string;
  Icon: LucideIcon;
}

/**
 * GameToast — classroom-themed in-game notifications.
 * Slide-down from top, spring animation, auto-dismiss.
 */
const VARIANT_STYLES: Record<GameToastVariant, VariantStyle> = {
  stop:    { bg: '#2a1f00', border: '#d97706', accent: '#d97706', Icon: OctagonX },
  join:    { bg: '#4a3520', border: '#8b5e3c', accent: 'white', Icon: UserPlus },
  info:    { bg: '#4a3520', border: '#8b5e3c', accent: 'white', Icon: Info },
  host:    { bg: '#2a1f00', border: '#d97706', accent: '#d97706', Icon: Crown },
  success: { bg: '#4a3520', border: '#6b4423', accent: 'white', Icon: CheckCircle2 },
  error:   { bg: '#2a0e0a', border: '#c0392b', accent: '#e05545', Icon: XCircle },
};

export function GameToast({
  message,
  variant = 'info',
  visible,
  toastId,
  actionLabel,
  onAction,
  onDismiss,
  duration = 3500,
}: GameToastProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { bg, border, accent, Icon } = VARIANT_STYLES[variant];

  useEffect(() => {
    if (!visible) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!actionLabel) {
      timerRef.current = setTimeout(onDismiss, duration);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, toastId, duration, onDismiss, actionLabel]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={toastId}
          initial={{ y: -80, opacity: 0, scale: 0.94 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -80, opacity: 0, scale: 0.94 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.38 }}
          role="alert"
          aria-live="polite"
          className="fixed top-0 inset-x-0 z-100 flex justify-center px-4 pointer-events-none"
          style={{ paddingTop: 'max(12px, env(safe-area-inset-top))', maxWidth: '600px', margin: '0 auto' }}
        >
          <div
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-xl pointer-events-auto"
            style={{
              background: bg,
              borderColor: border,
              boxShadow: `0 8px 32px rgba(0,0,0,0.55), 0 0 0 1px ${border}33`,
            }}
          >
            <Icon
              className="w-5 h-5 shrink-0"
              style={{ color: accent }}
              aria-hidden="true"
            />
            <p
              className="flex-1 text-sm font-bold font-hand"
              style={{ color: accent }}
            >
              {message}
            </p>
            {actionLabel && onAction ? (
              <button
                type="button"
                onClick={() => {
                  onAction();
                  onDismiss();
                }}
                className="shrink-0 rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-wide transition-all active:scale-95"
                style={{
                  color: bg,
                  background: accent,
                  borderColor: accent,
                }}
              >
                {actionLabel}
              </button>
            ) : null}
            <button
              onClick={onDismiss}
              className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full transition-all active:scale-90"
              style={{ color: accent, background: `${border}22` }}
              aria-label="Dismiss"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
