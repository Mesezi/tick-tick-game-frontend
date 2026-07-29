import { useState } from 'react';
import { motion } from 'motion/react';
import { useGameStore } from '../store/gameStore';
import { apiClient } from '../api/client';
import { showToast } from '../components/toastStore';

const AVATARS = ['🦁', '🐯', '🦊', '🐺', '🦅', '🦋', '🐘', '🦏', '🦓', '🐊', '🦒', '🐆'];

/**
 * AvatarSetupScreen - Exact replica of Game Screen Flow Design avatar screen.
 * 4-column emoji grid, display name input, Dela Gothic heading.
 */
export function AvatarSetupScreen() {
  const session = useGameStore((s) => s.session);
  const setSession = useGameStore((s) => s.setSession);

  const [selectedAvatar, setSelectedAvatar] = useState<number | null>(null);
  const [playerName, setPlayerName] = useState(session?.displayName || '');
  const [isSaving, setIsSaving] = useState(false);

  const canContinue = selectedAvatar !== null && playerName.length >= 2;

  const handleContinue = async () => {
    if (!canContinue || !session) return;

    setIsSaving(true);
    const avatarId = AVATARS[selectedAvatar!];

    try {
      // Save to backend immediately
      await apiClient.updateProfile({ displayName: playerName, avatarId });
    } catch {
      // Non-critical — continue even if backend save fails (will sync later)
      console.warn('[AvatarSetup] Failed to save profile to backend');
    }

    // Update local session
    setSession({
      ...session,
      displayName: playerName,
      avatarId,
    });

    showToast(`Welcome, ${playerName}! 🎮`, 'success');
    setIsSaving(false);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" data-testid="screen-avatar-setup">
      <div className="px-6 pt-8 pb-4">
        <p
          className="text-xs font-bold tracking-widest uppercase mb-1"
          style={{ color: '#00d060' }}
        >
          Setup
        </p>
        <h2
          className="text-white mb-1"
          style={{
            fontFamily: "'Dela Gothic One', sans-serif",
            fontSize: '38px',
            lineHeight: 1,
          }}
        >
          Your Look
        </h2>
        <p className="text-sm" style={{ color: '#6baf80' }}>
          Pick an avatar and enter your display name
        </p>
      </div>

      <div
        className="flex-1 overflow-y-auto px-6 pb-4"
        style={{ scrollbarWidth: 'none' }}
      >
        <div className="grid grid-cols-4 gap-2.5 mb-8">
          {AVATARS.map((av, i) => (
            <motion.button
              key={i}
              whileTap={{ scale: 0.87 }}
              onClick={() => setSelectedAvatar(i)}
              className="aspect-square rounded-2xl text-3xl flex items-center justify-center border-2 transition-all"
              style={{
                background:
                  selectedAvatar === i
                    ? 'rgba(0,208,96,0.18)'
                    : '#0d2018',
                borderColor:
                  selectedAvatar === i ? '#00d060' : 'transparent',
                boxShadow:
                  selectedAvatar === i
                    ? '0 0 18px rgba(0,208,96,0.28)'
                    : 'none',
              }}
            >
              {av}
            </motion.button>
          ))}
        </div>

        <label
          className="block text-xs font-bold tracking-widest uppercase mb-2"
          style={{ color: '#a0c8a8' }}
        >
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

      <div className="px-6 pb-8">
        <motion.button
          whileTap={{ scale: 0.96 }}
          disabled={!canContinue || isSaving}
          onClick={handleContinue}
          className="w-full rounded-2xl py-4 text-black font-bold transition-all"
          style={{
            fontFamily: "'Dela Gothic One', sans-serif",
            fontSize: '22px',
            background: canContinue && !isSaving ? '#00d060' : '#122318',
            color: canContinue && !isSaving ? '#000' : '#2a4a33',
          }}
        >
          {isSaving ? 'Saving...' : 'Continue →'}
        </motion.button>
      </div>
    </div>
  );
}
