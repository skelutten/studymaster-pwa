import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getLeaderboardService } from '../../services/leaderboard';
import { repos } from '../../data';
import type { AuthenticatedUser } from '../../services/userDataService';

// Cache entry shape matches LeaderboardCacheRow['entries']
function mkCacheEntries() {
  return [
    { rank: 1, name: 'Alice', anonymizedId: 'u_alice', score: 1200 },
    { rank: 2, name: 'Bob', anonymizedId: 'u_bob', score: 950 },
  ];
}

describe('Leaderboard cache TTL fallback', () => {
  // Use an intermediate any to avoid excess property checks on literal
  const rawUser = {
    id: 'u_test',
    email: 'user@test.local',
    username: 'Test User',
    level: 1,
    totalXp: 0,
    coins: 0,
    gems: 0,
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
    preferences: {
      theme: 'light',
      language: 'en',
      notifications: false,
      soundEffects: false,
      dailyGoal: 10,
      timezone: 'UTC',
    },
    tokenType: 'mock',
    token: 't0',
  };
  const user: AuthenticatedUser = rawUser;

  beforeEach(async () => {
    vi.restoreAllMocks();
    // Clear leaderboard cache keys we touch
    // Note: repos doesn't expose clear; overwrite with expired/empty where needed in tests
  });

  it('returns cached values when remote fails even if TTL expired (ignoreTTL fallback)', async () => {
    // Arrange: seed expired cache rows for all scopes
    const expiredTs = Date.now() - 1000 * 60 * 60; // 1h ago
    const ttlMs = 500; // 0.5s TTL, definitely expired

    await repos.leaderboardCache.set({
      scope: 'global:global',
      entries: mkCacheEntries(),
      ttlMs,
      fetchedAt: expiredTs,
    });
    await repos.leaderboardCache.set({
      scope: 'friends:global',
      entries: mkCacheEntries(),
      ttlMs,
      fetchedAt: expiredTs,
    });
    await repos.leaderboardCache.set({
      scope: 'weekly:global',
      entries: mkCacheEntries(),
      ttlMs,
      fetchedAt: expiredTs,
    });
    await repos.leaderboardCache.set({
      scope: 'monthly:global',
      entries: mkCacheEntries(),
      ttlMs,
      fetchedAt: expiredTs,
    });

    // Remote fetch fails
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network down'));

    const provider = getLeaderboardService();

    // Act
    const data = await provider.fetchAll(user);

    // Assert: fallback returned cache despite TTL expiry (provider uses ignoreTTL=true on fallback)
    expect(Array.isArray(data.global)).toBe(true);
    expect(data.global.length).toBeGreaterThan(0);
    expect(data.global[0].username).toBe('Alice');
    expect(data.friends.length).toBeGreaterThan(0);
    expect(data.weekly.length).toBeGreaterThan(0);
    expect(data.monthly.length).toBeGreaterThan(0);
  });

  it('uses network data and refreshes cache when remote succeeds', async () => {
    // Mock a successful /api/leaderboard result
    const payload = {
      global: [{ userId: 'net1', username: 'Net A', score: 2000, rank: 1, change: 0 }],
      friends: [{ userId: 'net2', username: 'Net B', score: 1500, rank: 1, change: 0 }],
      weekly: [{ userId: 'net3', username: 'Net C', score: 500, rank: 1, change: 0 }],
      monthly: [{ userId: 'net4', username: 'Net D', score: 900, rank: 1, change: 0 }],
    };
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } })
    );

    const provider = getLeaderboardService();
    const data = await provider.fetchAll(user);

    expect(data.global[0].username).toBe('Net A');

    // Verify cache was refreshed with new content (read via repos)
    const cached = await repos.leaderboardCache.get('global:global', { ignoreTTL: true });
    expect(cached).toBeTruthy();
    expect(cached?.entries[0].name).toBe('Net A');
  });
});