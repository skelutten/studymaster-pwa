import { EnhancedResponseLog, UnifiedSessionState, UserProfile } from '../../../../shared/types/enhanced-types';

export interface CognitiveLoadProfile {
  baseCapacity: number; // User's baseline cognitive capacity (0-1)
  fatigueRate: number; // How quickly user fatigues (0-1)
  recoveryRate: number; // How quickly user recovers from fatigue (0-1)
  attentionSpanMinutes: number; // Typical attention span duration
  optimalLoadRange: [number, number]; // Optimal cognitive load range
  stressThreshold: number; // Threshold where performance degrades
}

export interface CognitiveLoadAnalysis {
  currentLoad: number; // Current cognitive load (0-1)
  capacity: number; // Current available capacity (0-1)
  utilizationRate: number; // Load/capacity ratio (0-∞)
  fatigueLevel: number; // Current fatigue level (0-1)
  attentionRemainingMinutes: number; // Estimated remaining attention
  recommendedDifficultyAdjustment: number; // Suggested difficulty modifier
  sustainabilityScore: number; // How sustainable current load is (0-1)
  alertLevel: 'green' | 'yellow' | 'orange' | 'red'; // Visual indicator
  recommendations: string[]; // Actionable recommendations
}

export interface LoadFactors {
  timeBasedFatigue: number;
  responseTimeVariance: number;
  errorRate: number;
  difficultyAccumulation: number;
  environmentalStress: number;
  contextualDemand: number;
}

export class CognitiveLoadCalculator {
  private readonly FATIGUE_HALF_LIFE_MINUTES = 45; // Research-based attention decay
  private readonly ERROR_FATIGUE_MULTIPLIER = 0.15;
  private readonly DIFFICULTY_FATIGUE_THRESHOLD = 6.0;
  private readonly RESPONSE_TIME_VARIANCE_THRESHOLD = 5000; // ms

  private defaultProfile: CognitiveLoadProfile = {
    baseCapacity: 1.0,
    fatigueRate: 0.02, // 2% fatigue per minute under high load
    recoveryRate: 0.05, // 5% recovery per minute during rest
    attentionSpanMinutes: 45,
    optimalLoadRange: [0.3, 0.7], // Sweet spot for learning
    stressThreshold: 0.8 // Performance degrades above 80%
  };

  /**
   * Calculate comprehensive cognitive load analysis
   */
  calculateCurrentLoad(
    responseHistory: EnhancedResponseLog[], 
    sessionState: UnifiedSessionState,
    userProfile?: UserProfile
  ): CognitiveLoadAnalysis {
    const profile = this.getUserCognitiveProfile(userProfile);
    const loadFactors = this.analyzeLoadFactors(responseHistory, sessionState);
    
    // Calculate current cognitive load
    const currentLoad = this.computeOverallLoad(loadFactors, profile);
    
    // Calculate available capacity
    const capacity = this.calculateAvailableCapacity(sessionState, profile);
    
    // Calculate utilization rate
    const utilizationRate = capacity > 0 ? currentLoad / capacity : 1.0;
    
    // Estimate remaining attention span
    const attentionRemainingMinutes = this.predictRemainingAttention(sessionState, profile);
    
    // Calculate difficulty adjustment recommendation
    const difficultyAdjustment = this.calculateDifficultyAdjustment(currentLoad, capacity, profile);
    
    // Calculate sustainability score
    const sustainabilityScore = this.calculateSustainabilityScore(currentLoad, capacity, sessionState, profile);
    
    // Determine alert level
    const alertLevel = this.determineAlertLevel(utilizationRate, sustainabilityScore);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(
      currentLoad, capacity, utilizationRate, sustainabilityScore, sessionState
    );

    return {
      currentLoad,
      capacity,
      utilizationRate,
      fatigueLevel: sessionState.sessionFatigueIndex,
      attentionRemainingMinutes,
      recommendedDifficultyAdjustment: difficultyAdjustment,
      sustainabilityScore,
      alertLevel,
      recommendations
    };
  }

  /**
   * Analyze individual load factors
   */
  private analyzeLoadFactors(
    responseHistory: EnhancedResponseLog[], 
    sessionState: UnifiedSessionState
  ): LoadFactors {
    return {
      timeBasedFatigue: this.calculateTimeBasedFatigue(sessionState),
      responseTimeVariance: this.calculateResponseTimeVariance(responseHistory),
      errorRate: this.calculateErrorRate(responseHistory),
      difficultyAccumulation: this.calculateDifficultyAccumulation(responseHistory),
      environmentalStress: this.calculateEnvironmentalStress(responseHistory),
      contextualDemand: this.calculateContextualDemand(sessionState)
    };
  }

  /**
   * Calculate time-based cognitive fatigue
   */
  private calculateTimeBasedFatigue(sessionState: UnifiedSessionState): number {
    const sessionDurationMinutes = this.getSessionDuration(sessionState.sessionStartTime);
    
    // Exponential decay model based on research
    const fatigue = 1 - Math.exp(-sessionDurationMinutes / this.FATIGUE_HALF_LIFE_MINUTES);
    
    return Math.min(1.0, fatigue);
  }

  /**
   * Calculate response time variance as indicator of mental effort
   */
  private calculateResponseTimeVariance(responseHistory: EnhancedResponseLog[]): number {
    if (responseHistory.length < 3) return 0;
    
    const recentResponses = responseHistory.slice(-10); // Last 10 responses
    const responseTimes = recentResponses.map(r => r.responseTime);
    
    if (responseTimes.length < 2) return 0;
    
    // Calculate coefficient of variation (normalized variance)
    const mean = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const variance = responseTimes.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / responseTimes.length;
    const standardDeviation = Math.sqrt(variance);
    
    const coefficientOfVariation = mean > 0 ? standardDeviation / mean : 0;
    
    // Normalize to 0-1 scale
    return Math.min(1.0, coefficientOfVariation / 0.5); // CV > 0.5 = high variance
  }

  /**
   * Calculate error rate impact on cognitive load
   */
  private calculateErrorRate(responseHistory: EnhancedResponseLog[]): number {
    if (responseHistory.length === 0) return 0;
    
    const recentResponses = responseHistory.slice(-10);
    const errorCount = recentResponses.filter(r => r.rating === 'again').length;
    const errorRate = errorCount / recentResponses.length;
    
    // Exponential penalty for high error rates
    return Math.min(1.0, Math.pow(errorRate * 2, 2));
  }

  /**
   * Calculate difficulty accumulation effect
   */
  private calculateDifficultyAccumulation(responseHistory: EnhancedResponseLog[]): number {
    if (responseHistory.length < 3) return 0;
    
    const recentResponses = responseHistory.slice(-5);
    
    // Estimate difficulty from response patterns
    let totalDifficulty = 0;
    let count = 0;
    
    for (const response of recentResponses) {
      // Estimate difficulty from response time and rating
      let estimatedDifficulty = 5; // Default middle difficulty
      
      if (response.rating === 'again') {
        estimatedDifficulty = 8;
      } else if (response.rating === 'hard') {
        estimatedDifficulty = 6.5;
      } else if (response.rating === 'good') {
        estimatedDifficulty = 4;
      } else if (response.rating === 'easy') {
        estimatedDifficulty = 2;
      }
      
      // Adjust based on response time
      if (response.responseTime > 15000) { // > 15 seconds
        estimatedDifficulty += 1;
      } else if (response.responseTime < 2000) { // < 2 seconds
        estimatedDifficulty -= 1;
      }
      
      totalDifficulty += estimatedDifficulty;
      count++;
    }
    
    const averageDifficulty = count > 0 ? totalDifficulty / count : 5;
    
    // Convert to load factor (higher difficulty = higher load)
    return Math.max(0, (averageDifficulty - this.DIFFICULTY_FATIGUE_THRESHOLD) / 4);
  }

  /**
   * Calculate environmental stress factors
   */
  private calculateEnvironmentalStress(responseHistory: EnhancedResponseLog[]): number {
    if (responseHistory.length === 0) return 0;
    
    const latestResponse = responseHistory[responseHistory.length - 1];
    const envFactors = latestResponse.contextualFactors.environmentalFactors;
    
    if (!envFactors) return 0;
    
    let stress = 0;
    
    // Network quality stress
    switch (envFactors.networkQuality) {
      case 'poor':
        stress += 0.3;
        break;
      case 'offline':
        stress += 0.5;
        break;
    }
    
    // Device-related stress
    if (envFactors.device === 'mobile') {
      stress += 0.1; // Slightly more stressful on mobile
      
      if (envFactors.batteryLevel && envFactors.batteryLevel < 0.2) {
        stress += 0.2; // Low battery stress
      }
    }
    
    // Environmental conditions
    if (envFactors.ambientNoise === 'noisy') {
      stress += 0.15;
    }
    
    if (envFactors.lighting === 'dim' || envFactors.lighting === 'bright') {
      stress += 0.1; // Non-optimal lighting
    }
    
    return Math.min(1.0, stress);
  }

  /**
   * Calculate contextual demand from session state
   */
  private calculateContextualDemand(sessionState: UnifiedSessionState): number {
    let demand = 0;
    
    // Time of day factor
    const hour = new Date().getHours();
    if (hour < 8 || hour > 22) {
      demand += 0.2; // Early morning or late night
    } else if (hour >= 13 && hour <= 15) {
      demand += 0.1; // Post-lunch dip
    }
    
    // Session position factor
    const sessionDurationMinutes = this.getSessionDuration(sessionState.sessionStartTime);
    if (sessionDurationMinutes > 60) {
      demand += Math.min(0.3, (sessionDurationMinutes - 60) / 60); // Increasing demand after 1 hour
    }
    
    // Momentum-based demand
    if (sessionState.momentumTrend === 'declining') {
      demand += 0.15; // More demanding to recover from declining momentum
    }
    
    return Math.min(1.0, demand);
  }

  /**
   * Compute overall cognitive load from factors
   */
  private computeOverallLoad(loadFactors: LoadFactors, profile: CognitiveLoadProfile): number {
    // Weighted combination of load factors
    const weights = {
      timeBasedFatigue: 0.25,
      responseTimeVariance: 0.20,
      errorRate: 0.20,
      difficultyAccumulation: 0.15,
      environmentalStress: 0.10,
      contextualDemand: 0.10
    };
    
    let totalLoad = 0;
    totalLoad += loadFactors.timeBasedFatigue * weights.timeBasedFatigue;
    totalLoad += loadFactors.responseTimeVariance * weights.responseTimeVariance;
    totalLoad += loadFactors.errorRate * weights.errorRate;
    totalLoad += loadFactors.difficultyAccumulation * weights.difficultyAccumulation;
    totalLoad += loadFactors.environmentalStress * weights.environmentalStress;
    totalLoad += loadFactors.contextualDemand * weights.contextualDemand;
    
    // Apply personal load sensitivity
    totalLoad *= (2 - profile.baseCapacity); // Lower capacity = higher sensitivity to load
    
    return Math.min(1.0, totalLoad);
  }

  /**
   * Calculate available cognitive capacity
   */
  private calculateAvailableCapacity(sessionState: UnifiedSessionState, profile: CognitiveLoadProfile): number {
    let capacity = profile.baseCapacity;
    
    // Reduce capacity based on session fatigue
    capacity -= sessionState.sessionFatigueIndex * 0.4;
    
    // Reduce capacity based on attention span depletion
    capacity *= sessionState.attentionSpanRemaining;
    
    // Time-of-day adjustment
    const hour = new Date().getHours();
    const timeOfDayMultiplier = this.getTimeOfDayCapacityMultiplier(hour);
    capacity *= timeOfDayMultiplier;
    
    // Ensure minimum capacity
    return Math.max(0.1, capacity);
  }

  /**
   * Get time-of-day capacity multiplier based on circadian rhythms
   */
  private getTimeOfDayCapacityMultiplier(hour: number): number {
    // Based on research on cognitive performance throughout the day
    const hourMultipliers: { [key: number]: number } = {
      0: 0.4, 1: 0.3, 2: 0.3, 3: 0.3, 4: 0.4, 5: 0.5,
      6: 0.7, 7: 0.8, 8: 0.9, 9: 1.0, 10: 1.0, 11: 0.95,
      12: 0.9, 13: 0.8, 14: 0.75, 15: 0.8, 16: 0.9, 17: 0.9,
      18: 0.8, 19: 0.75, 20: 0.7, 21: 0.6, 22: 0.5, 23: 0.4
    };
    
    return hourMultipliers[hour] || 0.7;
  }

  /**
   * Predict remaining attention span
   */
  predictRemainingAttention(sessionState: UnifiedSessionState, profile: CognitiveLoadProfile): number {
    const sessionDurationMinutes = this.getSessionDuration(sessionState.sessionStartTime);
    const baseAttentionSpan = profile.attentionSpanMinutes;
    
    // Calculate expected remaining attention using exponential decay
    const decayRate = profile.fatigueRate;
    const remainingRatio = Math.exp(-sessionDurationMinutes * decayRate);
    const baseRemaining = baseAttentionSpan * remainingRatio;
    
    // Adjust based on current fatigue and momentum
    let adjustedRemaining = baseRemaining * (1 - sessionState.sessionFatigueIndex);
    
    // Momentum can extend or reduce attention span
    if (sessionState.sessionMomentumScore > 0.7) {
      adjustedRemaining *= 1.2; // Flow state extends attention
    } else if (sessionState.sessionMomentumScore < 0.4) {
      adjustedRemaining *= 0.8; // Low momentum reduces attention
    }
    
    return Math.max(0, adjustedRemaining);
  }

  /**
   * Calculate recommended difficulty adjustment
   */
  private calculateDifficultyAdjustment(
    currentLoad: number, 
    capacity: number, 
    profile: CognitiveLoadProfile
  ): number {
    const utilizationRate = capacity > 0 ? currentLoad / capacity : 1.0;
    const optimalRange = profile.optimalLoadRange;
    
    if (utilizationRate < optimalRange[0]) {
      // Under-utilizing capacity, can increase difficulty
      const underUtilization = optimalRange[0] - utilizationRate;
      return Math.min(2.0, underUtilization * 4); // Max +2 difficulty points
    } else if (utilizationRate > optimalRange[1]) {
      // Over-utilizing capacity, should decrease difficulty
      const overUtilization = utilizationRate - optimalRange[1];
      return Math.max(-3.0, -overUtilization * 5); // Max -3 difficulty points
    }
    
    return 0; // No adjustment needed
  }

  /**
   * Adjust difficulty for cognitive load
   */
  adjustDifficultyForCognitiveLoad(baseDifficulty: number, cognitiveLoad: number): number {
    // More aggressive adjustment than simple linear reduction
    let adjustedDifficulty = baseDifficulty;
    
    if (cognitiveLoad > 0.8) {
      // High load: significant reduction
      adjustedDifficulty -= 2.0;
    } else if (cognitiveLoad > 0.6) {
      // Moderate-high load: moderate reduction
      adjustedDifficulty -= 1.0;
    } else if (cognitiveLoad < 0.3) {
      // Low load: slight increase
      adjustedDifficulty += 0.5;
    }
    
    return Math.max(1, Math.min(10, adjustedDifficulty));
  }

  /**
   * Calculate sustainability score
   */
  private calculateSustainabilityScore(
    currentLoad: number,
    capacity: number,
    sessionState: UnifiedSessionState,
    profile: CognitiveLoadProfile
  ): number {
    let sustainability = 1.0;
    
    // Penalize high utilization rates
    const utilizationRate = capacity > 0 ? currentLoad / capacity : 1.0;
    if (utilizationRate > profile.stressThreshold) {
      sustainability -= (utilizationRate - profile.stressThreshold) * 2;
    }
    
    // Consider remaining attention span
    sustainability *= sessionState.attentionSpanRemaining;
    
    // Consider momentum trend
    if (sessionState.momentumTrend === 'declining') {
      sustainability *= 0.8;
    } else if (sessionState.momentumTrend === 'improving') {
      sustainability *= 1.1;
    }
    
    // Time-based sustainability (longer sessions are less sustainable)
    const sessionDurationMinutes = this.getSessionDuration(sessionState.sessionStartTime);
    if (sessionDurationMinutes > 45) {
      const overtimeFactor = Math.max(0.3, 1 - ((sessionDurationMinutes - 45) / 60));
      sustainability *= overtimeFactor;
    }
    
    return Math.max(0, Math.min(1, sustainability));
  }

  /**
   * Determine alert level based on metrics
   */
  private determineAlertLevel(
    utilizationRate: number, 
    sustainabilityScore: number
  ): 'green' | 'yellow' | 'orange' | 'red' {
    if (utilizationRate > 1.2 || sustainabilityScore < 0.2) {
      return 'red'; // Critical - immediate action needed
    } else if (utilizationRate > 0.9 || sustainabilityScore < 0.4) {
      return 'orange'; // Warning - attention needed
    } else if (utilizationRate > 0.7 || sustainabilityScore < 0.6) {
      return 'yellow'; // Caution - monitor closely
    } else {
      return 'green'; // Good - optimal range
    }
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    currentLoad: number,
    capacity: number,
    utilizationRate: number,
    sustainabilityScore: number,
    sessionState: UnifiedSessionState
  ): string[] {
    const recommendations: string[] = [];
    
    // High utilization recommendations
    if (utilizationRate > 1.0) {
      recommendations.push('Reduce card difficulty to lower cognitive demand');
      recommendations.push('Take a short break to restore cognitive capacity');
    } else if (utilizationRate > 0.8) {
      recommendations.push('Consider easier cards to maintain sustainable learning');
    }
    
    // Low sustainability recommendations
    if (sustainabilityScore < 0.3) {
      recommendations.push('Session approaching limits - consider ending soon');
      recommendations.push('Switch to review of well-known cards only');
    } else if (sustainabilityScore < 0.5) {
      recommendations.push('Monitor fatigue levels closely');
      recommendations.push('Avoid introducing new difficult concepts');
    }
    
    // Fatigue-specific recommendations
    if (sessionState.sessionFatigueIndex > 0.8) {
      recommendations.push('High fatigue detected - take a 5-10 minute break');
    } else if (sessionState.sessionFatigueIndex > 0.6) {
      recommendations.push('Consider lighter review material');
    }
    
    // Attention span recommendations
    if (sessionState.attentionSpanRemaining < 0.3) {
      recommendations.push('Attention span low - consider ending session');
    }
    
    // Positive recommendations for good states
    if (utilizationRate >= 0.3 && utilizationRate <= 0.7 && sustainabilityScore > 0.7) {
      recommendations.push('Cognitive load optimal - maintain current difficulty');
    }
    
    // Low utilization recommendations
    if (utilizationRate < 0.3 && sustainabilityScore > 0.7) {
      recommendations.push('Cognitive capacity available - can increase challenge');
    }
    
    return recommendations;
  }

  /**
   * Get user's cognitive profile (with defaults)
   */
  private getUserCognitiveProfile(userProfile?: UserProfile): CognitiveLoadProfile {
    if (!userProfile?.cognitiveLoadProfile) {
      return this.defaultProfile;
    }
    
    return {
      ...this.defaultProfile,
      ...userProfile.cognitiveLoadProfile
    };
  }

  /**
   * Helper to get session duration in minutes
   */
  private getSessionDuration(sessionStartTime: string): number {
    return (Date.now() - new Date(sessionStartTime).getTime()) / (1000 * 60);
  }
}