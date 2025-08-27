"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OptimizedQueries = void 0;
class OptimizedQueries {
    constructor(dbService) {
        this.db = dbService;
    }
    async getCardsForReview(userId, limit = 50) {
        const query = `
      SELECT * FROM cards 
      WHERE user_id = ? 
        AND next_review <= datetime('now')
      ORDER BY 
        CASE 
          WHEN stability < 1 THEN 0  -- New cards first
          WHEN retrievability < 0.8 THEN 1  -- Due cards
          ELSE 2  -- Future reviews
        END,
        retrievability ASC,
        stability ASC
      LIMIT ?
    `;
        return await this.db.query(query, [userId, limit]);
    }
    async updateCardDSRBatch(updates) {
        const transaction = this.db.transaction();
        try {
            for (const update of updates) {
                await transaction.run(`
          UPDATE cards SET 
            difficulty = ?,
            stability = ?,
            retrievability = ?,
            last_reviewed = datetime('now'),
            next_review = datetime('now', '+' || ? || ' days')
          WHERE id = ?
        `, [
                    update.dsr.difficulty,
                    update.dsr.stability,
                    update.dsr.retrievability,
                    this.calculateNextReviewDays(update.dsr.stability),
                    update.id
                ]);
            }
            await transaction.commit();
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    calculateNextReviewDays(stability) {
        return Math.round(stability);
    }
}
exports.OptimizedQueries = OptimizedQueries;
//# sourceMappingURL=optimizedQueries.js.map