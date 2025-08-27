import { UnifiedCard, EnhancedResponseLog, DSRUpdate, UserProfile } from '../../../../shared/types/enhanced-types';
export declare class UnifiedFSRSEngine {
    private defaultParameters;
    calculateEnhancedDSR(card: UnifiedCard, response: EnhancedResponseLog, userProfile: UserProfile): DSRUpdate;
    private calculateContextualDifficulty;
    private ratingToDifficulty;
    private calculateStabilityWithContext;
    private calculateBaseFSRSStability;
    private calculateRetrievabilityWithLoad;
    private getTimeOfDayDifficultyModifier;
    private getEnvironmentalDifficultyModifier;
    private getEnvironmentalStabilityModifier;
    private getResponseTimeDifficultyModifier;
    private getConsistencyModifier;
    private getPerformanceTrendAdjustment;
    private ratingToNumber;
    private calculateVariance;
    private calculateTrend;
    calculateOptimalInterval(card: UnifiedCard, targetRetention?: number): number;
    private getContextualIntervalModifier;
    private getCognitiveLoadModifier;
    private getStabilityTrendModifier;
    private calculateUpdateConfidence;
    private generateDSRExplanation;
}
//# sourceMappingURL=unifiedFSRSEngine.d.ts.map