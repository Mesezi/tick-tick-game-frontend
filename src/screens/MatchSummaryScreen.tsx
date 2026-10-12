import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Crown, RotateCcw, Share2, Home, Check, X } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { socketHandler } from '../socket/socketHandler';
import { apiClient } from '../api/client';
import { getPlayerAvatar } from '../utils/avatarHelper';
import { showToast } from '../components/toastStore';

const REMATCH_TIMEOUT_S = 30;
const ROOM_RETENTION_MS = 60_000;

type MatchResults = NonNullable<ReturnType<typeof useGameStore.getState>['matchResults']>;
type PodiumPlayer = MatchResults['podium'][number];

/**
 * MatchSummaryScreen — exercise-book results sheet.
 *
 * Layout (top → bottom):
 *   1. Slim chalkboard header (title + duration)
 *   2. Podium (top 3) — flat, no ruled-line noise
 *   3. "Rest of the class" — one divided list, only shown when there are 4+ players
 *   4. Sticky footer — 1 primary action + 3 equal secondary actions
 */
export function MatchSummaryScreen() {
  const matchResults = useGameStore((s) => s.matchResults);
  const session = useGameStore((s) => s.session);
  const room = useGameStore((s) => s.room);
  const rematch = useGameStore((s) => s.rematch);

  const roomCode = room?.roomCode ?? '';
  const [voted, setVoted] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isRematchAvailable, setIsRematchAvailable] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => setIsRematchAvailable(false), ROOM_RETENTION_MS);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (rematch.status === 'pending') setVoted(false);
  }, [rematch.status, rematch.requestedBy?.playerId]);

  useEffect(() => {
    if (rematch.status === 'cancelled') {
      showToast(rematch.cancelReason || 'Rematch cancelled', 'info');
      const currentSession = useGameStore.getState().session;
      useGameStore.getState().reset();
      if (currentSession) useGameStore.getState().setSession(currentSession);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rematch.status]);

  const handleRequestRematch = useCallback(() => {
    if (!isRematchAvailable) return;
    if (!roomCode) {
      showToast('Room no longer available', 'error');
      return;
    }
    socketHandler.emit('request-rematch', { roomCode });
    showToast('Rematch request sent!', 'info');
  }, [isRematchAvailable, roomCode]);

  const handleAccept = useCallback(() => {
    if (voted || !isRematchAvailable) return;
    socketHandler.emit('accept-rematch', { roomCode });
    setVoted(true);
  }, [isRematchAvailable, roomCode, voted]);

  const handleDecline = useCallback(() => {
    if (voted || !isRematchAvailable) return;
    socketHandler.emit('decline-rematch', { roomCode });
    setVoted(true);
  }, [isRematchAvailable, roomCode, voted]);

  const handleShare = useCallback(async () => {
    if (!roomCode) {
      showToast('Room no longer available', 'error');
      return;
    }
    if (isSharing) return;

    setIsSharing(true);
    try {
      const svg = await apiClient.getShareCardSvg(roomCode);
      const file = new File([svg], `tick-tick-${roomCode}-share-card.svg`, {
        type: 'image/svg+xml',
      });

      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        try {
          await navigator.share({
            files: [file],
            title: 'My Tick Tick game results',
          });
          showToast('Share card ready to share!', 'success');
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') return;
          throw error;
        }
      }

      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast('Share card downloaded.', 'success');
    } catch (error) {
      console.error('[MatchSummary] Failed to get share card:', error);
      showToast('Could not create the share card. Please try again.', 'error');
    } finally {
      setIsSharing(false);
    }
  }, [isSharing, roomCode]);

  const handleGoHome = useCallback(() => {
    const store = useGameStore.getState();
    const currentSession = store.session;
    const roomPlayer = store.room?.players.find(
      (player) => player.userId === currentSession?.userId,
    );
    const summaryPlayer = store.matchResults?.allPlayers.find(
      (player) => player.playerId === currentSession?.userId || player.playerId === roomPlayer?.id,
    );
    const homeSession = currentSession
      ? {
          ...currentSession,
          displayName: currentSession.displayName || roomPlayer?.displayName || summaryPlayer?.displayName || null,
          avatarId: currentSession.avatarId || roomPlayer?.avatarId || summaryPlayer?.avatarId || '',
        }
      : null;

    store.resetToHome(homeSession);
  }, []);

  if (!matchResults || !session) {
    return (
      <div className="flex-1 flex items-center justify-center paper-body">
        <p className="text-sm animate-pulse font-hand text-desk">Loading results...</p>
      </div>
    );
  }

  const sortedPlayers = [...matchResults.allPlayers].sort((a, b) => b.totalScore - a.totalScore);
  const restOfClass = sortedPlayers.slice(3);
  const podium = matchResults.podium;
  const first = podium.find((p) => p.rank === 1);
  const second = podium.find((p) => p.rank === 2);
  const third = podium.find((p) => p.rank === 3);

  const minutes = Math.floor(matchResults.totalDuration / 60000);
  const seconds = Math.round((matchResults.totalDuration % 60000) / 1000);
  const totalDurationStr = `${minutes}:${String(seconds).padStart(2, '0')}`;

  const roomPlayer = room?.players.find((p) => p.userId === session.userId);
  const myPlayerId = roomPlayer?.id ?? session.userId;
  const isMe = (playerId: string) => playerId === session.userId || playerId === myPlayerId;

  const showRematchOverlay = isRematchAvailable && rematch.status === 'pending';
  const canRequestRematch = isRematchAvailable && rematch.status === 'idle';
  const iRequested =
    rematch.requestedBy?.playerId === session.userId ||
    rematch.requestedBy?.playerId === myPlayerId;

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden relative paper-body"
      data-testid="screen-match-summary"
    >
      <div className="flex-1 overflow-auto" style={{ scrollbarWidth: 'none' }}>
        {/* ── Header ─────────────────────────────────────────── */}
        <header
          className="px-6 pt-5 pb-5 text-center"
        >
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
            className="font-display text-4xl text-desk leading-none"
          >
            Game Over!
          </motion.h1>
          <p className="text-sm mt-2 font-hand">
            {totalDurationStr} of competition
          </p>
        </header>

        {/* ── Podium ─────────────────────────────────────────── */}
        <section className="px-5 pb-2">
          <div
            className="rounded-2xl px-3 pb-0 overflow-hidden"
          >
            <div className="flex items-end justify-center gap-2">
              {second && (
                <PodiumSlot player={second} rank={2} isYou={isMe(second.playerId)} delay={0.15} />
              )}
              {first && (
                <PodiumSlot player={first} rank={1} isYou={isMe(first.playerId)} delay={0} />
              )}
              {third && (
                <PodiumSlot player={third} rank={3} isYou={isMe(third.playerId)} delay={0.3} />
              )}
            </div>
          </div>
        </section>

        {/* ── Rest of the class ──────────────────────────────── */}
        {restOfClass.length > 0 && (
          <section className="px-5 pt-6 pb-6">
            <h2 className="mb-2 px-1 font-display text-[17px] text-desk">Rest of the class</h2>
            <ul
              className="rounded-2xl overflow-hidden"
              style={{ border: '1.5px solid #c8b89a', background: 'rgba(245,240,232,0.6)' }}
            >
              {restOfClass.map((p, i) => {
                const rank = i + 4;
                const you = isMe(p.playerId);
                const isLast = i === restOfClass.length - 1;
                return (
                  <motion.li
                    key={p.playerId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(i * 0.04, 0.4), duration: 0.25 }}
                    className="flex items-center gap-3 px-4 py-3"
                    style={{
                      background: you ? 'rgba(107,68,35,0.12)' : 'transparent',
                      borderBottom: isLast ? 'none' : '1px solid #d4c9b0',
                    }}
                  >
                    <span className="w-6 shrink-0 text-center font-display text-[15px] text-desk">
                      {rank}
                    </span>
                    <span className="text-xl leading-none">
                      {getPlayerAvatar(p.avatarId, p.playerId)}
                    </span>
                    <span
                      className={`flex-1 min-w-0 truncate text-[15px] font-bold font-hand ${
                        you ? 'text-chalk-mark' : 'text-ink-dark'
                      }`}
                    >
                      {p.displayName}
                      {you && <span className="ml-2 text-[13px] font-normal opacity-70">(you)</span>}
                    </span>
                    <span
                      className={`font-display text-[18px] tabular-nums ${
                        you ? 'text-chalk-mark' : 'text-ink-dark'
                      }`}
                    >
                      {p.totalScore}
                    </span>
                  </motion.li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Breathing room above the sticky footer when the list is short */}
        {restOfClass.length === 0 && <div className="h-6" />}
      </div>

      {/* ── Footer actions ─────────────────────────────────── */}
      <footer
        className="shrink-0 px-5 pt-3 flex flex-col gap-3"
        style={{
          borderTop: '1px solid #c8b89a',
          paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))',
        }}
      >
        {canRequestRematch && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleRequestRematch}
            className="w-full rounded-2xl py-4 flex items-center justify-center gap-2 btn-primary font-display text-[21px]"
            style={{ boxShadow: '0 4px 16px rgba(107,68,35,0.28)' }}
          >
            <RotateCcw className="w-5 h-5" /> Rematch
          </motion.button>
        )}

        {isRematchAvailable && rematch.status === 'pending' && iRequested && (
          <div
            className="w-full rounded-2xl py-4 text-center border"
            style={{ background: 'rgba(139,94,60,0.08)', borderColor: '#c8b89a' }}
          >
            <p className="text-[15px] font-bold font-hand text-chalk-board">
              Waiting for others… {rematch.accepted.length}/{rematch.total}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <FooterButton
            icon={<Share2 className="w-5 h-5" />}
            label={isSharing ? 'Preparing...' : 'Share'}
            onClick={handleShare}
            disabled={isSharing}
          />
          <FooterButton icon={<Home className="w-5 h-5" />} label="Home" onClick={handleGoHome} />
        </div>
      </footer>

      {/* ── Rematch overlay ────────────────────────────────── */}
      <AnimatePresence>
        {showRematchOverlay && !iRequested && (
          <RematchOverlay
            rematch={rematch}
            voted={voted}
            onAccept={handleAccept}
            onDecline={handleDecline}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Footer button (icon over label, equal width)
// ─────────────────────────────────────────────────────────────────────────────

function FooterButton({
  icon,
  label,
  onClick,
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      disabled={disabled}
      className="rounded-xl py-1 flex flex-col items-center justify-center gap-1 text-[13px] font-bold btn-ghost text-chalk-board! disabled:opacity-60"
    >
      {icon}
      {label}
    </motion.button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Podium slot (replaces three near-identical blocks)
// ─────────────────────────────────────────────────────────────────────────────

const PODIUM_STYLE = {
  1: {
    height: 104,
    avatar: 'text-4xl',
    numberClass: 'text-[30px] text-school-amber',
    scoreClass: 'text-school-amber',
    background: 'rgba(217,119,6,0.15)',
    border: '2px solid rgba(217,119,6,0.4)',
  },
  2: {
    height: 76,
    avatar: 'text-3xl',
    numberClass: 'text-[24px] text-chalk-mark',
    scoreClass: 'text-chalk-mark',
    background: 'rgba(139,94,60,0.08)',
    border: '1.5px solid rgba(139,94,60,0.24)',
  },
  3: {
    height: 60,
    avatar: 'text-3xl',
    numberClass: 'text-[22px] text-chalk-mark',
    scoreClass: 'text-chalk-mark',
    background: 'rgba(139,94,60,0.06)',
    border: '1.5px solid rgba(139,94,60,0.2)',
  },
} as const;

function PodiumSlot({
  player,
  rank,
  isYou,
  delay,
}: {
  player: PodiumPlayer;
  rank: 1 | 2 | 3;
  isYou: boolean;
  delay: number;
}) {
  const s = PODIUM_STYLE[rank];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', bounce: 0.15, duration: 0.5, delay }}
      className="flex-1 min-w-0 max-w-30 flex flex-col items-center"
    >
      {/* Fixed-height crown row keeps avatars aligned and the name from jumping */}
      <div className="h-5 flex items-center justify-center">
        {rank === 1 && <Crown className="w-5 h-5 text-school-amber" />}
      </div>

      <span className={`${s.avatar} leading-none`}>
        {getPlayerAvatar(player.avatarId, player.playerId)}
      </span>

      <p className="mt-1.5 mb-2 w-full truncate text-center text-[14px] font-bold font-hand text-ink-dark">
        {player.displayName.split('_')[0]}
        {isYou && <span className="ml-1 text-[12px] font-normal opacity-70">(you)</span>}
      </p>

      <div
        className="w-full rounded-t-xl flex flex-col items-center justify-center gap-0.5"
        style={{
          height: s.height,
          background: s.background,
          border: s.border,
          borderBottom: 'none',
        }}
      >
        <span className={`font-display leading-none ${s.numberClass}`}>{rank}</span>
        <span className={`text-sm font-bold font-hand tabular-nums ${s.scoreClass}`}>
          {player.totalScore}
        </span>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Rematch Overlay
// ─────────────────────────────────────────────────────────────────────────────

function RematchOverlay({
  rematch,
  voted,
  onAccept,
  onDecline,
}: {
  rematch: {
    requestedBy: { playerId: string; displayName: string } | null;
    accepted: string[];
    declined: string[];
    total: number;
  };
  voted: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const [countdown, setCountdown] = useState(REMATCH_TIMEOUT_S);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 flex items-end"
      style={{ background: 'rgba(0,0,0,0.45)' }}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
        className="w-full rounded-t-3xl px-6 pt-3 paper-body"
        style={{
          borderTop: '2px solid #c8b89a',
          boxShadow: '0 -8px 32px rgba(139,94,60,0.2)',
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
        }}
      >
        {/* Sheet handle */}
        <div className="flex justify-center mb-5">
          <div className="w-10 h-1 rounded-full bg-paper-ruled" />
        </div>

        {/* Title + status in one block */}
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(139,94,60,0.12)', border: '1px solid rgba(139,94,60,0.28)' }}
          >
            <RotateCcw className="w-5 h-5 text-chalk-mark" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-[16px] font-hand text-ink-dark">
              {rematch.requestedBy?.displayName} wants a rematch!
            </p>
            <p className="text-[13px] font-hand text-chalk-board">
              {rematch.accepted.length}/{rematch.total} in · {Math.max(countdown, 0)}s left
            </p>
          </div>
        </div>

        {/* Single countdown bar (the separate vote bar was redundant) */}
        <div className="w-full h-1.5 rounded-full mt-4 mb-5 overflow-hidden bg-paper-line">
          <motion.div
            className="h-full rounded-full bg-school-amber"
            initial={{ width: '100%' }}
            animate={{ width: `${(Math.max(countdown, 0) / REMATCH_TIMEOUT_S) * 100}%` }}
            transition={{ duration: 1, ease: 'linear' }}
          />
        </div>

        {/* Buttons */}
        {voted ? (
          <div
            className="rounded-2xl py-4 text-center"
            style={{ background: 'rgba(139,94,60,0.08)', border: '1px solid #c8b89a' }}
          >
            <p className="text-[15px] font-bold font-hand text-chalk-board">
              Vote received. Waiting for others…
            </p>
          </div>
        ) : (
          <div className="flex gap-3">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={onDecline}
              className="flex-1 rounded-2xl py-4 flex items-center justify-center gap-2 font-bold text-[15px] btn-danger"
            >
              <X className="w-4 h-4" /> Decline
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={onAccept}
              className="flex-1 rounded-2xl py-4 flex items-center justify-center gap-2 font-bold btn-primary font-display text-[18px]"
              style={{ boxShadow: '0 4px 12px rgba(107,68,35,0.28)' }}
            >
              <Check className="w-4 h-4" /> Accept
            </motion.button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}