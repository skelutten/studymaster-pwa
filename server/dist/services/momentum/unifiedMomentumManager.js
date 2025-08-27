"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnifiedMomentumManager = void 0;
class UnifiedMomentumManager {
    constructor() {
        this.MOMENTUM_ALPHA = 0.65;
        this.PERFORMANCE_ALPHA = 0.35;
        this.FATIGUE_THRESHOLDS = {
            LOW: 0.3,
            MODERATE: 0.6,
            HIGH: 0.8,
            CRITICAL: 0.9
        };
        this.FLOW_STATE_THRESHOLDS = {
            OPTIMAL_MIN: 0.4,
            OPTIMAL_MAX: 0.8,
            CHALLENGE_SKILL_RATIO_OPTIMAL: [0.7, 1.3]
        };
    }
    updateSessionMomentum(currentState, response) {
        const performanceValue = this.getPerformanceValue(response.rating);
        const fatigueAdjustment = this.getFatigueAdjustment(currentState.sessionFatigueIndex);
        const contextualModifier = this.getContextualModifier(response.contextualFactors);
        const responseTimeModifier = this.getResponseTimeModifier(response.responseTime);
        const rawMomentumScore = (currentState.sessionMomentumScore * this.MOMENTUM_ALPHA) +
            (performanceValue * this.PERFORMANCE_ALPHA) +
            fatigueAdjustment +
            contextualModifier +
            responseTimeModifier;
        const newMomentumScore = Math.max(0, Math.min(1, rawMomentumScore));
        const newFatigueIndex = this.updateFatigueIndex(currentState, response);
        const newCognitiveCapacity = this.updateCognitiveLoadCapacity(currentState, response);
        const momentumTrend = this.calculateMomentumTrend(currentState, newMomentumScore);
        const attentionSpanRemaining = this.calculateAttentionSpan(currentState, response);
        const flowStateMetrics = this.calculateFlowStateMetrics({
            ...currentState,
            sessionMomentumScore: newMomentumScore,
            sessionFatigueIndex: newFatigueIndex,
            cognitiveLoadCapacity: newCognitiveCapacity
        });
        return {
            ...currentState,
            sessionMomentumScore: newMomentumScore,
            sessionFatigueIndex: newFatigueIndex,
            cognitiveLoadCapacity: newCognitiveCapacity,
            momentumTrend: momentumTrend,
            attentionSpanRemaining: attentionSpanRemaining,
            flowStateMetrics: flowStateMetrics
        };
    }
    getPerformanceValue(rating) {
        const baseValues = {
            'again': 0.0,
            'hard': 0.25,
            'good': 0.75,
            'easy': 1.0
        };
        return baseValues[rating] || 0.5;
    }
    getFatigueAdjustment(fatigueIndex) {
        if (fatigueIndex > this.FATIGUE_THRESHOLDS.CRITICAL) {
            return -0.3;
        }
        else if (fatigueIndex > this.FATIGUE_THRESHOLDS.HIGH) {
            return -0.2;
        }
        else if (fatigueIndex > this.FATIGUE_THRESHOLDS.MODERATE) {
            return -0.1;
        }
        else if (fatigueIndex > this.FATIGUE_THRESHOLDS.LOW) {
            return -0.05;
        }
        return 0;
    }
    getContextualModifier(contextualFactors) {
        let modifier = 0;
        const hour = new Date(contextualFactors.timeOfDay).getHours();
        if (hour >= 8 && hour <= 10) {
            modifier += 0.05;
        }
        else if (hour >= 16 && hour <= 18) {
            modifier += 0.03;
        }
        else if (hour >= 22 || hour <= 6) {
            modifier -= 0.1;
        }
        if (contextualFactors.cognitiveLoadAtTime > 0.8) {
            modifier -= 0.05;
        }
        else if (contextualFactors.cognitiveLoadAtTime < 0.3) {
            modifier -= 0.03;
        }
        if (contextualFactors.environmentalFactors) {
            const env = contextualFactors.environmentalFactors;
            if (env.networkQuality === 'poor' || env.networkQuality === 'offline') {
                modifier -= 0.05;
            }
            if (env.device === 'mobile' && env.batteryLevel && env.batteryLevel < 0.2) {
                modifier -= 0.03;
            }
            if (env.ambientNoise === 'noisy') {
                modifier -= 0.02;
            }
        }
        return modifier;
    }
    getResponseTimeModifier(responseTime) {
        if (responseTime < 1000) {
            return -0.05;
        }
        else if (responseTime > 20000) {
            return -0.1;
        }
        else if (responseTime >= 2000 && responseTime <= 8000) {
            return 0.02;
        }
        return 0;
    }
    updateFatigueIndex(currentState, response) {
        const sessionDuration = (Date.now() - new Date(currentState.sessionStartTime).getTime()) / (1000 * 60);
        const baseFatigue = Math.min(1, sessionDuration / 60);
        const responseTimeFatigue = response.responseTime > 10000 ? 0.05 : 0;
        const performanceFatigue = response.rating === 'again' ? 0.08 :
            response.rating === 'hard' ? 0.03 : 0;
        const cognitiveLoadFatigue = (1 - response.contextualFactors.cognitiveLoadAtTime) * 0.02;
        const environmentalFatigue = this.getEnvironmentalFatigue(response.contextualFactors);
        const rawFatigueIncrease = responseTimeFatigue + performanceFatigue + cognitiveLoadFatigue + environmentalFatigue;
        const newFatigueIndex = Math.min(1, currentState.sessionFatigueIndex + rawFatigueIncrease);
        const fatigueRecovery = response.rating === 'easy' ? 0.01 : 0;
        return Math.max(0, newFatigueIndex - fatigueRecovery);
    }
    getEnvironmentalFatigue(contextualFactors) {
        let fatigue = 0;
        const env = contextualFactors.environmentalFactors;
        if (env) {
            if (env.networkQuality === 'poor')
                fatigue += 0.02;
            if (env.networkQuality === 'offline')
                fatigue += 0.05;
            if (env.device === 'mobile' && env.batteryLevel && env.batteryLevel < 0.3) {
                fatigue += 0.02;
            }
            if (env.lighting === 'dim' || env.lighting === 'bright') {
                fatigue += 0.01;
            }
            if (env.ambientNoise === 'noisy') {
                fatigue += 0.02;
            }
        }
        return fatigue;
    }
    updateCognitiveLoadCapacity(currentState, response) {
        const sessionDuration = (Date.now() - new Date(currentState.sessionStartTime).getTime()) / (1000 * 60);
        const baseDecay = Math.max(0.3, 1 - (sessionDuration / 120));
        const performanceAdjustment = response.rating === 'again' ? -0.05 :
            response.rating === 'easy' ? 0.02 : 0;
        const fatigueImpact = -currentState.sessionFatigueIndex * 0.3;
        const newCapacity = Math.max(0.1, Math.min(1.0, baseDecay + performanceAdjustment + fatigueImpact));
        const alpha = 0.1;
        return currentState.cognitiveLoadCapacity * (1 - alpha) + newCapacity * alpha;
    }
    calculateMomentumTrend(currentState, newMomentumScore) {
        const momentumChange = newMomentumScore - currentState.sessionMomentumScore;
        if (momentumChange > 0.05) {
            return 'improving';
        }
        else if (momentumChange < -0.05) {
            return 'declining';
        }
        else {
            return 'stable';
        }
    }
    calculateAttentionSpan(currentState, response) {
        const sessionDuration = (Date.now() - new Date(currentState.sessionStartTime).getTime()) / (1000 * 60);
        const baseAttentionSpan = Math.max(0, 1 - (sessionDuration / 90));
        const fatigueImpact = 1 - currentState.sessionFatigueIndex * 0.5;
        const performanceImpact = response.rating === 'again' ? 0.95 :
            response.rating === 'easy' ? 1.02 : 1.0;
        return Math.max(0, Math.min(1, baseAttentionSpan * fatigueImpact * performanceImpact));
    }
    calculateFlowStateMetrics(state) {
        const challengeSkillBalance = this.calculateChallengeSkillRatio(state);
        const engagementLevel = this.calculateEngagementLevel(state);
        const satisfactionPrediction = this.predictSessionSatisfaction(state);
        const momentumMaintenance = state.sessionMomentumScore >= this.FLOW_STATE_THRESHOLDS.OPTIMAL_MIN &&
            state.sessionMomentumScore <= this.FLOW_STATE_THRESHOLDS.OPTIMAL_MAX;
        return {
            challengeSkillBalance,
            engagementLevel,
            satisfactionPrediction,
            momentumMaintenance
        };
    }
    calculateChallengeSkillRatio(state) {
        const skillLevel = state.sessionMomentumScore;
        let challengeLevel = 0.5;
        if (state.adaptationHistory.length > 0) {
            const recentAdaptations = state.adaptationHistory.slice(-3);
            const challengeIncreases = recentAdaptations.filter(a => a.reason.includes('challenge')).length;
            const confidenceBoosters = recentAdaptations.filter(a => a.reason.includes('confidence')).length;
            challengeLevel = Math.max(0.1, Math.min(0.9, 0.5 + (challengeIncreases * 0.1) - (confidenceBoosters * 0.1)));
        }
        return skillLevel > 0 ? challengeLevel / skillLevel : 0.5;
    }
    calculateEngagementLevel(state) {
        let engagement = 0.5;
        engagement += (state.sessionMomentumScore - 0.5) * 0.4;
        engagement += (state.attentionSpanRemaining - 0.5) * 0.3;
        engagement -= state.sessionFatigueIndex * 0.3;
        engagement += (state.cognitiveLoadCapacity - 0.5) * 0.2;
        return Math.max(0, Math.min(1, engagement));
    }
    predictSessionSatisfaction(state) {
        let satisfaction = 0.7;
        const isInOptimalFlow = state.sessionMomentumScore >= this.FLOW_STATE_THRESHOLDS.OPTIMAL_MIN &&
            state.sessionMomentumScore <= this.FLOW_STATE_THRESHOLDS.OPTIMAL_MAX;
        if (isInOptimalFlow) {
            satisfaction += 0.2;
        }
        if (state.adaptationHistory.length > 0) {
            const recentSuccesses = state.adaptationHistory.slice(-5)
                .filter(a => a.reason.includes('optimal') || a.reason.includes('good')).length;
            satisfaction += (recentSuccesses / 5) * 0.1;
        }
        satisfaction -= state.sessionFatigueIndex * 0.2;
        const sessionMinutes = (Date.now() - new Date(state.sessionStartTime).getTime()) / (1000 * 60);
        if (sessionMinutes < 5) {
            satisfaction -= 0.1;
        }
        else if (sessionMinutes > 60) {
            satisfaction -= (sessionMinutes - 60) / 120;
        }
        return Math.max(0, Math.min(1, satisfaction));
    }
    analyzeMomentum(state) {
        const momentum = state.sessionMomentumScore;
        const fatigue = state.sessionFatigueIndex;
        const trend = state.momentumTrend;
        const sustainabilityScore = this.calculateSustainabilityScore(state);
        let recommendedAction;
        let reasoning;
        if (fatigue > this.FATIGUE_THRESHOLDS.CRITICAL) {
            recommendedAction = 'break';
            reasoning = 'Critical fatigue level detected. Take a break to recover.';
        }
        else if (momentum < 0.3 && trend === 'declining') {
            recommendedAction = 'boost';
            reasoning = 'Low momentum with declining trend. Need confidence boosters.';
        }
        else if (momentum > 0.8 && fatigue < this.FATIGUE_THRESHOLDS.MODERATE) {
            recommendedAction = 'maintain';
            reasoning = 'High momentum with manageable fatigue. Maintain current level.';
        }
        else if (momentum > 0.8 && fatigue > this.FATIGUE_THRESHOLDS.MODERATE) {
            recommendedAction = 'ease';
            reasoning = 'High momentum but elevated fatigue. Reduce challenge slightly.';
        }
        else {
            recommendedAction = 'maintain';
            reasoning = 'Momentum and fatigue levels are balanced.';
        }
        return {
            currentMomentum: momentum,
            trend,
            sustainabilityScore,
            recommendedAction,
            reasoning
        };
    }
    calculateSustainabilityScore(state) {
        let sustainability = 0.5;
        sustainability += (state.sessionMomentumScore * (1 - state.sessionFatigueIndex)) * 0.4;
        sustainability += state.cognitiveLoadCapacity * 0.3;
        sustainability += state.attentionSpanRemaining * 0.2;
        if (state.momentumTrend === 'improving') {
            sustainability += 0.1;
        }
        else if (state.momentumTrend === 'declining') {
            sustainability -= 0.1;
        }
        return Math.max(0, Math.min(1, sustainability));
    }
    analyzeFlowState(state) {
        const challengeSkillBalance = state.flowStateMetrics.challengeSkillBalance;
        const flowScore = this.calculateFlowScore(state);
        const isInFlowState = flowScore > 0.7 &&
            challengeSkillBalance >= this.FLOW_STATE_THRESHOLDS.CHALLENGE_SKILL_RATIO_OPTIMAL[0] &&
            challengeSkillBalance <= this.FLOW_STATE_THRESHOLDS.CHALLENGE_SKILL_RATIO_OPTIMAL[1];
        const recommendations = this.generateFlowRecommendations(state);
        return {
            isInFlowState,
            flowScore,
            challengeLevel: challengeSkillBalance * state.sessionMomentumScore,
            skillLevel: state.sessionMomentumScore,
            recommendations
        };
    }
    calculateFlowScore(state) {
        let flowScore = 0;
        flowScore += state.sessionMomentumScore * 0.4;
        flowScore += state.flowStateMetrics.engagementLevel * 0.3;
        flowScore += (1 - state.sessionFatigueIndex) * 0.2;
        flowScore += state.attentionSpanRemaining * 0.1;
        return Math.max(0, Math.min(1, flowScore));
    }
    generateFlowRecommendations(state) {
        const recommendations = [];
        const challengeSkillRatio = state.flowStateMetrics.challengeSkillBalance;
        if (challengeSkillRatio < this.FLOW_STATE_THRESHOLDS.CHALLENGE_SKILL_RATIO_OPTIMAL[0]) {
            recommendations.push({
                type: 'increase_challenge',
                reasoning: 'Challenge level too low for current skill level. Increase difficulty to maintain engagement.',
                confidence: 0.8
            });
        }
        else if (challengeSkillRatio > this.FLOW_STATE_THRESHOLDS.CHALLENGE_SKILL_RATIO_OPTIMAL[1]) {
            recommendations.push({
                type: 'decrease_challenge',
                reasoning: 'Challenge level too high. Reduce difficulty to prevent anxiety and maintain flow.',
                confidence: 0.8
            });
        }
        if (state.sessionFatigueIndex > this.FATIGUE_THRESHOLDS.HIGH) {
            recommendations.push({
                type: 'take_break',
                reasoning: 'High fatigue detected. A short break would help restore cognitive capacity.',
                confidence: 0.9
            });
        }
        if (state.sessionMomentumScore >= 0.4 && state.sessionMomentumScore <= 0.8 && state.sessionFatigueIndex < 0.6) {
            recommendations.push({
                type: 'maintain',
                reasoning: 'Currently in optimal flow state. Maintain current approach.',
                confidence: 0.9
            });
        }
        return recommendations;
    }
}
exports.UnifiedMomentumManager = UnifiedMomentumManager;
//# sourceMappingURL=unifiedMomentumManager.js.map