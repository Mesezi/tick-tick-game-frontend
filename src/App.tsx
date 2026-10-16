import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Home } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { ScreenRouter } from './router/ScreenRouter.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ConnectionLostOverlay } from './components/ConnectionLostOverlay';
import { RejoinLoadingOverlay } from './components/RejoinLoadingOverlay';
import { RejoinPrompt } from './components/RejoinPrompt';
import { BootScreen } from './components/BootScreen';
import { GameToast } from './components/GameToast';
import { useToastStore } from './components/toastStore';
import { useGameStore } from './store/gameStore';
import { socketHandler } from './socket/socketHandler';
import { ApiError, apiClient } from './api/client';
import { deriveScreen } from './router/screenRouter';
import { useAppInit } from './hooks/useAppInit';
import { useSoundInit } from './hooks/useSoundInit';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const MAX_RECONNECT_ATTEMPTS = 5;
const REJOIN_TIMEOUT_MS = 15000;
const INVITE_ROOM_STORAGE_KEY = 'tick-tick-invite-room';

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

  const toastMessage = useToastStore((s) => s.message);
  const toastVariant = useToastStore((s) => s.variant);
  const toastVisible = useToastStore((s) => s.visible);
  const toastId = useToastStore((s) => s._id);
  const toastActionLabel = useToastStore((s) => s.actionLabel);
  const toastOnAction = useToastStore((s) => s.onAction);
  const dismissToast = useToastStore((s) => s.dismiss);
  const showToast = useToastStore((s) => s.show);
  const {
    needRefresh: [pwaNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  const {
    isBooting,
    pendingRejoinRoom,
    setPendingRejoinRoom,
    inviteRoomCode,
    setInviteRoomCode,
  } = useAppInit();
  const inviteJoinAttempt = useRef<string | null>(null);
  const pwaUpdatePromptShown = useRef(false);
  useSoundInit();

  useEffect(() => {
    if (room && pendingRejoinRoom) {
      setPendingRejoinRoom(null);
    }
  }, [room, pendingRejoinRoom, setPendingRejoinRoom]);

  useEffect(() => {
    if (!pwaNeedRefresh) {
      pwaUpdatePromptShown.current = false;
      return;
    }
    if (pwaUpdatePromptShown.current) return;

    pwaUpdatePromptShown.current = true;
    showToast('New version available. Tap to refresh.', 'info', {
      label: 'Refresh',
      onAction: () => {
        void updateServiceWorker();
      },
    });
  }, [pwaNeedRefresh, showToast, updateServiceWorker]);

  useEffect(() => {
    if (!isRejoining) return;

    const timeout = window.setTimeout(() => {
      setIsRejoining(false);
      if (inviteRoomCode) {
        setInviteRoomCode(null);
        sessionStorage.removeItem(INVITE_ROOM_STORAGE_KEY);
        showToast('Joining the invited room timed out. Please try again.', 'error');
      } else {
        showToast('Rejoining timed out. Please try again.', 'error');
      }
    }, REJOIN_TIMEOUT_MS);

    return () => window.clearTimeout(timeout);
  }, [isRejoining, inviteRoomCode, setInviteRoomCode, setIsRejoining, showToast]);

  useEffect(() => {
    if (room?.roomCode !== inviteRoomCode || !inviteRoomCode) return;
    setInviteRoomCode(null);
    sessionStorage.removeItem(INVITE_ROOM_STORAGE_KEY);
    window.history.replaceState(window.history.state, '', '/');
  }, [room?.roomCode, inviteRoomCode, setInviteRoomCode]);

  useEffect(() => {
    if (
      !inviteRoomCode ||
      isBooting ||
      !session?.displayName ||
      !session.avatarId ||
      connectionStatus !== 'connected' ||
      room?.roomCode === inviteRoomCode ||
      inviteJoinAttempt.current === inviteRoomCode
    ) {
      return;
    }

    inviteJoinAttempt.current = inviteRoomCode;
    setIsRejoining(true);

    apiClient.joinRoom(inviteRoomCode, session.displayName)
      .then(() => {
        if (!socketHandler.isConnected()) {
          throw new Error('Not connected to the game server');
        }
        socketHandler.emit('join-room', { roomCode: inviteRoomCode });
      })
      .catch((error: unknown) => {
        console.error('[App] Failed to join invited room:', error);
        setIsRejoining(false);
        setInviteRoomCode(null);
        sessionStorage.removeItem(INVITE_ROOM_STORAGE_KEY);
        inviteJoinAttempt.current = null;
        if (error instanceof ApiError && error.status === 404) {
          showToast('Room code expired.', 'error');
        } else {
          showToast(
            error instanceof Error ? error.message : 'Could not join the invited room.',
            'error',
          );
        }
      });
  }, [
    connectionStatus,
    isBooting,
    inviteRoomCode,
    room?.roomCode,
    session?.avatarId,
    session?.displayName,
    setInviteRoomCode,
    setIsRejoining,
    showToast,
  ]);

  const activeScreen = deriveScreen({ session, room, round, matchResults, hasPassedLanding });
  const showNavigation = activeScreen !== 'landing';
  const isBackNavigation = activeScreen === 'avatar-setup' || activeScreen === 'room-lobby';
  const showConnectionProblem = connectionStatus !== 'connected' && !isBooting;

  const handleGoHome = () => {
    const store = useGameStore.getState();
    const currentSession = store.session;
    const currentRoom = store.room;
    if (
      currentRoom?.status === 'in_progress' &&
      !store.matchResults &&
      !window.confirm('Leave this match? You may not be able to rejoin.')
    ) {
      return;
    }
    if (currentRoom?.roomCode && currentSession?.token) {
      apiClient.leaveRoom(currentRoom.roomCode).catch((error: unknown) => {
        console.warn('[App] Leave room failed:', error);
      });
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
    setInviteRoomCode(null);
    sessionStorage.removeItem(INVITE_ROOM_STORAGE_KEY);
    window.history.replaceState(window.history.state, '', '/');
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

  const navigationRef = useRef({ activeScreen, handleGoBack, handleGoHome, isBooting });
  useEffect(() => {
    navigationRef.current = { activeScreen, handleGoBack, handleGoHome, isBooting };
  });

  useEffect(() => {
    if (window.history.state?.tickTickNavigation !== true) {
      window.history.pushState({ tickTickNavigation: true }, '', window.location.href);
    }

    const handlePopState = () => {
      const navigation = navigationRef.current;
      if (!navigation.isBooting && navigation.activeScreen === 'landing') return;

      window.history.pushState({ tickTickNavigation: true }, '', window.location.href);
      if (navigation.isBooting) return;

      if (navigation.activeScreen === 'avatar-setup' || navigation.activeScreen === 'room-lobby') {
        void navigation.handleGoBack();
      } else {
        navigation.handleGoHome();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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
        className="relative w-full h-full overflow-hidden flex flex-col sm:max-w-120 md:max-w-135 lg:max-w-150 sm:h-dvh sm:rounded-3xl sm:shadow-2xl sm:border paper-body"
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
            className="flex items-center justify-between px-4 py-2 shrink-0 z-40"
            style={{
              background: '#f5f0e8',
              borderBottom: '1px solid #d4c9b0',
              paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
            }}
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

        {!showNavigation && (isBooting || showConnectionProblem) && (
          <div
            className="absolute left-4 z-40 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
            style={{
              top: 'max(16px, env(safe-area-inset-top, 16px))',
              background: 'rgba(245,240,232,0.9)',
              border: '1px solid #c8b89a',
              backdropFilter: 'blur(8px)',
            }}
            role="status"
            aria-label={
              isBooting
                ? 'Connecting'
                : connectionStatus === 'degraded'
                  ? 'Connection slow'
                  : 'Offline'
            }
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: isBooting || connectionStatus === 'degraded' ? '#d97706' : '#c0392b',
                animation: 'pulse-dot 2s ease-in-out infinite',
              }}
            />
            <span
              className="text-sm font-bold tracking-widest font-hand"
              style={{
                color: isBooting || connectionStatus === 'degraded' ? '#d97706' : '#c0392b',
              }}
            >
              {isBooting
                ? 'CONNECTING...'
                : connectionStatus === 'degraded'
                  ? 'SLOW'
                  : 'OFFLINE'}
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
        {isRejoining && <RejoinLoadingOverlay message={inviteRoomCode ? 'Joining room...' : undefined} />}
      </div>

      <GameToast
        message={toastMessage}
        variant={toastVariant}
        visible={toastVisible}
        toastId={toastId}
        actionLabel={toastActionLabel}
        onAction={toastOnAction}
        onDismiss={dismissToast}
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
