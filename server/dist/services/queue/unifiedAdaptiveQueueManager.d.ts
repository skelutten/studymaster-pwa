import { UnifiedSessionState, UnifiedCard, EnvironmentalContext } from '../../../../shared/types/enhanced-types';
export interface QueueGenerationResult {
    reviewQueue: UnifiedCard[];
    lookaheadBuffer: UnifiedCard[];
    emergencyBuffer: UnifiedCard[];
    challengeReserve: UnifiedCard[];
    adaptationLog: string[];
}
export declare class UnifiedAdaptiveQueueManager {
    private cardSelector;
    constructor();
    generateAdaptiveQueue(sessionState: UnifiedSessionState, availableCards: UnifiedCard[], environmentalContext: EnvironmentalContext): Promise<QueueGenerationResult>;
    private selectEmergencyCards;
    private selectChallengeCards;
    adjustQueueDynamically(currentQueue: UnifiedCard[], sessionState: UnifiedSessionState, recentPerformance: number[]): Promise<UnifiedCard[]>;
    calculateQueueEfficiency(queueResult: QueueGenerationResult, sessionState: UnifiedSessionState): {
        diversityScore: number;
        difficultyBalance: number;
        momentumAlignment: number;
    };
    private calculateTargetDifficulty;
    private calculateMomentumAlignment;
    optimizeQueueOrdering(cards: UnifiedCard[], sessionState: UnifiedSessionState): UnifiedCard[];
    private calculateUrgency;
}
//# sourceMappingURL=unifiedAdaptiveQueueManager.d.ts.map