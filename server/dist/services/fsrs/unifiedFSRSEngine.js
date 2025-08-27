"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnifiedFSRSEngine = void 0;
class UnifiedFSRSEngine {
    constructor() {
        this.defaultParameters = [
            0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94,
            2.18, 0.05, 0.34, 1.26, 0.29, 2.61, 0.62, 0.36, 0.26, 2.4
        ];
    }
    calculateEnhancedDSR(card, response, userProfile) {
        const parameters = userProfile.fsrsParameters || this.defaultParameters;
        const contextualDifficulty = this.calculateContextualDifficulty(response, card);
        const stabilityUpdate = this.calculateStabilityWithContext(card, response, parameters);
        const retrievabilityUpdate = this.calculateRetrievabilityWithLoad(card, response);
        const confidence = this.calculateUpdateConfidence(card, response);
        const explanation = this.generateDSRExplanation(card, response, {
            contextualDifficulty,
            stabilityUpdate,
            retrievabilityUpdate,
            confidence
        });
        return {
            difficulty: contextualDifficulty,
            stability: stabilityUpdate,
            retrievability: retrievabilityUpdate,
            confidence: confidence,
            explanation: explanation
        };
    }
    calculateContextualDifficulty(response, card) {
        const ratingDifficulty = this.ratingToDifficulty(response.rating);
        const fatigueAdjustment = response.contextualFactors.sessionFatigueIndex * 0.5;
        const cognitiveLoadAdjustment = (1 - response.contextualFactors.cognitiveLoadAtTime) * 0.3;
        const timeAdjustment = this.getTimeOfDayDifficultyModifier(response.contextualFactors.timeOfDay);
        const environmentalAdjustment = this.getEnvironmentalDifficultyModifier(response.contextualFactors.environmentalFactors);
        const responseTimeAdjustment = this.getResponseTimeDifficultyModifier(response.responseTime, card.averageResponseTime);
        const adjustedDifficulty = Math.max(1, Math.min(10, ratingDifficulty +
            fatigueAdjustment +
            cognitiveLoadAdjustment +
            timeAdjustment +
            environmentalAdjustment +
            responseTimeAdjustment));
        const alpha = 0.3;
        return card.difficulty * (1 - alpha) + adjustedDifficulty * alpha;
    }
    ratingToDifficulty(rating) {
        const baseMap = {
            'again': 8.5,
            'hard': 6.5,
            'good': 4.5,
            'easy': 2.5
        };
        return baseMap[rating] || 5.0;
    }
    calculateStabilityWithContext(card, response, parameters) {
        const baseStability = this.calculateBaseFSRSStability(card, response, parameters);
        const fatigueModifier = 1 - (response.contextualFactors.sessionFatigueIndex * 0.15);
        const environmentalModifier = this.getEnvironmentalStabilityModifier(response.contextualFactors.environmentalFactors);
        const consistencyModifier = this.getConsistencyModifier(card, response);
        const contextualStability = baseStability * fatigueModifier * environmentalModifier * consistencyModifier;
        return Math.max(0.1, contextualStability);
    }
    calculateBaseFSRSStability(card, response, parameters) {
        const [w0, w1, w2, w3, w4, w5, w6, w7, w8, w9, w10, w11, w12, w13, w14, w15, w16, w17, w18, w19, w20] = parameters;
        const daysSinceLastReview = card.lastReviewed ?
            Math.floor((Date.now() - new Date(card.lastReviewed).getTime()) / (24 * 60 * 60 * 1000)) : 0;
        const retention = Math.exp(-daysSinceLastReview / (card.stability || 1));
        switch (response.rating) {
            case 'again':
                return Math.max(0.1, card.stability * w11);
            case 'hard':
                return card.stability * (1 + Math.exp(w5) * (w6 - retention) * w7);
            case 'good':
                return card.stability * (1 + Math.exp(w8) * (11 - card.difficulty) * Math.pow(w9, -retention) * (Math.exp((1 - retention) * w10) - 1));
            case 'easy':
                return card.stability * (1 + Math.exp(w15) * (w16 - retention) * w17);
            default:
                return card.stability;
        }
    }
    calculateRetrievabilityWithLoad(card, response) {
        const daysSinceLastReview = card.lastReviewed ?
            Math.floor((Date.now() - new Date(card.lastReviewed).getTime()) / (24 * 60 * 60 * 1000)) : 0;
        const baseRetrievability = Math.exp(-daysSinceLastReview / (card.stability || 1));
        const cognitiveLoadAdjustment = 1 - (1 - response.contextualFactors.cognitiveLoadAtTime) * 0.1;
        const fatigueAdjustment = 1 - response.contextualFactors.sessionFatigueIndex * 0.05;
        const performanceTrendAdjustment = this.getPerformanceTrendAdjustment(card);
        const adjustedRetrievability = baseRetrievability * cognitiveLoadAdjustment * fatigueAdjustment * performanceTrendAdjustment;
        return Math.max(0.01, Math.min(0.99, adjustedRetrievability));
    }
    getTimeOfDayDifficultyModifier(timeOfDay) {
        const hour = new Date(timeOfDay).getHours();
        const timeModifiers = {
            6: -0.1,
            7: -0.1,
            8: -0.2,
            9: -0.2,
            10: -0.1,
            11: 0.0,
            12: 0.1,
            13: 0.2,
            14: 0.3,
            15: 0.1,
            16: -0.1,
            17: -0.1,
            18: 0.0,
            19: 0.1,
            20: 0.2,
            21: 0.3,
            22: 0.4,
            23: 0.5,
            0: 0.6,
            1: 0.6,
            2: 0.7,
            3: 0.7,
            4: 0.6,
            5: 0.4
        };
        return timeModifiers[hour] || 0.0;
    }
    getEnvironmentalDifficultyModifier(environmentalFactors) {
        if (!environmentalFactors)
            return 0.0;
        let modifier = 0.0;
        switch (environmentalFactors.networkQuality) {
            case 'poor':
                modifier += 0.2;
                break;
            case 'offline':
                modifier += 0.3;
                break;
        }
        switch (environmentalFactors.device) {
            case 'mobile':
                modifier += 0.1;
                break;
            case 'tablet':
                modifier += 0.05;
                break;
        }
        if (environmentalFactors.batteryLevel && environmentalFactors.batteryLevel < 0.2) {
            modifier += 0.1;
        }
        return modifier;
    }
    getEnvironmentalStabilityModifier(environmentalFactors) {
        if (!environmentalFactors)
            return 1.0;
        let modifier = 1.0;
        switch (environmentalFactors.ambientNoise) {
            case 'quiet':
                modifier *= 1.05;
                break;
            case 'noisy':
                modifier *= 0.95;
                break;
        }
        switch (environmentalFactors.lighting) {
            case 'optimal':
                modifier *= 1.02;
                break;
            case 'dim':
            case 'bright':
                modifier *= 0.98;
                break;
        }
        return modifier;
    }
    getResponseTimeDifficultyModifier(responseTime, averageResponseTime) {
        if (averageResponseTime === 0)
            return 0.0;
        const ratio = responseTime / averageResponseTime;
        if (ratio > 2.0) {
            return 0.5;
        }
        else if (ratio > 1.5) {
            return 0.3;
        }
        else if (ratio < 0.5) {
            return -0.3;
        }
        else if (ratio < 0.7) {
            return -0.1;
        }
        return 0.0;
    }
    getConsistencyModifier(card, response) {
        const recentHistory = card.performanceHistory.slice(-5);
        if (recentHistory.length < 3)
            return 1.0;
        const ratings = recentHistory.map(h => this.ratingToNumber(h.rating));
        const variance = this.calculateVariance(ratings);
        const consistencyBonus = Math.max(0.95, 1.0 - variance * 0.05);
        return consistencyBonus;
    }
    getPerformanceTrendAdjustment(card) {
        const recentHistory = card.performanceHistory.slice(-5);
        if (recentHistory.length < 3)
            return 1.0;
        const ratings = recentHistory.map(h => this.ratingToNumber(h.rating));
        const trend = this.calculateTrend(ratings);
        return 1.0 + trend * 0.1;
    }
    ratingToNumber(rating) {
        const ratingMap = { 'again': 1, 'hard': 2, 'good': 3, 'easy': 4 };
        return ratingMap[rating] || 2.5;
    }
    calculateVariance(values) {
        if (values.length === 0)
            return 0;
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
        return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    }
    calculateTrend(values) {
        if (values.length < 2)
            return 0;
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
        const n = values.length;
        for (let i = 0; i < n; i++) {
            sumX += i;
            sumY += values[i];
            sumXY += i * values[i];
            sumXX += i * i;
        }
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        return isNaN(slope) ? 0 : slope;
    }
    calculateOptimalInterval(card, targetRetention = 0.9) {
        const baseInterval = card.stability * Math.log(1 / (1 - targetRetention));
        const contextualAdjustment = this.getContextualIntervalModifier(card);
        const cognitiveLoadAdjustment = this.getCognitiveLoadModifier(card.cognitiveLoadIndex);
        const stabilityTrendAdjustment = this.getStabilityTrendModifier(card.stabilityTrend);
        const optimalInterval = baseInterval * contextualAdjustment * cognitiveLoadAdjustment * stabilityTrendAdjustment;
        return Math.max(1, Math.round(optimalInterval));
    }
    getContextualIntervalModifier(card) {
        if (!card.contextualDifficulty)
            return 1.0;
        const currentHour = new Date().getHours().toString();
        const currentDay = new Date().toLocaleDateString('en', { weekday: 'long' });
        const hourModifier = card.contextualDifficulty.timeOfDay?.[currentHour] || 0;
        const dayModifier = card.contextualDifficulty.dayOfWeek?.[currentDay] || 0;
        return Math.max(0.5, 1.0 - (hourModifier + dayModifier) * 0.1);
    }
    getCognitiveLoadModifier(cognitiveLoadIndex) {
        return Math.max(0.7, 1.0 - cognitiveLoadIndex * 0.3);
    }
    getStabilityTrendModifier(stabilityTrend) {
        switch (stabilityTrend) {
            case 'increasing':
                return 1.1;
            case 'decreasing':
                return 0.9;
            case 'stable':
            default:
                return 1.0;
        }
    }
    calculateUpdateConfidence(card, response) {
        let confidence = 0.7;
        const historyCount = card.performanceHistory.length;
        if (historyCount > 10)
            confidence += 0.2;
        else if (historyCount > 5)
            confidence += 0.1;
        if (historyCount >= 3) {
            const recentRatings = card.performanceHistory.slice(-3).map(h => h.rating);
            const isConsistent = recentRatings.every(r => r === recentRatings[0]);
            if (isConsistent)
                confidence += 0.1;
        }
        if (response.responseTime > 1000 && response.responseTime < 30000) {
            confidence += 0.1;
        }
        return Math.min(1.0, confidence);
    }
    generateDSRExplanation(card, response, calculation) {
        const explanations = [];
        const difficultyChange = calculation.contextualDifficulty - card.difficulty;
        if (Math.abs(difficultyChange) > 0.5) {
            if (difficultyChange > 0) {
                explanations.push(`Difficulty increased due to ${response.rating} rating and contextual factors`);
            }
            else {
                explanations.push(`Difficulty decreased reflecting improved performance`);
            }
        }
        const stabilityChange = calculation.stabilityUpdate / card.stability;
        if (stabilityChange > 1.2) {
            explanations.push(`Memory stability improved significantly`);
        }
        else if (stabilityChange < 0.8) {
            explanations.push(`Memory stability decreased due to poor performance`);
        }
        if (response.contextualFactors.sessionFatigueIndex > 0.7) {
            explanations.push(`High fatigue level affected calculation`);
        }
        if (response.contextualFactors.cognitiveLoadAtTime < 0.5) {
            explanations.push(`Low cognitive capacity considered in adjustment`);
        }
        return explanations.join('; ') || 'Standard FSRS calculation applied';
    }
}
exports.UnifiedFSRSEngine = UnifiedFSRSEngine;
//# sourceMappingURL=unifiedFSRSEngine.js.map