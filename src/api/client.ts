import type { ShareCardData } from '../types';

/**
 * REST API client for the Naija Categories Game backend.
 * Handles auth, room management, categories, and leaderboards.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const GOOGLE_AUTH_MODE_KEY = 'tick-tick-google-auth-mode';
export type GoogleAuthMode = 'login' | 'link';

export interface FriendUser { id: string; userId?: string; username?: string | null; displayName: string; avatarId?: string | null; }
export interface FriendEntry extends FriendUser { isOnline: boolean; friendshipId?: string; }
export interface FriendRequest { id: string; user?: FriendUser; requester?: FriendUser; recipient?: FriendUser; createdAt?: string; }
export interface RoomInvite { id: string; room: { code: string }; inviter: FriendUser; expiresAt: string; }

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null): void {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(path: string, options: RequestInit = {}, includeAuth = true): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (includeAuth && this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData: unknown = await response.json().catch(() => ({}));
      let message = response.statusText;
      if (typeof errorData === 'object' && errorData !== null) {
        const payload = errorData as {
          message?: unknown;
          error?: { message?: unknown };
        };
        if (typeof payload.message === 'string') {
          message = payload.message;
        } else if (typeof payload.error?.message === 'string') {
          message = payload.error.message;
        }
      }
      throw new ApiError(response.status, message, errorData);
    }

    return response.json() as Promise<T>;
  }

  // ===== Authentication =====

  async guestLogin(deviceId: string): Promise<{ token: string; guestId: string }> {
    const res = await this.request<{ success: boolean; data: { token: string; guestId: string } }>(
      '/api/auth/guest',
      {
        method: 'POST',
        body: JSON.stringify({ deviceId }),
      }
    );
    this.token = res.data.token;
    return res.data;
  }

  /**
   * Fetches the Google OAuth URL from the backend then redirects the user.
   */
  async redirectToGoogle(mode: GoogleAuthMode): Promise<void> {
    localStorage.setItem(GOOGLE_AUTH_MODE_KEY, mode);
    const redirectUri = window.location.origin; // root URL — no path, works on any host
    const res = await this.request<{ success: boolean; data: { url: string } }>(
      `/api/auth/google/redirect?redirect_uri=${encodeURIComponent(redirectUri)}`,
      {},
      mode === 'link',
    );
    window.location.href = res.data.url;
  }

  consumeGoogleAuthMode(): GoogleAuthMode {
    try {
      const mode = localStorage.getItem(GOOGLE_AUTH_MODE_KEY);
      localStorage.removeItem(GOOGLE_AUTH_MODE_KEY);
      return mode === 'link' ? 'link' : 'login';
    } catch {
      return 'login';
    }
  }

  /**
   * Exchanges a Google OAuth code for a JWT.
   * If a guest token is set (Authorization header), backend links the accounts.
   * Response includes `linked: true` if a guest account was just upgraded.
   */
  async googleLogin(code: string): Promise<{ token: string; user: { id: string; email: string; displayName: string; username: string | null }; linked: boolean }> {
    const res = await this.request<{
      success: boolean;
      data: { token: string; user: { id: string; email: string; displayName: string; username: string | null }; linked: boolean };
    }>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
    this.token = res.data.token;
    return res.data;
  }

  async deleteAccount(): Promise<void> {
    await this.request<{ success: boolean }>('/api/auth/account', { method: 'DELETE' });
    this.token = null;
  }

  async getCurrentUser() {
    return this.request<{
      success: boolean;
      data: {
        user: {
          id: string;
          type: 'GUEST' | 'GOOGLE';
          email: string | null;
          displayName: string | null;
          username: string | null;
          avatarId: string | null;
          totalScore: number;
          weeklyScore: number;
          createdAt: string;
        };
        activeRoom: string | null;
      };
    }>('/api/auth/me');
  }

  async getFriends(query = '', limit = 20, cursor?: string) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (query) params.set('query', query);
    if (cursor) params.set('cursor', cursor);
    return this.request<{ success: boolean; data: { friends: FriendEntry[]; nextCursor: string | null } }>(`/api/friends?${params}`);
  }

  async getFriendRequests(direction: 'incoming' | 'outgoing', limit = 20, cursor?: string) {
    const params = new URLSearchParams({ direction, limit: String(limit) });
    if (cursor) params.set('cursor', cursor);
    return this.request<{ success: boolean; data: { requests: FriendRequest[]; nextCursor: string | null } }>(`/api/friends/requests?${params}`);
  }

  async searchFriendUsers(query: string, limit = 20, cursor?: string) {
    const params = new URLSearchParams({ query, limit: String(limit) });
    if (cursor) params.set('cursor', cursor);
    return this.request<{ success: boolean; data: { items: FriendUser[]; nextCursor: string | null } }>(`/api/friends/users/search?${params}`);
  }

  async sendFriendRequest(userId: string) {
    return this.request<{ success: boolean; data: unknown }>('/api/friends/requests', { method: 'POST', body: JSON.stringify({ userId }) });
  }

  async respondFriendRequest(id: string, action: 'accept' | 'decline') {
    return this.request<{ success: boolean; data: unknown }>(`/api/friends/requests/${encodeURIComponent(id)}/${action}`, { method: 'POST' });
  }

  async removeFriend(userId: string) {
    return this.request<{ success: boolean }>(`/api/friends/${encodeURIComponent(userId)}`, { method: 'DELETE' });
  }

  async getRoomInvites() {
    return this.request<{ success: boolean; data: { invites: RoomInvite[] } }>('/api/room-invites');
  }

  async sendRoomInvite(roomCode: string, inviteeId: string) {
    return this.request<{ success: boolean; data: { inviteId?: string; invite?: { id: string }; [key: string]: unknown } }>(`/api/rooms/${encodeURIComponent(roomCode)}/invites`, { method: 'POST', body: JSON.stringify({ inviteeId }) });
  }

  async respondRoomInvite(id: string, action: 'accept' | 'decline') {
    return this.request<{ success: boolean; data: { room?: { code: string }; [key: string]: unknown } }>(`/api/room-invites/${encodeURIComponent(id)}/${action}`, { method: 'POST' });
  }

  async cancelRoomInvite(id: string) {
    return this.request<{ success: boolean }>(`/api/room-invites/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  async getStats() {
    return this.request<{
      success: boolean;
      data: {
        stats: {
          gamesPlayed: number;
          gamesWon: number;
          correctWords: number;
          wrongWords: number;
          misspelledWords: number;
          uniqueWords: number;
          firstPlaceCount: number;
          secondPlaceCount: number;
          thirdPlaceCount: number;
          bestRoundScore: number;
          bestMatchScore: number;
          currentWinStreak: number;
          bestWinStreak: number;
          totalScore: number;
          weeklyScore: number;
        };
      };
    }>('/api/auth/stats');
  }

  async checkUsernameAvailability(username: string) {
    const params = new URLSearchParams({ username });
    return this.request<{ success: boolean; data: { available?: boolean; status?: string; reason?: string } }>(`/api/auth/usernames/availability?${params}`);
  }

  async updateProfile(profile: { displayName: string; avatarId: string; username?: string }) {
    return this.request<{
      success: boolean;
      data: {
        displayName: string;
        avatarId: string;
        username?: string | null;
      };
    }>('/api/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(profile),
    });
  }

  // ===== Category Packs =====

  async getCategoryPacks() {
    return this.request<{
      success: boolean;
      data: {
        packs: { id: string; name: string; description: string; categories: string[]; createdAt: string }[];
      };
    }>('/api/categories/packs');
  }

  async getCategoryPack(id: string) {
    return this.request<{
      success: boolean;
      data: { id: string; name: string; categories: string[] };
    }>(`/api/categories/packs/${id}`);
  }

  // ===== Room Management =====

  async createRoom(params: {
    categoryPackId: string;
    roundDuration: number;
    totalRounds: number;
    displayName: string;
  }) {
    return this.request<{
      success: boolean;
      data: {
        room: {
          id: string;
          code: string;
          status: string;
          hostId: string;
          categoryPackId: string;
          roundDuration: number;
          totalRounds: number;
          currentRound: number;
          currentLetter: string | null;
          createdAt: string;
          updatedAt: string;
          players: {
            id: string;
            userId: string;
            displayName: string;
            status: string;
            joinedAt: string;
          }[];
          categoryPack: {
            id: string;
            name: string;
            description: string;
          };
        };
      };
    }>('/api/rooms', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async joinRoom(code: string, displayName: string) {
    return this.request<{ success: boolean; data: unknown }>(
      `/api/rooms/${code}/join`,
      {
        method: 'POST',
        body: JSON.stringify({ roomCode: code, displayName }),
      }
    );
  }

  async getRoomState(code: string) {
    return this.request<{ success: boolean; data: unknown }>(`/api/rooms/${code}`);
  }

  async getShareCardData(roomCode: string): Promise<ShareCardData> {
    const response = await this.request<{ success: boolean; data: ShareCardData }>(
      `/api/rooms/${encodeURIComponent(roomCode)}/share-card`,
      { headers: { Accept: 'application/json' } },
    );
    const card = response.data;
    if (
      card?.schemaVersion !== 2 ||
      card.roomCode !== roomCode ||
      !Number.isFinite(card.durationMs) ||
      !Number.isFinite(card.roundsPlayed) ||
      !Array.isArray(card.players) ||
      !Array.isArray(card.highlights) ||
      card.players.some((player) =>
        !Number.isFinite(player.rank) ||
        typeof player.displayName !== 'string' ||
        !Number.isFinite(player.totalScore),
      ) ||
      card.highlights.some((highlight) =>
        !Number.isFinite(highlight.rank) ||
        typeof highlight.playerName !== 'string' ||
        typeof highlight.word !== 'string' ||
        typeof highlight.category !== 'string' ||
        typeof highlight.letter !== 'string' ||
        !Number.isFinite(highlight.roundNumber) ||
        !Number.isFinite(highlight.score),
      )
    ) {
      throw new Error('The share card response has an invalid format.');
    }
    return card;
  }

  async leaveRoom(roomCode: string) {
    return this.request<{ success: boolean }>(`/api/rooms/${roomCode}/leave`, {
      method: 'POST',
    });
  }

  async quickMatch(displayName: string) {
    return this.request<{
      success: boolean;
      data: {
        room: {
          code: string;
          isPublic: boolean;
          [key: string]: unknown;
        };
      };
    }>('/api/rooms/quick-match', {
      method: 'POST',
      body: JSON.stringify({ displayName }),
    });
  }

  // ===== Leaderboard =====

  async getLeaderboard(type: 'all-time' | 'weekly', page = 1, limit = 20) {
    return this.request<{
      success: boolean;
      data: {
        entries: {
          id: string;
          displayName: string | null;
          type: 'REGISTERED' | 'GUEST';
          totalScore: number;
          weeklyScore: number;
        }[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      };
    }>(`/api/leaderboard/${type}?page=${page}&limit=${limit}`);
  }

  async getMyLeaderboardRank(type: 'all-time' | 'weekly') {
    return this.request<{
      success: boolean;
      data: {
        userRank: {
          rank: number;
          id: string;
          displayName: string;
          avatarId: string;
          totalScore: number;
          weeklyScore: number;
        } | null;
      };
    }>(`/api/leaderboard/${type}/me`);
  }
}

export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// Singleton instance
export const apiClient = new ApiClient();
