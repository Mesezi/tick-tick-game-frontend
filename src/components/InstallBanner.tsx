import { motion, AnimatePresence } from 'motion/react';
import { Download, X, CheckCircle2 } from 'lucide-react';
import type { InstallMode } from '../utils/useInstallPrompt';

interface InstallBannerProps {
  visible: boolean;
  installMode: InstallMode;
  onInstall: () => void;
  onConfirmInstalled: () => void;
  onDismiss: () => void;
}

/**
 * InstallBanner — classroom notice-board style PWA install prompt.
 * Exercise-book card with a wood-brown CTA.
 */
export function InstallBanner({ visible, installMode, onInstall, onConfirmInstalled, onDismiss }: InstallBannerProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.42, delay: 1.5 }}
          className="absolute bottom-4 inset-x-4 z-40"
        >
          {installMode === 'ios' ? (
            <div
              className="px-4 py-4 rounded-2xl card-dark"
              style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold font-hand text-chalk-white">
                  📲 Add to Home Screen
                </p>
                <button
                  onClick={onDismiss}
                  aria-label="Dismiss"
                  className="active:scale-90 text-chalk-mark"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Steps */}
              <div className="space-y-2 mb-3">
                {[
                  'Tap the Share button at the bottom of your browser',
                  'Scroll down and tap Add to Home Screen',
                  'Tap Add to confirm',
                ].map((text, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 mt-0.5 font-hand text-desk"
                      style={{ background: 'rgba(107,68,35,0.16)' }}
                    >
                      {i + 1}
                    </span>
                    <p className=" leading-relaxed font-hand text-chalk-white">
                      {text}
                    </p>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={onInstall}
                  className="flex-1 py-2 rounded-xl text-sm font-bold active:scale-95 transition-all btn-ghost"
                >
                  Remind me later
                </button>
                <button
                  onClick={onConfirmInstalled}
                  className="flex-1 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all btn-primary font-hand"
                  style={{ boxShadow: '0 3px 10px rgba(107,68,35,0.28)' }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  I've installed it
                </button>
              </div>
            </div>
          ) : (
            /* Android / Desktop — native install prompt */
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-2xl card-dark"
              style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.35)' }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(107,68,35,0.16)', border: '1px solid rgba(107,68,35,0.28)' }}
              >
                <Download className="w-4 h-4 text-desk" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold font-hand text-chalk-white">
                  Add to Home Screen
                </p>
                <p className="text-[12px] font-hand text-chalk-white">
                  Play faster, offline-ready
                </p>
              </div>
              <button
                onClick={onInstall}
                className="px-3 py-1.5 rounded-lg text-sm font-bold shrink-0 active:scale-95 btn-primary font-hand"
              >
                Install
              </button>
              <button
                onClick={onDismiss}
                className="w-6 h-6 flex items-center justify-center rounded-full shrink-0 active:scale-90 text-chalk-mark"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
