import { EnhancedResponseLog, UnifiedSessionState, UserProfile } from '../../../../shared/types/enhanced-types';
export interface CognitiveLoadProfile {
    baseCapacity: number;
    fatigueRate: number;
    recoveryRate: number;
    attentionSpanMinutes: number;
    optimalLoadRange: [number, number];
    stressThreshold: number;
}
export interface CognitiveLoadAnalysis {
    currentLoad: number;
    capacity: number;
    utilizationRate: number;
    fatigueLevel: number;
    attentionRemainingMinutes: number;
    recommendedDifficultyAdjustment: number;
    sustainabilityScore: number;
    alertLevel: 'green' | 'yellow' | 'orange' | 'red';
    recommendations: string[];
}
export interface LoadFactors {
    timeBasedFatigue: number;
    responseTimeVariance: number;
    errorRate: number;
    difficultyAccumulation: number;
    environmentalStress: number;
    contextualDemand: number;
}
export declare class CognitiveLoadCalculator {
    private readonly FATIGUE_HALF_LIFE_MINUTES;
    private readonly ERROR_FATIGUE_MULTIPLIER;
    private readonly DIFFICULTY_FATIGUE_THRESHOLD;
    private readonly RESPONSE_TIME_VARIANCE_THRESHOLD;
    private defaultProfile;
    calculateCurrentLoad(responseHistory: EnhancedResponseLog[], sessionState: UnifiedSessionState, userProfile?: UserProfile): CognitiveLoadAnalysis;
    private analyzeLoadFactors;
    private calculateTimeBasedFatigue;
    private calculateResponseTimeVariance;
    private calculateErrorRate;
    private calculateDifficultyAccumulation;
    private calculateEnvironmentalStress;
    private calculateContextualDemand;
    private computeOverallLoad;
    private calculateAvailableCapacity;
    private getTimeOfDayCapacityMultiplier;
    predictRemainingAttention(sessionState: UnifiedSessionState, profile: CognitiveLoadProfile): number;
    private calculateDifficultyAdjustment;
    adjustDifficultyForCognitiveLoad(baseDifficulty: number, cognitiveLoad: number): number;
    private calculateSustainabilityScore;
    private determineAlertLevel;
    private generateRecommendations;
    private getUserCognitiveProfile;
    private getSessionDuration;
}
//# sourceMappingURL=cognitiveLoadCalculator.d.ts.map