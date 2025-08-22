# Plan: Adaptive Momentum-Based Scheduler (AMS)

**Version:** 2.0
**Date:** 2025-08-22
**Objective:** To create a next-generation spaced repetition system by merging the "Momentum-Based Adaptive Sorting" concept with the research-driven "Adaptive Difficulty-Based Scheduler" (ADS) framework. The goal is a system that optimizes both long-term retention (like Anki's FSRS) and in-session user engagement (like Quizlet's Learn mode).

---

## 1. Core Principles

This plan is built on three core pillars:

1.  **Difficulty-Stability-Retrievability (DSR) Model:** Inspired by Anki's FSRS, we will treat these three as the core metrics for any given card, forming the basis of our long-term scheduling.
2.  **Session Momentum Management:** The system must adapt *in-session* to the user's cognitive state. It should recognize when a user is struggling or cruising and adjust the immediate queue to maintain an optimal "flow state," preventing discouragement and maximizing engagement.
3.  **Context-Aware Scheduling:** The algorithm will consider factors beyond simple right/wrong answers, including response time, session length, and time of day, to make more intelligent decisions.

---

## 2. Data Models & Metrics

This requires enhancing the data structures in `shared/types/index.ts` and the corresponding database schema.

#### 2.1. Card-Level Metrics (`Card` interface)

*   **DSR Metrics (FSRS-inspired):**
    *   `difficulty`: `number` (1-10, decimal) - How intrinsically hard is this card?
    *   `stability`: `number` (in days) - How long the card can be remembered.
    *   `retrievability`: `number` (0-1) - The probability of recalling the card *right now*.
*   **Core SRS Data:**
    *   `lastReviewed`: `string` (Timestamp)
    *   `repetitions`: `number`
    *   `state`: `'new' | 'learning' | 'review' | 'relearning'`
*   **Performance History:**
    *   `performanceHistory`: `ResponseLog[]` - An array of recent response objects.
    *   `averageResponseTime`: `number` (ms) - Normalized for content length.

#### 2.2. Response Log (`ResponseLog` interface)

```typescript
interface ResponseLog {
  timestamp: string;
  rating: 'again' | 'hard' | 'good' | 'easy'; // User's explicit feedback
  responseTime: number; // Time taken to answer
  contextualFactors: { // Data about the session state when this answer was given
      sessionTime: number;
      timeOfDay: string;
  }
}
```

#### 2.3. Session-Level Metrics (Managed by a session service)

*   `sessionMomentumScore`: `number` (0-1) - A running score for the current session's performance. Replaces `deckDifficultyScore`. Starts at 0.5.
    *   `< 0.4`: User is cruising.
    *   `0.4 - 0.6`: User is in the flow state.
    *   `> 0.6`: User is struggling.
*   `reviewQueue`: `string[]` - An ordered list of card IDs for the session.
*   `lookaheadBuffer`: `Card[]` - The next 5-10 cards, which are subject to re-sorting.

---

## 3. Algorithmic Logic

The logic will be encapsulated in `server/src/services/AdaptiveSchedulingService.ts`.

#### 3.1. On Session Start

1.  **Queue Generation:** Fetch all cards due for review (`retrievability` < 0.9 or `state` is 'new'/'learning').
2.  **Initial Sort:** Sort the queue based on card state and due date.
3.  **Buffer Population:** Load the first 10 cards into the `lookaheadBuffer`.

#### 3.2. After Each Card Answer

This is a three-step process for every card interaction:

**Step A: Update Card's Long-Term Metrics (DSR)**
1.  Take the user's rating (`again`, `hard`, `good`, `easy`) and `responseTime`.
2.  Use these inputs to run through the FSRS-inspired DSR calculation, updating the card's `difficulty`, `stability`, and `retrievability` for its *next* long-term review. This ensures we don't lose the proven power of advanced SRS.
3.  Log the full `ResponseLog` to the card's `performanceHistory`.

**Step B: Update Session's `sessionMomentumScore`**
1.  Calculate a "performance value" for the last answer (e.g., again=1.0, hard=0.75, good=0.25, easy=0.0).
2.  Update the score using a weighted moving average:
    `newScore = (oldScore * 0.7) + (performanceValue * 0.3)`
3.  This score reflects the user's *current* mental state.

**Step C: Dynamically Re-sort the `lookaheadBuffer`**
1.  Based on the *new* `sessionMomentumScore`, re-evaluate the order of the 5-10 cards in the `lookaheadBuffer`.
2.  **If `sessionMomentumScore` > 0.6 (Struggling):**
    *   **Action:** Promote a "confidence booster."
    *   **Logic:** Find a card in the buffer with high `stability` (a known-easy card) and move it to the front.
3.  **If `sessionMomentumScore` < 0.4 (Cruising):**
    *   **Action:** Introduce a "desirable difficulty."
    *   **Logic:** Find a card in the buffer with low `stability` or high `difficulty` (a known-hard card) and move it up in the queue. Or, if applicable, inject a `new` card.
4.  **If score is normal (0.4 - 0.6):**
    *   **Action:** Maintain flow.
    *   **Logic:** Make no changes to the buffer's order.
5.  **Buffer Refresh:** After a card is shown, it's removed from the buffer, and a new card from the main `reviewQueue` is added to the end of the buffer.

---

## 4. Implementation Plan

### Phase 1: Foundational Metrics & Backend Logic (Weeks 1-2)

1.  **Update Data Models:** Modify `shared/types/index.ts` with the new interfaces.
2.  **Database Migration:** Create a migration script in `pocketbase/pb_migrations/` to update the `cards` table schema.
3.  **Create `AdaptiveSchedulingService`:** In `server/src/services/`, build the core service with placeholder logic for DSR calculations but fully implemented logic for the `sessionMomentumScore` and buffer sorting.
4.  **Update API:** Modify the `POST /api/decks/:id/review` endpoint to use the new service.

### Phase 2: Dynamic Sorting Engine & Frontend Integration (Weeks 3-4)

1.  **Frontend Service:** Create a `client/src/services/difficultyTracker.ts` to manage session state, including the momentum score.
2.  **UI Integration:** Update `client/src/pages/ReviewPage.tsx` to send the full `ResponseLog` (including `responseTime`) to the backend. The UI itself (four buttons) does not need to change.
3.  **A/B Testing Framework:** Implement a simple A/B testing framework to compare the AMS algorithm against the old (standard date-based) sorting. This is critical for validation.

### Phase 3: DSR Model Implementation & Optimization (Weeks 5-6)

1.  **Implement FSRS Logic:** Replace the placeholder DSR logic in the `AdaptiveSchedulingService` with a proper implementation based on open-source FSRS models. This is the most math-intensive part of the project.
2.  **Performance Tuning:** Optimize all database queries and algorithms. Ensure sorting and calculations are near-instantaneous to avoid lag between cards. Use client-side caching (IndexedDB) for session metrics.

### Phase 4: Advanced Features & Analytics (Weeks 7-8)

1.  **Intelligent Clustering:** Introduce logic to prevent showing cards with very similar content back-to-back.
2.  **Performance Dashboard:** Create a new UI view for users to see their performance trends, difficulty progression, and other insights generated by the rich data we're collecting.
3.  **Context-Awareness:** Begin factoring in `timeOfDay` and `sessionLength` into the momentum calculation. For example, the score could increase faster if the session has been running for over 45 minutes, anticipating fatigue.

---

## 5. Success Metrics

*   **Primary (Quantitative):**
    *   **Learning Efficiency:** A/B test shows a >15% reduction in time to master a new deck compared to the old system.
    *   **Engagement:** Increase in average session length and a decrease in the rate of sessions ended immediately after a failed card.
*   **Secondary (Qualitative):**
    *   **User Feedback:** Surveys and feedback indicating that studying "feels better," "is less frustrating," or "is more motivating."
    *   **Algorithm Accuracy:** The model's predicted `retrievability` should closely match the actual user recall rate.
