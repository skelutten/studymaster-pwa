/**
 * Repositories: IndexedDB-backed data access layer for StudyMaster
 *
 * Exposes typed repository interfaces with a default IndexedDB implementation (Dexie).
 * UI stores and services should use these repositories instead of accessing Dexie directly.
 *
 * Minimal methods provided to start Phase 0. Extend incrementally as flows are refactored.
 */

import db, { ensureDBOpen, type DeckRow, type CardRow, type ReviewRow, type MediaRow, type AchievementRow, type LeaderboardCacheRow, type SyncQueueRow, type MediaAnalyticsRow, type UserOnlineLinkRow } from '../db';

/* =========================
 * Shared helpers / DTO types
 * ========================= */

const nowTs = () => Date.now();

export type NewDeck = {
  deckId: string;
  name: string;
  description?: string;
  meta?: Record<string, unknown>;
};

export type UpdateDeck = Partial<Pick<DeckRow, 'name' | 'description' | 'meta'>>;

export type NewCard = {
  cardId: string;
  deckId: string;
  fields: { [k: string]: unknown; front: string; back: string };
  mediaRefs?: string[];
  dueAt?: number | null;
  interval?: number;
  ease?: number;
  lapses?: number;
  state?: CardRow['state'];
};

export type UpdateCard = Partial<Omit<CardRow, 'cardId' | 'deckId' | 'createdAt' | 'updatedAt'>>;

export type NewReview = {
  reviewId: string;
  cardId: string;
  rating: 1 | 2 | 3 | 4;
  interval: number;
  ease: number;
  lapses: number;
  elapsedSeconds?: number;
  reviewedAt: number;
};

export type MediaWriteOptions = {
  mediaHash: string;
  blob?: Blob;
  opfsPointer?: string;
  mimeType: string;
  byteLength?: number;
  validationMeta?: Record<string, unknown>;
  securityFlags?: MediaRow['securityFlags'];
};

export type AchievementUpsert = {
  achievementId: string;
  userId: string;
  unlockedAt?: number;
  progress?: number;
  meta?: Record<string, unknown>;
};

export type LeaderboardCacheWrite = {
  scope: string;
  entries: LeaderboardCacheRow['entries'];
  ttlMs: number;
  fetchedAt?: number;
};

/* =========================
 * Repository interfaces
 * ========================= */

export interface DeckRepository {
  create(deck: NewDeck): Promise<DeckRow>;
  get(deckId: string): Promise<DeckRow | null>;
  list(): Promise<DeckRow[]>;
  update(deckId: string, patch: UpdateDeck): Promise<DeckRow>;
  remove(deckId: string): Promise<void>;
}

export interface CardRepository {
  create(card: NewCard): Promise<CardRow>;
  get(cardId: string): Promise<CardRow | null>;
  listByDeck(deckId: string): Promise<CardRow[]>;
  update(cardId: string, patch: UpdateCard): Promise<CardRow>;
  remove(cardId: string): Promise<void>;
}

export interface ReviewRepository {
  add(review: NewReview): Promise<ReviewRow>;
  listByCard(cardId: string, limit?: number): Promise<ReviewRow[]>;
}

export interface MediaRepository {
  put(options: MediaWriteOptions): Promise<MediaRow>;
  get(mediaHash: string): Promise<MediaRow | null>;
  has(mediaHash: string): Promise<boolean>;
  remove(mediaHash: string): Promise<void>;
}

export interface AchievementRepository {
  upsert(input: AchievementUpsert): Promise<AchievementRow>;
  listByUser(userId: string): Promise<AchievementRow[]>;
}

export interface LeaderboardCacheRepository {
  set(input: LeaderboardCacheWrite): Promise<LeaderboardCacheRow>;
  get(scope: string, { ignoreTTL }?: { ignoreTTL?: boolean }): Promise<LeaderboardCacheRow | null>;
}

export interface SyncQueueRepository {
  enqueue(op: Omit<SyncQueueRow, 'queueId' | 'createdAt' | 'attemptCount'> & { queueId?: string }): Promise<SyncQueueRow>;
  list(limit?: number): Promise<SyncQueueRow[]>;
  markAttempt(queueId: string, lastError?: string): Promise<void>;
  remove(queueId: string): Promise<void>;
}

/* Media analytics (client-only) */
export interface MediaAnalyticsRepository {
  increment(deckId: string, mediaId: string, delta?: number, lastAccessedMs?: number): Promise<void>;
  get(deckId: string, mediaId: string): Promise<MediaAnalyticsRow | null>;
  top(deckId: string, limit?: number): Promise<MediaAnalyticsRow[]>;
}

/* User online links (optional server link to local account) */
export interface UserOnlineLinkRepository {
  upsert(input: Omit<UserOnlineLinkRow, 'linkKey' | 'lastLinkedAt'> & { lastLinkedAt?: number }): Promise<UserOnlineLinkRow>;
  get(linkKey: string): Promise<UserOnlineLinkRow | null>;
  listByDevice(deviceUserId: string): Promise<UserOnlineLinkRow[]>;
  remove(linkKey: string): Promise<void>;
}

/* =========================
 * IndexedDB implementations
 * ========================= */

/* =========================
 * UserOnlineLinks implementations (local account optional server link)
 * ========================= */
async function upsertUserOnlineLinkIndexedDB(input: Omit<UserOnlineLinkRow, 'linkKey' | 'lastLinkedAt'> & { lastLinkedAt?: number }): Promise<UserOnlineLinkRow> {
 await ensureDBOpen();
 const linkKey = `${input.deviceUserId}:${input.provider}`;
 const row: UserOnlineLinkRow = {
   linkKey,
   deviceUserId: input.deviceUserId,
   provider: input.provider,
   serverUserId: input.serverUserId,
   accessToken: input.accessToken,
   refreshToken: input.refreshToken,
   scopes: input.scopes,
   lastLinkedAt: input.lastLinkedAt ?? Date.now(),
   meta: input.meta,
 };
 await db.userOnlineLinks.put(row);
 return row;
}

async function getUserOnlineLinkByKeyIndexedDB(linkKey: string): Promise<UserOnlineLinkRow | null> {
 await ensureDBOpen();
 return (await db.userOnlineLinks.get(linkKey)) ?? null;
}

async function listUserOnlineLinksByDeviceIndexedDB(deviceUserId: string): Promise<UserOnlineLinkRow[]> {
 await ensureDBOpen();
 return db.userOnlineLinks.where('deviceUserId').equals(deviceUserId).toArray();
}

async function removeUserOnlineLinkIndexedDB(linkKey: string): Promise<void> {
 await ensureDBOpen();
 await db.userOnlineLinks.delete(linkKey);
}

/* =========================
* Core repositories
* ========================= */

async function createDeckIndexedDB(deck: NewDeck): Promise<DeckRow> {
  await ensureDBOpen();
  const now = nowTs();
  const row: DeckRow = {
    deckId: deck.deckId,
    name: deck.name,
    description: deck.description,
    cardCount: 0,
    mediaCount: 0,
    meta: deck.meta,
    createdAt: now,
    updatedAt: now,
  };
  await db.decks.add(row);
  return row;
}

async function getDeckIndexedDB(deckId: string): Promise<DeckRow | null> {
  await ensureDBOpen();
  return (await db.decks.get(deckId)) ?? null;
}

async function listDecksIndexedDB(): Promise<DeckRow[]> {
  await ensureDBOpen();
  return db.decks.orderBy('updatedAt').reverse().toArray();
}

async function updateDeckIndexedDB(deckId: string, patch: UpdateDeck): Promise<DeckRow> {
  await ensureDBOpen();
  const existing = await db.decks.get(deckId);
  if (!existing) throw new Error(`Deck not found: ${deckId}`);
  const updated: DeckRow = { ...existing, ...patch, updatedAt: nowTs() };
  await db.decks.put(updated);
  return updated;
}

async function removeDeckIndexedDB(deckId: string): Promise<void> {
  await ensureDBOpen();
  // Consider cascading deletes at higher level; here only deck is removed.
  await db.decks.delete(deckId);
}

async function createCardIndexedDB(card: NewCard): Promise<CardRow> {
  await ensureDBOpen();
  const now = nowTs();
  const row: CardRow = {
    cardId: card.cardId,
    deckId: card.deckId,
    fields: card.fields,
    mediaRefs: card.mediaRefs ?? [],
    dueAt: card.dueAt ?? null,
    interval: card.interval ?? 0,
    ease: card.ease ?? 250,
    lapses: card.lapses ?? 0,
    state: card.state ?? 'new',
    createdAt: now,
    updatedAt: now,
  };
  await db.transaction('rw', db.cards, db.decks, async () => {
    await db.cards.add(row);
    const deck = await db.decks.get(row.deckId);
    if (deck) {
      await db.decks.put({ ...deck, cardCount: (deck.cardCount ?? 0) + 1, updatedAt: nowTs() });
    }
  });
  return row;
}

async function getCardIndexedDB(cardId: string): Promise<CardRow | null> {
  await ensureDBOpen();
  return (await db.cards.get(cardId)) ?? null;
}

async function listCardsByDeckIndexedDB(deckId: string): Promise<CardRow[]> {
  await ensureDBOpen();
  return db.cards.where('deckId').equals(deckId).sortBy('updatedAt');
}

async function updateCardIndexedDB(cardId: string, patch: UpdateCard): Promise<CardRow> {
  await ensureDBOpen();
  const existing = await db.cards.get(cardId);
  if (!existing) throw new Error(`Card not found: ${cardId}`);
  const updated: CardRow = { ...existing, ...patch, updatedAt: nowTs() };
  await db.cards.put(updated);
  return updated;
}

async function removeCardIndexedDB(cardId: string): Promise<void> {
  await ensureDBOpen();
  const existing = await db.cards.get(cardId);
  await db.transaction('rw', db.cards, db.decks, async () => {
    await db.cards.delete(cardId);
    if (existing) {
      const deck = await db.decks.get(existing.deckId);
      if (deck) {
        await db.decks.put({ ...deck, cardCount: Math.max(0, (deck.cardCount ?? 0) - 1), updatedAt: nowTs() });
      }
    }
  });
}

async function addReviewIndexedDB(review: NewReview): Promise<ReviewRow> {
  await ensureDBOpen();
  const row: ReviewRow = { ...review };
  await db.reviews.add(row);
  return row;
}

async function listReviewsByCardIndexedDB(cardId: string, limit = 50): Promise<ReviewRow[]> {
  await ensureDBOpen();
  return db.reviews.where('cardId').equals(cardId).reverse().sortBy('reviewedAt').then((arr) => arr.slice(0, limit));
}

async function putMediaIndexedDB(options: MediaWriteOptions): Promise<MediaRow> {
  await ensureDBOpen();
  const now = nowTs();
  const row: MediaRow = {
    mediaHash: options.mediaHash,
    blob: options.blob,
    opfsPointer: options.opfsPointer,
    mimeType: options.mimeType,
    byteLength: options.byteLength ?? (options.blob ? options.blob.size : 0),
    validationMeta: options.validationMeta,
    securityFlags: options.securityFlags,
    createdAt: now,
    updatedAt: now,
  };
  await db.media.put(row);
  return row;
}

async function getMediaIndexedDB(mediaHash: string): Promise<MediaRow | null> {
  await ensureDBOpen();
  return (await db.media.get(mediaHash)) ?? null;
}

async function hasMediaIndexedDB(mediaHash: string): Promise<boolean> {
  await ensureDBOpen();
  const found = await db.media.get(mediaHash);
  return !!found;
}

async function removeMediaIndexedDB(mediaHash: string): Promise<void> {
  await ensureDBOpen();
  await db.media.delete(mediaHash);
}

async function upsertAchievementIndexedDB(input: AchievementUpsert): Promise<AchievementRow> {
  await ensureDBOpen();
  const existing = await db.achievements.get(input.achievementId);
  const row: AchievementRow = {
    achievementId: input.achievementId,
    userId: input.userId,
    unlockedAt: input.unlockedAt ?? existing?.unlockedAt,
    progress: input.progress ?? existing?.progress ?? 0,
    meta: { ...(existing?.meta ?? {}), ...(input.meta ?? {}) },
  };
  await db.achievements.put(row);
  return row;
}

async function listAchievementsByUserIndexedDB(userId: string): Promise<AchievementRow[]> {
  await ensureDBOpen();
  return db.achievements.where('userId').equals(userId).toArray();
}

async function setLeaderboardCacheIndexedDB(input: LeaderboardCacheWrite): Promise<LeaderboardCacheRow> {
  await ensureDBOpen();
  const row: LeaderboardCacheRow = {
    scope: input.scope,
    entries: input.entries,
    fetchedAt: input.fetchedAt ?? nowTs(),
    ttlMs: input.ttlMs,
  };
  await db.leaderboardCache.put(row);
  return row;
}

/* =========================
 * SyncQueue (Phase 2)
 * ========================= */
async function enqueueSyncIndexedDB(input: Omit<SyncQueueRow, 'queueId' | 'createdAt' | 'attemptCount'> & { queueId?: string }): Promise<SyncQueueRow> {
  await ensureDBOpen();
  const row: SyncQueueRow = {
    queueId: input.queueId ?? `q_${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`,
    opType: input.opType,
    payload: input.payload,
    createdAt: nowTs(),
    attemptCount: 0,
    lastError: undefined,
  };
  await db.syncQueue.put(row);
  return row;
}

async function listSyncQueueIndexedDB(limit = 100): Promise<SyncQueueRow[]> {
  await ensureDBOpen();
  const rows = await db.syncQueue.orderBy('createdAt').toArray();
  return rows.slice(0, limit);
}

async function markAttemptSyncIndexedDB(queueId: string, lastError?: string): Promise<void> {
  await ensureDBOpen();
  const row = await db.syncQueue.get(queueId);
  if (!row) return;
  await db.syncQueue.put({
    ...row,
    attemptCount: (row.attemptCount ?? 0) + 1,
    lastError,
  });
}

async function removeSyncIndexedDB(queueId: string): Promise<void> {
  await ensureDBOpen();
  await db.syncQueue.delete(queueId);
}

async function getLeaderboardCacheIndexedDB(scope: string, opts?: { ignoreTTL?: boolean }): Promise<LeaderboardCacheRow | null> {
  await ensureDBOpen();
  const row = await db.leaderboardCache.get(scope);
  if (!row) return null;
  if (opts?.ignoreTTL) return row;
  const age = nowTs() - row.fetchedAt;
  if (age > row.ttlMs) return null;
  return row;
}

/* =========================
 * MediaAnalytics implementations
 * ========================= */
async function incrementMediaAnalyticsIndexedDB(deckId: string, mediaId: string, delta: number = 1, lastAccessedMs?: number): Promise<void> {
  await ensureDBOpen();
  // Find existing row by deckId and mediaId
  const existing = await db.mediaAnalytics
    .where('deckId')
    .equals(deckId)
    .and(r => r.mediaId === mediaId)
    .first();

  if (existing) {
    await db.mediaAnalytics.put({
      ...existing,
      accessCount: (existing.accessCount ?? 0) + delta,
      lastAccessed: lastAccessedMs ?? Date.now(),
    });
  } else {
    const row: MediaAnalyticsRow = {
      deckId,
      mediaId,
      accessCount: delta,
      lastAccessed: lastAccessedMs ?? Date.now(),
    };
    await db.mediaAnalytics.add(row);
  }
}

async function getMediaAnalyticsIndexedDB(deckId: string, mediaId: string): Promise<MediaAnalyticsRow | null> {
  await ensureDBOpen();
  const row = await db.mediaAnalytics
    .where('deckId')
    .equals(deckId)
    .and(r => r.mediaId === mediaId)
    .first();
  return row ?? null;
}

async function topMediaAnalyticsIndexedDB(deckId: string, limit: number = 10): Promise<MediaAnalyticsRow[]> {
  await ensureDBOpen();
  const rows = await db.mediaAnalytics
    .where('deckId')
    .equals(deckId)
    .toArray();
  return rows.sort((a, b) => (b.accessCount ?? 0) - (a.accessCount ?? 0)).slice(0, limit);
}

/* =========================
 * Factory
 * ========================= */

export type Repositories = {
  decks: DeckRepository;
  cards: CardRepository;
  reviews: ReviewRepository;
  media: MediaRepository;
  achievements: AchievementRepository;
  leaderboardCache: LeaderboardCacheRepository;
  syncQueue: SyncQueueRepository;
  mediaAnalytics: MediaAnalyticsRepository;
  userOnlineLinks: UserOnlineLinkRepository;
};

export function createIndexedDBRepositories(): Repositories {
  return {
    decks: {
      create: createDeckIndexedDB,
      get: getDeckIndexedDB,
      list: listDecksIndexedDB,
      update: updateDeckIndexedDB,
      remove: removeDeckIndexedDB,
    },
    cards: {
      create: createCardIndexedDB,
      get: getCardIndexedDB,
      listByDeck: listCardsByDeckIndexedDB,
      update: updateCardIndexedDB,
      remove: removeCardIndexedDB,
    },
    reviews: {
      add: addReviewIndexedDB,
      listByCard: listReviewsByCardIndexedDB,
    },
    media: {
      put: putMediaIndexedDB,
      get: getMediaIndexedDB,
      has: hasMediaIndexedDB,
      remove: removeMediaIndexedDB,
    },
    achievements: {
      upsert: upsertAchievementIndexedDB,
      listByUser: listAchievementsByUserIndexedDB,
    },
    leaderboardCache: {
      set: setLeaderboardCacheIndexedDB,
      get: getLeaderboardCacheIndexedDB,
    },
    syncQueue: {
      enqueue: enqueueSyncIndexedDB,
      list: listSyncQueueIndexedDB,
      markAttempt: markAttemptSyncIndexedDB,
      remove: removeSyncIndexedDB,
    },
    mediaAnalytics: {
      increment: incrementMediaAnalyticsIndexedDB,
      get: getMediaAnalyticsIndexedDB,
      top: topMediaAnalyticsIndexedDB,
    },
    userOnlineLinks: {
      upsert: upsertUserOnlineLinkIndexedDB,
      get: getUserOnlineLinkByKeyIndexedDB,
      listByDevice: listUserOnlineLinksByDeviceIndexedDB,
      remove: removeUserOnlineLinkIndexedDB,
    },
  };
}