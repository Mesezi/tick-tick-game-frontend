import type { PodiumSummaryProps } from '../types';
import { PlayerAvatar } from './PlayerAvatar';

/**
 * Podium style layout: 1st center elevated, 2nd left, 3rd right.
 * Gold/silver/bronze circles on avatars.
 */
export function PodiumSummary({ podium, currentPlayerId }: PodiumSummaryProps) {
  const sorted = [...podium].sort((a, b) => a.rank - b.rank);

  const getMedalColor = (rank: number): string => {
    switch (rank) {
      case 1: return '#FFD700';
      case 2: return '#C0C0C0';
      case 3: return '#CD7F32';
      default: return '#5a7a5a';
    }
  };

  const getMedalEmoji = (rank: number): string => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  // For podium layout: show top 3 in podium style, rest in list
  const top3 = sorted.filter((p) => p.rank <= 3);
  const rest = sorted.filter((p) => p.rank > 3);

  // Reorder for visual podium: 2nd, 1st, 3rd
  const podiumOrder = [
    top3.find((p) => p.rank === 2),
    top3.find((p) => p.rank === 1),
    top3.find((p) => p.rank === 3),
  ].filter(Boolean);

  return (
    <div className="w-full max-w-md mx-auto px-4">
      {/* Podium layout for top 3 */}
      {podiumOrder.length > 0 && (
        <div className="flex items-end justify-center gap-4 mb-6">
          {podiumOrder.map((player) => {
            if (!player) return null;
            const isCurrentPlayer = player.playerId === currentPlayerId;
            const isFirst = player.rank === 1;

            return (
              <div
                key={player.playerId}
                className={`flex flex-col items-center ${isFirst ? 'mb-4' : ''}`}
              >
                {/* Medal badge */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-2"
                  style={{ backgroundColor: getMedalColor(player.rank), color: player.rank === 1 ? '#0a1a0f' : '#fff' }}
                >
                  {player.rank}
                </div>

                {/* Avatar */}
                <div className={`relative ${isCurrentPlayer ? 'ring-2 ring-[#00ff88] rounded-full' : ''}`}>
                  <PlayerAvatar avatarKey={player.playerId} size={isFirst ? 64 : 48} />
                </div>

                {/* Name */}
                <span className={`mt-2 text-xs font-bold text-center truncate max-w-[80px] ${
                  isCurrentPlayer ? 'text-[#00ff88]' : 'text-white'
                }`}>
                  {player.displayName}
                </span>

                {/* Score */}
                <span className="text-[#00ff88] font-bold text-sm mt-1 tabular-nums">
                  {player.totalScore}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Remaining players in list */}
      {rest.length > 0 && (
        <div className="flex flex-col gap-2">
          {rest.map((player) => {
            const isCurrentPlayer = player.playerId === currentPlayerId;

            return (
              <div
                key={player.playerId}
                className={`flex items-center gap-3 p-3 rounded-xl border ${
                  isCurrentPlayer ? 'border-[#00ff88] bg-[#0f2518]' : 'border-[#2a4a32] bg-[#1a2e1f]'
                }`}
              >
                <span className="text-lg shrink-0 w-8 text-center" aria-hidden="true">
                  {getMedalEmoji(player.rank)}
                </span>
                <PlayerAvatar avatarKey={player.playerId} size={36} />
                <span className={`flex-1 font-semibold truncate ${isCurrentPlayer ? 'text-[#00ff88]' : 'text-white'}`}>
                  {player.displayName}
                </span>
                <span className="shrink-0 text-sm font-bold text-[#00ff88] tabular-nums">
                  {player.totalScore}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
