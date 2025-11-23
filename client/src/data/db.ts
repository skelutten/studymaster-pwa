/**
 * StudyMaster Offline-first Database (Dexie + IndexedDB)
 *
 * Source of truth for all local data and media.
 * - Versioned schema with typed tables
 * - Safe singleton access helpers
 * - Basic lifecycle logging (ready/blocked/versionchange)
 *
 * NOTE:
 * - Repositories should import { ensureDBOpen } before performing operations
 * - This file intentionally focuses on schema + DB lifecycle; business logic belongs in repositories
 */

import Dexie, { Table } from 'dexie';
import { logError, logWarning, logInfo } from '../services/errorTrackingService';

/* =========================
 * Row Types (initial schema)
 * ========================= */

export interface SettingRow {
  id: 'settings';
  theme?: 'light' | 'dark' | 'system';
  shortcuts?: Record<string, string>;
  featureFlags?: Record<string, boolean>;
  encryptionEnabled?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export interface UserRow {
  deviceUserId: string; // local, anonymous by default
  displayName?: string;
  avatarUrl?: string;
  anonymizedId?: string; // for optional leaderboard
  publicKeyJwk?: JsonWebKey; // reserved for future encrypted sync
  createdAt: number;
  updatedAt: number;
}

export interface DeckRow {
  deckId: string;
  name: string;
  description?: string;
  cardCount?: number;
  mediaCount?: number;
  updatedAt: number;
  createdAt: number;
  // Additional metadata (tags, language, etc.)
  meta?: Record<string, unknown>;
}

export interface CardRow {
  cardId: string;
  deckId: string;
  fields: {
    front: string;
    back: string;
    // Any additional fields from imports
    [k: string]: unknown;
  };
  mediaRefs?: string[]; // array of mediaHash keys
  // Scheduling-related fields (FSRS/Anki)
  dueAt?: number | null;
  interval?: number;
  ease?: number;
  lapses?: number;
  state?: 'new' | 'learning' | 'review' | 'relearning';
  updatedAt: number;
  createdAt: number;
}

export interface ReviewRow {
  reviewId: string;
  cardId: string;
  rating: 1 | 2 | 3 | 4; // again/hard/good/easy
  interval: number; // next interval in days
  ease: number;
  lapses: number;
  elapsedSeconds?: number;
  reviewedAt: number; // timestamp
}

export interface MediaRow {
  mediaHash: string; // SHA-256 or similar content hash
  blob?: Blob; // Stored when not using OPFS
  opfsPointer?: string; // Path or handle reference (stringified), when using OPFS
  mimeType: string;
  byteLength: number;
  validationMeta?: Record<string, unknown>;
  securityFlags?: {
    sanitized: boolean;
    blockedElements?: string[];
  };
  createdAt: number;
  updatedAt: number;
}

export interface AchievementRow {
  achievementId: string;
  userId: string; // deviceUserId
  unlockedAt?: number;
  progress?: number; // 0..1 for partial progress if applicable
  meta?: Record<string, unknown>;
}

/**
 * Lightweight, local-only media analytics per deck/media
 * Incremented on each media access; used for client-side insights only
 */
export interface MediaAnalyticsRow {
  id?: number; // auto-increment
  deckId: string;
  mediaId: string;
  accessCount: number;
  lastAccessed: number; // epoch ms
}

export interface ChallengeRow {
  challengeId: string;
  config?: Record<string, unknown>;
  progress?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

/**
 * Optional online link for a local user profile
 * Stored only when the user opts in to connect online features
 */
export interface UserOnlineLinkRow {
  linkKey: string; // `${deviceUserId}:${provider}`
  deviceUserId: string;
  provider: 'studymaster' | 'custom';
  serverUserId: string;
  accessToken: string;
  refreshToken?: string;
  scopes?: string[];
  lastLinkedAt: number;
  meta?: Record<string, unknown>;
}

export interface LeaderboardCacheRow {
  scope: string; // e.g., "monthly:global" or "weekly:friends"
  entries: Array<{
    rank: number;
    name: string;
    anonymizedId: string;
    score: number;
  }>;
  fetchedAt: number;
  ttlMs: number;
}

export interface SyncQueueRow {
  queueId: string;
  opType: 'leaderboard:submit' | 'backup:upload' | 'backup:download' | string;
  payload: unknown;
  createdAt: number;
  attemptCount: number;
  lastError?: string;
}

/* =========================
 * Dexie Database Definition
 * ========================= */

export class StudyMasterDB extends Dexie {
  // Tables (typed)
  settings!: Table<SettingRow, SettingRow['id']>;
  users!: Table<UserRow, UserRow['deviceUserId']>;
  decks!: Table<DeckRow, DeckRow['deckId']>;
  cards!: Table<CardRow, CardRow['cardId']>;
  reviews!: Table<ReviewRow, ReviewRow['reviewId']>;
  media!: Table<MediaRow, MediaRow['mediaHash']>;
  achievements!: Table<AchievementRow, AchievementRow['achievementId']>;
  challenges!: Table<ChallengeRow, ChallengeRow['challengeId']>;
  leaderboardCache!: Table<LeaderboardCacheRow, LeaderboardCacheRow['scope']>;
  syncQueue!: Table<SyncQueueRow, SyncQueueRow['queueId']>;
  mediaAnalytics!: Table<MediaAnalyticsRow, number>;
  userOnlineLinks!: Table<UserOnlineLinkRow, string>;

  constructor() {
    super('studymaster');

    // Version 1 schema
    this.version(1).stores({
      // Primary keys and indexes
      settings: 'id',
      users: 'deviceUserId',
      decks: 'deckId, updatedAt',
      cards: 'cardId, deckId, dueAt, updatedAt',
      reviews: 'reviewId, cardId, reviewedAt',
      media: 'mediaHash',
      achievements: 'achievementId, userId',
      challenges: 'challengeId',
      leaderboardCache: 'scope, fetchedAt',
      syncQueue: 'queueId, createdAt',
    });

    // Version 2: add mediaAnalytics store
    this.version(2).stores({
      mediaAnalytics: '++id, deckId, mediaId, lastAccessed'
    });

    // Version 3: add userOnlineLinks store
    this.version(3).stores({
      userOnlineLinks: 'linkKey, deviceUserId, provider'
    });

    // Table bindings (in Dexie v3 this is automatic; explicit assignment keeps TS happy in some setups)
    this.settings = this.table('settings');
    this.users = this.table('users');
    this.decks = this.table('decks');
    this.cards = this.table('cards');
    this.reviews = this.table('reviews');
    this.media = this.table('media');
    this.achievements = this.table('achievements');
    this.challenges = this.table('challenges');
    this.leaderboardCache = this.table('leaderboardCache');
    this.syncQueue = this.table('syncQueue');
    this.mediaAnalytics = this.table('mediaAnalytics');
    this.userOnlineLinks = this.table('userOnlineLinks');

    // Lifecycle hooks for visibility and troubleshooting
    this.on('populate', async () => {
      // Initial bootstrap: ensure a settings row exists
      try {
        const now = Date.now();
        const existing = await this.settings.get('settings');
        if (!existing) {
          await this.settings.add({
            id: 'settings',
            theme: 'system',
            shortcuts: {},
            featureFlags: {},
            encryptionEnabled: false,
            createdAt: now,
            updatedAt: now,
          });
        }
      } catch (err) {
        logError(err instanceof Error ? err : new Error(String(err)), { scope: 'db.populate' });
      }
    });

    this.on('ready', () => {
      // Database is ready for use
      // Avoid heavy work here; use repos/services for business logic
      logInfo('DB ready', { scope: 'db.ready' });
    });

    this.on('blocked', (e) => {
      logWarning('DB blocked - close other tabs or reload to proceed', { event: e, scope: 'db.blocked' });
    });

    this.on('versionchange', () => {
      logInfo('DB versionchange - closing to allow upgrade', { scope: 'db.versionchange' });
      this.close();
    });
  }
}

/* =========================
 * Singleton + Helpers
 * ========================= */

let _dbInstance: StudyMasterDB | null = null;

/**
 * Returns the singleton DB instance (not necessarily open).
 */
export function getDB(): StudyMasterDB {
  if (!_dbInstance) {
    _dbInstance = new StudyMasterDB();
  }
  return _dbInstance;
}

/**
 * Ensures the DB is open before use.
 * Repositories should call this before any transaction/operation.
 */
export async function ensureDBOpen(): Promise<StudyMasterDB> {
  const db = getDB();
  if (!db.isOpen()) {
    try {
      await db.open();
    } catch (err) {
      console.error('[DB] open error:', err);
      throw err;
    }
  }
  return db;
}

/**
 * Utility to reset the DB during tests.
 * WARNING: Do not use in production code paths.
 */
export async function resetDBForTests(): Promise<void> {
  const db = getDB();
  db.close();
  await Dexie.delete(db.name);
  _dbInstance = new StudyMasterDB();
}

/**
 * Health check utility: validates that all expected tables exist.
 */
export async function validateSchema(): Promise<{ ok: boolean; missing: string[] }> {
  const db = await ensureDBOpen();
  const expected = [
    'settings',
    'users',
    'decks',
    'cards',
    'reviews',
    'media',
    'achievements',
    'challenges',
    'leaderboardCache',
    'syncQueue',
    'mediaAnalytics',
    'userOnlineLinks',
  ];
  const actual = db.tables.map((t) => t.name);
  const missing = expected.filter((name) => !actual.includes(name));
  return { ok: missing.length === 0, missing };
}

/**
 * Default export: Proxy to always forward to the current singleton instance.
 * This avoids stale references after resetDBForTests() creates a new instance.
 */
const db = new Proxy({} as StudyMasterDB, {
  get(_target, prop, receiver) {
    const inst = getDB() as any;
    const value = Reflect.get(inst, prop, receiver);
    return typeof value === 'function' ? value.bind(inst) : value;
  }
}) as unknown as StudyMasterDB;

export default db;