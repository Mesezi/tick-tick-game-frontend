import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, ArrowLeft, User, Pencil, X, Volume2, VolumeX, Link } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { useInfiniteLeaderboard, useMyLeaderboardRank, usePlayerStats } from '../api/queries';
import { apiClient } from '../api/client';
import { persistenceLayer } from '../persistence/persistenceLayer';
import { socketHandler } from '../socket/socketHandler';
import { preloadSounds, isMuted, toggleMute } from '../audio/soundManager';
import { showToast } from '../components/toastStore';
import { InstallBanner } from '../components/InstallBanner';
import { useInstallPrompt } from '../utils/useInstallPrompt';

/**
 * LandingScreen - Landing page with "Start Playing" CTA and Leaderboard access.
 * Nigerian flag stripe, floating letters, bold Dela Gothic heading, neon green CTA.
 */
export function LandingScreen() {
  const setHasPassedLanding = useGameStore((s) => s.setHasPassedLanding);
  const session = useGameStore((s) => s.session);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const { showBanner, installMode, handleInstall, handleConfirmInstalled, handleDismiss } = useInstallPrompt();

  const handlePlay = () => {
    preloadSounds();
    // If already have a session (returning user), just pass landing
    if (useGameStore.getState().session) {
      setHasPassedLanding(true);
      return;
    }
    // New user — go to avatar setup first, guest created after they complete it
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
        <img
          src="/tick-tick-logo.png"
          alt="Tick-Tick"
          className="w-40 mx-auto mb-4"
          style={{ filter: 'drop-shadow(0 8px 24px rgba(0,208,96,0.25))' }}
        />

        <p
          className="text-[12px] leading-relaxed mb-6"
          style={{ color: '#6baf80' }}
        >
          The classic word game — now multiplayer.
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

        <div className="flex gap-2 mb-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowLeaderboard(true)}
            className="flex-1 rounded-2xl py-3 font-bold text-sm flex items-center justify-center gap-2 border"
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
              className="flex-1 rounded-2xl py-3 font-bold text-sm flex items-center justify-center gap-2 border"
              style={{
                background: 'rgba(0,208,96,0.06)',
                borderColor: 'rgba(0,208,96,0.2)',
                color: '#6baf80',
              }}
            >
              <User className="w-4 h-4" />
              Profile
            </motion.button>
          )}
        </div>

        {/* Link Google nudge — shown to guests who have a profile set up */}
        {session?.displayName && !session.isAuthenticated && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowProfile(true)}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border"
            style={{
              background: 'rgba(0,208,96,0.05)',
              borderColor: 'rgba(0,208,96,0.2)',
            }}
          >
            <Link className="w-4 h-4 shrink-0" style={{ color: '#00d060' }} />
            <p className="flex-1 text-left text-[11px]" style={{ color: '#6baf80' }}>
              Save your progress — link Google
            </p>
            <ArrowLeft className="w-3 h-3 rotate-180 shrink-0" style={{ color: '#00d060' }} />
          </motion.button>
        )}

        {/* Sign in — shown only on new device (no session at all) */}
        {!session && (
          <button
            onClick={() => { apiClient.redirectToGoogle(); }}
            className="mt-2 text-[11px]"
            style={{ color: '#3a5a45' }}
          >
            Already have an account? <span style={{ color: '#00d060', fontWeight: 'bold' }}>Sign in →</span>
          </button>
        )}
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

      {/* PWA install banner */}
      <InstallBanner
        visible={showBanner}
        installMode={installMode}
        onInstall={handleInstall}
        onConfirmInstalled={handleConfirmInstalled}
        onDismiss={handleDismiss}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Leaderboard Overlay
// ─────────────────────────────────────────────────────────────────────────────

function LeaderboardOverlay({ onClose }: { onClose: () => void }) {
  const session = useGameStore((s) => s.session);
  const [tab, setTab] = useState<'weekly' | 'alltime'>('weekly');
  const sentinelRef = useRef<HTMLDivElement>(null);

  const apiType = tab === 'alltime' ? 'all-time' as const : 'weekly' as const;
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteLeaderboard(apiType);
  const { data: myRankData } = useMyLeaderboardRank(apiType, !!session?.token);

  const entries = data?.pages.flatMap((p) => p.data.entries) ?? [];
  const myRank = myRankData?.data.userRank ?? null;
  const myEntryVisible = myRank ? entries.some((e) => e.id === myRank.id) : false;

  // Intersection observer — load next page when sentinel scrolls into view
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (obs) => {
        if (obs[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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
              onClick={() => setTab(t)}
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
              const rank = i + 1;
              const score = tab === 'weekly' ? entry.weeklyScore : entry.totalScore;
              const isYou = entry.id === session?.userId;
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.5) }}
                  className="flex items-center gap-3 p-4 rounded-xl border"
                  style={{
                    background: isYou ? 'rgba(0,208,96,0.13)' : '#0d2018',
                    borderColor: isYou ? '#00d060' : 'transparent',
                    boxShadow: isYou ? '0 0 0 1px rgba(0,208,96,0.25), 0 4px 16px rgba(0,208,96,0.12)' : 'none',
                  }}
                >
                  {/* Rank */}
                  <span
                    className="w-8 text-center shrink-0"
                    style={{
                      fontSize: rank <= 3 ? '20px' : '16px',
                      fontFamily: rank > 3 ? "'Dela Gothic One', sans-serif" : undefined,
                      color: isYou ? '#00d060' : '#3a5a45',
                    }}
                  >
                    {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank}
                  </span>

                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                    style={{
                      background: isYou ? 'rgba(0,208,96,0.22)' : entry.type === 'REGISTERED' ? 'rgba(0,208,96,0.15)' : '#1a3528',
                      color: isYou ? '#00d060' : entry.type === 'REGISTERED' ? '#00d060' : '#6baf80',
                    }}
                  >
                    {entry.displayName ? entry.displayName.slice(0, 2).toUpperCase() : '??'}
                  </div>

                  {/* Name + type */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-bold truncate flex items-center gap-1.5"
                      style={{ color: isYou ? '#00d060' : 'white' }}
                    >
                      {entry.displayName || 'Anonymous'}
                      {isYou && (
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                          style={{ background: 'rgba(0,208,96,0.2)', color: '#00d060' }}
                        >
                          you
                        </span>
                      )}
                    </p>
                    <p className="text-[10px]" style={{ color: isYou ? 'rgba(0,208,96,0.5)' : '#3a5a45' }}>
                      {entry.type === 'REGISTERED' ? '⭐ Registered' : 'Guest'}
                    </p>
                  </div>

                  {/* Score */}
                  <span
                    className="shrink-0"
                    style={{
                      fontFamily: "'Dela Gothic One', sans-serif",
                      fontSize: '18px',
                      color: isYou ? '#00d060' : 'white',
                    }}
                  >
                    {score.toLocaleString()}
                  </span>
                </motion.div>
              );
            })}

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="py-2 flex justify-center">
              {isFetchingNextPage && (
                <p className="text-xs animate-pulse" style={{ color: '#6baf80' }}>
                  Loading more...
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Pinned: current user's rank (shown when not visible on current page) */}
      {myRank && !myEntryVisible && (
        <div className="px-6 pt-3 pb-4 shrink-0 border-t" style={{ borderColor: 'rgba(0,208,96,0.15)' }}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2 text-center" style={{ color: '#3a7a55' }}>
            Your global rank
          </p>
          <div
            className="flex items-center gap-3 p-4 rounded-xl border"
            style={{
              background: 'rgba(0,208,96,0.13)',
              borderColor: '#00d060',
              boxShadow: '0 0 0 1px rgba(0,208,96,0.25), 0 4px 20px rgba(0,208,96,0.15)',
            }}
          >
            <span
              className="w-12 text-center shrink-0"
              style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: '18px', color: '#00d060' }}
            >
              #{myRank.rank}
            </span>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
              style={{ background: 'rgba(0,208,96,0.22)', color: '#00d060' }}
            >
              {myRank.displayName ? myRank.displayName.slice(0, 2).toUpperCase() : '??'}
            </div>
            <p className="flex-1 text-sm font-bold truncate flex items-center gap-1.5" style={{ color: '#00d060' }}>
              {myRank.displayName || 'You'}
              
            </p>
            <span style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: '20px', color: '#00d060' }}>
              {tab === 'weekly' ? myRank.weeklyScore.toLocaleString() : myRank.totalScore.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Bottom CTA */}
      {/* <div className="px-6 pb-6 pt-3 shrink-0">
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await apiClient.deleteAccount();
      persistenceLayer.clearToken();
      socketHandler.disconnect();
      useGameStore.getState().reset();
      showToast('Account deleted', 'info');
    } catch {
      showToast('Failed to delete account. Try again.', 'error');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

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

      <section className='flex-1 overflow-y-auto '  style={{ scrollbarWidth: 'none' }}>

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
        {/* Edit profile + Link Google side by side */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setShowEdit(true)}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all active:scale-95"
            style={{ background: '#0d2018', borderColor: '#1a3528', color: '#6baf80' }}
          >
            <Pencil className="w-3 h-3" />
            Edit Profile
          </button>
          {!session?.isAuthenticated && (
            <button
              onClick={() => { apiClient.redirectToGoogle(); }}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all active:scale-95"
              style={{ background: '#0d2018', borderColor: 'rgba(0,208,96,0.2)', color: '#00d060' }}
            >
              <Link className="w-3 h-3" />
              Link Google
            </button>
          )}
        </div>
      </div>

      {/* Stats + Settings — all scrollable */}
      <div
        className="px-6"
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

        {/* ── Settings ── */}
        <p
          className="text-xs font-bold tracking-widest uppercase mb-3 mt-2"
          style={{ color: '#a0c8a8' }}
        >
          Settings
        </p>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <SoundToggleButton />
        </div>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full py-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 mb-4"
          style={{ color: '#ff3b5c', opacity: 0.6 }}
        >
          Delete Account
        </button>
      </div>
      </section>

      

      {/* Bottom CTA */}
      <div className="px-6 pb-8 pb-safe pt-4 shrink-0">
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

      {/* Delete Account Confirmation */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-end"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          >
            <motion.div
              initial={{ y: 80 }}
              animate={{ y: 0 }}
              exit={{ y: 80 }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              className="w-full px-6 pb-10 pt-6 rounded-t-3xl"
              style={{ background: '#0d2018', borderTop: '1px solid rgba(255,59,92,0.2)' }}
            >
              <p className="text-white font-bold text-base mb-1">Delete Account?</p>
              <p className="text-sm mb-6" style={{ color: '#6baf80' }}>
                This permanently deletes your profile, scores, and all progress. This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3.5 rounded-2xl text-sm font-bold border transition-all active:scale-95"
                  style={{ background: '#0d2018', borderColor: '#1a3528', color: '#6baf80' }}
                >
                  Cancel
                </button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="flex-1 py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-95 disabled:opacity-50"
                  style={{ background: '#ff3b5c', color: 'white' }}
                >
                  {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
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

function SoundToggleButton() {
  const [muted, setMuted] = useState(isMuted());
  return (
    <button
      onClick={() => setMuted(toggleMute())}
      className="p-3 rounded-xl text-[10px] font-bold flex flex-col items-center justify-center gap-1.5 border transition-all active:scale-95"
      style={{ background: '#0d2018', borderColor: '#1a3528', color: '#6baf80' }}
    >
      {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      Sound {muted ? 'Off' : 'On'}
    </button>
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

      showToast('Profile updated! ✨', 'success');
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update profile';
      showToast(message, 'error');
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
      <div className="px-6 pb-8 pb-safe pt-2">
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
