import { motion } from 'motion/react';

export function BootScreen() {
  return (
    <motion.div
      key="boot"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="flex-1 flex items-center justify-center"
    >
      <div className="flex flex-col items-center gap-4">
        <img
          src="/tick-tick-logo.png"
          alt="Tick-Tick"
          className="w-24 opacity-90"
          style={{ filter: 'drop-shadow(0 4px 16px rgba(0,208,96,0.3))' }}
        />
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: '#00d060' }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
