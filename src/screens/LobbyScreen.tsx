import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { BookOpen, CheckCircle, KeyRound, Pencil, PenLine, Users, Zap } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { AvatarDisplay } from '../components/AvatarDisplay';
import { socketHandler } from '../socket/socketHandler';
import { apiClient } from '../api/client';
import { useCategoryPacks } from '../api/queries';
import { showToast } from '../components/toastStore';
import { track } from '../utils/analytics';

interface CategoryPack {
  id: string;
  name: string;
  description: string;
  categories: string[];
  createdAt: string;
}

/**
 * LobbyScreen — classroom notice-board aesthetic.
 * Exercise-book panels, chalkboard headings, warm wood accents.
 */
export function LobbyScreen() {
  const session = useGameStore((s) => s.session);
  const onlineCount = useGameStore((s) => s.onlineCount);
  const [lobbyTab, setLobbyTab] = useState<'create' | 'join'>('create');
  const [selectedPackId, setSelectedPackId] = useState('');
  const [rounds, setRounds] = useState(3);
  const [joinCode, setJoinCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isQuickMatching, setIsQuickMatching] = useState(false);

  const { data: packsData, isLoading: packsLoading } = useCategoryPacks();
  const packs: CategoryPack[] = packsData?.data.packs ?? [];

  useEffect(() => {
    if (packs.length > 0 && !selectedPackId) {
      setSelectedPackId(packs[0].id);
    }
  }, [packs, selectedPackId]);

  const handleCreate = async () => {
    if (!selectedPackId || !session?.displayName) return;
    setIsLoading(true);
    try {
      const res = await apiClient.createRoom({
        categoryPackId: selectedPackId,
        roundDuration: 90,
        totalRounds: rounds,
        displayName: session.displayName,
      });
      const roomCode = res.data.room.code;
      socketHandler.emit('join-room', { roomCode });
      setTimeout(() => {
        if (!useGameStore.getState().room) {
          setIsLoading(false);
          showToast('Connection timed out. Try again.', 'error');
        }
      }, 10000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create room';
      showToast(message, 'error');
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode || !session?.displayName) return;
    setIsLoading(true);
    try {
      await apiClient.joinRoom(joinCode, session.displayName);
      socketHandler.emit('join-room', { roomCode: joinCode });
      setTimeout(() => {
        if (!useGameStore.getState().room) {
          setIsLoading(false);
          showToast('Connection timed out. Try again.', 'error');
        }
      }, 10000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to join room';
      showToast(message, 'error');
      setIsLoading(false);
    }
  };

  const handleAction = () => {
    showToast('Connecting...', 'info');
    if (lobbyTab === 'create') handleCreate();
    else handleJoin();
  };

  const handleQuickMatch = async () => {
    if (!session?.displayName) return;
    setIsQuickMatching(true);
    try {
      const res = await apiClient.quickMatch(session.displayName);
      const roomCode = res.data.room.code;
      socketHandler.emit('join-room', { roomCode });
      track('quick_match_started');
      setTimeout(() => {
        if (!useGameStore.getState().room) {
          setIsQuickMatching(false);
          showToast('Connection timed out. Try again.', 'error');
        }
      }, 10000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Quick match failed';
      showToast(message, 'error');
      setIsQuickMatching(false);
    }
  };

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden paper-body"
      data-testid="screen-lobby"
    >
      {/* Chalkboard header bar — compact */}
      <div
        className="px-5 pt-4 pb-3 shrink-0"
        style={{ borderBottom: '2px solid rgba(107,68,35,0.6)' }}
      >
        <div className="flex items-center gap-2.5">
          <AvatarDisplay avatarId={session?.avatarId} className="h-8 w-8 shrink-0 object-contain text-2xl" />
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-[22px] leading-tight">
              Game Lobby
            </h2>
            <p className="text-sm truncate font-hand label-section" >
              {session?.displayName || 'Player'} · Ready to compete
            </p>
          </div>
          {onlineCount != null && onlineCount >= 3 && (
            <p className="shrink-0 flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-bold font-hand text-chalk-white" role="status">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {onlineCount} online
            </p>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-5 py-3" style={{ scrollbarWidth: 'none' }}>
        {/* Quick Match */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleQuickMatch}
          disabled={isQuickMatching || isLoading}
          className="w-full rounded-xl py-3 mb-3 hidden items-center justify-center gap-2 disabled:opacity-60 btn-primary font-display text-[17px]"
          style={{ boxShadow: '0 3px 14px rgba(107,68,35,0.28), inset 0 1px 0 rgba(255,255,255,0.1)' }}
        >
          <Zap className="w-4 h-4" />
          {isQuickMatching ? 'Finding match...' : 'Quick Match'}
        </motion.button>

        {/* Divider */}
        <div className="hidden items-center gap-2 mb-3">
          <div className="flex-1 border-t border-dashed border-paper-ruled" />
          <span className="text-[11px] font-bold uppercase tracking-widest font-hand text-desk">
            or set up your own
          </span>
          <div className="flex-1 border-t border-dashed border-paper-ruled" />
        </div>

        {/* Tab switcher */}
        <div className="mb-4">
          <div
            className="flex rounded-xl p-1 gap-1"
            style={{ background: 'rgba(139,94,60,0.12)', border: '1px solid #c8b89a' }}
          >
            {(['create', 'join'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setLobbyTab(t)}
                className="flex-1 py-2 rounded-lg text-sm font-bold transition-all font-hand text-[14px] flex items-center justify-center gap-1.5"
                style={{
                  background: lobbyTab === t ? '#6b4423' : 'transparent',
                  color: lobbyTab === t ? '#f5f0e8' : '#6b4423',
                }}
              >
                {t === 'create' ? <><Pencil className="w-3.5 h-3.5" /> Create Room</> : <><KeyRound className="w-3.5 h-3.5" /> Join Room</>}
              </button>
            ))}
          </div>
        </div>

        {lobbyTab === 'create' ? (
          <div className="space-y-4">
            {/* Category pack */}
            <div>
              <p className="label-section mb-2 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> Category Pack
              </p>
              <div className="space-y-1.5">
                {packsLoading ? (
                  <>
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="w-full p-3 rounded-xl border animate-pulse"
                        style={{ background: 'rgba(139,94,60,0.08)', borderColor: '#c8b89a' }}
                      >
                        <div className="h-4 rounded mb-1.5 w-2/3 bg-paper-line" />
                        <div className="h-3 rounded w-1/2 bg-paper-line" />
                      </div>
                    ))}
                  </>
                ) : (
                  packs.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPackId(p.id)}
                      className="w-full flex items-center justify-between p-3 rounded-xl border transition-all"
                      style={{
                        background: selectedPackId === p.id ? 'rgba(107,68,35,0.1)' : 'rgba(139,94,60,0.06)',
                        borderColor: selectedPackId === p.id ? '#6b4423' : '#c8b89a',
                        boxShadow: selectedPackId === p.id ? '0 0 0 1px rgba(107,68,35,0.18)' : 'none',
                      }}
                    >
                      <div className="text-left">
                        <p
                          className="font-bold font-hand text-[14px]"
                          style={{ color: selectedPackId === p.id ? '#6b4423' : '#1a1208' }}
                        >
                          {p.name}
                        </p>
                        <p className="font-hand  text-chalk-board">
                          {p.description}
                        </p>
                      </div>
                      {selectedPackId === p.id && (
                        <CheckCircle className="w-4 h-4 shrink-0 text-chalk-mark" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Rounds selector */}
            <div>
              <p className="label-section mb-2 flex items-center gap-1.5">
                <PenLine className="w-3.5 h-3.5" /> Number of Rounds
              </p>
              <div className="flex gap-2">
                {[3, 5, 7].map((n) => (
                  <button
                    key={n}
                    onClick={() => setRounds(n)}
                    className="flex-1 py-3 rounded-xl border transition-all font-display text-[20px]"
                    style={{
                      background: rounds === n ? 'rgba(107,68,35,0.1)' : 'rgba(139,94,60,0.06)',
                      borderColor: rounds === n ? '#6b4423' : '#c8b89a',
                      color: rounds === n ? '#6b4423' : '#1a1208',
                      boxShadow: rounds === n ? '0 0 0 1px rgba(107,68,35,0.18)' : 'none',
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <p className="label-section mb-2 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5" /> Room Code
            </p>
            <div
              className="input-ruled"
              style={{
                border: `2px solid ${joinCode.length > 0 ? '#6b4423' : '#c8b89a'}`,
                boxShadow: joinCode.length > 0 ? '0 0 0 3px rgba(107,68,35,0.12)' : 'none',
              }}
            >
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="XXXXXX"
                className="w-full text-center text-3xl py-5 outline-none bg-transparent tracking-[0.2em] font-display text-ink-dark"
                style={{ caretColor: '#6b4423' }}
              />
            </div>
            <p className="text-sm mt-2 text-center font-hand text-desk">
              Ask your classmate for their 6-character code
            </p>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="px-5 pb-6 pb-safe pt-3 shrink-0" style={{ borderTop: '1px solid #c8b89a' }}>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleAction}
          disabled={isLoading}
          className="w-full rounded-xl py-3.5 btn-primary font-display text-[19px]"
          style={{ opacity: isLoading ? 0.7 : 1 }}
        >
          {isLoading ? 'Connecting...' : lobbyTab === 'create' ? 'Create Room' : 'Join Room'}
        </motion.button>
      </div>
    </div>
  );
}
