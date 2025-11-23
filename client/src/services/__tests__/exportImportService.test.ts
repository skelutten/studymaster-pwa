import { describe, it, expect, beforeEach } from 'vitest';
import { resetDBForTests, ensureDBOpen } from '../../data/db';
import { repos } from '../../data';
import { exportAll, importAll } from '../exportImportService';

function makeBlob(content: string, type = 'text/plain'): Blob {
  return new Blob([content], { type });
}

describe('exportImportService', () => {
  beforeEach(async () => {
    await resetDBForTests();
    await ensureDBOpen();
  });

  it('exports data without media blobs and re-imports successfully', async () => {
    // Seed some data
    const deckId = 'deck-1';
    const cardId = 'card-1';
    const reviewId = 'rev-1';
    const mediaHash = 'mhash-1';

    await repos.decks.create({ deckId, name: 'Deck One', description: 'Test deck' });
    await repos.cards.create({
      cardId,
      deckId,
      fields: { front: 'Hello', back: 'World' },
      mediaRefs: [mediaHash],
    });
    await repos.reviews.add({
      reviewId,
      cardId,
      rating: 3,
      interval: 1,
      ease: 250,
      lapses: 0,
      reviewedAt: Date.now(),
    });
    await repos.media.put({
      mediaHash,
      blob: makeBlob('test'),
      mimeType: 'text/plain',
    });

    // Export
    const bundle = await exportAll();
    expect(bundle.version).toBe(1);
    expect(bundle.tables.decks?.length).toBe(1);
    expect(bundle.tables.cards?.length).toBe(1);
    expect(bundle.tables.reviews?.length).toBe(1);
    expect(bundle.tables.media?.length).toBe(1);

    // Assert media blob excluded (manifest only)
    const media = bundle.tables.media![0] as any;
    expect(media.mediaHash).toBe(mediaHash);
    expect(media.blob).toBeUndefined();
    expect(media.mimeType).toBe('text/plain');

    // Reset and import
    await resetDBForTests();
    await ensureDBOpen();

    const result = await importAll(bundle, { includeEphemeral: false, overwriteSettings: true });
    expect(result.ok).toBe(true);
    expect(result.counts.decks).toBe(1);
    expect(result.counts.cards).toBe(1);
    expect(result.counts.reviews).toBe(1);
    expect(result.counts.media).toBe(1);

    // Validate data roundtrip via repos
    const decks = await repos.decks.list();
    expect(decks.length).toBe(1);
    expect(decks[0].name).toBe('Deck One');

    const cards = await repos.cards.listByDeck(deckId);
    expect(cards.length).toBe(1);
    expect(cards[0].fields.front).toBe('Hello');

    const mediaRow = await repos.media.get(mediaHash);
    expect(mediaRow).not.toBeNull();
    expect(mediaRow?.blob).toBeUndefined(); // import keeps manifest-only as designed
  });
});