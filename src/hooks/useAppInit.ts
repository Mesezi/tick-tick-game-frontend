import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { socketHandler } from '../socket/socketHandler';
import { registerEventHandlers, unregisterEventHandlers } from '../socket/eventHandlers';
import { persistenceLayer } from '../persistence/persistenceLayer';
import { apiClient } from '../api/client';
import { identifyUser, track } from '../utils/analytics';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export async function loginAsGuest(): Promise<void> {
  try {
    const deviceId = persistenceLayer.getDeviceId();
    const { token, guestId } = await apiClient.guestLogin(deviceId);
    persistenceLayer.saveToken(token);
    useGameStore.getState().setSession({
      token, userId: guestId, displayName: null,
      avatarId: '', isAuthenticated: false, deviceId,
    });
    identifyUser(guestId, { type: 'GUEST' });
    track('guest_created');
    socketHandler.connect(SOCKET_URL, token);
  } catch {
    console.warn('[AppInit] Guest login failed, retrying with fresh device ID...');
    persistenceLayer.clearToken();
    try {
      localStorage.removeItem('naija_device_id');
      const newDeviceId = persistenceLayer.getDeviceId();
      const { token, guestId } = await apiClient.guestLogin(newDeviceId);
      persistenceLayer.saveToken(token);
      useGameStore.getState().setSession({
        token, userId: guestId, displayName: null,
        avatarId: '', isAuthenticated: false, deviceId: newDeviceId,
      });
      socketHandler.connect(SOCKET_URL, token);
    } catch (err) {
      console.error('[AppInit] Guest login retry failed:', err);
    }
  }
}

export function useAppInit() {
  const [isBooting, setIsBooting] = useState(true);
  const [pendingRejoinRoom, setPendingRejoinRoom] = useState<string | null>(null);

  useEffect(() => {
    registerEventHandlers();

    const init = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      // ── Google OAuth callback ──
      // Google redirected back to root with ?code= after user approved
      if (code) {
        // Clean URL immediately so a refresh doesn't reprocess
        window.history.replaceState({}, '', window.location.pathname);

        try {
          // If a guest token exists, send it so backend can link accounts
          const existingToken = persistenceLayer.loadToken();
          if (existingToken) apiClient.setToken(existingToken);

          const res = await apiClient.googleLogin(code);
          persistenceLayer.saveToken(res.token);

          // Fetch full profile from /auth/me (has avatarId etc.)
          apiClient.setToken(res.token);
          const meRes = await apiClient.getCurrentUser();
          const { user } = meRes.data;

          useGameStore.getState().setSession({
            token: res.token,
            userId: user.id,
            displayName: user.displayName,
            avatarId: user.avatarId ?? '',
            isAuthenticated: true,
            deviceId: persistenceLayer.getDeviceId(),
          });
          identifyUser(user.id, { type: 'GOOGLE', displayName: user.displayName });
          track('auth_google_success');
          socketHandler.connect(SOCKET_URL, res.token);
          useGameStore.getState().setHasPassedLanding(true);
        } catch (err) {
          console.error('[AppInit] Google OAuth exchange failed:', err);
          // Clear code params and fall through — user lands on landing screen
        }
        return;
      }

      // ── Normal boot: restore existing session ──
      const token = persistenceLayer.loadToken();

      if (!token) {
        // No token — but if device ID exists, the user has played before
        // (token was likely purged by iOS). Re-authenticate using device ID.
        const deviceId = persistenceLayer.getDeviceId();
        const isReturningDevice = localStorage.getItem('naija_device_id') !== null;

        if (isReturningDevice) {
          try {
            const { token: newToken, guestId } = await apiClient.guestLogin(deviceId);
            persistenceLayer.saveToken(newToken);
            apiClient.setToken(newToken);

            const meRes = await apiClient.getCurrentUser();
            const { user } = meRes.data;

            useGameStore.getState().setSession({
              token: newToken,
              userId: user.id,
              displayName: user.displayName,
              avatarId: user.avatarId ?? '',
              isAuthenticated: user.type === 'GOOGLE',
              deviceId,
            });
            identifyUser(user.id, { type: user.type, displayName: user.displayName });
            track('session_restored_via_device_id');
            socketHandler.connect(SOCKET_URL, newToken);
            if (meRes.data.activeRoom) setPendingRejoinRoom(meRes.data.activeRoom);
          } catch {
            console.warn('[AppInit] Device ID re-auth failed, showing landing');
          }
        }
        return;
      }

      apiClient.setToken(token);
      try {
        const meRes = await apiClient.getCurrentUser();
        const { user } = meRes.data;
        useGameStore.getState().setSession({
          token,
          userId: user.id,
          displayName: user.displayName,
          avatarId: user.avatarId ?? '',
          isAuthenticated: user.type === 'GOOGLE',
          deviceId: persistenceLayer.getDeviceId(),
        });
        identifyUser(user.id, { type: user.type, displayName: user.displayName });
        track('session_restored');
        socketHandler.connect(SOCKET_URL, token);
        if (meRes.data.activeRoom) setPendingRejoinRoom(meRes.data.activeRoom);
      } catch {
        console.warn('[AppInit] Token invalid, clearing');
        persistenceLayer.clearToken();
        apiClient.setToken(null);
        useGameStore.getState().setSession(null);
      }
    };

    init().finally(() => setIsBooting(false));

    // Reconnect and re-sync room state on tab resume
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const sess = useGameStore.getState().session;
      if (!sess?.token) return;
      if (useGameStore.getState().connection.status === 'disconnected') {
        socketHandler.connect(SOCKET_URL, sess.token);
      }
      const roomCode = useGameStore.getState().room?.roomCode;
      if (roomCode) setTimeout(() => socketHandler.emit('join-room', { roomCode }), 300);
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      unregisterEventHandlers();
      socketHandler.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return { isBooting, pendingRejoinRoom, setPendingRejoinRoom };
}
