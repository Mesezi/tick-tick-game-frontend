import { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { useGameStore } from '../store/gameStore';
import { useLeaderboard } from '../api/queries';

interface LeaderboardEntry {
  id: string;
  displayName: string | null;
  type: 'REGISTERED' | 'GUEST';
  totalScore: number;
  weeklyScore: number;
}

/**
 * LeaderboardScreen - Exact replica of Game Screen Flow Design leaderboard.
 * Pill tab switcher, ranked player cards with medals, Play Again CTA.
 */
export function LeaderboardScreen() {
  const session = useGameStore((s) => s.session);
  const reset = useGameStore((s) => s.reset);

  const [lbTab, setLbTab] = useState<'weekly' | 'alltime'>('weekly');

  const apiType = lbTab === 'alltime' ? 'all-time' as const : 'weekly' as const;
  const { data, isLoading } = useLeaderboard(apiType, 1, 20);
  const entries: LeaderboardEntry[] = (data?.data.entries ?? []) as LeaderboardEntry[];

  const handlePlayAgain = useCallback(() => {
    const currentSession = useGameStore.getState().session;
    reset();
    if (currentSession) {
      useGameStore.getState().setSession(currentSession);
    }
  }, [reset]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden" data-testid="screen-leaderboard">
      <div className="px-6 pt-8 pb-4 shrink-0">
        <p
          className="text-xs font-bold tracking-widest uppercase mb-1"
          style={{ color: '#6baf80' }}
        >
          Global
        </p>
        <h2
          className="text-white"
          style={{
            fontFamily: "'Dela Gothic One', sans-serif",
            fontSize: '38px',
            lineHeight: 1,
          }}
        >
          Leaderboard
        </h2>
      </div>

      <div className="px-6 mb-4 shrink-0">
        <div
          className="flex rounded-xl p-1 gap-1"
          style={{ background: '#0d2018' }}
        >
          {(['weekly', 'alltime'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setLbTab(t)}
              className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all"
              style={{
                background: lbTab === t ? '#00d060' : 'transparent',
                color: lbTab === t ? '#000' : '#6baf80',
              }}
            >
              {t === 'weekly' ? 'This Week' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto px-6"
        style={{ scrollbarWidth: 'none' }}
      >
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
              No rankings yet. Play more games to appear here!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, i) => {
              const rank = i + 1;
              const isYou = entry.id === session?.userId;
              const score = lbTab === 'weekly' ? entry.weeklyScore : entry.totalScore;
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 p-4 rounded-xl border"
                  style={{
                    background: isYou ? 'rgba(0,208,96,0.09)' : '#0d2018',
                    borderColor: isYou ? 'rgba(0,208,96,0.28)' : 'transparent',
                  }}
                >
                  <span
                    className="w-8 text-center"
                    style={{
                      fontFamily:
                        rank <= 3 ? 'inherit' : "'Dela Gothic One', sans-serif",
                      fontSize: rank <= 3 ? '22px' : '18px',
                      color: '#3a5a45',
                    }}
                  >
                    {rank <= 3
                      ? ['🥇', '🥈', '🥉'][rank - 1]
                      : rank}
                  </span>
                  <span className="text-2xl">🎮</span>
                  <p className="flex-1 text-white text-sm font-bold">
                    {entry.displayName || 'Anonymous'}
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
                    {score.toLocaleString()}
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <div className="px-6 pb-8 pt-4 shrink-0">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handlePlayAgain}
          className="w-full rounded-2xl py-4 text-black"
          style={{
            background: '#00d060',
            fontFamily: "'Dela Gothic One', sans-serif",
            fontSize: '22px',
          }}
        >
          Play Again
        </motion.button>
      </div>
    </div>
  );
}
