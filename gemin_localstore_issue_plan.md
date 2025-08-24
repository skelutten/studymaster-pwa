# Plan: Fix LocalStorage QuotaExceededError

**Version:** 1.0
**Date:** 2025-08-22
**Objective:** To resolve the `QuotaExceededError` by refactoring the deck and session state management to no longer persist large, complete deck objects to the browser's `localStorage`.

---

## 1. Problem Analysis

The application currently uses a Zustand `persist` middleware to save the state of the `deckStore`. When a user starts a study session with a large deck, the entire array of card objects is loaded into this store. The middleware then attempts to serialize and write this massive array to `localStorage`, which has a small storage quota (typically 5-10MB), causing the `QuotaExceededError` and crashing the application.

## 2. The Solution: Decouple Session State from Card Data

The correct architectural approach is to only persist the essential **session state**, not the full, static **card data**. The large array of card objects should be treated as a database, fetched when needed, not as transient state to be saved on every change.

*   **What we WILL persist to `localStorage`:**
    *   `deckId`: The ID of the deck being studied.
    *   `reviewQueue`: An array of **card IDs only**, not the full objects.
    *   `currentCardIndex`: The user's numerical position in the queue.
    *   `sessionStats`: Metrics like correct/incorrect counts.

*   **What we will NO LONGER persist:**
    *   The array of thousands of full card objects.

## 3. Implementation Steps

This plan focuses on modifying the Zustand store (`deckStore.ts`) and how components interact with it.

### Step 1: Locate and Modify the Zustand `persist` Middleware

1.  **File:** `client/src/stores/deckStore.ts`
2.  **Action:** Find the `persist` function call within the store's definition.
3.  **Modification:** The `persist` function takes a `partialize` option, which allows us to select which parts of the state are saved. We will implement this to exclude the full card array.

    ```typescript
    // Example of the change in deckStore.ts

    persist(
      (set, get) => ({
        // ... existing store state: deck, cards, session, etc.
      }),
      {
        name: 'deck-storage', // The key that causes the error
        // ADD THIS PARTIALIZE OPTION
        partialize: (state) => ({
          // Only include the properties that are small and essential for resuming a session
          deckId: state.deckId,
          session: {
            reviewQueue: state.session.reviewQueue, // Assuming this will be an array of IDs
            currentCardIndex: state.session.currentCardIndex,
            sessionStats: state.session.sessionStats,
          },
          // Explicitly EXCLUDE the large 'cards' array
          // cards: state.cards, // <--- DO NOT INCLUDE THIS
        }),
      }
    )
    ```

### Step 2: Ensure the `reviewQueue` Contains Only IDs

1.  **File:** `client/src/stores/deckStore.ts`
2.  **Action:** Review the `startStudySession` function.
3.  **Modification:** When this function creates the `reviewQueue`, ensure it is an array of `card.id` strings, not the full `card` objects.

    ```typescript
    // Example of the change in startStudySession
    startStudySession: (deck) => {
      // ... logic to filter cards for review
      const cardsToReview = ...;

      const reviewQueueOfIds = cardsToReview.map(card => card.id);

      set({ 
        cards: cardsToReview, // The full card data still lives in the non-persisted state
        session: { reviewQueue: reviewQueueOfIds, ... }
      });
    },
    ```

### Step 3: Refactor Card Access in Components

Components can no longer assume the full card object is available for direct access based on the `currentCardIndex`. They must now fetch the card data on demand.

1.  **File:** `client/src/pages/StudyPage.tsx` (and any other component that displays the current card).
2.  **Action:** Change how the current card is retrieved.
3.  **Modification:**
    *   Get the `currentCardIndex` and the `reviewQueue` (of IDs) from the store.
    *   Get the current card's ID: `const currentCardId = reviewQueue[currentCardIndex];`
    *   Create a new selector or hook in `deckStore.ts` to find a card by its ID from the full (non-persisted) `cards` array.

    ```typescript
    // Add a new selector to deckStore.ts
    export const useCurrentCard = () => {
      const store = useDeckStore();
      const { reviewQueue, currentCardIndex } = store.session;
      
      if (!reviewQueue || reviewQueue.length === 0) return null;

      const currentCardId = reviewQueue[currentCardIndex];
      // Find the card in the full, non-persisted list
      return store.cards.find(card => card.id === currentCardId);
    };

    // In StudyPage.tsx
    // const currentCard = ... // OLD WAY
    const currentCard = useCurrentCard(); // NEW WAY
    ```

## 4. Expected Outcome

*   The `QuotaExceededError` will be completely resolved.
*   The application will be more performant, as it will no longer serialize/deserialize a massive JSON object on every state change.
*   The application will be scalable to decks of any size.
