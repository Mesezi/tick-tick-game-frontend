import { useState, useEffect, useRef } from 'react';
import type { RoundResultsCardProps, PlayerRoundResult } from '../types';

/**
 * Dark themed results display with green for correct, orange for wrong.
 */
export function RoundResultsCard({ results, currentPlayerId, roundNumber, letter }: RoundResultsCardProps) {
  const [view, setView] = useState<'answers' | 'ranking'>('answers');
  const prevRankingsRef = useRef<Map<string, number>>(new Map());

  // Auto-switch to ranking after 8 seconds
  useEffect(() => {
    if (view === 'answers') {
      const timer = setTimeout(() => setView('ranking'), 8000);
      return () => clearTimeout(timer);
    }
  }, [view]);

  // Track previous rankings for movement indicators
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
        <h2 className="text-2xl font-bold text-white">
          Round {roundNumber} — <span className="text-[#00ff88]">{letter.toUpperCase()}</span>
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
              className="w-full py-3 rounded-lg bg-[#00ff88] text-[#0a1a0f] font-bold text-sm hover:bg-[#00dd77] active:scale-95 transition-all uppercase"
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

/**
 * Dark table with green/orange indicators.
 */
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
  const others = results.filter((p) => p.playerId !== currentPlayerId).sort((a, b) => b.roundScore - a.roundScore);
  const ordered = myResult ? [myResult, ...others] : others;

  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-[#2a4a32]">
            <th className="text-left py-2 pr-2 font-semibold text-[#5a7a5a] text-xs uppercase tracking-wide sticky left-0 bg-[#0a1a0f]">
              Player
            </th>
            {categories.map((cat) => (
              <th key={cat} className="text-left py-2 px-2 font-semibold text-[#5a7a5a] text-xs uppercase tracking-wide whitespace-nowrap">
                {cat}
              </th>
            ))}
            <th className="text-right py-2 pl-2 font-semibold text-[#5a7a5a] text-xs uppercase tracking-wide">
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
                className={`border-b border-[#2a4a32]/50 ${isMe ? 'bg-[#0f2518]' : ''}`}
              >
                <td className="py-2.5 pr-2 sticky left-0 bg-inherit">
                  <span className={`font-medium ${isMe ? 'text-[#00ff88]' : 'text-white'}`}>
                    {player.displayName}
                    {isMe && <span className="text-[#5a7a5a] text-xs ml-1">(you)</span>}
                  </span>
                </td>
                {categories.map((cat) => {
                  const answer = answerMap.get(cat);
                  if (!answer) {
                    return (
                      <td key={cat} className="py-2.5 px-2 text-[#5a7a5a]">—</td>
                    );
                  }

                  const isValid = answer.isValid && answer.score > 0;

                  return (
                    <td key={cat} className="py-2.5 px-2">
                      <div className="flex items-center gap-1">
                        <span className={`text-xs ${isValid ? 'text-[#00ff88]' : 'text-[#FF6B35]'}`}>
                          {isValid ? '✓' : '✗'}
                        </span>
                        <span className={`truncate max-w-20 ${
                          !answer.rawAnswer ? 'text-[#5a7a5a] italic' : 'text-white'
                        }`}>
                          {answer.rawAnswer || '—'}
                        </span>
                        {answer.isDuplicate && (
                          <span className="text-[#FF6B35] text-xs" title="Duplicate">D</span>
                        )}
                      </div>
                    </td>
                  );
                })}
                <td className="py-2.5 pl-2 text-right">
                  <span className="font-bold text-[#00ff88] tabular-nums">
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

/**
 * Dark ranking view with movement indicators.
 */
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
            className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
              isMe ? 'bg-[#0f2518] border border-[#00ff88]' : 'bg-[#1a2e1f] border border-[#2a4a32]'
            }`}
          >
            {/* Rank */}
            <span className="text-lg font-bold text-[#5a7a5a] w-8 text-center tabular-nums">
              {rank}
            </span>

            {/* Movement indicator */}
            <span className="w-5 text-center text-xs">
              {movement > 0 && <span className="text-[#00ff88]">▲{movement}</span>}
              {movement < 0 && <span className="text-[#FF6B35]">▼{Math.abs(movement)}</span>}
              {movement === 0 && <span className="text-[#5a7a5a]">—</span>}
            </span>

            {/* Name */}
            <span className={`flex-1 font-semibold truncate ${isMe ? 'text-[#00ff88]' : 'text-white'}`}>
              {player.displayName}
              {isMe && <span className="text-[#5a7a5a] font-normal ml-1">(you)</span>}
            </span>

            {/* Scores */}
            <div className="text-right shrink-0 flex items-center gap-2">
              <span className="text-xs text-[#00ff88] font-medium tabular-nums">
                +{player.roundScore}
              </span>
              <span className="text-lg font-bold text-white tabular-nums">
                {player.totalScore}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
