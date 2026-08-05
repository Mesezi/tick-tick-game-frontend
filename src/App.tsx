import { AnimatePresence, motion } from 'motion/react';
import { Home } from 'lucide-react';
import { ScreenRouter } from './router/ScreenRouter.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ConnectionLostOverlay } from './components/ConnectionLostOverlay';
import { RejoinPrompt } from './components/RejoinPrompt';
import { GameToast } from './components/GameToast';
import { BootScreen } from './components/BootScreen';
import { useToastStore } from './components/toastStore';
import { useGameStore } from './store/gameStore';
import { socketHandler } from './socket/socketHandler';
import { apiClient } from './api/client';
import { deriveScreen } from './router/screenRouter';
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

  const toast = useToastStore();
  const { isBooting, pendingRejoinRoom, setPendingRejoinRoom } = useAppInit();
  useSoundInit();

  const activeScreen = deriveScreen({ session, room, round, matchResults, hasPassedLanding });
  const showHome = activeScreen !== 'landing' && activeScreen !== 'avatar-setup';
  const showConnectionProblem = connectionStatus !== 'connected' && !isBooting;

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
      className="h-dvh w-full flex items-center justify-center"
      style={{
        background: 'radial-gradient(ellipse at 50% 0%, #0d2a18 0%, #050f09 50%, #020804 100%)',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <div
        className="relative w-full h-full pb-4 overflow-hidden flex flex-col sm:max-w-[480px] md:max-w-[540px] lg:max-w-[600px] sm:h-[100dvh] sm:rounded-3xl sm:shadow-2xl sm:border sm:border-[#1a3528]/50"
        style={{ background: '#081510' }}
      >
        {/* Floating Home button — top left, only on non-landing screens */}
        {showHome && !isBooting && (
          <button
            onClick={handleGoHome}
            className="absolute left-4 z-40 w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-90"
            style={{ top: 'max(16px, env(safe-area-inset-top, 16px))', background: '#0d2018', border: '1px solid #1a3528' }}
            aria-label="Go home"
          >
            <Home className="w-4 h-4" style={{ color: '#6baf80' }} />
          </button>
        )}

        {/* Connection problem indicator — top right, only when degraded/offline */}
        <AnimatePresence>
          {showConnectionProblem && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-4 z-40 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
              style={{ top: 'max(16px, env(safe-area-inset-top, 16px))', background: '#0d2018', border: '1px solid #1a3528' }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: connectionStatus === 'degraded' ? '#ffb800' : '#ff3b5c',
                  animation: 'pulse 2s ease-in-out infinite',
                }}
              />
              <span
                className="text-[9px] font-bold tracking-widest"
                style={{ color: connectionStatus === 'degraded' ? '#ffb800' : '#ff3b5c' }}
              >
                {connectionStatus === 'degraded' ? 'SLOW' : 'OFFLINE'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main content */}
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

        {/* Rejoin prompt */}
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
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

export default App;
