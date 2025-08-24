import { UnifiedCard, EnhancedResponseLog, DSRUpdate, UserProfile } from '../../../../shared/types/enhanced-types';

export class UnifiedFSRSEngine {
  private defaultParameters: number[] = [
    // 21 default FSRS parameters optimized for general population
    0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94,
    2.18, 0.05, 0.34, 1.26, 0.29, 2.61, 0.62, 0.36, 0.26, 2.4
  ];

  /**
   * Calculate enhanced DSR (Difficulty, Stability, Retrievability) with contextual factors
   */
  calculateEnhancedDSR(
    card: UnifiedCard, 
    response: EnhancedResponseLog,
    userProfile: UserProfile
  ): DSRUpdate {
    // Get user-specific or default parameters
    const parameters = userProfile.fsrsParameters || this.defaultParameters;
    
    // Calculate contextual difficulty
    const contextualDifficulty = this.calculateContextualDifficulty(response, card);
    
    // Calculate stability with context awareness
    const stabilityUpdate = this.calculateStabilityWithContext(card, response, parameters);
    
    // Calculate retrievability with cognitive load consideration
    const retrievabilityUpdate = this.calculateRetrievabilityWithLoad(card, response);
    
    // Calculate confidence in the DSR calculation
    const confidence = this.calculateUpdateConfidence(card, response);
    
    // Generate explanation for the DSR update
    const explanation = this.generateDSRExplanation(card, response, {
      contextualDifficulty,
      stabilityUpdate,
      retrievabilityUpdate,
      confidence
    });

    return {
      difficulty: contextualDifficulty,
      stability: stabilityUpdate,
      retrievability: retrievabilityUpdate,
      confidence: confidence,
      explanation: explanation
    };
  }

  /**
   * Calculate contextual difficulty incorporating environmental factors
   */
  private calculateContextualDifficulty(response: EnhancedResponseLog, card: UnifiedCard): number {
    // Base difficulty from rating
    const ratingDifficulty = this.ratingToDifficulty(response.rating);
    
    // Contextual adjustments
    const fatigueAdjustment = response.contextualFactors.sessionFatigueIndex * 0.5;
    const cognitiveLoadAdjustment = (1 - response.contextualFactors.cognitiveLoadAtTime) * 0.3;
    const timeAdjustment = this.getTimeOfDayDifficultyModifier(response.contextualFactors.timeOfDay);
    const environmentalAdjustment = this.getEnvironmentalDifficultyModifier(response.contextualFactors.environmentalFactors);
    
    // Response time adjustment (longer response time = higher difficulty)
    const responseTimeAdjustment = this.getResponseTimeDifficultyModifier(response.responseTime, card.averageResponseTime);
    
    const adjustedDifficulty = Math.max(1, Math.min(10, 
      ratingDifficulty + 
      fatigueAdjustment + 
      cognitiveLoadAdjustment + 
      timeAdjustment + 
      environmentalAdjustment +
      responseTimeAdjustment
    ));

    // Smooth difficulty changes using exponential moving average
    const alpha = 0.3; // Learning rate
    return card.difficulty * (1 - alpha) + adjustedDifficulty * alpha;
  }

  /**
   * Convert FSRS rating to base difficulty value
   */
  private ratingToDifficulty(rating: 'again' | 'hard' | 'good' | 'easy'): number {
    const baseMap = {
      'again': 8.5,  // Very difficult
      'hard': 6.5,   // Moderately difficult
      'good': 4.5,   // Normal difficulty
      'easy': 2.5    // Easy
    };
    return baseMap[rating] || 5.0;
  }

  /**
   * Calculate stability with contextual enhancements
   */
  private calculateStabilityWithContext(
    card: UnifiedCard, 
    response: EnhancedResponseLog,
    parameters: number[]
  ): number {
    // Base FSRS stability calculation
    const baseStability = this.calculateBaseFSRSStability(card, response, parameters);
    
    // Contextual modifiers
    const fatigueModifier = 1 - (response.contextualFactors.sessionFatigueIndex * 0.15);
    const environmentalModifier = this.getEnvironmentalStabilityModifier(response.contextualFactors.environmentalFactors);
    const consistencyModifier = this.getConsistencyModifier(card, response);
    
    // Apply contextual modifications
    const contextualStability = baseStability * fatigueModifier * environmentalModifier * consistencyModifier;
    
    // Ensure minimum stability
    return Math.max(0.1, contextualStability);
  }

  /**
   * Base FSRS stability calculation using research parameters
   */
  private calculateBaseFSRSStability(
    card: UnifiedCard,
    response: EnhancedResponseLog,
    parameters: number[]
  ): number {
    const [w0, w1, w2, w3, w4, w5, w6, w7, w8, w9, w10, w11, w12, w13, w14, w15, w16, w17, w18, w19, w20] = parameters;
    
    // Days since last review
    const daysSinceLastReview = card.lastReviewed ? 
      Math.floor((Date.now() - new Date(card.lastReviewed).getTime()) / (24 * 60 * 60 * 1000)) : 0;
    
    // Calculate retention based on current stability and time elapsed
    const retention = Math.exp(-daysSinceLastReview / (card.stability || 1));
    
    // FSRS stability formula based on rating
    switch (response.rating) {
      case 'again':
        return Math.max(0.1, card.stability * w11);
      
      case 'hard':
        return card.stability * (1 + Math.exp(w5) * (w6 - retention) * w7);
      
      case 'good':
        return card.stability * (1 + Math.exp(w8) * (11 - card.difficulty) * Math.pow(w9, -retention) * (Math.exp((1 - retention) * w10) - 1));
      
      case 'easy':
        return card.stability * (1 + Math.exp(w15) * (w16 - retention) * w17);
      
      default:
        return card.stability;
    }
  }

  /**
   * Calculate retrievability with cognitive load consideration
   */
  private calculateRetrievabilityWithLoad(card: UnifiedCard, response: EnhancedResponseLog): number {
    // Days since last review
    const daysSinceLastReview = card.lastReviewed ? 
      Math.floor((Date.now() - new Date(card.lastReviewed).getTime()) / (24 * 60 * 60 * 1000)) : 0;
    
    // Base FSRS retrievability formula
    const baseRetrievability = Math.exp(-daysSinceLastReview / (card.stability || 1));
    
    // Cognitive load adjustment
    const cognitiveLoadAdjustment = 1 - (1 - response.contextualFactors.cognitiveLoadAtTime) * 0.1;
    
    // Fatigue adjustment
    const fatigueAdjustment = 1 - response.contextualFactors.sessionFatigueIndex * 0.05;
    
    // Recent performance trend
    const performanceTrendAdjustment = this.getPerformanceTrendAdjustment(card);
    
    const adjustedRetrievability = baseRetrievability * cognitiveLoadAdjustment * fatigueAdjustment * performanceTrendAdjustment;
    
    return Math.max(0.01, Math.min(0.99, adjustedRetrievability));
  }

  /**
   * Get time of day difficulty modifier
   */
  private getTimeOfDayDifficultyModifier(timeOfDay: string): number {
    const hour = new Date(timeOfDay).getHours();
    
    // Research-based optimal study times
    const timeModifiers: Record<number, number> = {
      6: -0.1,   // Early morning - slightly easier
      7: -0.1,
      8: -0.2,   // Peak morning performance
      9: -0.2,
      10: -0.1,
      11: 0.0,
      12: 0.1,   // Post-lunch dip
      13: 0.2,
      14: 0.3,   // Afternoon low
      15: 0.1,
      16: -0.1,  // Second peak
      17: -0.1,
      18: 0.0,
      19: 0.1,
      20: 0.2,   // Evening decline
      21: 0.3,
      22: 0.4,   // Late evening - more difficult
      23: 0.5,
      0: 0.6,    // Very late - most difficult
      1: 0.6,
      2: 0.7,
      3: 0.7,
      4: 0.6,
      5: 0.4
    };
    
    return timeModifiers[hour] || 0.0;
  }

  /**
   * Get environmental difficulty modifier
   */
  private getEnvironmentalDifficultyModifier(environmentalFactors?: any): number {
    if (!environmentalFactors) return 0.0;
    
    let modifier = 0.0;
    
    // Network quality impact
    switch (environmentalFactors.networkQuality) {
      case 'poor':
        modifier += 0.2;
        break;
      case 'offline':
        modifier += 0.3;
        break;
    }
    
    // Device type impact
    switch (environmentalFactors.device) {
      case 'mobile':
        modifier += 0.1; // Slightly more difficult on mobile
        break;
      case 'tablet':
        modifier += 0.05;
        break;
    }
    
    // Battery level impact (for mobile)
    if (environmentalFactors.batteryLevel && environmentalFactors.batteryLevel < 0.2) {
      modifier += 0.1; // Low battery increases difficulty
    }
    
    return modifier;
  }

  /**
   * Get environmental stability modifier
   */
  private getEnvironmentalStabilityModifier(environmentalFactors?: any): number {
    if (!environmentalFactors) return 1.0;
    
    let modifier = 1.0;
    
    // Ambient noise impact on memory formation
    switch (environmentalFactors.ambientNoise) {
      case 'quiet':
        modifier *= 1.05; // Optimal for memory formation
        break;
      case 'noisy':
        modifier *= 0.95; // Reduces memory stability
        break;
    }
    
    // Lighting impact
    switch (environmentalFactors.lighting) {
      case 'optimal':
        modifier *= 1.02;
        break;
      case 'dim':
      case 'bright':
        modifier *= 0.98;
        break;
    }
    
    return modifier;
  }

  /**
   * Get response time difficulty modifier
   */
  private getResponseTimeDifficultyModifier(responseTime: number, averageResponseTime: number): number {
    if (averageResponseTime === 0) return 0.0;
    
    const ratio = responseTime / averageResponseTime;
    
    if (ratio > 2.0) {
      // Much slower than average = more difficult
      return 0.5;
    } else if (ratio > 1.5) {
      return 0.3;
    } else if (ratio < 0.5) {
      // Much faster than average = easier
      return -0.3;
    } else if (ratio < 0.7) {
      return -0.1;
    }
    
    return 0.0;
  }

  /**
   * Get consistency modifier based on recent performance
   */
  private getConsistencyModifier(card: UnifiedCard, response: EnhancedResponseLog): number {
    const recentHistory = card.performanceHistory.slice(-5);
    if (recentHistory.length < 3) return 1.0;
    
    // Calculate consistency of recent responses
    const ratings = recentHistory.map(h => this.ratingToNumber(h.rating));
    const variance = this.calculateVariance(ratings);
    
    // Lower variance (more consistency) = better stability
    const consistencyBonus = Math.max(0.95, 1.0 - variance * 0.05);
    
    return consistencyBonus;
  }

  /**
   * Get performance trend adjustment
   */
  private getPerformanceTrendAdjustment(card: UnifiedCard): number {
    const recentHistory = card.performanceHistory.slice(-5);
    if (recentHistory.length < 3) return 1.0;
    
    const ratings = recentHistory.map(h => this.ratingToNumber(h.rating));
    const trend = this.calculateTrend(ratings);
    
    // Positive trend = higher retrievability
    return 1.0 + trend * 0.1;
  }

  /**
   * Convert rating to numerical value for calculations
   */
  private ratingToNumber(rating: 'again' | 'hard' | 'good' | 'easy'): number {
    const ratingMap = { 'again': 1, 'hard': 2, 'good': 3, 'easy': 4 };
    return ratingMap[rating] || 2.5;
  }

  /**
   * Calculate variance of array
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Calculate trend (slope) of recent values
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    const n = values.length;
    
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumXX += i * i;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return isNaN(slope) ? 0 : slope;
  }

  /**
   * Calculate optimal interval for next review
   */
  calculateOptimalInterval(card: UnifiedCard, targetRetention: number = 0.9): number {
    // Enhanced interval calculation using FSRS formula
    const baseInterval = card.stability * Math.log(1 / (1 - targetRetention));
    
    // Apply contextual adjustments
    const contextualAdjustment = this.getContextualIntervalModifier(card);
    const cognitiveLoadAdjustment = this.getCognitiveLoadModifier(card.cognitiveLoadIndex);
    const stabilityTrendAdjustment = this.getStabilityTrendModifier(card.stabilityTrend);
    
    const optimalInterval = baseInterval * contextualAdjustment * cognitiveLoadAdjustment * stabilityTrendAdjustment;
    
    // Ensure reasonable bounds
    return Math.max(1, Math.round(optimalInterval));
  }

  /**
   * Get contextual interval modifier
   */
  private getContextualIntervalModifier(card: UnifiedCard): number {
    // Check if card has contextual difficulty data
    if (!card.contextualDifficulty) return 1.0;
    
    // Use current time context to adjust interval
    const currentHour = new Date().getHours().toString();
    const currentDay = new Date().toLocaleDateString('en', { weekday: 'long' });
    
    const hourModifier = card.contextualDifficulty.timeOfDay?.[currentHour] || 0;
    const dayModifier = card.contextualDifficulty.dayOfWeek?.[currentDay] || 0;
    
    // Higher difficulty = shorter interval
    return Math.max(0.5, 1.0 - (hourModifier + dayModifier) * 0.1);
  }

  /**
   * Get cognitive load modifier for interval
   */
  private getCognitiveLoadModifier(cognitiveLoadIndex: number): number {
    // Higher cognitive load = shorter intervals for better retention
    return Math.max(0.7, 1.0 - cognitiveLoadIndex * 0.3);
  }

  /**
   * Get stability trend modifier
   */
  private getStabilityTrendModifier(stabilityTrend: string): number {
    switch (stabilityTrend) {
      case 'increasing':
        return 1.1; // Allow longer intervals
      case 'decreasing':
        return 0.9; // Shorter intervals
      case 'stable':
      default:
        return 1.0;
    }
  }

  /**
   * Calculate confidence in DSR update
   */
  private calculateUpdateConfidence(card: UnifiedCard, response: EnhancedResponseLog): number {
    let confidence = 0.7; // Base confidence
    
    // More history = higher confidence
    const historyCount = card.performanceHistory.length;
    if (historyCount > 10) confidence += 0.2;
    else if (historyCount > 5) confidence += 0.1;
    
    // Consistent performance = higher confidence
    if (historyCount >= 3) {
      const recentRatings = card.performanceHistory.slice(-3).map(h => h.rating);
      const isConsistent = recentRatings.every(r => r === recentRatings[0]);
      if (isConsistent) confidence += 0.1;
    }
    
    // Normal response time = higher confidence
    if (response.responseTime > 1000 && response.responseTime < 30000) {
      confidence += 0.1;
    }
    
    return Math.min(1.0, confidence);
  }

  /**
   * Generate explanation for DSR update
   */
  private generateDSRExplanation(
    card: UnifiedCard,
    response: EnhancedResponseLog,
    calculation: { contextualDifficulty: number; stabilityUpdate: number; retrievabilityUpdate: number; confidence: number }
  ): string {
    const explanations: string[] = [];
    
    // Difficulty explanation
    const difficultyChange = calculation.contextualDifficulty - card.difficulty;
    if (Math.abs(difficultyChange) > 0.5) {
      if (difficultyChange > 0) {
        explanations.push(`Difficulty increased due to ${response.rating} rating and contextual factors`);
      } else {
        explanations.push(`Difficulty decreased reflecting improved performance`);
      }
    }
    
    // Stability explanation
    const stabilityChange = calculation.stabilityUpdate / card.stability;
    if (stabilityChange > 1.2) {
      explanations.push(`Memory stability improved significantly`);
    } else if (stabilityChange < 0.8) {
      explanations.push(`Memory stability decreased due to poor performance`);
    }
    
    // Contextual factors
    if (response.contextualFactors.sessionFatigueIndex > 0.7) {
      explanations.push(`High fatigue level affected calculation`);
    }
    
    if (response.contextualFactors.cognitiveLoadAtTime < 0.5) {
      explanations.push(`Low cognitive capacity considered in adjustment`);
    }
    
    return explanations.join('; ') || 'Standard FSRS calculation applied';
  }
}