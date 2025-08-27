export interface EnvironmentalContext {
    device: 'mobile' | 'desktop' | 'tablet';
    networkQuality: 'excellent' | 'good' | 'poor' | 'offline';
    batteryLevel?: number;
    ambientNoise?: 'quiet' | 'moderate' | 'noisy';
    lighting?: 'optimal' | 'dim' | 'bright';
}
export interface ContextualDifficultyMap {
    timeOfDay: Record<string, number>;
    dayOfWeek: Record<string, number>;
    sessionPosition: Record<string, number>;
    cognitiveLoad: Record<string, number>;
}
export interface SessionContext {
    timeOfDay: string;
    dayOfWeek: string;
    sessionDuration: number;
    studyStreak: number;
    environmentalFactors: EnvironmentalContext;
    lastSessionQuality: number;
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
    confidence: number;
    userVisible: boolean;
}
export interface UserProfile {
    id: string;
    fsrsParameters?: number[];
    averageSessionLength?: number;
    attentionDecayRate?: number;
    optimalStudyTimes?: string[];
    cognitiveLoadProfile?: {
        baseCapacity: number;
        fatigueRate: number;
        recoveryRate: number;
    };
}
export interface UnifiedCard {
    id: string;
    deckId: string;
    frontContent: string;
    backContent: string;
    cardType: any;
    mediaRefs: any[];
    easeFactor: number;
    intervalDays: number;
    nextReview: string;
    createdAt: string;
    reviewCount: number;
    lapseCount: number;
    lastReviewed: string;
    difficulty: number;
    stability: number;
    retrievability: number;
    fsrsParameters: number[];
    performanceHistory: EnhancedResponseLog[];
    averageResponseTime: number;
    cognitiveLoadIndex: number;
    confidenceLevel: 'building' | 'optimal' | 'struggling';
    conceptSimilarity: string[];
    lastClusterReview: string;
    contextualDifficulty: ContextualDifficultyMap;
    stabilityTrend: 'increasing' | 'decreasing' | 'stable';
    retrievabilityHistory: number[];
    optimalInterval: number;
}
export interface EnhancedResponseLog {
    timestamp: string;
    rating: 'again' | 'hard' | 'good' | 'easy';
    responseTime: number;
    contextualFactors: {
        sessionTime: number;
        timeOfDay: string;
        sessionFatigueIndex: number;
        cognitiveLoadAtTime: number;
        environmentalFactors?: EnvironmentalContext;
    };
    momentumImpact: number;
    confidenceChange: number;
    previousCardSimilarity: number;
    clusteringContext: string;
}
export interface FlowStateMetrics {
    challengeSkillBalance: number;
    engagementLevel: number;
    satisfactionPrediction: number;
    momentumMaintenance: boolean;
}
export interface UnifiedSessionState {
    userId: string;
    sessionId: string;
    sessionMomentumScore: number;
    momentumTrend: 'improving' | 'declining' | 'stable';
    sessionFatigueIndex: number;
    cognitiveLoadCapacity: number;
    attentionSpanRemaining: number;
    reviewQueue: string[];
    lookaheadBuffer: UnifiedCard[];
    emergencyBuffer: UnifiedCard[];
    challengeReserve: UnifiedCard[];
    sessionStartTime: string;
    contextualFactors: SessionContext;
    adaptationHistory: AdaptationLog[];
    explanationLog: ExplanationEvent[];
    flowStateMetrics: FlowStateMetrics;
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
export interface SessionMetrics {
    sessionId: string;
    userId: string;
    duration: number;
    cardsReviewed: number;
    averageMomentum: number;
    finalFatigueIndex: number;
    flowStateTime: number;
    adaptationAccuracy: number;
    userSatisfaction: number;
    completionReason: 'user_ended' | 'time_limit' | 'fatigue_limit' | 'goal_reached';
}
export interface DailyLearningReport {
    date: string;
    totalStudyTime: number;
    cardsReviewed: number;
    averageAccuracy: number;
    momentumTrend: 'improving' | 'declining' | 'stable';
    optimalStudyTimes: string[];
    improvementAreas: string[];
    achievements: string[];
}
export interface ABTestEvent {
    testName: string;
    variant: 'control' | 'treatment';
    eventType: string;
    value: number;
    sessionId: string;
}
export interface TestMetrics {
    values: number[];
    mean: number;
    variance: number;
    sampleSize: number;
}
export interface ABTestResults {
    testName: string;
    control: TestMetrics;
    treatment: TestMetrics;
    significance: number;
    recommendation: string;
}
export interface CacheItem<T> {
    value: T;
    expiry: number;
}
export interface CacheConfig {
    ttl: number;
    maxSize: number;
}
//# sourceMappingURL=enhanced-types.d.ts.map