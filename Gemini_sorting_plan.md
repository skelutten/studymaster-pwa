### Analysis of Existing Spaced Repetition Systems (SRS)

#### 1. Anki (based on SuperMemo's SM-2 Algorithm)

Anki's algorithm is the gold standard for serious spaced repetition and is almost entirely based on the SM-2 algorithm.

*   **Core Concept:** It doesn't care about the deck as a whole. It treats every card as an independent entity. The goal is to calculate the optimal time to show a specific card again, right before the user is predicted to forget it.
*   **Key Metric: "Easiness Factor" (EF)**
    *   Every card has an EF, which starts at a default value (e.g., 2.5).
    *   This factor determines how much the interval grows after a successful review.
*   **How it Works:**
    1.  When you review a card, you rate your answer with one of four grades:
        *   **Again (1):** You failed. The card's interval is reset to zero, and it enters a "leech" queue to be shown again soon in the same session. The EF is decreased.
        *   **Hard (2):** You got it right, but with difficulty. The interval increases, but by a smaller amount than "Good." The EF is slightly decreased or stays the same.
        *   **Good (3):** You got it right. The new interval is calculated as `previous_interval * EF`. The EF remains unchanged.
        *   **Easy (4):** You got it right effortlessly. The new interval is `previous_interval * EF * bonus_modifier` (e.g., 1.3). The EF is increased.
*   **Deck Sorting:** Anki doesn't really "sort the deck" in the way you're describing. At the start of a session, it creates a queue of cards that are due for review *that day*. This queue is typically randomized or ordered by due date, but it is not dynamically re-ordered based on your performance within the session.

#### 2. Quizlet

Quizlet's algorithm is less transparent and more proprietary. It's geared towards short-term studying for tests rather than long-term retention, although it has long-term learning modes.

*   **Core Concept:** It uses a "familiarity" or "mastery" bucket system. Cards move between stages like "New," "Learning," "Mastering," and "Mastered."
*   **How it Works:**
    *   Users typically mark a card as "correct" or "incorrect."
    *   **Correct:** The card progresses to the next stage.
    *   **Incorrect:** The card is demoted to a lower stage (often back to "Learning").
    *   The algorithm's goal is to get all cards into the "Mastered" stage. Cards in lower stages are shown more frequently.
*   **Deck Sorting:** Quizlet's "Learn" mode is a good example of dynamic sorting. It actively prioritizes showing you the cards you get wrong more often within a single session until you get them right a few times in a row. It focuses on cramming the difficult items.

### Limitations of Current Approaches

*   **Anki (SM-2):** Very powerful for long-term retention but can feel rigid. It doesn't adapt to the user's current mental state. If you're having a tough day and failing many cards, it will just keep showing you hard cards, which can be discouraging. It doesn't adjust the deck's difficulty *in the moment*.
*   **Quizlet:** Better for short-term, in-session adaptation but lacks the sophisticated, long-term scheduling of SM-2. Its concept of "difficulty" is binary (correct/incorrect) and doesn't capture the nuance of "Hard" or "Easy."

---

### Plan for an Improved Dynamic Deck Sorting Algorithm

The goal is to combine the long-term scheduling power of Anki with a more intelligent, in-session dynamic re-sorting that responds to the user's perceived difficulty.

Let's call this the **"Momentum-Based Adaptive Sorting"** algorithm. It works on the principle of building and maintaining learning momentum.

#### **Phase 1: Data Model and Metrics**

First, we need to define what data we'll track. We'll need to modify the data models in `shared/types/` and ensure the backend (`server/`) and database (`pocketbase/` or `supabase/`) can handle it.

1.  **Card-Level Metrics (similar to Anki):**
    *   `easinessFactor`: A float, starting at 2.5.
    *   `interval`: An integer (days until next review).
    *   `repetitions`: Integer count of successful reviews.
    *   `lastReviewed`: Timestamp.
    *   `performanceHistory`: An array of recent performance ratings (e.g., `[3, 3, 2, 4]`). This is crucial for seeing trends.

2.  **Session-Level Metrics (The New Part):**
    *   `deckDifficultyScore`: A running score for the current session, from 0.0 to 1.0. Starts at 0.5.
        *   `0.0 - 0.4`: User is finding the deck easy.
        *   `0.4 - 0.6`: User is in a good flow state (the "zone of proximal development").
        *   `0.6 - 1.0`: User is struggling.
    *   `reviewQueue`: The list of card IDs for the current session.

#### **Phase 2: The Algorithm Logic**

This logic would live in a new service, e.g., `server/src/services/srsService.ts`.

1.  **Session Start:**
    *   Generate the `reviewQueue` by selecting all cards where `lastReviewed + interval` is before or on the current date.
    *   Shuffle this initial queue.

2.  **After Each Card is Answered:**
    *   **Step A: Update the Card.**
        *   The user provides a rating (1-Again, 2-Hard, 3-Good, 4-Easy).
        *   This rating updates the specific card's `easinessFactor`, `interval`, etc., using the standard SM-2 logic. This preserves the powerful long-term scheduling.

    *   **Step B: Update the Session's `deckDifficultyScore`.**
        *   This is the key innovation. We update the score with a weighted moving average.
        *   `newScore = (oldScore * 0.7) + (currentCardRatingAsPercentage * 0.3)`
        *   `currentCardRatingAsPercentage` could be: Again=1.0, Hard=0.75, Good=0.25, Easy=0.0.
        *   This formula gives more weight to recent answers, making the score responsive.

    *   **Step C: Dynamically Re-sort the *Upcoming* Cards in the `reviewQueue`.**
        *   Don't re-sort the whole deck. Just re-order the next 5-10 cards in the queue based on the `deckDifficultyScore`.
        *   **If `deckDifficultyScore` > 0.6 (User is struggling):**
            *   **Action:** Promote a "confidence booster" card.
            *   **Logic:** Look ahead in the queue and find a card with a high `easinessFactor` or a long `interval` (i.e., a card the user has historically found easy). Move it to the front to be the very next card. This helps break a failure streak and rebuilds momentum.
        *   **If `deckDifficultyScore` < 0.4 (User is cruising):**
            *   **Action:** Introduce a challenge.
            *   **Logic:** Look ahead in the queue for a card with a low `easinessFactor` or a history of "Hard" ratings. Prioritize it. Alternatively, if there are "new" cards to be learned, inject one here. This keeps the user engaged.
        *   **If the score is in the middle (0.4 - 0.6):**
            *   **Action:** Do nothing.
            *   **Logic:** The user is in the zone. Let the pre-shuffled order continue. Don't mess with the flow.

#### **Phase 3: Implementation Steps**

1.  **Backend:**
    *   Modify the database schema (`pocketbase/pb_migrations/` or Supabase SQL) to add the new fields to the `cards` table.
    *   Create a new `srsService.ts` in `server/src/services/` to encapsulate all the algorithm logic.
    *   Create new API endpoints in `server/src/routes/` (e.g., `POST /api/decks/:id/review`) that take a `cardId` and a `rating`.
    *   This endpoint will call the `srsService` to perform the three steps (update card, update session score, get next card) and return the next card to the client.

2.  **Frontend:**
    *   The `client/src/pages/ReviewPage.tsx` (or similar) will display the current card.
    *   After the user answers, it will show the "Again, Hard, Good, Easy" buttons.
    *   On button click, it sends the `cardId` and `rating` to the new backend endpoint.
    *   It then receives the *next* card to display from the API response and updates its state.
