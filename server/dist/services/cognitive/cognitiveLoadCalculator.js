"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CognitiveLoadCalculator = void 0;
class CognitiveLoadCalculator {
    constructor() {
        this.FATIGUE_HALF_LIFE_MINUTES = 45;
        this.ERROR_FATIGUE_MULTIPLIER = 0.15;
        this.DIFFICULTY_FATIGUE_THRESHOLD = 6.0;
        this.RESPONSE_TIME_VARIANCE_THRESHOLD = 5000;
        this.defaultProfile = {
            baseCapacity: 1.0,
            fatigueRate: 0.02,
            recoveryRate: 0.05,
            attentionSpanMinutes: 45,
            optimalLoadRange: [0.3, 0.7],
            stressThreshold: 0.8
        };
    }
    calculateCurrentLoad(responseHistory, sessionState, userProfile) {
        const profile = this.getUserCognitiveProfile(userProfile);
        const loadFactors = this.analyzeLoadFactors(responseHistory, sessionState);
        const currentLoad = this.computeOverallLoad(loadFactors, profile);
        const capacity = this.calculateAvailableCapacity(sessionState, profile);
        const utilizationRate = capacity > 0 ? currentLoad / capacity : 1.0;
        const attentionRemainingMinutes = this.predictRemainingAttention(sessionState, profile);
        const difficultyAdjustment = this.calculateDifficultyAdjustment(currentLoad, capacity, profile);
        const sustainabilityScore = this.calculateSustainabilityScore(currentLoad, capacity, sessionState, profile);
        const alertLevel = this.determineAlertLevel(utilizationRate, sustainabilityScore);
        const recommendations = this.generateRecommendations(currentLoad, capacity, utilizationRate, sustainabilityScore, sessionState);
        return {
            currentLoad,
            capacity,
            utilizationRate,
            fatigueLevel: sessionState.sessionFatigueIndex,
            attentionRemainingMinutes,
            recommendedDifficultyAdjustment: difficultyAdjustment,
            sustainabilityScore,
            alertLevel,
            recommendations
        };
    }
    analyzeLoadFactors(responseHistory, sessionState) {
        return {
            timeBasedFatigue: this.calculateTimeBasedFatigue(sessionState),
            responseTimeVariance: this.calculateResponseTimeVariance(responseHistory),
            errorRate: this.calculateErrorRate(responseHistory),
            difficultyAccumulation: this.calculateDifficultyAccumulation(responseHistory),
            environmentalStress: this.calculateEnvironmentalStress(responseHistory),
            contextualDemand: this.calculateContextualDemand(sessionState)
        };
    }
    calculateTimeBasedFatigue(sessionState) {
        const sessionDurationMinutes = this.getSessionDuration(sessionState.sessionStartTime);
        const fatigue = 1 - Math.exp(-sessionDurationMinutes / this.FATIGUE_HALF_LIFE_MINUTES);
        return Math.min(1.0, fatigue);
    }
    calculateResponseTimeVariance(responseHistory) {
        if (responseHistory.length < 3)
            return 0;
        const recentResponses = responseHistory.slice(-10);
        const responseTimes = recentResponses.map(r => r.responseTime);
        if (responseTimes.length < 2)
            return 0;
        const mean = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
        const variance = responseTimes.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / responseTimes.length;
        const standardDeviation = Math.sqrt(variance);
        const coefficientOfVariation = mean > 0 ? standardDeviation / mean : 0;
        return Math.min(1.0, coefficientOfVariation / 0.5);
    }
    calculateErrorRate(responseHistory) {
        if (responseHistory.length === 0)
            return 0;
        const recentResponses = responseHistory.slice(-10);
        const errorCount = recentResponses.filter(r => r.rating === 'again').length;
        const errorRate = errorCount / recentResponses.length;
        return Math.min(1.0, Math.pow(errorRate * 2, 2));
    }
    calculateDifficultyAccumulation(responseHistory) {
        if (responseHistory.length < 3)
            return 0;
        const recentResponses = responseHistory.slice(-5);
        let totalDifficulty = 0;
        let count = 0;
        for (const response of recentResponses) {
            let estimatedDifficulty = 5;
            if (response.rating === 'again') {
                estimatedDifficulty = 8;
            }
            else if (response.rating === 'hard') {
                estimatedDifficulty = 6.5;
            }
            else if (response.rating === 'good') {
                estimatedDifficulty = 4;
            }
            else if (response.rating === 'easy') {
                estimatedDifficulty = 2;
            }
            if (response.responseTime > 15000) {
                estimatedDifficulty += 1;
            }
            else if (response.responseTime < 2000) {
                estimatedDifficulty -= 1;
            }
            totalDifficulty += estimatedDifficulty;
            count++;
        }
        const averageDifficulty = count > 0 ? totalDifficulty / count : 5;
        return Math.max(0, (averageDifficulty - this.DIFFICULTY_FATIGUE_THRESHOLD) / 4);
    }
    calculateEnvironmentalStress(responseHistory) {
        if (responseHistory.length === 0)
            return 0;
        const latestResponse = responseHistory[responseHistory.length - 1];
        const envFactors = latestResponse.contextualFactors.environmentalFactors;
        if (!envFactors)
            return 0;
        let stress = 0;
        switch (envFactors.networkQuality) {
            case 'poor':
                stress += 0.3;
                break;
            case 'offline':
                stress += 0.5;
                break;
        }
        if (envFactors.device === 'mobile') {
            stress += 0.1;
            if (envFactors.batteryLevel && envFactors.batteryLevel < 0.2) {
                stress += 0.2;
            }
        }
        if (envFactors.ambientNoise === 'noisy') {
            stress += 0.15;
        }
        if (envFactors.lighting === 'dim' || envFactors.lighting === 'bright') {
            stress += 0.1;
        }
        return Math.min(1.0, stress);
    }
    calculateContextualDemand(sessionState) {
        let demand = 0;
        const hour = new Date().getHours();
        if (hour < 8 || hour > 22) {
            demand += 0.2;
        }
        else if (hour >= 13 && hour <= 15) {
            demand += 0.1;
        }
        const sessionDurationMinutes = this.getSessionDuration(sessionState.sessionStartTime);
        if (sessionDurationMinutes > 60) {
            demand += Math.min(0.3, (sessionDurationMinutes - 60) / 60);
        }
        if (sessionState.momentumTrend === 'declining') {
            demand += 0.15;
        }
        return Math.min(1.0, demand);
    }
    computeOverallLoad(loadFactors, profile) {
        const weights = {
            timeBasedFatigue: 0.25,
            responseTimeVariance: 0.20,
            errorRate: 0.20,
            difficultyAccumulation: 0.15,
            environmentalStress: 0.10,
            contextualDemand: 0.10
        };
        let totalLoad = 0;
        totalLoad += loadFactors.timeBasedFatigue * weights.timeBasedFatigue;
        totalLoad += loadFactors.responseTimeVariance * weights.responseTimeVariance;
        totalLoad += loadFactors.errorRate * weights.errorRate;
        totalLoad += loadFactors.difficultyAccumulation * weights.difficultyAccumulation;
        totalLoad += loadFactors.environmentalStress * weights.environmentalStress;
        totalLoad += loadFactors.contextualDemand * weights.contextualDemand;
        totalLoad *= (2 - profile.baseCapacity);
        return Math.min(1.0, totalLoad);
    }
    calculateAvailableCapacity(sessionState, profile) {
        let capacity = profile.baseCapacity;
        capacity -= sessionState.sessionFatigueIndex * 0.4;
        capacity *= sessionState.attentionSpanRemaining;
        const hour = new Date().getHours();
        const timeOfDayMultiplier = this.getTimeOfDayCapacityMultiplier(hour);
        capacity *= timeOfDayMultiplier;
        return Math.max(0.1, capacity);
    }
    getTimeOfDayCapacityMultiplier(hour) {
        const hourMultipliers = {
            0: 0.4, 1: 0.3, 2: 0.3, 3: 0.3, 4: 0.4, 5: 0.5,
            6: 0.7, 7: 0.8, 8: 0.9, 9: 1.0, 10: 1.0, 11: 0.95,
            12: 0.9, 13: 0.8, 14: 0.75, 15: 0.8, 16: 0.9, 17: 0.9,
            18: 0.8, 19: 0.75, 20: 0.7, 21: 0.6, 22: 0.5, 23: 0.4
        };
        return hourMultipliers[hour] || 0.7;
    }
    predictRemainingAttention(sessionState, profile) {
        const sessionDurationMinutes = this.getSessionDuration(sessionState.sessionStartTime);
        const baseAttentionSpan = profile.attentionSpanMinutes;
        const decayRate = profile.fatigueRate;
        const remainingRatio = Math.exp(-sessionDurationMinutes * decayRate);
        const baseRemaining = baseAttentionSpan * remainingRatio;
        let adjustedRemaining = baseRemaining * (1 - sessionState.sessionFatigueIndex);
        if (sessionState.sessionMomentumScore > 0.7) {
            adjustedRemaining *= 1.2;
        }
        else if (sessionState.sessionMomentumScore < 0.4) {
            adjustedRemaining *= 0.8;
        }
        return Math.max(0, adjustedRemaining);
    }
    calculateDifficultyAdjustment(currentLoad, capacity, profile) {
        const utilizationRate = capacity > 0 ? currentLoad / capacity : 1.0;
        const optimalRange = profile.optimalLoadRange;
        if (utilizationRate < optimalRange[0]) {
            const underUtilization = optimalRange[0] - utilizationRate;
            return Math.min(2.0, underUtilization * 4);
        }
        else if (utilizationRate > optimalRange[1]) {
            const overUtilization = utilizationRate - optimalRange[1];
            return Math.max(-3.0, -overUtilization * 5);
        }
        return 0;
    }
    adjustDifficultyForCognitiveLoad(baseDifficulty, cognitiveLoad) {
        let adjustedDifficulty = baseDifficulty;
        if (cognitiveLoad > 0.8) {
            adjustedDifficulty -= 2.0;
        }
        else if (cognitiveLoad > 0.6) {
            adjustedDifficulty -= 1.0;
        }
        else if (cognitiveLoad < 0.3) {
            adjustedDifficulty += 0.5;
        }
        return Math.max(1, Math.min(10, adjustedDifficulty));
    }
    calculateSustainabilityScore(currentLoad, capacity, sessionState, profile) {
        let sustainability = 1.0;
        const utilizationRate = capacity > 0 ? currentLoad / capacity : 1.0;
        if (utilizationRate > profile.stressThreshold) {
            sustainability -= (utilizationRate - profile.stressThreshold) * 2;
        }
        sustainability *= sessionState.attentionSpanRemaining;
        if (sessionState.momentumTrend === 'declining') {
            sustainability *= 0.8;
        }
        else if (sessionState.momentumTrend === 'improving') {
            sustainability *= 1.1;
        }
        const sessionDurationMinutes = this.getSessionDuration(sessionState.sessionStartTime);
        if (sessionDurationMinutes > 45) {
            const overtimeFactor = Math.max(0.3, 1 - ((sessionDurationMinutes - 45) / 60));
            sustainability *= overtimeFactor;
        }
        return Math.max(0, Math.min(1, sustainability));
    }
    determineAlertLevel(utilizationRate, sustainabilityScore) {
        if (utilizationRate > 1.2 || sustainabilityScore < 0.2) {
            return 'red';
        }
        else if (utilizationRate > 0.9 || sustainabilityScore < 0.4) {
            return 'orange';
        }
        else if (utilizationRate > 0.7 || sustainabilityScore < 0.6) {
            return 'yellow';
        }
        else {
            return 'green';
        }
    }
    generateRecommendations(currentLoad, capacity, utilizationRate, sustainabilityScore, sessionState) {
        const recommendations = [];
        if (utilizationRate > 1.0) {
            recommendations.push('Reduce card difficulty to lower cognitive demand');
            recommendations.push('Take a short break to restore cognitive capacity');
        }
        else if (utilizationRate > 0.8) {
            recommendations.push('Consider easier cards to maintain sustainable learning');
        }
        if (sustainabilityScore < 0.3) {
            recommendations.push('Session approaching limits - consider ending soon');
            recommendations.push('Switch to review of well-known cards only');
        }
        else if (sustainabilityScore < 0.5) {
            recommendations.push('Monitor fatigue levels closely');
            recommendations.push('Avoid introducing new difficult concepts');
        }
        if (sessionState.sessionFatigueIndex > 0.8) {
            recommendations.push('High fatigue detected - take a 5-10 minute break');
        }
        else if (sessionState.sessionFatigueIndex > 0.6) {
            recommendations.push('Consider lighter review material');
        }
        if (sessionState.attentionSpanRemaining < 0.3) {
            recommendations.push('Attention span low - consider ending session');
        }
        if (utilizationRate >= 0.3 && utilizationRate <= 0.7 && sustainabilityScore > 0.7) {
            recommendations.push('Cognitive load optimal - maintain current difficulty');
        }
        if (utilizationRate < 0.3 && sustainabilityScore > 0.7) {
            recommendations.push('Cognitive capacity available - can increase challenge');
        }
        return recommendations;
    }
    getUserCognitiveProfile(userProfile) {
        if (!userProfile?.cognitiveLoadProfile) {
            return this.defaultProfile;
        }
        return {
            ...this.defaultProfile,
            ...userProfile.cognitiveLoadProfile
        };
    }
    getSessionDuration(sessionStartTime) {
        return (Date.now() - new Date(sessionStartTime).getTime()) / (1000 * 60);
    }
}
exports.CognitiveLoadCalculator = CognitiveLoadCalculator;
//# sourceMappingURL=cognitiveLoadCalculator.js.map