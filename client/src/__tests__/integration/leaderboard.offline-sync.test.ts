import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getLeaderboardService } from '../../services/leaderboard';
import { flushSyncQueueOnce } from '../../services/syncQueueFlusher';
import { repos } from '../../data';
import type { AuthenticatedUser } from '../../services/userDataService';

describe('Leaderboard submit offline queue and flush', () => {
  const user: AuthenticatedUser = {
    id: 'u1',
    email: 'u1@example.com',
    username: 'User One',
    // Fields required by shared/types User
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
    // Auth fields
    tokenType: 'mock',
    token: 't0',
  };

  beforeEach(async () => {
    // Reset fetch mock between tests
    vi.restoreAllMocks();
    // Ensure DB tables exist (repos will open lazily)
    // Clear syncQueue by removing all rows
    const rows = await repos.syncQueue.list(1000);
    for (const r of rows) {
      await repos.syncQueue.remove(r.queueId);
    }
  });

  it('enqueues submit when network fails and flushes later on success', async () => {
    // Simulate network failure on first attempt
    const fetchMock = vi.spyOn(window, 'fetch').mockRejectedValueOnce(new Error('offline'));

    const provider = getLeaderboardService();

    // Submit while "offline" (network throws)
    await provider.submit(user, 'weekly', 123);

    // A row should be queued
    let queued = await repos.syncQueue.list(10);
    expect(queued.length).toBe(1);
    expect(queued[0].opType).toBe('leaderboard:submit');

    // Now simulate network back online -> successful POST
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    );

    // Flush queue
    const flushedCount = await flushSyncQueueOnce(10);
    expect(flushedCount).toBe(1);

    // Queue should be empty
    queued = await repos.syncQueue.list(10);
    expect(queued.length).toBe(0);

    // fetch should have been called twice: once on submit, once on flush
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('records attempt and keeps item when server returns non-2xx', async () => {
    // First call from submit throws to enqueue
    const fetchMock = vi.spyOn(window, 'fetch').mockRejectedValueOnce(new Error('offline'));

    const provider = getLeaderboardService();
    await provider.submit(user, 'monthly', 777);

    const queued = await repos.syncQueue.list(10);
    expect(queued.length).toBe(1);
    const qid = queued[0].queueId;

    // Simulate server 500 on flush
    fetchMock.mockResolvedValueOnce(new Response('fail', { status: 500 }));

    const flushedCount = await flushSyncQueueOnce(10);
    expect(flushedCount).toBe(0);

    // The item should still be there with attemptCount incremented
    const after = await repos.syncQueue.list(10);
    expect(after.length).toBe(1);
    const row = after.find(r => r.queueId === qid)!;
    expect(row.attemptCount).toBeGreaterThanOrEqual(1);
  });
});