import { UnifiedSessionState, EnhancedResponseLog, FlowStateMetrics } from '../../../../shared/types/enhanced-types';
export interface MomentumAnalysis {
    currentMomentum: number;
    trend: 'improving' | 'declining' | 'stable';
    sustainabilityScore: number;
    recommendedAction: 'maintain' | 'boost' | 'ease' | 'break';
    reasoning: string;
}
export interface FlowStateAnalysis {
    isInFlowState: boolean;
    flowScore: number;
    challengeLevel: number;
    skillLevel: number;
    recommendations: FlowRecommendation[];
}
export interface FlowRecommendation {
    type: 'increase_challenge' | 'decrease_challenge' | 'maintain' | 'take_break';
    reasoning: string;
    confidence: number;
}
export declare class UnifiedMomentumManager {
    private readonly MOMENTUM_ALPHA;
    private readonly PERFORMANCE_ALPHA;
    private readonly FATIGUE_THRESHOLDS;
    private readonly FLOW_STATE_THRESHOLDS;
    updateSessionMomentum(currentState: UnifiedSessionState, response: EnhancedResponseLog): UnifiedSessionState;
    private getPerformanceValue;
    private getFatigueAdjustment;
    private getContextualModifier;
    private getResponseTimeModifier;
    private updateFatigueIndex;
    private getEnvironmentalFatigue;
    private updateCognitiveLoadCapacity;
    private calculateMomentumTrend;
    private calculateAttentionSpan;
    calculateFlowStateMetrics(state: UnifiedSessionState): FlowStateMetrics;
    private calculateChallengeSkillRatio;
    private calculateEngagementLevel;
    private predictSessionSatisfaction;
    analyzeMomentum(state: UnifiedSessionState): MomentumAnalysis;
    private calculateSustainabilityScore;
    analyzeFlowState(state: UnifiedSessionState): FlowStateAnalysis;
    private calculateFlowScore;
    private generateFlowRecommendations;
}
//# sourceMappingURL=unifiedMomentumManager.d.ts.map