import { describe, it, expect, beforeEach } from 'vitest';
import db, { resetDBForTests, ensureDBOpen, type MediaRow, type CardRow } from '../../data/db';
import { storageManager } from '../../services/storage/StorageManager';

function mkMedia(mediaHash: string, byteLength: number, mimeType = 'image/png'): MediaRow {
  const now = Date.now();
  return {
    mediaHash,
    mimeType,
    byteLength,
    createdAt: now,
    updatedAt: now,
    // optional fields
    blob: undefined,
    opfsPointer: undefined,
    validationMeta: undefined,
    securityFlags: undefined,
  };
}

function mkCard(cardId: string, deckId: string, mediaRefs: string[]): CardRow {
  const now = Date.now();
  return {
    cardId,
    deckId,
    fields: { front: 'front', back: 'back' },
    mediaRefs,
    dueAt: null,
    interval: 0,
    ease: 250,
    lapses: 0,
    state: 'new',
    createdAt: now,
    updatedAt: now,
  };
}

describe('StorageManager', () => {
  beforeEach(async () => {
    await resetDBForTests();
    await ensureDBOpen();
  });

  it('computes usage on empty database', async () => {
    const usage = await storageManager.getUsage();
    expect(usage.mediaBytes).toBe(0);
    expect(usage.mediaCount).toBe(0);
    expect(usage.decksCount).toBe(0);
    expect(usage.cardsCount).toBe(0);
  });

  it('counts media bytes and items', async () => {
    await db.media.put(mkMedia('hash-a', 1024));
    await db.media.put(mkMedia('hash-b', 2048));
    const usage = await storageManager.getUsage();
    expect(usage.mediaCount).toBe(2);
    expect(usage.mediaBytes).toBe(1024 + 2048);
  });

  it('purges only unreferenced media', async () => {
    // Seed media
    await db.media.put(mkMedia('h1', 100));
    await db.media.put(mkMedia('h2', 200));
    await db.media.put(mkMedia('h3', 300));

    // One card references h1 and h3
    await db.cards.put(mkCard('c1', 'd1', ['h1', 'h3']));

    // Sanity
    let usage = await storageManager.getUsage();
    expect(usage.mediaCount).toBe(3);

    // Purge unused (should remove h2 only)
    const report = await storageManager.purgeUnusedMedia();
    expect(report.removedCount).toBe(1);
    expect(report.keptCount).toBe(2);
    expect(report.removedBytes).toBe(200);

    // Remaining media
    const remaining = await db.media.toArray();
    const remainingHashes = new Set(remaining.map(m => m.mediaHash));
    expect(remainingHashes.has('h1')).toBe(true);
    expect(remainingHashes.has('h3')).toBe(true);
    expect(remainingHashes.has('h2')).toBe(false);

    usage = await storageManager.getUsage();
    expect(usage.mediaCount).toBe(2);
    expect(usage.mediaBytes).toBe(100 + 300);
  });

  it('purges all media when requested', async () => {
    await db.media.put(mkMedia('h1', 100));
    await db.media.put(mkMedia('h2', 200));
    const before = await storageManager.getUsage();
    expect(before.mediaCount).toBe(2);

    const report = await storageManager.purgeAllMedia();
    expect(report.removedCount).toBe(2);
    expect(report.removedBytes).toBe(300);

    const after = await storageManager.getUsage();
    expect(after.mediaCount).toBe(0);
    expect(after.mediaBytes).toBe(0);
  });
});