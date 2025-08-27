import { UnifiedCard, DSRUpdate } from '../../../shared/types/enhanced-types';
import { OptimizedQueries } from './database/optimizedQueries';

export class UAMSMigrationService {
  private queries: OptimizedQueries;

  constructor(dbService: any) {
    this.queries = new OptimizedQueries(dbService);
  }

  async migrateUser(userId: string): Promise<void> {
    const cards = await this.queries.getCardsForReview(userId, 1000); // Get all cards for user

    const updates = cards.map(card => {
      const dsr = this.calculateInitialDSR(card);
      return { id: card.id, dsr };
    });

    await this.queries.updateCardDSRBatch(updates);
  }

  private calculateInitialDSR(card: UnifiedCard): DSRUpdate {
    // This is a simplified initial DSR calculation.
    // A more sophisticated approach would analyze the card's review history.
    const difficulty = card.easeFactor ? Math.round((1 / card.easeFactor) * 10) : 5;
    const stability = card.intervalDays || 1;
    const retrievability = card.reviewCount > 0 ? Math.pow(1 - (1 / stability), card.reviewCount) : 0.9;

    return {
      difficulty,
      stability,
      retrievability,
      confidence: 0.5, // Default confidence for migrated cards
      explanation: "Migrated from UAMS system with calculated DSR values"
    };
  }
}
