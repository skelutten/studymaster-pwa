"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UAMSMigrationService = void 0;
const optimizedQueries_1 = require("./database/optimizedQueries");
class UAMSMigrationService {
    constructor(dbService) {
        this.queries = new optimizedQueries_1.OptimizedQueries(dbService);
    }
    async migrateUser(userId) {
        const cards = await this.queries.getCardsForReview(userId, 1000);
        const updates = cards.map(card => {
            const dsr = this.calculateInitialDSR(card);
            return { id: card.id, dsr };
        });
        await this.queries.updateCardDSRBatch(updates);
    }
    calculateInitialDSR(card) {
        const difficulty = card.easeFactor ? Math.round((1 / card.easeFactor) * 10) : 5;
        const stability = card.intervalDays || 1;
        const retrievability = card.reviewCount > 0 ? Math.pow(1 - (1 / stability), card.reviewCount) : 0.9;
        return {
            difficulty,
            stability,
            retrievability,
            confidence: 0.5,
            explanation: "Migrated from UAMS system with calculated DSR values"
        };
    }
}
exports.UAMSMigrationService = UAMSMigrationService;
//# sourceMappingURL=uamsMigrationService.js.map