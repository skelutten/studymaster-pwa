import { UnifiedCard, UnifiedSessionState, CardSelectionResult } from '../../../../shared/types/enhanced-types';
export interface SelectionStrategy {
    name: string;
    condition: (session: UnifiedSessionState) => boolean;
    select: (cards: UnifiedCard[], session: UnifiedSessionState) => CardSelectionResult;
    priority: number;
}
export interface ClusteringConfig {
    conceptSimilarityThreshold: number;
    contentSimilarityThreshold: number;
    timeBasedClusteringWindowMs: number;
    maxRecentCards: number;
}
export declare class UnifiedCardSelector {
    private readonly clusteringConfig;
    private readonly selectionStrategies;
    selectNextOptimalCard(session: UnifiedSessionState, availableCards: UnifiedCard[]): CardSelectionResult;
    private selectWithStrategy;
    private preventCardClustering;
    private applyCognitiveLoadFilter;
    private calculateMaxAllowableCognitiveLoad;
    private estimateCardCognitiveLoad;
    private selectConfidenceBooster;
    private calculateConfidenceBoosterScore;
    private selectOptimalChallenge;
    private calculateChallengeScore;
    private maintainOptimalFlow;
    private calculateFlowMaintenanceScore;
    private selectEngagementCard;
    private selectEasiestCard;
    private selectBalancedCard;
    private calculateBalancedScore;
    private calculateContentSimilarity;
    private estimateContentComplexity;
    private isCardInteresting;
    private calculateEngagementScore;
    private calculateConsistency;
    private ratingToNumber;
    private calculateAverageRating;
}
//# sourceMappingURL=unifiedCardSelector.d.ts.map