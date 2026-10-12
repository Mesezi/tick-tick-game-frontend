import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Home } from 'lucide-react';
import { ScreenRouter } from './router/ScreenRouter.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ConnectionLostOverlay } from './components/ConnectionLostOverlay';
import { RejoinLoadingOverlay } from './components/RejoinLoadingOverlay';
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
const REJOIN_TIMEOUT_MS = 15000;

function App() {
  const isRejoining = useGameStore((s) => s.isRejoining);
  const setIsRejoining = useGameStore((s) => s.setIsRejoining);
  const connectionStatus = useGameStore((s) => s.connection.status);
  const reconnectAttempts = useGameStore((s) => s.connection.reconnectAttempts);
  const session = useGameStore((s) => s.session);
  const room = useGameStore((s) => s.room);
  const round = useGameStore((s) => s.round);
  const matchResults = useGameStore((s) => s.matchResults);
  const hasPassedLanding = useGameStore((s) => s.hasPassedLanding);

  const toast = useToastStore();
  const showToast = useToastStore((s) => s.show);
  const { isBooting, pendingRejoinRoom, setPendingRejoinRoom } = useAppInit();
  useSoundInit();

  useEffect(() => {
    if (room && pendingRejoinRoom) {
      setPendingRejoinRoom(null);
    }
  }, [room, pendingRejoinRoom, setPendingRejoinRoom]);

  useEffect(() => {
    if (!isRejoining) return;

    const timeout = window.setTimeout(() => {
      setIsRejoining(false);
      showToast('Rejoining timed out. Please try again.', 'error');
    }, REJOIN_TIMEOUT_MS);

    return () => window.clearTimeout(timeout);
  }, [isRejoining, setIsRejoining, showToast]);

  const activeScreen = deriveScreen({ session, room, round, matchResults, hasPassedLanding });
  const showNavigation = activeScreen !== 'landing';
  const isBackNavigation = activeScreen === 'avatar-setup' || activeScreen === 'room-lobby';
  const showConnectionProblem = connectionStatus !== 'connected' && !isBooting;

  const handleGoHome = () => {
    const store = useGameStore.getState();
    const currentSession = store.session;
    const currentRoom = store.room;
    if (currentRoom?.roomCode && currentSession?.token) {
      apiClient.leaveRoom(currentRoom.roomCode).catch(() => {});
    }
    const roomPlayer = currentRoom?.players.find((player) => player.userId === currentSession?.userId);
    const homeSession = currentSession
      ? {
          ...currentSession,
          displayName: currentSession.displayName || roomPlayer?.displayName || null,
          avatarId: currentSession.avatarId || roomPlayer?.avatarId || '',
        }
      : null;
    store.resetToHome(homeSession);
    setPendingRejoinRoom(null);
  };

  const handleGoBack = async () => {
    if (activeScreen === 'avatar-setup') {
      useGameStore.getState().setHasPassedLanding(false);
      return;
    }

    const store = useGameStore.getState();
    const currentRoom = store.room;
    const currentSession = store.session;
    if (currentRoom?.roomCode) {
      try {
        await apiClient.leaveRoom(currentRoom.roomCode);
      } catch (err) {
        console.warn('[App] Leave room failed:', err);
      }
    }
    store.reset();
    if (currentSession) store.setSession(currentSession);
    store.setHasPassedLanding(true);
  };

  const handleRetryConnection = () => {
    const sess = useGameStore.getState().session;
    if (sess?.token) socketHandler.connect(SOCKET_URL, sess.token);
  };

  const handleRejoin = () => {
    if (!pendingRejoinRoom) return;
    if (!socketHandler.isConnected()) {
      showToast('Not connected to the game server. Please try again.', 'error');
      return;
    }
    setIsRejoining(true);
    socketHandler.emit('join-room', { roomCode: pendingRejoinRoom });
  };

  return (
    <div
      className="h-dvh w-full flex items-center justify-center font-hand"
      style={{
        background: 'radial-gradient(ellipse at 50% 20%, #c4a06a 0%, #a07840 40%, #7a5828 100%)',
      }}
    >
      {/* Phone-frame shell — aged paper */}
      <div
        className="relative w-full h-full pb-4 overflow-hidden flex flex-col sm:max-w-120 md:max-w-135 lg:max-w-150 sm:h-dvh sm:rounded-3xl sm:shadow-2xl sm:border paper-body"
        style={{
          borderColor: '#c8b89a',
          boxShadow: '0 24px 60px rgba(80,50,20,0.45), 0 0 0 1px rgba(139,94,60,0.3), inset 0 1px 0 rgba(255,255,255,0.8)',
        }}
      >
        {/* Nigerian flag accent — top edge */}
        <div className="absolute top-0 left-0 right-0 h-1 flex z-50 sm:rounded-t-3xl overflow-hidden pointer-events-none">
          <div className="flex-1 flag-stripe" />
          <div className="flex-1 bg-paper" />
          <div className="flex-1 flag-stripe" />
        </div>

        {showNavigation && !isBooting && (
          <header
            className="flex items-center justify-between px-4 py-2 md:pt-2 shrink-0 z-40"
            style={{ background: '#f5f0e8', borderBottom: '1px solid #d4c9b0' }}
          >
            <button
              onClick={isBackNavigation ? handleGoBack : handleGoHome}
              className="inline-flex h-9 items-center gap-2 rounded-xl border px-3 font-hand text-sm font-bold transition-all active:scale-95"
              style={{
                color: '#6b4423',
                background: 'rgba(139,94,60,0.1)',
                borderColor: 'rgba(139,94,60,0.25)',
              }}
              aria-label={isBackNavigation ? 'Go back' : 'Go home'}
            >
              {isBackNavigation
                ? <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                : <Home className="h-4 w-4" aria-hidden="true" />}
              {isBackNavigation ? 'Back' : 'Home'}
            </button>

            {showConnectionProblem && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                role="status"
                aria-label={connectionStatus === 'degraded' ? 'Connection slow' : 'Offline'}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: connectionStatus === 'degraded' ? '#d97706' : '#c0392b',
                    animation: 'pulse-dot 2s ease-in-out infinite',
                  }}
                />
                <span
                  className=" font-bold tracking-widest font-hand"
                  style={{ color: connectionStatus === 'degraded' ? '#d97706' : '#c0392b' }}
                >
                  {connectionStatus === 'degraded' ? 'SLOW' : 'OFFLINE'}
                </span>
              </div>
            )}
          </header>
        )}

        {!showNavigation && showConnectionProblem && (
          <div
            className="absolute right-4 z-40 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
            style={{
              top: 'max(16px, env(safe-area-inset-top, 16px))',
              background: 'rgba(245,240,232,0.9)',
              border: '1px solid #c8b89a',
              backdropFilter: 'blur(8px)',
            }}
            role="status"
            aria-label={connectionStatus === 'degraded' ? 'Connection slow' : 'Offline'}
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: connectionStatus === 'degraded' ? '#d97706' : '#c0392b',
                animation: 'pulse-dot 2s ease-in-out infinite',
              }}
            />
            <span
              className="text-sm font-bold tracking-widest font-hand"
              style={{ color: connectionStatus === 'degraded' ? '#d97706' : '#c0392b' }}
            >
              {connectionStatus === 'degraded' ? 'SLOW' : 'OFFLINE'}
            </span>
          </div>
        )}

        {/* Main content */}
        <AnimatePresence mode="wait">
          {isBooting ? (
            <BootScreen key="boot" />
          ) : (
            <motion.div
              key={activeScreen}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
              className="flex-1 overflow-y-auto flex flex-col"
               style={{ scrollbarWidth: 'none' }}
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
        {isRejoining && <RejoinLoadingOverlay />}
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
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
      `}</style>
    </div>
  );
}

export default App;
