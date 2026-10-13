import { useState, useEffect, useRef } from 'react';
import type { RoundResultsCardProps, PlayerRoundResult } from '../types';

/**
 * RoundResultsCard — exercise-book results marking style.
 * Teacher mark colours: brown (✓), amber (~), red (✗).
 */
export function RoundResultsCard({ results, currentPlayerId, roundNumber, letter }: RoundResultsCardProps) {
  const [view, setView] = useState<'answers' | 'ranking'>('answers');
  const prevRankingsRef = useRef<Map<string, number>>(new Map());

  // Auto-switch to ranking after 8s
  useEffect(() => {
    if (view === 'answers') {
      const timer = setTimeout(() => setView('ranking'), 8000);
      return () => clearTimeout(timer);
    }
  }, [view]);

  useEffect(() => {
    const currentRankings = new Map<string, number>();
    [...results]
      .sort((a, b) => b.totalScore - b.roundScore - (a.totalScore - a.roundScore))
      .forEach((p, i) => currentRankings.set(p.playerId, i + 1));
    prevRankingsRef.current = currentRankings;
  }, [roundNumber]);

  const categories = results.length > 0
    ? results[0].answers.map((a) => a.category)
    : [];

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-4">
      {/* Round header */}
      <div className="text-center mb-4">
        <h2 className="font-display text-[22px] text-chalk-white">
          Round {roundNumber} —{' '}
          <span className="text-school-amber">{letter.toUpperCase()}</span>
        </h2>
      </div>

      {view === 'answers' ? (
        <>
          <AnswersTable
            results={results}
            categories={categories}
            currentPlayerId={currentPlayerId}
          />
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setView('ranking')}
              className="w-full py-3 rounded-xl font-bold text-sm active:scale-95 transition-all uppercase btn-primary font-hand"
              style={{ boxShadow: '0 4px 12px rgba(107,68,35,0.28)' }}
            >
              View Ranking →
            </button>
          </div>
        </>
      ) : (
        <RankingView
          results={results}
          currentPlayerId={currentPlayerId}
          prevRankings={prevRankingsRef.current}
        />
      )}
    </div>
  );
}

function AnswersTable({
  results,
  categories,
  currentPlayerId,
}: {
  results: PlayerRoundResult[];
  categories: string[];
  currentPlayerId: string;
}) {
  const myResult = results.find((p) => p.playerId === currentPlayerId);
  const others = results
    .filter((p) => p.playerId !== currentPlayerId)
    .sort((a, b) => b.roundScore - a.roundScore);
  const ordered = myResult ? [myResult, ...others] : others;

  return (
    <div
      className="overflow-x-auto -mx-4 px-4 rounded-xl"
      style={{
        background: '#f5f0e8',
        // backgroundImage: `repeating-linear-gradient(transparent, transparent 31px, #d4c9b0 31px, #d4c9b0 32px)`,
        border: '2px solid #c8b89a',
      }}
    >
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr style={{ borderBottom: '2px solid #c8b89a' }}>
            <th className="text-left py-2 pr-2 sticky left-0 text-sm uppercase tracking-wide font-hand text-chalk-mark bg-paper">
              Player
            </th>
            {categories.map((cat) => (
              <th
                key={cat}
                className="text-left py-2 px-2 text-sm uppercase tracking-wide whitespace-nowrap font-hand text-chalk-mark"
              >
                {cat}
              </th>
            ))}
            <th className="text-right py-2 pl-2 text-sm uppercase tracking-wide font-hand text-chalk-mark">
              Pts
            </th>
          </tr>
        </thead>
        <tbody>
          {ordered.map((player) => {
            const isMe = player.playerId === currentPlayerId;
            const answerMap = new Map(player.answers.map((a) => [a.category, a]));

            return (
              <tr
                key={player.playerId}
                style={{
                  borderBottom: '1px solid #d4c9b0',
                  background: isMe ? 'rgba(107,68,35,0.08)' : 'transparent',
                }}
              >
                <td className="py-2.5 pr-2 sticky left-0" style={{ background: 'inherit' }}>
                  <span
                    className={`font-medium font-hand ${isMe ? 'text-chalk-mark' : 'text-ink-dark'}`}
                  >
                    {player.displayName}
                    {isMe && (
                      <span className="text-sm ml-1 text-chalk-mark">(you)</span>
                    )}
                  </span>
                </td>
                {categories.map((cat) => {
                  const answer = answerMap.get(cat);
                  if (!answer) {
                    return (
                      <td key={cat} className="py-2.5 px-2 text-paper-ruled">—</td>
                    );
                  }
                  const isValid = answer.isValid && answer.score > 0;

                  return (
                    <td key={cat} className="py-2.5 px-2">
                      <div className="flex items-center gap-1">
                        <span
                          className="font-script text-[14px]"
                          style={{ color: isValid ? '#6b4423' : '#c0392b' }}
                        >
                          {isValid ? '✓' : '✗'}
                        </span>
                        <span
                          className={`truncate max-w-20 font-hand ${!answer.rawAnswer ? 'text-paper-ruled italic' : 'text-ink-dark'}`}
                        >
                          {answer.rawAnswer || '—'}
                        </span>
                        {answer.isDuplicate && (
                          <span className="text-sm text-school-amber">D</span>
                        )}
                      </div>
                    </td>
                  );
                })}
                <td className="py-2.5 pl-2 text-right">
                  <span className="font-bold tabular-nums font-script text-[16px] text-chalk-mark">
                    {player.roundScore}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RankingView({
  results,
  currentPlayerId,
  prevRankings,
}: {
  results: PlayerRoundResult[];
  currentPlayerId: string;
  prevRankings: Map<string, number>;
}) {
  const sorted = [...results].sort((a, b) => b.totalScore - a.totalScore);

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((player, index) => {
        const isMe = player.playerId === currentPlayerId;
        const rank = index + 1;
        const prevRank = prevRankings.get(player.playerId);
        const movement = prevRank != null ? prevRank - rank : 0;

        return (
          <div
            key={player.playerId}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border"
            style={{
              background: isMe ? 'rgba(107,68,35,0.1)' : '#4a3520',
              borderColor: '#6b4423',
            }}
          >
            {/* Rank */}
            <span className="text-lg font-bold w-8 text-center tabular-nums font-display text-desk">
              {rank}
            </span>

            {/* Movement indicator */}
            <span className="w-5 text-center text-sm">
              {movement > 0 && (
                <span className="font-hand text-chalk-mark">▲{movement}</span>
              )}
              {movement < 0 && (
                <span className="font-hand text-school-red">▼{Math.abs(movement)}</span>
              )}
              {movement === 0 && (
                <span className="text-chalk-mark">—</span>
              )}
            </span>

            {/* Name */}
            <span className={`flex-1 font-semibold truncate font-hand ${isMe ? 'text-desk' : 'text-chalk-white'}`}>
              {player.displayName}
              {isMe && (
                <span className="font-normal ml-1 text-chalk-mark">(you)</span>
              )}
            </span>

            {/* Scores */}
            <div className="text-right shrink-0 flex items-center gap-2">
              <span className="text-sm font-medium tabular-nums font-hand text-desk">
                +{player.roundScore}
              </span>
              <span
                className={`text-lg font-bold tabular-nums font-display ${isMe ? 'text-desk' : 'text-chalk-white'}`}
              >
                {player.totalScore}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
