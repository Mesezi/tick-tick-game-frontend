import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CheckCircle } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { socketHandler } from '../socket/socketHandler';
import { apiClient } from '../api/client';
import { useCategoryPacks } from '../api/queries';
import { showToast } from '../components/toastStore';

interface CategoryPack {
  id: string;
  name: string;
  description: string;
  categories: string[];
  createdAt: string;
}

/**
 * LobbyScreen - Game lobby with Create/Join tabs, category packs, round selector.
 * Includes profile edit overlay accessible by tapping the avatar header.
 */
export function LobbyScreen() {
  const session = useGameStore((s) => s.session);
  const [lobbyTab, setLobbyTab] = useState<'create' | 'join'>('create');
  const [selectedPackId, setSelectedPackId] = useState('');
  const [rounds, setRounds] = useState(3);
  const [joinCode, setJoinCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Cached category packs via React Query
  const { data: packsData, isLoading: packsLoading } = useCategoryPacks();
  const packs: CategoryPack[] = packsData?.data.packs ?? [];

  // Auto-select first pack when data arrives
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
      // Keep loading — screen will transition when state-snapshot arrives
      // Safety timeout in case websocket never responds
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
      // Keep loading — screen will transition when state-snapshot arrives
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
    if (lobbyTab === 'create') {
      handleCreate();
    } else {
      handleJoin();
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative" data-testid="screen-lobby">
      <div className="px-6 pt-12 pb-4">
        {/* Profile header */}
        <div className="flex items-center gap-3 mb-5">
          <span className="text-3xl">
            {session?.avatarId || '🦁'}
          </span>
          <div className="flex-1">
            <p className="text-white font-bold text-sm">
              {session?.displayName || 'Player'}
            </p>
            <p className="text-xs" style={{ color: '#6baf80' }}>
              Ready to compete
            </p>
          </div>
        </div>
        <h2
          className="text-white"
          style={{
            fontFamily: "'Dela Gothic One', sans-serif",
            fontSize: '38px',
            lineHeight: 1,
          }}
        >
          Game Lobby
        </h2>
      </div>

      {/* Tabs */}
      <div className="px-6 mb-5">
        <div
          className="flex rounded-xl p-1 gap-1"
          style={{ background: '#0d2018' }}
        >
          {(['create', 'join'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setLobbyTab(t)}
              className="flex-1 py-2.5 rounded-lg text-sm font-bold capitalize transition-all"
              style={{
                background: lobbyTab === t ? '#00d060' : 'transparent',
                color: lobbyTab === t ? '#000' : '#6baf80',
              }}
            >
              {t === 'create' ? 'Create Room' : 'Join Room'}
            </button>
          ))}
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto px-6"
        style={{ scrollbarWidth: 'none' }}
      >
        {lobbyTab === 'create' ? (
          <div className="space-y-5">
            <div>
              <p
                className="text-xs font-bold tracking-widest uppercase mb-2"
                style={{ color: '#a0c8a8' }}
              >
                Category Pack
              </p>
              <div className="space-y-2">
                {packsLoading ? (
                  <>
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="w-full p-4 rounded-xl border animate-pulse"
                        style={{ background: '#0d2018', borderColor: '#1a3528' }}
                      >
                        <div
                          className="h-4 rounded-md mb-2 w-2/3"
                          style={{ background: '#1a3528' }}
                        />
                        <div
                          className="h-3 rounded-md w-1/2"
                          style={{ background: '#132a1e' }}
                        />
                      </div>
                    ))}
                  </>
                ) : (
                  packs.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPackId(p.id)}
                    className="w-full flex items-center justify-between p-4 rounded-xl border transition-all"
                    style={{
                      background:
                        selectedPackId === p.id
                          ? 'rgba(0,208,96,0.1)'
                          : '#0d2018',
                      borderColor:
                        selectedPackId === p.id
                          ? 'rgba(0,208,96,0.4)'
                          : '#1a3528',
                    }}
                  >
                    <div className="text-left">
                      <p
                        className="font-bold text-sm"
                        style={{
                          color: selectedPackId === p.id ? '#00d060' : '#ffffff',
                        }}
                      >
                        {p.name}
                      </p>
                      <p className="text-xs" style={{ color: '#6baf80' }}>
                        {p.description}
                      </p>
                    </div>
                    {selectedPackId === p.id && (
                      <CheckCircle
                        className="w-4 h-4 shrink-0"
                        style={{ color: '#00d060' }}
                      />
                    )}
                  </button>
                ))
                )}
              </div>
            </div>

            <div>
              <p
                className="text-xs font-bold tracking-widest uppercase mb-2"
                style={{ color: '#a0c8a8' }}
              >
                Number of Rounds
              </p>
              <div className="flex gap-2">
                {[3, 5, 7].map((n) => (
                  <button
                    key={n}
                    onClick={() => setRounds(n)}
                    className="flex-1 py-3.5 rounded-xl border transition-all"
                    style={{
                      fontFamily: "'Dela Gothic One', sans-serif",
                      fontSize: '22px',
                      background:
                        rounds === n
                          ? 'rgba(0,208,96,0.12)'
                          : '#0d2018',
                      borderColor:
                        rounds === n
                          ? 'rgba(0,208,96,0.45)'
                          : '#1a3528',
                      color: rounds === n ? '#00d060' : '#ffffff',
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
            <p
              className="text-xs font-bold tracking-widest uppercase mb-2"
              style={{ color: '#a0c8a8' }}
            >
              Room Code
            </p>
            <input
              type="text"
              value={joinCode}
              onChange={(e) =>
                setJoinCode(e.target.value.toUpperCase().slice(0, 6))
              }
              placeholder="XXXXXX"
              className="w-full text-center text-white text-3xl py-4 rounded-xl outline-none tracking-[0.2em] transition-all"
              style={{
                fontFamily: "'Dela Gothic One', sans-serif",
                background: '#0d2018',
                border: `1.5px solid ${joinCode.length > 0 ? '#00d060' : '#1a3528'}`,
                caretColor: '#00d060',
              }}
            />
            <p
              className="text-xs mt-2 text-center"
              style={{ color: '#3a5a45' }}
            >
              Ask your host for their 6-character code
            </p>
          </div>
        )}
      </div>

      <div className="px-6 pb-8 pb-safe pt-4">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleAction}
          disabled={isLoading}
          className="w-full rounded-2xl py-4 text-black"
          style={{
            background: '#00d060',
            fontFamily: "'Dela Gothic One', sans-serif",
            fontSize: '22px',
          }}
        >
          {isLoading ? 'Connecting...' : lobbyTab === 'create' ? 'Create Room' : 'Join Room'}
        </motion.button>
      </div>
    </div>
  );
}

