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

export function InstallBanner({ visible, installMode, onInstall, onConfirmInstalled, onDismiss }: InstallBannerProps) {
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
          {installMode === 'ios' ? (
            <div
              className="px-4 py-4 rounded-2xl border"
              style={{
                background: '#0d2018',
                borderColor: 'rgba(0,208,96,0.2)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-white text-xs font-bold">Add to Home Screen</p>
                <button onClick={onDismiss} aria-label="Dismiss" className="active:scale-90" style={{ color: '#3a5a45' }}>
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
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                      style={{ background: 'rgba(0,208,96,0.15)', color: '#00d060' }}
                    >
                      {i + 1}
                    </span>
                    <p className="text-[11px] leading-relaxed" style={{ color: '#6baf80' }}>{text}</p>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={onInstall}
                  className="flex-1 py-2 rounded-xl text-xs font-bold active:scale-95 transition-all"
                  style={{ background: 'rgba(0,208,96,0.08)', color: '#6baf80' }}
                >
                  Remind me later
                </button>
                <button
                  onClick={onConfirmInstalled}
                  className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                  style={{ background: '#00d060', color: '#000' }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  I've installed it
                </button>
              </div>
            </div>
          ) : (
            /* Android — native install prompt */
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-2xl border"
              style={{
                background: '#0d2018',
                borderColor: 'rgba(0,208,96,0.2)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
              }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(0,208,96,0.12)' }}
              >
                <Download className="w-4 h-4" style={{ color: '#00d060' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-bold">Add to Home Screen</p>
                <p className="text-[10px]" style={{ color: '#6baf80' }}>Play faster, offline-ready</p>
              </div>
              <button
                onClick={onInstall}
                className="px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 active:scale-95"
                style={{ background: '#00d060', color: '#000' }}
              >
                Install
              </button>
              <button
                onClick={onDismiss}
                className="w-6 h-6 flex items-center justify-center rounded-full shrink-0 active:scale-90"
                style={{ color: '#3a5a45' }}
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
