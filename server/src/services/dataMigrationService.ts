import { UnifiedCard, EnhancedResponseLog, Card, CardReview } from '../../../shared/types/enhanced-types';
import { PocketBaseService } from './pocketbaseService';

export class DataMigrationService {
  private pb: PocketBaseService;

  constructor(pocketbaseService: PocketBaseService) {
    this.pb = pocketbaseService;
  }

  /**
   * Migrate existing cards to UnifiedCard format
   */
  async migrateExistingCards(): Promise<void> {
    console.log('Starting card migration to UnifiedCard format...');
    
    try {
      // Get all existing cards
      const existingCards = await this.pb.collection('cards').getFullList();
      
      let migratedCount = 0;
      
      for (const card of existingCards) {
        if (!this.hasEnhancedFields(card)) {
          const migratedCard = await this.migrateCard(card);
          await this.pb.collection('cards').update(card.id, migratedCard);
          migratedCount++;
          
          if (migratedCount % 100 === 0) {
            console.log(`Migrated ${migratedCount} cards...`);
          }
        }
      }
      
      console.log(`Successfully migrated ${migratedCount} cards to UnifiedCard format`);
    } catch (error) {
      console.error('Error during card migration:', error);
      throw error;
    }
  }

  /**
   * Check if card already has enhanced fields
   */
  private hasEnhancedFields(card: any): boolean {
    return card.difficulty !== undefined && 
           card.stability !== undefined && 
           card.retrievability !== undefined;
  }

  /**
   * Migrate a single card to UnifiedCard format
   */
  private async migrateCard(card: any): Promise<Partial<UnifiedCard>> {
    // Calculate initial DSR values from review history
    const reviewHistory = await this.getCardReviewHistory(card.id);
    const initialDSR = this.calculateInitialDSRFromHistory(reviewHistory, card);
    
    return {
      // FSRS-Enhanced DSR Metrics
      difficulty: initialDSR.difficulty,
      stability: initialDSR.stability,
      retrievability: initialDSR.retrievability,
      fsrsParameters: this.getDefaultFSRSParameters(),
      
      // Momentum & Performance Tracking
      performanceHistory: await this.convertReviewHistoryToEnhanced(reviewHistory),
      averageResponseTime: this.calculateAverageResponseTime(reviewHistory),
      cognitiveLoadIndex: 0.5, // Default neutral value
      confidenceLevel: this.determineInitialConfidenceLevel(card, reviewHistory),
      
      // Clustering & Context
      conceptSimilarity: [], // Will be populated by similarity analysis
      lastClusterReview: '',
      contextualDifficulty: this.createDefaultContextualDifficulty(),
      
      // Enhanced Metadata
      stabilityTrend: 'stable',
      retrievabilityHistory: [initialDSR.retrievability],
      optimalInterval: Math.max(1, Math.round(initialDSR.stability))
    };
  }

  /**
   * Calculate initial DSR values from existing review history
   */
  private calculateInitialDSRFromHistory(reviews: any[], card: any): { difficulty: number; stability: number; retrievability: number } {
    if (reviews.length === 0) {
      // New card - use defaults
      return {
        difficulty: 5.0,
        stability: 1.0,
        retrievability: 0.9
      };
    }

    // Calculate difficulty based on performance
    const successRate = reviews.filter(r => r.wasCorrect).length / reviews.length;
    const difficulty = Math.max(1, Math.min(10, 5.0 + (1 - successRate) * 5));

    // Calculate stability based on current interval and age
    const currentInterval = card.intervalDays || 1;
    const daysSinceCreation = Math.floor((Date.now() - new Date(card.createdAt).getTime()) / (24 * 60 * 60 * 1000));
    const stability = Math.max(1, Math.min(currentInterval, daysSinceCreation / Math.max(1, reviews.length)));

    // Calculate retrievability based on time since last review
    const daysSinceLastReview = card.nextReview ? 
      Math.floor((Date.now() - new Date(card.nextReview).getTime()) / (24 * 60 * 60 * 1000)) : 0;
    const retrievability = Math.max(0.1, Math.min(0.9, Math.exp(-daysSinceLastReview / stability)));

    return { difficulty, stability, retrievability };
  }

  /**
   * Get default FSRS parameters
   */
  private getDefaultFSRSParameters(): number[] {
    return [
      0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94,
      2.18, 0.05, 0.34, 1.26, 0.29, 2.61, 0.62, 0.36, 0.26, 2.4
    ];
  }

  /**
   * Convert existing review history to EnhancedResponseLog format
   */
  private async convertReviewHistoryToEnhanced(reviews: any[]): Promise<EnhancedResponseLog[]> {
    return reviews.slice(-10).map(review => ({ // Keep last 10 reviews
      timestamp: review.reviewedAt || review.createdAt,
      rating: this.convertRatingToFSRS(review.rating),
      responseTime: review.responseTimeMs || 5000, // Default 5 seconds
      contextualFactors: {
        sessionTime: 0, // Unknown for historical data
        timeOfDay: review.reviewedAt || review.createdAt,
        sessionFatigueIndex: 0.3, // Default moderate fatigue
        cognitiveLoadAtTime: 0.7, // Default moderate cognitive load
      },
      momentumImpact: review.wasCorrect ? 0.1 : -0.2,
      confidenceChange: review.wasCorrect ? 0.05 : -0.1,
      previousCardSimilarity: 0.0, // Unknown for historical data
      clusteringContext: 'general'
    }));
  }

  /**
   * Convert old rating system to FSRS format
   */
  private convertRatingToFSRS(rating: number): 'again' | 'hard' | 'good' | 'easy' {
    switch (rating) {
      case 1: return 'again';
      case 2: return 'hard';
      case 3: return 'good';
      case 4: return 'easy';
      default: return 'good';
    }
  }

  /**
   * Calculate average response time from historical data
   */
  private calculateAverageResponseTime(reviews: any[]): number {
    if (reviews.length === 0) return 5000; // Default 5 seconds
    
    const responseTimes = reviews
      .filter(r => r.responseTimeMs && r.responseTimeMs > 0)
      .map(r => r.responseTimeMs);
    
    if (responseTimes.length === 0) return 5000;
    
    return responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
  }

  /**
   * Determine initial confidence level based on card performance
   */
  private determineInitialConfidenceLevel(card: any, reviews: any[]): 'building' | 'optimal' | 'struggling' {
    if (reviews.length < 3) return 'building';
    
    const recentReviews = reviews.slice(-5);
    const successRate = recentReviews.filter(r => r.wasCorrect).length / recentReviews.length;
    
    if (successRate >= 0.8) return 'optimal';
    if (successRate <= 0.4) return 'struggling';
    return 'building';
  }

  /**
   * Create default contextual difficulty mapping
   */
  private createDefaultContextualDifficulty(): any {
    return {
      timeOfDay: {
        '8': 0.0,   // 8 AM - optimal
        '12': 0.2,  // Noon - slightly harder
        '16': 0.0,  // 4 PM - optimal
        '20': 0.3,  // 8 PM - moderate
        '22': 0.5   // 10 PM - harder
      },
      dayOfWeek: {
        'Monday': 0.1,
        'Tuesday': 0.0,
        'Wednesday': 0.0,
        'Thursday': 0.1,
        'Friday': 0.2,
        'Saturday': -0.1,
        'Sunday': -0.1
      },
      sessionPosition: {
        'early': -0.1,
        'mid': 0.0,
        'late': 0.3
      },
      cognitiveLoad: {
        'low': -0.2,
        'medium': 0.0,
        'high': 0.4
      }
    };
  }

  /**
   * Get review history for a card
   */
  private async getCardReviewHistory(cardId: string): Promise<any[]> {
    try {
      const reviews = await this.pb.collection('response_logs')
        .getFullList({
          filter: `card_id = "${cardId}"`,
          sort: 'created'
        });
      return reviews || [];
    } catch (error) {
      console.warn(`Could not fetch review history for card ${cardId}:`, error);
      return [];
    }
  }

  /**
   * Validate card data integrity
   */
  async validateCardData(card: UnifiedCard): Promise<boolean> {
    try {
      // Check required fields
      if (!card.id || !card.deckId) {
        console.error('Missing required card fields');
        return false;
      }

      // Validate DSR values
      if (card.difficulty < 1 || card.difficulty > 10) {
        console.error(`Invalid difficulty value: ${card.difficulty}`);
        return false;
      }

      if (card.stability < 0.1) {
        console.error(`Invalid stability value: ${card.stability}`);
        return false;
      }

      if (card.retrievability < 0 || card.retrievability > 1) {
        console.error(`Invalid retrievability value: ${card.retrievability}`);
        return false;
      }

      // Validate FSRS parameters
      if (!Array.isArray(card.fsrsParameters) || card.fsrsParameters.length !== 21) {
        console.error(`Invalid FSRS parameters length: ${card.fsrsParameters?.length}`);
        return false;
      }

      // Validate performance history
      if (!Array.isArray(card.performanceHistory)) {
        console.error('Performance history must be an array');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating card data:', error);
      return false;
    }
  }

  /**
   * Backfill performance history from existing review logs
   */
  async backfillPerformanceHistory(): Promise<void> {
    console.log('Starting performance history backfill...');
    
    try {
      const cards = await this.pb.collection('cards').getFullList();
      let backfilledCount = 0;
      
      for (const card of cards) {
        if (!card.performanceHistory || card.performanceHistory.length === 0) {
          const reviewHistory = await this.getCardReviewHistory(card.id);
          const enhancedHistory = await this.convertReviewHistoryToEnhanced(reviewHistory);
          
          await this.pb.collection('cards').update(card.id, {
            performanceHistory: enhancedHistory
          });
          
          backfilledCount++;
          
          if (backfilledCount % 50 === 0) {
            console.log(`Backfilled performance history for ${backfilledCount} cards...`);
          }
        }
      }
      
      console.log(`Successfully backfilled performance history for ${backfilledCount} cards`);
    } catch (error) {
      console.error('Error during performance history backfill:', error);
      throw error;
    }
  }

  /**
   * Run full migration process
   */
  async runFullMigration(): Promise<void> {
    console.log('Starting full UAMS v3.0 migration...');
    
    try {
      // Step 1: Migrate existing cards
      await this.migrateExistingCards();
      
      // Step 2: Backfill performance history
      await this.backfillPerformanceHistory();
      
      // Step 3: Validate migrated data
      await this.validateMigratedData();
      
      console.log('Full migration completed successfully!');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  /**
   * Validate all migrated data
   */
  private async validateMigratedData(): Promise<void> {
    console.log('Validating migrated data...');
    
    const cards = await this.pb.collection('cards').getFullList();
    let validCount = 0;
    let invalidCount = 0;
    
    for (const card of cards) {
      if (await this.validateCardData(card as UnifiedCard)) {
        validCount++;
      } else {
        invalidCount++;
        console.warn(`Invalid card data for card ${card.id}`);
      }
    }
    
    console.log(`Data validation complete: ${validCount} valid, ${invalidCount} invalid`);
    
    if (invalidCount > 0) {
      throw new Error(`Migration validation failed: ${invalidCount} cards have invalid data`);
    }
  }
}

// Placeholder for PocketBaseService - should be implemented based on existing service
interface PocketBaseService {
  collection(name: string): {
    getFullList(options?: any): Promise<any[]>;
    update(id: string, data: any): Promise<any>;
    create(data: any): Promise<any>;
  };
}