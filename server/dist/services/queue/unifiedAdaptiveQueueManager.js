"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnifiedAdaptiveQueueManager = void 0;
const unifiedCardSelector_1 = require("../selection/unifiedCardSelector");
class UnifiedAdaptiveQueueManager {
    constructor() {
        this.cardSelector = new unifiedCardSelector_1.UnifiedCardSelector();
    }
    async generateAdaptiveQueue(sessionState, availableCards, environmentalContext) {
        try {
            const adaptationLog = [];
            const reviewReadyCards = availableCards.filter(card => {
                if (!card.nextReviewTime)
                    return true;
                return new Date(card.nextReviewTime) <= new Date();
            });
            const selectionResult = await this.cardSelector.selectOptimalCards(sessionState, reviewReadyCards, environmentalContext);
            adaptationLog.push(`Selected ${selectionResult.selectedCards.length} cards for review queue`);
            adaptationLog.push(`Current momentum: ${sessionState.sessionMomentumScore.toFixed(2)}`);
            adaptationLog.push(`Cognitive load capacity: ${sessionState.cognitiveLoadCapacity.toFixed(2)}`);
            const reviewQueue = selectionResult.selectedCards.slice(0, 15);
            const lookaheadBuffer = selectionResult.selectedCards.slice(15, 25);
            const emergencyBuffer = this.selectEmergencyCards(availableCards, sessionState);
            const challengeReserve = this.selectChallengeCards(availableCards, sessionState);
            return {
                reviewQueue,
                lookaheadBuffer,
                emergencyBuffer,
                challengeReserve,
                adaptationLog
            };
        }
        catch (error) {
            console.error('Queue generation error:', error);
            return {
                reviewQueue: availableCards.slice(0, 10),
                lookaheadBuffer: availableCards.slice(10, 15),
                emergencyBuffer: [],
                challengeReserve: [],
                adaptationLog: ['Fallback to simple queue due to error: ' + error]
            };
        }
    }
    selectEmergencyCards(availableCards, sessionState) {
        return availableCards
            .filter(card => card.difficulty < 4 && card.stability > 7)
            .sort((a, b) => b.stability - a.stability)
            .slice(0, 5);
    }
    selectChallengeCards(availableCards, sessionState) {
        return availableCards
            .filter(card => card.difficulty > 6 || card.reviewCount < 3)
            .sort((a, b) => b.difficulty - a.difficulty)
            .slice(0, 5);
    }
    async adjustQueueDynamically(currentQueue, sessionState, recentPerformance) {
        const avgPerformance = recentPerformance.length > 0
            ? recentPerformance.reduce((sum, p) => sum + p, 0) / recentPerformance.length
            : 0.5;
        if (avgPerformance < 0.3 && sessionState.sessionFatigueIndex > 0.6) {
            const easyCards = this.selectEmergencyCards(currentQueue, sessionState);
            return [...easyCards, ...currentQueue.slice(0, 10)];
        }
        if (avgPerformance > 0.7 && sessionState.sessionMomentumScore > 0.8) {
            const challengeCards = this.selectChallengeCards(currentQueue, sessionState);
            return [...currentQueue.slice(0, 5), ...challengeCards, ...currentQueue.slice(5, 10)];
        }
        return currentQueue;
    }
    calculateQueueEfficiency(queueResult, sessionState) {
        const cards = queueResult.reviewQueue;
        if (cards.length === 0) {
            return { diversityScore: 0, difficultyBalance: 0, momentumAlignment: 0 };
        }
        const difficulties = cards.map(c => c.difficulty);
        const difficultyRange = Math.max(...difficulties) - Math.min(...difficulties);
        const diversityScore = Math.min(difficultyRange / 10, 1);
        const avgDifficulty = difficulties.reduce((sum, d) => sum + d, 0) / difficulties.length;
        const targetDifficulty = this.calculateTargetDifficulty(sessionState);
        const difficultyBalance = 1 - Math.abs(avgDifficulty - targetDifficulty) / 10;
        const momentumAlignment = this.calculateMomentumAlignment(cards, sessionState);
        return {
            diversityScore: Math.max(0, Math.min(1, diversityScore)),
            difficultyBalance: Math.max(0, Math.min(1, difficultyBalance)),
            momentumAlignment: Math.max(0, Math.min(1, momentumAlignment))
        };
    }
    calculateTargetDifficulty(sessionState) {
        const baseTargetDifficulty = 5.0;
        const momentumAdjustment = (sessionState.sessionMomentumScore - 0.5) * 2;
        const fatigueAdjustment = -sessionState.sessionFatigueIndex * 2;
        const cognitiveAdjustment = (sessionState.cognitiveLoadCapacity - 0.5) * 2;
        return Math.max(1, Math.min(10, baseTargetDifficulty + momentumAdjustment + fatigueAdjustment + cognitiveAdjustment));
    }
    calculateMomentumAlignment(cards, sessionState) {
        if (cards.length === 0)
            return 0;
        const targetDifficulty = this.calculateTargetDifficulty(sessionState);
        const avgQueueDifficulty = cards.reduce((sum, c) => sum + c.difficulty, 0) / cards.length;
        const alignment = 1 - Math.abs(avgQueueDifficulty - targetDifficulty) / 10;
        return Math.max(0, Math.min(1, alignment));
    }
    optimizeQueueOrdering(cards, sessionState) {
        return cards.sort((a, b) => {
            const urgencyA = this.calculateUrgency(a);
            const urgencyB = this.calculateUrgency(b);
            if (Math.abs(urgencyA - urgencyB) > 0.1) {
                return urgencyB - urgencyA;
            }
            const targetDifficulty = this.calculateTargetDifficulty(sessionState);
            const diffAlignA = 1 - Math.abs(a.difficulty - targetDifficulty) / 10;
            const diffAlignB = 1 - Math.abs(b.difficulty - targetDifficulty) / 10;
            if (Math.abs(diffAlignA - diffAlignB) > 0.1) {
                return diffAlignB - diffAlignA;
            }
            return a.retrievability - b.retrievability;
        });
    }
    calculateUrgency(card) {
        if (!card.nextReviewTime)
            return 1.0;
        const now = new Date().getTime();
        const reviewTime = new Date(card.nextReviewTime).getTime();
        const overdueDays = Math.max(0, (now - reviewTime) / (1000 * 60 * 60 * 24));
        return Math.min(1.0, overdueDays / 7);
    }
}
exports.UnifiedAdaptiveQueueManager = UnifiedAdaptiveQueueManager;
//# sourceMappingURL=unifiedAdaptiveQueueManager.js.map