import { motion } from 'motion/react';
import { Wifi, X } from 'lucide-react';

/**
 * RejoinPrompt - Shows when user has an active room from a previous session.
 * Asks if they want to rejoin the game in progress.
 */
export function RejoinPrompt({
  roomCode,
  onRejoin,
  onDismiss,
}: {
  roomCode: string;
  onRejoin: () => void;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      className="absolute inset-x-4 bottom-8 z-50 rounded-2xl p-5 border"
      style={{
        background: '#0d2018',
        borderColor: 'rgba(0,208,96,0.3)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(0,208,96,0.15)' }}
        >
          <Wifi className="w-5 h-5" style={{ color: '#00d060' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm mb-1">Game in Progress</p>
          <p className="text-xs leading-relaxed" style={{ color: '#6baf80' }}>
            You were in room <span className="font-bold text-white">{roomCode}</span>.
            Would you like to rejoin?
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="p-1.5 rounded-lg transition-all active:scale-90 shrink-0"
          style={{ background: '#1a3528' }}
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" style={{ color: '#6baf80' }} />
        </button>
      </div>

      <div className="flex gap-2 mt-4">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onRejoin}
          className="flex-1 py-3 rounded-xl text-black text-sm font-bold"
          style={{ background: '#00d060' }}
        >
          Rejoin Game
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onDismiss}
          className="flex-1 py-3 rounded-xl text-sm font-bold border"
          style={{ background: 'transparent', borderColor: '#1a3528', color: '#6baf80' }}
        >
          No Thanks
        </motion.button>
      </div>
    </motion.div>
  );
}
