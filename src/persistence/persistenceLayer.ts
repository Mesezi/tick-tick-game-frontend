export interface PersistenceLayer {
  saveAnswers(roomCode: string, answers: Record<string, string>): void;
  loadAnswers(roomCode: string): Record<string, string> | null;
  clearAnswers(roomCode: string): void;
  saveToken(token: string): void;
  loadToken(): string | null;
  clearToken(): void;
  getDeviceId(): string;
}

const ANSWERS_KEY_PREFIX = 'naija_answers_';
const TOKEN_KEY = 'naija_token';
const DEVICE_ID_KEY = 'naija_device_id';

function getAnswersKey(roomCode: string): string {
  return `${ANSWERS_KEY_PREFIX}${roomCode}`;
}

function getOrCreateDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export const persistenceLayer: PersistenceLayer = {
  saveAnswers(roomCode, answers) {
    try {
      localStorage.setItem(getAnswersKey(roomCode), JSON.stringify(answers));
    } catch (e) {
      console.warn('[PersistenceLayer] Failed to save answers:', e);
    }
  },

  loadAnswers(roomCode) {
    try {
      const raw = localStorage.getItem(getAnswersKey(roomCode));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, string>;
      }
      return null;
    } catch {
      return null;
    }
  },

  clearAnswers(roomCode) {
    try {
      localStorage.removeItem(getAnswersKey(roomCode));
    } catch { /* ignore */ }
  },

  saveToken(token) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch (e) {
      console.warn('[PersistenceLayer] Failed to save token:', e);
    }
  },

  loadToken() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  clearToken() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch { /* ignore */ }
  },

  getDeviceId() {
    return getOrCreateDeviceId();
  },
};
