import { motion } from 'motion/react';
import { Shield } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { showToast } from '../components/toastStore';

/**
 * SaveProgressPrompt — exercise-book save card.
 * Shown after a match ends to encourage Google sign-in.
 */
export function SaveProgressPrompt() {
  const session = useGameStore((s) => s.session);
  const setSession = useGameStore((s) => s.setSession);
  const setMatchResults = useGameStore((s) => s.setMatchResults);

  const handleGoogleSignIn = () => {
    showToast('Signing in...', 'info');
    if (session) {
      setSession({ ...session, isAuthenticated: true });
    }
    setMatchResults(null);
  };

  const handleSkip = () => {
    setMatchResults(null);
  };

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center px-8 text-center bg-chalk-board"
      data-testid="screen-save-progress"
    >
      {/* Shield icon */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
        style={{
          background: 'rgba(107,68,35,0.12)',
          border: '2px solid rgba(107,68,35,0.28)',
        }}
      >
        <Shield className="w-10 h-10 text-chalk-mark" />
      </motion.div>

      <h2 className="mb-3 font-display text-[32px] text-chalk-white leading-tight">
        Save Your Progress
      </h2>
      <p className="text-sm leading-relaxed mb-8 max-w-70 font-hand text-chalk-white">
        Link a Google account to save your scores, profile, and climb the
        permanent leaderboard — like keeping your exercise book safe!
      </p>

      {/* Google button */}
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={handleGoogleSignIn}
        className="w-full max-w-75 py-4 rounded-2xl mb-3 flex items-center justify-center gap-2.5 border font-bold text-base font-hand text-chalk-white"
        style={{
          background: 'rgba(240,237,228,0.06)',
          borderColor: 'rgba(240,237,228,0.18)',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true" className="shrink-0">
          <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18Z"/>
          <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17Z"/>
          <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07Z"/>
          <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3Z"/>
        </svg>
        Continue with Google
      </motion.button>

      <button
        onClick={handleSkip}
        className="text-sm font-hand text-chalk-mark"
      >
        Maybe later →
      </button>
    </div>
  );
}
