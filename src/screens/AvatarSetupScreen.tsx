import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ClipboardList, Shield } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { apiClient } from '../api/client';
import { showToast } from '../components/toastStore';
import { loginAsGuest } from '../hooks/useAppInit';
import { track } from '../utils/analytics';
import { AVATAR_PORTRAITS, getAvatarPortrait } from '../utils/avatarHelper';
import { AvatarDisplay } from '../components/AvatarDisplay';

const AVATAR_OPTIONS = [...AVATAR_PORTRAITS.map((portrait) => portrait.id)];

type Step = 'profile' | 'link-prompt';

/**
 * AvatarSetupScreen — classroom registration form aesthetic.
 * Exercise book card, chalk-style headings, ruled paper inputs.
 */
export function AvatarSetupScreen() {
  const session = useGameStore((s) => s.session);
  const setSession = useGameStore((s) => s.setSession);

  const [step, setStep] = useState<Step>('profile');
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState(session?.displayName || '');
  const [isSaving, setIsSaving] = useState(false);

  const canContinue = selectedAvatar !== null && playerName.length >= 2;
  const avatarId = selectedAvatar ?? '';

  const handleSaveProfile = async () => {
    if (!canContinue) return;
    setIsSaving(true);
    try {
      let currentSession = useGameStore.getState().session;


      console.log(currentSession)

      if (!currentSession) {
        await loginAsGuest();
        currentSession = useGameStore.getState().session;
      }
      if (!currentSession) {
        showToast('Could not connect. Check your connection.', 'error');
        setIsSaving(false);
        return;
      }
      try {
        await apiClient.updateProfile({ displayName: playerName, avatarId });
      } catch {
        console.warn('[AvatarSetup] Backend profile save failed, continuing locally');
      }
      setSession({ ...currentSession, displayName: playerName, avatarId });
      track('profile_setup_completed', { isAuthenticated: currentSession.isAuthenticated });
      if (currentSession.isAuthenticated) {
        showToast(`Welcome, ${playerName}! 🎮`, 'success');
        return;
      }
      setStep('link-prompt');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLinkGoogle = async () => {
    track('google_link_started');
    await apiClient.redirectToGoogle('link');
  };

  const handleSkipLink = () => {
    track('google_link_skipped');
    showToast(`Welcome, ${playerName}! 🎮`, 'success');
    const s = useGameStore.getState().session;
    if (s) setSession({ ...s });
  };

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden paper-body"
      data-testid="screen-avatar-setup"
    >
      <AnimatePresence mode="wait">
        {step === 'profile' ? (
          <motion.div
            key="profile"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 pt-4 pb-4 shrink-0">
              {/* Chalkboard heading */}
              <div className="rounded-2xl px-5 py-4">
                <p className="label-section mb-0.5 flex items-center gap-1.5">
                  <ClipboardList className="w-3.5 h-3.5" /> Student Registration
                </p>
                <h2 className="font-display text-[32px] text-chalk-white leading-none">
                  Pick Your Look
                </h2>
                <p className="text-sm mt-1 font-hand text-chalk-board">
                  Choose an avatar and enter your game name
                </p>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 pb-4 scrollbar-mobile-hidden">
              {/* Avatar grid */}
              <p className="label-section mb-3">Choose Avatar</p>
              <div className="grid  grid-cols-4 md:grid-cols-5 gap-3 mb-6">
                {AVATAR_OPTIONS.map((av) => (
                  <motion.button
                    key={av}
                    whileTap={{ scale: 0.85 }}
                    onClick={() => setSelectedAvatar(av)}
                    aria-label={`Choose ${getAvatarPortrait(av)?.label ?? av} avatar`}
                    aria-pressed={selectedAvatar === av}
                    className="aspect-square rounded-2xl text-3xl flex items-center justify-center border-2 transition-all overflow-hidden"
                    style={{
                      background: selectedAvatar === av ? 'rgba(107,68,35,0.1)' : 'rgba(139,94,60,0.07)',
                      borderColor: selectedAvatar === av ? '#6b4423' : '#c8b89a',
                      boxShadow: selectedAvatar === av
                        ? '0 0 0 3px rgba(107,68,35,0.16), 0 4px 12px rgba(107,68,35,0.12)'
                        : 'none',
                    }}
                  >
                    <AvatarDisplay avatarId={av} imageClassName="h-full w-full object-contain pt-2" />
                  </motion.button>
                ))}
              </div>

              {/* Name input — exercise book style */}
              <p className="label-section mb-2">Display Name</p>
              <div
                className="input-ruled mb-1"
                style={{
                  border: `2px solid ${playerName.length >= 2 ? '#6b4423' : '#c8b89a'}`,
                  boxShadow: playerName.length >= 2 ? '0 0 0 3px rgba(107,68,35,0.12)' : 'none',
                }}
              >
                <input
                  type="text"
                  maxLength={20}
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Your game name..."
                  className="w-full px-4 py-3.5 outline-none bg-transparent font-hand text-[17px] text-ink-dark"
                  style={{ caretColor: '#6b4423' }}
                />
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-hand text-desk">
                  {playerName.length < 2 ? 'Min. 2 characters' : '✓ Looking good!'}
                </span>
                <span className="text-sm font-hand text-desk">
                  {playerName.length}/20
                </span>
              </div>
            </div>

            {/* CTA */}
            <div className="px-6 pb-8 pb-safe pt-3 shrink-0">
              <motion.button
                whileTap={{ scale: 0.96 }}
                disabled={!canContinue || isSaving}
                onClick={handleSaveProfile}
                className="w-full rounded-2xl py-4 font-bold transition-all font-display text-[22px]"
                style={{
                  background: canContinue && !isSaving ? '#6b4423' : 'rgba(139,94,60,0.12)',
                  color: canContinue && !isSaving ? '#f5f0e8' : '#8b5e3c',
                  boxShadow: canContinue && !isSaving ? '0 4px 16px rgba(107,68,35,0.28)' : 'none',
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
            transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
            className="flex-1 flex flex-col items-center justify-center px-8 text-center paper-body"
          >
            {/* Icon */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', bounce: 0.3, duration: 0.5 }}
              className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
              style={{ background: 'rgba(139,94,60,0.12)', border: '2px solid rgba(139,94,60,0.28)' }}
            >
              <Shield className="w-10 h-10 text-chalk-mark" />
            </motion.div>

            <h2 className="mb-3 font-display text-[28px] text-ink-dark leading-tight">
              Save Your Progress
            </h2>
            <p className="text-sm leading-relaxed mb-8 max-w-70 font-hand text-chalk-board">
              Link a Google account so you can recover your scores and profile on any device — like saving your exercise book!
            </p>

            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleLinkGoogle}
              className="w-full max-w-70 rounded-2xl py-4 mb-3 font-bold text-base flex items-center justify-center gap-2.5 border font-hand text-ink-dark"
              style={{
                background: 'rgba(139,94,60,0.08)',
                borderColor: 'rgba(139,94,60,0.3)',
              }}
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
              className="text-sm font-hand text-desk"
            >
              Maybe later →
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
