import { useEffect, useMemo, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, CheckCircle, ClipboardList, Loader2, Minus, Pencil, Trophy, TrendingDown, TrendingUp, Crown } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { socketHandler } from '../socket/socketHandler';
import { persistenceLayer } from '../persistence/persistenceLayer';
import { createKeyedDebouncedEmit } from '../utils/debouncedEmit';
import { playSound, playTimerTick } from '../audio/soundManager';
import { AvatarDisplay } from '../components/AvatarDisplay';
import { GameToast } from '../components/GameToast';
import type { GameToastVariant } from '../components/GameToast';
import type { RoundResultsPayload } from '../types';

type GameSubPhase = 'input' | 'grace' | 'locked' | 'results' | 'rankings';

/**
 * GameScreen — classroom / exercise-book aesthetic.
 * Chalkboard letter badge, ruled-paper input fields, chalk-style timer.
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
  const [rankingsCountdown, setRankingsCountdown] = useState(0);

  const [gameToast, setGameToast] = useState<{ message: string; variant: GameToastVariant } | null>(null);
  const showGameToast = useCallback((message: string, variant: GameToastVariant = 'info') => {
    setGameToast({ message, variant });
  }, []);

  const displayResults =
    roundResults?.roundNumber === round?.roundNumber ? roundResults : null;

  const debouncedEmit = useMemo(() => createKeyedDebouncedEmit(socketHandler, 'answer-submit'), []);

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

  useEffect(() => {
    if (!round) return;
    if (round.phase === 'input') {
      setSubPhase('input');
      setHasStopped(false);
      playSound('roundStart');
    } else if (round.phase === 'grace') {
      setSubPhase('grace');
    } else if (round.phase === 'locked') {
      if (subPhase !== 'results' && subPhase !== 'rankings') setSubPhase('locked');
    } else if (round.phase === 'results') {
      setSubPhase('results');
    }
  }, [round?.phase]);

  useEffect(() => {
    if (roundResults) playSound('resultsReveal');
  }, [roundResults]);

  useEffect(() => {
    if (subPhase === 'results' && displayResults) {
      const t = setTimeout(() => {
        setSubPhase('rankings');
        if (displayResults.players.length > 1 && session?.userId) {
          const sorted = [...displayResults.players].sort((a, b) => b.totalScore - a.totalScore);
          const userIndex = sorted.findIndex((p) => p.userId === session.userId);
          if (
            userIndex === sorted.length - 1 &&
            sorted[userIndex].totalScore < sorted[0].totalScore
          ) {
            playSound('lastPlace');
          }
        }
      }, 10000);
      return () => clearTimeout(t);
    }
  }, [subPhase, displayResults, round?.roundNumber, round?.totalRounds]);

  useEffect(() => {
    const summaryEndTimestamp = round?.summaryEndTimestamp;
    if (
      typeof summaryEndTimestamp !== 'number' ||
      !Number.isFinite(summaryEndTimestamp)
    ) {
      setRankingsCountdown(0);
      return;
    }
    const updateCountdown = () => {
      setRankingsCountdown(
        Math.max(0, Math.ceil((summaryEndTimestamp - Date.now()) / 1000))
      );
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 250);
    return () => clearInterval(interval);
  }, [round?.summaryEndTimestamp]);

  useEffect(() => {
    if (!round) return;
    if (round.phase === 'input') {
      const endsAt = round.endsAt;
      const calcRemaining = () => Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setTimer(calcRemaining());
      const interval = setInterval(() => setTimer(calcRemaining()), 250);
      return () => clearInterval(interval);
    }
    if (round.phase === 'grace' && round.graceEndsAt) {
      const graceEndsAt = round.graceEndsAt;
      const calcGrace = () => Math.max(0, Math.ceil((graceEndsAt - Date.now()) / 1000));
      setGraceTimer(calcGrace());
      const interval = setInterval(() => setGraceTimer(calcGrace()), 250);
      return () => clearInterval(interval);
    }
  }, [round?.phase, round?.endsAt, round?.graceEndsAt]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const r = useGameStore.getState().round;
      if (!r) return;
      if (r.phase === 'input') setTimer(Math.max(0, Math.ceil((r.endsAt - Date.now()) / 1000)));
      if (r.phase === 'grace' && r.graceEndsAt) setGraceTimer(Math.max(0, Math.ceil((r.graceEndsAt - Date.now()) / 1000)));
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    if (subPhase !== 'input') return;
    if (timer > 15 || timer <= 0) return;
    playTimerTick(timer);
  }, [timer, subPhase]);

  useEffect(() => {
    if (subPhase !== 'grace') return;
    const tickInterval = setInterval(() => {
      playSound('tick');
      playSound('heartbeat');
    }, 1000);
    return () => clearInterval(tickInterval);
  }, [subPhase]);

  useEffect(() => {
    if (round?.phase === 'grace' && round.graceTriggeredBy) {
      if (!hasStopped) {
        showGameToast(`${round.graceTriggeredBy} said STOP! Hurry up!`, 'stop');
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
      playSound('stop');
    }
  }, [room?.roomCode]);

  const allAnswersFilled = useMemo(() => {
    if (!round?.categories) return false;
    return round.categories.every((cat) => (answers[cat] ?? '').trim().length > 0);
  }, [round?.categories, answers]);

  if (!round) {
    return (
      <div className="flex-1 flex items-center justify-center paper-body">
        <p className="text-sm animate-pulse font-hand text-desk">Waiting for round to start...</p>
      </div>
    );
  }

  const totalSeconds = 90;
  const timerPct = timer / totalSeconds;
  const timerColor = timer > 30 ? '#6b4423' : timer > 10 ? '#b45309' : '#c0392b';
  const R = 28;
  const C = 2 * Math.PI * R;

  const sortedPlayers = displayResults
    ? [...displayResults.players].sort((a, b) => b.totalScore - a.totalScore)
    : [];

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden relative paper-body"
      data-testid="screen-game"
    >
      {/* In-game toast */}
      <GameToast
        message={gameToast?.message ?? ''}
        variant={gameToast?.variant ?? 'info'}
        visible={!!gameToast}
        onDismiss={() => setGameToast(null)}
      />

      {/* Game header */}
      <div
        className="grid grid-cols-[1fr_1fr_1fr] mb-3 items-center px-5 pt-5 pb-3 shrink-0"
        style={{ borderBottom: '1px solid #c8b89a' }}
      >
        <div>
          <p className="text-[12px] font-bold tracking-widest uppercase font-hand text-chalk-mark">
            Round {round.roundNumber} / {round.totalRounds}
          </p>
          <p className="text-sm font-bold font-hand text-ink-dark">
            {room?.settings?.categoryPackId || 'Classic Nigeria'}
          </p>
        </div>

            {/* Letter badge */}
      <div className="flex justify-center shrink-0">
        <motion.div
          initial={{ scale: 0.5, rotate: -15, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', bounce: 0.4, duration: 0.5 }}
          className="w-18 h-1 flex flex-col border-2 border-paper-ruled rounded-xl items-center justify-center"
        >
          <span
            className="font-display text-5xl leading-none text-chalk-board"
          >
            {round.letter.toUpperCase()}
          </span>
        </motion.div>
      </div>

        {/* Circular chalk timer */}
        <div className="flex justify-end">
          <div className="relative h-[64px] w-[64px] shrink-0">
            <svg
              className="absolute inset-0 block"
              width="64"
              height="64"
              viewBox="0 0 64 64"
              aria-hidden="true"
              style={{ transform: 'rotate(-90deg)' }}
            >
              <circle cx="32" cy="32" r={R} fill="none" stroke="rgba(200,184,154,0.3)" strokeWidth="4" />
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
              className="absolute inset-0 flex items-center justify-center font-display text-[20px] leading-none tabular-nums"
              style={{ color: timerColor, transition: 'color 0.3s ease' }}
            >
              {timer}
            </span>
          </div>
        </div>
       
      </div>

     

      {/* Input fields */}
      <div className="flex-1 overflow-y-auto px-4" style={{ scrollbarWidth: 'none' }}>
     
      
        <div className={`space-y-2 ${subPhase === 'grace' ? 'pb-32' : 'pb-3'}`}>
          {round.categories.map((cat, idx) => {
            const filled = !!(answers[cat] ?? '').trim();
            const isReadOnly = hasStopped || (subPhase !== 'input' && subPhase !== 'grace');
            return (
              <motion.div
                key={cat}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.06, type: 'spring', bounce: 0, duration: 0.3 }}
                className="input-ruled"
                style={{
                  border: `2px solid ${filled ? '#8b5e3c' : '#c8b89a'}`,
                  boxShadow: filled ? '0 0 0 2px rgba(139,94,60,0.12)' : 'none',
                  opacity: isReadOnly ? 0.75 : 1,
                }}
              >
                <div className="px-3.5 pt-2 pb-1.5">
                  <div className="flex items-center justify-between mb-0.5">
                    <span
                      className="text-sm font-bold uppercase tracking-widest font-hand"
                      style={{ color: filled ? '#6b4423' : '#8b5e3c' }}
                    >
                      {idx + 1}. {cat}
                    </span>
                    {filled && !isReadOnly && (
                      <CheckCircle className="w-3.5 h-3.5 shrink-0 text-chalk-mark" />
                    )}
                  </div>
                  <input
                    type="text"
                    value={answers[cat] || ''}
                    onChange={(e) => handleAnswerChange(cat, e.target.value)}
                    readOnly={isReadOnly}
                    placeholder={`${round.letter.toUpperCase()}...`}
                    className="w-full bg-transparent outline-none font-bold font-hand text-ink-dark"
                    style={{ caretColor: '#6b4423' }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>




        {/* STOP button */}
      {subPhase === 'input' && (
        <div className="px-5 pb-8 pb-safe pt-3 shrink-0">
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={handleStop}
            disabled={!allAnswersFilled || hasStopped}
            className="w-full rounded-2xl py-3 disabled:opacity-50 font-display text-2xl text-chalk-white"
            style={{
              background: '#c0392b',
              boxShadow: !allAnswersFilled || hasStopped
                ? 'none'
                : '0 6px 20px rgba(192,57,43,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            STOP!
          </motion.button>
        </div>
      )}
      </div>

      

      {/* Grace period overlay */}
      <AnimatePresence>
        {subPhase === 'grace' && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', bounce: 0, duration: 0.38 }}
            className="absolute inset-x-0 bottom-0 rounded-t-3xl px-6 pt-5 pb-8 flex items-center justify-between"
            style={{
              background: '#d97706',
              backgroundImage: `repeating-linear-gradient(transparent, transparent 27px, rgba(0,0,0,0.08) 27px, rgba(0,0,0,0.08) 28px)`,
              boxShadow: '0 -4px 24px rgba(0,0,0,0.3)',
            }}
          >
            <div>
              <p className="font-display text-[24px] text-ink-dark leading-none flex items-center gap-2">
                <Bell className="w-6 h-6" /> Grace Period!
              </p>
              <p className="text-sm mt-1 font-bold font-hand" style={{ color: 'rgba(26,18,8,0.65)' }}>
                Finish your answers — sharp sharp!
              </p>
            </div>
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.15)' }}
            >
              <span className="font-display text-[36px] text-ink-dark leading-none">{graceTimer}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keep scores hidden until the current round's final results arrive. */}
      {(subPhase === 'locked' || (subPhase === 'results' && !displayResults)) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex flex-col items-center justify-center gap-4"
          style={{ background: 'rgba(74,53,32,0.94)', backdropFilter: 'blur(4px)' }}
        >
          <Loader2 className="w-10 h-10 animate-spin text-desk" />
          <p className="font-display text-[26px] text-chalk-white">Marking...</p>
          <p className="text-sm font-hand text-chalk-white">Teacher is checking your answers</p>
        </motion.div>
      )}

      {/* My Answers Reveal (10s) */}
      <AnimatePresence>
        {subPhase === 'results' && displayResults && (
          <motion.div
            key="my-answers-reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col overflow-hidden paper-body"
          >
            <div
              className="px-5 pt-4 pb-4 shrink-0 text-center"
              style={{ borderBottom: '1px solid #c8b89a' }}
            >
              <p className="text-sm mb-2 font-bold font-hand text-chalk-board">
                Round {displayResults.roundNumber} · Your Answers
              </p>
              <div
                className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-1 border-2 border-paper-ruled"
              >
                <span className="font-display text-4xl text-chalk-board">
                  {displayResults.letter.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-4 pt-3" style={{ scrollbarWidth: 'none' }}>
              <MyAnswersReveal results={displayResults} currentUserId={session?.userId ?? ''} />
            </div>

            <div className="px-5 pb-6 pt-2 shrink-0 text-center">
              {(() => {
                const myResult = displayResults.players.find(
                  (p) => p.userId === session?.userId,
                );
                return myResult ? (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 8, type: 'spring', stiffness: 200 }}
                  >
                    <p className="text-sm font-bold font-hand text-chalk-board">Round Score</p>
                    <p className="font-display text-[36px] text-amber-800">+{myResult.roundScore}</p>
                  </motion.div>
                ) : null;
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results + Rankings tabs */}
      <AnimatePresence>
        {subPhase === 'rankings' && displayResults && (
          <motion.div
            key="results-tabs-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col overflow-hidden paper-body"
          >
            <ResultsTabsView
              displayResults={displayResults}
              sortedPlayers={sortedPlayers}
              session={session}
              round={round}
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
// My Answers Reveal
// ─────────────────────────────────────────────────────────────────────────────

function MyAnswersReveal({
  results,
  currentUserId,
}: {
  results: RoundResultsPayload;
  currentUserId: string;
}) {
  const myResult = results.players.find((p) => p.userId === currentUserId);

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
          valid:     { bg: '#f5f0e8', border: 'rgba(107,68,35,0.28)', color: '#6b4423', label: '✓' },
          typo:      { bg: '#fffbf0', border: 'rgba(217,119,6,0.3)',  color: '#d97706', label: '~' },
          duplicate: { bg: '#fffbf0', border: 'rgba(139,94,60,0.3)',  color: '#92400e', label: 'D' },
          invalid:   { bg: '#fdf0ef', border: 'rgba(192,57,43,0.3)',  color: '#c0392b', label: '✗' },
        }[status];

        return (
          <motion.div
            key={cat}
            initial={{ opacity: 0, x: 50, scale: 0.94 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: i * 0.7, type: 'spring', stiffness: 260, damping: 22 }}
            className="rounded-xl overflow-hidden"
            style={{
              background: statusConfig.bg,
      //         backgroundImage: `repeating-linear-gradient(      transparent,
      // transparent 27px,
      // rgba(180, 160, 125, 0.10) 27px,
      // rgba(180, 160, 125, 0.10) 28px)`,
              border: `2px solid ${statusConfig.border}`,
            }}
          >
            <div className="px-4 pt-2.5 pb-2 flex items-center gap-3">
              <motion.span
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: i * 0.7 + 0.3, type: 'spring', stiffness: 350, damping: 18 }}
                className="font-script leading-none text-center shrink-0"
                style={{ fontSize: '26px', color: statusConfig.color, width: '28px' }}
              >
                {statusConfig.label}
              </motion.span>

              <div className="flex-1 min-w-0">
                <p className="label-section text-chalk-mark">{cat}</p>
                <p className="font-bold truncate font-hand text-[17px] text-ink-dark">
                  {ans?.rawAnswer || '—'}
                </p>
              </div>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.7 + 0.5, type: 'spring', stiffness: 400 }}
                className="px-2.5 py-1 rounded-lg font-script text-[16px] font-bold"
                style={{
                  background: statusConfig.border,
                  color: statusConfig.color,
                }}
              >
                +{ans?.score ?? 0}
              </motion.div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Results Tabs View
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
  round: { roundNumber: number; totalRounds: number; summaryEndTimestamp?: number };
  rankingsCountdown: number;
  previousRoundRanks: Record<string, number> | null;
}) {
  const [activeTab, setActiveTab] = useState<'answers' | 'leaderboard'>('answers');
  const currentUserId = session?.userId;

  return (
    <>
      {/* Header */}
      <div
        className="px-5 pt-4 pb-3 shrink-0"
        style={{ borderBottom: '1px solid #c8b89a' }}
      >
        <p className="label-section mb-1 text-chalk-mark">
          Round {displayResults.roundNumber} · Review
        </p>
        <h3 className="font-display text-[24px] text-chalk-board leading-none">
          Letter: {displayResults.letter.toUpperCase()}
        </h3>
      </div>

      {/* Tab switcher */}
      <div className="px-5 py-3 shrink-0">
        <div className="flex rounded-xl p-1 gap-1" style={{ background: 'rgba(139,94,60,0.12)', border: '1px solid #c8b89a' }}>
          {(['answers', 'leaderboard'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className="flex-1 py-2 rounded-lg text-sm font-bold capitalize transition-all font-hand "
              style={{
                background: activeTab === t ? '#6b4423' : 'transparent',
                color: activeTab === t ? '#f5f0e8' : '#6b4423',
              }}
            >
              {t === 'answers' ? (
                <span className="flex items-center justify-center gap-1.5"><ClipboardList className="w-3.5 h-3.5" /> All Answers</span>
              ) : (
                <span className="flex items-center justify-center gap-1.5"><Trophy className="w-3.5 h-3.5" /> Leaderboard</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-5 pb-2" style={{ scrollbarWidth: 'none' }}>
        {activeTab === 'answers' ? (
          <div>
            <div className="space-y-3">
              {displayResults.categories.map((cat) => (
                <div
                  key={cat}
                  className="rounded-xl overflow-hidden"
                  style={{
                    background: '#f5f0e8',
                    // backgroundImage: `repeating-linear-gradient(transparent, transparent 31px, #d4c9b0 31px, #d4c9b0 32px)`,
                    border: '2px solid #c8b89a',
                  }}
                >
                  {/* Category header */}
                  <div className="px-3.5 py-2" style={{ borderBottom: '1px solid #c8b89a' }}>
                    <p className="label-section text-chalk-mark flex items-center gap-1.5">
                      <Pencil className="w-3 h-3" /> {cat}
                    </p>
                  </div>
                  <div className="divide-y divide-paper-line">
                    {displayResults.players.map((p) => {
                      const ans = p.answers.find((a) => a.category === cat);
                      const status = ans
                        ? ans.isDuplicate ? 'duplicate' : ans.severity === 'minor_typo' || ans.severity === 'major_typo' ? 'typo' : ans.isValid ? 'valid' : 'invalid'
                        : 'invalid';
                      const mark =
                        status === 'valid'     ? { color: '#6b4423', label: '✓' }
                        : status === 'typo'    ? { color: '#d97706', label: '~' }
                        : status === 'duplicate' ? { color: '#92400e', label: 'D' }
                        : { color: '#c0392b', label: '✗' };
                      const isYou = p.userId === currentUserId;


                      return (
                        <div
                          key={p.playerId}
                          className="flex items-center gap-2.5 px-3.5 py-2"
                        >
                          <span
                            className="font-script text-[18px] shrink-0"
                            style={{ color: mark.color, width: '16px' }}
                          >
                            {mark.label}
                          </span>
                          <AvatarDisplay avatarId={p.avatarId} fallbackId={p.playerId} className="h-5 w-5 shrink-0 object-contain text-sm" />
                          <span className="font-bold shrink-0 w-20 truncate font-hand text-chalk-mark">
                            {isYou ? 'You' : p.displayName.split('_')[0].slice(0, 8)}
                          </span>
                          <p className="flex-1 text-sm truncate min-w-0 font-hand text-ink-dark">
                            {ans?.rawAnswer || '—'}
                          </p>
                          <span
                            className="font-bold shrink-0 font-script text-[14px]"
                            style={{ color: mark.color }}
                          >
                            +{ans?.score ?? 0}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Round score summary */}
            <div
              className="flex items-center justify-between mt-3 px-3 py-3 rounded-xl"
              style={{ background: 'rgba(139,94,60,0.08)', border: '1px solid #c8b89a' }}
            >
              {displayResults.players.map((p) => {
                const isYou = p.userId === currentUserId;
                return (
                  <div key={p.playerId} className="flex flex-col items-center gap-0.5">
                    <AvatarDisplay avatarId={p.avatarId} fallbackId={p.playerId} className="h-5 w-5 object-contain text-sm" />
                    <span
                      className="font-display text-[15px]"
                      style={{ color: isYou ? '#6b4423' : '#d97706' }}
                    >
                      +{p.roundScore}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-2 mt-3 justify-center">
              {[
                { label: 'Correct', color: '#6b4423' },
                { label: 'Typo',    color: '#d97706' },
                { label: 'Duplic.', color: '#92400e' },
                { label: 'Invalid', color: '#c0392b' },
              ].map((s) => (
                <span
                  key={s.label}
                  className="text-[12px] font-bold px-2 py-0.5 rounded-md font-hand"
                  style={{ color: s.color, background: `${s.color}18` }}
                >
                  {s.label}
                </span>
              ))}
            </div>
          </div>
        ) : (
          /* Leaderboard */
          <div className="space-y-2">
            {sortedPlayers.map((p, i) => {
              const isYou = p.userId === currentUserId;
              const rank = i === 0 ? 1
                : sortedPlayers[i - 1].totalScore === p.totalScore
                ? (sortedPlayers.findIndex(x => x.totalScore === p.totalScore) + 1)
                : i + 1;
              const isTied =
                (i > 0 && sortedPlayers[i - 1].totalScore === p.totalScore) ||
                (i < sortedPlayers.length - 1 && sortedPlayers[i + 1]?.totalScore === p.totalScore);

              const prevRank = previousRoundRanks?.[p.playerId] ?? null;
              const delta = prevRank !== null ? prevRank - rank : null;

              const deltaColor = delta === null || delta === 0 ? '#8b5e3c' : delta > 0 ? '#6b4423' : '#c0392b';
              const DeltaIcon = delta === null || delta === 0 ? Minus : delta > 0 ? TrendingUp : TrendingDown;

              return (
                <motion.div
                  key={p.playerId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08, type: 'spring', bounce: 0, duration: 0.3 }}
                  className="flex items-center gap-3 p-3.5 rounded-xl border"
                  style={{
                    background: isYou ? 'rgba(139,94,60,0.1)' : 'rgba(139,94,60,0.06)',
                    borderColor: isYou ? '#8b5e3c' : '#c8b89a',
                    boxShadow: isYou ? '0 0 0 1px rgba(139,94,60,0.2)' : 'none',
                  }}
                >
                  <span
                    className="w-7 text-center shrink-0 font-display text-[20px]"
                    style={{ color: rank === 1 ? '#d97706' : isYou ? '#6b4423' : '#8b5e3c' }}
                  >
                    {rank === 1 ? <Crown className="w-5 h-5 inline" /> : rank}
                  </span>
                  <AvatarDisplay avatarId={p.avatarId} fallbackId={p.playerId} className="h-7 w-7 shrink-0 object-contain text-xl" />
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold truncate font-hand ${isYou ? 'text-chalk-mark' : 'text-ink-dark'}`}>
                      {p.displayName}
                      {isYou && (
                        <span
                          className="ml-1.5 text-[12px] font-bold px-1.5 py-0.5 rounded-full text-chalk-mark"
                          style={{ background: 'rgba(139,94,60,0.14)' }}
                        >
                          you
                        </span>
                      )}
                    </p>
                    {isTied && (
                      <span
                        className=" font-bold px-1.5 py-0.5 rounded font-hand text-school-amber"
                        style={{ background: 'rgba(217,119,6,0.15)' }}
                      >
                        TIE
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={`font-display text-[18px] ${isYou ? 'text-chalk-mark' : 'text-ink-dark'}`}
                    >
                      {p.totalScore}
                    </p>
                    <div
                      className="flex items-center justify-end gap-0.5 text-[12px] font-hand"
                      style={{ color: deltaColor }}
                    >
                      <DeltaIcon className="w-2.5 h-2.5" />
                      <span>
                        {delta === null || delta === 0
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

      {/* Next round countdown */}
      <div className="px-5 pb-6 pt-3 shrink-0">
        <div
          className="rounded-2xl py-3.5 text-center border"
          style={{ background: 'rgba(139,94,60,0.08)', borderColor: '#c8b89a' }}
        >
          <p className="text-sm font-hand text-chalk-board">
            {round.roundNumber === round.totalRounds ? (
              rankingsCountdown > 0 ? (
                <>Match summary in <span className="font-display text-[20px] text-school-amber">{rankingsCountdown}</span></>
              ) : 'Loading final results...'
            ) : rankingsCountdown > 0 ? (
              <>Next round in <span className="font-display text-[20px] text-school-amber">{rankingsCountdown}</span></>
            ) : 'Waiting for server...'}
          </p>
        </div>
      </div>
    </>
  );
}
