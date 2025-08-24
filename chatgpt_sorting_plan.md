Here’s a refined version of your plan. I’ve added improvements in **personalization, cognitive load management, explainability, and system resilience**, while tightening some of the success metrics and implementation details.

---

# Plan: Adaptive Momentum-Based Scheduler (AMS)

**Version:** 2.1
**Date:** 2025-08-22
**Objective:** To build a next-generation spaced repetition system by integrating *Momentum-Based Adaptive Sorting* with the *Adaptive Difficulty Scheduler (ADS)* framework. This design optimizes **long-term retention** (FSRS-style), **in-session engagement** (flow-state management), and **personalization** (context-aware and learner-adaptive adjustments).

---

## 1. Core Principles

This system is anchored in four pillars:

1. **DSR Model (Difficulty–Stability–Retrievability):**
   Foundation of long-term scheduling, ensuring mathematically grounded retention modeling.

2. **Session Momentum Management:**
   Adaptive adjustment of queue ordering within a session to maintain engagement, prevent fatigue, and sustain “flow.”

3. **Context-Aware Scheduling:**
   Goes beyond correct/incorrect. Uses response time, session length, time of day, and cognitive load indicators to guide both short- and long-term scheduling.

4. **Personalized Adaptation & Transparency:**
   Learners should see *why* a card was scheduled (“This card was shown early to reinforce your momentum”) and be able to tweak aggressiveness of difficulty adjustments.

---

## 2. Data Models & Metrics

Enhancements to `shared/types/index.ts` and database schema:

### 2.1. Card-Level Metrics (`Card` interface)

* **DSR Metrics (FSRS-inspired):**

  * `difficulty`: `number` (1–10, float)
  * `stability`: `number` (in days)
  * `retrievability`: `number` (0–1)

* **Core Data:**

  * `lastReviewed`: `string` (Timestamp)
  * `repetitions`: `number`
  * `state`: `'new' | 'learning' | 'review' | 'relearning'`

* **Performance History:**

  * `performanceHistory`: `ResponseLog[]`
  * `averageResponseTime`: `number` (ms, normalized)
  * `cognitiveLoadIndex`: `number` (0–1, optional) – derived from response time variance + streak of difficulties

### 2.2. Response Log (`ResponseLog`)

```typescript
interface ResponseLog {
  timestamp: string;
  rating: 'again' | 'hard' | 'good' | 'easy';
  responseTime: number;
  contextualFactors: {
    sessionTime: number;
    timeOfDay: string;
    sessionFatigueIndex?: number; // estimated fatigue level
  };
}
```

### 2.3. Session-Level Metrics

* `sessionMomentumScore`: `number` (0–1, running score for session state)
* `reviewQueue`: `string[]` – IDs of cards pending in session
* `lookaheadBuffer`: `Card[]` – next 5–10 cards, subject to reshuffling
* `sessionFatigueIndex`: `number` (0–1) – rises with longer sessions, fast wrong streaks, or response slowdown

---

## 3. Algorithmic Logic

Encapsulated in `server/src/services/AdaptiveSchedulingService.ts`.

### 3.1. On Session Start

1. **Queue Generation:** Fetch due cards (`retrievability` < 0.9 or `state` is new/learning).
2. **Initial Sort:** Prioritize by due date, state, and clustering rules (avoid back-to-back similar cards).
3. **Buffer Fill:** Load first 10 into `lookaheadBuffer`.

### 3.2. After Each Card

**Step A: Update Card’s Long-Term DSR**

* Apply FSRS-inspired updates based on rating + response time.
* Log `ResponseLog` with fatigue/context metadata.

**Step B: Update Session State**

* Compute performance value (`again=1.0`, `hard=0.75`, `good=0.25`, `easy=0.0`).
* Update `sessionMomentumScore`:

  ```
  newScore = (oldScore * 0.65) + (performanceValue * 0.35)
  ```
* Adjust with fatigue: if `sessionFatigueIndex > 0.7`, add +0.1 to score (bias toward “struggling”).

**Step C: Buffer Re-sorting**

* **If struggling (>0.6):** Promote a booster card (high stability or low difficulty).
* **If cruising (<0.4):** Promote a challenge (low stability, high difficulty, or new card).
* **If balanced (0.4–0.6):** Keep flow.
* **If fatigue high:** Bias buffer toward boosters to reduce frustration.
* Refresh buffer continuously (remove used card, add new one).

---

## 4. Implementation Plan

### Phase 1: Metrics & Backend Foundations (Weeks 1–2)

* Update types + DB migrations (`cards` table with cognitiveLoadIndex).
* Create `AdaptiveSchedulingService` with placeholder FSRS logic + working momentum score.
* Update API endpoint `/api/decks/:id/review`.

### Phase 2: Dynamic Sorting & Frontend Integration (Weeks 3–4)

* Add `difficultyTracker.ts` client service for session state.
* Modify `ReviewPage.tsx` to send full `ResponseLog`.
* Implement **A/B testing** (AMS vs baseline).

### Phase 3: Full DSR & Cognitive Load Modeling (Weeks 5–6)

* Implement FSRS equations for DSR.
* Introduce fatigue index (from response slowdown + difficulty streaks).
* Performance optimize queries & caching.

### Phase 4: Advanced Features & Transparency (Weeks 7–8)

* **Intelligent Clustering:** prevent near-duplicate or confusable cards back-to-back.
* **User Dashboard:** show difficulty/stability progression, fatigue indicators, and momentum history.
* **Explainability Layer:** tooltip-level feedback like “We promoted an easier card to help you recover momentum.”

---

## 5. Success Metrics

### Quantitative

* **Retention Efficiency:** A/B tests → >15% faster mastery of new cards.
* **Engagement:**

  * Longer average session length (+10–20%).
  * Reduced rage-quits (sessions ending after first error).
* **Model Accuracy:** Predicted `retrievability` vs. observed recall error rate: RMSE < 0.1.

### Qualitative

* **User Trust:** Feedback shows users understand and value system’s choices.
* **Motivation:** Reports of “less frustrating,” “more encouraging” experiences.
* **Resilience:** Algorithm adapts gracefully even under poor data (e.g., streak of wrong answers).

---

✅ **Key Improvements Over v2.0:**

* Added **cognitive load & fatigue modeling**.
* Built-in **clustering prevention** to avoid confusing sequencing.
* Introduced **transparency layer** to build user trust.
* Personalized adaptation: user can tweak aggressiveness.
* Stronger success metrics (model accuracy + resilience).

---

Would you like me to also sketch out **example pseudo-code** for the *buffer re-sorting logic* so the implementation path feels more concrete?
