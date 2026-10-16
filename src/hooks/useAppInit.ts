import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { socketHandler } from '../socket/socketHandler';
import { registerEventHandlers, unregisterEventHandlers } from '../socket/eventHandlers';
import { persistenceLayer } from '../persistence/persistenceLayer';
import { ApiError, apiClient } from '../api/client';
import { identifyUser, track } from '../utils/analytics';
import { showToast } from '../components/toastStore';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const INVITE_ROOM_STORAGE_KEY = 'tick-tick-invite-room';

function getInviteRoomCode(): string | null {
  const match = window.location.pathname.match(/^\/join\/([a-zA-Z0-9]{6})\/?$/);
  const pathCode = match?.[1].toUpperCase();
  const storedCode = sessionStorage.getItem(INVITE_ROOM_STORAGE_KEY);
  return pathCode ?? storedCode;
}

export async function loginAsGuest(): Promise<void> {
  try {
    const deviceId = persistenceLayer.getDeviceId();
    const { token, guestId } = await apiClient.guestLogin(deviceId);
    persistenceLayer.saveToken(token);
    useGameStore.getState().setSession({
      token, userId: guestId, email: null, displayName: null,
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
        token, userId: guestId, email: null, displayName: null,
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
  const [inviteRoomCode, setInviteRoomCode] = useState<string | null>(null);

  useEffect(() => {
    registerEventHandlers();

    const init = async () => {
      const inviteCode = getInviteRoomCode();
      if (inviteCode) {
        sessionStorage.setItem(INVITE_ROOM_STORAGE_KEY, inviteCode);
        setInviteRoomCode(inviteCode);
        useGameStore.getState().setHasPassedLanding(true);
      }

      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      // ── Google OAuth callback ──
      // Google redirected back to root with ?code= after user approved
      if (code) {
        // Clean URL immediately so a refresh doesn't reprocess
        window.history.replaceState({}, '', window.location.pathname);
        // Keep the pre-OAuth session available if account linking is rejected.
        const existingToken = persistenceLayer.loadToken();

        try {
          // If a guest token exists, send it so backend can link accounts
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
            email: user.email,
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
          const failureMessage = err instanceof Error
            ? err.message
            : 'Google sign-in failed. Please try again.';
          showToast(
            err instanceof ApiError && err.status === 409
              ? `${failureMessage}. Your current session is still active.`
              : failureMessage,
            'error',
          );
          // A conflict means this Google account belongs to a different user.
          // Rehydrate the original session after the OAuth page reload.
          if (err instanceof ApiError && err.status === 409 && existingToken) {
            try {
              apiClient.setToken(existingToken);
              const meRes = await apiClient.getCurrentUser();
              const { user } = meRes.data;
              useGameStore.getState().setSession({
                token: existingToken,
                userId: user.id,
                email: user.email,
                displayName: user.displayName,
                avatarId: user.avatarId ?? '',
                isAuthenticated: user.type === 'GOOGLE',
                deviceId: persistenceLayer.getDeviceId(),
              });
              identifyUser(user.id, { type: user.type, displayName: user.displayName });
              socketHandler.connect(SOCKET_URL, existingToken);
              useGameStore.getState().setHasPassedLanding(true);
              if (meRes.data.activeRoom && !inviteCode) {
                setPendingRejoinRoom(meRes.data.activeRoom);
              }
            } catch (restoreError) {
              console.error('[AppInit] Could not restore session after Google account conflict:', restoreError);
            }
          }
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
            const { token: newToken } = await apiClient.guestLogin(deviceId);
            persistenceLayer.saveToken(newToken);
            apiClient.setToken(newToken);

            const meRes = await apiClient.getCurrentUser();
            const { user } = meRes.data;

            useGameStore.getState().setSession({
              token: newToken,
              userId: user.id,
              email: user.email,
              displayName: user.displayName,
              avatarId: user.avatarId ?? '',
              isAuthenticated: user.type === 'GOOGLE',
              deviceId,
            });
            identifyUser(user.id, { type: user.type, displayName: user.displayName });
            track('session_restored_via_device_id');
            socketHandler.connect(SOCKET_URL, newToken);
            if (meRes.data.activeRoom && !inviteCode) setPendingRejoinRoom(meRes.data.activeRoom);
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
          email: user.email,
          displayName: user.displayName,
          avatarId: user.avatarId ?? '',
          isAuthenticated: user.type === 'GOOGLE',
          deviceId: persistenceLayer.getDeviceId(),
        });
        identifyUser(user.id, { type: user.type, displayName: user.displayName });
        track('session_restored');
        socketHandler.connect(SOCKET_URL, token);
        if (meRes.data.activeRoom && !inviteCode) setPendingRejoinRoom(meRes.data.activeRoom);
      } catch {
        console.warn('[AppInit] Token invalid, clearing');
        persistenceLayer.clearToken();
        apiClient.setToken(null);
        useGameStore.getState().setSession(null);
      }
    };

    init().finally(() => setIsBooting(false));

    return () => {
      unregisterEventHandlers();
      socketHandler.disconnect();
    };
  }, []);

  return {
    isBooting,
    pendingRejoinRoom,
    setPendingRejoinRoom,
    inviteRoomCode,
    setInviteRoomCode,
  };
}
