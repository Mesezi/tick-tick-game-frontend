import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { socketHandler } from '../socket/socketHandler';
import { registerEventHandlers, unregisterEventHandlers } from '../socket/eventHandlers';
import { persistenceLayer } from '../persistence/persistenceLayer';
import { apiClient } from '../api/client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export async function loginAsGuest(): Promise<void> {
  try {
    const deviceId = persistenceLayer.getDeviceId();
    const { token, guestId } = await apiClient.guestLogin(deviceId);
    persistenceLayer.saveToken(token);
    useGameStore.getState().setSession({
      token,
      userId: guestId,
      displayName: null,
      avatarId: '',
      isAuthenticated: false,
      deviceId,
    });
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
        token,
        userId: guestId,
        displayName: null,
        avatarId: '',
        isAuthenticated: false,
        deviceId: newDeviceId,
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
      const token = persistenceLayer.loadToken();
      if (!token) return; // No token → show landing, user picks guest or Google

      apiClient.setToken(token);

      try {
        // All profile data comes from the server — token is the only local state
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

        socketHandler.connect(SOCKET_URL, token);

        if (meRes.data.activeRoom) {
          setPendingRejoinRoom(meRes.data.activeRoom);
        }
      } catch {
        // Token stale or invalid — clear and show landing
        console.warn('[AppInit] Token invalid, clearing');
        persistenceLayer.clearToken();
        apiClient.setToken(null);
        useGameStore.getState().setSession(null);
      }
    };

    init().finally(() => setIsBooting(false));

    // Re-sync on tab resume after mobile suspension
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const sess = useGameStore.getState().session;
      if (!sess?.token) return;

      if (useGameStore.getState().connection.status === 'disconnected') {
        socketHandler.connect(SOCKET_URL, sess.token);
      }

      const roomCode = useGameStore.getState().room?.roomCode;
      if (roomCode) {
        setTimeout(() => socketHandler.emit('join-room', { roomCode }), 300);
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
