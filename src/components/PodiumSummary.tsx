import type { PodiumSummaryProps } from '../types';
import { AvatarDisplay } from './AvatarDisplay';
import { Crown, Medal } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * PodiumSummary — exercise-book podium with classroom colours.
 * 1st centre elevated with gold, 2nd left, 3rd right.
 */
export function PodiumSummary({ podium, currentPlayerId }: PodiumSummaryProps) {
  const sorted = [...podium].sort((a, b) => a.rank - b.rank);

  const getRankLabel = (rank: number): ReactNode => {
    switch (rank) {
      case 1: return <Crown className="w-4 h-4 text-school-amber" />;
      case 2: return <Medal className="w-4 h-4 text-slate-400" />;
      case 3: return <Medal className="w-4 h-4 text-desk" />;
      default: return `#${rank}`;
    }
  };

  const getPodiumStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          bg: 'rgba(217,119,6,0.15)',
          border: 'rgba(217,119,6,0.4)',
          color: '#d97706',
        };
      case 2:
        return {
          bg: 'rgba(107,68,35,0.1)',
          border: 'rgba(107,68,35,0.25)',
          color: '#6b4423',
        };
      default:
        return {
          bg: 'rgba(107,68,35,0.07)',
          border: 'rgba(107,68,35,0.15)',
          color: '#8b5e3c',
        };
    }
  };

  const top3 = sorted.filter((p) => p.rank <= 3);
  const rest = sorted.filter((p) => p.rank > 3);

  // Podium visual order: 2nd · 1st · 3rd
  const podiumOrder = [
    top3.find((p) => p.rank === 2),
    top3.find((p) => p.rank === 1),
    top3.find((p) => p.rank === 3),
  ].filter(Boolean);

  return (
    <div className="w-full max-w-md mx-auto px-4">
      {/* Top-3 podium */}
      {podiumOrder.length > 0 && (
        <div className="flex items-end justify-center gap-3 mb-5">
          {podiumOrder.map((player) => {
            if (!player) return null;
            const isMe = player.playerId === currentPlayerId;
            const isFirst = player.rank === 1;
            const style = getPodiumStyle(player.rank);

            return (
              <div
                key={player.playerId}
                className={`flex flex-col items-center ${isFirst ? 'mb-3' : ''}`}
              >
                {/* Avatar */}
                <div
                  style={{
                    outline: isMe ? '2px solid #8b5e3c' : 'none',
                    outlineOffset: '2px',
                    borderRadius: '50%',
                  }}
                >
                  <AvatarDisplay avatarId={player.avatarId} fallbackId={player.playerId} className={`object-contain ${isFirst ? 'h-16 w-16 text-5xl' : 'h-12 w-12 text-4xl'}`} />
                </div>

                {/* Name */}
                <span
                  className={`mt-2 text-sm font-bold text-center truncate max-w-20 font-hand ${isMe ? 'text-desk' : 'text-chalk-white'}`}
                >
                  {player.displayName}
                </span>

                {/* Score */}
                <span
                  className="font-bold text-sm mt-0.5 tabular-nums font-display"
                  style={{ color: isMe ? '#8b5e3c' : style.color }}
                >
                  {player.totalScore}
                </span>

                {/* Podium block */}
                <div
                  className="w-20 rounded-t-xl flex items-center justify-center mt-1"
                  style={{
                    height: isFirst ? '80px' : player.rank === 2 ? '56px' : '40px',
                    background: style.bg,
                    border: `1.5px solid ${style.border}`,
                  }}
                >
                  <span
                    className="font-display leading-none"
                    style={{
                      fontSize: isFirst ? '28px' : '22px',
                      color: style.color,
                    }}
                  >
                    {player.rank}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Remaining players */}
      {rest.length > 0 && (
        <div className="flex flex-col gap-2">
          {rest.map((player) => {
            const isMe = player.playerId === currentPlayerId;
            return (
              <div
                key={player.playerId}
                className="flex items-center gap-3 p-3 rounded-xl border"
                style={{
                  background: isMe ? 'rgba(107,68,35,0.1)' : '#4a3520',
                  borderColor: '#6b4423',
                }}
              >
                <span className="text-lg shrink-0 w-8 flex items-center justify-center" aria-hidden="true">
                  {getRankLabel(player.rank)}
                </span>
                <AvatarDisplay avatarId={player.avatarId} fallbackId={player.playerId} className="h-9 w-9 shrink-0 object-contain text-2xl" />
                <span
                  className={`flex-1 font-semibold truncate font-hand ${isMe ? 'text-desk' : 'text-chalk-white'}`}
                >
                  {player.displayName}
                </span>
                <span
                  className={`shrink-0 text-sm font-bold tabular-nums font-display ${isMe ? 'text-desk' : 'text-chalk-white'}`}
                >
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
