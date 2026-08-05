/**
 * REST API client for the Naija Categories Game backend.
 * Handles auth, room management, categories, and leaderboards.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null): void {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(response.status, errorData.message || response.statusText, errorData);
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
  async redirectToGoogle(): Promise<void> {
    const redirectUri = window.location.origin; // root URL — no path, works on any host
    const res = await this.request<{ success: boolean; data: { url: string } }>(
      `/api/auth/google/redirect?redirect_uri=${encodeURIComponent(redirectUri)}`
    );
    window.location.href = res.data.url;
  }

  /**
   * Exchanges a Google OAuth code for a JWT.
   * If a guest token is set (Authorization header), backend links the accounts.
   * Response includes `linked: true` if a guest account was just upgraded.
   */
  async googleLogin(code: string): Promise<{ token: string; user: { id: string; email: string; displayName: string }; linked: boolean }> {
    const res = await this.request<{
      success: boolean;
      data: { token: string; user: { id: string; email: string; displayName: string }; linked: boolean };
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
          avatarId: string | null;
          totalScore: number;
          weeklyScore: number;
          createdAt: string;
        };
        activeRoom: string | null;
      };
    }>('/api/auth/me');
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

  async updateProfile(profile: { displayName: string; avatarId: string }) {
    return this.request<{
      success: boolean;
      data: {
        displayName: string;
        avatarId: string;
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
