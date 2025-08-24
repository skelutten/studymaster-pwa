# Unified Adaptive Momentum-Based Scheduler (UAMS) v3.0 - Detailed Implementation Plan

## 📋 Implementation Overview

This document provides a detailed, step-by-step implementation plan for the Unified Adaptive Momentum-Based Scheduler (UAMS) v3.0, breaking down the high-level plan into specific tasks, file modifications, and coding requirements.

## 🎯 Implementation Strategy

### **Development Approach**
- **Incremental Implementation**: Build and test each layer independently
- **Backward Compatibility**: Maintain existing functionality while adding new features
- **Performance First**: Optimize for real-time performance from the start
- **Test-Driven**: Comprehensive testing for each component
- **User-Centric**: Gradual rollout with user feedback integration

### **Technology Stack Confirmation**
- **Backend**: Node.js/Express with TypeScript
- **Database**: PocketBase with enhanced schema
- **Frontend**: React with TypeScript
- **Testing**: Jest + React Testing Library
- **Performance**: Redis for caching (optional)
- **Analytics**: Custom implementation

## 🏗️ Phase 1: Enhanced Data Architecture (Weeks 1-2)

### **1.1 Database Schema Migration**

#### **Task 1.1.1: Enhanced Card Schema**
**File**: `pocketbase/pb_migrations/enhanced_card_schema.js`

```sql
-- New fields for UnifiedCard model
ALTER TABLE cards ADD COLUMN difficulty REAL DEFAULT 5.0;
ALTER TABLE cards ADD COLUMN stability REAL DEFAULT 1.0;
ALTER TABLE cards ADD COLUMN retrievability REAL DEFAULT 0.9;
ALTER TABLE cards ADD COLUMN fsrs_parameters TEXT; -- JSON array of 21 parameters
ALTER TABLE cards ADD COLUMN performance_history TEXT; -- JSON array of EnhancedResponseLog
ALTER TABLE cards ADD COLUMN average_response_time REAL DEFAULT 0.0;
ALTER TABLE cards ADD COLUMN cognitive_load_index REAL DEFAULT 0.0;
ALTER TABLE cards ADD COLUMN confidence_level TEXT DEFAULT 'building';
ALTER TABLE cards ADD COLUMN concept_similarity TEXT; -- JSON array of related card IDs
ALTER TABLE cards ADD COLUMN last_cluster_review TEXT;
ALTER TABLE cards ADD COLUMN contextual_difficulty TEXT; -- JSON object
ALTER TABLE cards ADD COLUMN stability_trend TEXT DEFAULT 'stable';
ALTER TABLE cards ADD COLUMN retrievability_history TEXT; -- JSON array
ALTER TABLE cards ADD COLUMN optimal_interval INTEGER DEFAULT 1;

-- Indexes for performance
CREATE INDEX idx_cards_difficulty ON cards(difficulty);
CREATE INDEX idx_cards_stability ON cards(stability);
CREATE INDEX idx_cards_retrievability ON cards(retrievability);
CREATE INDEX idx_cards_confidence_level ON cards(confidence_level);
```

#### **Task 1.1.2: Enhanced Session Schema**
**File**: `pocketbase/pb_migrations/enhanced_session_schema.js`

```sql
-- New session_state table for UnifiedSessionState
CREATE TABLE session_states (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    session_momentum_score REAL DEFAULT 0.5,
    momentum_trend TEXT DEFAULT 'stable',
    session_fatigue_index REAL DEFAULT 0.0,
    cognitive_load_capacity REAL DEFAULT 1.0,
    attention_span_remaining REAL DEFAULT 1.0,
    review_queue TEXT, -- JSON array of card IDs
    lookahead_buffer TEXT, -- JSON array of UnifiedCard objects
    emergency_buffer TEXT, -- JSON array
    challenge_reserve TEXT, -- JSON array
    session_start_time TEXT,
    contextual_factors TEXT, -- JSON object
    adaptation_history TEXT, -- JSON array
    explanation_log TEXT, -- JSON array
    flow_state_metrics TEXT, -- JSON object
    created DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_session_states_user_id ON session_states(user_id);
CREATE INDEX idx_session_states_updated ON session_states(updated);
```

#### **Task 1.1.3: Enhanced Response Logging Schema**
**File**: `pocketbase/pb_migrations/enhanced_response_schema.js`

```sql
-- Enhanced response_logs table
ALTER TABLE response_logs ADD COLUMN response_time REAL DEFAULT 0.0;
ALTER TABLE response_logs ADD COLUMN contextual_factors TEXT; -- JSON object
ALTER TABLE response_logs ADD COLUMN momentum_impact REAL DEFAULT 0.0;
ALTER TABLE response_logs ADD COLUMN confidence_change REAL DEFAULT 0.0;
ALTER TABLE response_logs ADD COLUMN previous_card_similarity REAL DEFAULT 0.0;
ALTER TABLE response_logs ADD COLUMN clustering_context TEXT;
ALTER TABLE response_logs ADD COLUMN session_state_snapshot TEXT; -- JSON snapshot
```

### **1.2 TypeScript Type Definitions**

#### **Task 1.2.1: Core Types**
**File**: `shared/types/enhanced-types.ts`

```typescript
// Environmental and contextual types
export interface EnvironmentalContext {
  device: 'mobile' | 'desktop' | 'tablet';
  networkQuality: 'excellent' | 'good' | 'poor' | 'offline';
  batteryLevel?: number; // 0-1 for mobile devices
  ambientNoise?: 'quiet' | 'moderate' | 'noisy';
  lighting?: 'optimal' | 'dim' | 'bright';
}

export interface ContextualDifficultyMap {
  timeOfDay: Record<string, number>; // hour -> difficulty modifier
  dayOfWeek: Record<string, number>; // day -> difficulty modifier
  sessionPosition: Record<string, number>; // early/mid/late -> modifier
  cognitiveLoad: Record<string, number>; // load level -> modifier
}

export interface SessionContext {
  timeOfDay: string; // ISO time
  dayOfWeek: string;
  sessionDuration: number; // minutes
  studyStreak: number; // days
  environmentalFactors: EnvironmentalContext;
  lastSessionQuality: number; // 0-1 rating
}

export interface AdaptationLog {
  timestamp: string;
  cardId: string;
  action: 'selected' | 'skipped' | 'reordered';
  reason: string;
  algorithmVersion: string;
  parameters: Record<string, any>;
}

export interface ExplanationEvent {
  timestamp: string;
  cardId: string;
  explanation: string;
  reasoning: 'momentum_recovery' | 'engagement_optimization' | 'flow_maintenance';
  confidence: number; // 0-1
  userVisible: boolean;
}

// Main enhanced interfaces
export interface UnifiedCard extends Card {
  // FSRS-Enhanced DSR Metrics
  difficulty: number; // 1-10 (float, granular)
  stability: number; // Memory retention duration in days
  retrievability: number; // Current recall probability (0-1)
  fsrsParameters: number[]; // Personal 21-parameter optimization
  
  // Momentum & Performance Tracking
  performanceHistory: EnhancedResponseLog[];
  averageResponseTime: number; // Normalized for content length
  cognitiveLoadIndex: number; // 0-1, derived from response patterns
  confidenceLevel: 'building' | 'optimal' | 'struggling';
  
  // Clustering & Context
  conceptSimilarity: string[]; // Related card IDs for clustering prevention
  lastClusterReview: string; // Prevent back-to-back similar content
  contextualDifficulty: ContextualDifficultyMap;
  
  // Enhanced Metadata
  stabilityTrend: 'increasing' | 'decreasing' | 'stable';
  retrievabilityHistory: number[]; // Track recall probability over time
  optimalInterval: number; // FSRS-calculated optimal next review
}

export interface EnhancedResponseLog {
  timestamp: string;
  rating: 'again' | 'hard' | 'good' | 'easy';
  responseTime: number;
  
  // Context Awareness
  contextualFactors: {
    sessionTime: number;
    timeOfDay: string;
    sessionFatigueIndex: number; // 0-1 fatigue level
    cognitiveLoadAtTime: number; // Cognitive capacity when answered
    environmentalFactors?: EnvironmentalContext;
  };
  
  // Momentum Impact
  momentumImpact: number; // How this response affected session flow
  confidenceChange: number; // Change in user confidence
  
  // Clustering Context
  previousCardSimilarity: number; // Similarity to previous card (0-1)
  clusteringContext: string; // Type of content cluster
}

export interface UnifiedSessionState {
  // Core Momentum
  sessionMomentumScore: number; // 0-1 running performance score
  momentumTrend: 'improving' | 'declining' | 'stable';
  
  // Cognitive Load Awareness
  sessionFatigueIndex: number; // 0-1 accumulated fatigue
  cognitiveLoadCapacity: number; // Current cognitive bandwidth
  attentionSpanRemaining: number; // Estimated focus remaining
  
  // Advanced Queue Management
  reviewQueue: string[]; // Main queue of card IDs
  lookaheadBuffer: UnifiedCard[]; // Next 8-12 cards for dynamic sorting
  emergencyBuffer: UnifiedCard[]; // Confidence boosters for crisis intervention
  challengeReserve: UnifiedCard[]; // Harder cards for engagement injection
  
  // Context & Analytics
  sessionStartTime: string;
  contextualFactors: SessionContext;
  adaptationHistory: AdaptationLog[];
  explanationLog: ExplanationEvent[]; // Why each card was selected
  
  // Flow State Optimization
  flowStateMetrics: {
    challengeSkillBalance: number; // Current challenge vs skill ratio
    engagementLevel: number; // User engagement indicators
    satisfactionPrediction: number; // Predicted session satisfaction
    momentumMaintenance: boolean; // Whether in optimal learning zone
  };
}

export interface CardSelectionResult {
  card: UnifiedCard;
  explanation: string;
  reasoning: string;
  confidence: number;
  alternativeOptions?: UnifiedCard[];
}

export interface DSRUpdate {
  difficulty: number;
  stability: number;
  retrievability: number;
  confidence: number;
  explanation: string;
}
```

#### **Task 1.2.2: Update Existing Types**
**File**: `shared/types/index.ts`

```typescript
// Update existing Card interface to extend new UnifiedCard
export * from './enhanced-types';

// Ensure backward compatibility
export interface Card {
  // ... existing fields ...
  // Enhanced fields will be optional for migration
  difficulty?: number;
  stability?: number;
  retrievability?: number;
  // ... other optional enhanced fields
}
```

### **1.3 Data Migration and Validation**

#### **Task 1.3.1: Data Migration Service**
**File**: `server/src/services/dataMigrationService.ts`

```typescript
export class DataMigrationService {
  async migrateExistingCards(): Promise<void> {
    // Migrate existing cards to new UnifiedCard format
    // Calculate initial DSR values from review history
    // Set default values for new fields
  }
  
  async validateCardData(card: UnifiedCard): Promise<boolean> {
    // Comprehensive validation for all new fields
    // Ensure data consistency and constraints
  }
  
  async backfillPerformanceHistory(): Promise<void> {
    // Convert existing review logs to EnhancedResponseLog format
  }
}
```

## 🧠 Phase 2: Triple-Layer Service Architecture (Weeks 3-4)

### **2.1 FSRS Engine Implementation**

#### **Task 2.1.1: Core FSRS Engine**
**File**: `server/src/services/fsrs/unifiedFSRSEngine.ts`

```typescript
export class UnifiedFSRSEngine {
  private defaultParameters: number[] = [
    // 21 default FSRS parameters
    0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94,
    2.18, 0.05, 0.34, 1.26, 0.29, 2.61, 0.62, 0.36, 0.26, 2.4
  ];

  calculateEnhancedDSR(
    card: UnifiedCard, 
    response: EnhancedResponseLog,
    userProfile: UserProfile
  ): DSRUpdate {
    // Implementation of enhanced DSR calculation
    const contextualDifficulty = this.calculateContextualDifficulty(response);
    const stabilityUpdate = this.calculateStabilityWithContext(card, response, userProfile);
    const retrievabilityUpdate = this.calculateRetrievabilityWithLoad(card, response);
    
    return {
      difficulty: contextualDifficulty,
      stability: stabilityUpdate,
      retrievability: retrievabilityUpdate,
      confidence: this.calculateUpdateConfidence(card, response),
      explanation: this.generateDSRExplanation(card, response)
    };
  }
  
  private calculateContextualDifficulty(response: EnhancedResponseLog): number {
    // Base difficulty from rating
    const ratingDifficulty = this.ratingToDifficulty(response.rating);
    
    // Contextual adjustments
    const fatigueAdjustment = response.contextualFactors.sessionFatigueIndex * 0.5;
    const cognitiveLoadAdjustment = (1 - response.contextualFactors.cognitiveLoadAtTime) * 0.3;
    const timeAdjustment = this.getTimeOfDayDifficultyModifier(response.contextualFactors.timeOfDay);
    
    return Math.max(1, Math.min(10, 
      ratingDifficulty + fatigueAdjustment + cognitiveLoadAdjustment + timeAdjustment
    ));
  }
  
  private calculateStabilityWithContext(
    card: UnifiedCard, 
    response: EnhancedResponseLog,
    userProfile: UserProfile
  ): number {
    // FSRS stability calculation with contextual enhancements
    const parameters = userProfile.fsrsParameters || this.defaultParameters;
    
    // Base FSRS formula
    const retention = Math.exp(-1 * (Date.now() - new Date(card.lastReviewed).getTime()) / (card.stability * 24 * 60 * 60 * 1000));
    
    // Contextual modifications
    const fatigueModifier = 1 - (response.contextualFactors.sessionFatigueIndex * 0.1);
    const environmentalModifier = this.getEnvironmentalStabilityModifier(response.contextualFactors.environmentalFactors);
    
    // Apply FSRS formula with context
    return this.applyFSRSStabilityFormula(card, response, parameters) * fatigueModifier * environmentalModifier;
  }
  
  calculateOptimalInterval(card: UnifiedCard, targetRetention: number = 0.9): number {
    // Enhanced interval calculation
    const baseInterval = card.stability * Math.log(1 / (1 - targetRetention));
    const contextualAdjustment = this.getContextualIntervalModifier(card);
    const cognitiveLoadAdjustment = this.getCognitiveLoadModifier(card.cognitiveLoadIndex);
    
    return Math.round(Math.max(1, baseInterval * contextualAdjustment * cognitiveLoadAdjustment));
  }
}
```

#### **Task 2.1.2: FSRS Parameter Optimization**
**File**: `server/src/services/fsrs/parameterOptimizer.ts`

```typescript
export class FSRSParameterOptimizer {
  async optimizeUserParameters(userId: string): Promise<number[]> {
    // Optimize 21 FSRS parameters based on user's review history
    // Use gradient descent or similar optimization algorithm
  }
  
  async evaluateParameterPerformance(
    parameters: number[], 
    reviewHistory: EnhancedResponseLog[]
  ): Promise<number> {
    // Calculate RMSE for parameter set against actual outcomes
  }
}
```

### **2.2 Momentum Management System**

#### **Task 2.2.1: Momentum Manager**
**File**: `server/src/services/momentum/unifiedMomentumManager.ts`

```typescript
export class UnifiedMomentumManager {
  updateSessionMomentum(
    currentState: UnifiedSessionState,
    response: EnhancedResponseLog
  ): UnifiedSessionState {
    // Weighted moving average with contextual enhancements
    const performanceValue = this.getPerformanceValue(response.rating);
    const fatigueAdjustment = this.getFatigueAdjustment(currentState.sessionFatigueIndex);
    const contextualModifier = this.getContextualModifier(response.contextualFactors);
    
    // Enhanced momentum calculation (Gemini's proven approach)
    const newMomentumScore = (currentState.sessionMomentumScore * 0.65) + 
                            (performanceValue * 0.35) + 
                            fatigueAdjustment + 
                            contextualModifier;
    
    // Update fatigue index
    const newFatigueIndex = this.updateFatigueIndex(currentState, response);
    
    // Update cognitive load capacity
    const newCognitiveCapacity = this.updateCognitiveLoadCapacity(currentState, response);
    
    return {
      ...currentState,
      sessionMomentumScore: Math.max(0, Math.min(1, newMomentumScore)),
      sessionFatigueIndex: newFatigueIndex,
      cognitiveLoadCapacity: newCognitiveCapacity,
      momentumTrend: this.calculateMomentumTrend(currentState, newMomentumScore),
      attentionSpanRemaining: this.calculateAttentionSpan(currentState, response)
    };
  }
  
  private getPerformanceValue(rating: string): number {
    // Gemini's proven performance mapping
    const baseValues = { 
      'again': 0.0, 
      'hard': 0.25, 
      'good': 0.75, 
      'easy': 1.0 
    };
    return baseValues[rating] || 0.5;
  }
  
  private updateFatigueIndex(
    currentState: UnifiedSessionState, 
    response: EnhancedResponseLog
  ): number {
    // ChatGPT's fatigue modeling approach
    const sessionDuration = (Date.now() - new Date(currentState.sessionStartTime).getTime()) / (1000 * 60);
    const baseFatigue = Math.min(1, sessionDuration / 60); // 1 hour = full fatigue
    
    // Response time based fatigue
    const responseTimeFatigue = response.responseTime > 10000 ? 0.1 : 0; // >10s indicates fatigue
    
    // Difficulty-based fatigue
    const difficultyFatigue = response.rating === 'again' ? 0.05 : 0;
    
    return Math.min(1, currentState.sessionFatigueIndex + responseTimeFatigue + difficultyFatigue);
  }
  
  calculateFlowStateMetrics(state: UnifiedSessionState): FlowStateMetrics {
    // Calculate challenge-skill balance and engagement
    const challengeSkillBalance = this.calculateChallengeSkillRatio(state);
    const engagementLevel = this.calculateEngagementLevel(state);
    
    return {
      challengeSkillBalance,
      engagementLevel,
      satisfactionPrediction: this.predictSessionSatisfaction(state),
      momentumMaintenance: state.sessionMomentumScore >= 0.4 && state.sessionMomentumScore <= 0.8
    };
  }
}
```

### **2.3 Intelligent Card Selection System**

#### **Task 2.3.1: Card Selector**
**File**: `server/src/services/selection/unifiedCardSelector.ts`

```typescript
export class UnifiedCardSelector {
  selectNextOptimalCard(
    session: UnifiedSessionState,
    availableCards: UnifiedCard[]
  ): CardSelectionResult {
    // Multi-step selection process
    
    // 1. Apply clustering prevention
    const clusteredFiltered = this.preventCardClustering(availableCards, session);
    
    // 2. Apply cognitive load filtering
    const cognitiveFiltered = this.applyCognitiveLoadFilter(clusteredFiltered, session);
    
    // 3. Momentum-based selection strategy
    if (session.sessionMomentumScore < 0.4) {
      return this.selectConfidenceBooster(cognitiveFiltered, session);
    } else if (session.sessionMomentumScore > 0.7) {
      return this.selectOptimalChallenge(cognitiveFiltered, session);
    } else {
      return this.maintainOptimalFlow(cognitiveFiltered, session);
    }
  }
  
  private preventCardClustering(
    cards: UnifiedCard[], 
    session: UnifiedSessionState
  ): UnifiedCard[] {
    // ChatGPT's clustering prevention approach
    const recentCards = session.adaptationHistory.slice(-3);
    
    return cards.filter(card => {
      // Check concept similarity
      const conceptCluster = recentCards.some(recent => 
        card.conceptSimilarity.includes(recent.cardId)
      );
      
      // Check content similarity
      const contentSimilarity = recentCards.some(recent => 
        this.calculateContentSimilarity(card.id, recent.cardId) > 0.7
      );
      
      // Check time-based clustering
      const recentlySeen = card.lastClusterReview && 
        (Date.now() - new Date(card.lastClusterReview).getTime()) < (5 * 60 * 1000); // 5 minutes
      
      return !conceptCluster && !contentSimilarity && !recentlySeen;
    });
  }
  
  private selectConfidenceBooster(
    cards: UnifiedCard[], 
    session: UnifiedSessionState
  ): CardSelectionResult {
    // Select cards that will rebuild confidence
    const boosters = cards.filter(card => 
      card.stability > 7 && // Well-established memory
      card.retrievability > 0.8 && // High success probability
      card.difficulty < 5 // Not too challenging
    );
    
    if (boosters.length === 0) {
      // Fallback to easiest available card
      const easiest = cards.sort((a, b) => a.difficulty - b.difficulty)[0];
      return {
        card: easiest,
        explanation: "Selected easiest available card to rebuild confidence",
        reasoning: "momentum_recovery",
        confidence: 0.7
      };
    }
    
    // Select best booster based on multiple criteria
    const selectedCard = this.selectBestBooster(boosters, session);
    
    return {
      card: selectedCard,
      explanation: `Selected confidence booster (difficulty: ${selectedCard.difficulty.toFixed(1)}, success probability: ${(selectedCard.retrievability * 100).toFixed(0)}%)`,
      reasoning: "momentum_recovery",
      confidence: 0.9
    };
  }
  
  private selectOptimalChallenge(
    cards: UnifiedCard[], 
    session: UnifiedSessionState
  ): CardSelectionResult {
    // Intelligent challenge selection based on cognitive capacity
    const cognitiveCapacity = session.cognitiveLoadCapacity * (1 - session.sessionFatigueIndex);
    const optimalDifficulty = 3 + (cognitiveCapacity * 4); // Scale difficulty 3-7 based on capacity
    
    const challenges = cards.filter(card =>
      Math.abs(card.difficulty - optimalDifficulty) < 1.5 &&
      card.retrievability < 0.9 && // Not too easy
      card.retrievability > 0.3 // Not impossibly hard
    );
    
    if (challenges.length === 0) {
      // Fallback to closest difficulty match
      const closest = cards.sort((a, b) => 
        Math.abs(a.difficulty - optimalDifficulty) - Math.abs(b.difficulty - optimalDifficulty)
      )[0];
      
      return {
        card: closest,
        explanation: "Selected closest difficulty match for optimal challenge",
        reasoning: "engagement_optimization",
        confidence: 0.6
      };
    }
    
    const selectedCard = this.selectBestChallenge(challenges, session);
    
    return {
      card: selectedCard,
      explanation: `Introduced optimal challenge (difficulty: ${selectedCard.difficulty.toFixed(1)} vs optimal: ${optimalDifficulty.toFixed(1)})`,
      reasoning: "engagement_optimization",
      confidence: 0.85
    };
  }
  
  private calculateContentSimilarity(cardId1: string, cardId2: string): number {
    // Placeholder for semantic similarity calculation
    // In reality, this would use NLP techniques or pre-computed similarity scores
    return 0.0;
  }
}
```

## 🎮 Phase 3: Advanced Queue Management (Weeks 5-6)

### **3.1 Queue Manager Implementation**

#### **Task 3.1.1: Unified Queue Manager**
**File**: `client/src/services/unifiedQueueManager.ts`

```typescript
export class UnifiedQueueManager {
  private fsrsEngine: UnifiedFSRSEngine;
  private momentumManager: UnifiedMomentumManager;
  private cardSelector: UnifiedCardSelector;
  
  constructor() {
    this.fsrsEngine = new UnifiedFSRSEngine();
    this.momentumManager = new UnifiedMomentumManager();
    this.cardSelector = new UnifiedCardSelector();
  }
  
  async initializeSession(userId: string, deckId: string): Promise<UnifiedSessionState> {
    // Initialize new session with default state
    const availableCards = await this.loadAvailableCards(userId, deckId);
    const userProfile = await this.loadUserProfile(userId);
    
    // Prepare initial buffers
    const initialState: UnifiedSessionState = {
      sessionMomentumScore: 0.5,
      momentumTrend: 'stable',
      sessionFatigueIndex: 0.0,
      cognitiveLoadCapacity: 1.0,
      attentionSpanRemaining: 1.0,
      reviewQueue: [],
      lookaheadBuffer: [],
      emergencyBuffer: [],
      challengeReserve: [],
      sessionStartTime: new Date().toISOString(),
      contextualFactors: await this.getSessionContext(),
      adaptationHistory: [],
      explanationLog: [],
      flowStateMetrics: {
        challengeSkillBalance: 0.5,
        engagementLevel: 0.5,
        satisfactionPrediction: 0.7,
        momentumMaintenance: true
      }
    };
    
    // Populate initial buffers
    await this.populateInitialBuffers(initialState, availableCards);
    
    return initialState;
  }
  
  async getNextCard(sessionState: UnifiedSessionState): Promise<CardSelectionResult> {
    // Refresh buffers if needed
    if (sessionState.lookaheadBuffer.length < 3) {
      await this.refreshLookaheadBuffer(sessionState);
    }
    
    // Select next card using intelligent selection
    const selection = this.cardSelector.selectNextOptimalCard(
      sessionState, 
      sessionState.lookaheadBuffer
    );
    
    // Update session state
    this.updateQueueAfterSelection(sessionState, selection.card);
    
    // Log explanation
    sessionState.explanationLog.push({
      timestamp: new Date().toISOString(),
      cardId: selection.card.id,
      explanation: selection.explanation,
      reasoning: selection.reasoning as any,
      confidence: selection.confidence,
      userVisible: true
    });
    
    return selection;
  }
  
  async processCardResponse(
    sessionState: UnifiedSessionState,
    cardId: string,
    response: EnhancedResponseLog
  ): Promise<UnifiedSessionState> {
    // Update card with FSRS calculations
    const card = await this.getCard(cardId);
    const userProfile = await this.getUserProfile(sessionState.userId);
    
    const dsrUpdate = this.fsrsEngine.calculateEnhancedDSR(card, response, userProfile);
    await this.updateCardDSR(cardId, dsrUpdate);
    
    // Update session momentum
    const updatedSession = this.momentumManager.updateSessionMomentum(sessionState, response);
    
    // Update flow state metrics
    updatedSession.flowStateMetrics = this.momentumManager.calculateFlowStateMetrics(updatedSession);
    
    // Add to adaptation history
    updatedSession.adaptationHistory.push({
      timestamp: new Date().toISOString(),
      cardId,
      action: 'selected',
      reason: 'user_response_processed',
      algorithmVersion: '3.0',
      parameters: { momentum: updatedSession.sessionMomentumScore, fatigue: updatedSession.sessionFatigueIndex }
    });
    
    // Refresh buffers based on new session state
    await this.adaptiveBufferRefresh(updatedSession);
    
    return updatedSession;
  }
  
  private async populateInitialBuffers(
    sessionState: UnifiedSessionState, 
    availableCards: UnifiedCard[]
  ): Promise<void> {
    // Sort cards by optimal review timing
    const sortedCards = availableCards.sort((a, b) => {
      const scoreA = this.calculateInitialPriority(a);
      const scoreB = this.calculateInitialPriority(b);
      return scoreB - scoreA;
    });
    
    // Populate lookahead buffer (8-12 cards)
    sessionState.lookaheadBuffer = sortedCards.slice(0, 10);
    
    // Populate emergency buffer (confidence boosters)
    sessionState.emergencyBuffer = sortedCards
      .filter(card => card.stability > 10 && card.difficulty < 4)
      .slice(0, 5);
    
    // Populate challenge reserve (engagement cards)
    sessionState.challengeReserve = sortedCards
      .filter(card => card.difficulty > 6 && card.retrievability > 0.4)
      .slice(0, 5);
  }
  
  private async adaptiveBufferRefresh(sessionState: UnifiedSessionState): Promise<void> {
    // Refresh buffers based on current session state
    if (sessionState.sessionMomentumScore < 0.3) {
      // Emergency mode: prioritize confidence boosters
      await this.prioritizeEmergencyBuffer(sessionState);
    } else if (sessionState.sessionMomentumScore > 0.8) {
      // High performance: inject challenges
      await this.prioritizeChallengeReserve(sessionState);
    } else {
      // Normal mode: balanced selection
      await this.balancedBufferRefresh(sessionState);
    }
  }
}
```

### **3.2 Cognitive Load and Fatigue Modeling**

#### **Task 3.2.1: Cognitive Load Calculator**
**File**: `server/src/services/cognitive/cognitiveLoadCalculator.ts`

```typescript
export class CognitiveLoadCalculator {
  calculateCurrentLoad(
    responseHistory: EnhancedResponseLog[], 
    sessionState: UnifiedSessionState
  ): number {
    // Multi-factor cognitive load calculation
    
    // 1. Time-based fatigue (exponential)
    const sessionDuration = this.getSessionDuration(sessionState.sessionStartTime);
    const timeFatigue = 1 - Math.exp(-sessionDuration / 45); // 45 min half-life
    
    // 2. Response time variance (indicator of mental effort)
    const responseTimeVariance = this.calculateResponseTimeVariance(responseHistory.slice(-10));
    const responseTimeFatigue = Math.min(1, responseTimeVariance / 5000); // Normalize
    
    // 3. Error rate impact
    const recentErrors = responseHistory.slice(-5).filter(r => r.rating === 'again').length;
    const errorFatigue = recentErrors * 0.15;
    
    // 4. Difficulty accumulation
    const recentDifficulty = responseHistory.slice(-5).reduce((sum, r) => sum + (r.difficulty || 5), 0) / 5;
    const difficultyFatigue = Math.max(0, (recentDifficulty - 5) * 0.1);
    
    // Combine factors with weights
    return Math.min(1, 
      timeFatigue * 0.4 + 
      responseTimeFatigue * 0.3 + 
      errorFatigue * 0.2 + 
      difficultyFatigue * 0.1
    );
  }
  
  adjustDifficultyForCognitiveLoad(baseDifficulty: number, cognitiveLoad: number): number {
    // Reduce difficulty when cognitive load is high
    const loadAdjustment = cognitiveLoad * 2.0; // Max 2-point reduction
    return Math.max(1, baseDifficulty - loadAdjustment);
  }
  
  predictAttentionSpan(
    sessionState: UnifiedSessionState, 
    userProfile: UserProfile
  ): number {
    // Predict remaining attention span (0-1)
    const baseAttentionSpan = userProfile.averageSessionLength || 30; // minutes
    const sessionDuration = this.getSessionDuration(sessionState.sessionStartTime);
    
    // Exponential decay with personal variation
    const personalDecayRate = userProfile.attentionDecayRate || 0.02;
    return Math.max(0, Math.exp(-sessionDuration * personalDecayRate));
  }
}
```

#### **Task 3.2.2: Environmental Context Service**
**File**: `client/src/services/environmental/environmentalContextService.ts`

```typescript
export class EnvironmentalContextService {
  async getCurrentContext(): Promise<EnvironmentalContext> {
    const context: EnvironmentalContext = {
      device: this.detectDevice(),
      networkQuality: await this.assessNetworkQuality(),
    };
    
    // Mobile-specific context
    if (context.device === 'mobile') {
      context.batteryLevel = await this.getBatteryLevel();
    }
    
    return context;
  }
  
  private detectDevice(): 'mobile' | 'desktop' | 'tablet' {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/mobile|android|iphone/.test(userAgent)) return 'mobile';
    if (/tablet|ipad/.test(userAgent)) return 'tablet';
    return 'desktop';
  }
  
  private async assessNetworkQuality(): Promise<'excellent' | 'good' | 'poor' | 'offline'> {
    if (!navigator.onLine) return 'offline';
    
    // Use Connection API if available
    const connection = (navigator as any).connection;
    if (connection) {
      const speed = connection.downlink;
      if (speed > 10) return 'excellent';
      if (speed > 2) return 'good';
      return 'poor';
    }
    
    // Fallback: simple ping test
    try {
      const start = Date.now();
      await fetch('/api/ping', { cache: 'no-cache' });
      const latency = Date.now() - start;
      
      if (latency < 100) return 'excellent';
      if (latency < 300) return 'good';
      return 'poor';
    } catch {
      return 'poor';
    }
  }
  
  private async getBatteryLevel(): Promise<number | undefined> {
    // Battery API (if supported)
    const battery = await (navigator as any).getBattery?.();
    return battery?.level;
  }
}
```

## 🎨 Phase 4: Enhanced Frontend Integration (Weeks 7-8)

### **4.1 Enhanced Review Page**

#### **Task 4.1.1: Enhanced Review Page Component**
**File**: `client/src/pages/EnhancedReviewPage.tsx`

```tsx
import React, { useState, useEffect, useCallback } from 'react';
import { UnifiedQueueManager } from '../services/unifiedQueueManager';
import { UnifiedSessionState, CardSelectionResult, EnhancedResponseLog } from '../../shared/types';

export const EnhancedReviewPage: React.FC = () => {
  const [sessionState, setSessionState] = useState<UnifiedSessionState | null>(null);
  const [currentCard, setCurrentCard] = useState<CardSelectionResult | null>(null);
  const [responseStartTime, setResponseStartTime] = useState<number>(0);
  const [showExplanation, setShowExplanation] = useState(false);
  
  const queueManager = new UnifiedQueueManager();
  
  useEffect(() => {
    initializeSession();
  }, []);
  
  const initializeSession = async () => {
    const userId = getCurrentUserId();
    const deckId = getCurrentDeckId();
    const newSession = await queueManager.initializeSession(userId, deckId);
    setSessionState(newSession);
    
    const firstCard = await queueManager.getNextCard(newSession);
    setCurrentCard(firstCard);
    setResponseStartTime(Date.now());
  };
  
  const handleCardResponse = useCallback(async (rating: 'again' | 'hard' | 'good' | 'easy') => {
    if (!sessionState || !currentCard) return;
    
    const responseTime = Date.now() - responseStartTime;
    const enhancedResponse: EnhancedResponseLog = {
      timestamp: new Date().toISOString(),
      rating,
      responseTime,
      contextualFactors: {
        sessionTime: Date.now() - new Date(sessionState.sessionStartTime).getTime(),
        timeOfDay: new Date().toISOString(),
        sessionFatigueIndex: sessionState.sessionFatigueIndex,
        cognitiveLoadAtTime: sessionState.cognitiveLoadCapacity,
        environmentalFactors: await environmentalContextService.getCurrentContext()
      },
      momentumImpact: calculateMomentumImpact(rating, sessionState),
      confidenceChange: calculateConfidenceChange(rating, currentCard.card),
      previousCardSimilarity: 0.0, // Would be calculated
      clusteringContext: 'general'
    };
    
    // Process response and update session
    const updatedSession = await queueManager.processCardResponse(
      sessionState,
      currentCard.card.id,
      enhancedResponse
    );
    setSessionState(updatedSession);
    
    // Get next card
    const nextCard = await queueManager.getNextCard(updatedSession);
    setCurrentCard(nextCard);
    setResponseStartTime(Date.now());
  }, [sessionState, currentCard, responseStartTime]);
  
  return (
    <div className="enhanced-review-page">
      {/* Session Metrics Header */}
      <SessionMetricsHeader sessionState={sessionState} />
      
      {/* Card Display */}
      <CardDisplay card={currentCard?.card} />
      
      {/* Response Buttons */}
      <ResponseButtons onResponse={handleCardResponse} />
      
      {/* Explanation Panel (Optional) */}
      {showExplanation && currentCard && (
        <ExplanationPanel 
          explanation={currentCard.explanation}
          reasoning={currentCard.reasoning}
          confidence={currentCard.confidence}
        />
      )}
      
      {/* Flow State Indicator */}
      <FlowStateIndicator sessionState={sessionState} />
      
      {/* Session Controls */}
      <SessionControls 
        sessionState={sessionState}
        onToggleExplanation={() => setShowExplanation(!showExplanation)}
      />
    </div>
  );
};

// Sub-components
const SessionMetricsHeader: React.FC<{ sessionState: UnifiedSessionState | null }> = ({ sessionState }) => {
  if (!sessionState) return null;
  
  return (
    <div className="session-metrics">
      <div className="momentum-indicator">
        <span>Momentum: {(sessionState.sessionMomentumScore * 100).toFixed(0)}%</span>
        <div className="momentum-bar">
          <div 
            className="momentum-fill" 
            style={{ width: `${sessionState.sessionMomentumScore * 100}%` }}
          />
        </div>
      </div>
      
      <div className="fatigue-indicator">
        <span>Energy: {((1 - sessionState.sessionFatigueIndex) * 100).toFixed(0)}%</span>
        <div className="energy-bar">
          <div 
            className="energy-fill" 
            style={{ width: `${(1 - sessionState.sessionFatigueIndex) * 100}%` }}
          />
        </div>
      </div>
      
      <div className="flow-indicator">
        <span>Flow: {sessionState.flowStateMetrics.momentumMaintenance ? '✓' : '⚠️'}</span>
      </div>
    </div>
  );
};

const ExplanationPanel: React.FC<{
  explanation: string;
  reasoning: string;
  confidence: number;
}> = ({ explanation, reasoning, confidence }) => {
  return (
    <div className="explanation-panel">
      <h4>Why this card?</h4>
      <p>{explanation}</p>
      <div className="reasoning-tag">{reasoning.replace('_', ' ')}</div>
      <div className="confidence-indicator">
        Confidence: {(confidence * 100).toFixed(0)}%
      </div>
    </div>
  );
};

const FlowStateIndicator: React.FC<{ sessionState: UnifiedSessionState | null }> = ({ sessionState }) => {
  if (!sessionState) return null;
  
  const { challengeSkillBalance, engagementLevel } = sessionState.flowStateMetrics;
  
  const getFlowZone = (balance: number): string => {
    if (balance < 0.3) return 'Bored';
    if (balance > 0.7) return 'Anxious';
    return 'Flow Zone';
  };
  
  return (
    <div className="flow-state-indicator">
      <div className={`flow-zone ${getFlowZone(challengeSkillBalance).toLowerCase()}`}>
        {getFlowZone(challengeSkillBalance)}
      </div>
      <div className="engagement-meter">
        Engagement: {(engagementLevel * 100).toFixed(0)}%
      </div>
    </div>
  );
};
```

### **4.2 Analytics Dashboard**

#### **Task 4.2.1: Advanced Analytics Dashboard**
**File**: `client/src/pages/AnalyticsDashboard.tsx`

```tsx
import React from 'react';
import { Line, Bar, Scatter } from 'react-chartjs-2';

export const AnalyticsDashboard: React.FC = () => {
  return (
    <div className="analytics-dashboard">
      <h2>Advanced Learning Analytics</h2>
      
      {/* DSR Metrics Section */}
      <section className="dsr-metrics">
        <h3>Memory Metrics (DSR)</h3>
        <div className="metrics-grid">
          <DSRTrendsChart />
          <StabilityDistribution />
          <RetrievabilityPrediction />
        </div>
      </section>
      
      {/* Session Performance */}
      <section className="session-performance">
        <h3>Session Performance</h3>
        <div className="performance-grid">
          <MomentumTrendsChart />
          <FlowStateAnalysis />
          <CognitiveLoadPatterns />
        </div>
      </section>
      
      {/* Personalization Insights */}
      <section className="personalization-insights">
        <h3>Personal Learning Patterns</h3>
        <div className="insights-grid">
          <OptimalStudyTimes />
          <DifficultyPreferences />
          <ProgressProjections />
        </div>
      </section>
    </div>
  );
};

const DSRTrendsChart: React.FC = () => {
  // Implementation for DSR trends visualization
  return <div className="dsr-trends-chart">DSR Trends Chart</div>;
};

const MomentumTrendsChart: React.FC = () => {
  // Implementation for momentum trends
  return <div className="momentum-trends-chart">Momentum Trends Chart</div>;
};

const FlowStateAnalysis: React.FC = () => {
  // Implementation for flow state analysis
  return <div className="flow-state-analysis">Flow State Analysis</div>;
};
```

## 🔧 Phase 5: Testing and Optimization (Weeks 9-10)

### **5.1 Comprehensive Testing Suite**

#### **Task 5.1.1: FSRS Engine Tests**
**File**: `server/src/services/__tests__/unifiedFSRSEngine.test.ts`

```typescript
describe('UnifiedFSRSEngine', () => {
  let fsrsEngine: UnifiedFSRSEngine;
  
  beforeEach(() => {
    fsrsEngine = new UnifiedFSRSEngine();
  });
  
  describe('calculateEnhancedDSR', () => {
    it('should adjust difficulty based on contextual factors', () => {
      // Test contextual difficulty adjustments
    });
    
    it('should calculate stability with cognitive load consideration', () => {
      // Test stability calculations
    });
    
    it('should update retrievability based on response patterns', () => {
      // Test retrievability updates
    });
  });
  
  describe('calculateOptimalInterval', () => {
    it('should return appropriate intervals for different stability levels', () => {
      // Test interval calculations
    });
    
    it('should adjust intervals based on cognitive load', () => {
      // Test cognitive load adjustments
    });
  });
});
```

#### **Task 5.1.2: Momentum Manager Tests**
**File**: `server/src/services/__tests__/unifiedMomentumManager.test.ts`

```typescript
describe('UnifiedMomentumManager', () => {
  let momentumManager: UnifiedMomentumManager;
  
  beforeEach(() => {
    momentumManager = new UnifiedMomentumManager();
  });
  
  describe('updateSessionMomentum', () => {
    it('should correctly calculate momentum using weighted moving average', () => {
      // Test momentum calculations
    });
    
    it('should update fatigue index based on response patterns', () => {
      // Test fatigue calculations
    });
    
    it('should adjust cognitive load capacity', () => {
      // Test cognitive load updates
    });
  });
  
  describe('calculateFlowStateMetrics', () => {
    it('should identify optimal flow state conditions', () => {
      // Test flow state detection
    });
  });
});
```

#### **Task 5.1.3: Card Selection Tests**
**File**: `server/src/services/__tests__/unifiedCardSelector.test.ts`

```typescript
describe('UnifiedCardSelector', () => {
  let cardSelector: UnifiedCardSelector;
  
  beforeEach(() => {
    cardSelector = new UnifiedCardSelector();
  });
  
  describe('selectNextOptimalCard', () => {
    it('should prevent card clustering effectively', () => {
      // Test clustering prevention
    });
    
    it('should select confidence boosters when momentum is low', () => {
      // Test confidence booster selection
    });
    
    it('should introduce challenges when momentum is high', () => {
      // Test challenge selection
    });
    
    it('should maintain optimal flow in normal conditions', () => {
      // Test flow maintenance
    });
  });
});
```

### **5.2 Performance Optimization**

#### **Task 5.2.1: Caching Layer Implementation**
**File**: `server/src/services/cache/unifiedCacheService.ts`

```typescript
export class UnifiedCacheService {
  private memoryCache: Map<string, any> = new Map();
  private cacheConfig = {
    dsrCalculations: { ttl: 300000, maxSize: 1000 }, // 5 minutes
    cardSelections: { ttl: 60000, maxSize: 500 }, // 1 minute
    userProfiles: { ttl: 900000, maxSize: 200 }, // 15 minutes
  };
  
  async getCachedDSR(cardId: string, responseHash: string): Promise<DSRUpdate | null> {
    const key = `dsr:${cardId}:${responseHash}`;
    return this.get(key, 'dsrCalculations');
  }
  
  async cacheDSR(cardId: string, responseHash: string, dsr: DSRUpdate): Promise<void> {
    const key = `dsr:${cardId}:${responseHash}`;
    this.set(key, dsr, 'dsrCalculations');
  }
  
  private get(key: string, category: string): any {
    const item = this.memoryCache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.memoryCache.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  private set(key: string, value: any, category: string): void {
    const config = this.cacheConfig[category];
    const expiry = Date.now() + config.ttl;
    
    this.memoryCache.set(key, { value, expiry });
    
    // Simple LRU cleanup
    if (this.memoryCache.size > config.maxSize) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }
  }
}
```

#### **Task 5.2.2: Database Query Optimization**
**File**: `server/src/services/database/optimizedQueries.ts`

```typescript
export class OptimizedQueries {
  async getCardsForReview(userId: string, limit: number = 50): Promise<UnifiedCard[]> {
    // Optimized query with proper indexing
    const query = `
      SELECT * FROM cards 
      WHERE user_id = ? 
        AND next_review <= datetime('now')
      ORDER BY 
        CASE 
          WHEN stability < 1 THEN 0  -- New cards first
          WHEN retrievability < 0.8 THEN 1  -- Due cards
          ELSE 2  -- Future reviews
        END,
        retrievability ASC,
        stability ASC
      LIMIT ?
    `;
    
    return await this.db.query(query, [userId, limit]);
  }
  
  async updateCardDSRBatch(updates: Array<{id: string, dsr: DSRUpdate}>): Promise<void> {
    // Batch update for better performance
    const transaction = this.db.transaction();
    
    try {
      for (const update of updates) {
        await transaction.run(`
          UPDATE cards SET 
            difficulty = ?,
            stability = ?,
            retrievability = ?,
            last_reviewed = datetime('now'),
            next_review = datetime('now', '+' || ? || ' days')
          WHERE id = ?
        `, [
          update.dsr.difficulty,
          update.dsr.stability,
          update.dsr.retrievability,
          this.calculateNextReviewDays(update.dsr.stability),
          update.id
        ]);
      }
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}
```

### **5.3 A/B Testing Framework**

#### **Task 5.3.1: A/B Testing Service**
**File**: `server/src/services/testing/abTestingService.ts`

```typescript
export class ABTestingService {
  async assignUserToTest(userId: string, testName: string): Promise<'control' | 'treatment'> {
    // Deterministic assignment based on user ID
    const hash = this.hashUserId(userId + testName);
    return hash % 2 === 0 ? 'control' : 'treatment';
  }
  
  async trackEvent(userId: string, event: ABTestEvent): Promise<void> {
    // Track A/B test events
    await this.db.collection('ab_test_events').create({
      userId,
      testName: event.testName,
      variant: event.variant,
      eventType: event.eventType,
      value: event.value,
      timestamp: new Date(),
      sessionId: event.sessionId
    });
  }
  
  async analyzeTestResults(testName: string): Promise<ABTestResults> {
    // Statistical analysis of A/B test results
    const controlMetrics = await this.getMetricsForVariant(testName, 'control');
    const treatmentMetrics = await this.getMetricsForVariant(testName, 'treatment');
    
    return {
      testName,
      control: controlMetrics,
      treatment: treatmentMetrics,
      significance: this.calculateSignificance(controlMetrics, treatmentMetrics),
      recommendation: this.generateRecommendation(controlMetrics, treatmentMetrics)
    };
  }
  
  private calculateSignificance(control: TestMetrics, treatment: TestMetrics): number {
    // Statistical significance calculation using t-test
    return this.tTest(control.values, treatment.values);
  }
}
```

## 📊 Success Metrics and Monitoring

### **Task 6.1.1: Metrics Collection Service**
**File**: `server/src/services/analytics/metricsCollectionService.ts`

```typescript
export class MetricsCollectionService {
  async collectSessionMetrics(sessionState: UnifiedSessionState): Promise<SessionMetrics> {
    return {
      sessionId: sessionState.sessionId,
      userId: sessionState.userId,
      duration: Date.now() - new Date(sessionState.sessionStartTime).getTime(),
      cardsReviewed: sessionState.adaptationHistory.length,
      averageMomentum: this.calculateAverageMomentum(sessionState),
      finalFatigueIndex: sessionState.sessionFatigueIndex,
      flowStateTime: this.calculateFlowStateTime(sessionState),
      adaptationAccuracy: this.calculateAdaptationAccuracy(sessionState),
      userSatisfaction: sessionState.flowStateMetrics.satisfactionPrediction,
      completionReason: 'user_ended' // or 'time_limit', 'fatigue_limit', etc.
    };
  }
  
  async generateDailyReport(userId: string, date: string): Promise<DailyLearningReport> {
    const sessions = await this.getSessionsForDay(userId, date);
    const cards = await this.getCardsReviewedForDay(userId, date);
    
    return {
      date,
      totalStudyTime: sessions.reduce((sum, s) => sum + s.duration, 0),
      cardsReviewed: cards.length,
      averageAccuracy: this.calculateAverageAccuracy(sessions),
      momentumTrend: this.analyzeMomentumTrend(sessions),
      optimalStudyTimes: this.identifyOptimalTimes(sessions),
      improvementAreas: this.identifyImprovementAreas(sessions),
      achievements: this.identifyAchievements(sessions, cards)
    };
  }
}
```

## 🚀 Deployment and Rollout Plan

### **Phase 6: Gradual Rollout (Week 11-12)**

#### **Task 6.1: Feature Flag Implementation**
```typescript
// Feature flag service for gradual rollout
export class FeatureFlagService {
  async isUAMSEnabled(userId: string): Promise<boolean> {
    // Gradual rollout: start with 5%, increase to 100%
    const rolloutPercentage = await this.getRolloutPercentage('uams_v3');
    const userHash = this.hashUserId(userId);
    return (userHash % 100) < rolloutPercentage;
  }
}
```

#### **Task 6.2: Migration Scripts**
```typescript
// Migration scripts for existing users
export class UAMSMigrationService {
  async migrateUser(userId: string): Promise<void> {
    // Migrate existing cards to UnifiedCard format
    // Calculate initial DSR values from review history
    // Set up initial session preferences
  }
}
```

## 🎯 Implementation Timeline Summary

| Week | Phase | Key Deliverables |
|------|-------|------------------|
| 1-2 | Enhanced Data Architecture | Database schema, TypeScript types, migration scripts |
| 3-4 | Triple-Layer Services | FSRS engine, momentum manager, card selector |
| 5-6 | Advanced Queue Management | Queue manager, cognitive load calculator, context service |
| 7-8 | Frontend Integration | Enhanced review page, analytics dashboard, user controls |
| 9-10 | Testing & Optimization | Comprehensive tests, performance optimization, caching |
| 11-12 | Deployment & Rollout | Feature flags, A/B testing, gradual user migration |

## 🔧 Development Guidelines

### **Code Quality Standards**
- **TypeScript**: Strict mode enabled, comprehensive type coverage
- **Testing**: >90% test coverage for all new services
- **Performance**: <200ms response times for card selection
- **Documentation**: Comprehensive JSDoc for all public methods
- **Error Handling**: Graceful degradation for all failure scenarios

### **Deployment Strategy**
- **Feature Flags**: Gradual rollout with rollback capabilities
- **A/B Testing**: Statistical validation against baseline
- **Monitoring**: Real-time performance and user satisfaction metrics
- **Rollback Plan**: Immediate fallback to existing system if needed

---

*This implementation plan provides a comprehensive roadmap for building the most advanced spaced repetition system, combining cutting-edge research with practical engineering excellence.*