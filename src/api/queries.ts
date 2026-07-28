import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';

// ===== Query Keys =====

export const queryKeys = {
  leaderboard: (type: 'all-time' | 'weekly', page: number) =>
    ['leaderboard', type, page] as const,
  myRank: (type: 'all-time' | 'weekly') =>
    ['leaderboard', type, 'me'] as const,
  categoryPacks: ['categoryPacks'] as const,
  currentUser: ['currentUser'] as const,
  stats: ['stats'] as const,
};

// ===== Leaderboard =====

export function useLeaderboard(type: 'all-time' | 'weekly', page = 1, limit = 10) {
  return useQuery({
    queryKey: queryKeys.leaderboard(type, page),
    queryFn: () => apiClient.getLeaderboard(type, page, limit),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

export function useMyLeaderboardRank(type: 'all-time' | 'weekly', enabled = true) {
  return useQuery({
    queryKey: queryKeys.myRank(type),
    queryFn: () => apiClient.getMyLeaderboardRank(type),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    enabled,
  });
}

// ===== Category Packs =====

export function useCategoryPacks() {
  return useQuery({
    queryKey: queryKeys.categoryPacks,
    queryFn: () => apiClient.getCategoryPacks(),
    staleTime: 5 * 60_000, // 5 min — packs rarely change
    gcTime: 30 * 60_000, // keep in cache for 30 min
  });
}

// ===== Current User =====

export function useCurrentUser(enabled = true) {
  return useQuery({
    queryKey: queryKeys.currentUser,
    queryFn: () => apiClient.getCurrentUser(),
    staleTime: 60_000, // 1 min
    gcTime: 5 * 60_000,
    enabled,
  });
}

// ===== Player Stats =====

export function usePlayerStats(enabled = true) {
  return useQuery({
    queryKey: queryKeys.stats,
    queryFn: () => apiClient.getStats(),
    staleTime: 60_000, // 1 min
    gcTime: 5 * 60_000,
    enabled,
  });
}
