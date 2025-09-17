import { describe, it, beforeEach, expect } from 'vitest';
import { useDeckStore } from '../../stores/deckStore';
import { repos } from '../../data';
import { resetDBForTests, ensureDBOpen } from '../../data/db';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('deckStore offline-first persistence (IndexedDB)', () => {
  beforeEach(async () => {
    // Reset DB and (best-effort) clear store state
    await resetDBForTests();
    await ensureDBOpen();
    // Reset Zustand store state to defaults
    useDeckStore.setState({
      decks: [],
      cards: {},
      currentStudySession: null,
      isLoading: false,
      error: null,
      importProgress: 0,
      importStatus: null,
    } as any);
  });

  it('persists createDeck to IndexedDB (decks table) non-blocking', async () => {
    const deckData = {
      userId: 'test-user',
      title: 'Persistence Test Deck',
      description: 'Deck created via store; should persist in IndexedDB',
      cardCount: 0,
      isPublic: false,
      settings: {
        newCardsPerDay: 20,
        maxReviewsPerDay: 100,
        easyBonus: 1.3,
        intervalModifier: 1.0,
        maximumInterval: 36500,
        minimumInterval: 1,
      },
      category: 'tests',
    };

    const deck = await useDeckStore.getState().createDeck(deckData);

    // Allow background persistence to run
    await sleep(25);

    const list = await repos.decks.list();
    expect(list.length).toBeGreaterThan(0);

    // Stored row name should match deck title
    const found = list.find((d) => d.name === deckData.title);
    expect(found?.name).toBe(deckData.title);

    // The store and IndexedDB deck ids are different by design; only metadata match is asserted
    expect(deck.title).toBe(deckData.title);
  });

  it('persists addCard to IndexedDB (cards table) with deckId match', async () => {
    // First create a deck in the store
    const deck = await useDeckStore.getState().createDeck({
      userId: 'test-user',
      title: 'Card Persistence Deck',
      description: 'Deck for card persistence test',
      cardCount: 0,
      isPublic: false,
      settings: {
        newCardsPerDay: 20,
        maxReviewsPerDay: 100,
        easyBonus: 1.3,
        intervalModifier: 1.0,
        maximumInterval: 36500,
        minimumInterval: 1,
      },
      category: 'tests',
    });

    const card = await useDeckStore.getState().addCard(deck.id, {
      frontContent: 'Front Q',
      backContent: 'Back A',
      cardType: { type: 'basic' },
      mediaRefs: [],
      state: 'new',
      queue: 0,
      due: 0,
      ivl: 0,
      factor: 2500,
      reps: 0,
      lapses: 0,
      left: 0,
      learningStep: 0,
      graduationInterval: 0,
      easyInterval: 0,
      totalStudyTime: 0,
      averageAnswerTime: 0,
      flags: 0,
      originalDue: 0,
      originalDeck: deck.id,
      xpAwarded: 0,
      difficultyRating: 0,
    });

    // Allow background persistence to run
    await sleep(25);

    // The repository uses deckId from the store's deck.id for CardRow
    const byDeck = await repos.cards.listByDeck(deck.id);
    expect(byDeck.length).toBeGreaterThan(0);

    const saved = byDeck.find((c) => c.fields.front === 'Front Q' && c.fields.back === 'Back A');
    expect(saved?.deckId).toBe(deck.id);
  });
});