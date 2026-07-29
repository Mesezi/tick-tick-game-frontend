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
  onDismiss: () => void;
  duration?: number;
}

interface VariantStyle {
  bg: string;
  border: string;
  accent: string;
  Icon: LucideIcon;
}

const VARIANT_STYLES: Record<GameToastVariant, VariantStyle> = {
  stop:    { bg: '#2a1500', border: '#ffb800', accent: '#ffb800', Icon: OctagonX },
  join:    { bg: '#0d2018', border: '#00d060', accent: '#00d060', Icon: UserPlus },
  info:    { bg: '#0d2018', border: '#6baf80', accent: '#6baf80', Icon: Info },
  host:    { bg: '#1a1800', border: '#ffb800', accent: '#ffb800', Icon: Crown },
  success: { bg: '#0d2018', border: '#00d060', accent: '#00d060', Icon: CheckCircle2 },
  error:   { bg: '#1f0a0a', border: '#ff3b5c', accent: '#ff3b5c', Icon: XCircle },
};

export function GameToast({
  message,
  variant = 'info',
  visible,
  toastId,
  onDismiss,
  duration = 3500,
}: GameToastProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { bg, border, accent, Icon } = VARIANT_STYLES[variant];

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
          className="fixed top-0 inset-x-0 z-100 flex justify-center px-4 pointer-events-none"
          style={{ paddingTop: 'max(12px, env(safe-area-inset-top))', maxWidth: '600px', margin: '0 auto' }}
        >
          <div
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-xl pointer-events-auto"
            style={{
              background: bg,
              borderColor: border,
              boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px ${border}33`,
            }}
          >
            <Icon
              className="w-5 h-5 shrink-0"
              style={{ color: accent }}
              aria-hidden="true"
            />
            <p className="flex-1 text-sm font-bold" style={{ color: accent }}>
              {message}
            </p>
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
