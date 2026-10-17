import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, ArrowLeft, User, Pencil, X, Volume2, VolumeX, Link, MessageCircle, HelpCircle, BarChart2, Bot, ClipboardList, Gamepad2, Globe, Lightbulb, OctagonX, Pin, Star, Target, Timer, Users } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { useInfiniteLeaderboard, useMyLeaderboardRank, usePlayerStats } from '../api/queries';
import { apiClient } from '../api/client';
import { persistenceLayer } from '../persistence/persistenceLayer';
import { socketHandler } from '../socket/socketHandler';
import { preloadSounds, isMuted, toggleMute } from '../audio/soundManager';
import { showToast } from '../components/toastStore';
import { InstallBanner } from '../components/InstallBanner';
import { useInstallPrompt } from '../utils/useInstallPrompt';
import { AVATAR_PORTRAITS, getAvatarPortrait } from '../utils/avatarHelper';
import { AvatarDisplay } from '../components/AvatarDisplay';

/**
 * LandingScreen – classroom / Nigerian school aesthetic.
 * Chalkboard background, exercise-book card, chalk-style typography.
 */
export function LandingScreen() {
  const setHasPassedLanding = useGameStore((s) => s.setHasPassedLanding);
  const session = useGameStore((s) => s.session);
  const onlineCount = useGameStore((s) => s.onlineCount);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [muted, setMuted] = useState(isMuted());
  const { showBanner, installMode, handleInstall, handleConfirmInstalled, handleDismiss } = useInstallPrompt();

  const handlePlay = () => {
    preloadSounds();
    setHasPassedLanding(true);
  };

  const handleToggleMute = () => {
    toggleMute();
    setMuted(isMuted());
  };

  return (
    <div
      className="relative flex-1 flex flex-col overflow-hidden paper-body font-hand"
      data-testid="screen-landing"
    >
      {/* Nigerian flag stripe — top */}
      <div className="absolute top-0 left-0 right-0 h-1.5 flex z-20">
        <div className="flex-1 flag-stripe" />
        <div className="flex-1 bg-paper" />
        <div className="flex-1 flag-stripe" />
      </div>

      {/* Top-right controls */}
      <div
        className="absolute z-20 flex gap-2"
        style={{
          top: 'max(1rem, env(safe-area-inset-top))',
          right: 'max(1rem, env(safe-area-inset-right))',
        }}
      >
        <button
          onClick={handleToggleMute}
          aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
          className="w-9 h-9 rounded-xl flex items-center justify-center border transition-all active:scale-90 text-chalk-mark"
          style={{
            background: 'rgba(139,94,60,0.1)',
            borderColor: 'rgba(139,94,60,0.25)',
          }}
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Floating ink letters in background */}
      {['S', 'T', 'O', 'P', '!', 'A', 'B'].map((l, i) => (
        <span
          key={i}
          aria-hidden
          className="font-script absolute select-none pointer-events-none text-ink-dark"
          style={{
            opacity: 0.04 + (i % 3) * 0.015,
            fontSize: `${70 + (i * 20) % 60}px`,
            left: `${(i * 15 + 4) % 84}%`,
            top: `${(i * 18 + 6) % 80}%`,
            animation: `bob${i} ${2.8 + i * 0.5}s ease-in-out ${i * 0.25}s infinite alternate`,
            transform: `rotate(${-8 + i * 3}deg)`,
          }}
        >
          {l}
        </span>
      ))}

      {/* ── Main card — exercise book style ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
          className="w-full max-w-85 rounded-2xl overflow-hidden"
        >
          <div className="px-6 pt-6 pb-7">
            {/* School name header */}
            <div className="text-center pb-3" style={{ borderBottom: '1.5px solid #c8b89a' }}>
              <p className=" font-bold tracking-[0.25em] uppercase font-hand text-chalk-mark">
                Naija Edition
              </p>
            </div>

            {/* Logo */}
            <div className="flex justify-center">
              <img
                src="/tick-tick-logo.png"
                alt="Tick-Tick"
                className="w-36"
                style={{ filter: 'drop-shadow(0 4px 12px rgba(107,68,35,0.25))' }}
              />
            </div>

            {/* Subtitle */}
            <p className="text-center  leading-relaxed mb-5 font-hand text-chalk-board">
              The classic word game — now multiplayer.{' '}
              Fill every category before someone shouts{' '}
              <strong className="text-school-red">STOP!</strong>
            </p>

            {onlineCount != null && onlineCount >= 3 && (
              <p className="mb-4 flex items-center justify-center gap-1.5 text-sm font-bold font-hand text-chalk-mark" role="status">
                <Users className="h-4 w-4" aria-hidden="true" />
                {onlineCount?.toLocaleString()} players online
              </p>
            )}

            {/* CTA */}
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handlePlay}
              className="w-full rounded-xl py-4 mb-3 font-bold btn-primary font-display text-[20px]"
              style={{ boxShadow: '0 4px 16px rgba(107,68,35,0.3), inset 0 1px 0 rgba(255,255,255,0.15)' }}
            >
              Start Playing
            </motion.button>

            {/* Secondary buttons */}
            <div className="flex gap-2 mb-3">
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => setShowLeaderboard(true)}
                className="flex-1 rounded-xl py-3 font-bold text-sm flex items-center justify-center gap-1.5 border font-hand text-chalk-mark"
                style={{ background: 'rgba(139,94,60,0.08)', borderColor: 'rgba(139,94,60,0.25)' }}
              >
                <Trophy className="w-4 h-4" />
                Board
              </motion.button>

              {session?.displayName && (
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setShowProfile(true)}
                  className="flex-1 rounded-xl py-3 font-bold text-sm flex items-center justify-center gap-1.5 border font-hand text-chalk-mark"
                  style={{ background: 'rgba(139,94,60,0.08)', borderColor: 'rgba(139,94,60,0.25)' }}
                >
                  <User className="w-4 h-4" />
                  Profile
                </motion.button>
              )}

              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => setShowHowToPlay(true)}
                className="flex-1 rounded-xl py-3 font-bold text-sm flex items-center justify-center gap-1.5 border font-hand"
                style={{ background: 'rgba(217,119,6,0.07)', borderColor: 'rgba(217,119,6,0.2)', color: '#92400e' }}
              >
                <HelpCircle className="w-4 h-4" />
                Rules
              </motion.button>
            </div>

            {/* Save progress by linking Google for named guests */}
            {session?.email == null && session?.displayName != null && (
              <motion.button
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => apiClient.redirectToGoogle('link')}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border"
                style={{ background: 'rgba(139,94,60,0.06)', borderColor: 'rgba(139,94,60,0.2)' }}
              >
                <Link className="w-4 h-4 shrink-0 text-chalk-mark" />
                <span className="flex-1 text-left text-sm font-hand text-chalk-board">
                  Save your progress — link Google account
                </span>
                <span className="font-hand text-chalk-mark">→</span>
              </motion.button>
            )}

            {/* Sign in with Google when there is no named account */}
            {session?.email == null && session?.displayName == null && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => apiClient.redirectToGoogle('login')}
                className="mt-3 w-full flex items-center justify-center gap-2.5 rounded-xl border px-4 py-3 font-bold font-hand text-chalk-board"
                style={{ background: '#fff', borderColor: '#c8b89a' }}
              >
                <span aria-hidden="true" className="font-bold text-base text-school-red">G</span>
                Login with Google
              </motion.button>
            )}
          </div>
        </motion.div>
      </div>

      {/* Floating letter animations */}
      <style>{`
        ${[0, 1, 2, 3, 4, 5, 6]
          .map(
            (i) =>
              `@keyframes bob${i} { from{transform:translateY(0) rotate(${-5 + i * 2}deg)} to{transform:translateY(-14px) rotate(${5 - i * 2}deg)} }`
          )
          .join('')}
      `}</style>

      <AnimatePresence>
        {showLeaderboard && <LeaderboardOverlay onClose={() => setShowLeaderboard(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showProfile && <ProfileOverlay onClose={() => setShowProfile(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showHowToPlay && <HowToPlaySheet onClose={() => setShowHowToPlay(false)} />}
      </AnimatePresence>

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
// How to Play Sheet
// ─────────────────────────────────────────────────────────────────────────────

function HowToPlaySheet({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-end"
      style={{ background: 'rgba(10,20,14,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', bounce: 0, duration: 0.38 }}
        className="w-full rounded-t-3xl overflow-hidden paper-body"
        style={{ maxHeight: '88dvh', borderTop: '3px solid #c8b89a', boxShadow: '0 -8px 32px rgba(0,0,0,0.15)' }}
      >
        {/* Sheet handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-paper-ruled" />
        </div>

        <div className="overflow-y-auto pb-10 px-6" style={{ scrollbarWidth: 'none', maxHeight: 'calc(88vh - 24px)' }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-5 pt-3">
            <div>
              <p className="label-section mb-0.5 flex items-center gap-1.5 text-chalk-mark">
                <ClipboardList className="w-3.5 h-3.5" /> Class Notes
              </p>
              <h3 className="font-display text-[26px] text-ink-dark leading-none">How to Play</h3>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-xl active:scale-90 text-chalk-mark"
              style={{ background: 'rgba(139,94,60,0.12)', border: '1px solid #c8b89a' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {[
              { icon: <Target className="w-5 h-5 text-chalk-mark shrink-0" />, title: 'Get a letter + categories', desc: 'Each round gives a random letter and 5 categories (Food, Animal, City, etc). Every answer must start with that letter.' },
              { icon: <Timer className="w-5 h-5 text-school-amber shrink-0" />, title: 'Type fast — like exam time!', desc: 'You have 90 seconds to fill all categories. Answers save automatically as you type. Sharp sharp!' },
              { icon: <OctagonX className="w-5 h-5 text-school-red shrink-0" />, title: 'Shout STOP!', desc: 'Finished early? Hit STOP to start a 15-second grace period. After that, the round locks — no more changes.' },
              { icon: <Bot className="w-5 h-5 text-chalk-mark shrink-0" />, title: 'AI marks your answers', desc: 'Correct = 10pts. Minor typo = 9pts. Major typo = 7pts. Duplicate answer = 5pts. Wrong/blank = 0pts.' },
              { icon: <Lightbulb className="w-5 h-5 text-school-amber shrink-0" />, title: 'Be unique — no copy-copy!', desc: 'If two players give the same answer, both get only 5pts instead of 10. Think different, collect more marks.' },
              { icon: <Globe className="w-5 h-5 text-chalk-mark shrink-0" />, title: 'Nigerian English accepted!', desc: 'The AI understands Pidgin, local slang, and multi-word answers like "Jollof Rice" or "Eba and Egusi".' },
              { icon: <Trophy className="w-5 h-5 text-school-amber shrink-0" />, title: 'Win the match', desc: 'Highest cumulative score after all rounds wins. Top 3 hit the podium and the leaderboard.' },
            ].map((step, i) => (
              <div
                key={i}
                className="flex gap-3 p-4 rounded-2xl"
                style={{ background: 'rgba(139,94,60,0.08)', border: '1px solid #c8b89a' }}
              >
                {step.icon}
                <div>
                  <p className="font-bold text-[15px] mb-0.5 font-hand text-ink-dark">{step.title}</p>
                  <p className="text-sm leading-relaxed font-hand text-chalk-board">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Scoring table */}
          <div className="mt-4 rounded-2xl overflow-hidden" style={{ background: '#f5f0e8', border: '2px solid #c8b89a' }}>
            <div className="px-4 py-2.5 bg-chalk-board">
              <p className="text-sm font-bold uppercase tracking-widest font-hand text-paper flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4" /> Mark Scheme
              </p>
            </div>
            <div className="divide-y divide-paper-line">
              {[
                { label: 'Correct (perfectly spelled)',   pts: '+10', color: '#6b4423' },
                { label: 'Minor typo (clearly right)',    pts: '+9',  color: '#6b4423' },
                { label: 'Major typo (recognizable)',     pts: '+7',  color: '#d97706' },
                { label: 'Duplicate (same as classmate)', pts: '+5',  color: '#92400e' },
                { label: 'Wrong / blank',                 pts: '0',   color: '#c0392b' },
              ].map((s, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5">
                  <span className=" font-hand text-chalk-board">{s.label}</span>
                  <span className="font-script text-sm font-bold" style={{ color: s.color }}>{s.pts}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 p-4 rounded-2xl" style={{ background: 'rgba(139,94,60,0.08)', border: '1px solid #c8b89a' }}>
            <p className="label-section mb-2 flex items-center gap-1.5 text-chalk-mark">
              <Pin className="w-3.5 h-3.5" /> Tips from senior students
            </p>
            <ul className="space-y-1.5">
              {[
                'Unique answers earn full marks — common ones get reduced to 5',
                'Spelling matters but AI is lenient — close enough counts',
                'Speed matters — someone can STOP the round early',
                'Nigerian Pidgin and slang are valid — use them abeg!',
              ].map((tip, i) => (
                <li key={i} className=" flex gap-2 items-start font-hand text-chalk-board">
                  <span className="text-desk">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Leaderboard Overlay
// ─────────────────────────────────────────────────────────────────────────────

function LeaderboardOverlay({ onClose }: { onClose: () => void }) {
  const session = useGameStore((s) => s.session);
  const [tab,] = useState<'weekly' | 'alltime'>('alltime');
  const sentinelRef = useRef<HTMLDivElement>(null);

  const apiType = tab === 'alltime' ? 'all-time' as const : 'weekly' as const;
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useInfiniteLeaderboard(apiType);
  const { data: myRankData } = useMyLeaderboardRank(apiType, !!session?.token);

  const entries = data?.pages.flatMap((p) => p.data.entries) ?? [];
  const myRank = myRankData?.data.userRank ?? null;
  const myEntryVisible = myRank ? entries.some((e) => e.id === myRank.id) : false;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (obs) => { if (obs[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage(); },
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
      transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
      className="absolute inset-0 z-50 flex flex-col overflow-hidden paper-body"
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-4 mb-3 shrink-0" style={{ borderBottom: '1px solid #c8b89a' }}>
        <button
          onClick={onClose}
          className="mb-3 p-2 rounded-xl border transition-all active:scale-95"
          style={{ background: 'rgba(139,94,60,0.1)', borderColor: '#c8b89a' }}
        >
          <ArrowLeft className="w-5 h-5 text-chalk-mark" />
        </button>
        <p className="label-section mb-1 flex items-center gap-1.5 text-desk">
          <Trophy className="w-3.5 h-3.5" /> Class Rankings
        </p>
        <h2 className="font-display text-[30px] text-ink-dark leading-none">Leaderboard</h2>
      </div>

      {/* Tabs */}
      {/* <div className="px-6 py-3 shrink-0">
        <div className="flex rounded-xl p-1 gap-1" style={{ background: 'rgba(139,94,60,0.12)', border: '1px solid #c8b89a' }}>
          {(['weekly', 'alltime'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all font-hand"
              style={{
                background: tab === t ? '#6b4423' : 'transparent',
                color: tab === t ? '#f5f0e8' : '#6b4423',
              }}
            >
              {t === 'weekly' ? 'This Week' : 'All Time'}
           
            </button>
          ))}
        </div>
      </div> */}

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6" style={{ scrollbarWidth: 'none' }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm animate-pulse font-hand text-desk">Loading rankings...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="w-10 h-10 mb-3 text-desk opacity-50" />
            <p className="text-sm text-center font-hand text-desk">No rankings yet. Be the first to play!</p>
          </div>
        ) : (
          <div className="space-y-2 pb-4">
            {entries.map((entry, i) => {
              const rank = i + 1;
              const score = tab === 'weekly' ? entry.weeklyScore : entry.totalScore;
              const isYou = entry.id === session?.userId;
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.4), type: 'spring', bounce: 0, duration: 0.3 }}
                  className="flex items-center gap-3 p-3.5 rounded-xl border"
                  style={{
                    background: isYou ? 'rgba(139,94,60,0.1)' : 'rgba(139,94,60,0.07)',
                    borderColor: isYou ? '#8b5e3c' : '#c8b89a',
                    boxShadow: isYou ? '0 0 0 1px rgba(139,94,60,0.2)' : 'none',
                  }}
                >
                  <span
                    className={`w-8 text-center shrink-0 ${rank > 3 ? 'font-display text-[15px]' : ''} ${isYou ? 'text-chalk-mark' : 'text-desk'}`}
                  >
                    {rank <= 3 ? (
                      <span className={`font-display  font-bold ${rank === 1 ? 'text-school-amber' : rank === 2 ? 'text-slate-400' : 'text-desk'}`}>
                        {rank === 1 ? '1st' : rank === 2 ? '2nd' : '3rd'}
                      </span>
                    ) : rank}
                  </span>
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold font-hand text-chalk-mark"
                    style={{
                      background: isYou ? 'rgba(107,68,35,0.15)' : 'rgba(139,94,60,0.12)',
                      border: `1px solid ${isYou ? 'rgba(107,68,35,0.28)' : '#c8b89a'}`,
                    }}
                  >
                    {entry.displayName ? entry.displayName.slice(0, 2).toUpperCase() : '??'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate font-hand ${isYou ? 'text-chalk-mark' : 'text-ink-dark'}`}>
                      {entry.displayName || 'Anonymous'}
                      {isYou && (
                        <span className="text-[12px] font-bold px-1.5 py-0.5 rounded-full ml-1.5 text-chalk-mark" style={{ background: 'rgba(139,94,60,0.14)' }}>
                          you
                        </span>
                      )}
                    </p>
                    <p className={`text-[12px] font-hand flex items-center gap-1 ${isYou ? 'text-chalk-mark' : 'text-desk'}`}>
                      {entry.type === 'REGISTERED' ? <><Star className="w-2.5 h-2.5 fill-current" /> Registered</> : 'Guest'}
                    </p>
                  </div>
                  <span className={`font-display text-[18px] ${isYou ? 'text-chalk-mark' : 'text-ink-dark'}`}>
                    {score.toLocaleString()}
                  </span>
                </motion.div>
              );
            })}
            <div ref={sentinelRef} className="py-2 flex justify-center">
              {isFetchingNextPage && (
                <p className="text-sm animate-pulse font-hand text-desk">Loading more...</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Pinned: my rank */}
      {myRank && !myEntryVisible && (
        <div className="px-6 pt-3 pb-4 shrink-0 border-t border-paper-ruled">
          <p className="label-section mb-2 text-center text-desk">Your global rank</p>
          <div className="flex items-center gap-3 p-4 rounded-xl border" style={{ background: 'rgba(139,94,60,0.1)', borderColor: '#8b5e3c' }}>
            <span className="font-display text-[18px] text-chalk-mark w-12 text-center">
              #{myRank.rank}
            </span>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold font-hand text-chalk-mark" style={{ background: 'rgba(139,94,60,0.14)' }}>
              {myRank.displayName ? myRank.displayName.slice(0, 2).toUpperCase() : '??'}
            </div>
            <p className="flex-1 text-sm font-bold truncate font-hand text-chalk-mark">
              {myRank.displayName || 'You'}
            </p>
            <span className="font-display text-[20px] text-chalk-mark">
              {tab === 'weekly' ? myRank.weeklyScore.toLocaleString() : myRank.totalScore.toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile Overlay
// ─────────────────────────────────────────────────────────────────────────────

function ProfileOverlay({ onClose }: { onClose: () => void }) {
  const session = useGameStore((s) => s.session);
  const setSession = useGameStore((s) => s.setSession);
  const { data, isLoading } = usePlayerStats(!!session?.token);
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState(session?.displayName ?? '');
  const [editAvatar, setEditAvatar] = useState(session?.avatarId ?? '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [isSendingContact, setIsSendingContact] = useState(false);

  const handleOpenEdit = () => {
    setEditName(session?.displayName ?? '');
    setEditAvatar(session?.avatarId ?? '');
    setShowEdit(true);
  };

  const handleSaveProfile = async () => {
    const displayName = editName.trim();
    if (displayName.length < 2 || displayName.length > 20 || !editAvatar || isSavingProfile) return;

    const currentSession = useGameStore.getState().session;
    if (!currentSession) {
      showToast('Your session has expired. Please sign in again.', 'error');
      return;
    }

    setIsSavingProfile(true);
    try {
      const response = await apiClient.updateProfile({ displayName, avatarId: editAvatar });
      const latestSession = useGameStore.getState().session;
      if (!latestSession) {
        showToast('Your session has expired. Please sign in again.', 'error');
        return;
      }

      setSession({
        ...latestSession,
        displayName: response.data.displayName || displayName,
        avatarId: response.data.avatarId || editAvatar,
      });
      setShowEdit(false);
      showToast('Profile updated!', 'success');
    } catch (error) {
      console.error('[Profile] Failed to update profile:', error);
      showToast(error instanceof Error ? error.message : 'Could not update your profile. Please try again.', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    const deviceId = persistenceLayer.getDeviceId();
    try {
      await apiClient.deleteAccount();
      persistenceLayer.clearToken();
      socketHandler.disconnect();
      useGameStore.getState().reset();

      try {
        const { token, guestId } = await apiClient.guestLogin(deviceId);
        persistenceLayer.saveToken(token);
        useGameStore.getState().setSession({
          token,
          userId: guestId,
          email: null,
          displayName: null,
          avatarId: '',
          isAuthenticated: false,
          deviceId,
        });
        socketHandler.connect(import.meta.env.VITE_API_URL || 'http://localhost:4000', token);
      } catch (guestError) {
        console.error('[Profile] Account deleted, but guest session could not be restored:', guestError);
        setShowDeleteConfirm(false);
        onClose();
        showToast('Account deleted, but guest sign-in failed. Please try again.', 'error');
        setIsDeleting(false);
        return;
      }

      setShowDeleteConfirm(false);
      onClose();
      showToast('Google account deleted. You are now playing as a guest.', 'info');
    } catch (error) {
      console.error('[Profile] Failed to delete account:', error);
      showToast('Failed to delete account. Try again.', 'error');
      setIsDeleting(false);
    }
  };

  const handleSendContact = async () => {
    const name = contactName.trim();
    const message = contactMessage.trim();
    if (!name || !message || isSendingContact) return;

    setIsSendingContact(true);
    try {
      const formData = new FormData();
      const email = contactEmail.trim();
      formData.append('name', name);
      if (email) formData.append('email', email);
      formData.append('message', message);

      const response = await fetch('https://formspree.io/f/mbgrrdbg', {
        method: 'POST',
        body: formData,
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error(`Contact form submission failed (${response.status})`);

      setContactName('');
      setContactMessage('');
      setContactEmail('');
      setShowContact(false);
      showToast("Message sent! We'll get back to you.", 'success');
    } catch (error) {
      console.error('[Profile] Failed to send contact message:', error);
      showToast('Could not send your message. Please try again.', 'error');
    } finally {
      setIsSendingContact(false);
    }
  };

  const stats = data?.data.stats;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
      className="absolute inset-0 z-50 flex flex-col overflow-hidden paper-body"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-6 pt-10 pb-4 shrink-0" style={{ borderBottom: '1px solid #c8b89a' }}>
        <button
          onClick={onClose}
          className="p-2 rounded-xl border transition-all active:scale-95"
          style={{ background: 'rgba(139,94,60,0.1)', borderColor: '#c8b89a' }}
        >
          <ArrowLeft className="w-5 h-5 text-chalk-mark" />
        </button>
        <div>
          <p className="label-section mb-0.5 text-chalk-mark">Student File</p>
          <h2 className="font-display text-[28px] text-ink-dark leading-none">Profile</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5" style={{ scrollbarWidth: 'none' }}>
        {/* Player card — exercise book style */}
        <div
          className="rounded-2xl overflow-hidden mb-4"
        >
          <div className="px-5 pt-5 pb-5">
            <div className="flex items-center gap-4">
              <AvatarDisplay avatarId={session?.avatarId} className="h-22 w-22 shrink-0 object-contain text-5xl" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-lg truncate font-hand text-ink-dark">
                  {session?.displayName || 'Anonymous'}
                </p>
                <p className="text-sm font-hand text-chalk-mark flex items-center gap-1">
                  {session?.isAuthenticated ? <><Star className="w-3.5 h-3.5 fill-current" /> Registered Student</> : 'Guest Pupil'}
                </p>
              </div>
              {stats && (
                <div className="text-right">
                  <p className="font-display text-[26px] text-chalk-mark">{stats.totalScore}</p>
                  <p className="text-[12px] font-hand text-chalk-mark">total pts</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={handleOpenEdit}
            className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border transition-all active:scale-95 btn-ghost text-chalk-board!"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit Profile
          </button>
          {session?.email == null && !session?.isAuthenticated && (
            <button
              onClick={() => apiClient.redirectToGoogle('link')}
              className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border transition-all active:scale-95 btn-ghost text-chalk-board!"
            >
              <Link className="w-3.5 h-3.5" />
              Link Google
            </button>
          )}
        </div>

        <button
          onClick={() => setShowContact(true)}
          className="mb-5 w-full rounded-xl border px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 btn-ghost text-chalk-board!"
        >
          <MessageCircle className="w-4 h-4" />
          Get in Touch
        </button>

        {/* Stats */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'rgba(139,94,60,0.1)' }} />
            ))}
          </div>
        ) : stats ? (
          <div className="space-y-2">
            {[
              { label: 'Games Played', value: stats.gamesPlayed, icon: <Gamepad2 className="w-5 h-5 text-chalk-mark" /> },
              { label: 'Wins', value: stats.gamesWon, icon: <Trophy className="w-5 h-5 text-school-amber" /> },
              { label: 'Total Score', value: stats.totalScore.toLocaleString(), icon: <BarChart2 className="w-5 h-5 text-chalk-mark" /> },
            ].map((s) => (
              <div
                key={s.label}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl border"
                style={{ background: 'rgba(139,94,60,0.07)', borderColor: '#c8b89a' }}
              >
                <span className="text-xl">{s.icon}</span>                <span className="flex-1 text-sm font-hand text-chalk-board">{s.label}</span>
                <span className="font-display text-[18px] text-ink-dark">{s.value}</span>
              </div>
            ))}
          </div>
        ) : null}

        {/* Danger zone */}
        <div className="mt-6 pt-4" style={{ borderTop: '1px solid #c8b89a' }}>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full text-center text-sm py-2 font-hand"
            style={{ color: '#92400e' }}
          >
            Delete account
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[80] flex items-center justify-center bg-black/60 px-6"
            onClick={(event) => {
              if (event.target === event.currentTarget && !isDeleting) setShowDeleteConfirm(false);
            }}
          >
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="delete-account-title"
              aria-describedby="delete-account-description"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              className="w-full max-w-sm rounded-2xl border p-5 paper-body shadow-xl"
              style={{ borderColor: '#c8b89a' }}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <h3 id="delete-account-title" className="font-display text-xl text-school-red">
                  Delete your account?
                </h3>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  aria-label="Close confirmation"
                  className="rounded-lg p-1.5 text-chalk-mark disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p id="delete-account-description" className="mb-5 text-sm leading-relaxed font-hand text-chalk-board">
                Your account and saved progress will be permanently deleted. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="flex-1 rounded-xl border py-3 font-bold btn-ghost disabled:opacity-50"
                  style={{ borderColor: '#c8b89a' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="flex-1 rounded-xl py-3 font-bold font-hand text-paper disabled:opacity-50"
                  style={{ background: '#c0392b' }}
                >
                  {isDeleting ? 'Deleting...' : 'Delete account'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit profile sheet */}
      {showEdit && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-60 flex items-end"
          style={{ background: 'rgba(10,20,14,0.75)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowEdit(false); }}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', bounce: 0, duration: 0.38 }}
            className="w-full max-h-[90dvh] overflow-y-auto overscroll-contain rounded-t-3xl paper-body px-6 pt-4 pb-8"
            style={{ borderTop: '3px solid #c8b89a' }}
          >
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1 rounded-full bg-paper-ruled" />
            </div>
            <p className="label-section mb-3 text-chalk-mark">Edit Profile</p>
            <label htmlFor="profile-display-name" className="mb-2 block label-section">
              Display Name
            </label>
            <input
              id="profile-display-name"
              type="text"
              maxLength={20}
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              className="mb-4 w-full rounded-xl border-2 bg-transparent px-4 py-3 font-hand text-[17px] text-ink-dark outline-none"
              style={{ borderColor: '#c8b89a', caretColor: '#6b4423' }}
            />
            <p className="mb-2 label-section">Choose Avatar</p>
            <div className="mb-5 max-h-[34dvh] overflow-y-auto overscroll-contain">
              <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
              {[...AVATAR_PORTRAITS.map((portrait) => portrait.id)].map((avatar) => (
                <button
                  key={avatar}
                  type="button"
                  onClick={() => setEditAvatar(avatar)}
                  aria-label={`Choose ${getAvatarPortrait(avatar)?.label ?? avatar} avatar`}
                  aria-pressed={editAvatar === avatar}
                  className="aspect-square rounded-xl border-2 text-2xl transition-all overflow-hidden flex items-center justify-center"
                  style={{
                    background: editAvatar === avatar ? 'rgba(107,68,35,0.1)' : 'rgba(139,94,60,0.05)',
                    borderColor: editAvatar === avatar ? '#6b4423' : '#c8b89a',
                  }}
                >
                  <AvatarDisplay avatarId={avatar} imageClassName="h-full w-full object-contain pt-2" />
                </button>
              ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEdit(false)}
                disabled={isSavingProfile}
                className="flex-1 rounded-xl border py-3 font-bold btn-ghost disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={editName.trim().length < 2 || !editAvatar || isSavingProfile}
                className="flex-1 rounded-xl py-3 font-bold btn-primary disabled:opacity-50"
              >
                {isSavingProfile ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      <AnimatePresence>
        {showContact && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[70] flex items-end"
            style={{ background: 'rgba(10,20,14,0.75)', backdropFilter: 'blur(4px)' }}
            onClick={(event) => {
              if (event.target === event.currentTarget && !isSendingContact) setShowContact(false);
            }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.38 }}
              className="w-full rounded-t-3xl overflow-hidden paper-body px-6 pt-4 pb-8"
              style={{ borderTop: '3px solid #c8b89a' }}
            >
              <div className="flex justify-center mb-4">
                <div className="w-10 h-1 rounded-full bg-paper-ruled" />
              </div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="label-section mb-1 text-chalk-mark">Get in Touch</p>
                  <p className="text-sm font-hand text-chalk-board">We read every message.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowContact(false)}
                  disabled={isSendingContact}
                  aria-label="Close contact form"
                  className="w-9 h-9 flex items-center justify-center rounded-xl border disabled:opacity-50"
                  style={{ background: 'rgba(139,94,60,0.1)', borderColor: '#c8b89a' }}
                >
                  <X className="w-4 h-4 text-chalk-mark" />
                </button>
              </div>

              <label htmlFor="contact-name" className="sr-only">Name (required)</label>
              <input
                id="contact-name"
                type="text"
                autoComplete="name"
                maxLength={100}
                required
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
                placeholder="Your name (required)"
                className="mb-3 w-full rounded-xl border bg-transparent px-4 py-3 font-hand text-[16px] text-ink-dark outline-none"
                style={{ borderColor: '#c8b89a', caretColor: '#6b4423' }}
              />

              <label htmlFor="contact-email" className="sr-only">Email (optional)</label>
              <input
                id="contact-email"
                type="email"
                autoComplete="email"
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
                placeholder="Your email (optional)"
                className="mb-3 w-full rounded-xl border bg-transparent px-4 py-3 font-hand text-[16px] text-ink-dark outline-none"
                style={{ borderColor: '#c8b89a', caretColor: '#6b4423' }}
              />

              <label htmlFor="contact-message" className="sr-only">Message</label>
              <textarea
                id="contact-message"
                value={contactMessage}
                onChange={(event) => setContactMessage(event.target.value)}
                placeholder="Tell us what's on your mind..."
                rows={4}
                maxLength={4000}
                className="mb-3 w-full resize-none rounded-xl border bg-transparent px-4 py-3 font-hand text-[16px] text-ink-dark outline-none"
                style={{ borderColor: '#c8b89a', caretColor: '#6b4423' }}
              />
              <p className="mb-4 text-xs font-hand text-chalk-mark">
                Your message and optional email are sent to our contact form provider.
              </p>

              <button
                type="button"
                onClick={handleSendContact}
                disabled={!contactName.trim() || !contactMessage.trim() || isSendingContact}
                className="w-full rounded-xl py-3 font-bold btn-primary disabled:opacity-50"
              >
                {isSendingContact ? 'Sending...' : 'Send Message'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
