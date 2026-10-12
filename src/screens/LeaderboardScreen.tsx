import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { ClipboardList, Star, Trophy } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { useInfiniteLeaderboard } from '../api/queries';

interface LeaderboardEntry {
  id: string;
  displayName: string | null;
  type: 'REGISTERED' | 'GUEST';
  totalScore: number;
  weeklyScore: number;
}

/**
 * LeaderboardScreen — classroom honours board aesthetic.
 * Chalkboard background, exercise-book entry cards, chalk typography.
 */
export function LeaderboardScreen() {
  const session = useGameStore((s) => s.session);

  const [lbTab, setLbTab] = useState<'weekly' | 'alltime'>('alltime');
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

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (obs) => {
        if (obs[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden paper-body"
      data-testid="screen-leaderboard"
    >

      {/* Header */}
      <div
        className="px-6 pt-4 pb-4 shrink-0 bg-chalk-board"
      >
        <p className="text-[12px] font-bold tracking-[0.25em] uppercase mb-1 font-hand text-chalk-white flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5" /> Honours Board
        </p>
        <h2 className="font-display text-[36px] text-chalk-white leading-none">
          Leaderboard
        </h2>
      </div>

      {/* Tab switcher */}
      <div className="px-6 py-3 shrink-0">
        <div
          className="flex rounded-xl p-1 gap-1"
          style={{ background: 'rgba(139,94,60,0.12)', border: '1px solid #c8b89a' }}
        >
          {(['alltime'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setLbTab(t)}
              className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all font-hand text-[14px]"
              style={{
                background: lbTab === t ? '#6b4423' : 'transparent',
                color: lbTab === t ? '#f5f0e8' : '#6b4423',
                boxShadow: lbTab === t ? '0 2px 8px rgba(107,68,35,0.24)' : 'none',
              }}
            >
              {/* {t === 'weekly' ? 'This Week' : 'All Time'} */}
              All Time
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6" style={{ scrollbarWidth: 'none' }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm animate-pulse font-hand text-chalk-mark">
              Loading rankings...
            </p>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="w-10 h-10 mb-3 text-chalk-mark opacity-50" />
            <p className="text-sm text-center font-hand text-chalk-mark">
              No rankings yet. Be the first to play!
            </p>
          </div>
        ) : (
          <div className="space-y-2 pb-4">
            {entries.map((entry, i) => {
              const rank  = i + 1;
              const isYou = entry.id === session?.userId;
              const score = lbTab === 'weekly' ? entry.weeklyScore : entry.totalScore;

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.4), type: 'spring', bounce: 0, duration: 0.3 }}
                  className="flex items-center gap-3 p-3.5 rounded-xl border"
                  style={{
                    background: isYou ? 'rgba(139,94,60,0.1)' : '#f5f0e8',
                    backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, rgba(212,201,176,0.65) 27px, rgba(212,201,176,0.65) 28px)',
                    borderColor: isYou ? '#8b5e3c' : '#c8b89a',
                    boxShadow: isYou ? '0 0 0 1px rgba(139,94,60,0.2)' : 'none',
                  }}
                >
                  <span
                    className={`w-8 text-center shrink-0 text-chalk-mark ${rank > 3 ? 'font-display text-[14px]' : ''}`}
                  >
                    {rank <= 3 ? (
                      <span className={`font-display text-[13px] font-bold ${rank === 1 ? 'text-school-amber' : rank === 2 ? 'text-slate-400' : 'text-desk'}`}>
                        {rank === 1 ? '1st' : rank === 2 ? '2nd' : '3rd'}
                      </span>
                    ) : rank}
                  </span>

                  {/* Avatar initial */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold font-hand text-chalk-mark"
                    style={{
                      background: isYou ? 'rgba(139,94,60,0.14)' : '#ede8d8',
                      border: `1px solid ${isYou ? 'rgba(139,94,60,0.35)' : '#d4c9b0'}`,
                    }}
                  >
                    {entry.displayName ? entry.displayName.slice(0, 2).toUpperCase() : '??'}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-bold truncate font-hand ${isYou ? 'text-chalk-mark' : 'text-ink-dark'}`}
                    >
                      {entry.displayName || 'Anonymous'}
                      {isYou && (
                        <span
                          className="text-[12px] font-bold px-1.5 py-0.5 rounded-full ml-1.5 text-chalk-mark"
                          style={{ background: 'rgba(139,94,60,0.14)' }}
                        >
                          you
                        </span>
                      )}
                    </p>
                    <p className={`text-[12px] font-hand flex items-center gap-1 ${isYou ? 'text-chalk-mark' : 'text-desk'}`}>
                      {entry.type === 'REGISTERED' ? <><Star className="w-2.5 h-2.5 fill-current" /> Registered</> : 'Guest'}
                    </p>
                  </div>

                  {/* Score */}
                  <span
                    className={`font-display text-[18px] ${isYou ? 'text-chalk-mark' : 'text-ink-dark'}`}
                  >
                    {score.toLocaleString()}
                  </span>
                </motion.div>
              );
            })}

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="py-2 flex justify-center">
              {isFetchingNextPage && (
                <p className="text-sm animate-pulse font-hand text-chalk-mark">
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
