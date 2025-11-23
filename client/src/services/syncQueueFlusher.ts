/**
 * Sync Queue Flusher
 * - Flushes IndexedDB-backed sync operations when connectivity is available
 * - Focus: leaderboard:submit (optional server)
 * - Used as a safety net when Background Sync is unavailable or not configured
 */

import { repos } from '../data';

type LeaderboardScope = 'global' | 'friends' | 'weekly' | 'monthly';

interface LeaderboardSubmitPayload {
  scope: LeaderboardScope;
  score: number;
  user: { id: string; username: string; token?: string };
  queuedAt: number;
  requestId?: string;
}

function supportsBackgroundSync(): boolean {
  try {
    return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'SyncManager' in window;
  } catch {
    return false;
  }
}

async function flushLeaderboardSubmit(row: any): Promise<boolean> {
  const payload = row?.payload as LeaderboardSubmitPayload | undefined;
  if (!payload || !payload.user || !payload.user.id) {
    // Malformed row; drop it to avoid infinite retries
    await repos.syncQueue.remove(row.queueId);
    return true;
  }

  // Use an idempotency key to prevent double submissions if Workbox also replays
  const requestId =
    payload.requestId ??
    `lb_${payload.user.id}_${payload.scope}_${payload.score}_${payload.queuedAt}`;

  try {
    const res = await fetch('/api/leaderboard/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(payload.user.token ? { Authorization: `Bearer ${payload.user.token}` } : {}),
        'X-Idempotency-Key': requestId,
      },
      body: JSON.stringify({
        scope: payload.scope,
        score: payload.score,
        userId: payload.user.id,
        username: payload.user.username,
        requestId,
      }),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    await repos.syncQueue.remove(row.queueId);
    return true;
  } catch (err: any) {
    // Record attempt and keep for a later retry
    await repos.syncQueue.markAttempt(row.queueId, String(err?.message ?? err));
    return false;
  }
}

/**
 * Flush a batch of queued operations.
 * Returns the number of successfully flushed items.
 */
export async function flushSyncQueueOnce(limit = 50): Promise<number> {
  const rows = await repos.syncQueue.list(limit);
  let ok = 0;

  for (const row of rows) {
    try {
      // Limit retries to prevent unbounded growth (drop after 8 attempts)
      if ((row.attemptCount ?? 0) > 8) {
        await repos.syncQueue.remove(row.queueId);
        continue;
      }

      switch (row.opType) {
        case 'leaderboard:submit':
          if (await flushLeaderboardSubmit(row)) ok++;
          break;

        default:
          // Unknown opType: drop to avoid stuck queue
          await repos.syncQueue.remove(row.queueId);
          break;
      }
    } catch (err: any) {
      await repos.syncQueue.markAttempt(row.queueId, String(err?.message ?? err));
    }
  }

  return ok;
}

/**
 * Initialize queue flushing:
 * - Flush on app start (if online)
 * - Flush on 'online' event
 * - Optional periodic flush every few minutes
 */
export function initSyncQueueFlusher(options?: { intervalMs?: number }) {
  if (typeof window === 'undefined') return;

  const doFlush = async () => {
    // If Background Sync is available, prefer it and skip client flusher to avoid duplication
    if (supportsBackgroundSync()) return;

    if (navigator.onLine) {
      try {
        await flushSyncQueueOnce(100);
      } catch {
        // ignore
      }
    }
  };

  // Initial attempt
  void doFlush();

  // When connection is restored
  window.addEventListener('online', () => {
    void doFlush();
  });

  // Periodic flush as a safety net (default 2 minutes)
  const intervalMs = options?.intervalMs ?? 2 * 60 * 1000;
  const timer = window.setInterval(() => {
    void doFlush();
  }, intervalMs);

  // Expose a cleanup for tests if needed
  (window as any).__syncQueueFlusherCleanup = () => clearInterval(timer);
}

// For manual triggering (tests or UI)
export async function flushSyncQueueNow() {
  return flushSyncQueueOnce(100);
}