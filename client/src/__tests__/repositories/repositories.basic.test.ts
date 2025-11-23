import { describe, it, beforeEach, expect } from 'vitest';
import { createIndexedDBRepositories } from '../../data/repositories';
import db, { resetDBForTests, validateSchema } from '../../data/db';

const repos = createIndexedDBRepositories();

const genId = (p: string) => `${p}_${Math.random().toString(36).slice(2, 10)}`;

beforeEach(async () => {
  await resetDBForTests();
});

describe('IndexedDB schema and bootstrap', () => {
  it('has all expected tables and initializes settings row', async () => {
    const { ok, missing } = await validateSchema();
    expect(ok).toBe(true);
    expect(missing).toEqual([]);

    const settings = await db.settings.get('settings');
    expect(settings).toBeTruthy();
    expect(settings?.id).toBe('settings');
  });
});

describe('DeckRepository and CardRepository basic CRUD', () => {
  it('creates a deck and lists it ordered by updatedAt', async () => {
    const deckA = await repos.decks.create({ deckId: genId('deckA'), name: 'Deck A' });
    const deckB = await repos.decks.create({ deckId: genId('deckB'), name: 'Deck B' });

    // Touch deckA to make it most recently updated
    await repos.decks.update(deckA.deckId, { description: 'updated' });

    const list = await repos.decks.list();
    expect(list.length).toBeGreaterThanOrEqual(2);
    expect(list[0].deckId).toBe(deckA.deckId);
  });

  it('creates, updates, and removes a card while maintaining deck cardCount', async () => {
    const deckId = genId('deck');
    await repos.decks.create({ deckId, name: 'My Deck' });

    const cardId = genId('card');
    const card = await repos.cards.create({
      cardId,
      deckId,
      fields: { front: 'F', back: 'B' },
      state: 'new',
    });

    expect(card.cardId).toBe(cardId);

    const byDeck = await repos.cards.listByDeck(deckId);
    expect(byDeck.map((c) => c.cardId)).toContain(cardId);

    const updated = await repos.cards.update(cardId, { state: 'review' });
    expect(updated.state).toBe('review');

    // Deck cardCount should be 1
    const deckBefore = await repos.decks.get(deckId);
    expect(deckBefore?.cardCount ?? 0).toBe(1);

    await repos.cards.remove(cardId);

    const deckAfter = await repos.decks.get(deckId);
    expect(deckAfter?.cardCount ?? 0).toBe(0);
  });

  it('throws when updating a non-existent card', async () => {
    await expect(repos.cards.update('does-not-exist', { state: 'review' }))
      .rejects
      .toThrow(/Card not found/);
  });
});

describe('ReviewRepository', () => {
  it('adds reviews and lists latest first with a limit', async () => {
    const deckId = genId('deck');
    const cardId = genId('card');
    await repos.decks.create({ deckId, name: 'Deck' });
    await repos.cards.create({ cardId, deckId, fields: { front: 'Q', back: 'A' } });

    const base = Date.now();
    await repos.reviews.add({
      reviewId: genId('rev'),
      cardId,
      rating: 3,
      interval: 3,
      ease: 250,
      lapses: 0,
      reviewedAt: base - 1000,
    });
    await repos.reviews.add({
      reviewId: genId('rev'),
      cardId,
      rating: 4,
      interval: 4,
      ease: 260,
      lapses: 0,
      reviewedAt: base,
    });

    const latestOnly = await repos.reviews.listByCard(cardId, 1);
    expect(latestOnly.length).toBe(1);
    expect(latestOnly[0].rating).toBe(4);

    const all = await repos.reviews.listByCard(cardId, 10);
    expect(all.length).toBeGreaterThanOrEqual(2);
  });
});

describe('MediaRepository', () => {
  it('puts, gets, checks existence, and removes media', async () => {
    const mediaHash = genId('hash');
    const blob = new Blob(['hello world'], { type: 'text/plain' });

    const put = await repos.media.put({
      mediaHash,
      blob,
      mimeType: 'text/plain',
    });
    expect(put.mediaHash).toBe(mediaHash);
    expect(put.byteLength).toBe(blob.size);

    const has = await repos.media.has(mediaHash);
    expect(has).toBe(true);

    const got = await repos.media.get(mediaHash);
    expect(got?.mimeType).toBe('text/plain');

    await repos.media.remove(mediaHash);
    const hasAfter = await repos.media.has(mediaHash);
    expect(hasAfter).toBe(false);
  });
});

describe('AchievementRepository', () => {
  it('upserts and lists achievements by user', async () => {
    const userId = genId('user');
    const achievementId = genId('ach');

    await repos.achievements.upsert({ achievementId, userId, progress: 0.25 });
    await repos.achievements.upsert({ achievementId, userId, progress: 0.75 }); // update

    const list = await repos.achievements.listByUser(userId);
    expect(list.length).toBe(1);
    expect(list[0].achievementId).toBe(achievementId);
    expect(list[0].progress).toBe(0.75);
  });
});

describe('LeaderboardCacheRepository', () => {
  it('caches entries with TTL and returns null after expiry (unless ignoreTTL)', async () => {
    const scope = `monthly:global:${genId('s')}`;
    const row = await repos.leaderboardCache.set({
      scope,
      entries: [
        { rank: 1, name: 'Alice', anonymizedId: 'a1', score: 100 },
        { rank: 2, name: 'Bob', anonymizedId: 'b2', score: 90 },
      ],
      ttlMs: 10,
    });

    expect(row.scope).toBe(scope);

    const fresh = await repos.leaderboardCache.get(scope);
    expect(fresh).toBeTruthy();
    expect(fresh?.entries.length).toBe(2);

    // Simulate TTL expiry
    await db.leaderboardCache.update(scope, { fetchedAt: (row.fetchedAt - row.ttlMs) - 1 });
    const expired = await repos.leaderboardCache.get(scope);
    expect(expired).toBeNull();

    const ignore = await repos.leaderboardCache.get(scope, { ignoreTTL: true });
    expect(ignore).toBeTruthy();
  });
});