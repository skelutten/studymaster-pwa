/**
 * ESM-friendly shim for tests requiring('../../stores/deckStore') relative to services/anki/__tests__
 * Provides a minimal mockable interface compatible with Vite/Vitest ESM environment ("type": "module").
 * Vitest vi.mock(...) in tests will override this when provided.
 */
const defaultApi = {
  createDeck: async () => ({
    id: 'deck-123',
    title: 'Test Deck',
    description: 'Test Description',
  }),
  createCard: async (cardData) => ({
    id: `card-${Math.random().toString(36).slice(2, 10)}`,
    ...cardData,
  }),
  addCard: async (_deckId, _card) => ({
    id: `card-${Math.random().toString(36).slice(2, 10)}`,
  }),
};

// Mimic Zustand-like API used in tests
export const useDeckStore = {
  getState: () => defaultApi,
};