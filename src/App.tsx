import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ScreenRouter } from './router/ScreenRouter.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ConnectionLostOverlay } from './components/ConnectionLostOverlay';
import { RejoinPrompt } from './components/RejoinPrompt';
import { GameToast } from './components/GameToast';
import { TopBar } from './components/TopBar';
import { BootScreen } from './components/BootScreen';
import { useToastStore } from './components/toastStore';
import { useGameStore } from './store/gameStore';
import { socketHandler } from './socket/socketHandler';
import { apiClient } from './api/client';
import { deriveScreen } from './router/screenRouter';
import { isMuted, toggleMute } from './audio/soundManager';
import { useAppInit } from './hooks/useAppInit';
import { useSoundInit } from './hooks/useSoundInit';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const MAX_RECONNECT_ATTEMPTS = 5;

function App() {
  const connectionStatus = useGameStore((s) => s.connection.status);
  const reconnectAttempts = useGameStore((s) => s.connection.reconnectAttempts);
  const session = useGameStore((s) => s.session);
  const room = useGameStore((s) => s.room);
  const round = useGameStore((s) => s.round);
  const matchResults = useGameStore((s) => s.matchResults);
  const hasPassedLanding = useGameStore((s) => s.hasPassedLanding);

  const [soundMuted, setSoundMuted] = useState(isMuted());
  const toast = useToastStore();

  const { isBooting, pendingRejoinRoom, setPendingRejoinRoom } = useAppInit();
  useSoundInit();

  const activeScreen = deriveScreen({ session, room, round, matchResults, hasPassedLanding });

  const handleGoHome = () => {
    const currentSession = useGameStore.getState().session;
    const currentRoom = useGameStore.getState().room;
    if (currentRoom?.roomCode && currentSession?.token) {
      apiClient.leaveRoom(currentRoom.roomCode).catch(() => {});
    }
    useGameStore.getState().reset();
    if (currentSession) useGameStore.getState().setSession(currentSession);
    setPendingRejoinRoom(null);
  };

  const handleRetryConnection = () => {
    const sess = useGameStore.getState().session;
    if (sess?.token) socketHandler.connect(SOCKET_URL, sess.token);
  };

  const handleRejoin = () => {
    if (!pendingRejoinRoom) return;
    socketHandler.emit('join-room', { roomCode: pendingRejoinRoom });
    useGameStore.getState().setHasPassedLanding(true);
    setPendingRejoinRoom(null);
  };

  return (
    <div
      className="h-screen w-full flex items-center justify-center"
      style={{
        background: 'radial-gradient(ellipse at 50% 0%, #0d2a18 0%, #050f09 50%, #020804 100%)',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <div
        className="relative w-full h-full overflow-hidden flex flex-col sm:max-w-[480px] md:max-w-[540px] lg:max-w-[600px] sm:h-[95vh] sm:rounded-3xl sm:shadow-2xl sm:border sm:border-[#1a3528]/50"
        style={{ background: '#081510' }}
      >
        <TopBar
          soundMuted={soundMuted}
          showHome={activeScreen !== 'landing'}
          connectionStatus={connectionStatus}
          isBooting={isBooting}
          onToggleSound={() => setSoundMuted(toggleMute())}
          onGoHome={handleGoHome}
        />

        <AnimatePresence mode="wait">
          {isBooting ? (
            <BootScreen />
          ) : (
            <motion.div
              key={activeScreen}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="flex-1 overflow-hidden flex flex-col"
            >
              <ErrorBoundary>
                <ScreenRouter />
              </ErrorBoundary>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {pendingRejoinRoom && !room && (
            <div className="pb-safe">
              <RejoinPrompt
                roomCode={pendingRejoinRoom}
                onRejoin={handleRejoin}
                onDismiss={() => setPendingRejoinRoom(null)}
              />
            </div>
          )}
        </AnimatePresence>
      </div>

      <GameToast
        message={toast.message}
        variant={toast.variant}
        visible={toast.visible}
        toastId={toast._id}
        onDismiss={toast.dismiss}
      />

      {connectionStatus === 'disconnected' && reconnectAttempts >= MAX_RECONNECT_ATTEMPTS && (
        <ConnectionLostOverlay onRetry={handleRetryConnection} />
      )}

      <style>{`
        @keyframes ping-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.4); }
        }
      `}</style>
    </div>
  );
}

export default App;
