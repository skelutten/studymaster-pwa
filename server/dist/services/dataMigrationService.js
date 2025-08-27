"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataMigrationService = void 0;
class DataMigrationService {
    constructor(pocketbaseService) {
        this.pb = pocketbaseService;
    }
    async migrateExistingCards() {
        console.log('Starting card migration to UnifiedCard format...');
        try {
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
        }
        catch (error) {
            console.error('Error during card migration:', error);
            throw error;
        }
    }
    hasEnhancedFields(card) {
        return card.difficulty !== undefined &&
            card.stability !== undefined &&
            card.retrievability !== undefined;
    }
    async migrateCard(card) {
        const reviewHistory = await this.getCardReviewHistory(card.id);
        const initialDSR = this.calculateInitialDSRFromHistory(reviewHistory, card);
        return {
            difficulty: initialDSR.difficulty,
            stability: initialDSR.stability,
            retrievability: initialDSR.retrievability,
            fsrsParameters: this.getDefaultFSRSParameters(),
            performanceHistory: await this.convertReviewHistoryToEnhanced(reviewHistory),
            averageResponseTime: this.calculateAverageResponseTime(reviewHistory),
            cognitiveLoadIndex: 0.5,
            confidenceLevel: this.determineInitialConfidenceLevel(card, reviewHistory),
            conceptSimilarity: [],
            lastClusterReview: '',
            contextualDifficulty: this.createDefaultContextualDifficulty(),
            stabilityTrend: 'stable',
            retrievabilityHistory: [initialDSR.retrievability],
            optimalInterval: Math.max(1, Math.round(initialDSR.stability))
        };
    }
    calculateInitialDSRFromHistory(reviews, card) {
        if (reviews.length === 0) {
            return {
                difficulty: 5.0,
                stability: 1.0,
                retrievability: 0.9
            };
        }
        const successRate = reviews.filter(r => r.wasCorrect).length / reviews.length;
        const difficulty = Math.max(1, Math.min(10, 5.0 + (1 - successRate) * 5));
        const currentInterval = card.intervalDays || 1;
        const daysSinceCreation = Math.floor((Date.now() - new Date(card.createdAt).getTime()) / (24 * 60 * 60 * 1000));
        const stability = Math.max(1, Math.min(currentInterval, daysSinceCreation / Math.max(1, reviews.length)));
        const daysSinceLastReview = card.nextReview ?
            Math.floor((Date.now() - new Date(card.nextReview).getTime()) / (24 * 60 * 60 * 1000)) : 0;
        const retrievability = Math.max(0.1, Math.min(0.9, Math.exp(-daysSinceLastReview / stability)));
        return { difficulty, stability, retrievability };
    }
    getDefaultFSRSParameters() {
        return [
            0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94,
            2.18, 0.05, 0.34, 1.26, 0.29, 2.61, 0.62, 0.36, 0.26, 2.4
        ];
    }
    async convertReviewHistoryToEnhanced(reviews) {
        return reviews.slice(-10).map(review => ({
            timestamp: review.reviewedAt || review.createdAt,
            rating: this.convertRatingToFSRS(review.rating),
            responseTime: review.responseTimeMs || 5000,
            contextualFactors: {
                sessionTime: 0,
                timeOfDay: review.reviewedAt || review.createdAt,
                sessionFatigueIndex: 0.3,
                cognitiveLoadAtTime: 0.7,
            },
            momentumImpact: review.wasCorrect ? 0.1 : -0.2,
            confidenceChange: review.wasCorrect ? 0.05 : -0.1,
            previousCardSimilarity: 0.0,
            clusteringContext: 'general'
        }));
    }
    convertRatingToFSRS(rating) {
        switch (rating) {
            case 1: return 'again';
            case 2: return 'hard';
            case 3: return 'good';
            case 4: return 'easy';
            default: return 'good';
        }
    }
    calculateAverageResponseTime(reviews) {
        if (reviews.length === 0)
            return 5000;
        const responseTimes = reviews
            .filter(r => r.responseTimeMs && r.responseTimeMs > 0)
            .map(r => r.responseTimeMs);
        if (responseTimes.length === 0)
            return 5000;
        return responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    }
    determineInitialConfidenceLevel(card, reviews) {
        if (reviews.length < 3)
            return 'building';
        const recentReviews = reviews.slice(-5);
        const successRate = recentReviews.filter(r => r.wasCorrect).length / recentReviews.length;
        if (successRate >= 0.8)
            return 'optimal';
        if (successRate <= 0.4)
            return 'struggling';
        return 'building';
    }
    createDefaultContextualDifficulty() {
        return {
            timeOfDay: {
                '8': 0.0,
                '12': 0.2,
                '16': 0.0,
                '20': 0.3,
                '22': 0.5
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
    async getCardReviewHistory(cardId) {
        try {
            const reviews = await this.pb.collection('response_logs')
                .getFullList({
                filter: `card_id = "${cardId}"`,
                sort: 'created'
            });
            return reviews || [];
        }
        catch (error) {
            console.warn(`Could not fetch review history for card ${cardId}:`, error);
            return [];
        }
    }
    async validateCardData(card) {
        try {
            if (!card.id || !card.deckId) {
                console.error('Missing required card fields');
                return false;
            }
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
            if (!Array.isArray(card.fsrsParameters) || card.fsrsParameters.length !== 21) {
                console.error(`Invalid FSRS parameters length: ${card.fsrsParameters?.length}`);
                return false;
            }
            if (!Array.isArray(card.performanceHistory)) {
                console.error('Performance history must be an array');
                return false;
            }
            return true;
        }
        catch (error) {
            console.error('Error validating card data:', error);
            return false;
        }
    }
    async backfillPerformanceHistory() {
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
        }
        catch (error) {
            console.error('Error during performance history backfill:', error);
            throw error;
        }
    }
    async runFullMigration() {
        console.log('Starting full UAMS v3.0 migration...');
        try {
            await this.migrateExistingCards();
            await this.backfillPerformanceHistory();
            await this.validateMigratedData();
            console.log('Full migration completed successfully!');
        }
        catch (error) {
            console.error('Migration failed:', error);
            throw error;
        }
    }
    async validateMigratedData() {
        console.log('Validating migrated data...');
        const cards = await this.pb.collection('cards').getFullList();
        let validCount = 0;
        let invalidCount = 0;
        for (const card of cards) {
            if (await this.validateCardData(card)) {
                validCount++;
            }
            else {
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
exports.DataMigrationService = DataMigrationService;
//# sourceMappingURL=dataMigrationService.js.map