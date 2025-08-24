# Progressive Adaptive Spaced Repetition System (PASRS) - Detailed Implementation Plan

## 📋 Implementation Overview

Based on the pragmatic approach outlined in `claudeapp_sorting_plan.md`, this detailed implementation plan provides comprehensive technical specifications, file-by-file implementation details, testing strategies, and deployment procedures for building a robust, incrementally-deployed spaced repetition system.

## 🏗️ Project Structure & Architecture

### **Core Architecture**
```
studymaster-pwa/
├── shared/
│   ├── types/
│   │   ├── fsrs.ts              # FSRS-specific types
│   │   ├── momentum.ts          # Session momentum types
│   │   └── clustering.ts        # Anti-clustering types
├── server/
│   ├── src/
│   │   ├── services/
│   │   │   ├── fsrs/
│   │   │   │   ├── RobustFSRS.ts
│   │   │   │   ├── FSRSCalculator.ts
│   │   │   │   └── FSRSValidator.ts
│   │   │   ├── selection/
│   │   │   │   ├── OptimizedCardSelector.ts
│   │   │   │   ├── MomentumAwareSelector.ts
│   │   │   │   ├── AntiClusteringSelector.ts
│   │   │   │   └── ResilientCardSelector.ts
│   │   │   ├── monitoring/
│   │   │   │   ├── PerformanceMonitor.ts
│   │   │   │   ├── ABTestingFramework.ts
│   │   │   │   └── CircuitBreaker.ts
│   │   │   └── session/
│   │   │       ├── SimpleMomentumTracker.ts
│   │   │       └── SessionManager.ts
│   │   ├── routes/
│   │   │   ├── adaptiveReview.ts
│   │   │   └── abTesting.ts
│   │   └── middleware/
│   │       ├── performanceTracking.ts
│   │       └── abTestAssignment.ts
├── client/
│   ├── src/
│   │   ├── services/
│   │   │   ├── adaptiveStudy/
│   │   │   │   ├── AdaptiveStudyManager.ts
│   │   │   │   ├── ClientMomentumTracker.ts
│   │   │   │   └── CardCache.ts
│   │   │   └── performance/
│   │   │       ├── ClientPerformanceMonitor.ts
│   │   │       └── OfflineQueueManager.ts
│   │   ├── hooks/
│   │   │   ├── useAdaptiveStudy.ts
│   │   │   ├── useMomentumTracking.ts
│   │   │   └── usePerformanceMonitoring.ts
│   │   ├── components/
│   │   │   ├── study/
│   │   │   │   ├── AdaptiveReviewPage.tsx
│   │   │   │   ├── MomentumIndicator.tsx
│   │   │   │   └── PerformanceDebugPanel.tsx
│   │   │   └── analytics/
│   │   │       ├── RetentionChart.tsx
│   │   │       ├── MomentumChart.tsx
│   │   │       └── PerformanceMetrics.tsx
│   │   └── utils/
│   │       ├── fsrsClient.ts
│   │       └── performanceUtils.ts
└── tests/
    ├── unit/
    │   ├── fsrs/
    │   ├── momentum/
    │   └── clustering/
    ├── integration/
    │   ├── adaptiveFlow.test.ts
    │   └── abTesting.test.ts
    └── performance/
        ├── cardSelection.test.ts
        └── loadTesting.ts
```

## 🔧 Phase 1: Robust FSRS Foundation (Weeks 1-3)

### **1.1 Enhanced FSRS Core Implementation**

#### **File: `shared/types/fsrs.ts`**
```typescript
export interface FoundationCard {
  // Core FSRS metrics
  id: string
  deckId: string
  difficulty: number        // 1-10 (float)
  stability: number        // Days until forgetting threshold
  retrievability: number   // Current recall probability (0-1)
  
  // Enhanced tracking
  responseHistory: ResponseLog[]
  averageResponseTime: number  // Milliseconds, normalized
  consecutiveCorrect: number
  consecutiveIncorrect: number
  
  // Metadata
  lastReviewed: Date
  nextReview: Date
  reviewCount: number
  createdAt: Date
  updatedAt: Date
  
  // Performance optimization
  cacheVersion: number
  lastCalculation: Date
}

export interface ResponseLog {
  timestamp: Date
  rating: 'again' | 'hard' | 'good' | 'easy'
  responseTime: number
  wasCorrect: boolean
  sessionContext: {
    sessionId: string
    cardPosition: number  // Position in session
    sessionTime: number   // Minutes elapsed in session
  }
}

export interface FSRSParameters {
  // Core 4-parameter model (expandable)
  w1: number  // Initial difficulty after first review
  w2: number  // Initial stability factor
  w3: number  // Difficulty increase factor
  w4: number  // Stability increase factor
  
  // User-specific modifiers (learned over time)
  difficultyModifier: number
  stabilityModifier: number
  retrievabilityThreshold: number
  
  // Metadata
  userId: string
  lastUpdated: Date
  calculationCount: number
}

export interface FSRSCalculationResult {
  updatedCard: FoundationCard
  nextReviewDate: Date
  calculationMetadata: {
    oldDifficulty: number
    newDifficulty: number
    oldStability: number
    newStability: number
    calculationTime: number
    confidenceScore: number
  }
}
```

#### **File: `server/src/services/fsrs/RobustFSRS.ts`**
```typescript
import { FoundationCard, ResponseLog, FSRSParameters, FSRSCalculationResult } from '../../../shared/types/fsrs'
import { FSRSValidator } from './FSRSValidator'
import { PerformanceMonitor } from '../monitoring/PerformanceMonitor'

export class RobustFSRS {
  private validator: FSRSValidator
  private performanceMonitor: PerformanceMonitor
  
  // Conservative default parameters (proven in research)
  private readonly DEFAULT_PARAMETERS: FSRSParameters = {
    w1: 0.4072,   // Initial difficulty after first review
    w2: 1.1829,   // Initial stability factor  
    w3: 3.1262,   // Difficulty increase factor
    w4: 15.4722,  // Stability increase factor
    difficultyModifier: 1.0,
    stabilityModifier: 1.0,
    retrievabilityThreshold: 0.9,
    userId: 'default',
    lastUpdated: new Date(),
    calculationCount: 0
  }
  
  constructor() {
    this.validator = new FSRSValidator()
    this.performanceMonitor = new PerformanceMonitor()
  }
  
  /**
   * Calculate next review based on user response
   */
  async calculateNextReview(
    card: FoundationCard, 
    rating: string, 
    responseTime: number,
    sessionContext: any,
    userParameters?: FSRSParameters
  ): Promise<FSRSCalculationResult> {
    const startTime = Date.now()
    
    try {
      // Input validation
      this.validator.validateCard(card)
      this.validator.validateRating(rating)
      
      const params = userParameters || this.DEFAULT_PARAMETERS
      const performance = this.getRatingValue(rating)
      
      // Calculate new difficulty with bounds checking
      const difficultyChange = params.w3 * (performance - 0.6) * params.difficultyModifier
      const newDifficulty = Math.max(1, Math.min(10, card.difficulty + difficultyChange))
      
      // Calculate new stability
      const stabilityMultiplier = this.calculateStabilityMultiplier(rating, card.difficulty, params)
      const newStability = Math.max(0.1, card.stability * stabilityMultiplier * params.stabilityModifier)
      
      // Calculate retrievability decay
      const daysSinceReview = this.calculateDaysSinceReview(card.lastReviewed)
      const newRetrievability = this.calculateRetrievability(daysSinceReview, newStability)
      
      // Update response history (keep last 20 responses)
      const newResponseLog: ResponseLog = {
        timestamp: new Date(),
        rating: rating as any,
        responseTime,
        wasCorrect: ['good', 'easy'].includes(rating),
        sessionContext
      }
      
      const updatedHistory = [...card.responseHistory, newResponseLog].slice(-20)
      
      // Calculate next review date
      const nextReviewDate = this.calculateNextReviewDate(newStability, params.retrievabilityThreshold)
      
      // Create updated card
      const updatedCard: FoundationCard = {
        ...card,
        difficulty: newDifficulty,
        stability: newStability,
        retrievability: newRetrievability,
        responseHistory: updatedHistory,
        averageResponseTime: this.updateAverageResponseTime(card, responseTime),
        consecutiveCorrect: ['good', 'easy'].includes(rating) ? card.consecutiveCorrect + 1 : 0,
        consecutiveIncorrect: rating === 'again' ? card.consecutiveIncorrect + 1 : 0,
        lastReviewed: new Date(),
        nextReview: nextReviewDate,
        reviewCount: card.reviewCount + 1,
        updatedAt: new Date(),
        lastCalculation: new Date()
      }
      
      const calculationTime = Date.now() - startTime
      
      // Record performance metrics
      await this.performanceMonitor.recordCalculation(calculationTime, true)
      
      return {
        updatedCard,
        nextReviewDate,
        calculationMetadata: {
          oldDifficulty: card.difficulty,
          newDifficulty,
          oldStability: card.stability,
          newStability,
          calculationTime,
          confidenceScore: this.calculateConfidenceScore(updatedCard)
        }
      }
      
    } catch (error) {
      const calculationTime = Date.now() - startTime
      await this.performanceMonitor.recordCalculation(calculationTime, false)
      throw error
    }
  }
  
  /**
   * Get performance value from rating
   */
  private getRatingValue(rating: string): number {
    const values = { 
      'again': 0, 
      'hard': 0.3, 
      'good': 0.6, 
      'easy': 1.0 
    }
    return values[rating] ?? 0.6
  }
  
  /**
   * Calculate stability multiplier based on rating and current difficulty
   */
  private calculateStabilityMultiplier(
    rating: string, 
    currentDifficulty: number, 
    params: FSRSParameters
  ): number {
    switch (rating) {
      case 'again':
        return 0.2 // Severe stability reduction
      case 'hard':
        return 0.85 + (10 - currentDifficulty) * 0.02 // Slight reduction, easier for harder cards
      case 'good':
        return 2.5 + (10 - currentDifficulty) * 0.1 // Standard increase
      case 'easy':
        return 3.5 + (10 - currentDifficulty) * 0.15 // Large increase
      default:
        return 1.0
    }
  }
  
  /**
   * Calculate retrievability using exponential decay
   */
  private calculateRetrievability(daysSinceReview: number, stability: number): number {
    if (daysSinceReview <= 0) return 1.0
    return Math.pow(0.9, daysSinceReview / stability)
  }
  
  /**
   * Calculate next review date based on stability and target retrievability
   */
  private calculateNextReviewDate(stability: number, targetRetrievability: number): Date {
    // Find t where R(t) = targetRetrievability
    // R(t) = 0.9^(t/S), so t = S * log(R) / log(0.9)
    const daysUntilReview = stability * Math.log(targetRetrievability) / Math.log(0.9)
    const nextReviewDate = new Date()
    nextReviewDate.setDate(nextReviewDate.getDate() + Math.max(1, Math.round(daysUntilReview)))
    return nextReviewDate
  }
  
  /**
   * Update average response time with exponential moving average
   */
  private updateAverageResponseTime(card: FoundationCard, newResponseTime: number): number {
    if (card.averageResponseTime === 0) return newResponseTime
    return card.averageResponseTime * 0.8 + newResponseTime * 0.2
  }
  
  /**
   * Calculate confidence score for the FSRS calculation
   */
  private calculateConfidenceScore(card: FoundationCard): number {
    // Higher confidence with more reviews and consistent performance
    const reviewFactor = Math.min(1, card.reviewCount / 10)
    const consistencyFactor = this.calculateConsistencyScore(card.responseHistory)
    return (reviewFactor + consistencyFactor) / 2
  }
  
  /**
   * Calculate consistency score from response history
   */
  private calculateConsistencyScore(history: ResponseLog[]): number {
    if (history.length < 3) return 0.5
    
    const recentResponses = history.slice(-10)
    const correctResponses = recentResponses.filter(r => r.wasCorrect).length
    return correctResponses / recentResponses.length
  }
  
  /**
   * Calculate days since last review
   */
  private calculateDaysSinceReview(lastReviewed: Date): number {
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - lastReviewed.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }
}
```

#### **File: `server/src/services/fsrs/FSRSValidator.ts`**
```typescript
import { FoundationCard } from '../../../shared/types/fsrs'

export class FSRSValidator {
  /**
   * Validate card data before FSRS calculation
   */
  validateCard(card: FoundationCard): void {
    if (!card) {
      throw new Error('Card is required')
    }
    
    if (typeof card.difficulty !== 'number' || card.difficulty < 1 || card.difficulty > 10) {
      throw new Error(`Invalid difficulty: ${card.difficulty}. Must be between 1 and 10`)
    }
    
    if (typeof card.stability !== 'number' || card.stability < 0) {
      throw new Error(`Invalid stability: ${card.stability}. Must be non-negative`)
    }
    
    if (typeof card.retrievability !== 'number' || card.retrievability < 0 || card.retrievability > 1) {
      throw new Error(`Invalid retrievability: ${card.retrievability}. Must be between 0 and 1`)
    }
    
    if (!card.lastReviewed || !(card.lastReviewed instanceof Date)) {
      throw new Error('Invalid lastReviewed date')
    }
    
    if (card.responseHistory && !Array.isArray(card.responseHistory)) {
      throw new Error('Response history must be an array')
    }
  }
  
  /**
   * Validate rating input
   */
  validateRating(rating: string): void {
    const validRatings = ['again', 'hard', 'good', 'easy']
    if (!validRatings.includes(rating)) {
      throw new Error(`Invalid rating: ${rating}. Must be one of: ${validRatings.join(', ')}`)
    }
  }
  
  /**
   * Validate calculated results
   */
  validateCalculationResult(oldCard: FoundationCard, newCard: FoundationCard): void {
    // Ensure difficulty stays within bounds
    if (newCard.difficulty < 1 || newCard.difficulty > 10) {
      throw new Error(`Calculated difficulty out of bounds: ${newCard.difficulty}`)
    }
    
    // Ensure stability is reasonable
    if (newCard.stability < 0.1 || newCard.stability > 365 * 5) {
      throw new Error(`Calculated stability out of bounds: ${newCard.stability}`)
    }
    
    // Ensure retrievability is valid
    if (newCard.retrievability < 0 || newCard.retrievability > 1) {
      throw new Error(`Calculated retrievability out of bounds: ${newCard.retrievability}`)
    }
    
    // Ensure monotonic time progression
    if (newCard.lastReviewed <= oldCard.lastReviewed) {
      throw new Error('New lastReviewed must be after old lastReviewed')
    }
  }
}
```

### **1.2 Optimized Card Selection**

#### **File: `server/src/services/selection/OptimizedCardSelector.ts`**
```typescript
import { FoundationCard } from '../../../shared/types/fsrs'
import { PerformanceMonitor } from '../monitoring/PerformanceMonitor'

export interface CardSelectionOptions {
  deckId: string
  userId: string
  maxCards?: number
  excludeCardIds?: string[]
  preferenceWeights?: {
    urgency: number
    difficulty: number
    randomization: number
  }
}

export interface CardUrgencyScore {
  cardId: string
  urgencyScore: number
  retrievability: number
  overdueDays: number
  difficultyFactor: number
}

export class OptimizedCardSelector {
  private cardCache = new Map<string, FoundationCard>()
  private sortedQueues = new Map<string, string[]>()
  private queueExpiry = new Map<string, Date>()
  private performanceMonitor: PerformanceMonitor
  
  private readonly CACHE_TTL_MINUTES = 5
  private readonly DEFAULT_WEIGHTS = {
    urgency: 0.6,
    difficulty: 0.3,
    randomization: 0.1
  }
  
  constructor(performanceMonitor: PerformanceMonitor) {
    this.performanceMonitor = performanceMonitor
  }
  
  /**
   * Select next optimal card for review
   */
  async selectNextCard(options: CardSelectionOptions): Promise<FoundationCard | null> {
    const startTime = Date.now()
    
    try {
      // Fast path: return pre-sorted card from cache
      const cachedCard = await this.getFromSortedQueue(options.deckId, options.excludeCardIds)
      if (cachedCard) {
        await this.performanceMonitor.recordSelection(Date.now() - startTime, true, 'cache_hit')
        return cachedCard
      }
      
      // Rebuild queue and try again
      await this.rebuildQueue(options)
      const newCard = await this.getFromSortedQueue(options.deckId, options.excludeCardIds)
      
      await this.performanceMonitor.recordSelection(Date.now() - startTime, true, 'cache_miss')
      return newCard
      
    } catch (error) {
      await this.performanceMonitor.recordSelection(Date.now() - startTime, false, 'error')
      throw error
    }
  }
  
  /**
   * Get card from pre-sorted queue
   */
  private async getFromSortedQueue(deckId: string, excludeCardIds?: string[]): Promise<FoundationCard | null> {
    const queue = this.sortedQueues.get(deckId)
    const expiry = this.queueExpiry.get(deckId)
    
    // Check if queue exists and is not expired
    if (!queue || !expiry || expiry < new Date()) {
      return null
    }
    
    // Find first non-excluded card
    let cardId: string | undefined
    while (queue.length > 0) {
      const candidateId = queue.shift()!
      if (!excludeCardIds?.includes(candidateId)) {
        cardId = candidateId
        break
      }
    }
    
    if (!cardId) return null
    
    return this.cardCache.get(cardId) || await this.loadCard(cardId)
  }
  
  /**
   * Rebuild the sorted queue for a deck
   */
  private async rebuildQueue(options: CardSelectionOptions): Promise<void> {
    const dueCards = await this.getDueCards(options.deckId, options.userId)
    
    if (dueCards.length === 0) {
      this.sortedQueues.set(options.deckId, [])
      return
    }
    
    // Calculate urgency scores for all cards
    const urgencyScores = await this.calculateUrgencyScores(dueCards, options.preferenceWeights)
    
    // Sort by urgency with controlled randomization
    const sortedCards = urgencyScores
      .sort((a, b) => {
        const urgencyDiff = b.urgencyScore - a.urgencyScore
        const randomization = (Math.random() - 0.5) * 0.1 * (options.preferenceWeights?.randomization || this.DEFAULT_WEIGHTS.randomization)
        return urgencyDiff + randomization
      })
      .map(score => score.cardId)
    
    // Cache the sorted queue
    this.sortedQueues.set(options.deckId, sortedCards)
    this.queueExpiry.set(options.deckId, new Date(Date.now() + this.CACHE_TTL_MINUTES * 60 * 1000))
    
    // Cache the cards for fast access
    dueCards.forEach(card => this.cardCache.set(card.id, card))
  }
  
  /**
   * Calculate urgency scores for cards
   */
  private async calculateUrgencyScores(
    cards: FoundationCard[], 
    weights?: CardSelectionOptions['preferenceWeights']
  ): Promise<CardUrgencyScore[]> {
    const w = weights || this.DEFAULT_WEIGHTS
    const now = new Date()
    
    return cards.map(card => {
      // Calculate how overdue the card is
      const overdueDays = Math.max(0, 
        (now.getTime() - card.nextReview.getTime()) / (1000 * 60 * 60 * 24)
      )
      
      // Urgency based on retrievability (lower = more urgent)
      const retrievabilityUrgency = 1 - card.retrievability
      
      // Difficulty factor (prefer cards that aren't too hard)
      const difficultyFactor = this.calculateDifficultyFactor(card.difficulty)
      
      // Combined urgency score
      const urgencyScore = 
        (retrievabilityUrgency * w.urgency) +
        (overdueDays * 0.1 * w.urgency) +
        (difficultyFactor * w.difficulty)
      
      return {
        cardId: card.id,
        urgencyScore,
        retrievability: card.retrievability,
        overdueDays,
        difficultyFactor
      }
    })
  }
  
  /**
   * Calculate difficulty factor for card selection
   */
  private calculateDifficultyFactor(difficulty: number): number {
    // Prefer moderate difficulty cards (bell curve centered at 5)
    const optimal = 5
    const distance = Math.abs(difficulty - optimal)
    return Math.max(0, 1 - (distance / 5))
  }
  
  /**
   * Get due cards for a deck
   */
  private async getDueCards(deckId: string, userId: string): Promise<FoundationCard[]> {
    // This would typically query the database
    // For now, return mock implementation
    const allCards = await this.loadDeckCards(deckId, userId)
    const now = new Date()
    
    return allCards.filter(card => 
      card.nextReview <= now || card.retrievability < 0.9
    )
  }
  
  /**
   * Load a single card
   */
  private async loadCard(cardId: string): Promise<FoundationCard | null> {
    // Database query implementation
    // Return cached version if available
    return this.cardCache.get(cardId) || null
  }
  
  /**
   * Load all cards for a deck
   */
  private async loadDeckCards(deckId: string, userId: string): Promise<FoundationCard[]> {
    // Database query implementation
    return []
  }
  
  /**
   * Clear cache for a deck
   */
  clearCache(deckId: string): void {
    this.sortedQueues.delete(deckId)
    this.queueExpiry.delete(deckId)
    
    // Clear related cards from cache
    for (const [cardId, card] of this.cardCache.entries()) {
      if (card.deckId === deckId) {
        this.cardCache.delete(cardId)
      }
    }
  }
  
  /**
   * Get queue statistics for monitoring
   */
  getQueueStats(deckId: string): {
    queueLength: number
    cacheHit: boolean
    lastRebuild: Date | null
    expiry: Date | null
  } {
    const queue = this.sortedQueues.get(deckId)
    const expiry = this.queueExpiry.get(deckId)
    
    return {
      queueLength: queue?.length || 0,
      cacheHit: queue !== undefined,
      lastRebuild: null, // Would track in production
      expiry
    }
  }
}
```

### **1.3 Database Schema Migration**

#### **File: `server/migrations/001_add_fsrs_fields.sql`**
```sql
-- Add FSRS-specific fields to cards table
ALTER TABLE cards ADD COLUMN IF NOT EXISTS difficulty DECIMAL(4,2) DEFAULT 5.0;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS stability DECIMAL(10,4) DEFAULT 1.0;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS retrievability DECIMAL(6,4) DEFAULT 1.0;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS response_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS average_response_time INTEGER DEFAULT 0;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS consecutive_correct INTEGER DEFAULT 0;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS consecutive_incorrect INTEGER DEFAULT 0;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS next_review TIMESTAMP DEFAULT NOW();
ALTER TABLE cards ADD COLUMN IF NOT EXISTS cache_version INTEGER DEFAULT 1;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS last_calculation TIMESTAMP DEFAULT NOW();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_cards_next_review ON cards(next_review);
CREATE INDEX IF NOT EXISTS idx_cards_retrievability ON cards(retrievability);
CREATE INDEX IF NOT EXISTS idx_cards_deck_due ON cards(deck_id, next_review);
CREATE INDEX IF NOT EXISTS idx_cards_difficulty ON cards(difficulty);

-- Create FSRS parameters table
CREATE TABLE IF NOT EXISTS fsrs_parameters (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    w1 DECIMAL(8,6) DEFAULT 0.4072,
    w2 DECIMAL(8,6) DEFAULT 1.1829,
    w3 DECIMAL(8,6) DEFAULT 3.1262,
    w4 DECIMAL(8,6) DEFAULT 15.4722,
    difficulty_modifier DECIMAL(6,4) DEFAULT 1.0,
    stability_modifier DECIMAL(6,4) DEFAULT 1.0,
    retrievability_threshold DECIMAL(6,4) DEFAULT 0.9,
    last_updated TIMESTAMP DEFAULT NOW(),
    calculation_count INTEGER DEFAULT 0,
    UNIQUE(user_id)
);

-- Create card selection cache table for performance
CREATE TABLE IF NOT EXISTS card_selection_cache (
    id SERIAL PRIMARY KEY,
    deck_id UUID NOT NULL,
    user_id UUID NOT NULL,
    sorted_card_ids TEXT[] NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    UNIQUE(deck_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_card_selection_cache_expiry ON card_selection_cache(expires_at);

-- Create performance monitoring tables
CREATE TABLE IF NOT EXISTS fsrs_performance_logs (
    id SERIAL PRIMARY KEY,
    operation_type VARCHAR(50) NOT NULL,
    calculation_time_ms INTEGER NOT NULL,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    card_count INTEGER,
    user_id UUID,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fsrs_performance_logs_created_at ON fsrs_performance_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_fsrs_performance_logs_operation ON fsrs_performance_logs(operation_type);
```

## 🔄 Phase 2: Basic Momentum Tracking (Weeks 4-5)

### **2.1 Session State Management**

#### **File: `shared/types/momentum.ts`**
```typescript
export interface SimpleSessionState {
  sessionId: string
  userId: string
  deckId: string
  startTime: Date
  lastActivity: Date
  cardsReviewed: number
  
  // Momentum tracking
  recentPerformance: number[]  // Last 5 responses (0-1)
  currentMomentum: number      // 0-1 rolling average
  momentumHistory: MomentumSnapshot[]
  
  // Adaptation state
  adaptationMode: 'normal' | 'building_confidence' | 'challenging'
  adaptationTriggerCount: number
  lastAdaptation: Date | null
  
  // Performance metrics
  averageResponseTime: number
  sessionEfficiency: number  // Cards per minute
  
  // Context
  sessionContext: {
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
    dayOfWeek: string
    isWeekend: boolean
  }
}

export interface MomentumSnapshot {
  timestamp: Date
  momentum: number
  cardId: string
  rating: string
  adaptationMode: string
}

export interface MomentumCalculationResult {
  newMomentum: number
  adaptationChange: boolean
  oldMode: string
  newMode: string
  confidence: number
}
```

#### **File: `server/src/services/session/SimpleMomentumTracker.ts`**
```typescript
import { SimpleSessionState, MomentumSnapshot, MomentumCalculationResult } from '../../../shared/types/momentum'
import { PerformanceMonitor } from '../monitoring/PerformanceMonitor'

export class SimpleMomentumTracker {
  private performanceMonitor: PerformanceMonitor
  
  private readonly MOMENTUM_WINDOW_SIZE = 5
  private readonly CONFIDENCE_THRESHOLD = 0.3
  private readonly CHALLENGING_THRESHOLD = 0.7
  
  constructor(performanceMonitor: PerformanceMonitor) {
    this.performanceMonitor = performanceMonitor
  }
  
  /**
   * Update session momentum based on latest response
   */
  async updateSession(
    session: SimpleSessionState, 
    cardId: string,
    rating: string, 
    responseTime: number
  ): Promise<{
    updatedSession: SimpleSessionState
    momentumResult: MomentumCalculationResult
  }> {
    const startTime = Date.now()
    
    try {
      const performance = this.ratingToPerformance(rating)
      
      // Update recent performance (sliding window)
      const newRecent = [...session.recentPerformance, performance].slice(-this.MOMENTUM_WINDOW_SIZE)
      
      // Calculate new momentum (weighted average with recency bias)
      const newMomentum = this.calculateWeightedMomentum(newRecent)
      
      // Determine adaptation mode
      const oldMode = session.adaptationMode
      const newMode = this.determineAdaptationMode(newMomentum, session)
      
      // Update average response time
      const newAverageResponseTime = this.updateAverageResponseTime(
        session.averageResponseTime, 
        responseTime, 
        session.cardsReviewed
      )
      
      // Calculate session efficiency
      const sessionDuration = (Date.now() - session.startTime.getTime()) / (1000 * 60) // minutes
      const sessionEfficiency = sessionDuration > 0 ? session.cardsReviewed / sessionDuration : 0
      
      // Create momentum snapshot
      const momentumSnapshot: MomentumSnapshot = {
        timestamp: new Date(),
        momentum: newMomentum,
        cardId,
        rating,
        adaptationMode: newMode
      }
      
      // Update session
      const updatedSession: SimpleSessionState = {
        ...session,
        lastActivity: new Date(),
        cardsReviewed: session.cardsReviewed + 1,
        recentPerformance: newRecent,
        currentMomentum: newMomentum,
        momentumHistory: [...session.momentumHistory, momentumSnapshot].slice(-50), // Keep last 50
        adaptationMode: newMode,
        adaptationTriggerCount: oldMode !== newMode ? session.adaptationTriggerCount + 1 : session.adaptationTriggerCount,
        lastAdaptation: oldMode !== newMode ? new Date() : session.lastAdaptation,
        averageResponseTime: newAverageResponseTime,
        sessionEfficiency
      }
      
      const momentumResult: MomentumCalculationResult = {
        newMomentum,
        adaptationChange: oldMode !== newMode,
        oldMode,
        newMode,
        confidence: this.calculateMomentumConfidence(newRecent)
      }
      
      // Record performance metrics
      await this.performanceMonitor.recordMomentumCalculation(Date.now() - startTime, true)
      
      return { updatedSession, momentumResult }
      
    } catch (error) {
      await this.performanceMonitor.recordMomentumCalculation(Date.now() - startTime, false)
      throw error
    }
  }
  
  /**
   * Convert rating to performance value
   */
  private ratingToPerformance(rating: string): number {
    const values = { 
      'again': 0, 
      'hard': 0.25, 
      'good': 0.75, 
      'easy': 1.0 
    }
    return values[rating] ?? 0.5
  }
  
  /**
   * Calculate weighted momentum with recency bias
   */
  private calculateWeightedMomentum(recentPerformance: number[]): number {
    if (recentPerformance.length === 0) return 0.5
    
    // Apply recency weighting (more recent responses have higher weight)
    const weights = this.generateRecencyWeights(recentPerformance.length)
    let weightedSum = 0
    let totalWeight = 0
    
    for (let i = 0; i < recentPerformance.length; i++) {
      weightedSum += recentPerformance[i] * weights[i]
      totalWeight += weights[i]
    }
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0.5
  }
  
  /**
   * Generate recency weights (more recent = higher weight)
   */
  private generateRecencyWeights(count: number): number[] {
    const weights: number[] = []
    for (let i = 0; i < count; i++) {
      // Exponential weighting: newer responses get exponentially higher weight
      weights.push(Math.pow(1.5, i))
    }
    return weights
  }
  
  /**
   * Determine adaptation mode based on momentum and context
   */
  private determineAdaptationMode(
    momentum: number, 
    session: SimpleSessionState
  ): SimpleSessionState['adaptationMode'] {
    // Apply hysteresis to prevent mode flickering
    const currentMode = session.adaptationMode
    
    if (currentMode === 'building_confidence') {
      // Require higher momentum to exit confidence building
      return momentum > (this.CONFIDENCE_THRESHOLD + 0.1) ? 'normal' : 'building_confidence'
    } else if (currentMode === 'challenging') {
      // Require lower momentum to exit challenging mode
      return momentum < (this.CHALLENGING_THRESHOLD - 0.1) ? 'normal' : 'challenging'
    } else {
      // Normal mode transitions
      if (momentum < this.CONFIDENCE_THRESHOLD) {
        return 'building_confidence'
      } else if (momentum > this.CHALLENGING_THRESHOLD) {
        return 'challenging'
      } else {
        return 'normal'
      }
    }
  }
  
  /**
   * Update average response time with exponential moving average
   */
  private updateAverageResponseTime(
    currentAverage: number, 
    newResponseTime: number, 
    reviewCount: number
  ): number {
    if (reviewCount === 0) return newResponseTime
    
    // Use exponential moving average with more weight on recent responses
    const alpha = Math.min(0.3, 2 / (reviewCount + 1))
    return currentAverage * (1 - alpha) + newResponseTime * alpha
  }
  
  /**
   * Calculate confidence in momentum measurement
   */
  private calculateMomentumConfidence(recentPerformance: number[]): number {
    if (recentPerformance.length < 3) return 0.5
    
    // Confidence based on consistency and sample size
    const variance = this.calculateVariance(recentPerformance)
    const sampleSizeFactor = Math.min(1, recentPerformance.length / this.MOMENTUM_WINDOW_SIZE)
    const consistencyFactor = Math.max(0, 1 - variance * 2) // Lower variance = higher confidence
    
    return (sampleSizeFactor + consistencyFactor) / 2
  }
  
  /**
   * Calculate variance of recent performance
   */
  private calculateVariance(values: number[]): number {
    if (values.length < 2) return 0
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2))
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length
  }
  
  /**
   * Create new session
   */
  createSession(userId: string, deckId: string): SimpleSessionState {
    const now = new Date()
    const hour = now.getHours()
    
    let timeOfDay: SimpleSessionState['sessionContext']['timeOfDay']
    if (hour < 6) timeOfDay = 'night'
    else if (hour < 12) timeOfDay = 'morning'
    else if (hour < 18) timeOfDay = 'afternoon'
    else timeOfDay = 'evening'
    
    return {
      sessionId: this.generateSessionId(),
      userId,
      deckId,
      startTime: now,
      lastActivity: now,
      cardsReviewed: 0,
      recentPerformance: [],
      currentMomentum: 0.5, // Start neutral
      momentumHistory: [],
      adaptationMode: 'normal',
      adaptationTriggerCount: 0,
      lastAdaptation: null,
      averageResponseTime: 0,
      sessionEfficiency: 0,
      sessionContext: {
        timeOfDay,
        dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }),
        isWeekend: [0, 6].includes(now.getDay())
      }
    }
  }
  
  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  /**
   * Get session statistics
   */
  getSessionStats(session: SimpleSessionState): {
    momentum: number
    adaptationMode: string
    cardsReviewed: number
    efficiency: number
    duration: number
    momentumTrend: 'improving' | 'declining' | 'stable'
  } {
    const duration = (Date.now() - session.startTime.getTime()) / (1000 * 60) // minutes
    
    // Calculate momentum trend from recent history
    const recentSnapshots = session.momentumHistory.slice(-3)
    let momentumTrend: 'improving' | 'declining' | 'stable' = 'stable'
    
    if (recentSnapshots.length >= 2) {
      const first = recentSnapshots[0].momentum
      const last = recentSnapshots[recentSnapshots.length - 1].momentum
      const diff = last - first
      
      if (diff > 0.1) momentumTrend = 'improving'
      else if (diff < -0.1) momentumTrend = 'declining'
    }
    
    return {
      momentum: session.currentMomentum,
      adaptationMode: session.adaptationMode,
      cardsReviewed: session.cardsReviewed,
      efficiency: session.sessionEfficiency,
      duration,
      momentumTrend
    }
  }
}
```

### **2.2 Momentum-Aware Card Selection**

#### **File: `server/src/services/selection/MomentumAwareSelector.ts`**
```typescript
import { OptimizedCardSelector, CardSelectionOptions } from './OptimizedCardSelector'
import { FoundationCard } from '../../../shared/types/fsrs'
import { SimpleSessionState } from '../../../shared/types/momentum'
import { PerformanceMonitor } from '../monitoring/PerformanceMonitor'

export interface MomentumSelectionOptions extends CardSelectionOptions {
  session: SimpleSessionState
  adaptationStrength?: number // 0-1, how aggressive the adaptation should be
}

export interface MomentumSelectionResult {
  card: FoundationCard
  selectionReason: 'normal' | 'confidence_booster' | 'challenge' | 'fallback'
  adaptationApplied: boolean
  alternativesConsidered: number
}

export class MomentumAwareSelector extends OptimizedCardSelector {
  private readonly DEFAULT_ADAPTATION_STRENGTH = 0.7
  private readonly MAX_ADAPTATION_ATTEMPTS = 5
  
  /**
   * Select next card with momentum awareness
   */
  async selectNextCard(options: MomentumSelectionOptions): Promise<MomentumSelectionResult> {
    const startTime = Date.now()
    
    try {
      // Get base card recommendation
      const baseCard = await super.selectNextCard(options)
      
      if (!baseCard) {
        throw new Error('No cards available for selection')
      }
      
      // Apply momentum-based adaptation
      const adaptedCard = await this.applyMomentumAdaptation(baseCard, options)
      
      await this.performanceMonitor.recordSelection(
        Date.now() - startTime, 
        true, 
        `momentum_${options.session.adaptationMode}`
      )
      
      return adaptedCard
      
    } catch (error) {
      await this.performanceMonitor.recordSelection(Date.now() - startTime, false, 'momentum_error')
      throw error
    }
  }
  
  /**
   * Apply momentum-based adaptation to card selection
   */
  private async applyMomentumAdaptation(
    baseCard: FoundationCard,
    options: MomentumSelectionOptions
  ): Promise<MomentumSelectionResult> {
    const { session } = options
    const adaptationStrength = options.adaptationStrength || this.DEFAULT_ADAPTATION_STRENGTH
    
    // Check if adaptation should be applied
    if (session.adaptationMode === 'normal' || Math.random() > adaptationStrength) {
      return {
        card: baseCard,
        selectionReason: 'normal',
        adaptationApplied: false,
        alternativesConsidered: 0
      }
    }
    
    // Apply specific adaptation based on momentum state
    switch (session.adaptationMode) {
      case 'building_confidence':
        return await this.selectConfidenceBooster(baseCard, options)
      
      case 'challenging':
        return await this.selectChallenge(baseCard, options)
      
      default:
        return {
          card: baseCard,
          selectionReason: 'normal',
          adaptationApplied: false,
          alternativesConsidered: 0
        }
    }
  }
  
  /**
   * Select a confidence-building card
   */
  private async selectConfidenceBooster(
    fallbackCard: FoundationCard,
    options: MomentumSelectionOptions
  ): Promise<MomentumSelectionResult> {
    const availableCards = await this.getAvailableCards(options.deckId, options.userId)
    
    // Filter for confidence boosters
    const boosters = availableCards.filter(card => 
      card.id !== fallbackCard.id &&
      !options.excludeCardIds?.includes(card.id) &&
      this.isConfidenceBooster(card)
    )
    
    if (boosters.length === 0) {
      return {
        card: fallbackCard,
        selectionReason: 'fallback',
        adaptationApplied: false,
        alternativesConsidered: availableCards.length
      }
    }
    
    // Select best confidence booster
    const bestBooster = this.selectBestConfidenceBooster(boosters, options.session)
    
    return {
      card: bestBooster,
      selectionReason: 'confidence_booster',
      adaptationApplied: true,
      alternativesConsidered: boosters.length
    }
  }
  
  /**
   * Select a challenging card
   */
  private async selectChallenge(
    fallbackCard: FoundationCard,
    options: MomentumSelectionOptions
  ): Promise<MomentumSelectionResult> {
    const availableCards = await this.getAvailableCards(options.deckId, options.userId)
    
    // Filter for appropriate challenges
    const challenges = availableCards.filter(card => 
      card.id !== fallbackCard.id &&
      !options.excludeCardIds?.includes(card.id) &&
      this.isAppropriateChallenge(card, options.session)
    )
    
    if (challenges.length === 0) {
      return {
        card: fallbackCard,
        selectionReason: 'fallback',
        adaptationApplied: false,
        alternativesConsidered: availableCards.length
      }
    }
    
    // Select best challenge
    const bestChallenge = this.selectBestChallenge(challenges, options.session)
    
    return {
      card: bestChallenge,
      selectionReason: 'challenge',
      adaptationApplied: true,
      alternativesConsidered: challenges.length
    }
  }
  
  /**
   * Check if card is a good confidence booster
   */
  private isConfidenceBooster(card: FoundationCard): boolean {
    return (
      card.stability > 7 &&              // Well-established memory
      card.retrievability > 0.8 &&       // High recall probability
      card.consecutiveCorrect >= 2 &&    // Recent success history
      card.difficulty < 6                // Not too intrinsically difficult
    )
  }
  
  /**
   * Check if card is an appropriate challenge
   */
  private isAppropriateChallenge(card: FoundationCard, session: SimpleSessionState): boolean {
    const sessionFatigue = this.estimateSessionFatigue(session)
    const maxDifficulty = 8 - (sessionFatigue * 2) // Reduce difficulty when fatigued
    
    return (
      card.retrievability < 0.7 &&         // Needs review
      card.difficulty >= 4 &&              // Sufficiently challenging
      card.difficulty <= maxDifficulty &&  // Not too hard for current state
      card.consecutiveIncorrect < 3         // Not a chronic problem card
    )
  }
  
  /**
   * Select best confidence booster from candidates
   */
  private selectBestConfidenceBooster(cards: FoundationCard[], session: SimpleSessionState): FoundationCard {
    return cards.sort((a, b) => {
      // Prioritize by confidence-building potential
      const aScore = this.calculateConfidenceScore(a)
      const bScore = this.calculateConfidenceScore(b)
      return bScore - aScore
    })[0]
  }
  
  /**
   * Select best challenge from candidates
   */
  private selectBestChallenge(cards: FoundationCard[], session: SimpleSessionState): FoundationCard {
    const sessionFatigue = this.estimateSessionFatigue(session)
    
    return cards.sort((a, b) => {
      // Adjust challenge difficulty based on session fatigue
      const aChallengeScore = this.calculateChallengeScore(a, sessionFatigue)
      const bChallengeScore = this.calculateChallengeScore(b, sessionFatigue)
      return bChallengeScore - aChallengeScore
    })[0]
  }
  
  /**
   * Calculate confidence-building score for a card
   */
  private calculateConfidenceScore(card: FoundationCard): number {
    const stabilityScore = Math.min(1, card.stability / 20) * 0.4
    const retrievabilityScore = card.retrievability * 0.3
    const streakScore = Math.min(1, card.consecutiveCorrect / 5) * 0.2
    const difficultyScore = (10 - card.difficulty) / 10 * 0.1
    
    return stabilityScore + retrievabilityScore + streakScore + difficultyScore
  }
  
  /**
   * Calculate challenge appropriateness score
   */
  private calculateChallengeScore(card: FoundationCard, sessionFatigue: number): number {
    const urgencyScore = (1 - card.retrievability) * 0.4
    const difficultyScore = (card.difficulty / 10) * (1 - sessionFatigue) * 0.3
    const recencyScore = this.calculateRecencyScore(card) * 0.2
    const stabilityScore = Math.min(1, card.stability / 10) * 0.1
    
    return urgencyScore + difficultyScore + recencyScore + stabilityScore
  }
  
  /**
   * Estimate session fatigue based on various factors
   */
  private estimateSessionFatigue(session: SimpleSessionState): number {
    const duration = (Date.now() - session.startTime.getTime()) / (1000 * 60) // minutes
    const durationFatigue = Math.min(1, duration / 45) // Increase fatigue after 45 minutes
    
    const wrongAnswerFatigue = session.recentPerformance
      .filter(p => p < 0.5)
      .length / session.recentPerformance.length
    
    const adaptationFatigue = Math.min(1, session.adaptationTriggerCount / 10) // Too many adaptations
    
    return Math.min(1, (durationFatigue + wrongAnswerFatigue + adaptationFatigue) / 3)
  }
  
  /**
   * Calculate recency score (how recently the card was studied)
   */
  private calculateRecencyScore(card: FoundationCard): number {
    const daysSinceReview = (Date.now() - card.lastReviewed.getTime()) / (1000 * 60 * 60 * 24)
    return Math.min(1, daysSinceReview / 7) // More recent = lower score for challenges
  }
  
  /**
   * Get available cards for selection (extended method)
   */
  private async getAvailableCards(deckId: string, userId: string): Promise<FoundationCard[]> {
    // This would typically query the database for cards available for study
    // Including both due cards and cards that could be studied early
    return await this.loadDeckCards(deckId, userId)
  }
}
```

## 🔍 Phase 3: Anti-Clustering & Context (Weeks 6-7)

### **3.1 Simple Clustering Prevention**

#### **File: `shared/types/clustering.ts`**
```typescript
export interface CardWithContext extends FoundationCard {
  // Content analysis
  contentHash: string           // SHA-256 hash of front + back content
  contentLength: number         // Total character count
  topicTags: string[]          // User-defined or auto-detected topics
  conceptTags: string[]        // Derived concept categories
  
  // Clustering prevention
  similarCardIds: string[]     // Pre-computed similar cards
  lastClusterTime: Date | null // When this card was last in a cluster
  clusteringWeight: number     // How much this card affects clustering (0-1)
  
  // Context metadata
  contentType: 'text' | 'image' | 'audio' | 'mixed'
  languageCode: string
  estimatedDifficulty: number  // Content-based difficulty estimate
}

export interface ClusteringContext {
  recentCardHashes: Set<string>
  recentTopics: Set<string>
  recentConcepts: Set<string>
  lastContentTypes: string[]
  clusteringHistory: ClusteringEvent[]
}

export interface ClusteringEvent {
  timestamp: Date
  cardId: string
  clusteredWith: string[]
  preventionReason: string
}

export interface SimilarityResult {
  cardId: string
  similarityScore: number
  similarityType: 'content' | 'topic' | 'concept' | 'metadata'
  confidence: number
}
```

#### **File: `server/src/services/selection/AntiClusteringSelector.ts`**
```typescript
import { MomentumAwareSelector, MomentumSelectionOptions } from './MomentumAwareSelector'
import { CardWithContext, ClusteringContext, ClusteringEvent, SimilarityResult } from '../../../shared/types/clustering'
import { PerformanceMonitor } from '../monitoring/PerformanceMonitor'

export interface AntiClusteringOptions extends MomentumSelectionOptions {
  clusteringStrength?: number  // 0-1, how aggressively to prevent clustering
  similarityThreshold?: number // 0-1, threshold for considering cards similar
}

export class AntiClusteringSelector extends MomentumAwareSelector {
  private clusteringContexts = new Map<string, ClusteringContext>()
  private similarityCache = new Map<string, SimilarityResult[]>()
  
  private readonly DEFAULT_CLUSTERING_STRENGTH = 0.8
  private readonly DEFAULT_SIMILARITY_THRESHOLD = 0.7
  private readonly MAX_CLUSTERING_ATTEMPTS = 5
  private readonly CONTEXT_RETENTION_SIZE = 5
  
  /**
   * Select next card with anti-clustering
   */
  async selectNextCard(options: AntiClusteringOptions): Promise<any> {
    const startTime = Date.now()
    
    try {
      let attempts = 0
      const maxAttempts = this.MAX_CLUSTERING_ATTEMPTS
      const clusteringStrength = options.clusteringStrength || this.DEFAULT_CLUSTERING_STRENGTH
      
      // Get clustering context for this session
      const context = this.getClusteringContext(options.session.sessionId)
      
      while (attempts < maxAttempts) {
        // Get momentum-aware selection
        const momentumResult = await super.selectNextCard(options)
        const candidate = momentumResult.card as CardWithContext
        
        // Check if candidate should be excluded due to clustering
        if (Math.random() > clusteringStrength || !this.shouldPreventClustering(candidate, context, options)) {
          // Accept this card and update context
          this.updateClusteringContext(candidate, context, options.session.sessionId)
          
          await this.performanceMonitor.recordSelection(
            Date.now() - startTime, 
            true, 
            `anti_clustering_accepted_${attempts}`
          )
          
          return {
            ...momentumResult,
            clusteringInfo: {
              attemptsRequired: attempts + 1,
              clusteringPrevented: attempts > 0,
              similarityScore: attempts > 0 ? this.calculateSimilarityScore(candidate, context) : 0
            }
          }
        }
        
        // Exclude this card and try again
        options.excludeCardIds = [...(options.excludeCardIds || []), candidate.id]
        attempts++
        
        // Log clustering prevention
        this.logClusteringEvent(candidate, context, `attempt_${attempts}`)
      }
      
      // Fallback: clear context and accept any card
      this.clearClusteringContext(options.session.sessionId)
      const fallbackResult = await super.selectNextCard(options)
      
      await this.performanceMonitor.recordSelection(
        Date.now() - startTime, 
        true, 
        'anti_clustering_fallback'
      )
      
      return {
        ...fallbackResult,
        clusteringInfo: {
          attemptsRequired: maxAttempts,
          clusteringPrevented: false,
          similarityScore: 0,
          fallbackUsed: true
        }
      }
      
    } catch (error) {
      await this.performanceMonitor.recordSelection(Date.now() - startTime, false, 'anti_clustering_error')
      throw error
    }
  }
  
  /**
   * Get clustering context for a session
   */
  private getClusteringContext(sessionId: string): ClusteringContext {
    if (!this.clusteringContexts.has(sessionId)) {
      this.clusteringContexts.set(sessionId, {
        recentCardHashes: new Set(),
        recentTopics: new Set(),
        recentConcepts: new Set(),
        lastContentTypes: [],
        clusteringHistory: []
      })
    }
    return this.clusteringContexts.get(sessionId)!
  }
  
  /**
   * Check if card should be prevented due to clustering
   */
  private shouldPreventClustering(
    card: CardWithContext, 
    context: ClusteringContext,
    options: AntiClusteringOptions
  ): boolean {
    const similarityThreshold = options.similarityThreshold || this.DEFAULT_SIMILARITY_THRESHOLD
    const similarityScore = this.calculateSimilarityScore(card, context)
    
    return similarityScore > similarityThreshold
  }
  
  /**
   * Calculate similarity score between card and recent context
   */
  private calculateSimilarityScore(card: CardWithContext, context: ClusteringContext): number {
    let totalSimilarity = 0
    let factorCount = 0
    
    // Content hash similarity (exact matches)
    if (context.recentCardHashes.has(card.contentHash)) {
      totalSimilarity += 1.0
      factorCount += 1
    }
    
    // Topic similarity
    const topicOverlap = this.calculateSetOverlap(new Set(card.topicTags), context.recentTopics)
    if (topicOverlap > 0) {
      totalSimilarity += topicOverlap * 0.8
      factorCount += 1
    }
    
    // Concept similarity
    const conceptOverlap = this.calculateSetOverlap(new Set(card.conceptTags), context.recentConcepts)
    if (conceptOverlap > 0) {
      totalSimilarity += conceptOverlap * 0.6
      factorCount += 1
    }
    
    // Content type similarity
    const recentContentTypes = new Set(context.lastContentTypes)
    if (recentContentTypes.has(card.contentType) && recentContentTypes.size < 2) {
      totalSimilarity += 0.4
      factorCount += 1
    }
    
    // Pre-computed similarity
    const precomputedSimilarity = this.checkPrecomputedSimilarity(card, context)
    if (precomputedSimilarity > 0) {
      totalSimilarity += precomputedSimilarity * 0.7
      factorCount += 1
    }
    
    return factorCount > 0 ? totalSimilarity / factorCount : 0
  }
  
  /**
   * Calculate overlap between two sets
   */
  private calculateSetOverlap(set1: Set<string>, set2: Set<string>): number {
    if (set1.size === 0 || set2.size === 0) return 0
    
    const intersection = new Set([...set1].filter(x => set2.has(x)))
    const union = new Set([...set1, ...set2])
    
    return intersection.size / union.size // Jaccard similarity
  }
  
  /**
   * Check pre-computed similarity with recent cards
   */
  private checkPrecomputedSimilarity(card: CardWithContext, context: ClusteringContext): number {
    const recentCardIds = context.clusteringHistory
      .slice(-this.CONTEXT_RETENTION_SIZE)
      .map(event => event.cardId)
    
    const similarities = card.similarCardIds
      .filter(similarId => recentCardIds.includes(similarId))
    
    return similarities.length > 0 ? similarities.length / card.similarCardIds.length : 0
  }
  
  /**
   * Update clustering context after card selection
   */
  private updateClusteringContext(
    card: CardWithContext, 
    context: ClusteringContext, 
    sessionId: string
  ): void {
    // Update content hashes (keep recent ones)
    context.recentCardHashes.add(card.contentHash)
    if (context.recentCardHashes.size > this.CONTEXT_RETENTION_SIZE) {
      const hashArray = Array.from(context.recentCardHashes)
      context.recentCardHashes.clear()
      hashArray.slice(-this.CONTEXT_RETENTION_SIZE).forEach(hash => 
        context.recentCardHashes.add(hash)
      )
    }
    
    // Update topics
    card.topicTags.forEach(topic => context.recentTopics.add(topic))
    if (context.recentTopics.size > this.CONTEXT_RETENTION_SIZE * 2) {
      const topicArray = Array.from(context.recentTopics)
      context.recentTopics.clear()
      topicArray.slice(-this.CONTEXT_RETENTION_SIZE * 2).forEach(topic => 
        context.recentTopics.add(topic)
      )
    }
    
    // Update concepts
    card.conceptTags.forEach(concept => context.recentConcepts.add(concept))
    if (context.recentConcepts.size > this.CONTEXT_RETENTION_SIZE * 2) {
      const conceptArray = Array.from(context.recentConcepts)
      context.recentConcepts.clear()
      conceptArray.slice(-this.CONTEXT_RETENTION_SIZE * 2).forEach(concept => 
        context.recentConcepts.add(concept)
      )
    }
    
    // Update content types
    context.lastContentTypes.push(card.contentType)
    if (context.lastContentTypes.length > this.CONTEXT_RETENTION_SIZE) {
      context.lastContentTypes = context.lastContentTypes.slice(-this.CONTEXT_RETENTION_SIZE)
    }
    
    // Update clustering history
    const clusteringEvent: ClusteringEvent = {
      timestamp: new Date(),
      cardId: card.id,
      clusteredWith: [],
      preventionReason: 'accepted'
    }
    
    context.clusteringHistory.push(clusteringEvent)
    if (context.clusteringHistory.length > 20) {
      context.clusteringHistory = context.clusteringHistory.slice(-20)
    }
  }
  
  /**
   * Log clustering event for analysis
   */
  private logClusteringEvent(
    card: CardWithContext, 
    context: ClusteringContext, 
    reason: string
  ): void {
    const event: ClusteringEvent = {
      timestamp: new Date(),
      cardId: card.id,
      clusteredWith: this.findClusteredCards(card, context),
      preventionReason: reason
    }
    
    context.clusteringHistory.push(event)
  }
  
  /**
   * Find cards that the current card clusters with
   */
  private findClusteredCards(card: CardWithContext, context: ClusteringContext): string[] {
    const clusteredWith: string[] = []
    
    // Check recent cards in history
    const recentEvents = context.clusteringHistory.slice(-this.CONTEXT_RETENTION_SIZE)
    
    for (const event of recentEvents) {
      if (card.similarCardIds.includes(event.cardId)) {
        clusteredWith.push(event.cardId)
      }
    }
    
    return clusteredWith
  }
  
  /**
   * Clear clustering context
   */
  private clearClusteringContext(sessionId: string): void {
    const context = this.getClusteringContext(sessionId)
    
    // Clear recent context but keep history for analysis
    context.recentCardHashes.clear()
    context.recentTopics.clear()
    context.recentConcepts.clear()
    context.lastContentTypes = []
    
    // Add clearing event to history
    context.clusteringHistory.push({
      timestamp: new Date(),
      cardId: '',
      clusteredWith: [],
      preventionReason: 'context_cleared'
    })
  }
  
  /**
   * Get clustering statistics for monitoring
   */
  getClusteringStats(sessionId: string): {
    contextSize: number
    recentTopics: number
    recentConcepts: number
    preventionEvents: number
    lastClearing: Date | null
  } {
    const context = this.clusteringContexts.get(sessionId)
    
    if (!context) {
      return {
        contextSize: 0,
        recentTopics: 0,
        recentConcepts: 0,
        preventionEvents: 0,
        lastClearing: null
      }
    }
    
    const preventionEvents = context.clusteringHistory
      .filter(event => event.preventionReason.startsWith('attempt_'))
      .length
    
    const lastClearing = context.clusteringHistory
      .filter(event => event.preventionReason === 'context_cleared')
      .pop()?.timestamp || null
    
    return {
      contextSize: context.recentCardHashes.size,
      recentTopics: context.recentTopics.size,
      recentConcepts: context.recentConcepts.size,
      preventionEvents,
      lastClearing
    }
  }
  
  /**
   * Cleanup old clustering contexts
   */
  cleanupOldContexts(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    
    for (const [sessionId, context] of this.clusteringContexts.entries()) {
      const lastActivity = context.clusteringHistory
        .filter(event => event.timestamp > oneHourAgo)
        .length
      
      if (lastActivity === 0) {
        this.clusteringContexts.delete(sessionId)
      }
    }
  }
}
```

## 📊 Phase 4: Performance Monitoring & Optimization (Weeks 8-9)

### **4.1 Comprehensive Performance Monitoring**

#### **File: `server/src/services/monitoring/PerformanceMonitor.ts`**
```typescript
import { SystemMetrics, PerformanceAlert, PerformanceThresholds } from '../../../shared/types/monitoring'

export class PerformanceMonitor {
  private metrics: SystemMetrics
  private alertHandlers: Map<string, (alert: PerformanceAlert) => Promise<void>>
  private thresholds: PerformanceThresholds
  
  constructor() {
    this.metrics = this.initializeMetrics()
    this.alertHandlers = new Map()
    this.thresholds = this.getDefaultThresholds()
  }
  
  /**
   * Record FSRS calculation performance
   */
  async recordCalculation(duration: number, success: boolean, metadata?: any): Promise<void> {
    this.metrics.fsrs.totalCalculations++
    this.metrics.fsrs.averageCalculationTime = this.updateRollingAverage(
      this.metrics.fsrs.averageCalculationTime,
      duration,
      this.metrics.fsrs.totalCalculations
    )
    
    if (success) {
      this.metrics.fsrs.successfulCalculations++
    } else {
      this.metrics.fsrs.failedCalculations++
      this.metrics.fsrs.errorRate = this.metrics.fsrs.failedCalculations / this.metrics.fsrs.totalCalculations
    }
    
    // Check for performance alerts
    if (duration > this.thresholds.calculation.maxDuration) {
      await this.triggerAlert('slow_calculation', {
        duration,
        threshold: this.thresholds.calculation.maxDuration,
        metadata
      })
    }
    
    if (this.metrics.fsrs.errorRate > this.thresholds.calculation.maxErrorRate) {
      await this.triggerAlert('high_error_rate', {
        errorRate: this.metrics.fsrs.errorRate,
        threshold: this.thresholds.calculation.maxErrorRate
      })
    }
    
    // Store detailed log for analysis
    await this.storeCalculationLog({
      timestamp: new Date(),
      duration,
      success,
      metadata
    })
  }
  
  /**
   * Record card selection performance
   */
  async recordSelection(duration: number, success: boolean, method: string): Promise<void> {
    this.metrics.selection.totalSelections++
    this.metrics.selection.averageSelectionTime = this.updateRollingAverage(
      this.metrics.selection.averageSelectionTime,
      duration,
      this.metrics.selection.totalSelections
    )
    
    // Track selection methods
    if (!this.metrics.selection.methodBreakdown[method]) {
      this.metrics.selection.methodBreakdown[method] = 0
    }
    this.metrics.selection.methodBreakdown[method]++
    
    if (success) {
      this.metrics.selection.successfulSelections++
      
      // Track cache performance
      if (method.includes('cache_hit')) {
        this.metrics.selection.cacheHitRate = this.updateRollingAverage(
          this.metrics.selection.cacheHitRate,
          1,
          this.metrics.selection.totalSelections
        )
      } else if (method.includes('cache_miss')) {
        this.metrics.selection.cacheHitRate = this.updateRollingAverage(
          this.metrics.selection.cacheHitRate,
          0,
          this.metrics.selection.totalSelections
        )
      }
    } else {
      this.metrics.selection.failedSelections++
    }
    
    // Performance alerts
    if (duration > this.thresholds.selection.maxDuration) {
      await this.triggerAlert('slow_selection', {
        duration,
        threshold: this.thresholds.selection.maxDuration,
        method
      })
    }
  }
  
  /**
   * Record momentum calculation performance
   */
  async recordMomentumCalculation(duration: number, success: boolean): Promise<void> {
    this.metrics.momentum.totalCalculations++
    this.metrics.momentum.averageCalculationTime = this.updateRollingAverage(
      this.metrics.momentum.averageCalculationTime,
      duration,
      this.metrics.momentum.totalCalculations
    )
    
    if (success) {
      this.metrics.momentum.successfulCalculations++
    } else {
      this.metrics.momentum.failedCalculations++
    }
    
    if (duration > this.thresholds.momentum.maxDuration) {
      await this.triggerAlert('slow_momentum_calculation', {
        duration,
        threshold: this.thresholds.momentum.maxDuration
      })
    }
  }
  
  /**
   * Record session-level metrics
   */
  async recordSessionMetrics(sessionStats: any): Promise<void> {
    this.metrics.session.totalSessions++
    this.metrics.session.averageSessionLength = this.updateRollingAverage(
      this.metrics.session.averageSessionLength,
      sessionStats.duration,
      this.metrics.session.totalSessions
    )
    
    this.metrics.session.averageCardsPerSession = this.updateRollingAverage(
      this.metrics.session.averageCardsPerSession,
      sessionStats.cardsReviewed,
      this.metrics.session.totalSessions
    )
    
    if (sessionStats.completed) {
      this.metrics.session.completedSessions++
      this.metrics.session.completionRate = this.metrics.session.completedSessions / this.metrics.session.totalSessions
    } else {
      this.metrics.session.abandonedSessions++
      
      // Alert on high abandonment
      const abandonmentRate = this.metrics.session.abandonedSessions / this.metrics.session.totalSessions
      if (abandonmentRate > this.thresholds.session.maxAbandonmentRate) {
        await this.triggerAlert('high_abandonment_rate', {
          rate: abandonmentRate,
          threshold: this.thresholds.session.maxAbandonmentRate
        })
      }
    }
  }
  
  /**
   * Get current system metrics
   */
  getMetrics(): SystemMetrics {
    return { ...this.metrics }
  }
  
  /**
   * Get system health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical'
    issues: string[]
    uptime: number
    lastUpdate: Date
  } {
    const issues: string[] = []
    let status: 'healthy' | 'warning' | 'critical' = 'healthy'
    
    // Check FSRS health
    if (this.metrics.fsrs.errorRate > this.thresholds.calculation.maxErrorRate) {
      issues.push(`High FSRS error rate: ${(this.metrics.fsrs.errorRate * 100).toFixed(1)}%`)
      status = 'warning'
    }
    
    if (this.metrics.fsrs.averageCalculationTime > this.thresholds.calculation.maxDuration) {
      issues.push(`Slow FSRS calculations: ${this.metrics.fsrs.averageCalculationTime.toFixed(0)}ms`)
      status = status === 'critical' ? 'critical' : 'warning'
    }
    
    // Check selection health
    if (this.metrics.selection.averageSelectionTime > this.thresholds.selection.maxDuration) {
      issues.push(`Slow card selection: ${this.metrics.selection.averageSelectionTime.toFixed(0)}ms`)
      status = status === 'critical' ? 'critical' : 'warning'
    }
    
    if (this.metrics.selection.cacheHitRate < this.thresholds.selection.minCacheHitRate) {
      issues.push(`Low cache hit rate: ${(this.metrics.selection.cacheHitRate * 100).toFixed(1)}%`)
      status = status === 'critical' ? 'critical' : 'warning'
    }
    
    // Check session health
    const completionRate = this.metrics.session.completionRate
    if (completionRate < this.thresholds.session.minCompletionRate) {
      issues.push(`Low session completion rate: ${(completionRate * 100).toFixed(1)}%`)
      status = 'critical'
    }
    
    return {
      status,
      issues,
      uptime: Date.now() - this.metrics.system.startTime.getTime(),
      lastUpdate: new Date()
    }
  }
  
  /**
   * Register alert handler
   */
  registerAlertHandler(type: string, handler: (alert: PerformanceAlert) => Promise<void>): void {
    this.alertHandlers.set(type, handler)
  }
  
  /**
   * Trigger performance alert
   */
  private async triggerAlert(type: string, data: any): Promise<void> {
    const alert: PerformanceAlert = {
      type,
      timestamp: new Date(),
      severity: this.getAlertSeverity(type),
      data,
      metrics: this.getRelevantMetrics(type)
    }
    
    // Log alert
    console.warn(`Performance Alert [${alert.severity}]: ${type}`, data)
    
    // Call registered handler
    const handler = this.alertHandlers.get(type)
    if (handler) {
      try {
        await handler(alert)
      } catch (error) {
        console.error(`Error in alert handler for ${type}:`, error)
      }
    }
    
    // Store alert for analysis
    await this.storeAlert(alert)
  }
  
  /**
   * Update rolling average
   */
  private updateRollingAverage(currentAverage: number, newValue: number, count: number): number {
    if (count === 1) return newValue
    const alpha = Math.min(0.1, 2 / count) // Exponential moving average
    return currentAverage * (1 - alpha) + newValue * alpha
  }
  
  /**
   * Initialize metrics
   */
  private initializeMetrics(): SystemMetrics {
    return {
      system: {
        startTime: new Date(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      },
      fsrs: {
        totalCalculations: 0,
        successfulCalculations: 0,
        failedCalculations: 0,
        averageCalculationTime: 0,
        errorRate: 0
      },
      selection: {
        totalSelections: 0,
        successfulSelections: 0,
        failedSelections: 0,
        averageSelectionTime: 0,
        cacheHitRate: 0,
        methodBreakdown: {}
      },
      momentum: {
        totalCalculations: 0,
        successfulCalculations: 0,
        failedCalculations: 0,
        averageCalculationTime: 0
      },
      session: {
        totalSessions: 0,
        completedSessions: 0,
        abandonedSessions: 0,
        averageSessionLength: 0,
        averageCardsPerSession: 0,
        completionRate: 0
      }
    }
  }
  
  /**
   * Get default performance thresholds
   */
  private getDefaultThresholds(): PerformanceThresholds {
    return {
      calculation: {
        maxDuration: 50,        // 50ms max for FSRS calculation
        maxErrorRate: 0.01      // 1% max error rate
      },
      selection: {
        maxDuration: 100,       // 100ms max for card selection
        minCacheHitRate: 0.8    // 80% min cache hit rate
      },
      momentum: {
        maxDuration: 20         // 20ms max for momentum calculation
      },
      session: {
        minCompletionRate: 0.7, // 70% min completion rate
        maxAbandonmentRate: 0.3 // 30% max abandonment rate
      }
    }
  }
  
  /**
   * Get alert severity
   */
  private getAlertSeverity(type: string): 'low' | 'medium' | 'high' | 'critical' {
    const severityMap = {
      'slow_calculation': 'medium',
      'high_error_rate': 'high',
      'slow_selection': 'medium', 
      'slow_momentum_calculation': 'low',
      'high_abandonment_rate': 'high'
    }
    return severityMap[type] || 'medium'
  }
  
  /**
   * Get relevant metrics for alert
   */
  private getRelevantMetrics(type: string): any {
    switch (type) {
      case 'slow_calculation':
      case 'high_error_rate':
        return this.metrics.fsrs
      case 'slow_selection':
        return this.metrics.selection
      case 'slow_momentum_calculation':
        return this.metrics.momentum
      case 'high_abandonment_rate':
        return this.metrics.session
      default:
        return this.metrics
    }
  }
  
  /**
   * Store calculation log (implement based on your storage solution)
   */
  private async storeCalculationLog(log: any): Promise<void> {
    // Implement database storage
  }
  
  /**
   * Store alert (implement based on your storage solution)
   */
  private async storeAlert(alert: PerformanceAlert): Promise<void> {
    // Implement database storage
  }
}
```

### **4.2 Circuit Breaker Implementation**

#### **File: `server/src/services/monitoring/CircuitBreaker.ts`**
```typescript
export interface CircuitBreakerConfig {
  failureThreshold: number      // Number of failures before opening
  recoveryTimeout: number       // Milliseconds before attempting recovery
  monitoringWindow: number      // Window for counting failures
  halfOpenMaxCalls: number      // Max calls to test in half-open state
}

export enum CircuitBreakerState {
  CLOSED = 'closed',           // Normal operation
  OPEN = 'open',              // Circuit is open, calls fail fast
  HALF_OPEN = 'half_open'     // Testing if service has recovered
}

export interface CircuitBreakerStats {
  state: CircuitBreakerState
  failureCount: number
  lastFailureTime: Date | null
  lastSuccessTime: Date | null
  totalCalls: number
  totalFailures: number
}

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED
  private failureCount: number = 0
  private lastFailureTime: Date | null = null
  private lastSuccessTime: Date | null = null
  private totalCalls: number = 0
  private totalFailures: number = 0
  private halfOpenCalls: number = 0
  
  constructor(private config: CircuitBreakerConfig) {}
  
  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalCalls++
    
    // Check if circuit is open
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitBreakerState.HALF_OPEN
        this.halfOpenCalls = 0
      } else {
        throw new Error('Circuit breaker is OPEN')
      }
    }
    
    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }
  
  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.lastSuccessTime = new Date()
    
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.halfOpenCalls++
      
      if (this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
        this.reset()
      }
    } else {
      this.failureCount = 0
    }
  }
  
  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.totalFailures++
    this.failureCount++
    this.lastFailureTime = new Date()
    
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.OPEN
    } else if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitBreakerState.OPEN
    }
  }
  
  /**
   * Reset circuit breaker to closed state
   */
  private reset(): void {
    this.state = CircuitBreakerState.CLOSED
    this.failureCount = 0
    this.halfOpenCalls = 0
  }
  
  /**
   * Check if should attempt reset from open state
   */
  private shouldAttemptReset(): boolean {
    return this.lastFailureTime !== null &&
           (Date.now() - this.lastFailureTime.getTime()) >= this.config.recoveryTimeout
  }
  
  /**
   * Get current statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalCalls: this.totalCalls,
      totalFailures: this.totalFailures
    }
  }
  
  /**
   * Force circuit breaker state (for testing)
   */
  forceState(state: CircuitBreakerState): void {
    this.state = state
    if (state === CircuitBreakerState.CLOSED) {
      this.reset()
    }
  }
}
```

### **4.3 Resilient Card Selector**

#### **File: `server/src/services/selection/ResilientCardSelector.ts`**
```typescript
import { AntiClusteringSelector, AntiClusteringOptions } from './AntiClusteringSelector'
import { OptimizedCardSelector } from './OptimizedCardSelector'
import { CircuitBreaker, CircuitBreakerConfig } from '../monitoring/CircuitBreaker'
import { PerformanceMonitor } from '../monitoring/PerformanceMonitor'

export class ResilientCardSelector {
  private primarySelector: AntiClusteringSelector
  private fallbackSelector: OptimizedCardSelector
  private circuitBreakers: Map<string, CircuitBreaker>
  private performanceMonitor: PerformanceMonitor
  
  private readonly CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
    failureThreshold: 3,        // 3 failures before opening
    recoveryTimeout: 30000,     // 30 seconds recovery timeout
    monitoringWindow: 60000,    // 1 minute monitoring window
    halfOpenMaxCalls: 2         // 2 test calls in half-open state
  }
  
  constructor(performanceMonitor: PerformanceMonitor) {
    this.performanceMonitor = performanceMonitor
    this.primarySelector = new AntiClusteringSelector(performanceMonitor)
    this.fallbackSelector = new OptimizedCardSelector(performanceMonitor)
    this.circuitBreakers = new Map()
  }
  
  /**
   * Select next card with resilience protection
   */
  async selectNextCard(options: AntiClusteringOptions): Promise<any> {
    const deckCircuitBreaker = this.getCircuitBreaker(options.deckId)
    
    try {
      // Try primary selector with circuit breaker protection
      const result = await deckCircuitBreaker.execute(async () => {
        return await this.primarySelector.selectNextCard(options)
      })
      
      await this.performanceMonitor.recordSelection(0, true, 'resilient_primary')
      return {
        ...result,
        resilience: {
          usedFallback: false,
          circuitBreakerState: deckCircuitBreaker.getStats().state
        }
      }
      
    } catch (error) {
      // Log primary failure
      console.warn(`Primary selector failed for deck ${options.deckId}:`, error.message)
      
      // Try fallback selector
      try {
        const fallbackResult = await this.fallbackSelector.selectNextCard(options)
        
        await this.performanceMonitor.recordSelection(0, true, 'resilient_fallback')
        return {
          card: fallbackResult,
          selectionReason: 'fallback',
          adaptationApplied: false,
          alternativesConsidered: 0,
          resilience: {
            usedFallback: true,
            circuitBreakerState: deckCircuitBreaker.getStats().state,
            primaryError: error.message
          }
        }
        
      } catch (fallbackError) {
        // Both selectors failed
        await this.performanceMonitor.recordSelection(0, false, 'resilient_total_failure')
        throw new Error(`All card selectors failed. Primary: ${error.message}, Fallback: ${fallbackError.message}`)
      }
    }
  }
  
  /**
   * Get circuit breaker for a deck
   */
  private getCircuitBreaker(deckId: string): CircuitBreaker {
    if (!this.circuitBreakers.has(deckId)) {
      this.circuitBreakers.set(deckId, new CircuitBreaker(this.CIRCUIT_BREAKER_CONFIG))
    }
    return this.circuitBreakers.get(deckId)!
  }
  
  /**
   * Get resilience statistics
   */
  getResilienceStats(): {
    deckStats: Map<string, any>
    totalFailovers: number
    systemHealth: string
  } {
    const deckStats = new Map()
    let totalFailovers = 0
    
    for (const [deckId, circuitBreaker] of this.circuitBreakers.entries()) {
      const stats = circuitBreaker.getStats()
      deckStats.set(deckId, stats)
      totalFailovers += stats.totalFailures
    }
    
    const systemHealth = this.determineSystemHealth()
    
    return {
      deckStats,
      totalFailovers,
      systemHealth
    }
  }
  
  /**
   * Determine overall system health
   */
  private determineSystemHealth(): string {
    const openCircuits = Array.from(this.circuitBreakers.values())
      .filter(cb => cb.getStats().state === 'open').length
    
    const totalCircuits = this.circuitBreakers.size
    
    if (totalCircuits === 0) return 'unknown'
    if (openCircuits === 0) return 'healthy'
    if (openCircuits / totalCircuits < 0.2) return 'degraded'
    if (openCircuits / totalCircuits < 0.5) return 'unhealthy'
    return 'critical'
  }
  
  /**
   * Force circuit breaker reset (for administration)
   */
  resetCircuitBreaker(deckId: string): void {
    const circuitBreaker = this.circuitBreakers.get(deckId)
    if (circuitBreaker) {
      circuitBreaker.forceState('closed' as any)
    }
  }
  
  /**
   * Clear old circuit breakers
   */
  cleanupCircuitBreakers(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    
    for (const [deckId, circuitBreaker] of this.circuitBreakers.entries()) {
      const stats = circuitBreaker.getStats()
      const lastActivity = stats.lastSuccessTime || stats.lastFailureTime
      
      if (lastActivity && lastActivity < oneHourAgo) {
        this.circuitBreakers.delete(deckId)
      }
    }
  }
}
```

## 🧪 Phase 5: Validation & A/B Testing (Weeks 10-12)

### **5.1 A/B Testing Framework**

#### **File: `server/src/services/monitoring/ABTestingFramework.ts`**
```typescript
import { ABTestConfig, ABTestResults, LearningEvent, VariantData } from '../../../shared/types/testing'
import { PerformanceMonitor } from './PerformanceMonitor'

export class ABTestingFramework {
  private activeTests: Map<string, ABTestConfig>
  private userAssignments: Map<string, Map<string, string>> // userId -> testId -> variant
  private performanceMonitor: PerformanceMonitor
  
  constructor(performanceMonitor: PerformanceMonitor) {
    this.activeTests = new Map()
    this.userAssignments = new Map()
    this.performanceMonitor = performanceMonitor
  }
  
  /**
   * Create and start a new A/B test
   */
  async createTest(config: ABTestConfig): Promise<void> {
    // Validate test configuration
    this.validateTestConfig(config)
    
    // Store test configuration
    this.activeTests.set(config.testId, config)
    
    // Initialize tracking
    await this.initializeTestTracking(config)
    
    console.log(`A/B Test started: ${config.testId}`)
  }
  
  /**
   * Assign user to test variant
   */
  async assignUserToVariant(userId: string, testId: string): Promise<string> {
    const testConfig = this.activeTests.get(testId)
    if (!testConfig) {
      throw new Error(`Test ${testId} not found`)
    }
    
    // Check existing assignment
    const userTests = this.userAssignments.get(userId) || new Map()
    const existingAssignment = userTests.get(testId)
    
    if (existingAssignment) {
      return existingAssignment
    }
    
    // Create stable assignment based on user ID hash
    const hash = this.hashUserId(userId, testId)
    const variantIndex = hash % testConfig.variants.length
    const assignedVariant = testConfig.variants[variantIndex]
    
    // Store assignment
    userTests.set(testId, assignedVariant)
    this.userAssignments.set(userId, userTests)
    
    // Record assignment
    await this.recordAssignment(userId, testId, assignedVariant)
    
    return assignedVariant
  }
  
  /**
   * Record learning event for A/B test analysis
   */
  async recordLearningEvent(
    userId: string,
    testId: string,
    event: LearningEvent
  ): Promise<void> {
    const variant = await this.getUserVariant(userId, testId)
    if (!variant) return
    
    // Store event in database
    await this.storeLearningEvent({
      userId,
      testId,
      variant,
      timestamp: new Date(),
      eventType: event.type,
      cardId: event.cardId,
      rating: event.rating,
      responseTime: event.responseTime,
      sessionId: event.sessionId,
      metadata: event.metadata || {}
    })
    
    // Update real-time metrics
    await this.updateRealTimeMetrics(testId, variant, event)
  }
  
  /**
   * Get user's variant for a test
   */
  async getUserVariant(userId: string, testId: string): Promise<string | null> {
    const userTests = this.userAssignments.get(userId)
    if (!userTests) return null
    
    return userTests.get(testId) || null
  }
  
  /**
   * Analyze A/B test results
   */
  async analyzeResults(testId: string): Promise<ABTestResults> {
    const testConfig = this.activeTests.get(testId)
    if (!testConfig) {
      throw new Error(`Test ${testId} not found`)
    }
    
    // Get data for all variants
    const variantData = new Map<string, VariantData>()
    
    for (const variant of testConfig.variants) {
      const data = await this.getVariantData(testId, variant)
      variantData.set(variant, data)
    }
    
    // Perform statistical analysis
    const analysis = await this.performStatisticalAnalysis(variantData, testConfig)
    
    return {
      testId,
      startDate: testConfig.startDate,
      endDate: testConfig.endDate,
      variants: Array.from(variantData.keys()),
      primaryMetric: testConfig.primaryMetric,
      results: analysis,
      recommendation: this.generateRecommendation(analysis),
      confidence: this.calculateConfidence(analysis),
      sampleSizes: this.getSampleSizes(variantData)
    }
  }
  
  /**
   * Perform statistical analysis on variant data
   */
  private async performStatisticalAnalysis(
    variantData: Map<string, VariantData>,
    config: ABTestConfig
  ): Promise<any> {
    const variants = Array.from(variantData.keys())
    if (variants.length !== 2) {
      throw new Error('Statistical analysis currently supports only 2-variant tests')
    }
    
    const [controlVariant, treatmentVariant] = variants
    const controlData = variantData.get(controlVariant)!
    const treatmentData = variantData.get(treatmentVariant)!
    
    // Calculate primary metric for each variant
    const controlMetric = this.calculatePrimaryMetric(controlData, config.primaryMetric)
    const treatmentMetric = this.calculatePrimaryMetric(treatmentData, config.primaryMetric)
    
    // Calculate statistical significance
    const significance = this.calculateStatisticalSignificance(
      controlData,
      treatmentData,
      config.primaryMetric
    )
    
    // Calculate effect size
    const effectSize = this.calculateEffectSize(controlMetric, treatmentMetric)
    
    // Calculate confidence interval
    const confidenceInterval = this.calculateConfidenceInterval(
      controlData,
      treatmentData,
      config.primaryMetric
    )
    
    return {
      controlMetric,
      treatmentMetric,
      lift: ((treatmentMetric - controlMetric) / controlMetric) * 100,
      absoluteDifference: treatmentMetric - controlMetric,
      effectSize,
      pValue: significance.pValue,
      isSignificant: significance.pValue < 0.05,
      confidenceInterval,
      powerAnalysis: this.calculatePowerAnalysis(controlData, treatmentData)
    }
  }
  
  /**
   * Calculate primary metric value
   */
  private calculatePrimaryMetric(data: VariantData, metric: string): number {
    switch (metric) {
      case 'retention_accuracy':
        return this.calculateRetentionAccuracy(data)
      case 'cards_per_session':
        return this.calculateCardsPerSession(data)
      case 'completion_rate':
        return this.calculateCompletionRate(data)
      case 'session_length':
        return this.calculateAverageSessionLength(data)
      default:
        throw new Error(`Unknown metric: ${metric}`)
    }
  }
  
  /**
   * Calculate retention accuracy (predicted vs actual)
   */
  private calculateRetentionAccuracy(data: VariantData): number {
    const predictions = data.events
      .filter(e => e.eventType === 'card_review')
      .map(e => ({
        predicted: e.metadata.predictedRecall || 0.5,
        actual: ['good', 'easy'].includes(e.rating) ? 1 : 0
      }))
    
    if (predictions.length === 0) return 0
    
    // Calculate RMSE
    const squaredErrors = predictions.map(p => 
      Math.pow(p.predicted - p.actual, 2)
    )
    const mse = squaredErrors.reduce((sum, error) => sum + error, 0) / predictions.length
    return 1 - Math.sqrt(mse) // Convert RMSE to accuracy score
  }
  
  /**
   * Calculate average cards per session
   */
  private calculateCardsPerSession(data: VariantData): number {
    const sessionCounts = new Map<string, number>()
    
    for (const event of data.events) {
      if (event.eventType === 'card_review') {
        const count = sessionCounts.get(event.sessionId) || 0
        sessionCounts.set(event.sessionId, count + 1)
      }
    }
    
    const sessions = Array.from(sessionCounts.values())
    return sessions.length > 0 ? sessions.reduce((sum, count) => sum + count, 0) / sessions.length : 0
  }
  
  /**
   * Calculate session completion rate
   */
  private calculateCompletionRate(data: VariantData): number {
    const sessionStarts = data.events.filter(e => e.eventType === 'session_start').length
    const sessionCompletions = data.events.filter(e => e.eventType === 'session_complete').length
    
    return sessionStarts > 0 ? sessionCompletions / sessionStarts : 0
  }
  
  /**
   * Calculate average session length
   */
  private calculateAverageSessionLength(data: VariantData): number {
    const sessionDurations = new Map<string, { start: Date, end?: Date }>()
    
    for (const event of data.events) {
      if (event.eventType === 'session_start') {
        sessionDurations.set(event.sessionId, { start: event.timestamp })
      } else if (event.eventType === 'session_complete') {
        const session = sessionDurations.get(event.sessionId)
        if (session) {
          session.end = event.timestamp
        }
      }
    }
    
    const completedSessions = Array.from(sessionDurations.values())
      .filter(session => session.end)
      .map(session => session.end!.getTime() - session.start.getTime())
    
    return completedSessions.length > 0 
      ? completedSessions.reduce((sum, duration) => sum + duration, 0) / completedSessions.length / (1000 * 60) // Convert to minutes
      : 0
  }
  
  /**
   * Calculate statistical significance using t-test
   */
  private calculateStatisticalSignificance(
    controlData: VariantData,
    treatmentData: VariantData,
    metric: string
  ): { pValue: number, tStatistic: number } {
    // This is a simplified implementation
    // In production, use a proper statistical library
    const controlValues = this.getMetricValues(controlData, metric)
    const treatmentValues = this.getMetricValues(treatmentData, metric)
    
    if (controlValues.length === 0 || treatmentValues.length === 0) {
      return { pValue: 1.0, tStatistic: 0 }
    }
    
    const controlMean = controlValues.reduce((sum, val) => sum + val, 0) / controlValues.length
    const treatmentMean = treatmentValues.reduce((sum, val) => sum + val, 0) / treatmentValues.length
    
    const controlVariance = this.calculateVariance(controlValues, controlMean)
    const treatmentVariance = this.calculateVariance(treatmentValues, treatmentMean)
    
    const pooledStandardError = Math.sqrt(
      (controlVariance / controlValues.length) + 
      (treatmentVariance / treatmentValues.length)
    )
    
    const tStatistic = Math.abs(treatmentMean - controlMean) / pooledStandardError
    
    // Simplified p-value calculation (use proper statistical library in production)
    const degreesOfFreedom = controlValues.length + treatmentValues.length - 2
    const pValue = this.tTestPValue(tStatistic, degreesOfFreedom)
    
    return { pValue, tStatistic }
  }
  
  /**
   * Generate recommendation based on analysis
   */
  private generateRecommendation(analysis: any): 'launch_treatment' | 'keep_control' | 'continue_testing' | 'inconclusive' {
    const { lift, isSignificant, effectSize, pValue } = analysis
    
    if (!isSignificant) {
      if (Math.abs(lift) < 5) {
        return 'continue_testing' // Need more data
      } else {
        return 'inconclusive'
      }
    }
    
    if (lift > 5 && effectSize > 0.2) {
      return 'launch_treatment'
    } else if (lift < -5 && effectSize < -0.2) {
      return 'keep_control'
    } else {
      return 'continue_testing'
    }
  }
  
  /**
   * Validate test configuration
   */
  private validateTestConfig(config: ABTestConfig): void {
    if (!config.testId || config.testId.trim() === '') {
      throw new Error('Test ID is required')
    }
    
    if (!config.variants || config.variants.length < 2) {
      throw new Error('At least 2 variants are required')
    }
    
    if (!config.primaryMetric) {
      throw new Error('Primary metric is required')
    }
    
    if (config.sampleSize && config.sampleSize < 100) {
      throw new Error('Minimum sample size is 100 per variant')
    }
  }
  
  /**
   * Hash user ID for stable variant assignment
   */
  private hashUserId(userId: string, testId: string): number {
    const combined = `${userId}_${testId}`
    let hash = 0
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }
  
  /**
   * Helper methods for statistical calculations
   */
  private calculateVariance(values: number[], mean: number): number {
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2))
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length
  }
  
  private getMetricValues(data: VariantData, metric: string): number[] {
    // Extract individual values for statistical analysis
    // Implementation depends on specific metric
    return []
  }
  
  private tTestPValue(tStatistic: number, degreesOfFreedom: number): number {
    // Simplified p-value calculation
    // Use proper statistical library in production
    return Math.min(1, 2 * (1 - this.cumulativeDistribution(Math.abs(tStatistic))))
  }
  
  private cumulativeDistribution(x: number): number {
    // Simplified CDF approximation
    return 0.5 * (1 + this.errorFunction(x / Math.sqrt(2)))
  }
  
  private errorFunction(x: number): number {
    // Simplified error function approximation
    const a1 =  0.254829592
    const a2 = -0.284496736
    const a3 =  1.421413741
    const a4 = -1.453152027
    const a5 =  1.061405429
    const p  =  0.3275911
    
    const sign = x >= 0 ? 1 : -1
    x = Math.abs(x)
    
    const t = 1.0 / (1.0 + p * x)
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)
    
    return sign * y
  }
  
  // Additional helper methods for data storage and retrieval
  private async initializeTestTracking(config: ABTestConfig): Promise<void> {
    // Initialize database tracking for the test
  }
  
  private async recordAssignment(userId: string, testId: string, variant: string): Promise<void> {
    // Record user assignment in database
  }
  
  private async storeLearningEvent(event: any): Promise<void> {
    // Store learning event in database
  }
  
  private async updateRealTimeMetrics(testId: string, variant: string, event: LearningEvent): Promise<void> {
    // Update real-time metrics for monitoring
  }
  
  private async getVariantData(testId: string, variant: string): Promise<VariantData> {
    // Retrieve variant data from database
    return {
      variant,
      userCount: 0,
      events: [],
      metrics: {}
    }
  }
  
  private calculateEffectSize(control: number, treatment: number): number {
    // Cohen's d calculation
    return Math.abs(treatment - control) / Math.sqrt((control + treatment) / 2)
  }
  
  private calculateConfidenceInterval(controlData: VariantData, treatmentData: VariantData, metric: string): [number, number] {
    // 95% confidence interval calculation
    return [0, 0] // Simplified
  }
  
  private calculatePowerAnalysis(controlData: VariantData, treatmentData: VariantData): number {
    // Statistical power calculation
    return 0.8 // Simplified
  }
  
  private calculateConfidence(analysis: any): number {
    return 1 - analysis.pValue
  }
  
  private getSampleSizes(variantData: Map<string, VariantData>): Map<string, number> {
    const sizes = new Map<string, number>()
    for (const [variant, data] of variantData.entries()) {
      sizes.set(variant, data.userCount)
    }
    return sizes
  }
}
```

## 🚀 Implementation Timeline & Deployment Strategy

### **Month 1: Foundation (Weeks 1-4)**
1. **Week 1**: FSRS core implementation + database migrations
2. **Week 2**: Optimized card selector + performance monitoring
3. **Week 3**: Unit tests + integration testing 
4. **Week 4**: Basic momentum tracking implementation

### **Month 2: Enhancement (Weeks 5-8)**
1. **Week 5**: Momentum-aware card selection
2. **Week 6**: Anti-clustering implementation
3. **Week 7**: Circuit breaker + resilience
4. **Week 8**: Performance optimization + monitoring dashboard

### **Month 3: Validation (Weeks 9-12)**
1. **Week 9**: A/B testing framework
2. **Week 10**: Test deployment + data collection
3. **Week 11**: Statistical analysis + results review
4. **Week 12**: Launch decision + rollout

### **Deployment Strategy**
1. **Staging Deployment**: Full feature testing in staging environment
2. **Canary Release**: 5% of users get new algorithm
3. **Gradual Rollout**: Increase to 25%, then 50%, then 100%
4. **Rollback Plan**: Immediate fallback to baseline if issues detected

### **Success Criteria**
- **Performance**: <100ms card selection latency
- **Reliability**: >99% system uptime
- **Effectiveness**: >10% improvement in retention accuracy
- **User Experience**: >85% session completion rate

---

This comprehensive implementation plan provides a detailed roadmap for building the Progressive Adaptive Spaced Repetition System, with clear technical specifications, robust error handling, comprehensive testing, and careful validation procedures to ensure success.