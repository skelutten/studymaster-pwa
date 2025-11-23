/**
 * Leaderboard Provider (Phase 2/3)
 * - Local-cached, offline-first provider with optional remote fetch/submit
 * - Caches leaderboard data in IndexedDB (leaderboardCache) with TTL
 * - Queues submissions in IndexedDB (syncQueue) when offline or on failure
 */

import { repos } from '../data';
import type { AuthenticatedUser, LeaderboardData, LeaderboardEntry } from './userDataService';
import { userDataService } from './userDataService';

type Scope = 'global' | 'friends' | 'weekly' | 'monthly';

export interface LeaderboardProvider {
  fetchAll(user: AuthenticatedUser): Promise<LeaderboardData>;
  fetchScope(user: AuthenticatedUser, scope: Scope): Promise<LeaderboardEntry[]>;
  submit(user: AuthenticatedUser, scope: Scope, score: number): Promise<void>;
}

function toScopeKey(scope: Scope): string {
  if (scope === 'friends') {
    return `friends:global`;
  }
  return `${scope}:global`;
}

const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Map app entries -> cache entry shape
function toCacheEntries(entries: LeaderboardEntry[]): { rank: number; name: string; anonymizedId: string; score: number }[] {
  return entries.map(e => ({
    rank: e.rank,
    name: e.username,
    anonymizedId: e.userId, // use userId as anonymizedId for local caching
    score: e.score,
  }));
}

// Map cache entry shape -> app entries
function fromCacheEntries(entries: { rank: number; name: string; anonymizedId: string; score: number }[]): LeaderboardEntry[] {
  return entries.map((e) => ({
    userId: e.anonymizedId,
    username: e.name,
    score: e.score,
    rank: e.rank,
    change: 0, // cached rows don't track change; show neutral; remote fetch will provide real values
  }));
}

async function cacheWrite(scope: Scope, entries: LeaderboardEntry[], ttlMs: number = DEFAULT_TTL_MS): Promise<void> {
  await repos.leaderboardCache.set({
    scope: toScopeKey(scope),
    entries: toCacheEntries(entries),
    ttlMs,
  });
}

async function cacheRead(scope: Scope, ignoreTTL = false): Promise<LeaderboardEntry[] | null> {
  const row = await repos.leaderboardCache.get(toScopeKey(scope), { ignoreTTL });
  return row ? fromCacheEntries(row.entries) : null;
}

async function tryRemoteFetchAll(user: AuthenticatedUser): Promise<LeaderboardData> {
  return userDataService.getLeaderboardData(user);
}

async function tryRemoteSubmit(user: AuthenticatedUser, scope: Scope, score: number, requestId: string): Promise<void> {
  const response = await fetch('/api/leaderboard/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(user.token ? { Authorization: `Bearer ${user.token}` } : {}),
      'X-Idempotency-Key': requestId,
    },
    body: JSON.stringify({ scope, score, userId: user.id, username: user.username, requestId }),
  });
  if (!response.ok) {
    throw new Error(`Remote submit failed: ${response.status}`);
  }
}

async function enqueueSubmit(scope: Scope, score: number, user: AuthenticatedUser): Promise<void> {
  await repos.syncQueue.enqueue({
    opType: 'leaderboard:submit',
    payload: {
      scope,
      score,
      user: { id: user.id, username: user.username, token: user.token },
      queuedAt: Date.now(),
    },
  });
}

// Detect if Background Sync is supported; when true, Workbox will queue failed POSTs
function supportsBackgroundSync(): boolean {
  try {
    return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'SyncManager' in window;
  } catch {
    return false;
  }
}

class LocalCachedLeaderboardProvider implements LeaderboardProvider {
  async fetchAll(user: AuthenticatedUser): Promise<LeaderboardData> {
    try {
      const data = await tryRemoteFetchAll(user);
      await Promise.all([
        cacheWrite('global', data.global),
        cacheWrite('friends', data.friends),
        cacheWrite('weekly', data.weekly),
        cacheWrite('monthly', data.monthly),
      ]);
      return data;
    } catch {
      const [global, friends, weekly, monthly] = await Promise.all([
        cacheRead('global', true).then(v => v ?? []),
        cacheRead('friends', true).then(v => v ?? []),
        cacheRead('weekly', true).then(v => v ?? []),
        cacheRead('monthly', true).then(v => v ?? []),
      ]);
      return { global, friends, weekly, monthly };
    }
  }

  async fetchScope(user: AuthenticatedUser, scope: Scope): Promise<LeaderboardEntry[]> {
    const all = await this.fetchAll(user);
    return all[scope] || [];
  }

  async submit(user: AuthenticatedUser, scope: Scope, score: number): Promise<void> {
    // Always attempt network submit first so Workbox Background Sync can capture failures
    const requestId = `lb_${user.id}_${scope}_${score}_${Date.now()}`;
    try {
      await tryRemoteSubmit(user, scope, score, requestId);
      return;
    } catch {
      // If Background Sync is available, Workbox will have queued the failed POST
      if (supportsBackgroundSync()) return;
      // Fallback to app-level IndexedDB queue (handled by syncQueueFlusher)
      await enqueueSubmit(scope, score, user);
    }
  }
}

let _instance: LeaderboardProvider | null = null;

export function getLeaderboardService(): LeaderboardProvider {
  if (_instance) return _instance;
  _instance = new LocalCachedLeaderboardProvider();
  return _instance;
}

export type { LeaderboardEntry, LeaderboardData };