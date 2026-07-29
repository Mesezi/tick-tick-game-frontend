import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { socketHandler } from '../socket/socketHandler';
import { registerEventHandlers, unregisterEventHandlers } from '../socket/eventHandlers';
import { persistenceLayer } from '../persistence/persistenceLayer';
import { apiClient } from '../api/client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function loginAsGuest(): Promise<void> {
  try {
    const deviceId = persistenceLayer.getDeviceId();
    const { token, guestId } = await apiClient.guestLogin(deviceId);
    useGameStore.getState().setSession({
      token, userId: guestId, displayName: null,
      avatarId: '', isAuthenticated: false, deviceId,
    });
    socketHandler.connect(SOCKET_URL, token);
  } catch {
    console.warn('[AppInit] Guest login failed, retrying with new device ID...');
    persistenceLayer.clearSession();
    try {
      localStorage.removeItem('naija_device_id');
      const newDeviceId = persistenceLayer.getDeviceId();
      const { token, guestId } = await apiClient.guestLogin(newDeviceId);
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

/**
 * Handles app boot: session hydration, token verification, guest login, socket connect.
 * Returns isBooting and pendingRejoinRoom.
 */
export function useAppInit() {
  const [isBooting, setIsBooting] = useState(true);
  const [pendingRejoinRoom, setPendingRejoinRoom] = useState<string | null>(null);

  useEffect(() => {
    registerEventHandlers();

    // Optimistically restore from localStorage so UI isn't blank during async init
    const saved = persistenceLayer.loadSession();
    if (saved?.token && !useGameStore.getState().session) {
      apiClient.setToken(saved.token);
      useGameStore.getState().setSession(saved);
    }

    const init = async () => {
      if (saved?.token) {
        apiClient.setToken(saved.token);
        try {
          const meRes = await apiClient.getCurrentUser();
          const { user } = meRes.data;
          useGameStore.getState().setSession({
            token: saved.token,
            userId: user.id ?? saved.userId,
            displayName: user.displayName ?? saved.displayName,
            avatarId: user.avatarId ?? saved.avatarId,
            isAuthenticated: user.type === 'GOOGLE' || saved.isAuthenticated,
            deviceId: saved.deviceId,
          });
          socketHandler.connect(SOCKET_URL, saved.token);
          if (meRes.data.activeRoom) setPendingRejoinRoom(meRes.data.activeRoom);
        } catch {
          console.warn('[AppInit] Token invalid, starting fresh');
          persistenceLayer.clearSession();
          apiClient.setToken(null);
          await loginAsGuest();
        }
      } else {
        await loginAsGuest();
      }
    };

    init().finally(() => setIsBooting(false));

    // Reconnect socket when tab becomes visible after mobile suspension
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const sess = useGameStore.getState().session;
      if (!sess?.token) return;
      if (useGameStore.getState().connection.status === 'disconnected') {
        socketHandler.connect(SOCKET_URL, sess.token);
      }
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
