import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Crown, RotateCcw, Share2, Trophy, Home, Check, X } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { socketHandler } from '../socket/socketHandler';
import { getPlayerAvatar } from '../utils/avatarHelper';
import { showToast } from '../components/toastStore';

const REMATCH_TIMEOUT_S = 30;

/**
 * MatchSummaryScreen - Podium layout, final scores, rematch/share/leaderboard buttons.
 * Includes RematchOverlay that appears when another player requests a rematch.
 */
export function MatchSummaryScreen() {
  const matchResults = useGameStore((s) => s.matchResults);
  const session = useGameStore((s) => s.session);
  const room = useGameStore((s) => s.room);
  const rematch = useGameStore((s) => s.rematch);

  const roomCode = room?.roomCode ?? '';

  // Track whether this player has already voted
  const [voted, setVoted] = useState(false);

  // Reset voted state when a new rematch request comes in
  useEffect(() => {
    if (rematch.status === 'pending') setVoted(false);
  }, [rematch.status, rematch.requestedBy?.playerId]);

  // On cancelled → go home
  useEffect(() => {
    if (rematch.status === 'cancelled') {
      showToast(rematch.cancelReason || 'Rematch cancelled', 'info');
      const currentSession = useGameStore.getState().session;
      useGameStore.getState().reset();
      if (currentSession) useGameStore.getState().setSession(currentSession);
    }
  }, [rematch.status]);

  const handleRequestRematch = useCallback(() => {
    if (!roomCode) {
      showToast('Room no longer available', 'error');
      return;
    }
    socketHandler.emit('request-rematch', { roomCode });
    showToast('Rematch request sent! 🔥', 'info');
  }, [roomCode]);

  const handleAccept = useCallback(() => {
    if (voted) return;
    socketHandler.emit('accept-rematch', { roomCode });
    setVoted(true);
  }, [roomCode, voted]);

  const handleDecline = useCallback(() => {
    if (voted) return;
    socketHandler.emit('decline-rematch', { roomCode });
    setVoted(true);
  }, [roomCode, voted]);

  const handleShare = useCallback(() => {
    showToast('Victory card ready! 🏆', 'success');
  }, []);

  const handleLeaderboard = useCallback(() => {
    useGameStore.getState().setMatchResults(null);
  }, []);

  const handleGoHome = useCallback(() => {
    const currentSession = useGameStore.getState().session;
    useGameStore.getState().reset();
    if (currentSession) useGameStore.getState().setSession(currentSession);
  }, []);

  if (!matchResults || !session) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: '#081510' }}>
        <p className="text-sm" style={{ color: '#6baf80' }}>Loading results...</p>
      </div>
    );
  }

  const sortedPlayers = [...matchResults.allPlayers].sort((a, b) => b.totalScore - a.totalScore);
  const podium = matchResults.podium;
  const first  = podium.find((p) => p.rank === 1);
  const second = podium.find((p) => p.rank === 2);
  const third  = podium.find((p) => p.rank === 3);

  const totalDurationStr = `${Math.round(matchResults.totalDuration / 60000)}:${String(
    Math.round((matchResults.totalDuration % 60000) / 1000)
  ).padStart(2, '0')}`;

  const showRematchOverlay = rematch.status === 'pending';
  // Don't show the request button if a rematch is already pending or ready
  const canRequestRematch = rematch.status === 'idle';
  // Was the rematch requested by me?
  const roomPlayer = room?.players.find((p) => p.userId === session.userId);
  const myPlayerId = roomPlayer?.id ?? session.userId;
  const iRequested = rematch.requestedBy?.playerId === session.userId || rematch.requestedBy?.playerId === myPlayerId;

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative" data-testid="screen-match-summary">

      {/* ── Main content ── */}
      <div className="flex-1 overflow-auto" style={{ scrollbarWidth: 'none' }}>
        <div className="px-6 pt-14 pb-3 mb-12 text-center">
          <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: '#6baf80' }}>
            Match Complete
          </p>
          <h2
            className="text-white mb-1"
            style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: '42px', lineHeight: 1 }}
          >
            GG! 🎉
          </h2>
          <p className="text-sm" style={{ color: '#6baf80' }}>{totalDurationStr} played</p>
        </div>

        {/* Podium */}
        <div className="px-6 mb-5">
          <div className="flex items-end justify-center gap-3 h-36">
            {second && (
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl">{getPlayerAvatar(second.avatarId, second.playerId)}</span>
                <p className="text-[10px] font-bold" style={{ color: '#6baf80' }}>{second.displayName.split('_')[0]}</p>
                <div className="w-20 rounded-t-xl flex flex-col items-center justify-end" style={{ height: '68px', background: '#1a3528' }}>
                  <span className="mb-1" style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: '22px', color: '#a0c8a8' }}>2</span>
                  <p className="text-xs mb-2" style={{ color: '#6baf80' }}>{second.totalScore}</p>
                </div>
              </div>
            )}
            {first && (
              <div className="flex flex-col items-center gap-1">
                <Crown className="w-5 h-5" style={{ color: '#ffb800' }} />
                <span className="text-3xl">{getPlayerAvatar(first.avatarId, first.playerId)}</span>
                <p className="text-white text-[10px] font-bold">{first.displayName.split('_')[0]}</p>
                <div className="w-20 rounded-t-xl flex flex-col items-center justify-end border" style={{ height: '100px', background: 'rgba(0,208,96,0.15)', borderColor: 'rgba(0,208,96,0.3)' }}>
                  <span className="mb-1" style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: '28px', color: '#ffb800' }}>1</span>
                  <p className="text-sm font-bold mb-2" style={{ color: '#00d060' }}>{first.totalScore}</p>
                </div>
              </div>
            )}
            {third && (
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl">{getPlayerAvatar(third.avatarId, third.playerId)}</span>
                <p className="text-[10px] font-bold" style={{ color: '#6baf80' }}>{third.displayName.split('_')[0]}</p>
                <div className="w-20 rounded-t-xl flex flex-col items-center justify-end" style={{ height: '48px', background: '#1a3528' }}>
                  <span className="mb-1" style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: '22px', color: '#a0c8a8' }}>3</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Final scores */}
        <div className="px-6">
          <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: '#a0c8a8' }}>Final Scores</p>
          <div className="space-y-2 mb-4">
            {sortedPlayers.map((p, i) => {
              const isYou = p.playerId === session.userId;
              return (
                <div
                  key={p.playerId}
                  className="flex items-center gap-3 p-3.5 rounded-xl border"
                  style={{ background: isYou ? 'rgba(0,208,96,0.09)' : '#0d2018', borderColor: isYou ? 'rgba(0,208,96,0.28)' : 'transparent' }}
                >
                  <span className="text-sm font-bold w-5 text-center" style={{ color: '#3a5a45' }}>{i + 1}</span>
                  <span className="text-xl">{getPlayerAvatar(p.avatarId, p.playerId)}</span>
                  <p className="flex-1 text-white text-sm font-bold">
                    {p.displayName}
                    {isYou && <span className="text-xs font-normal ml-1" style={{ color: '#00d060' }}>(you)</span>}
                  </p>
                  <span className="text-white" style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: '18px' }}>
                    {p.totalScore}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Action buttons ── */}
      <div className="px-6 pb-8 pb-safe pt-2 flex flex-col gap-2 shrink-0">
        {canRequestRematch && (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleRequestRematch}
            className="w-full rounded-2xl py-4 text-black flex items-center justify-center gap-2"
            style={{ background: '#00d060', fontFamily: "'Dela Gothic One', sans-serif", fontSize: '22px' }}
          >
            <RotateCcw className="w-5 h-5" /> Rematch
          </motion.button>
        )}
        {rematch.status === 'pending' && iRequested && (
          <div className="rounded-2xl py-4 text-center" style={{ background: '#0d2018' }}>
            <p className="text-sm font-bold" style={{ color: '#6baf80' }}>
              Waiting for others... ({rematch.accepted.length}/{rematch.total})
            </p>
          </div>
        )}
        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleShare}
            className="flex-1 rounded-xl py-3.5 text-white text-sm font-bold flex items-center justify-center gap-2 border"
            style={{ background: '#0d2018', borderColor: '#1a3528' }}
          >
            <Share2 className="w-4 h-4" /> Share
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleLeaderboard}
            className="flex-1 rounded-xl py-3.5 text-white text-sm font-bold flex items-center justify-center gap-2 border"
            style={{ background: '#0d2018', borderColor: '#1a3528' }}
          >
            <Trophy className="w-4 h-4" /> Leaderboard
          </motion.button>
        </div>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleGoHome}
          className="w-full rounded-xl py-3.5 text-white text-sm font-bold flex items-center justify-center gap-2 border"
          style={{ background: '#0d2018', borderColor: '#1a3528' }}
        >
          <Home className="w-4 h-4" /> Home
        </motion.button>
      </div>

      {/* ── Rematch overlay (slides up when pending) ── */}
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
// Rematch Overlay — shown to players who didn't initiate the rematch
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

  const accepted = rematch.accepted.length;
  const total    = rematch.total;
  const pct      = total > 0 ? (accepted / total) * 100 : 0;

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 26, stiffness: 300 }}
      className="absolute inset-x-0 bottom-0 rounded-t-3xl px-6 pt-6 pb-10"
      style={{ background: '#0d2018', borderTop: '1px solid rgba(0,208,96,0.2)' }}
    >
      {/* Countdown bar */}
      <div className="w-full h-1 rounded-full mb-5 overflow-hidden" style={{ background: '#1a3528' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: '#ffb800' }}
          initial={{ width: '100%' }}
          animate={{ width: `${(countdown / REMATCH_TIMEOUT_S) * 100}%` }}
          transition={{ duration: 1, ease: 'linear' }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(0,208,96,0.12)' }}
        >
          <RotateCcw className="w-5 h-5" style={{ color: '#00d060' }} />
        </div>
        <div>
          <p className="text-white font-bold text-sm">
            {rematch.requestedBy?.displayName} wants a rematch!
          </p>
          <p className="text-[11px]" style={{ color: '#6baf80' }}>
            Expires in {countdown}s
          </p>
        </div>
      </div>

      {/* Vote progress */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#1a3528' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: '#00d060' }}
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 200 }}
          />
        </div>
        <span className="text-xs font-bold shrink-0" style={{ color: '#00d060' }}>
          {accepted}/{total} in
        </span>
      </div>

      {/* Buttons */}
      {voted ? (
        <div className="rounded-2xl py-4 text-center" style={{ background: '#122318' }}>
          <p className="text-sm font-bold" style={{ color: '#6baf80' }}>
            Vote received · waiting for others...
          </p>
        </div>
      ) : (
        <div className="flex gap-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onDecline}
            className="flex-1 rounded-2xl py-4 flex items-center justify-center gap-2 font-bold text-sm border"
            style={{ background: 'transparent', borderColor: 'rgba(255,59,92,0.3)', color: '#ff3b5c' }}
          >
            <X className="w-4 h-4" /> Decline
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onAccept}
            className="flex-1 rounded-2xl py-4 flex items-center justify-center gap-2 font-bold text-sm"
            style={{ background: '#00d060', color: '#000', fontFamily: "'Dela Gothic One', sans-serif", fontSize: '18px' }}
          >
            <Check className="w-4 h-4" /> Accept
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}
