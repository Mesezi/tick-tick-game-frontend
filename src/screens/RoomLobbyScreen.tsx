import { motion } from 'motion/react';
import { Copy, Zap, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { useGameStore } from '../store/gameStore';
import { socketHandler } from '../socket/socketHandler';
import { getPlayerAvatar } from '../utils/avatarHelper';

/**
 * RoomLobbyScreen - Exact replica of Game Screen Flow Design room-lobby.
 * Room code card, player list with animated entries, Start Game CTA.
 */
export function RoomLobbyScreen() {
  const room = useGameStore((s) => s.room);
  const session = useGameStore((s) => s.session);

  if (!room || !session) {
    return null;
  }

  const isHost = room.hostId === session.userId;

  const handleStartGame = () => {
    socketHandler.emit('start-game', { roomCode: room.roomCode });
  };

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(room.roomCode);
    toast.success('Room code copied!');
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" data-testid="screen-room-lobby">
      <div className="px-6 pt-12 pb-4">
        <p
          className="text-xs font-bold tracking-widest uppercase mb-1"
          style={{ color: '#6baf80' }}
        >
          Waiting Room
        </p>
        <h2
          className="text-white mb-5"
          style={{
            fontFamily: "'Dela Gothic One', sans-serif",
            fontSize: '38px',
            lineHeight: 1,
          }}
        >
          Ready Up!
        </h2>

        {/* Room code card */}
        <div
          className="flex items-center justify-between p-4 rounded-2xl mb-2 border"
          style={{ background: '#0d2018', borderColor: '#1a3528' }}
        >
          <div>
            <p
              className="text-[10px] font-bold tracking-widest uppercase mb-1"
              style={{ color: '#6baf80' }}
            >
              Room Code
            </p>
            <p
              className="tracking-[0.15em]"
              style={{
                fontFamily: "'Dela Gothic One', sans-serif",
                fontSize: '38px',
                color: '#ffb800',
                lineHeight: 1,
              }}
            >
              {room.roomCode}
            </p>
          </div>
          <button
            onClick={handleCopyCode}
            className="p-3 rounded-xl border transition-all active:scale-95"
            style={{
              background: 'rgba(255,184,0,0.12)',
              borderColor: 'rgba(255,184,0,0.25)',
              color: '#ffb800',
            }}
          >
            <Copy className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs mb-5" style={{ color: '#2a4a33' }}>
          Share with friends · {room.players.length}/8 players joined
        </p>
      </div>

      <div
        className="flex-1 overflow-y-auto px-6"
        style={{ scrollbarWidth: 'none' }}
      >
        <p
          className="text-xs font-bold tracking-widest uppercase mb-3"
          style={{ color: '#a0c8a8' }}
        >
          Players
        </p>
        <div className="space-y-2">
          {room.players.map((p, i) => {
            const isYou = p.id === session.userId;
            const isPlayerHost = p.id === room.hostId;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: -18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center gap-3 p-3.5 rounded-xl border"
                style={{
                  background: isYou
                    ? 'rgba(0,208,96,0.09)'
                    : '#0d2018',
                  borderColor: isYou
                    ? 'rgba(0,208,96,0.28)'
                    : 'transparent',
                }}
              >
                <span className="text-2xl">{getPlayerAvatar(p.avatarId, p.id)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-bold truncate">
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
                  {isPlayerHost && (
                    <p
                      className="text-xs flex items-center gap-1"
                      style={{ color: '#ffb800' }}
                    >
                      <Crown className="w-2.5 h-2.5" /> Host
                    </p>
                  )}
                </div>
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: '#00d060' }}
                />
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="px-6 pb-8 pt-4">
        {isHost ? (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleStartGame}
            disabled={room.players.length < 2}
            className="w-full rounded-2xl py-4 text-black flex items-center justify-center gap-2 disabled:opacity-40"
            style={{
              background: room.players.length >= 2 ? '#00d060' : '#122318',
              fontFamily: "'Dela Gothic One', sans-serif",
              fontSize: '22px',
              color: room.players.length >= 2 ? '#000' : '#2a4a33',
            }}
          >
            <Zap className="w-5 h-5" /> {room.players.length < 2 ? 'Need 2+ Players' : 'Start Game'}
          </motion.button>
        ) : (
          <div
            className="rounded-2xl py-4 text-center"
            style={{ background: '#0d2018' }}
          >
            <p className="text-sm" style={{ color: '#6baf80' }}>
              Waiting for host to start...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
