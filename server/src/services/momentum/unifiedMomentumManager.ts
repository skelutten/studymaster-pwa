import { UnifiedSessionState, EnhancedResponseLog, FlowStateMetrics, SessionContext } from '../../../../shared/types/enhanced-types';

export interface MomentumAnalysis {
  currentMomentum: number;
  trend: 'improving' | 'declining' | 'stable';
  sustainabilityScore: number; // How sustainable is the current momentum
  recommendedAction: 'maintain' | 'boost' | 'ease' | 'break';
  reasoning: string;
}

export interface FlowStateAnalysis {
  isInFlowState: boolean;
  flowScore: number; // 0-1 indicating how close to optimal flow state
  challengeLevel: number; // Current challenge level
  skillLevel: number; // Estimated skill level
  recommendations: FlowRecommendation[];
}

export interface FlowRecommendation {
  type: 'increase_challenge' | 'decrease_challenge' | 'maintain' | 'take_break';
  reasoning: string;
  confidence: number;
}

export class UnifiedMomentumManager {
  private readonly MOMENTUM_ALPHA = 0.65; // Weight for previous momentum
  private readonly PERFORMANCE_ALPHA = 0.35; // Weight for current performance
  
  private readonly FATIGUE_THRESHOLDS = {
    LOW: 0.3,
    MODERATE: 0.6,
    HIGH: 0.8,
    CRITICAL: 0.9
  };

  private readonly FLOW_STATE_THRESHOLDS = {
    OPTIMAL_MIN: 0.4,
    OPTIMAL_MAX: 0.8,
    CHALLENGE_SKILL_RATIO_OPTIMAL: [0.7, 1.3] // Optimal challenge-to-skill ratio
  };

  /**
   * Update session momentum based on latest response
   */
  updateSessionMomentum(
    currentState: UnifiedSessionState,
    response: EnhancedResponseLog
  ): UnifiedSessionState {
    // Calculate new momentum score
    const performanceValue = this.getPerformanceValue(response.rating);
    const fatigueAdjustment = this.getFatigueAdjustment(currentState.sessionFatigueIndex);
    const contextualModifier = this.getContextualModifier(response.contextualFactors);
    const responseTimeModifier = this.getResponseTimeModifier(response.responseTime);
    
    // Enhanced momentum calculation (proven Gemini approach with improvements)
    const rawMomentumScore = (currentState.sessionMomentumScore * this.MOMENTUM_ALPHA) + 
                            (performanceValue * this.PERFORMANCE_ALPHA) + 
                            fatigueAdjustment + 
                            contextualModifier +
                            responseTimeModifier;
    
    const newMomentumScore = Math.max(0, Math.min(1, rawMomentumScore));
    
    // Update fatigue index using enhanced calculation
    const newFatigueIndex = this.updateFatigueIndex(currentState, response);
    
    // Update cognitive load capacity
    const newCognitiveCapacity = this.updateCognitiveLoadCapacity(currentState, response);
    
    // Calculate momentum trend
    const momentumTrend = this.calculateMomentumTrend(currentState, newMomentumScore);
    
    // Update attention span
    const attentionSpanRemaining = this.calculateAttentionSpan(currentState, response);
    
    // Update flow state metrics
    const flowStateMetrics = this.calculateFlowStateMetrics({
      ...currentState,
      sessionMomentumScore: newMomentumScore,
      sessionFatigueIndex: newFatigueIndex,
      cognitiveLoadCapacity: newCognitiveCapacity
    });

    return {
      ...currentState,
      sessionMomentumScore: newMomentumScore,
      sessionFatigueIndex: newFatigueIndex,
      cognitiveLoadCapacity: newCognitiveCapacity,
      momentumTrend: momentumTrend,
      attentionSpanRemaining: attentionSpanRemaining,
      flowStateMetrics: flowStateMetrics
    };
  }

  /**
   * Get performance value from rating (Gemini's proven approach)
   */
  private getPerformanceValue(rating: 'again' | 'hard' | 'good' | 'easy'): number {
    const baseValues = { 
      'again': 0.0,   // Complete failure
      'hard': 0.25,   // Struggled but succeeded
      'good': 0.75,   // Standard success
      'easy': 1.0     // Effortless success
    };
    return baseValues[rating] || 0.5;
  }

  /**
   * Calculate fatigue adjustment to momentum
   */
  private getFatigueAdjustment(fatigueIndex: number): number {
    // Fatigue negatively impacts momentum
    if (fatigueIndex > this.FATIGUE_THRESHOLDS.CRITICAL) {
      return -0.3; // Severe penalty for critical fatigue
    } else if (fatigueIndex > this.FATIGUE_THRESHOLDS.HIGH) {
      return -0.2;
    } else if (fatigueIndex > this.FATIGUE_THRESHOLDS.MODERATE) {
      return -0.1;
    } else if (fatigueIndex > this.FATIGUE_THRESHOLDS.LOW) {
      return -0.05;
    }
    return 0; // No adjustment for low fatigue
  }

  /**
   * Get contextual modifier based on environmental factors
   */
  private getContextualModifier(contextualFactors: any): number {
    let modifier = 0;
    
    // Time of day impact
    const hour = new Date(contextualFactors.timeOfDay).getHours();
    if (hour >= 8 && hour <= 10) {
      modifier += 0.05; // Morning peak
    } else if (hour >= 16 && hour <= 18) {
      modifier += 0.03; // Afternoon peak
    } else if (hour >= 22 || hour <= 6) {
      modifier -= 0.1; // Late night/early morning penalty
    }
    
    // Cognitive load impact
    if (contextualFactors.cognitiveLoadAtTime > 0.8) {
      modifier -= 0.05; // High cognitive load reduces momentum
    } else if (contextualFactors.cognitiveLoadAtTime < 0.3) {
      modifier -= 0.03; // Very low cognitive engagement also reduces momentum
    }
    
    // Environmental factors
    if (contextualFactors.environmentalFactors) {
      const env = contextualFactors.environmentalFactors;
      
      if (env.networkQuality === 'poor' || env.networkQuality === 'offline') {
        modifier -= 0.05; // Network issues reduce momentum
      }
      
      if (env.device === 'mobile' && env.batteryLevel && env.batteryLevel < 0.2) {
        modifier -= 0.03; // Low battery on mobile reduces momentum
      }
      
      if (env.ambientNoise === 'noisy') {
        modifier -= 0.02; // Noisy environment reduces momentum
      }
    }
    
    return modifier;
  }

  /**
   * Get response time modifier
   */
  private getResponseTimeModifier(responseTime: number): number {
    // Optimal response time range: 2-8 seconds
    if (responseTime < 1000) {
      return -0.05; // Too fast, might indicate guessing
    } else if (responseTime > 20000) {
      return -0.1; // Too slow, indicates struggle
    } else if (responseTime >= 2000 && responseTime <= 8000) {
      return 0.02; // Optimal response time bonus
    }
    return 0;
  }

  /**
   * Update fatigue index (ChatGPT's fatigue modeling approach with enhancements)
   */
  private updateFatigueIndex(
    currentState: UnifiedSessionState, 
    response: EnhancedResponseLog
  ): number {
    const sessionDuration = (Date.now() - new Date(currentState.sessionStartTime).getTime()) / (1000 * 60);
    
    // Base time-based fatigue (exponential increase)
    const baseFatigue = Math.min(1, sessionDuration / 60); // 1 hour = full fatigue
    
    // Response time based fatigue
    const responseTimeFatigue = response.responseTime > 10000 ? 0.05 : 0; // >10s indicates fatigue
    
    // Performance-based fatigue (failures are more tiring)
    const performanceFatigue = response.rating === 'again' ? 0.08 : 
                              response.rating === 'hard' ? 0.03 : 0;
    
    // Cognitive load fatigue
    const cognitiveLoadFatigue = (1 - response.contextualFactors.cognitiveLoadAtTime) * 0.02;
    
    // Environmental fatigue
    const environmentalFatigue = this.getEnvironmentalFatigue(response.contextualFactors);
    
    // Apply fatigue with exponential moving average
    const rawFatigueIncrease = responseTimeFatigue + performanceFatigue + cognitiveLoadFatigue + environmentalFatigue;
    const newFatigueIndex = Math.min(1, currentState.sessionFatigueIndex + rawFatigueIncrease);
    
    // Fatigue recovery during good performance (small recovery)
    const fatigueRecovery = response.rating === 'easy' ? 0.01 : 0;
    
    return Math.max(0, newFatigueIndex - fatigueRecovery);
  }

  /**
   * Get environmental fatigue factors
   */
  private getEnvironmentalFatigue(contextualFactors: any): number {
    let fatigue = 0;
    
    const env = contextualFactors.environmentalFactors;
    if (env) {
      // Network issues increase fatigue
      if (env.networkQuality === 'poor') fatigue += 0.02;
      if (env.networkQuality === 'offline') fatigue += 0.05;
      
      // Low battery increases fatigue on mobile
      if (env.device === 'mobile' && env.batteryLevel && env.batteryLevel < 0.3) {
        fatigue += 0.02;
      }
      
      // Poor lighting increases fatigue
      if (env.lighting === 'dim' || env.lighting === 'bright') {
        fatigue += 0.01;
      }
      
      // Noisy environment increases fatigue
      if (env.ambientNoise === 'noisy') {
        fatigue += 0.02;
      }
    }
    
    return fatigue;
  }

  /**
   * Update cognitive load capacity
   */
  private updateCognitiveLoadCapacity(
    currentState: UnifiedSessionState,
    response: EnhancedResponseLog
  ): number {
    const sessionDuration = (Date.now() - new Date(currentState.sessionStartTime).getTime()) / (1000 * 60);
    
    // Base capacity reduction over time (attention span decay)
    const baseDecay = Math.max(0.3, 1 - (sessionDuration / 120)); // 2 hours to reach 30% capacity
    
    // Performance-based capacity adjustment
    const performanceAdjustment = response.rating === 'again' ? -0.05 : 
                                 response.rating === 'easy' ? 0.02 : 0;
    
    // Fatigue impact on cognitive capacity
    const fatigueImpact = -currentState.sessionFatigueIndex * 0.3;
    
    const newCapacity = Math.max(0.1, Math.min(1.0, 
      baseDecay + performanceAdjustment + fatigueImpact
    ));
    
    // Smooth the change using exponential moving average
    const alpha = 0.1;
    return currentState.cognitiveLoadCapacity * (1 - alpha) + newCapacity * alpha;
  }

  /**
   * Calculate momentum trend
   */
  private calculateMomentumTrend(
    currentState: UnifiedSessionState,
    newMomentumScore: number
  ): 'improving' | 'declining' | 'stable' {
    const momentumChange = newMomentumScore - currentState.sessionMomentumScore;
    
    if (momentumChange > 0.05) {
      return 'improving';
    } else if (momentumChange < -0.05) {
      return 'declining';
    } else {
      return 'stable';
    }
  }

  /**
   * Calculate remaining attention span
   */
  private calculateAttentionSpan(
    currentState: UnifiedSessionState,
    response: EnhancedResponseLog
  ): number {
    const sessionDuration = (Date.now() - new Date(currentState.sessionStartTime).getTime()) / (1000 * 60);
    
    // Base attention span decay
    const baseAttentionSpan = Math.max(0, 1 - (sessionDuration / 90)); // 90 minutes base attention span
    
    // Fatigue impact
    const fatigueImpact = 1 - currentState.sessionFatigueIndex * 0.5;
    
    // Performance impact (good performance maintains attention)
    const performanceImpact = response.rating === 'again' ? 0.95 : 
                             response.rating === 'easy' ? 1.02 : 1.0;
    
    return Math.max(0, Math.min(1, baseAttentionSpan * fatigueImpact * performanceImpact));
  }

  /**
   * Calculate comprehensive flow state metrics
   */
  calculateFlowStateMetrics(state: UnifiedSessionState): FlowStateMetrics {
    // Calculate challenge-skill balance
    const challengeSkillBalance = this.calculateChallengeSkillRatio(state);
    
    // Calculate engagement level
    const engagementLevel = this.calculateEngagementLevel(state);
    
    // Predict session satisfaction
    const satisfactionPrediction = this.predictSessionSatisfaction(state);
    
    // Determine if in optimal momentum maintenance zone
    const momentumMaintenance = state.sessionMomentumScore >= this.FLOW_STATE_THRESHOLDS.OPTIMAL_MIN && 
                               state.sessionMomentumScore <= this.FLOW_STATE_THRESHOLDS.OPTIMAL_MAX;

    return {
      challengeSkillBalance,
      engagementLevel,
      satisfactionPrediction,
      momentumMaintenance
    };
  }

  /**
   * Calculate challenge-skill ratio for flow state
   */
  private calculateChallengeSkillRatio(state: UnifiedSessionState): number {
    // Use momentum as proxy for skill level
    const skillLevel = state.sessionMomentumScore;
    
    // Estimate current challenge level from recent adaptations
    let challengeLevel = 0.5; // Default medium challenge
    
    if (state.adaptationHistory.length > 0) {
      const recentAdaptations = state.adaptationHistory.slice(-3);
      const challengeIncreases = recentAdaptations.filter(a => a.reason.includes('challenge')).length;
      const confidenceBoosters = recentAdaptations.filter(a => a.reason.includes('confidence')).length;
      
      challengeLevel = Math.max(0.1, Math.min(0.9, 
        0.5 + (challengeIncreases * 0.1) - (confidenceBoosters * 0.1)
      ));
    }
    
    // Return challenge/skill ratio
    return skillLevel > 0 ? challengeLevel / skillLevel : 0.5;
  }

  /**
   * Calculate engagement level
   */
  private calculateEngagementLevel(state: UnifiedSessionState): number {
    let engagement = 0.5; // Base engagement
    
    // Momentum contribution (high momentum = high engagement)
    engagement += (state.sessionMomentumScore - 0.5) * 0.4;
    
    // Attention span contribution
    engagement += (state.attentionSpanRemaining - 0.5) * 0.3;
    
    // Fatigue penalty
    engagement -= state.sessionFatigueIndex * 0.3;
    
    // Cognitive capacity contribution
    engagement += (state.cognitiveLoadCapacity - 0.5) * 0.2;
    
    return Math.max(0, Math.min(1, engagement));
  }

  /**
   * Predict session satisfaction
   */
  private predictSessionSatisfaction(state: UnifiedSessionState): number {
    let satisfaction = 0.7; // Base satisfaction
    
    // Flow state contribution
    const isInOptimalFlow = state.sessionMomentumScore >= this.FLOW_STATE_THRESHOLDS.OPTIMAL_MIN && 
                           state.sessionMomentumScore <= this.FLOW_STATE_THRESHOLDS.OPTIMAL_MAX;
    
    if (isInOptimalFlow) {
      satisfaction += 0.2;
    }
    
    // Progress feeling (based on adaptation history)
    if (state.adaptationHistory.length > 0) {
      const recentSuccesses = state.adaptationHistory.slice(-5)
        .filter(a => a.reason.includes('optimal') || a.reason.includes('good')).length;
      satisfaction += (recentSuccesses / 5) * 0.1;
    }
    
    // Fatigue penalty
    satisfaction -= state.sessionFatigueIndex * 0.2;
    
    // Session length consideration (too short or too long reduces satisfaction)
    const sessionMinutes = (Date.now() - new Date(state.sessionStartTime).getTime()) / (1000 * 60);
    if (sessionMinutes < 5) {
      satisfaction -= 0.1; // Too short
    } else if (sessionMinutes > 60) {
      satisfaction -= (sessionMinutes - 60) / 120; // Gradually reduce for very long sessions
    }
    
    return Math.max(0, Math.min(1, satisfaction));
  }

  /**
   * Analyze momentum and provide recommendations
   */
  analyzeMomentum(state: UnifiedSessionState): MomentumAnalysis {
    const momentum = state.sessionMomentumScore;
    const fatigue = state.sessionFatigueIndex;
    const trend = state.momentumTrend;
    
    // Calculate sustainability score
    const sustainabilityScore = this.calculateSustainabilityScore(state);
    
    // Determine recommended action
    let recommendedAction: 'maintain' | 'boost' | 'ease' | 'break';
    let reasoning: string;
    
    if (fatigue > this.FATIGUE_THRESHOLDS.CRITICAL) {
      recommendedAction = 'break';
      reasoning = 'Critical fatigue level detected. Take a break to recover.';
    } else if (momentum < 0.3 && trend === 'declining') {
      recommendedAction = 'boost';
      reasoning = 'Low momentum with declining trend. Need confidence boosters.';
    } else if (momentum > 0.8 && fatigue < this.FATIGUE_THRESHOLDS.MODERATE) {
      recommendedAction = 'maintain';
      reasoning = 'High momentum with manageable fatigue. Maintain current level.';
    } else if (momentum > 0.8 && fatigue > this.FATIGUE_THRESHOLDS.MODERATE) {
      recommendedAction = 'ease';
      reasoning = 'High momentum but elevated fatigue. Reduce challenge slightly.';
    } else {
      recommendedAction = 'maintain';
      reasoning = 'Momentum and fatigue levels are balanced.';
    }

    return {
      currentMomentum: momentum,
      trend,
      sustainabilityScore,
      recommendedAction,
      reasoning
    };
  }

  /**
   * Calculate sustainability score (how long can current momentum be maintained)
   */
  private calculateSustainabilityScore(state: UnifiedSessionState): number {
    let sustainability = 0.5; // Base sustainability
    
    // High momentum with low fatigue = highly sustainable
    sustainability += (state.sessionMomentumScore * (1 - state.sessionFatigueIndex)) * 0.4;
    
    // Good cognitive capacity = more sustainable
    sustainability += state.cognitiveLoadCapacity * 0.3;
    
    // Remaining attention span
    sustainability += state.attentionSpanRemaining * 0.2;
    
    // Trend consideration
    if (state.momentumTrend === 'improving') {
      sustainability += 0.1;
    } else if (state.momentumTrend === 'declining') {
      sustainability -= 0.1;
    }
    
    return Math.max(0, Math.min(1, sustainability));
  }

  /**
   * Analyze flow state and provide recommendations
   */
  analyzeFlowState(state: UnifiedSessionState): FlowStateAnalysis {
    const challengeSkillBalance = state.flowStateMetrics.challengeSkillBalance;
    const flowScore = this.calculateFlowScore(state);
    
    const isInFlowState = flowScore > 0.7 && 
                         challengeSkillBalance >= this.FLOW_STATE_THRESHOLDS.CHALLENGE_SKILL_RATIO_OPTIMAL[0] &&
                         challengeSkillBalance <= this.FLOW_STATE_THRESHOLDS.CHALLENGE_SKILL_RATIO_OPTIMAL[1];
    
    const recommendations = this.generateFlowRecommendations(state);

    return {
      isInFlowState,
      flowScore,
      challengeLevel: challengeSkillBalance * state.sessionMomentumScore, // Estimated current challenge
      skillLevel: state.sessionMomentumScore, // Use momentum as skill proxy
      recommendations
    };
  }

  /**
   * Calculate overall flow score
   */
  private calculateFlowScore(state: UnifiedSessionState): number {
    let flowScore = 0;
    
    // Momentum contribution
    flowScore += state.sessionMomentumScore * 0.4;
    
    // Engagement contribution
    flowScore += state.flowStateMetrics.engagementLevel * 0.3;
    
    // Low fatigue contribution
    flowScore += (1 - state.sessionFatigueIndex) * 0.2;
    
    // Attention contribution
    flowScore += state.attentionSpanRemaining * 0.1;
    
    return Math.max(0, Math.min(1, flowScore));
  }

  /**
   * Generate flow state recommendations
   */
  private generateFlowRecommendations(state: UnifiedSessionState): FlowRecommendation[] {
    const recommendations: FlowRecommendation[] = [];
    const challengeSkillRatio = state.flowStateMetrics.challengeSkillBalance;
    
    if (challengeSkillRatio < this.FLOW_STATE_THRESHOLDS.CHALLENGE_SKILL_RATIO_OPTIMAL[0]) {
      recommendations.push({
        type: 'increase_challenge',
        reasoning: 'Challenge level too low for current skill level. Increase difficulty to maintain engagement.',
        confidence: 0.8
      });
    } else if (challengeSkillRatio > this.FLOW_STATE_THRESHOLDS.CHALLENGE_SKILL_RATIO_OPTIMAL[1]) {
      recommendations.push({
        type: 'decrease_challenge',
        reasoning: 'Challenge level too high. Reduce difficulty to prevent anxiety and maintain flow.',
        confidence: 0.8
      });
    }
    
    if (state.sessionFatigueIndex > this.FATIGUE_THRESHOLDS.HIGH) {
      recommendations.push({
        type: 'take_break',
        reasoning: 'High fatigue detected. A short break would help restore cognitive capacity.',
        confidence: 0.9
      });
    }
    
    if (state.sessionMomentumScore >= 0.4 && state.sessionMomentumScore <= 0.8 && state.sessionFatigueIndex < 0.6) {
      recommendations.push({
        type: 'maintain',
        reasoning: 'Currently in optimal flow state. Maintain current approach.',
        confidence: 0.9
      });
    }
    
    return recommendations;
  }
}