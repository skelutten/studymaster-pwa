import { UnifiedCard } from '../../../shared/types/enhanced-types';
import { PocketBaseService } from './pocketbaseService';
export declare class DataMigrationService {
    private pb;
    constructor(pocketbaseService: PocketBaseService);
    migrateExistingCards(): Promise<void>;
    private hasEnhancedFields;
    private migrateCard;
    private calculateInitialDSRFromHistory;
    private getDefaultFSRSParameters;
    private convertReviewHistoryToEnhanced;
    private convertRatingToFSRS;
    private calculateAverageResponseTime;
    private determineInitialConfidenceLevel;
    private createDefaultContextualDifficulty;
    private getCardReviewHistory;
    validateCardData(card: UnifiedCard): Promise<boolean>;
    backfillPerformanceHistory(): Promise<void>;
    runFullMigration(): Promise<void>;
    private validateMigratedData;
}
interface PocketBaseService {
    collection(name: string): {
        getFullList(options?: any): Promise<any[]>;
        update(id: string, data: any): Promise<any>;
        create(data: any): Promise<any>;
    };
}
export {};
//# sourceMappingURL=dataMigrationService.d.ts.map