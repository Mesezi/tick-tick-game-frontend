import { motion, AnimatePresence } from 'motion/react';
import { Download, X } from 'lucide-react';

interface InstallBannerProps {
  visible: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}

/**
 * Subtle bottom banner prompting the user to install the PWA.
 * Slides up from the bottom, stays out of the way of main CTAs.
 */
export function InstallBanner({ visible, onInstall, onDismiss }: InstallBannerProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 24, stiffness: 280, delay: 1.5 }}
          className="absolute bottom-4 inset-x-4 z-40"
        >
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-2xl border"
            style={{
              background: '#0d2018',
              borderColor: 'rgba(0,208,96,0.2)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
            }}
          >
            {/* Icon */}
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(0,208,96,0.12)' }}
            >
              <Download className="w-4 h-4" style={{ color: '#00d060' }} />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-bold">Add to Home Screen</p>
              <p className="text-[10px]" style={{ color: '#6baf80' }}>
                Play faster, offline-ready
              </p>
            </div>

            {/* Install button */}
            <button
              onClick={onInstall}
              className="px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all active:scale-95"
              style={{ background: '#00d060', color: '#000' }}
            >
              Install
            </button>

            {/* Dismiss */}
            <button
              onClick={onDismiss}
              className="w-6 h-6 flex items-center justify-center rounded-full shrink-0 transition-all active:scale-90"
              style={{ color: '#3a5a45' }}
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
