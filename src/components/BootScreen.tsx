import { motion } from 'motion/react';

/**
 * BootScreen — chalk-dust loading animation.
 * Shown while the app initialises (auth + socket handshake).
 */
export function BootScreen() {
  return (
    <motion.div
      key="boot"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex-1 flex items-center justify-center bg-chalk-board"
    >
      <div className="flex flex-col items-center gap-5">
        {/* Logo */}
        <motion.img
          src="/tick-tick-logo.png"
          alt="Tick-Tick"
          className="w-28"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
          style={{ filter: 'drop-shadow(0 4px 20px rgba(107,68,35,0.3))' }}
        />

        {/* Chalk dust loading dots */}
        <div className="flex gap-2 items-center">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-chalk-mark"
              animate={{ opacity: [0.25, 1, 0.25], scale: [0.8, 1.1, 0.8] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.22, ease: 'easeInOut' }}
            />
          ))}
        </div>

        {/* Label */}
        <p className=" font-bold tracking-[0.2em] uppercase font-hand text-chalk-mark">
          Loading...
        </p>
      </div>
    </motion.div>
  );
}
