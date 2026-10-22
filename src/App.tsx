import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Bell, Check, Home, X } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { ScreenRouter } from './router/ScreenRouter.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NetworkErrorScreen } from './components/NetworkErrorScreen';
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
import { BottomDock } from './components/BottomDock';
import type { DockTab } from './components/BottomDock';
import { FriendsScreen } from './screens/FriendsScreen';
import { LeaderboardScreen } from './screens/LeaderboardScreen';
import { ProfileOverlay } from './screens/LandingScreen';
import { NotificationsScreen } from './screens/NotificationsScreen';

const REJOIN_TIMEOUT_MS = 15000;
const INVITE_ROOM_STORAGE_KEY = 'tick-tick-invite-room';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

type IncomingRoomInviteNotice = {
  id: string;
  roomCode: string;
  inviterName: string;
  expiresAt?: string;
};

function App() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [backendAvailable, setBackendAvailable] = useState<boolean | null>(null);
  const [dockTab, setDockTab] = useState<DockTab>('play');
  const [friendRequestCount, setFriendRequestCount] = useState(0);
  const [roomInviteCount, setRoomInviteCount] = useState(0);
  const [incomingRoomInvite, setIncomingRoomInvite] = useState<IncomingRoomInviteNotice | null>(null);
  const [roomInviteBusy, setRoomInviteBusy] = useState(false);
  const isRejoining = useGameStore((s) => s.isRejoining);
  const setIsRejoining = useGameStore((s) => s.setIsRejoining);
  const connectionStatus = useGameStore((s) => s.connection.status);
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
  const handleDockSelect = useCallback((tab: DockTab) => {
    const needsProfile = tab === 'friends' || tab === 'notifications' || tab === 'profile';
    const profileReady = Boolean(session?.token && session.displayName && session.avatarId);
    if (needsProfile && !profileReady) {
      showToast('Complete student registration to use this screen.', 'info');
      return;
    }
    setDockTab(tab);
  }, [session?.token, session?.displayName, session?.avatarId, showToast]);
  const profileReady = Boolean(session?.token && session.displayName && session.avatarId);
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
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const openNotifications = () => handleDockSelect('notifications');
    window.addEventListener('open-notifications', openNotifications);
    return () => window.removeEventListener('open-notifications', openNotifications);
  }, [handleDockSelect]);

  useEffect(() => {
    if (!session?.token) return;
    let mounted = true;
    const refreshSocial = async () => {
      try {
        const [requestsResponse, invitesResponse] = await Promise.all([
          apiClient.getFriendRequests('incoming'),
          apiClient.getRoomInvites(),
        ]);
        if (mounted) {
          setFriendRequestCount(requestsResponse.data?.requests?.length ?? 0);
          setRoomInviteCount(invitesResponse.data?.invites?.length ?? 0);
        }
      } catch (error) {
        console.warn('[Social] Could not refresh social notifications:', error);
      }
    };
    void refreshSocial();
    window.addEventListener('social-data-refresh', refreshSocial);
    const refreshEvents = ['friend-request-received', 'friend-request-updated', 'friendship-removed', 'room-invite-received', 'room-invite-updated'];
    const handlers = refreshEvents.map((event) => {
      const handler = (payload?: unknown) => {
        window.dispatchEvent(new CustomEvent('social-data-refresh'));
        if (event === 'room-invite-received' && payload && typeof payload === 'object') {
          const data = payload as {
            id?: string; inviteId?: string; roomCode?: string;
            room?: { code?: string }; inviter?: { displayName?: string };
            expiresAt?: string; invite?: { id?: string; room?: { code?: string }; inviter?: { displayName?: string }; expiresAt?: string };
          };
          const noticeId = data.inviteId ?? data.id ?? data.invite?.id;
          const roomCode = data.roomCode ?? data.room?.code ?? data.invite?.room?.code;
          if (noticeId && roomCode) {
            setIncomingRoomInvite({
              id: noticeId,
              roomCode,
              inviterName: data.inviter?.displayName ?? data.invite?.inviter?.displayName ?? 'A friend',
              expiresAt: data.expiresAt ?? data.invite?.expiresAt,
            });
          }
        }
      };
      socketHandler.onEvent(event, handler);
      return event;
    });
    const presenceEvents = ['friend-online', 'friend-offline'];
    presenceEvents.forEach((event) => socketHandler.onEvent(event, (payload) => window.dispatchEvent(new CustomEvent(event, { detail: payload }))));
    return () => {
      mounted = false;
      window.removeEventListener('social-data-refresh', refreshSocial);
      [...handlers, ...presenceEvents].forEach((event) => socketHandler.offEvent(event));
    };
  }, [session?.token, connectionStatus]);

  const acceptRoomInvite = async () => {
    if (!incomingRoomInvite || roomInviteBusy) return;
    if (!socketHandler.isConnected()) {
      showToast('Reconnect to the game server before accepting this invite.', 'error');
      return;
    }
    setRoomInviteBusy(true);
    try {
      const response = await apiClient.respondRoomInvite(incomingRoomInvite.id, 'accept');
      const roomCode = response.data.room?.code ?? incomingRoomInvite.roomCode;
      socketHandler.emit('join-room', { roomCode });
      setIncomingRoomInvite(null);
      setDockTab('play');
      window.dispatchEvent(new CustomEvent('social-data-refresh'));
      showToast(`Joining room ${roomCode}…`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not join this room.', 'error');
    } finally {
      setRoomInviteBusy(false);
    }
  };

  const declineRoomInvite = async () => {
    if (!incomingRoomInvite || roomInviteBusy) return;
    setRoomInviteBusy(true);
    try {
      await apiClient.respondRoomInvite(incomingRoomInvite.id, 'decline');
      setIncomingRoomInvite(null);
      showToast('Invite declined.', 'success');
      window.dispatchEvent(new CustomEvent('social-data-refresh'));
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not decline this invite.', 'error');
    } finally {
      setRoomInviteBusy(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    let settled = false;
    const timeout = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      controller.abort();
      setBackendAvailable(false);
    }, 8000);

    fetch(`${API_URL}/health`, { signal: controller.signal })
      .then((response) => {
        if (settled) return;
        settled = true;
        setBackendAvailable(response.ok);
      })
      .catch(() => {
        if (settled) return;
        settled = true;
        setBackendAvailable(false);
      })
      .finally(() => window.clearTimeout(timeout));

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

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
  const showNavigation = activeScreen !== 'landing' || dockTab !== 'play';
  const isBackNavigation = activeScreen === 'avatar-setup' || activeScreen === 'room-lobby';
  const showConnectionProblem = connectionStatus !== 'connected' && !isBooting;
  const connectionLabel = connectionStatus === 'degraded'
    ? 'Slow connection'
    : !isOnline || backendAvailable === false
      ? 'Offline'
      : 'Reconnecting';
  // A dropped socket is recoverable: Socket.IO reconnects in the background.
  // Only block the app when the device is offline or the initial API health
  // check confirms the backend is unavailable.
  const blockGameForNetwork = !isOnline || backendAvailable === false;

  useEffect(() => {
    if (!blockGameForNetwork) return;
    console.log('[App] Blocking game because of network error', {
      browserOnline: isOnline,
      backendAvailable,
      connectionStatus,
      hasSession: Boolean(session),
      hasRoom: Boolean(room),
    });
  }, [backendAvailable, blockGameForNetwork, connectionStatus, isOnline, room, session]);

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
      className="fixed inset-0 z-10 w-full flex items-start justify-start font-hand sm:items-center sm:justify-center"
      style={{
        background: 'radial-gradient(ellipse at 50% 20%, #c4a06a 0%, #a07840 40%, #7a5828 100%)',
      }}
    >
      {/* Phone-frame shell — aged paper */}
      <div
        className="app-shell-frame relative w-full overflow-hidden flex flex-col sm:max-w-120 md:max-w-135 sm:rounded-3xl sm:shadow-2xl sm:border paper-body sm:max-h-[800px]"
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
              onClick={dockTab !== 'play' ? () => setDockTab('play') : isBackNavigation ? handleGoBack : handleGoHome}
              className="inline-flex h-9 items-center gap-2 rounded-xl border px-3 font-hand text-sm font-bold transition-all active:scale-95"
              style={{
                color: '#6b4423',
                background: 'rgba(139,94,60,0.1)',
                borderColor: 'rgba(139,94,60,0.25)',
              }}
              aria-label={dockTab !== 'play' ? 'Back to play' : isBackNavigation ? 'Go back' : 'Go home'}
            >
              {dockTab !== 'play'
                ? <><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to {room?.status === 'in_progress' ? 'game' : 'play'}</>
                : isBackNavigation
                  ? <><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back</>
                  : <><Home className="h-4 w-4" aria-hidden="true" /> Home</>}
            </button>

            <div className="ml-auto flex items-center gap-2">
            <button
              disabled={!profileReady}
              onClick={() => handleDockSelect('notifications')}
              aria-label="Open notifications"
              title={profileReady ? 'Notifications' : 'Complete student registration to use notifications'}
              className="relative flex h-9 w-9 items-center justify-center rounded-xl border text-chalk-mark disabled:cursor-not-allowed disabled:opacity-45"
              style={{ background: 'rgba(139,94,60,0.1)', borderColor: 'rgba(139,94,60,0.25)' }}
            >
              <Bell className="h-4 w-4" />
              {roomInviteCount > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#c93226] px-1 text-[9px] font-bold leading-none text-white">{roomInviteCount > 9 ? '9+' : roomInviteCount}</span>}
            </button>

            {showConnectionProblem && (
              <div
                className="flex items-center gap-1.5 rounded-full border px-2.5 py-1"
                role="status"
                aria-label={connectionLabel}
                title={connectionLabel}
                style={{ background: '#f4ead5', borderColor: '#e2cba4', color: '#72502e' }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#b47a2f]" aria-hidden="true" />
                <span className="font-hand text-xs font-bold">{connectionLabel}</span>
              </div>
            )}
            </div>
          </header>
        )}

        {!showNavigation && (isBooting || showConnectionProblem) && (
          <div
            className="absolute left-4 z-40 flex items-center gap-1.5 rounded-full border px-2.5 py-1"
            style={{
              top: 'max(16px, env(safe-area-inset-top, 16px))',
              background: '#f4ead5',
              borderColor: '#e2cba4',
              color: '#72502e',
              backdropFilter: 'blur(8px)',
            }}
            role="status"
            aria-label={isBooting ? 'Connecting' : connectionLabel}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#b47a2f]" aria-hidden="true" />
            <span className="font-hand text-xs font-bold">{isBooting ? 'Connecting' : connectionLabel}</span>
          </div>
        )}

        <AnimatePresence>
          {incomingRoomInvite && room?.status !== 'in_progress' && (
            <motion.aside
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.28 }}
              className="absolute left-3 right-3 top-[max(3.75rem,calc(env(safe-area-inset-top)+3.25rem))] z-[60] mx-auto max-w-lg rounded-2xl border border-[#d4c9b0] bg-[#f8f3e9] p-4 shadow-xl"
              role="status"
              
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-chalk-board">Room invite</p>
                  <p className="mt-0.5 text-sm text-chalk-mark">{incomingRoomInvite.inviterName} invited you to room {incomingRoomInvite.roomCode}.</p>
                  {incomingRoomInvite.expiresAt && <p className="mt-1 text-xs text-chalk-mark">Expires {new Date(incomingRoomInvite.expiresAt).toLocaleString()}</p>}
                </div>
                <button aria-label="Dismiss invite banner" onClick={() => setIncomingRoomInvite(null)} className="rounded-full p-1 text-chalk-mark"><X className="h-4 w-4" /></button>
              </div>
              <div className="mt-3 flex gap-2">
                <button disabled={roomInviteBusy} onClick={() => void acceptRoomInvite()} className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-chalk-board px-3 text-sm font-bold text-paper disabled:opacity-50"><Check className="h-4 w-4" />Join room</button>
                <button disabled={roomInviteBusy} onClick={() => void declineRoomInvite()} className="min-h-10 rounded-xl border border-paper-ruled px-4 text-sm font-bold text-chalk-mark disabled:opacity-50">Decline</button>
                <button onClick={() => { handleDockSelect('notifications'); setIncomingRoomInvite(null); }} className="min-h-10 rounded-xl border border-paper-ruled px-3 text-sm font-bold text-chalk-mark">Inbox</button>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main content */}
        {blockGameForNetwork ? (
          <NetworkErrorScreen />
        ) : backendAvailable === null ? (
          <BootScreen key="backend-check" />
        ) : (
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
                className="flex-1 overflow-y-auto flex flex-col scrollbar-mobile-hidden"
              >
                <ErrorBoundary>
                  {dockTab === 'friends' ? <FriendsScreen onRequestCountChange={setFriendRequestCount} />
                    : dockTab === 'notifications' ? <NotificationsScreen onJoinedRoom={() => setDockTab('play')} />
                    : dockTab === 'board' ? <LeaderboardScreen />
                      : dockTab === 'profile' ? <ProfileOverlay onClose={() => setDockTab('play')} />
                        : <ScreenRouter />}
                </ErrorBoundary>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {!isBooting && !blockGameForNetwork && activeScreen !== 'avatar-setup' && activeScreen !== 'save-progress' && (
          <BottomDock
            active={dockTab}
            inMatch={room?.status === 'in_progress'}
            friendRequests={friendRequestCount}
            protectedAccess={profileReady}
            onSelect={handleDockSelect}
          />
        )}

        <div id="app-overlay-root" className="pointer-events-none absolute inset-0 z-[1000]" />

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
