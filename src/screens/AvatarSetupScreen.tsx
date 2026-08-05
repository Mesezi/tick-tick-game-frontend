import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, ArrowLeft } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { apiClient } from '../api/client';
import { showToast } from '../components/toastStore';
import { loginAsGuest } from '../hooks/useAppInit';
import { track } from '../utils/analytics';

const AVATARS = ['🦁', '🐯', '🦊', '🐺', '🦅', '🦋', '🐘', '🦏', '🦓', '🐊', '🦒', '🐆'];

type Step = 'profile' | 'link-prompt';

/**
 * AvatarSetupScreen — two-step flow:
 * 1. Pick avatar + display name
 *    - If no session yet (new user): creates guest account first, then saves profile
 *    - If session exists (Google user with no avatar): just saves profile
 * 2. Offer to link Google account (guests only)
 */
export function AvatarSetupScreen() {
  const session = useGameStore((s) => s.session);
  const setSession = useGameStore((s) => s.setSession);

  const [step, setStep] = useState<Step>('profile');
  const [selectedAvatar, setSelectedAvatar] = useState<number | null>(null);
  const [playerName, setPlayerName] = useState(session?.displayName || '');
  const [isSaving, setIsSaving] = useState(false);

  const canContinue = selectedAvatar !== null && playerName.length >= 2;
  const avatarId = selectedAvatar !== null ? AVATARS[selectedAvatar] : '';

  const handleSaveProfile = async () => {
    if (!canContinue) return;
    setIsSaving(true);

    try {
      let currentSession = useGameStore.getState().session;

      // No session yet — this is a brand new user who chose "Start Playing"
      // Create the guest account now (after they've set name + avatar)
      if (!currentSession) {
        await loginAsGuest();
        currentSession = useGameStore.getState().session;
      }

      if (!currentSession) {
        showToast('Could not connect. Check your connection.', 'error');
        setIsSaving(false);
        return;
      }

      // Save profile to backend
      try {
        await apiClient.updateProfile({ displayName: playerName, avatarId });
      } catch {
        console.warn('[AvatarSetup] Backend profile save failed, continuing locally');
      }

      // Update local session
      setSession({ ...currentSession, displayName: playerName, avatarId });
      track('profile_setup_completed', { isAuthenticated: currentSession.isAuthenticated });

      // Google users already authenticated — skip link prompt, go straight to lobby
      if (currentSession.isAuthenticated) {
        showToast(`Welcome, ${playerName}! 🎮`, 'success');
        return;
      }

      // Guest → show link prompt
      setStep('link-prompt');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLinkGoogle = async () => {
    track('google_link_started');
    await apiClient.redirectToGoogle();
  };

  const handleSkipLink = () => {
    track('google_link_skipped');
    showToast(`Welcome, ${playerName}! 🎮`, 'success');
    // Trigger re-render — deriveScreen will route to Lobby since session is now complete
    const s = useGameStore.getState().session;
    if (s) setSession({ ...s });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" data-testid="screen-avatar-setup">
      <AnimatePresence mode="wait">
        {step === 'profile' ? (
          <motion.div
            key="profile"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div className="px-6 pt-8 pb-4">
              <button
                onClick={() => useGameStore.getState().setHasPassedLanding(false)}
                className="mb-3 p-2 rounded-xl border transition-all active:scale-95"
                style={{ background: '#0d2018', borderColor: '#1a3528' }}
              >
                <ArrowLeft className="w-5 h-5" style={{ color: '#6baf80' }} />
              </button>
              <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: '#00d060' }}>
                Setup
              </p>
              <h2
                className="text-white mb-1"
                style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: '38px', lineHeight: 1 }}
              >
                Your Look
              </h2>
              <p className="text-sm" style={{ color: '#6baf80' }}>
                Pick an avatar and enter your display name
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-4" style={{ scrollbarWidth: 'none' }}>
              <div className="grid grid-cols-4 gap-2.5 mb-8">
                {AVATARS.map((av, i) => (
                  <motion.button
                    key={i}
                    whileTap={{ scale: 0.87 }}
                    onClick={() => setSelectedAvatar(i)}
                    className="aspect-square rounded-2xl text-3xl flex items-center justify-center border-2 transition-all"
                    style={{
                      background: selectedAvatar === i ? 'rgba(0,208,96,0.18)' : '#0d2018',
                      borderColor: selectedAvatar === i ? '#00d060' : 'transparent',
                      boxShadow: selectedAvatar === i ? '0 0 18px rgba(0,208,96,0.28)' : 'none',
                    }}
                  >
                    {av}
                  </motion.button>
                ))}
              </div>

              <label className="block text-xs font-bold tracking-widest uppercase mb-2" style={{ color: '#a0c8a8' }}>
                Display Name
              </label>
              <input
                type="text"
                maxLength={20}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Your game name..."
                className="w-full rounded-xl px-4 py-3.5 text-white outline-none transition-all"
                style={{
                  background: '#0d2018',
                  border: `1.5px solid ${playerName.length >= 2 ? '#00d060' : '#1a3528'}`,
                  caretColor: '#00d060',
                }}
              />
              <div className="flex justify-between mt-1.5">
                <span className="text-xs" style={{ color: '#3a5a45' }}>
                  {playerName.length < 2 ? 'Min. 2 characters' : 'Looking good!'}
                </span>
                <span className="text-xs" style={{ color: '#3a5a45' }}>
                  {playerName.length}/20
                </span>
              </div>
            </div>

            <div className="px-6 pb-8 pb-safe">
              <motion.button
                whileTap={{ scale: 0.96 }}
                disabled={!canContinue || isSaving}
                onClick={handleSaveProfile}
                className="w-full rounded-2xl py-4 text-black font-bold transition-all"
                style={{
                  fontFamily: "'Dela Gothic One', sans-serif",
                  fontSize: '22px',
                  background: canContinue && !isSaving ? '#00d060' : '#122318',
                  color: canContinue && !isSaving ? '#000' : '#2a4a33',
                }}
              >
                {isSaving ? 'Setting up...' : 'Continue →'}
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="link-prompt"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 flex flex-col items-center justify-center px-8 text-center"
          >
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
              style={{ background: 'rgba(0,208,96,0.12)' }}
            >
              <Shield className="w-10 h-10" style={{ color: '#00d060' }} />
            </div>

            <h2
              className="text-white mb-3"
              style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: '30px', lineHeight: 1.1 }}
            >
              Save Your Progress
            </h2>
            <p className="text-sm leading-relaxed mb-8 max-w-[280px]" style={{ color: '#6baf80' }}>
              Link a Google account so you can recover your scores and profile on any device.
            </p>

            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleLinkGoogle}
              className="w-full max-w-[280px] rounded-2xl py-4 mb-3 font-bold text-sm flex items-center justify-center gap-2.5 border"
              style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.15)', color: 'white' }}
            >
              <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true" className="shrink-0">
                <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18Z"/>
                <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17Z"/>
                <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07Z"/>
                <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3Z"/>
              </svg>
              Link Google Account
            </motion.button>

            <button
              onClick={handleSkipLink}
              className="text-sm"
              style={{ color: '#3a5a45' }}
            >
              Maybe later →
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
