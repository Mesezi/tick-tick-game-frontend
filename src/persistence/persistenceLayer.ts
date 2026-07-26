import type { SessionData } from '../types';

export interface PersistenceLayer {
  saveAnswers(roomCode: string, answers: Record<string, string>): void;
  loadAnswers(roomCode: string): Record<string, string> | null;
  clearAnswers(roomCode: string): void;
  saveSession(session: SessionData): void;
  loadSession(): SessionData | null;
  clearSession(): void;
  getDeviceId(): string;
}

const ANSWERS_KEY_PREFIX = 'naija_answers_';
const SESSION_KEY = 'naija_session';
const DEVICE_ID_KEY = 'naija_device_id';

function getAnswersKey(roomCode: string): string {
  return `${ANSWERS_KEY_PREFIX}${roomCode}`;
}

/**
 * Generate or retrieve a persistent device ID for guest auth.
 */
function getOrCreateDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;

    const id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch {
    // Fallback if localStorage is unavailable
    return crypto.randomUUID();
  }
}

export const persistenceLayer: PersistenceLayer = {
  saveAnswers(roomCode: string, answers: Record<string, string>): void {
    try {
      localStorage.setItem(getAnswersKey(roomCode), JSON.stringify(answers));
    } catch (error) {
      console.warn('[PersistenceLayer] Failed to save answers:', error);
    }
  },

  loadAnswers(roomCode: string): Record<string, string> | null {
    try {
      const raw = localStorage.getItem(getAnswersKey(roomCode));
      if (raw === null) return null;
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, string>;
      }
      console.warn('[PersistenceLayer] Corrupted answers data, ignoring');
      return null;
    } catch (error) {
      console.warn('[PersistenceLayer] Failed to load answers:', error);
      return null;
    }
  },

  clearAnswers(roomCode: string): void {
    try {
      localStorage.removeItem(getAnswersKey(roomCode));
    } catch (error) {
      console.warn('[PersistenceLayer] Failed to clear answers:', error);
    }
  },

  saveSession(session: SessionData): void {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (error) {
      console.warn('[PersistenceLayer] Failed to save session:', error);
    }
  },

  loadSession(): SessionData | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw === null) return null;
      const parsed = JSON.parse(raw);
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'token' in parsed &&
        'userId' in parsed
      ) {
        return parsed as SessionData;
      }
      console.warn('[PersistenceLayer] Corrupted session data, ignoring');
      return null;
    } catch (error) {
      console.warn('[PersistenceLayer] Failed to load session:', error);
      return null;
    }
  },

  clearSession(): void {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch (error) {
      console.warn('[PersistenceLayer] Failed to clear session:', error);
    }
  },

  getDeviceId(): string {
    return getOrCreateDeviceId();
  },
};
