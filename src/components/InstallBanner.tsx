import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Share, ExternalLink } from 'lucide-react';
import type { InstallMode } from '../utils/useInstallPrompt';

interface InstallBannerProps {
  visible: boolean;
  installMode: InstallMode;
  onInstall: () => void;
  onDismiss: () => void;
}

export function InstallBanner({ visible, installMode, onInstall, onDismiss }: InstallBannerProps) {
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
          {installMode === 'ios-safari' && (
            /* iOS Safari — Share sheet instructions */
            <div
              className="px-4 py-3.5 rounded-2xl border"
              style={{ background: '#0d2018', borderColor: 'rgba(0,208,96,0.2)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}
            >
              <div className="flex items-start justify-between gap-2 mb-2.5">
                <p className="text-white text-xs font-bold">Add to Home Screen</p>
                <button onClick={onDismiss} className="shrink-0 active:scale-90" aria-label="Dismiss" style={{ color: '#3a5a45' }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-2.5">
                <Share className="w-4 h-4 shrink-0" style={{ color: '#00d060' }} />
                <p className="text-[11px] leading-relaxed" style={{ color: '#6baf80' }}>
                  Tap <span className="font-bold text-white">Share</span> at the bottom of Safari, then{' '}
                  <span className="font-bold text-white">Add to Home Screen</span>
                </p>
              </div>
            </div>
          )}

          {installMode === 'ios-other' && (
            /* iOS Chrome/Firefox — can't install, must use Safari */
            <div
              className="px-4 py-3.5 rounded-2xl border"
              style={{ background: '#0d2018', borderColor: 'rgba(255,184,0,0.2)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}
            >
              <div className="flex items-start justify-between gap-2 mb-2.5">
                <p className="text-white text-xs font-bold">Add to Home Screen</p>
                <button onClick={onDismiss} className="shrink-0 active:scale-90" aria-label="Dismiss" style={{ color: '#3a5a45' }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-2.5">
                <ExternalLink className="w-4 h-4 shrink-0" style={{ color: '#ffb800' }} />
                <p className="text-[11px] leading-relaxed" style={{ color: '#6baf80' }}>
                  Open this page in <span className="font-bold text-white">Safari</span> to add it to your home screen
                </p>
              </div>
            </div>
          )}

          {installMode === 'android' && (
            /* Android Chrome — native install prompt */
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-2xl border"
              style={{ background: '#0d2018', borderColor: 'rgba(0,208,96,0.2)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(0,208,96,0.12)' }}>
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
              <button onClick={onDismiss} className="w-6 h-6 flex items-center justify-center rounded-full shrink-0 active:scale-90" style={{ color: '#3a5a45' }} aria-label="Dismiss">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
