import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { useGameStore } from '../store/gameStore';
import { useInfiniteLeaderboard } from '../api/queries';

interface LeaderboardEntry {
  id: string;
  displayName: string | null;
  type: 'REGISTERED' | 'GUEST';
  totalScore: number;
  weeklyScore: number;
}

export function LeaderboardScreen() {
  const session = useGameStore((s) => s.session);

  const [lbTab, setLbTab] = useState<'weekly' | 'alltime'>('weekly');
  const sentinelRef = useRef<HTMLDivElement>(null);

  const apiType = lbTab === 'alltime' ? 'all-time' as const : 'weekly' as const;
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteLeaderboard(apiType);

  const entries: LeaderboardEntry[] = (data?.pages.flatMap((p) => p.data.entries) ?? []) as LeaderboardEntry[];

  // Intersection observer — triggers next page fetch when sentinel scrolls into view
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden" data-testid="screen-leaderboard">
      <div className="px-6 pt-12 pb-4 shrink-0">
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
                  transition={{ delay: Math.min(i * 0.05, 0.5) }}
                  className="flex items-center gap-3 p-4 rounded-xl border"
                  style={{
                    background: isYou ? 'rgba(0,208,96,0.13)' : '#0d2018',
                    borderColor: isYou ? '#00d060' : 'transparent',
                    boxShadow: isYou ? '0 0 0 1px rgba(0,208,96,0.25), 0 4px 16px rgba(0,208,96,0.12)' : 'none',
                  }}
                >
                  <span
                    className="w-12 text-center"
                    style={{
                      fontFamily: rank <= 3 ? 'inherit' : "'Dela Gothic One', sans-serif",
                      fontSize: rank <= 3 ? '22px' : '18px',
                      color: isYou ? '#00d060' : '#3a5a45',
                    }}
                  >
                    {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank}
                  </span>
                  <span className="text-2xl">🎮</span>
                  <p
                    className="flex-1 text-sm font-bold"
                    style={{ color: isYou ? '#00d060' : 'white' }}
                  >
                    {entry.displayName || 'Anonymous'}
                    {isYou && (
                      <span
                        className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: 'rgba(0,208,96,0.2)', color: '#00d060' }}
                      >
                        you
                      </span>
                    )}
                  </p>
                  <span
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
    </div>
  );
}
