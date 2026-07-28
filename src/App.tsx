import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { AnimatePresence, motion } from 'motion/react';
import { Volume2, VolumeX, Home } from 'lucide-react';
import { ScreenRouter } from './router/ScreenRouter.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ConnectionLostOverlay } from './components/ConnectionLostOverlay';
import { RejoinPrompt } from './components/RejoinPrompt';
import { useGameStore } from './store/gameStore';
import { socketHandler } from './socket/socketHandler';
import { registerEventHandlers, unregisterEventHandlers } from './socket/eventHandlers';
import { persistenceLayer } from './persistence/persistenceLayer';
import { apiClient } from './api/client';
import { deriveScreen } from './router/screenRouter';
import { isMuted, toggleMute, preloadSounds, playClick } from './audio/soundManager';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const MAX_RECONNECT_ATTEMPTS = 5;

function App() {
  const connectionStatus = useGameStore((s) => s.connection.status);
  const reconnectAttempts = useGameStore((s) => s.connection.reconnectAttempts);
  const [soundMuted, setSoundMuted] = useState(isMuted());
  const [pendingRejoinRoom, setPendingRejoinRoom] = useState<string | null>(null);

  const session = useGameStore((s) => s.session);
  const room = useGameStore((s) => s.room);
  const round = useGameStore((s) => s.round);
  const matchResults = useGameStore((s) => s.matchResults);
  const hasPassedLanding = useGameStore((s) => s.hasPassedLanding);

  const activeScreen = deriveScreen({ session, room, round, matchResults, hasPassedLanding });

  // Initialize on mount: hydrate session, authenticate, connect socket
  useEffect(() => {
    const init = async () => {
      registerEventHandlers();

      const savedSession = persistenceLayer.loadSession();

      if (savedSession?.token) {
        apiClient.setToken(savedSession.token);

        // Verify token is still valid
        try {
          const meRes = await apiClient.getCurrentUser();

          useGameStore.getState().setSession({
            token: savedSession.token,
            userId: savedSession.userId,
            displayName: savedSession.displayName,
            avatarId: savedSession.avatarId,
            isAuthenticated: savedSession.isAuthenticated,
            deviceId: savedSession.deviceId,
          });
          socketHandler.connect(SOCKET_URL, savedSession.token);

          if (meRes.data.activeRoom) {
            setPendingRejoinRoom(meRes.data.activeRoom);
          }
        } catch (error) {
          // Token is stale/invalid — clear everything and start fresh
          console.warn('[App] Saved session invalid, starting fresh:', error);
          persistenceLayer.clearSession();
          apiClient.setToken(null);
          await loginAsGuest();
        }
      } else {
        await loginAsGuest();
      }
    };

    const loginAsGuest = async () => {
      try {
        const deviceId = persistenceLayer.getDeviceId();
        const { token, guestId } = await apiClient.guestLogin(deviceId);

        useGameStore.getState().setSession({
          token,
          userId: guestId,
          displayName: null,
          avatarId: '',
          isAuthenticated: false,
          deviceId,
        });

        socketHandler.connect(SOCKET_URL, token);
      } catch (error) {
        console.warn('[App] Guest login failed, resetting device ID:', error);
        // Device ID might be stale (deleted from DB) — clear and retry once
        persistenceLayer.clearSession();
        try {
          // Force a new device ID by clearing the old one
          localStorage.removeItem('naija_device_id');
          const newDeviceId = persistenceLayer.getDeviceId();
          const { token, guestId } = await apiClient.guestLogin(newDeviceId);

          useGameStore.getState().setSession({
            token,
            userId: guestId,
            displayName: null,
            avatarId: '',
            isAuthenticated: false,
            deviceId: newDeviceId,
          });

          socketHandler.connect(SOCKET_URL, token);
        } catch (retryError) {
          console.error('[App] Guest login retry failed:', retryError);
        }
      }
    };

    init();

    return () => {
      unregisterEventHandlers();
      socketHandler.disconnect();
    };
  }, []);

  // Initialize sound system on first user interaction (mobile autoplay policy)
  // Also plays a synthesized click on every button tap (no file needed)
  useEffect(() => {
    const handleClick = (e: Event) => {
      if (!initialized) {
        preloadSounds();
        initialized = true;
      }
      const target = e.target as HTMLElement;
      if (target.closest('button')) {
        playClick();
      }
    };
    let initialized = false;
    document.addEventListener('pointerdown', handleClick);
    return () => document.removeEventListener('pointerdown', handleClick);
  }, []);

  const showConnectionLost =
    connectionStatus === 'disconnected' &&
    reconnectAttempts >= MAX_RECONNECT_ATTEMPTS;

  const handleRetryConnection = () => {
    const sess = useGameStore.getState().session;
    if (sess?.token) {
      socketHandler.connect(SOCKET_URL, sess.token);
    }
  };

  const handleGoHome = () => {
    const currentSession = useGameStore.getState().session;
    useGameStore.getState().reset();
    if (currentSession) {
      useGameStore.getState().setSession(currentSession);
    }
    setPendingRejoinRoom(null);
  };

  const handleRejoin = () => {
    if (!pendingRejoinRoom) return;
    socketHandler.emit('join-room', { roomCode: pendingRejoinRoom });
    useGameStore.getState().setHasPassedLanding(true);
    setPendingRejoinRoom(null);
  };

  const handleDismissRejoin = () => {
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
      {/* App shell — full width on mobile, capped with rounded edges on desktop */}
      <div
        className="relative w-full h-full overflow-hidden flex flex-col sm:max-w-[480px] md:max-w-[540px] lg:max-w-[600px] sm:h-[95vh] sm:rounded-3xl sm:shadow-2xl sm:border sm:border-[#1a3528]/50"
        style={{ background: '#081510' }}
      >
        {/* Top bar — volume/home left, connectivity right */}
        <div className="flex items-center justify-between px-4 py-3.5 shrink-0 z-40">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSoundMuted(toggleMute())}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-all active:scale-90"
              style={{ background: '#0d2018' }}
              aria-label={soundMuted ? 'Unmute sounds' : 'Mute sounds'}
            >
              {soundMuted ? <VolumeX className="w-5 h-5" style={{ color: '#6baf80' }} /> : <Volume2 className="w-5 h-5" style={{ color: '#00d060' }} />}
            </button>
            {activeScreen !== 'landing' && (
              <button
                onClick={handleGoHome}
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-all active:scale-90"
                style={{ background: '#0d2018' }}
                aria-label="Go home"
              >
                <Home className="w-3.5 h-3.5" style={{ color: '#6baf80' }} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: connectionStatus === 'connected' ? '#00d060' : connectionStatus === 'degraded' ? '#ffb800' : '#ff3b5c',
                animation: 'ping-dot 2s ease-in-out infinite',
              }}
            />
            <span
              className="text-[9px] font-bold tracking-widest"
              style={{ color: connectionStatus === 'connected' ? '#00d060' : connectionStatus === 'degraded' ? '#ffb800' : '#ff3b5c' }}
            >
              {connectionStatus === 'connected' ? 'LIVE' : connectionStatus === 'degraded' ? 'SLOW' : 'OFFLINE'}
            </span>
          </div>
        </div>

        <AnimatePresence mode="wait">
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
        </AnimatePresence>

        {/* Rejoin prompt — shown when user has an active room from previous session */}
        <AnimatePresence>
          {pendingRejoinRoom && !room && (
            <RejoinPrompt
              roomCode={pendingRejoinRoom}
              onRejoin={handleRejoin}
              onDismiss={handleDismissRejoin}
            />
          )}
        </AnimatePresence>
      </div>

      <Toaster
        richColors
        position="top-center"
        toastOptions={{
          style: {
            background: '#0d2018',
            border: '1px solid rgba(0,208,96,0.2)',
            color: '#f0fff4',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          },
        }}
      />

      {showConnectionLost && (
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
