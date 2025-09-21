/**
 * StorageManager
 * - Client-side storage utilities for usage metrics and maintenance
 * - Works over Dexie tables (IndexedDB) and navigator.storage.estimate()
 *
 * Responsibilities:
 * - Compute storage usage (media table bytes/count + DB row counts)
 * - Purge unreferenced media (based on CardRow.mediaRefs)
 * - Purge all media (dangerous, UI must confirm)
 */

import db, { ensureDBOpen, type MediaRow, type CardRow } from '../../data/db';

export type BrowserStorageEstimate = {
  quota?: number;         // Browser-estimated total quota (bytes)
  usage?: number;         // Browser-estimated used bytes (bytes)
  usageDetails?: Record<string, number>;
};

export type StorageUsage = {
  // Media
  mediaBytes: number;
  mediaCount: number;

  // DB counts (best-effort, not bytes)
  decksCount: number;
  cardsCount: number;
  reviewsCount: number;
  achievementsCount: number;
  challengesCount: number;

  // Browser estimate (if available)
  estimate?: BrowserStorageEstimate;
  // Timestamp
  measuredAt: number;
};

export type PurgeReport = {
  removedCount: number;
  removedBytes: number;
  keptCount: number;
};

/**
 * Helper: sums byteLength safely
 */
function safeByteLength(m?: MediaRow | null): number {
  if (!m) return 0;
  if (typeof m.byteLength === 'number') return m.byteLength;
  try {
    return m.blob ? m.blob.size : 0;
  } catch {
    return 0;
  }
}

export class StorageManager {
  /**
   * Compute overall usage snapshot.
   * - mediaBytes/mediaCount from media table
   * - Row counts from other tables (for visibility)
   * - navigator.storage.estimate() if available
   */
  async getUsage(): Promise<StorageUsage> {
    await ensureDBOpen();

    const [mediaRows, decksCount, cardsCount, reviewsCount, achievementsCount, challengesCount] =
      await Promise.all([
        db.media.toArray(),
        db.decks.count(),
        db.cards.count(),
        db.reviews.count(),
        db.achievements.count(),
        db.challenges.count(),
      ]);

    const mediaBytes = mediaRows.reduce((sum, row) => sum + safeByteLength(row), 0);
    const mediaCount = mediaRows.length;

    let estimate: BrowserStorageEstimate | undefined;
    try {
      if (navigator?.storage?.estimate) {
        const est = await navigator.storage.estimate();
        const details = (est as any).usageDetails as Record<string, number> | undefined;
        const browserEstimate: BrowserStorageEstimate = {
          quota: est.quota,
          usage: est.usage,
          ...(details ? { usageDetails: Object.fromEntries(Object.entries(details)) } : {}),
        };
        estimate = browserEstimate;
      }
    } catch {
      // ignore if not supported
    }

    return {
      mediaBytes,
      mediaCount,
      decksCount,
      cardsCount,
      reviewsCount,
      achievementsCount,
      challengesCount,
      estimate,
      measuredAt: Date.now(),
    };
  }

  /**
   * Purge any media rows that are not referenced by any card's mediaRefs.
   * Returns a summary report with removed/kept counts and bytes freed.
   */
  async purgeUnusedMedia(): Promise<PurgeReport> {
    await ensureDBOpen();

    const [cards, mediaRows] = await Promise.all([db.cards.toArray(), db.media.toArray()]);

    const referenced = this.collectReferencedMedia(cards);
    let removedCount = 0;
    let removedBytes = 0;

    // Iterate and remove unreferenced
    for (const m of mediaRows) {
      if (!referenced.has(m.mediaHash)) {
        removedBytes += safeByteLength(m);
        await db.media.delete(m.mediaHash);
        removedCount++;
      }
    }

    return {
      removedCount,
      removedBytes,
      keptCount: mediaRows.length - removedCount,
    };
  }

  /**
   * Purge all media rows. Dangerous: callers must confirm with user.
   * Returns removed count/bytes.
   */
  async purgeAllMedia(): Promise<PurgeReport> {
    await ensureDBOpen();

    const mediaRows = await db.media.toArray();
    const removedBytes = mediaRows.reduce((sum, row) => sum + safeByteLength(row), 0);
    const removedCount = mediaRows.length;

    await db.media.clear();

    return {
      removedCount,
      removedBytes,
      keptCount: 0,
    };
  }

  /**
   * Collect referenced media hashes from CardRow.mediaRefs (string[])
   */
  private collectReferencedMedia(cards: CardRow[]): Set<string> {
    const set = new Set<string>();
    for (const c of cards) {
      if (Array.isArray(c.mediaRefs)) {
        for (const ref of c.mediaRefs) {
          if (typeof ref === 'string' && ref.length > 0) set.add(ref);
        }
      }
    }
    return set;
  }
}

// Singleton export
export const storageManager = new StorageManager();
export default StorageManager;