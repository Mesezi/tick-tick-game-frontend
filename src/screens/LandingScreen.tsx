import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Radio, Trophy, ArrowLeft, User, Pencil, X } from 'lucide-react';
import { toast } from 'sonner';
import { useGameStore } from '../store/gameStore';
import { useLeaderboard, usePlayerStats } from '../api/queries';
import { apiClient } from '../api/client';
import { preloadSounds } from '../audio/soundManager';

/**
 * LandingScreen - Landing page with "Start Playing" CTA and Leaderboard access.
 * Nigerian flag stripe, floating letters, bold Dela Gothic heading, neon green CTA.
 */
export function LandingScreen() {
  const setSession = useGameStore((s) => s.setSession);
  const setHasPassedLanding = useGameStore((s) => s.setHasPassedLanding);
  const session = useGameStore((s) => s.session);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const handlePlay = () => {
    // Preload sounds on first user interaction (required by browser autoplay policy)
    preloadSounds();
    const existing = useGameStore.getState().session;
    if (!existing) {
      setSession({
        token: '',
        userId: crypto.randomUUID(),
        displayName: null,
        avatarId: '',
        isAuthenticated: false,
        deviceId: '',
      });
    }
    setHasPassedLanding(true);
  };

  return (
    <div
      className="relative flex-1 flex flex-col items-center justify-center px-8"
      style={{ overflow: 'hidden' }}
      data-testid="screen-landing"
    >
      {/* Nigerian flag stripe */}
      <div className="absolute top-0 left-0 right-0 h-1 flex">
        <div className="flex-1" style={{ background: '#008751' }} />
        <div className="flex-1" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="flex-1" style={{ background: '#008751' }} />
      </div>

      {/* Floating bg letters */}
      {['S', 'T', 'O', 'P', '!', 'W', 'R'].map((l, i) => (
        <span
          key={i}
          aria-hidden
          className="absolute select-none pointer-events-none"
          style={{
            fontFamily: "'Dela Gothic One', sans-serif",
            color: '#00d060',
            opacity: 0.05 + (i % 3) * 0.02,
            fontSize: `${65 + (i * 18) % 55}px`,
            left: `${(i * 14 + 5) % 82}%`,
            top: `${(i * 17 + 8) % 78}%`,
            animation: `bob${i} ${2.5 + i * 0.45}s ease-in-out ${i * 0.2}s infinite alternate`,
          }}
        >
          {l}
        </span>
      ))}

      <div className="text-center z-10 w-full max-w-[290px] sm:max-w-[360px]">
        <div
          className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-8 border"
          style={{
            background: 'rgba(0,208,96,0.12)',
            borderColor: 'rgba(0,208,96,0.25)',
          }}
        >
          <Radio className="w-3 h-3" style={{ color: '#00d060' }} />
          <span
            className="text-[10px] font-bold tracking-[0.14em] uppercase"
            style={{ color: '#00d060' }}
          >
            Multiplayer
          </span>
        </div>

        <h1
          className="leading-[0.85]"
          style={{
            fontFamily: "'Dela Gothic One', sans-serif",
            fontSize: '76px',
            color: '#ffffff',
          }}
        >
          Tick-
        </h1>
        <h1
          className="leading-[0.85] mb-8"
          style={{
            fontFamily: "'Dela Gothic One', sans-serif",
            fontSize: '76px',
            color: '#00d060',
          }}
        >
          Tick
        </h1>

        <p
          className="text-[13px] leading-relaxed mb-10"
          style={{ color: '#6baf80' }}
        >
          The classic word game you grew up with—now multiplayer.
          Fill every category before someone shouts STOP!
        </p>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handlePlay}
          className="w-full rounded-2xl py-4 mb-3 text-black font-bold text-xl"
          style={{
            background: '#00d060',
            fontFamily: "'Dela Gothic One', sans-serif",
            fontSize: '22px',
          }}
        >
          Start Playing
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowLeaderboard(true)}
          className="w-full rounded-2xl py-3.5 mb-3 font-bold text-sm flex items-center justify-center gap-2 border"
          style={{
            background: 'rgba(255,184,0,0.08)',
            borderColor: 'rgba(255,184,0,0.3)',
            color: '#ffb800',
          }}
        >
          <Trophy className="w-4 h-4" />
          Leaderboard
        </motion.button>

        {session?.displayName && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowProfile(true)}
            className="w-full rounded-2xl py-3.5 mb-4 font-bold text-sm flex items-center justify-center gap-2 border"
            style={{
              background: 'rgba(0,208,96,0.06)',
              borderColor: 'rgba(0,208,96,0.2)',
              color: '#6baf80',
            }}
          >
            <User className="w-4 h-4" />
            My Profile
          </motion.button>
        )}

        <p className="text-xs" style={{ color: '#2a4a33' }}>
          No account needed · Free to play
        </p>
      </div>

      <style>{`
        ${[0, 1, 2, 3, 4, 5, 6]
          .map(
            (i) =>
              `@keyframes bob${i} { from{transform:translateY(0) rotate(${-4 + i * 1.5}deg)} to{transform:translateY(-16px) rotate(${4 - i * 1.5}deg)} }`
          )
          .join('')}
      `}</style>

      {/* Leaderboard Overlay */}
      <AnimatePresence>
        {showLeaderboard && (
          <LeaderboardOverlay onClose={() => setShowLeaderboard(false)} />
        )}
      </AnimatePresence>

      {/* Profile Overlay */}
      <AnimatePresence>
        {showProfile && (
          <ProfileOverlay onClose={() => setShowProfile(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Leaderboard Overlay
// ─────────────────────────────────────────────────────────────────────────────

function LeaderboardOverlay({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'weekly' | 'alltime'>('weekly');
  const [page, setPage] = useState(1);

  const apiType = tab === 'alltime' ? 'all-time' as const : 'weekly' as const;
  const { data, isLoading } = useLeaderboard(apiType, page, 10);

  const entries = data?.data.entries ?? [];
  const totalPages = data?.data.pagination.totalPages ?? 1;

  const handleTabChange = (t: 'weekly' | 'alltime') => {
    setTab(t);
    setPage(1);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 z-50 flex flex-col overflow-hidden"
      style={{ background: '#081510' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-6 pt-12 pb-4 shrink-0">
        <button
          onClick={onClose}
          className="p-2 rounded-xl border transition-all active:scale-95"
          style={{ background: '#0d2018', borderColor: '#1a3528' }}
        >
          <ArrowLeft className="w-5 h-5" style={{ color: '#6baf80' }} />
        </button>
        <div>
          <p
            className="text-xs font-bold tracking-widest uppercase mb-0.5"
            style={{ color: '#6baf80' }}
          >
            Global
          </p>
          <h2
            className="text-white"
            style={{
              fontFamily: "'Dela Gothic One', sans-serif",
              fontSize: '30px',
              lineHeight: 1,
            }}
          >
            Leaderboard
          </h2>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 mb-4 shrink-0">
        <div
          className="flex rounded-xl p-1 gap-1"
          style={{ background: '#0d2018' }}
        >
          {(['weekly', 'alltime'] as const).map((t) => (
            <button
              key={t}
              onClick={() => handleTabChange(t)}
              className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all"
              style={{
                background: tab === t ? '#00d060' : 'transparent',
                color: tab === t ? '#000' : '#6baf80',
              }}
            >
              {t === 'weekly' ? 'This Week' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6" style={{ scrollbarWidth: 'none' }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm animate-pulse" style={{ color: '#6baf80' }}>
              Loading rankings...
            </p>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <span className="text-4xl mb-3" aria-hidden="true">📊</span>
            <p className="text-sm text-center" style={{ color: '#6baf80' }}>
              No rankings yet. Be the first to play!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, i) => {
              const rank = (page - 1) * 10 + i + 1;
              const score = tab === 'weekly' ? entry.weeklyScore : entry.totalScore;
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 p-4 rounded-xl border"
                  style={{
                    background: '#0d2018',
                    borderColor: 'transparent',
                  }}
                >
                  {/* Rank */}
                  <span
                    className="w-8 text-center shrink-0"
                    style={{
                      fontSize: rank <= 3 ? '20px' : '16px',
                      fontFamily: rank > 3 ? "'Dela Gothic One', sans-serif" : undefined,
                      color: '#3a5a45',
                    }}
                  >
                    {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank}
                  </span>

                  {/* Avatar placeholder */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                    style={{
                      background: entry.type === 'REGISTERED' ? 'rgba(0,208,96,0.15)' : '#1a3528',
                      color: entry.type === 'REGISTERED' ? '#00d060' : '#6baf80',
                    }}
                  >
                    {entry.displayName ? entry.displayName.slice(0, 2).toUpperCase() : '??'}
                  </div>

                  {/* Name + type */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-bold truncate">
                      {entry.displayName || 'Anonymous'}
                    </p>
                    <p className="text-[10px]" style={{ color: '#3a5a45' }}>
                      {entry.type === 'REGISTERED' ? '⭐ Registered' : 'Guest'}
                    </p>
                  </div>

                  {/* Score */}
                  <span
                    className="text-white shrink-0"
                    style={{
                      fontFamily: "'Dela Gothic One', sans-serif",
                      fontSize: '18px',
                    }}
                  >
                    {score.toLocaleString()}
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 py-4 mt-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-30"
              style={{ background: '#0d2018', color: '#6baf80' }}
            >
              ← Prev
            </button>
            <span className="text-xs" style={{ color: '#3a5a45' }}>
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-30"
              style={{ background: '#0d2018', color: '#6baf80' }}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      {/* <div className="px-6 pb-8 pt-4 shrink-0">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onClose}
          className="w-full rounded-2xl py-4 text-black"
          style={{
            background: '#00d060',
            fontFamily: "'Dela Gothic One', sans-serif",
            fontSize: '22px',
          }}
        >
          Play Now
        </motion.button>
      </div> */}
    </motion.div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// Profile Overlay
// ─────────────────────────────────────────────────────────────────────────────

function ProfileOverlay({ onClose }: { onClose: () => void }) {
  const session = useGameStore((s) => s.session);
  const { data, isLoading } = usePlayerStats(!!session?.token);
  const [showEdit, setShowEdit] = useState(false);

  const stats = data?.data.stats;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 z-50 flex flex-col overflow-hidden"
      style={{ background: '#081510' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-6 pt-12 pb-4 shrink-0">
        <button
          onClick={onClose}
          className="p-2 rounded-xl border transition-all active:scale-95"
          style={{ background: '#0d2018', borderColor: '#1a3528' }}
        >
          <ArrowLeft className="w-5 h-5" style={{ color: '#6baf80' }} />
        </button>
        <div>
          <p
            className="text-xs font-bold tracking-widest uppercase mb-0.5"
            style={{ color: '#00d060' }}
          >
            Player
          </p>
          <h2
            className="text-white"
            style={{
              fontFamily: "'Dela Gothic One', sans-serif",
              fontSize: '30px',
              lineHeight: 1,
            }}
          >
            Profile
          </h2>
        </div>
      </div>

      {/* Player card */}
      <div className="px-6 mb-5 shrink-0">
        <div
          className="flex items-center gap-4 p-5 rounded-2xl border"
          style={{ background: '#0d2018', borderColor: '#1a3528' }}
        >
          <span className="text-4xl">{session?.avatarId || '🎮'}</span>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-lg truncate">
              {session?.displayName || 'Anonymous'}
            </p>
            <p className="text-xs" style={{ color: '#6baf80' }}>
              {session?.isAuthenticated ? '⭐ Registered' : 'Guest Player'}
            </p>
          </div>
          {stats && (
            <div className="text-right">
              <p
                style={{
                  fontFamily: "'Dela Gothic One', sans-serif",
                  fontSize: '24px',
                  color: '#ffb800',
                }}
              >
                {stats.totalScore}
              </p>
              <p className="text-[10px]" style={{ color: '#6baf80' }}>
                total pts
              </p>
            </div>
          )}
        </div>
        {/* Edit profile button */}
        <button
          onClick={() => setShowEdit(true)}
          className="mt-3 w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all active:scale-95"
          style={{ background: '#0d2018', borderColor: '#1a3528', color: '#6baf80' }}
        >
          <Pencil className="w-3 h-3" />
          Edit Profile
        </button>
      </div>

      {/* Stats */}
      <div
        className="flex-1 overflow-y-auto px-6"
        style={{ scrollbarWidth: 'none' }}
      >
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-14 rounded-xl animate-pulse"
                style={{ background: '#0d2018' }}
              />
            ))}
          </div>
        ) : !stats ? (
          <div className="flex flex-col items-center justify-center py-12">
            <span className="text-4xl mb-3" aria-hidden="true">🎮</span>
            <p className="text-sm text-center" style={{ color: '#6baf80' }}>
              Play some games to see your stats!
            </p>
          </div>
        ) : (
          <>
            {/* Score section */}
            <p
              className="text-xs font-bold tracking-widest uppercase mb-3"
              style={{ color: '#a0c8a8' }}
            >
              Scores
            </p>
            <div className="grid grid-cols-2 gap-2 mb-5">
              <StatCard label="Total Score" value={stats.totalScore} color="#ffb800" />
              <StatCard label="Weekly Score" value={stats.weeklyScore} color="#00d060" />
              <StatCard label="Best Round" value={stats.bestRoundScore} color="#ff9600" />
              <StatCard label="Best Match" value={stats.bestMatchScore} color="#ff9600" />
            </div>

            {/* Games section */}
            <p
              className="text-xs font-bold tracking-widest uppercase mb-3"
              style={{ color: '#a0c8a8' }}
            >
              Games
            </p>
            <div className="grid grid-cols-2 gap-2 mb-5">
              <StatCard label="Played" value={stats.gamesPlayed} color="#6baf80" />
              <StatCard label="Won" value={stats.gamesWon} color="#00d060" />
              <StatCard label="Win Streak" value={stats.currentWinStreak} color="#ffb800" />
              <StatCard label="Best Streak" value={stats.bestWinStreak} color="#ffb800" />
            </div>

            {/* Placements */}
            <p
              className="text-xs font-bold tracking-widest uppercase mb-3"
              style={{ color: '#a0c8a8' }}
            >
              Placements
            </p>
            <div className="flex gap-2 mb-5">
              <div
                className="flex-1 py-4 rounded-xl text-center border"
                style={{ background: 'rgba(255,184,0,0.08)', borderColor: 'rgba(255,184,0,0.2)' }}
              >
                <p className="text-lg">🥇</p>
                <p
                  style={{
                    fontFamily: "'Dela Gothic One', sans-serif",
                    fontSize: '22px',
                    color: '#ffb800',
                  }}
                >
                  {stats.firstPlaceCount}
                </p>
              </div>
              <div
                className="flex-1 py-4 rounded-xl text-center border"
                style={{ background: 'rgba(192,192,192,0.06)', borderColor: 'rgba(192,192,192,0.15)' }}
              >
                <p className="text-lg">🥈</p>
                <p
                  style={{
                    fontFamily: "'Dela Gothic One', sans-serif",
                    fontSize: '22px',
                    color: '#c0c0c0',
                  }}
                >
                  {stats.secondPlaceCount}
                </p>
              </div>
              <div
                className="flex-1 py-4 rounded-xl text-center border"
                style={{ background: 'rgba(205,127,50,0.06)', borderColor: 'rgba(205,127,50,0.15)' }}
              >
                <p className="text-lg">🥉</p>
                <p
                  style={{
                    fontFamily: "'Dela Gothic One', sans-serif",
                    fontSize: '22px',
                    color: '#cd7f32',
                  }}
                >
                  {stats.thirdPlaceCount}
                </p>
              </div>
            </div>

            {/* Words */}
            <p
              className="text-xs font-bold tracking-widest uppercase mb-3"
              style={{ color: '#a0c8a8' }}
            >
              Words
            </p>
            <div className="grid grid-cols-2 gap-2 mb-6">
              <StatCard label="Correct" value={stats.correctWords} color="#00d060" />
              <StatCard label="Wrong" value={stats.wrongWords} color="#ff3b5c" />
              <StatCard label="Misspelled" value={stats.misspelledWords} color="#ff9600" />
              <StatCard label="Unique" value={stats.uniqueWords} color="#6baf80" />
            </div>
          </>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="px-6 pb-8 pt-4 shrink-0">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onClose}
          className="w-full rounded-2xl py-4 text-black"
          style={{
            background: '#00d060',
            fontFamily: "'Dela Gothic One', sans-serif",
            fontSize: '22px',
          }}
        >
          Back
        </motion.button>
      </div>

      {/* Edit Profile Overlay */}
      <AnimatePresence>
        {showEdit && (
          <ProfileEditOverlay onClose={() => setShowEdit(false)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      className="p-3.5 rounded-xl border"
      style={{ background: '#0d2018', borderColor: '#1a3528' }}
    >
      <p
        className="mb-0.5"
        style={{
          fontFamily: "'Dela Gothic One', sans-serif",
          fontSize: '20px',
          color,
        }}
      >
        {value.toLocaleString()}
      </p>
      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#3a5a45' }}>
        {label}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile Edit Overlay (reused from Profile screen)
// ─────────────────────────────────────────────────────────────────────────────

const AVATARS = ['🦁', '🐯', '🦊', '🐺', '🦅', '🦋', '🐘', '🦏', '🦓', '🐊', '🦒', '🐆'];

function ProfileEditOverlay({ onClose }: { onClose: () => void }) {
  const session = useGameStore((s) => s.session);
  const setSession = useGameStore((s) => s.setSession);

  const [displayName, setDisplayName] = useState(session?.displayName || '');
  const [selectedAvatar, setSelectedAvatar] = useState<number>(
    AVATARS.indexOf(session?.avatarId || '') >= 0
      ? AVATARS.indexOf(session!.avatarId)
      : 0
  );
  const [isSaving, setIsSaving] = useState(false);

  const canSave = displayName.length >= 2;

  const handleSave = async () => {
    if (!canSave || !session) return;
    setIsSaving(true);

    try {
      await apiClient.updateProfile({
        displayName,
        avatarId: AVATARS[selectedAvatar],
      });

      setSession({
        ...session,
        displayName,
        avatarId: AVATARS[selectedAvatar],
      });

      toast.success('Profile updated! ✨');
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update profile';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex flex-col overflow-hidden"
      style={{ background: '#081510' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-12 pb-4">
        <div>
          <p
            className="text-xs font-bold tracking-widest uppercase mb-1"
            style={{ color: '#00d060' }}
          >
            Edit Profile
          </p>
          <h2
            className="text-white"
            style={{
              fontFamily: "'Dela Gothic One', sans-serif",
              fontSize: '30px',
              lineHeight: 1,
            }}
          >
            Your Look
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-2.5 rounded-xl border transition-all active:scale-95"
          style={{ background: '#0d2018', borderColor: '#1a3528' }}
        >
          <X className="w-5 h-5" style={{ color: '#6baf80' }} />
        </button>
      </div>

      {/* Content */}
      <div
        className="flex-1 overflow-y-auto px-6 pb-4"
        style={{ scrollbarWidth: 'none' }}
      >
        <p
          className="text-xs font-bold tracking-widest uppercase mb-3"
          style={{ color: '#a0c8a8' }}
        >
          Avatar
        </p>
        <div className="grid grid-cols-4 gap-2.5 mb-8">
          {AVATARS.map((av, i) => (
            <motion.button
              key={i}
              whileTap={{ scale: 0.87 }}
              onClick={() => setSelectedAvatar(i)}
              className="aspect-square rounded-2xl text-3xl flex items-center justify-center border-2 transition-all"
              style={{
                background:
                  selectedAvatar === i ? 'rgba(0,208,96,0.18)' : '#0d2018',
                borderColor:
                  selectedAvatar === i ? '#00d060' : 'transparent',
                boxShadow:
                  selectedAvatar === i ? '0 0 18px rgba(0,208,96,0.28)' : 'none',
              }}
            >
              {av}
            </motion.button>
          ))}
        </div>

        <p
          className="text-xs font-bold tracking-widest uppercase mb-2"
          style={{ color: '#a0c8a8' }}
        >
          Display Name
        </p>
        <input
          type="text"
          maxLength={20}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your game name..."
          className="w-full rounded-xl px-4 py-3.5 text-white outline-none transition-all"
          style={{
            background: '#0d2018',
            border: `1.5px solid ${displayName.length >= 2 ? '#00d060' : '#1a3528'}`,
            caretColor: '#00d060',
          }}
        />
        <div className="flex justify-between mt-1.5">
          <span className="text-xs" style={{ color: '#3a5a45' }}>
            {displayName.length < 2 ? 'Min. 2 characters' : 'Looking good!'}
          </span>
          <span className="text-xs" style={{ color: '#3a5a45' }}>
            {displayName.length}/20
          </span>
        </div>
      </div>

      {/* Save button */}
      <div className="px-6 pb-8 pt-2">
        <motion.button
          whileTap={{ scale: 0.96 }}
          disabled={!canSave || isSaving}
          onClick={handleSave}
          className="w-full rounded-2xl py-4 font-bold transition-all"
          style={{
            fontFamily: "'Dela Gothic One', sans-serif",
            fontSize: '22px',
            background: canSave ? '#00d060' : '#122318',
            color: canSave ? '#000' : '#2a4a33',
          }}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </motion.button>
      </div>
    </motion.div>
  );
}
