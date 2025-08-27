import { UnifiedCard, DSRUpdate } from '../../../../shared/types/enhanced-types';
export declare class OptimizedQueries {
    private db;
    constructor(dbService: any);
    getCardsForReview(userId: string, limit?: number): Promise<UnifiedCard[]>;
    updateCardDSRBatch(updates: Array<{
        id: string;
        dsr: DSRUpdate;
    }>): Promise<void>;
    private calculateNextReviewDays;
}
//# sourceMappingURL=optimizedQueries.d.ts.map