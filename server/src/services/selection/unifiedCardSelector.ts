import { UnifiedCard, UnifiedSessionState, CardSelectionResult } from '../../../../shared/types/enhanced-types';

export interface SelectionStrategy {
  name: string;
  condition: (session: UnifiedSessionState) => boolean;
  select: (cards: UnifiedCard[], session: UnifiedSessionState) => CardSelectionResult;
  priority: number; // Higher priority strategies are checked first
}

export interface ClusteringConfig {
  conceptSimilarityThreshold: number; // 0-1
  contentSimilarityThreshold: number; // 0-1
  timeBasedClusteringWindowMs: number; // milliseconds
  maxRecentCards: number; // Number of recent cards to check for clustering
}

export class UnifiedCardSelector {
  private readonly clusteringConfig: ClusteringConfig = {
    conceptSimilarityThreshold: 0.7,
    contentSimilarityThreshold: 0.6,
    timeBasedClusteringWindowMs: 5 * 60 * 1000, // 5 minutes
    maxRecentCards: 3
  };

  private readonly selectionStrategies: SelectionStrategy[] = [
    {
      name: 'Crisis Intervention',
      condition: (session) => session.sessionMomentumScore < 0.3 && session.momentumTrend === 'declining',
      select: (cards, session) => this.selectConfidenceBooster(cards, session),
      priority: 100
    },
    {
      name: 'Critical Fatigue Management',
      condition: (session) => session.sessionFatigueIndex > 0.9,
      select: (cards, session) => this.selectEasiestCard(cards, session),
      priority: 90
    },
    {
      name: 'High Performance Challenge',
      condition: (session) => session.sessionMomentumScore > 0.8 && session.sessionFatigueIndex < 0.5,
      select: (cards, session) => this.selectOptimalChallenge(cards, session),
      priority: 80
    },
    {
      name: 'Flow State Maintenance',
      condition: (session) => session.flowStateMetrics.momentumMaintenance && session.sessionFatigueIndex < 0.6,
      select: (cards, session) => this.maintainOptimalFlow(cards, session),
      priority: 70
    },
    {
      name: 'Engagement Injection',
      condition: (session) => session.flowStateMetrics.engagementLevel < 0.4,
      select: (cards, session) => this.selectEngagementCard(cards, session),
      priority: 60
    },
    {
      name: 'Balanced Selection',
      condition: () => true, // Always applicable as fallback
      select: (cards, session) => this.selectBalancedCard(cards, session),
      priority: 1
    }
  ];

  /**
   * Select the next optimal card using multi-strategy approach
   */
  selectNextOptimalCard(
    session: UnifiedSessionState,
    availableCards: UnifiedCard[]
  ): CardSelectionResult {
    if (availableCards.length === 0) {
      throw new Error('No available cards for selection');
    }

    // Step 1: Apply clustering prevention
    const clusteredFiltered = this.preventCardClustering(availableCards, session);
    
    if (clusteredFiltered.length === 0) {
      // If clustering prevention removed all cards, relax the constraints
      console.warn('Clustering prevention removed all cards, using original set');
      return this.selectWithStrategy(availableCards, session);
    }

    // Step 2: Apply cognitive load filtering
    const cognitiveFiltered = this.applyCognitiveLoadFilter(clusteredFiltered, session);
    
    if (cognitiveFiltered.length === 0) {
      // If cognitive load filtering removed all cards, use clustered filtered set
      console.warn('Cognitive load filtering removed all cards, using clustered filtered set');
      return this.selectWithStrategy(clusteredFiltered, session);
    }

    // Step 3: Select using appropriate strategy
    return this.selectWithStrategy(cognitiveFiltered, session);
  }

  /**
   * Select card using the most appropriate strategy
   */
  private selectWithStrategy(cards: UnifiedCard[], session: UnifiedSessionState): CardSelectionResult {
    // Sort strategies by priority (highest first)
    const sortedStrategies = this.selectionStrategies.sort((a, b) => b.priority - a.priority);
    
    // Find the first applicable strategy
    for (const strategy of sortedStrategies) {
      if (strategy.condition(session)) {
        console.log(`Using selection strategy: ${strategy.name}`);
        return strategy.select(cards, session);
      }
    }
    
    // Fallback to balanced selection (should never reach here due to catch-all strategy)
    return this.selectBalancedCard(cards, session);
  }

  /**
   * Prevent card clustering (ChatGPT's clustering prevention approach)
   */
  private preventCardClustering(
    cards: UnifiedCard[], 
    session: UnifiedSessionState
  ): UnifiedCard[] {
    const recentCards = session.adaptationHistory
      .slice(-this.clusteringConfig.maxRecentCards)
      .map(entry => entry.cardId);

    return cards.filter(card => {
      // Check concept similarity
      const conceptCluster = recentCards.some(recentCardId => 
        card.conceptSimilarity && card.conceptSimilarity.includes(recentCardId)
      );
      
      // Check content similarity (would need actual similarity calculation)
      const contentSimilarity = recentCards.some(recentCardId => 
        this.calculateContentSimilarity(card.id, recentCardId) > this.clusteringConfig.contentSimilarityThreshold
      );
      
      // Check time-based clustering
      const recentlySeen = card.lastClusterReview && 
        (Date.now() - new Date(card.lastClusterReview).getTime()) < this.clusteringConfig.timeBasedClusteringWindowMs;
      
      // Check same deck clustering (prevent too many cards from same sub-topic)
      const sameDeckRecent = session.adaptationHistory
        .slice(-2)
        .filter(entry => {
          // This would need to be implemented based on card metadata
          return false; // Placeholder
        }).length >= 2;

      return !conceptCluster && !contentSimilarity && !recentlySeen && !sameDeckRecent;
    });
  }

  /**
   * Apply cognitive load filtering
   */
  private applyCognitiveLoadFilter(
    cards: UnifiedCard[], 
    session: UnifiedSessionState
  ): UnifiedCard[] {
    const maxCognitiveLoad = this.calculateMaxAllowableCognitiveLoad(session);
    
    return cards.filter(card => {
      const cardCognitiveLoad = this.estimateCardCognitiveLoad(card);
      return cardCognitiveLoad <= maxCognitiveLoad;
    });
  }

  /**
   * Calculate maximum allowable cognitive load based on session state
   */
  private calculateMaxAllowableCognitiveLoad(session: UnifiedSessionState): number {
    let maxLoad = 1.0; // Start with maximum possible load
    
    // Reduce based on current cognitive capacity
    maxLoad *= session.cognitiveLoadCapacity;
    
    // Reduce based on fatigue
    maxLoad *= (1 - session.sessionFatigueIndex * 0.5);
    
    // Reduce based on attention span
    maxLoad *= session.attentionSpanRemaining;
    
    // Minimum threshold
    return Math.max(0.3, maxLoad);
  }

  /**
   * Estimate cognitive load for a card
   */
  private estimateCardCognitiveLoad(card: UnifiedCard): number {
    // Base cognitive load from difficulty
    let cognitiveLoad = card.difficulty / 10; // Normalize to 0-1
    
    // Adjust based on card's historical cognitive load index
    cognitiveLoad = Math.max(cognitiveLoad, card.cognitiveLoadIndex);
    
    // Adjust based on content complexity (placeholder - would need content analysis)
    const contentComplexity = this.estimateContentComplexity(card);
    cognitiveLoad += contentComplexity * 0.2;
    
    // Adjust based on retrievability (lower retrievability = higher cognitive load)
    cognitiveLoad += (1 - card.retrievability) * 0.3;
    
    return Math.max(0.1, Math.min(1.0, cognitiveLoad));
  }

  /**
   * Select confidence booster card for momentum recovery
   */
  private selectConfidenceBooster(
    cards: UnifiedCard[], 
    session: UnifiedSessionState
  ): CardSelectionResult {
    // Priority criteria for confidence boosters:
    // 1. High retrievability (>0.8)
    // 2. High stability (well-established memory)
    // 3. Low-moderate difficulty (<6)
    // 4. Recent success history
    
    const boosters = cards.filter(card => 
      card.retrievability > 0.8 && 
      card.stability > 5 && 
      card.difficulty < 6 &&
      card.confidenceLevel !== 'struggling'
    ).sort((a, b) => {
      // Sort by confidence boosting potential
      const scoreA = this.calculateConfidenceBoosterScore(a);
      const scoreB = this.calculateConfidenceBoosterScore(b);
      return scoreB - scoreA;
    });
    
    if (boosters.length === 0) {
      // Fallback: select the easiest available card
      const easiest = cards.sort((a, b) => a.difficulty - b.difficulty)[0];
      return {
        card: easiest,
        explanation: `Selected easiest available card (difficulty: ${easiest.difficulty.toFixed(1)}) to rebuild confidence during momentum crisis`,
        reasoning: "Crisis intervention - no suitable confidence boosters available",
        confidence: 0.6
      };
    }
    
    const selectedCard = boosters[0];
    return {
      card: selectedCard,
      explanation: `Selected confidence booster: High success probability (${(selectedCard.retrievability * 100).toFixed(0)}%), well-established memory (stability: ${selectedCard.stability.toFixed(1)})`,
      reasoning: "momentum_recovery",
      confidence: 0.9,
      alternativeOptions: boosters.slice(1, 3)
    };
  }

  /**
   * Calculate confidence booster score
   */
  private calculateConfidenceBoosterScore(card: UnifiedCard): number {
    let score = 0;
    
    // High retrievability is most important
    score += card.retrievability * 40;
    
    // High stability indicates well-established knowledge
    score += Math.min(20, card.stability) * 2; // Cap stability contribution
    
    // Lower difficulty is better for confidence
    score += (10 - card.difficulty) * 3;
    
    // Bonus for optimal confidence level
    if (card.confidenceLevel === 'optimal') score += 10;
    
    // Recent performance bonus
    if (card.performanceHistory.length > 0) {
      const recentSuccess = card.performanceHistory
        .slice(-3)
        .filter(h => h.rating !== 'again').length / Math.min(3, card.performanceHistory.length);
      score += recentSuccess * 10;
    }
    
    return score;
  }

  /**
   * Select optimal challenge for high-performing users
   */
  private selectOptimalChallenge(
    cards: UnifiedCard[], 
    session: UnifiedSessionState
  ): CardSelectionResult {
    // Calculate optimal difficulty range based on current state
    const cognitiveCapacity = session.cognitiveLoadCapacity * (1 - session.sessionFatigueIndex);
    const baseDifficulty = 4 + (session.sessionMomentumScore * 4); // 4-8 range
    const optimalDifficulty = baseDifficulty * cognitiveCapacity;
    
    const challenges = cards.filter(card =>
      Math.abs(card.difficulty - optimalDifficulty) < 1.5 &&
      card.retrievability > 0.3 && // Not impossibly hard
      card.retrievability < 0.85   // Not too easy for a challenge
    ).sort((a, b) => {
      // Sort by challenge optimization score
      const scoreA = this.calculateChallengeScore(a, optimalDifficulty);
      const scoreB = this.calculateChallengeScore(b, optimalDifficulty);
      return scoreB - scoreA;
    });
    
    if (challenges.length === 0) {
      // Fallback to closest difficulty match
      const closest = cards.sort((a, b) => 
        Math.abs(a.difficulty - optimalDifficulty) - Math.abs(b.difficulty - optimalDifficulty)
      )[0];
      
      return {
        card: closest,
        explanation: `Selected closest difficulty match (${closest.difficulty.toFixed(1)} vs optimal ${optimalDifficulty.toFixed(1)}) - limited suitable challenges available`,
        reasoning: "engagement_optimization",
        confidence: 0.6
      };
    }
    
    const selectedCard = challenges[0];
    return {
      card: selectedCard,
      explanation: `Optimal challenge selected: Difficulty ${selectedCard.difficulty.toFixed(1)} matches your current performance level (optimal: ${optimalDifficulty.toFixed(1)})`,
      reasoning: "engagement_optimization",
      confidence: 0.85,
      alternativeOptions: challenges.slice(1, 3)
    };
  }

  /**
   * Calculate challenge score for optimization
   */
  private calculateChallengeScore(card: UnifiedCard, optimalDifficulty: number): number {
    let score = 0;
    
    // Proximity to optimal difficulty
    const difficultyDifference = Math.abs(card.difficulty - optimalDifficulty);
    score += Math.max(0, 20 - difficultyDifference * 10);
    
    // Sweet spot retrievability (challenging but achievable)
    const idealRetrievability = 0.6; // 60% success rate is challenging but manageable
    const retrievabilityDifference = Math.abs(card.retrievability - idealRetrievability);
    score += Math.max(0, 15 - retrievabilityDifference * 20);
    
    // Bonus for cards in building confidence state (room for improvement)
    if (card.confidenceLevel === 'building') score += 5;
    
    // Penalty for struggling cards (too hard for challenge injection)
    if (card.confidenceLevel === 'struggling') score -= 10;
    
    // Learning potential (lower stability = more room for improvement)
    if (card.stability < 10) score += (10 - card.stability) * 0.5;
    
    return score;
  }

  /**
   * Maintain optimal flow state
   */
  private maintainOptimalFlow(
    cards: UnifiedCard[], 
    session: UnifiedSessionState
  ): CardSelectionResult {
    // In flow state, maintain current difficulty level with slight variations
    const currentPerformanceLevel = session.sessionMomentumScore * 10; // 0-10 scale
    const targetDifficulty = currentPerformanceLevel;
    const difficultyTolerance = 1.0;
    
    const flowCards = cards.filter(card =>
      Math.abs(card.difficulty - targetDifficulty) <= difficultyTolerance &&
      card.retrievability > 0.4 && 
      card.retrievability < 0.9
    ).sort((a, b) => {
      const scoreA = this.calculateFlowMaintenanceScore(a, session);
      const scoreB = this.calculateFlowMaintenanceScore(b, session);
      return scoreB - scoreA;
    });
    
    if (flowCards.length === 0) {
      // Fallback to balanced selection
      return this.selectBalancedCard(cards, session);
    }
    
    const selectedCard = flowCards[0];
    return {
      card: selectedCard,
      explanation: `Flow state maintenance: Selected card with balanced challenge (difficulty: ${selectedCard.difficulty.toFixed(1)}, success rate: ${(selectedCard.retrievability * 100).toFixed(0)}%)`,
      reasoning: "flow_maintenance",
      confidence: 0.8,
      alternativeOptions: flowCards.slice(1, 3)
    };
  }

  /**
   * Calculate flow maintenance score
   */
  private calculateFlowMaintenanceScore(card: UnifiedCard, session: UnifiedSessionState): number {
    let score = 0;
    
    // Prefer cards that match current performance momentum
    const performanceDifference = Math.abs(card.difficulty - (session.sessionMomentumScore * 10));
    score += Math.max(0, 15 - performanceDifference * 2);
    
    // Ideal retrievability for flow (moderate challenge)
    const idealRetrievability = 0.7;
    const retrievabilityDifference = Math.abs(card.retrievability - idealRetrievability);
    score += Math.max(0, 10 - retrievabilityDifference * 15);
    
    // Bonus for optimal confidence level
    if (card.confidenceLevel === 'optimal') score += 8;
    if (card.confidenceLevel === 'building') score += 5;
    
    // Prefer cards with consistent performance history
    if (card.performanceHistory.length >= 3) {
      const recentRatings = card.performanceHistory.slice(-3).map(h => h.rating);
      const consistency = this.calculateConsistency(recentRatings);
      score += consistency * 5;
    }
    
    return score;
  }

  /**
   * Select engagement-boosting card
   */
  private selectEngagementCard(
    cards: UnifiedCard[], 
    session: UnifiedSessionState
  ): CardSelectionResult {
    // For low engagement, select interesting/novel cards that aren't too difficult
    const engagementCards = cards.filter(card =>
      card.difficulty < 7 && // Not too hard
      card.retrievability > 0.5 && // Reasonable success chance
      this.isCardInteresting(card, session) // Novel or interesting content
    ).sort((a, b) => {
      const scoreA = this.calculateEngagementScore(a, session);
      const scoreB = this.calculateEngagementScore(b, session);
      return scoreB - scoreA;
    });
    
    if (engagementCards.length === 0) {
      // Fallback to moderate difficulty cards
      const moderate = cards.filter(card => 
        card.difficulty >= 4 && card.difficulty <= 6 &&
        card.retrievability > 0.5
      );
      
      if (moderate.length > 0) {
        const selectedCard = moderate[0];
        return {
          card: selectedCard,
          explanation: `Selected moderate difficulty card to boost engagement`,
          reasoning: "engagement_optimization",
          confidence: 0.6
        };
      }
    }
    
    const selectedCard = engagementCards[0];
    return {
      card: selectedCard,
      explanation: `Engagement booster: Novel content with manageable difficulty (${selectedCard.difficulty.toFixed(1)})`,
      reasoning: "engagement_optimization",
      confidence: 0.7,
      alternativeOptions: engagementCards.slice(1, 2)
    };
  }

  /**
   * Select easiest available card (for critical fatigue)
   */
  private selectEasiestCard(
    cards: UnifiedCard[], 
    session: UnifiedSessionState
  ): CardSelectionResult {
    const easiest = cards.sort((a, b) => {
      // Sort by ease of recall
      const easeA = a.retrievability - (a.difficulty / 10);
      const easeB = b.retrievability - (b.difficulty / 10);
      return easeB - easeA;
    })[0];
    
    return {
      card: easiest,
      explanation: `Selected easiest card due to critical fatigue (${(session.sessionFatigueIndex * 100).toFixed(0)}% fatigue)`,
      reasoning: "fatigue_management",
      confidence: 0.8
    };
  }

  /**
   * Balanced card selection (default strategy)
   */
  private selectBalancedCard(
    cards: UnifiedCard[], 
    session: UnifiedSessionState
  ): CardSelectionResult {
    // Use weighted scoring system that balances multiple factors
    const scoredCards = cards.map(card => ({
      card,
      score: this.calculateBalancedScore(card, session)
    })).sort((a, b) => b.score - a.score);
    
    const selectedCard = scoredCards[0].card;
    return {
      card: selectedCard,
      explanation: `Balanced selection considering difficulty (${selectedCard.difficulty.toFixed(1)}), retrievability (${(selectedCard.retrievability * 100).toFixed(0)}%), and current session state`,
      reasoning: "balanced_optimization",
      confidence: 0.7,
      alternativeOptions: scoredCards.slice(1, 3).map(s => s.card)
    };
  }

  /**
   * Calculate balanced score for card selection
   */
  private calculateBalancedScore(card: UnifiedCard, session: UnifiedSessionState): number {
    let score = 0;
    
    // FSRS due date priority (cards due now get higher priority)
    const dueDate = card.nextReview ? new Date(card.nextReview) : new Date();
    const daysDue = Math.max(0, (Date.now() - dueDate.getTime()) / (24 * 60 * 60 * 1000));
    score += Math.min(20, daysDue * 2); // Up to 20 points for overdue cards
    
    // Retrievability consideration (cards closer to forgetting get priority)
    score += (1 - card.retrievability) * 15;
    
    // Difficulty appropriateness for current state
    const appropriateDifficulty = session.sessionMomentumScore * 8; // 0-8 scale
    const difficultyDifference = Math.abs(card.difficulty - appropriateDifficulty);
    score += Math.max(0, 10 - difficultyDifference);
    
    // Stability consideration (less stable cards need more attention)
    score += Math.max(0, 10 - card.stability) * 0.5;
    
    // Performance history consideration
    if (card.performanceHistory.length > 0) {
      const avgRating = this.calculateAverageRating(card.performanceHistory);
      if (avgRating < 2.5) score += 5; // Struggling cards get priority
    }
    
    return score;
  }

  // Helper methods
  
  private calculateContentSimilarity(cardId1: string, cardId2: string): number {
    // Placeholder for actual content similarity calculation
    // In a real implementation, this would use NLP techniques or pre-computed similarity
    return Math.random() * 0.5; // Return low similarity for now
  }

  private estimateContentComplexity(card: UnifiedCard): number {
    // Placeholder for content complexity estimation
    // Could be based on text length, vocabulary, multimedia elements, etc.
    const frontLength = card.frontContent?.length || 0;
    const backLength = card.backContent?.length || 0;
    const totalLength = frontLength + backLength;
    
    // Simple heuristic based on content length
    return Math.min(1.0, totalLength / 500); // Normalize to 0-1
  }

  private isCardInteresting(card: UnifiedCard, session: UnifiedSessionState): boolean {
    // Check if card hasn't been seen recently (novelty)
    const recentCardIds = session.adaptationHistory.slice(-10).map(a => a.cardId);
    const isNovel = !recentCardIds.includes(card.id);
    
    // Check if card has interesting content characteristics
    const hasMultimedia = card.mediaRefs && card.mediaRefs.length > 0;
    const isSpecialType = card.cardType && card.cardType.type !== 'basic';
    
    return isNovel || hasMultimedia || isSpecialType;
  }

  private calculateConsistency(ratings: string[]): number {
    if (ratings.length < 2) return 1.0;
    
    const ratingValues = ratings.map(r => this.ratingToNumber(r));
    const mean = ratingValues.reduce((sum, val) => sum + val, 0) / ratingValues.length;
    const variance = ratingValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / ratingValues.length;
    
    // Lower variance = higher consistency
    return Math.max(0, 1 - variance / 2);
  }

  private ratingToNumber(rating: string): number {
    const ratingMap: { [key: string]: number } = {
      'again': 1,
      'hard': 2, 
      'good': 3,
      'easy': 4
    };
    return ratingMap[rating] || 2.5;
  }

  private calculateAverageRating(history: any[]): number {
    if (history.length === 0) return 2.5;
    
    const ratings = history.map(h => this.ratingToNumber(h.rating));
    return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
  }
}