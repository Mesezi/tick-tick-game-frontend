import { useCallback } from 'react';
import { motion } from 'motion/react';
import { Crown, RotateCcw, Share2, Trophy, Home } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { socketHandler } from '../socket/socketHandler';
import { getPlayerAvatar } from '../utils/avatarHelper';
import { showToast } from '../components/toastStore';

/**
 * MatchSummaryScreen - Exact replica of Game Screen Flow Design match summary.
 * Podium layout, final scores, rematch/share/leaderboard buttons.
 */
export function MatchSummaryScreen() {
  const matchResults = useGameStore((s) => s.matchResults);
  const session = useGameStore((s) => s.session);
  const room = useGameStore((s) => s.room);

  const roomCode = room?.roomCode ?? '';

  const handleRematch = useCallback(() => {
    if (!roomCode) {
      showToast('Room no longer available', 'error');
      return;
    }
    socketHandler.emit('request-rematch', { roomCode });
    showToast('Rematch request sent! 🔥', 'info');
  }, [roomCode]);

  const handleShare = useCallback(() => {
    showToast('Victory card ready! 🏆', 'success');
  }, []);

  const handleLeaderboard = useCallback(() => {
    useGameStore.getState().setMatchResults(null);
  }, []);

  const handleGoHome = useCallback(() => {
    const currentSession = useGameStore.getState().session;
    useGameStore.getState().reset();
    if (currentSession) {
      useGameStore.getState().setSession(currentSession);
    }
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

  // Get podium entries (1st, 2nd, 3rd)
  const first = podium.find((p) => p.rank === 1);
  const second = podium.find((p) => p.rank === 2);
  const third = podium.find((p) => p.rank === 3);

  const totalDurationStr = `${Math.round(matchResults.totalDuration / 60000)}:${String(
    Math.round((matchResults.totalDuration % 60000) / 1000)
  ).padStart(2, '0')}`;

  return (
    <div className="flex-1 flex flex-col overflow-hidden" data-testid="screen-match-summary">
      <div className="flex-1 overflow-auto"    style={{ scrollbarWidth: 'none' }}>
        <div className="px-6 pt-5 pb-3 mb-12 text-center">
        <p
          className="text-xs font-bold tracking-widest uppercase mb-1"
          style={{ color: '#6baf80' }}
        >
          Match Complete
        </p>
        <h2
          className="text-white mb-1"
          style={{
            fontFamily: "'Dela Gothic One', sans-serif",
            fontSize: '42px',
            lineHeight: 1,
          }}
        >
          GG! 🎉
        </h2>
        <p className="text-sm" style={{ color: '#6baf80' }}>
          {totalDurationStr} played
        </p>
      </div>

      {/* Podium */}
      <div className="px-6 mb-5">
        <div className="flex items-end justify-center gap-3 h-36">
          {/* 2nd place */}
          {second && (
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl">{getPlayerAvatar(second.avatarId, second.playerId)}</span>
              <p className="text-[10px] font-bold" style={{ color: '#6baf80' }}>
                {second.displayName.split('_')[0]}
              </p>
              <div
                className="w-20 rounded-t-xl flex flex-col items-center justify-end"
                style={{ height: '68px', background: '#1a3528' }}
              >
                <span
                  className="mb-1"
                  style={{
                    fontFamily: "'Dela Gothic One', sans-serif",
                    fontSize: '22px',
                    color: '#a0c8a8',
                  }}
                >
                  2
                </span>
                <p className="text-xs mb-2" style={{ color: '#6baf80' }}>
                  {second.totalScore}
                </p>
              </div>
            </div>
          )}

          {/* 1st place */}
          {first && (
            <div className="flex flex-col items-center gap-1">
              <Crown className="w-5 h-5" style={{ color: '#ffb800' }} />
              <span className="text-3xl">{getPlayerAvatar(first.avatarId, first.playerId)}</span>
              <p className="text-white text-[10px] font-bold">
                {first.displayName.split('_')[0]}
              </p>
              <div
                className="w-20 rounded-t-xl flex flex-col items-center justify-end border"
                style={{
                  height: '100px',
                  background: 'rgba(0,208,96,0.15)',
                  borderColor: 'rgba(0,208,96,0.3)',
                }}
              >
                <span
                  className="mb-1"
                  style={{
                    fontFamily: "'Dela Gothic One', sans-serif",
                    fontSize: '28px',
                    color: '#ffb800',
                  }}
                >
                  1
                </span>
                <p className="text-sm font-bold mb-2" style={{ color: '#00d060' }}>
                  {first.totalScore}
                </p>
              </div>
            </div>
          )}

          {/* 3rd place */}
          {third && (
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl">{getPlayerAvatar(third.avatarId, third.playerId)}</span>
              <p className="text-[10px] font-bold" style={{ color: '#6baf80' }}>
                {third.displayName.split('_')[0]}
              </p>
              <div
                className="w-20 rounded-t-xl flex flex-col items-center justify-end"
                style={{ height: '48px', background: '#1a3528' }}
              >
                <span
                  className="mb-1"
                  style={{
                    fontFamily: "'Dela Gothic One', sans-serif",
                    fontSize: '22px',
                    color: '#a0c8a8',
                  }}
                >
                  3
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Final scores */}
      <div
        className=" px-6"
        style={{ scrollbarWidth: 'none' }}
      >
        <p
          className="text-xs font-bold tracking-widest uppercase mb-2"
          style={{ color: '#a0c8a8' }}
        >
          Final Scores
        </p>
        <div className="space-y-2 mb-4">
          {sortedPlayers.map((p, i) => {
            const isYou = p.playerId === session.userId;
            return (
              <div
                key={p.playerId}
                className="flex items-center gap-3 p-3.5 rounded-xl border"
                style={{
                  background: isYou ? 'rgba(0,208,96,0.09)' : '#0d2018',
                  borderColor: isYou ? 'rgba(0,208,96,0.28)' : 'transparent',
                }}
              >
                <span
                  className="text-sm font-bold w-5 text-center"
                  style={{ color: '#3a5a45' }}
                >
                  {i + 1}
                </span>
                <span className="text-xl">{getPlayerAvatar(p.avatarId, p.playerId)}</span>
                <p className="flex-1 text-white text-sm font-bold">
                  {p.displayName}
                  {isYou && (
                    <span
                      className="text-xs font-normal ml-1"
                      style={{ color: '#00d060' }}
                    >
                      (you)
                    </span>
                  )}
                </p>
                <span
                  className="text-white"
                  style={{
                    fontFamily: "'Dela Gothic One', sans-serif",
                    fontSize: '18px',
                  }}
                >
                  {p.totalScore}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      </div>

    

      <div className="px-6 pb-8 pt-2 flex flex-col gap-2 shrink-0">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleRematch}
          className="w-full rounded-2xl py-4 text-black flex items-center justify-center gap-2"
          style={{
            background: '#00d060',
            fontFamily: "'Dela Gothic One', sans-serif",
            fontSize: '22px',
          }}
        >
          <RotateCcw className="w-5 h-5" /> Rematch
        </motion.button>
        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleShare}
            className="flex-1 rounded-xl py-3.5 text-white text-sm font-bold flex items-center justify-center gap-2 border"
            style={{
              background: '#0d2018',
              borderColor: '#1a3528',
            }}
          >
            <Share2 className="w-4 h-4" /> Share
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleLeaderboard}
            className="flex-1 rounded-xl py-3.5 text-white text-sm font-bold flex items-center justify-center gap-2 border"
            style={{
              background: '#0d2018',
              borderColor: '#1a3528',
            }}
          >
            <Trophy className="w-4 h-4" /> Leaderboard
          </motion.button>
        </div>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleGoHome}
          className="w-full rounded-xl py-3.5 text-white text-sm font-bold flex items-center justify-center gap-2 border"
          style={{
            background: '#0d2018',
            borderColor: '#1a3528',
          }}
        >
          <Home className="w-4 h-4" /> Home
        </motion.button>
      </div>
    </div>
  );
}
