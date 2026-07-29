import { useEffect, useMemo, useCallback, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { socketHandler } from '../socket/socketHandler';
import { persistenceLayer } from '../persistence/persistenceLayer';
import { createKeyedDebouncedEmit } from '../utils/debouncedEmit';
import { playSound, playTimerTick } from '../audio/soundManager';
import { getPlayerAvatar } from '../utils/avatarHelper';
import { GameToast } from '../components/GameToast';
import type { GameToastVariant } from '../components/GameToast';
import type { RoundResultsPayload } from '../types';

type GameSubPhase = 'input' | 'grace' | 'locked' | 'results' | 'rankings';

/**
 * GameScreen - Full game flow with all phases from the design:
 * Input → Grace → Locked (validating) → Results (answer table) → Rankings (scoreboard + countdown)
 */
export function GameScreen() {
  const round = useGameStore((s) => s.round);
  const answers = useGameStore((s) => s.answers);
  const room = useGameStore((s) => s.room);
  const roundResults = useGameStore((s) => s.roundResults);
  const previousRoundRanks = useGameStore((s) => s.previousRoundRanks);
  const session = useGameStore((s) => s.session);
  const setAnswer = useGameStore((s) => s.setAnswer);

  const [hasStopped, setHasStopped] = useState(false);
  const [timer, setTimer] = useState(60);
  const [graceTimer, setGraceTimer] = useState(15);
  const [subPhase, setSubPhase] = useState<GameSubPhase>('input');
  const [rankingsCountdown, setRankingsCountdown] = useState(5);

  // In-game toast state
  const [gameToast, setGameToast] = useState<{ message: string; variant: GameToastVariant } | null>(null);
  const showGameToast = useCallback((message: string, variant: GameToastVariant = 'info') => {
    setGameToast({ message, variant });
  }, []);

  // Preserve round results in a ref so rankings overlay stays stable
  // even if the store's roundResults gets cleared by a new round
  const stableResultsRef = useRef<RoundResultsPayload | null>(null);
  if (roundResults) {
    stableResultsRef.current = roundResults;
  }
  const displayResults = stableResultsRef.current;

  const debouncedEmit = useMemo(
    () => createKeyedDebouncedEmit(socketHandler, 'answer-submit'),
    []
  );

  // Hydrate answers from persistence layer on mount
  useEffect(() => {
    if (room?.roomCode) {
      const persisted = persistenceLayer.loadAnswers(room.roomCode);
      if (persisted) {
        Object.entries(persisted).forEach(([category, value]) => {
          setAnswer(category, value);
        });
      }
    }
  }, [room?.roomCode, setAnswer]);

  // Sync subPhase with server-driven round.phase
  useEffect(() => {
    if (!round) return;
    if (round.phase === 'input') {
      // Don't reset to input if rankings is still counting down
      if (subPhase === 'rankings' && rankingsCountdown > 0) return;
      setSubPhase('input');
      setHasStopped(false);
      // Clear stable results ref for the new round
      stableResultsRef.current = null;
      // 🔊 Round start sound
      playSound('roundStart');
    } else if (round.phase === 'grace') {
      setSubPhase('grace');
    } else if (round.phase === 'locked') {
      // Only go to locked if we haven't already transitioned to results/rankings
      if (subPhase !== 'results' && subPhase !== 'rankings') {
        setSubPhase('locked');
      }
    } else if (round.phase === 'results') {
      // Server sent results — show results overlay
      setSubPhase('results');
    }
  }, [round?.phase]);

  // 🔊 Results reveal — only when roundResults arrives from websocket
  useEffect(() => {
    if (roundResults) {
      playSound('resultsReveal');
    }
  }, [roundResults]);

  // Auto-transition: my answers reveal (10s) → tabbed results+leaderboard (20s)
  useEffect(() => {
    if (subPhase === 'results' && displayResults) {
      const t = setTimeout(() => {
        setSubPhase('rankings');
        const isLastRound = round?.roundNumber === round?.totalRounds;
        setRankingsCountdown(isLastRound ? 18 : 18);

        // Play sound based on user's position
        if (displayResults.players.length > 1 && session?.userId) {
          const sorted = [...displayResults.players].sort((a, b) => b.totalScore - a.totalScore);
          // Match current user — try multiple ID fields
          const store = useGameStore.getState();
          const roomPlayer = store.room?.players.find((p) => p.userId === session.userId);
          const myPlayerId = roomPlayer?.id ?? session.userId;
          const userIndex = sorted.findIndex(
            (p) => p.playerId === session.userId || p.playerId === myPlayerId || p.displayName === session.displayName
          );
          if (userIndex >= 0 && userIndex <= 2) {
            playSound('winner');
          } else if (userIndex === sorted.length - 1) {
            playSound('lastPlace');
          }
        }
      }, 10000);
      return () => clearTimeout(t);
    }
  }, [subPhase, displayResults, round?.roundNumber, round?.totalRounds]);

  // Rankings countdown (next round will auto-start from server's round-start event)
  useEffect(() => {
    if (subPhase !== 'rankings') return;
    if (rankingsCountdown <= 0) return;
    const t = setTimeout(() => setRankingsCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [subPhase, rankingsCountdown]);

  // Timer countdown
  useEffect(() => {
    if (!round) return;
    if (round.phase === 'input') {
      const endsAt = round.endsAt;
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
        setTimer(remaining);
      }, 250);
      return () => clearInterval(interval);
    }
    if (round.phase === 'grace' && round.graceEndsAt) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((round.graceEndsAt! - Date.now()) / 1000));
        setGraceTimer(remaining);
      }, 250);
      return () => clearInterval(interval);
    }
  }, [round?.phase, round?.endsAt, round?.graceEndsAt]);

  // 🔊 Timer tick — only when ≤15 seconds remain, with heartbeat at ≤5s
  useEffect(() => {
    if (subPhase !== 'input') return;
    if (timer > 15 || timer <= 0) return;
    playTimerTick(timer);
  }, [timer, subPhase]);

  // 🔊 Grace period — tick + heartbeat every second
  useEffect(() => {
    if (subPhase !== 'grace') return;
    const tickInterval = setInterval(() => {
      playSound('tick');
      playSound('heartbeat');
    }, 1000);
    return () => clearInterval(tickInterval);
  }, [subPhase]);

  // Show grace toast (only if someone ELSE called stop)
  useEffect(() => {
    if (round?.phase === 'grace' && round.graceTriggeredBy) {
      if (!hasStopped) {
        showGameToast(`${round.graceTriggeredBy} called STOP! Finish up!`, 'stop');
        playSound('stop');
      }
    }
  }, [round?.phase, round?.graceTriggeredBy]);

  const handleAnswerChange = useCallback(
    (category: string, value: string) => {
      setAnswer(category, value);
      const state = useGameStore.getState();
      const roomCode = state.room?.roomCode;
      const phase = state.round?.phase;
      // Only emit to server if still in an active input phase
      if (roomCode && (phase === 'input' || phase === 'grace')) {
        debouncedEmit(category, { roomCode, category, answer: value });
      }
    },
    [setAnswer, debouncedEmit]
  );

  const handleStop = useCallback(() => {
    const roomCode = room?.roomCode;
    if (roomCode) {
      socketHandler.emit('stop-round', { roomCode });
      setHasStopped(true);
      // 🔊 STOP buzzer sound
      playSound('stop');
    }
  }, [room?.roomCode]);

  const allAnswersFilled = useMemo(() => {
    if (!round?.categories) return false;
    return round.categories.every(
      (cat) => (answers[cat] ?? '').trim().length > 0
    );
  }, [round?.categories, answers]);

  if (!round) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: '#081510' }}>
        <p className="text-sm animate-pulse" style={{ color: '#6baf80' }}>
          Waiting for round to start...
        </p>
      </div>
    );
  }

  const totalSeconds = 60;
  const timerPct = timer / totalSeconds;
  const timerColor = timer > 20 ? '#00d060' : timer > 10 ? '#ffb800' : '#ff3b5c';
  const R = 28;
  const C = 2 * Math.PI * R;

  // Sorted players for rankings
  const sortedPlayers = displayResults
    ? [...displayResults.players].sort((a, b) => b.totalScore - a.totalScore)
    : [];

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative" data-testid="screen-game">
      {/* In-game toast */}
      <GameToast
        message={gameToast?.message ?? ''}
        variant={gameToast?.variant ?? 'info'}
        visible={!!gameToast}
        onDismiss={() => setGameToast(null)}
      />

      {/* Game header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
        <div>
          <p
            className="text-xs font-bold tracking-widest uppercase"
            style={{ color: '#6baf80' }}
          >
            Round {round.roundNumber} / {round.totalRounds}
          </p>
          <p className="text-white text-sm font-bold">
            {room?.settings?.categoryPackId || 'Classic Nigeria'}
          </p>
        </div>

        {/* Circular timer */}
        <div className="relative w-16 h-16 flex items-center justify-center">
          <svg
            className="absolute inset-0"
            width="64"
            height="64"
            style={{ transform: 'rotate(-90deg)' }}
          >
            <circle cx="32" cy="32" r={R} fill="none" stroke="#0d2018" strokeWidth="4" />
            <circle
              cx="32" cy="32" r={R} fill="none"
              stroke={timerColor} strokeWidth="4"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - timerPct)}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease' }}
            />
          </svg>
          <span
            style={{
              fontFamily: "'Dela Gothic One', sans-serif",
              fontSize: '22px',
              color: timerColor,
              transition: 'color 0.3s ease',
            }}
          >
            {timer}
          </span>
        </div>
      </div>

      {/* Letter badge */}
      <div className="flex justify-center mb-3 shrink-0">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center"
          style={{
            background: '#ffb800',
            boxShadow: '0 8px 28px rgba(255,184,0,0.32)',
          }}
        >
          <span
            className="text-black leading-none"
            style={{
              fontFamily: "'Dela Gothic One', sans-serif",
              fontSize: '52px',
            }}
          >
            {round.letter.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Input fields */}
      <div className="flex-1 overflow-y-auto px-5" style={{ scrollbarWidth: 'none' }}>
        <div className="space-y-2 pb-2">
          {round.categories.map((cat) => {
            const filled = !!(answers[cat] ?? '').trim();
            return (
              <div
                key={cat}
                className="flex flex-col px-3.5 pt-2.5 pb-2 rounded-xl border transition-colors"
                style={{
                  background: '#0d2018',
                  borderColor: filled ? 'rgba(0,208,96,0.4)' : '#1a3528',
                }}
              >
                {/* Label row */}
                <div className="flex items-center justify-between mb-0.5">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: filled ? '#00d060' : '#6baf80' }}
                  >
                    {cat}
                  </span>
                  {filled && (
                    <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color: '#00d060' }} />
                  )}
                </div>
                {/* Input row */}
                <input
                  type="text"
                  value={answers[cat] || ''}
                  onChange={(e) => handleAnswerChange(cat, e.target.value)}
                  readOnly={hasStopped || (subPhase !== 'input' && subPhase !== 'grace')}
                  placeholder={`${round.letter.toUpperCase()}...`}
                  className="bg-transparent text-white outline-none w-full text-sm font-bold placeholder-[#2a4a33]"
                  style={{ caretColor: '#00d060' }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* STOP button */}
      {subPhase === 'input' && (
        <div className="px-5 pb-8 pb-safe pt-3 shrink-0">
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={handleStop}
            disabled={!allAnswersFilled || hasStopped}
            className="w-full rounded-2xl py-4 text-white disabled:opacity-50"
            style={{
              background: '#ff3b5c',
              fontFamily: "'Dela Gothic One', sans-serif",
              fontSize: '30px',
              boxShadow: '0 8px 24px rgba(255,59,92,0.32)',
            }}
          >
            STOP!
          </motion.button>
        </div>
      )}

      {/* Grace period overlay */}
      <AnimatePresence>
        {subPhase === 'grace' && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className="absolute inset-x-0 bottom-0 rounded-t-3xl p-6 flex items-center justify-between"
            style={{ background: '#ffb800' }}
          >
            <div>
              <p
                className="leading-tight"
                style={{
                  fontFamily: "'Dela Gothic One', sans-serif",
                  fontSize: '24px',
                  color: '#000',
                }}
              >
                Grace Period
              </p>
              <p className="text-xs mt-1 font-bold" style={{ color: 'rgba(0,0,0,0.6)' }}>
                Finish your answers now!
              </p>
            </div>
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.15)' }}
            >
              <span
                className="text-black"
                style={{
                  fontFamily: "'Dela Gothic One', sans-serif",
                  fontSize: '38px',
                  lineHeight: 1,
                }}
              >
                {graceTimer}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Locked overlay — "Validating..." */}
      {subPhase === 'locked' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex flex-col items-center justify-center gap-4"
          style={{ background: 'rgba(8,21,16,0.92)', backdropFilter: 'blur(4px)' }}
        >
          <Loader2 className="w-10 h-10 animate-spin" style={{ color: '#00d060' }} />
          <p
            className="text-white"
            style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: '26px' }}
          >
            Validating...
          </p>
          <p className="text-sm" style={{ color: '#6baf80' }}>
            AI is checking your answers
          </p>
        </motion.div>
      )}

      {/* ───────── MY ANSWERS REVEAL (10s) ───────── */}
      <AnimatePresence>
        {subPhase === 'results' && displayResults && (
          <motion.div
            key="my-answers-reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col overflow-hidden"
            style={{ background: '#081510' }}
          >
            <div className="px-5 pt-8 pb-4 shrink-0 text-center">
              <p
                className="text-xs font-bold tracking-widest uppercase mb-2"
                style={{ color: '#00d060' }}
              >
                Round {displayResults.roundNumber} · Your Answers
              </p>
              <div
                className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-2"
                style={{ background: '#ffb800' }}
              >
                <span
                  className="text-black"
                  style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: '32px' }}
                >
                  {displayResults.letter.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-4" style={{ scrollbarWidth: 'none' }}>
              <MyAnswersReveal
                results={displayResults}
                currentUserId={session?.userId ?? ''}
              />
            </div>

            {/* Score summary at bottom */}
            <div className="px-5 pb-6 pt-2 shrink-0 text-center">
              {(() => {
                const myResult = displayResults.players.find(p => p.playerId === session?.userId);
                return myResult ? (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 8, type: 'spring', stiffness: 200 }}
                  >
                    <p className="text-xs" style={{ color: '#6baf80' }}>Round Score</p>
                    <p style={{
                      fontFamily: "'Dela Gothic One', sans-serif",
                      fontSize: '36px',
                      color: '#ffb800',
                    }}>
                      +{myResult.roundScore}
                    </p>
                  </motion.div>
                ) : null;
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ───────── TABBED RESULTS + LEADERBOARD (20s) ───────── */}
      <AnimatePresence>
        {subPhase === 'rankings' && displayResults && (
          <motion.div
            key="results-tabs-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col overflow-hidden"
            style={{ background: '#081510' }}
          >
            <ResultsTabsView
              displayResults={displayResults}
              sortedPlayers={sortedPlayers}
              session={session}
              round={round!}
              rankingsCountdown={rankingsCountdown}
              previousRoundRanks={previousRoundRanks}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// My Answers Reveal — shows each answer one by one with stagger animation
// ─────────────────────────────────────────────────────────────────────────────

function MyAnswersReveal({
  results,
  currentUserId,
}: {
  results: RoundResultsPayload;
  currentUserId: string;
}) {
  // Match current user in results — server may use different ID field
  const store = useGameStore.getState();
  const sessionUserId = store.session?.userId ?? '';
  const roomPlayer = store.room?.players.find((p) => p.userId === sessionUserId);
  const myPlayerId = roomPlayer?.id ?? sessionUserId;

  const myResult = results.players.find(
    (p) => p.playerId === currentUserId || p.playerId === sessionUserId || p.playerId === myPlayerId
  ) || results.players.find(
    (p) => p.displayName === store.session?.displayName
  );

  if (!myResult) return null;

  return (
    <div className="space-y-2.5">
      {results.categories.map((cat, i) => {
        const ans = myResult.answers.find((a) => a.category === cat);
        const status = ans
          ? ans.isDuplicate
            ? 'duplicate'
            : ans.severity === 'minor_typo' || ans.severity === 'major_typo'
            ? 'typo'
            : ans.isValid
            ? 'valid'
            : 'invalid'
          : 'invalid';

        const statusConfig = {
          valid: { bg: 'rgba(0,208,96,0.12)', border: 'rgba(0,208,96,0.3)', color: '#00d060', label: '✓', icon: '🎯' },
          typo: { bg: 'rgba(255,150,0,0.12)', border: 'rgba(255,150,0,0.3)', color: '#ff9600', label: '~', icon: '✏️' },
          duplicate: { bg: 'rgba(255,184,0,0.12)', border: 'rgba(255,184,0,0.3)', color: '#ffb800', label: '=', icon: '🔄' },
          invalid: { bg: 'rgba(255,59,92,0.12)', border: 'rgba(255,59,92,0.3)', color: '#ff3b5c', label: '✗', icon: '❌' },
        }[status];

        return (
          <motion.div
            key={cat}
            initial={{ opacity: 0, x: 60, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{
              delay: i * 1.2,
              type: 'spring',
              stiffness: 260,
              damping: 22,
            }}
            className="flex items-center gap-3 p-3.5 rounded-xl border"
            style={{ background: statusConfig.bg, borderColor: statusConfig.border }}
          >
            {/* Status icon */}
            <motion.span
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: i * 1.2 + 0.3, type: 'spring', stiffness: 300 }}
              className="text-lg"
            >
              {statusConfig.icon}
            </motion.span>

            {/* Category + Answer */}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#6baf80' }}>
                {cat}
              </p>
              <p className="text-white text-sm font-bold truncate">
                {ans?.rawAnswer || '—'}
              </p>
            </div>

            {/* Score badge */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 1.2 + 0.5, type: 'spring', stiffness: 400 }}
              className="px-2.5 py-1 rounded-lg text-xs font-bold"
              style={{ background: statusConfig.bg, color: statusConfig.color }}
            >
              +{ans?.score ?? 0}
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Results Tabs View — "Answers" tab and "Leaderboard" tab with countdown
// ─────────────────────────────────────────────────────────────────────────────

function ResultsTabsView({
  displayResults,
  sortedPlayers,
  session,
  round,
  rankingsCountdown,
  previousRoundRanks,
}: {
  displayResults: RoundResultsPayload;
  sortedPlayers: RoundResultsPayload['players'];
  session: { userId: string; avatarId: string } | null;
  round: { roundNumber: number; totalRounds: number };
  rankingsCountdown: number;
  previousRoundRanks: Record<string, number> | null;
}) {
  const [activeTab, setActiveTab] = useState<'answers' | 'leaderboard'>('answers');

  return (
    <>
      {/* Header */}
      <div className="px-5 pt-8 pb-3 shrink-0">
        <p
          className="text-xs font-bold tracking-widest uppercase mb-1"
          style={{ color: '#6baf80' }}
        >
          Round {displayResults.roundNumber} · Summary
        </p>
        <h3
          className="text-white"
          style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: '26px', lineHeight: 1 }}
        >
          Letter: {displayResults.letter.toUpperCase()}
        </h3>
      </div>

      {/* Tabs */}
      <div className="px-5 mb-3 shrink-0">
        <div className="flex rounded-xl p-1 gap-1" style={{ background: '#0d2018' }}>
          {(['answers', 'leaderboard'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className="flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-all"
              style={{
                background: activeTab === t ? '#00d060' : 'transparent',
                color: activeTab === t ? '#000' : '#6baf80',
              }}
            >
              {t === 'answers' ? 'All Answers' : 'Leaderboard'}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto px-5 pb-2" style={{ scrollbarWidth: 'none' }}>
        {activeTab === 'answers' ? (
          /* ─── Answers — card layout per category ─── */
          <div>
            <div className="space-y-3">
              {displayResults.categories.map((cat) => (
                <div key={cat} className="rounded-xl border p-3" style={{ background: '#0d2018', borderColor: '#1a3528' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#6baf80' }}>
                    {cat}
                  </p>
                  <div className="space-y-1.5">
                    {displayResults.players.map((p) => {
                      const ans = p.answers.find((a) => a.category === cat);
                      const status = ans
                        ? ans.isDuplicate ? 'duplicate' : ans.severity === 'minor_typo' || ans.severity === 'major_typo' ? 'typo' : ans.isValid ? 'valid' : 'invalid'
                        : 'invalid';
                      const statusStyle =
                        status === 'valid' ? { bg: 'rgba(0,208,96,0.1)', color: '#00d060' }
                        : status === 'typo' ? { bg: 'rgba(255,150,0,0.1)', color: '#ff9600' }
                        : status === 'duplicate' ? { bg: 'rgba(255,184,0,0.1)', color: '#ffb800' }
                        : { bg: 'rgba(255,59,92,0.1)', color: '#ff3b5c' };
                      const isYou = p.playerId === session?.userId;
                      return (
                        <div
                          key={p.playerId}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
                          style={{ background: statusStyle.bg }}
                        >
                          <span className="text-sm shrink-0">{getPlayerAvatar(p.avatarId, p.playerId)}</span>
                          <span className="text-[10px] font-bold shrink-0 w-14 truncate" style={{ color: isYou ? '#00d060' : '#6baf80' }}>
                            {isYou ? 'You' : p.displayName.split('_')[0].slice(0, 8)}
                          </span>
                          <p className="flex-1 text-xs text-white truncate min-w-0">
                            {ans?.rawAnswer || '—'}
                          </p>
                          {status === 'typo' && <span className="text-[9px]" style={{ color: '#ff9600' }}>~</span>}
                          <span className="text-[9px] font-bold shrink-0" style={{ color: statusStyle.color }}>
                            +{ans?.score ?? 0}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Score summary row */}
            <div className="flex items-center justify-between mt-3 px-2 py-3 rounded-xl" style={{ background: '#0d2018' }}>
              {displayResults.players.map((p) => {
                const isYou = p.playerId === session?.userId;
                return (
                  <div key={p.playerId} className="flex flex-col items-center gap-0.5">
                    <span className="text-sm">{getPlayerAvatar(p.avatarId, p.playerId)}</span>
                    <span style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: '16px', color: isYou ? '#00d060' : '#ffb800' }}>
                      {p.roundScore}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-3 justify-center">
              {[
                { label: 'Valid', bg: 'rgba(0,208,96,0.14)', color: '#00d060' },
                { label: 'Typo', bg: 'rgba(255,150,0,0.14)', color: '#ff9600' },
                { label: 'Duplicate', bg: 'rgba(255,184,0,0.14)', color: '#ffb800' },
                { label: 'Invalid', bg: 'rgba(255,59,92,0.14)', color: '#ff3b5c' },
              ].map((s) => (
                <span key={s.label} className="text-[9px] font-bold px-2 py-0.5 rounded-md" style={{ background: s.bg, color: s.color }}>
                  {s.label}
                </span>
              ))}
            </div>
          </div>
        ) : (
          /* ─── Leaderboard ─── */
          <div className="space-y-2">
            {sortedPlayers.map((p, i) => {
              const isYou = p.playerId === session?.userId;
              // Calculate rank with ties
              const rank = i === 0 ? 1 : sortedPlayers[i - 1].totalScore === p.totalScore
                ? (sortedPlayers.findIndex(x => x.totalScore === p.totalScore) + 1)
                : i + 1;
              const isTied = i > 0 && sortedPlayers[i - 1].totalScore === p.totalScore
                || (i < sortedPlayers.length - 1 && sortedPlayers[i + 1]?.totalScore === p.totalScore);

              // Rank delta vs previous round
              const prevRank = previousRoundRanks?.[p.playerId] ?? null;
              const delta = prevRank !== null ? prevRank - rank : null; // positive = moved up
              const isFirstRound = prevRank === null;

              const deltaColor = delta === null || delta === 0 ? '#6baf80' : delta > 0 ? '#00d060' : '#ff3b5c';
              const DeltaIcon = delta === null || delta === 0 ? Minus : delta > 0 ? TrendingUp : TrendingDown;

              return (
                <motion.div
                  key={p.playerId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center gap-3 p-3.5 rounded-xl border"
                  style={{
                    background: isYou ? 'rgba(0,208,96,0.13)' : '#0d2018',
                    borderColor: isYou ? '#00d060' : 'transparent',
                    boxShadow: isYou ? '0 0 0 1px rgba(0,208,96,0.25), 0 4px 16px rgba(0,208,96,0.1)' : 'none',
                  }}
                >
                  <span
                    className="w-7 text-center shrink-0"
                    style={{
                      fontFamily: "'Dela Gothic One', sans-serif",
                      fontSize: '20px',
                      color: rank === 1 ? '#ffb800' : isYou ? '#00d060' : '#3a5a45',
                    }}
                  >
                    {rank === 1 ? '👑' : rank}
                  </span>
                  <span className="text-xl shrink-0">{getPlayerAvatar(p.avatarId, p.playerId)}</span>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-bold truncate"
                      style={{ color: isYou ? '#00d060' : 'white' }}
                    >
                      {p.displayName}
                      {isYou && (
                        <span
                          className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: 'rgba(0,208,96,0.2)', color: '#00d060' }}
                        >
                          you
                        </span>
                      )}
                    </p>
                    {isTied && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,184,0,0.15)', color: '#ffb800' }}>
                        TIE
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: '18px', color: isYou ? '#00d060' : '#fff' }}>
                      {p.totalScore}
                    </p>
                    <div className="flex items-center justify-end gap-0.5 text-[10px]" style={{ color: deltaColor }}>
                      <DeltaIcon className="w-2.5 h-2.5" />
                      <span>
                        {isFirstRound || delta === null || delta === 0
                          ? `+${p.roundScore}`
                          : delta > 0
                          ? `↑${delta} · +${p.roundScore}`
                          : `↓${Math.abs(delta)} · +${p.roundScore}`}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Countdown bar */}
      <div className="px-5 pb-6 pt-3 shrink-0">
        <div className="rounded-2xl py-3.5 text-center" style={{ background: '#0d2018' }}>
          <p className="text-sm" style={{ color: '#6baf80' }}>
            {round.roundNumber === round.totalRounds ? (
              rankingsCountdown > 0 ? (
                <>Match summary in{' '}<span style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: '20px', color: '#ffb800' }}>{rankingsCountdown}</span></>
              ) : 'Loading final results...'
            ) : rankingsCountdown > 0 ? (
              <>Next round in{' '}<span style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: '20px', color: '#ffb800' }}>{rankingsCountdown}</span></>
            ) : 'Starting next round...'}
          </p>
        </div>
      </div>
    </>
  );
}
