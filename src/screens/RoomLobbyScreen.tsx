import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Bell, ClipboardList, Copy, Crown, Hourglass, Link, LogOut, School, Zap } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { socketHandler } from '../socket/socketHandler';
import { apiClient } from '../api/client';
import { AvatarDisplay } from '../components/AvatarDisplay';
import { showToast } from '../components/toastStore';

/**
 * RoomLobbyScreen — classroom attendance register aesthetic.
 * Notice-board room code, student list, chalkboard start button.
 */
export function RoomLobbyScreen() {
  const room = useGameStore((s) => s.room);
  const session = useGameStore((s) => s.session);
  const [isLeaving, setIsLeaving] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const serverCountdown = room?.autoStartCountdown;
    if (serverCountdown != null && serverCountdown > 0) {
      setCountdown(serverCountdown);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c == null || c <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [room?.autoStartCountdown]);

  if (!room || !session) return null;

  const isHost = room.hostId === session.userId;

  const handleStartGame = () => {
    socketHandler.emit('start-game', { roomCode: room.roomCode });
  };

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(room.roomCode);
    showToast('Room code copied!', 'success');
  };

  const handleShareInvite = async () => {
    const inviteUrl = `${window.location.origin}/join/${encodeURIComponent(room.roomCode)}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Join my Tick Tick game',
          text: `Join my Tick Tick room with code ${room.roomCode}.`,
          url: inviteUrl,
        });
        return;
      }
      await navigator.clipboard.writeText(inviteUrl);
      showToast('Invite link copied!', 'success');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.error('[RoomLobby] Could not share invite link:', error);
      showToast('Could not share the invite link.', 'error');
    }
  };

  const handleLeave = useCallback(async () => {
    if (isLeaving) return;
    setIsLeaving(true);
    const currentSession = useGameStore.getState().session;
    try {
      await apiClient.leaveRoom(room.roomCode);
      useGameStore.getState().reset();
      if (currentSession) useGameStore.getState().setSession(currentSession);
    } catch (err) {
      console.warn('[RoomLobby] Leave room failed:', err);
      useGameStore.getState().reset();
      if (currentSession) useGameStore.getState().setSession(currentSession);
    }
  }, [room.roomCode, isLeaving]);

  return (
    <div
      className="flex-1 flex flex-col paper-body"
      data-testid="screen-room-lobby"
      
    >
      {/* Chalkboard header bar */}
      <div
        className="px-6 pt-4 pb-4 shrink-0"
      >
        <p className="label-section mb-1 text-chalk-white opacity-80 flex items-center gap-1.5">
          <School className="w-3.5 h-3.5" /> Waiting Room
        </p>
        <h2 className="font-display text-[36px] text-chalk-surface leading-none">
          Ready Up!
        </h2>

        {/* Room code — notice-board style */}
        {!room.isPublic && (
          <div className="mt-4">
            <div
              className="flex items-center justify-between p-4 rounded-2xl bg-chalk-board"
              // style={{
              //   background: '#f5f0e8',
              //   backgroundImage: `linear-gradient(to right, transparent 44px, rgba(192,57,43,0.2) 44px, rgba(192,57,43,0.2) 46px, transparent 46px), repeating-linear-gradient(transparent, transparent 27px, #d4c9b0 27px, #d4c9b0 28px)`,
              //   border: '2px solid #c8b89a',
              //   boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              // }}
            >
              <div>
                <p className="label-section mb-1 text-chalk-white">
                  Room Code — Share with classmates
                </p>
                <p className="font-display text-[38px] text-chalk-white  tracking-[0.12em] leading-none">
                  {room.roomCode}
                </p>
              </div>
              <button
                onClick={handleCopyCode}
                className="p-3 rounded-xl border transition-all active:scale-90 text-chalk-white border-[rgba(139,94,60,0.25)] bg-[rgba(139,94,60,0.1)]"
              >
                <Copy className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm mt-1.5 font-hand text-chalk-mark">
              {room.players.length}/8 students joined
            </p>
            <button
              onClick={handleShareInvite}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-bold font-hand text-chalk-mark"
              style={{ background: 'rgba(139,94,60,0.08)', borderColor: 'rgba(139,94,60,0.25)' }}
            >
              <Link className="h-4 w-4" aria-hidden="true" />
              Share invite link
            </button>
          </div>
        )}
        {room.isPublic && (
          <p className="text-sm mt-2 font-hand text-chalk-white">
            Quick Match · {room.players.length}/6 students
          </p>
        )}
      </div>

      {/* Student roster */}
      <div className="px-6 py-4 scrollbar-mobile-hidden">
        <p className="label-section mb-3 flex items-center gap-1.5">
          <ClipboardList className="w-3.5 h-3.5" /> Students Present
        </p>
        <div className="space-y-2">
          {room.players.map((p, i) => {
            const isYou = p.id === session.userId || p.userId === session.userId;
            const isPlayerHost = p.id === room.hostId || p.userId === room.hostId;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07, type: 'spring', bounce: 0, duration: 0.3 }}
                className="flex items-center gap-3 p-3.5 rounded-xl border"
                style={{
                  background: isYou ? 'rgba(107,68,35,0.08)' : 'rgba(139,94,60,0.06)',
                  borderColor: isYou ? 'rgba(107,68,35,0.35)' : '#c8b89a',
                }}
              >
                <span className="text-sm font-bold w-5 text-center shrink-0 font-hand text-desk">
                  {i + 1}.
                </span>
                <AvatarDisplay avatarId={p.avatarId} fallbackId={p.id} className="h-8 w-8 shrink-0 object-contain text-2xl" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate font-hand text-ink-dark">
                    {p.displayName}
                    {isYou && <span className="text-sm font-normal ml-1.5 text-chalk-mark">(you)</span>}
                  </p>
                  {isPlayerHost && (
                    <p className="text-sm flex items-center gap-1 font-hand text-school-amber">
                      <Crown className="w-2.5 h-2.5" /> Class Captain
                    </p>
                  )}
                </div>
                <div
                  className="w-2 h-2 rounded-full bg-chalk-mark"
                  style={{ boxShadow: '0 0 6px rgba(107,68,35,0.3)' }}
                />
              </motion.div>
            );
          })}
        </div>
        {room.players.length < 2 && (
          <p className="text-center text-sm mt-4 font-hand text-chalk-dim">
            Waiting for more students to join...
          </p>
        )}
      </div>

      {/* Action area */}
      <div className="px-6 pb-8 pb-safe pt-3 flex flex-col gap-2 shrink-0" style={{ borderTop: '1px solid #c8b89a' }}>
        {room.isPublic ? (
          <div
            className="rounded-2xl py-4 text-center border"
            style={{ background: 'rgba(139,94,60,0.07)', borderColor: '#c8b89a' }}
          >
            {countdown != null && countdown > 0 ? (
              <p className="font-bold font-hand text-[15px] text-school-amber flex items-center justify-center gap-1.5">
                <Bell className="w-4 h-4" /> Class starts in{' '}
                <span className="font-display text-[22px]">{countdown}</span>
              </p>
            ) : (
              <p className="text-sm font-hand text-chalk-board">
                Waiting for students... ({room.players.length}/6)
              </p>
            )}
          </div>
        ) : isHost ? (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleStartGame}
            disabled={room.players.length < 2}
            className="w-full rounded-2xl py-4 flex items-center justify-center gap-2 disabled:opacity-40 font-display text-[22px]"
            style={{
              background: room.players.length >= 2 ? '#6b4423' : 'rgba(139,94,60,0.12)',
              color: room.players.length >= 2 ? '#f5f0e8' : '#8b5e3c',
              boxShadow: room.players.length >= 2 ? '0 4px 16px rgba(107,68,35,0.28)' : 'none',
            }}
          >
            <Zap className="w-5 h-5" />
            {room.players.length < 2 ? 'Need 2+ Students' : 'Start Class!'}
          </motion.button>
        ) : (
          <div
            className="rounded-2xl py-4 text-center border"
            style={{ background: 'rgba(139,94,60,0.07)', borderColor: '#c8b89a' }}
          >
            <p className="text-sm font-hand text-chalk-board flex items-center justify-center gap-1.5">
              <Hourglass className="w-4 h-4" /> Waiting for the class captain to start...
            </p>
          </div>
        )}
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleLeave}
          disabled={isLeaving}
          className="w-full rounded-2xl py-3 flex items-center justify-center gap-2 border transition-all disabled:opacity-50 btn-danger"
        >
          <LogOut className="w-4 h-4" />
          {isLeaving ? 'Leaving...' : isHost ? 'Close Room' : 'Leave Room'}
        </motion.button>
      </div>
    </div>
  );
}
