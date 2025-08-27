"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnifiedCardSelector = void 0;
class UnifiedCardSelector {
    constructor() {
        this.clusteringConfig = {
            conceptSimilarityThreshold: 0.7,
            contentSimilarityThreshold: 0.6,
            timeBasedClusteringWindowMs: 5 * 60 * 1000,
            maxRecentCards: 3
        };
        this.selectionStrategies = [
            {
                name: 'Crisis Intervention',
                condition: (session) => session.sessionMomentumScore < 0.3 && session.momentumTrend === 'declining',
                select: (cards, session) => this.selectConfidenceBooster(cards, session),
                priority: 100
            },
            {
                name: 'Critical Fatigue Management',
                condition: (session) => session.sessionFatigueIndex > 0.9,
                select: (cards, session) => this.selectEasiestCard(cards, session),
                priority: 90
            },
            {
                name: 'High Performance Challenge',
                condition: (session) => session.sessionMomentumScore > 0.8 && session.sessionFatigueIndex < 0.5,
                select: (cards, session) => this.selectOptimalChallenge(cards, session),
                priority: 80
            },
            {
                name: 'Flow State Maintenance',
                condition: (session) => session.flowStateMetrics.momentumMaintenance && session.sessionFatigueIndex < 0.6,
                select: (cards, session) => this.maintainOptimalFlow(cards, session),
                priority: 70
            },
            {
                name: 'Engagement Injection',
                condition: (session) => session.flowStateMetrics.engagementLevel < 0.4,
                select: (cards, session) => this.selectEngagementCard(cards, session),
                priority: 60
            },
            {
                name: 'Balanced Selection',
                condition: () => true,
                select: (cards, session) => this.selectBalancedCard(cards, session),
                priority: 1
            }
        ];
    }
    selectNextOptimalCard(session, availableCards) {
        if (availableCards.length === 0) {
            throw new Error('No available cards for selection');
        }
        const clusteredFiltered = this.preventCardClustering(availableCards, session);
        if (clusteredFiltered.length === 0) {
            console.warn('Clustering prevention removed all cards, using original set');
            return this.selectWithStrategy(availableCards, session);
        }
        const cognitiveFiltered = this.applyCognitiveLoadFilter(clusteredFiltered, session);
        if (cognitiveFiltered.length === 0) {
            console.warn('Cognitive load filtering removed all cards, using clustered filtered set');
            return this.selectWithStrategy(clusteredFiltered, session);
        }
        return this.selectWithStrategy(cognitiveFiltered, session);
    }
    selectWithStrategy(cards, session) {
        const sortedStrategies = this.selectionStrategies.sort((a, b) => b.priority - a.priority);
        for (const strategy of sortedStrategies) {
            if (strategy.condition(session)) {
                console.log(`Using selection strategy: ${strategy.name}`);
                return strategy.select(cards, session);
            }
        }
        return this.selectBalancedCard(cards, session);
    }
    preventCardClustering(cards, session) {
        const recentCards = session.adaptationHistory
            .slice(-this.clusteringConfig.maxRecentCards)
            .map(entry => entry.cardId);
        return cards.filter(card => {
            const conceptCluster = recentCards.some(recentCardId => card.conceptSimilarity && card.conceptSimilarity.includes(recentCardId));
            const contentSimilarity = recentCards.some(recentCardId => this.calculateContentSimilarity(card.id, recentCardId) > this.clusteringConfig.contentSimilarityThreshold);
            const recentlySeen = card.lastClusterReview &&
                (Date.now() - new Date(card.lastClusterReview).getTime()) < this.clusteringConfig.timeBasedClusteringWindowMs;
            const sameDeckRecent = session.adaptationHistory
                .slice(-2)
                .filter(entry => {
                return false;
            }).length >= 2;
            return !conceptCluster && !contentSimilarity && !recentlySeen && !sameDeckRecent;
        });
    }
    applyCognitiveLoadFilter(cards, session) {
        const maxCognitiveLoad = this.calculateMaxAllowableCognitiveLoad(session);
        return cards.filter(card => {
            const cardCognitiveLoad = this.estimateCardCognitiveLoad(card);
            return cardCognitiveLoad <= maxCognitiveLoad;
        });
    }
    calculateMaxAllowableCognitiveLoad(session) {
        let maxLoad = 1.0;
        maxLoad *= session.cognitiveLoadCapacity;
        maxLoad *= (1 - session.sessionFatigueIndex * 0.5);
        maxLoad *= session.attentionSpanRemaining;
        return Math.max(0.3, maxLoad);
    }
    estimateCardCognitiveLoad(card) {
        let cognitiveLoad = card.difficulty / 10;
        cognitiveLoad = Math.max(cognitiveLoad, card.cognitiveLoadIndex);
        const contentComplexity = this.estimateContentComplexity(card);
        cognitiveLoad += contentComplexity * 0.2;
        cognitiveLoad += (1 - card.retrievability) * 0.3;
        return Math.max(0.1, Math.min(1.0, cognitiveLoad));
    }
    selectConfidenceBooster(cards, session) {
        const boosters = cards.filter(card => card.retrievability > 0.8 &&
            card.stability > 5 &&
            card.difficulty < 6 &&
            card.confidenceLevel !== 'struggling').sort((a, b) => {
            const scoreA = this.calculateConfidenceBoosterScore(a);
            const scoreB = this.calculateConfidenceBoosterScore(b);
            return scoreB - scoreA;
        });
        if (boosters.length === 0) {
            const easiest = cards.sort((a, b) => a.difficulty - b.difficulty)[0];
            return {
                card: easiest,
                explanation: `Selected easiest available card (difficulty: ${easiest.difficulty.toFixed(1)}) to rebuild confidence during momentum crisis`,
                reasoning: "Crisis intervention - no suitable confidence boosters available",
                confidence: 0.6
            };
        }
        const selectedCard = boosters[0];
        return {
            card: selectedCard,
            explanation: `Selected confidence booster: High success probability (${(selectedCard.retrievability * 100).toFixed(0)}%), well-established memory (stability: ${selectedCard.stability.toFixed(1)})`,
            reasoning: "momentum_recovery",
            confidence: 0.9,
            alternativeOptions: boosters.slice(1, 3)
        };
    }
    calculateConfidenceBoosterScore(card) {
        let score = 0;
        score += card.retrievability * 40;
        score += Math.min(20, card.stability) * 2;
        score += (10 - card.difficulty) * 3;
        if (card.confidenceLevel === 'optimal')
            score += 10;
        if (card.performanceHistory.length > 0) {
            const recentSuccess = card.performanceHistory
                .slice(-3)
                .filter(h => h.rating !== 'again').length / Math.min(3, card.performanceHistory.length);
            score += recentSuccess * 10;
        }
        return score;
    }
    selectOptimalChallenge(cards, session) {
        const cognitiveCapacity = session.cognitiveLoadCapacity * (1 - session.sessionFatigueIndex);
        const baseDifficulty = 4 + (session.sessionMomentumScore * 4);
        const optimalDifficulty = baseDifficulty * cognitiveCapacity;
        const challenges = cards.filter(card => Math.abs(card.difficulty - optimalDifficulty) < 1.5 &&
            card.retrievability > 0.3 &&
            card.retrievability < 0.85).sort((a, b) => {
            const scoreA = this.calculateChallengeScore(a, optimalDifficulty);
            const scoreB = this.calculateChallengeScore(b, optimalDifficulty);
            return scoreB - scoreA;
        });
        if (challenges.length === 0) {
            const closest = cards.sort((a, b) => Math.abs(a.difficulty - optimalDifficulty) - Math.abs(b.difficulty - optimalDifficulty))[0];
            return {
                card: closest,
                explanation: `Selected closest difficulty match (${closest.difficulty.toFixed(1)} vs optimal ${optimalDifficulty.toFixed(1)}) - limited suitable challenges available`,
                reasoning: "engagement_optimization",
                confidence: 0.6
            };
        }
        const selectedCard = challenges[0];
        return {
            card: selectedCard,
            explanation: `Optimal challenge selected: Difficulty ${selectedCard.difficulty.toFixed(1)} matches your current performance level (optimal: ${optimalDifficulty.toFixed(1)})`,
            reasoning: "engagement_optimization",
            confidence: 0.85,
            alternativeOptions: challenges.slice(1, 3)
        };
    }
    calculateChallengeScore(card, optimalDifficulty) {
        let score = 0;
        const difficultyDifference = Math.abs(card.difficulty - optimalDifficulty);
        score += Math.max(0, 20 - difficultyDifference * 10);
        const idealRetrievability = 0.6;
        const retrievabilityDifference = Math.abs(card.retrievability - idealRetrievability);
        score += Math.max(0, 15 - retrievabilityDifference * 20);
        if (card.confidenceLevel === 'building')
            score += 5;
        if (card.confidenceLevel === 'struggling')
            score -= 10;
        if (card.stability < 10)
            score += (10 - card.stability) * 0.5;
        return score;
    }
    maintainOptimalFlow(cards, session) {
        const currentPerformanceLevel = session.sessionMomentumScore * 10;
        const targetDifficulty = currentPerformanceLevel;
        const difficultyTolerance = 1.0;
        const flowCards = cards.filter(card => Math.abs(card.difficulty - targetDifficulty) <= difficultyTolerance &&
            card.retrievability > 0.4 &&
            card.retrievability < 0.9).sort((a, b) => {
            const scoreA = this.calculateFlowMaintenanceScore(a, session);
            const scoreB = this.calculateFlowMaintenanceScore(b, session);
            return scoreB - scoreA;
        });
        if (flowCards.length === 0) {
            return this.selectBalancedCard(cards, session);
        }
        const selectedCard = flowCards[0];
        return {
            card: selectedCard,
            explanation: `Flow state maintenance: Selected card with balanced challenge (difficulty: ${selectedCard.difficulty.toFixed(1)}, success rate: ${(selectedCard.retrievability * 100).toFixed(0)}%)`,
            reasoning: "flow_maintenance",
            confidence: 0.8,
            alternativeOptions: flowCards.slice(1, 3)
        };
    }
    calculateFlowMaintenanceScore(card, session) {
        let score = 0;
        const performanceDifference = Math.abs(card.difficulty - (session.sessionMomentumScore * 10));
        score += Math.max(0, 15 - performanceDifference * 2);
        const idealRetrievability = 0.7;
        const retrievabilityDifference = Math.abs(card.retrievability - idealRetrievability);
        score += Math.max(0, 10 - retrievabilityDifference * 15);
        if (card.confidenceLevel === 'optimal')
            score += 8;
        if (card.confidenceLevel === 'building')
            score += 5;
        if (card.performanceHistory.length >= 3) {
            const recentRatings = card.performanceHistory.slice(-3).map(h => h.rating);
            const consistency = this.calculateConsistency(recentRatings);
            score += consistency * 5;
        }
        return score;
    }
    selectEngagementCard(cards, session) {
        const engagementCards = cards.filter(card => card.difficulty < 7 &&
            card.retrievability > 0.5 &&
            this.isCardInteresting(card, session)).sort((a, b) => {
            const scoreA = this.calculateEngagementScore(a, session);
            const scoreB = this.calculateEngagementScore(b, session);
            return scoreB - scoreA;
        });
        if (engagementCards.length === 0) {
            const moderate = cards.filter(card => card.difficulty >= 4 && card.difficulty <= 6 &&
                card.retrievability > 0.5);
            if (moderate.length > 0) {
                const selectedCard = moderate[0];
                return {
                    card: selectedCard,
                    explanation: `Selected moderate difficulty card to boost engagement`,
                    reasoning: "engagement_optimization",
                    confidence: 0.6
                };
            }
        }
        const selectedCard = engagementCards[0];
        return {
            card: selectedCard,
            explanation: `Engagement booster: Novel content with manageable difficulty (${selectedCard.difficulty.toFixed(1)})`,
            reasoning: "engagement_optimization",
            confidence: 0.7,
            alternativeOptions: engagementCards.slice(1, 2)
        };
    }
    selectEasiestCard(cards, session) {
        const easiest = cards.sort((a, b) => {
            const easeA = a.retrievability - (a.difficulty / 10);
            const easeB = b.retrievability - (b.difficulty / 10);
            return easeB - easeA;
        })[0];
        return {
            card: easiest,
            explanation: `Selected easiest card due to critical fatigue (${(session.sessionFatigueIndex * 100).toFixed(0)}% fatigue)`,
            reasoning: "fatigue_management",
            confidence: 0.8
        };
    }
    selectBalancedCard(cards, session) {
        const scoredCards = cards.map(card => ({
            card,
            score: this.calculateBalancedScore(card, session)
        })).sort((a, b) => b.score - a.score);
        const selectedCard = scoredCards[0].card;
        return {
            card: selectedCard,
            explanation: `Balanced selection considering difficulty (${selectedCard.difficulty.toFixed(1)}), retrievability (${(selectedCard.retrievability * 100).toFixed(0)}%), and current session state`,
            reasoning: "balanced_optimization",
            confidence: 0.7,
            alternativeOptions: scoredCards.slice(1, 3).map(s => s.card)
        };
    }
    calculateBalancedScore(card, session) {
        let score = 0;
        const dueDate = card.nextReview ? new Date(card.nextReview) : new Date();
        const daysDue = Math.max(0, (Date.now() - dueDate.getTime()) / (24 * 60 * 60 * 1000));
        score += Math.min(20, daysDue * 2);
        score += (1 - card.retrievability) * 15;
        const appropriateDifficulty = session.sessionMomentumScore * 8;
        const difficultyDifference = Math.abs(card.difficulty - appropriateDifficulty);
        score += Math.max(0, 10 - difficultyDifference);
        score += Math.max(0, 10 - card.stability) * 0.5;
        if (card.performanceHistory.length > 0) {
            const avgRating = this.calculateAverageRating(card.performanceHistory);
            if (avgRating < 2.5)
                score += 5;
        }
        return score;
    }
    calculateContentSimilarity(cardId1, cardId2) {
        return Math.random() * 0.5;
    }
    estimateContentComplexity(card) {
        const frontLength = card.frontContent?.length || 0;
        const backLength = card.backContent?.length || 0;
        const totalLength = frontLength + backLength;
        return Math.min(1.0, totalLength / 500);
    }
    isCardInteresting(card, session) {
        const recentCardIds = session.adaptationHistory.slice(-10).map(a => a.cardId);
        const isNovel = !recentCardIds.includes(card.id);
        const hasMultimedia = card.mediaRefs && card.mediaRefs.length > 0;
        const isSpecialType = card.cardType && card.cardType.type !== 'basic';
        return isNovel || hasMultimedia || isSpecialType;
    }
    calculateEngagementScore(card, session) {
        let score = 0;
        const recentCardIds = session.adaptationHistory.slice(-10).map(a => a.cardId);
        const isNovel = !recentCardIds.includes(card.id);
        if (isNovel)
            score += 0.3;
        const hasMultimedia = card.mediaRefs && card.mediaRefs.length > 0;
        if (hasMultimedia)
            score += 0.2;
        const isSpecialType = card.cardType && card.cardType.type !== 'basic';
        if (isSpecialType)
            score += 0.15;
        score += card.retrievability * 0.25;
        const optimalDifficulty = 5.0;
        const difficultyPenalty = Math.abs(card.difficulty - optimalDifficulty) / 10;
        score -= difficultyPenalty * 0.1;
        return Math.max(0, score);
    }
    calculateConsistency(ratings) {
        if (ratings.length < 2)
            return 1.0;
        const ratingValues = ratings.map(r => this.ratingToNumber(r));
        const mean = ratingValues.reduce((sum, val) => sum + val, 0) / ratingValues.length;
        const variance = ratingValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / ratingValues.length;
        return Math.max(0, 1 - variance / 2);
    }
    ratingToNumber(rating) {
        const ratingMap = {
            'again': 1,
            'hard': 2,
            'good': 3,
            'easy': 4
        };
        return ratingMap[rating] || 2.5;
    }
    calculateAverageRating(history) {
        if (history.length === 0)
            return 2.5;
        const ratings = history.map(h => this.ratingToNumber(h.rating));
        return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
    }
}
exports.UnifiedCardSelector = UnifiedCardSelector;
//# sourceMappingURL=unifiedCardSelector.js.map