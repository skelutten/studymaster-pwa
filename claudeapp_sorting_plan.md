# Progressive Adaptive Spaced Repetition System (PASRS) v1.0

## Executive Summary

A **pragmatic, incrementally-deployed** spaced repetition system that builds upon proven FSRS foundations while adding carefully validated enhancements. This plan prioritizes **reliability, performance, and measurable improvements** over theoretical complexity, with robust fallback mechanisms and comprehensive validation at each stage.

## 🎯 Core Design Principles

1. **Progressive Enhancement**: Start simple, add complexity only when validated
2. **Graceful Degradation**: Always maintain basic functionality when advanced features fail
3. **Performance First**: Sub-100ms card selection with mobile optimization
4. **Evidence-Based**: Every feature backed by A/B testing with statistical significance
5. **User Trust**: Transparent improvements with opt-out capabilities

## 📊 Foundation Analysis & Lessons Learned

### **What We Keep from Original Plan**
- ✅ FSRS as the core scheduling algorithm
- ✅ Basic momentum tracking concept (proven effective)
- ✅ Enhanced response logging for better data
- ✅ Long-term vision of intelligent adaptation

### **What We Simplify**
- ❌ Complex 21-parameter simultaneous optimization (too risky)
- ❌ Real-time semantic clustering (computationally expensive)
- ❌ Multi-layer cognitive load modeling (insufficient validation)
- ❌ Everything-at-once deployment (high failure risk)

## 🏗️ Progressive Implementation Strategy

### **Phase 1: Robust FSRS Foundation (Weeks 1-3)**
*Goal: Establish bulletproof baseline that outperforms basic Anki*

#### **1.1 Enhanced FSRS Core**
```typescript
interface FoundationCard {
  // Core FSRS (proven)
  difficulty: number        // 1-10
  stability: number        // Days until forgetting
  retrievability: number   // Current recall probability (0-1)
  
  // Enhanced tracking (minimal overhead)
  responseHistory: ResponseLog[]
  averageResponseTime: number
  consecutiveCorrect: number
  
  // Simple metadata
  lastReviewed: Date
  nextReview: Date
  reviewCount: number
}

interface ResponseLog {
  timestamp: Date
  rating: 'again' | 'hard' | 'good' | 'easy'
  responseTime: number
  wasCorrect: boolean
}
```

#### **1.2 Optimized FSRS Implementation**
```typescript
class RobustFSRS {
  // Proven 4-parameter model first, expand only if needed
  private defaultParameters = {
    w1: 0.4072,  // Initial difficulty after first review
    w2: 1.1829,  // Initial stability factor
    w3: 3.1262,  // Difficulty increase factor
    w4: 15.4722  // Stability increase factor
  }
  
  calculateNextReview(card: FoundationCard, rating: string): FoundationCard {
    const performance = this.getRatingValue(rating)
    
    // Update difficulty with bounds checking
    const newDifficulty = Math.max(1, Math.min(10, 
      card.difficulty + this.defaultParameters.w3 * (performance - 0.6)
    ))
    
    // Calculate new stability with validation
    const stabilityMultiplier = this.getStabilityMultiplier(rating, card.difficulty)
    const newStability = Math.max(0.1, card.stability * stabilityMultiplier)
    
    // Simple retrievability decay
    const daysSinceReview = (Date.now() - card.lastReviewed.getTime()) / (1000 * 60 * 60 * 24)
    const newRetrievability = Math.pow(0.9, daysSinceReview / newStability)
    
    return {
      ...card,
      difficulty: newDifficulty,
      stability: newStability,
      retrievability: newRetrievability,
      lastReviewed: new Date(),
      nextReview: new Date(Date.now() + newStability * 24 * 60 * 60 * 1000)
    }
  }
  
  private getRatingValue(rating: string): number {
    const values = { 'again': 0, 'hard': 0.3, 'good': 0.6, 'easy': 1.0 }
    return values[rating] ?? 0.6
  }
}
```

#### **1.3 Performance-First Architecture**
```typescript
class OptimizedCardSelector {
  private cardCache = new Map<string, FoundationCard>()
  private sortedQueue: string[] = []
  
  async selectNextCard(deckId: string): Promise<FoundationCard> {
    // Fast path: return pre-sorted card
    if (this.sortedQueue.length > 0) {
      const cardId = this.sortedQueue.shift()!
      return this.cardCache.get(cardId)!
    }
    
    // Rebuild queue (happens rarely)
    await this.rebuildQueue(deckId)
    return this.selectNextCard(deckId)
  }
  
  private async rebuildQueue(deckId: string): Promise<void> {
    const dueCards = await this.getDueCards(deckId)
    
    // Simple, fast sorting by retrievability + some randomization
    this.sortedQueue = dueCards
      .sort((a, b) => {
        const urgencyA = this.calculateUrgency(a)
        const urgencyB = this.calculateUrgency(b)
        return urgencyA - urgencyB + (Math.random() - 0.5) * 0.1 // Small randomization
      })
      .map(card => card.id)
  }
  
  private calculateUrgency(card: FoundationCard): number {
    // Simple urgency: lower retrievability = higher urgency
    const retrievabilityWeight = 1 - card.retrievability
    const overdue = Math.max(0, Date.now() - card.nextReview.getTime()) / (1000 * 60 * 60 * 24)
    return retrievabilityWeight + overdue * 0.1
  }
}
```

### **Phase 2: Basic Momentum Tracking (Weeks 4-5)**
*Goal: Add simple session flow management without complexity*

#### **2.1 Lightweight Session State**
```typescript
interface SimpleSessionState {
  sessionId: string
  startTime: Date
  cardsReviewed: number
  
  // Simple momentum (rolling average)
  recentPerformance: number[]  // Last 5 responses (0-1)
  currentMomentum: number      // 0-1 rolling average
  
  // Basic adaptation
  adaptationMode: 'normal' | 'building_confidence' | 'challenging'
}

class SimpleMomentumTracker {
  updateSession(session: SimpleSessionState, rating: string): SimpleSessionState {
    const performance = this.ratingToPerformance(rating)
    
    // Update recent performance (sliding window)
    const newRecent = [...session.recentPerformance, performance].slice(-5)
    const newMomentum = newRecent.reduce((a, b) => a + b, 0) / newRecent.length
    
    // Simple adaptation logic
    let newMode: SimpleSessionState['adaptationMode'] = 'normal'
    if (newMomentum < 0.3) newMode = 'building_confidence'
    else if (newMomentum > 0.7) newMode = 'challenging'
    
    return {
      ...session,
      recentPerformance: newRecent,
      currentMomentum: newMomentum,
      adaptationMode: newMode,
      cardsReviewed: session.cardsReviewed + 1
    }
  }
  
  private ratingToPerformance(rating: string): number {
    const values = { 'again': 0, 'hard': 0.25, 'good': 0.75, 'easy': 1.0 }
    return values[rating] ?? 0.5
  }
}
```

#### **2.2 Momentum-Aware Card Selection**
```typescript
class MomentumAwareSelector extends OptimizedCardSelector {
  async selectNextCard(deckId: string, session: SimpleSessionState): Promise<FoundationCard> {
    const baseCard = await super.selectNextCard(deckId)
    
    // Apply simple momentum-based adjustment
    if (session.adaptationMode === 'building_confidence') {
      return this.findConfidenceBooster(deckId) ?? baseCard
    } else if (session.adaptationMode === 'challenging') {
      return this.findChallenge(deckId) ?? baseCard
    }
    
    return baseCard
  }
  
  private async findConfidenceBooster(deckId: string): Promise<FoundationCard | null> {
    const availableCards = await this.getAvailableCards(deckId)
    
    // Find cards with high stability (easy wins)
    const boosters = availableCards
      .filter(card => card.stability > 7 && card.retrievability > 0.8)
      .sort((a, b) => b.stability - a.stability)
    
    return boosters[0] ?? null
  }
  
  private async findChallenge(deckId: string): Promise<FoundationCard | null> {
    const availableCards = await this.getAvailableCards(deckId)
    
    // Find cards that are due but not too hard
    const challenges = availableCards
      .filter(card => card.retrievability < 0.7 && card.difficulty < 8)
      .sort((a, b) => a.retrievability - b.retrievability)
    
    return challenges[0] ?? null
  }
}
```

### **Phase 3: Anti-Clustering & Context (Weeks 6-7)**
*Goal: Prevent similar cards appearing back-to-back*

#### **3.1 Simple Clustering Prevention**
```typescript
interface CardWithContext extends FoundationCard {
  // Simple content fingerprinting
  contentHash: string     // Hash of card content
  topicTags: string[]    // User-defined or auto-detected topics
  similarCardIds: string[] // Pre-computed similar cards (optional)
}

class AntiClusteringSelector extends MomentumAwareSelector {
  private recentCardHashes = new Set<string>()
  private recentTopics = new Set<string>()
  
  async selectNextCard(deckId: string, session: SimpleSessionState): Promise<CardWithContext> {
    let attempts = 0
    const maxAttempts = 5
    
    while (attempts < maxAttempts) {
      const candidate = await super.selectNextCard(deckId, session) as CardWithContext
      
      // Check if this card is too similar to recent ones
      if (!this.isTooSimilar(candidate)) {
        this.updateRecentContext(candidate)
        return candidate
      }
      
      // Remove from queue and try next
      this.removeFromQueue(candidate.id)
      attempts++
    }
    
    // Fallback: clear recent context and pick any card
    this.clearRecentContext()
    return super.selectNextCard(deckId, session) as CardWithContext
  }
  
  private isTooSimilar(card: CardWithContext): boolean {
    // Simple hash-based similarity check
    if (this.recentCardHashes.has(card.contentHash)) return true
    
    // Topic-based similarity check
    const hasSharedTopic = card.topicTags.some(topic => this.recentTopics.has(topic))
    if (hasSharedTopic && this.recentTopics.size < 3) return true
    
    return false
  }
  
  private updateRecentContext(card: CardWithContext): void {
    // Keep only last 3 cards worth of context
    if (this.recentCardHashes.size >= 3) {
      const oldest = Array.from(this.recentCardHashes)[0]
      this.recentCardHashes.delete(oldest)
    }
    
    this.recentCardHashes.add(card.contentHash)
    card.topicTags.forEach(topic => this.recentTopics.add(topic))
    
    // Limit topic memory
    if (this.recentTopics.size > 5) {
      const topicsArray = Array.from(this.recentTopics)
      this.recentTopics.clear()
      topicsArray.slice(-3).forEach(topic => this.recentTopics.add(topic))
    }
  }
}
```

### **Phase 4: Performance Monitoring & Optimization (Weeks 8-9)**
*Goal: Ensure system reliability and optimize performance*

#### **4.1 Comprehensive Monitoring**
```typescript
interface SystemMetrics {
  // Performance metrics
  averageSelectionTime: number
  cacheHitRate: number
  errorRate: number
  
  // Learning metrics
  cardsPerSession: number
  sessionCompletionRate: number
  averageRetentionAccuracy: number
  
  // User satisfaction
  adaptationSatisfactionScore: number
  systemTrustScore: number
}

class PerformanceMonitor {
  private metrics: SystemMetrics
  private alertThresholds = {
    selectionTime: 100, // ms
    errorRate: 0.01,    // 1%
    retentionAccuracy: 0.85
  }
  
  async recordCardSelection(startTime: number, success: boolean): Promise<void> {
    const selectionTime = Date.now() - startTime
    
    // Update metrics
    this.metrics.averageSelectionTime = this.updateRollingAverage(
      this.metrics.averageSelectionTime, 
      selectionTime
    )
    
    if (!success) {
      this.metrics.errorRate = this.updateErrorRate()
    }
    
    // Check for performance degradation
    if (selectionTime > this.alertThresholds.selectionTime) {
      await this.handlePerformanceAlert('slow_selection', { selectionTime })
    }
  }
  
  private async handlePerformanceAlert(type: string, data: any): Promise<void> {
    // Log alert for monitoring
    console.warn(`Performance alert: ${type}`, data)
    
    // Could trigger fallback to simpler algorithm
    if (type === 'slow_selection' && data.selectionTime > 500) {
      await this.activateEmergencyMode()
    }
  }
}
```

#### **4.2 Circuit Breaker Pattern**
```typescript
class ResilientCardSelector {
  private circuitBreaker = new Map<string, CircuitBreakerState>()
  private fallbackSelector = new OptimizedCardSelector()
  
  async selectNextCard(deckId: string, session?: SimpleSessionState): Promise<FoundationCard> {
    const breakerState = this.circuitBreaker.get(deckId)
    
    // Check if circuit is open (system is failing)
    if (breakerState?.isOpen) {
      return this.fallbackSelector.selectNextCard(deckId)
    }
    
    try {
      const startTime = Date.now()
      const result = await this.advancedSelector.selectNextCard(deckId, session)
      
      // Record success
      this.recordSuccess(deckId, Date.now() - startTime)
      return result
      
    } catch (error) {
      // Record failure and potentially open circuit
      this.recordFailure(deckId, error)
      
      // Fallback to simple selection
      return this.fallbackSelector.selectNextCard(deckId)
    }
  }
  
  private recordFailure(deckId: string, error: Error): void {
    const state = this.circuitBreaker.get(deckId) ?? new CircuitBreakerState()
    state.recordFailure(error)
    
    if (state.shouldOpenCircuit()) {
      console.warn(`Opening circuit breaker for deck ${deckId}`)
      state.openCircuit()
    }
    
    this.circuitBreaker.set(deckId, state)
  }
}
```

### **Phase 5: Validation & A/B Testing (Weeks 10-12)**
*Goal: Prove the system works better than baseline*

#### **5.1 Comprehensive A/B Testing Framework**
```typescript
interface ABTestConfig {
  testId: string
  variants: {
    control: 'basic_fsrs'
    treatment: 'progressive_adaptive'
  }
  sampleSize: number
  duration: number // days
  primaryMetric: 'retention_accuracy' | 'cards_per_session' | 'completion_rate'
  minimumDetectableEffect: number
}

class ABTestingFramework {
  async assignUserToVariant(userId: string, testConfig: ABTestConfig): Promise<string> {
    // Stable assignment based on user ID hash
    const hash = this.hashUserId(userId)
    return hash % 2 === 0 ? 'control' : 'treatment'
  }
  
  async recordLearningEvent(
    userId: string, 
    variant: string, 
    event: LearningEvent
  ): Promise<void> {
    await this.database.recordEvent({
      userId,
      variant,
      timestamp: new Date(),
      eventType: event.type,
      cardId: event.cardId,
      rating: event.rating,
      responseTime: event.responseTime,
      sessionId: event.sessionId
    })
  }
  
  async analyzeResults(testId: string): Promise<ABTestResults> {
    const controlData = await this.getVariantData(testId, 'control')
    const treatmentData = await this.getVariantData(testId, 'treatment')
    
    return {
      primaryMetricLift: this.calculateLift(controlData, treatmentData),
      statisticalSignificance: this.calculateSignificance(controlData, treatmentData),
      confidenceInterval: this.calculateConfidenceInterval(controlData, treatmentData),
      recommendation: this.generateRecommendation(controlData, treatmentData)
    }
  }
}
```

#### **5.2 Key Validation Metrics**
```typescript
interface ValidationMetrics {
  // Primary success metrics
  retentionAccuracy: {
    predicted: number[]
    actual: number[]
    rmse: number
    mape: number
  }
  
  learningEfficiency: {
    timeToMastery: number     // Average days to reach 90% retention
    cardsPerSession: number   // Sustainable study volume
    sessionLength: number     // Average session duration
  }
  
  userExperience: {
    completionRate: number    // % of sessions completed
    satisfactionScore: number // User-reported satisfaction (1-5)
    trustScore: number        // User trust in recommendations
  }
  
  systemPerformance: {
    selectionLatency: number  // ms to select next card
    errorRate: number         // % of failed operations
    cacheEfficiency: number   // % cache hits
  }
}

// Success criteria for launch
const LAUNCH_CRITERIA = {
  retentionAccuracy: { rmse: '<0.15', improvement: '>5%' },
  learningEfficiency: { timeToMastery: '>10% improvement' },
  userExperience: { completionRate: '>85%', satisfactionScore: '>4.0' },
  systemPerformance: { selectionLatency: '<100ms', errorRate: '<1%' }
}
```

## 🚀 Implementation Timeline

### **Months 1-2: Foundation & Validation**
- **Week 1-3**: Core FSRS implementation with robust error handling
- **Week 4-5**: Basic momentum tracking with A/B testing
- **Week 6-7**: Anti-clustering prevention
- **Week 8**: Performance optimization and monitoring

### **Month 3: Testing & Refinement**
- **Week 9-10**: Comprehensive A/B testing deployment
- **Week 11-12**: Results analysis and system refinement
- **Week 13**: Launch decision and rollout planning

### **Month 4+: Advanced Features (If Validated)**
- Enhanced parameter optimization
- Advanced cognitive load modeling
- Explainability layer
- Mobile-specific optimizations

## 📊 Risk Mitigation Strategy

### **Technical Risks**
1. **Performance Degradation**: Circuit breaker pattern + fallback algorithms
2. **Algorithm Complexity**: Progressive enhancement with simple fallbacks
3. **Data Quality Issues**: Robust validation and graceful degradation
4. **Mobile Performance**: Optimized algorithms with battery-aware processing

### **Product Risks**
1. **User Adoption**: Gradual rollout with opt-out capabilities
2. **Learning Disruption**: Always maintain basic FSRS functionality
3. **Over-Engineering**: Focus on proven improvements only
4. **Validation Failure**: Clear success criteria and rollback plan

## 🎯 Expected Outcomes

### **Conservative Targets (90% Confidence)**
- **10-15% improvement** in retention accuracy
- **15-20% increase** in session completion rates
- **Sub-100ms** card selection latency
- **>95% system uptime** with graceful degradation

### **Optimistic Targets (70% Confidence)**
- **20-25% improvement** in learning efficiency
- **30% reduction** in study session abandonment
- **Seamless user experience** with intelligent adaptation
- **Industry-leading** spaced repetition algorithm

## 🔍 Success Validation

### **Quantitative Validation**
- Statistical significance (p < 0.05) in A/B tests
- Effect size >10% for primary metrics
- System performance within defined SLAs
- User retention >baseline after 3 months

### **Qualitative Validation**
- User satisfaction scores >4.0/5.0
- Positive sentiment in user feedback
- Reduced support tickets about algorithm issues
- Academic/industry recognition for approach

---

This progressive plan balances **ambitious goals with practical implementation**, ensuring we build a system that actually works better than existing solutions while maintaining the reliability users expect from their learning tools.