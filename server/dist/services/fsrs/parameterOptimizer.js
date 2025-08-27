"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FSRSParameterOptimizer = void 0;
class FSRSParameterOptimizer {
    constructor() {
        this.defaultConfig = {
            maxIterations: 1000,
            learningRate: 0.001,
            tolerance: 1e-6,
            regularization: 0.01,
            minDataPoints: 50
        };
    }
    async optimizeUserParameters(userId, reviewHistory, config = {}) {
        const finalConfig = { ...this.defaultConfig, ...config };
        if (reviewHistory.length < finalConfig.minDataPoints) {
            throw new Error(`Insufficient data for optimization. Need at least ${finalConfig.minDataPoints} reviews, got ${reviewHistory.length}`);
        }
        console.log(`Starting parameter optimization for user ${userId} with ${reviewHistory.length} reviews`);
        const trainingData = this.prepareTrainingData(reviewHistory);
        let parameters = this.getInitialParameters();
        let bestParameters = [...parameters];
        let bestCost = this.evaluateParameterPerformance(parameters, trainingData);
        console.log(`Initial cost: ${bestCost.toFixed(6)}`);
        let iteration = 0;
        let previousCost = bestCost;
        let converged = false;
        for (iteration = 0; iteration < finalConfig.maxIterations; iteration++) {
            const gradients = this.calculateGradients(parameters, trainingData);
            const updatedParameters = this.updateParameters(parameters, gradients, finalConfig);
            const currentCost = this.evaluateParameterPerformance(updatedParameters, trainingData);
            if (currentCost < bestCost) {
                bestCost = currentCost;
                bestParameters = [...updatedParameters];
            }
            if (Math.abs(previousCost - currentCost) < finalConfig.tolerance) {
                converged = true;
                console.log(`Converged at iteration ${iteration} with cost ${currentCost.toFixed(6)}`);
                break;
            }
            parameters = updatedParameters;
            previousCost = currentCost;
            if (iteration % 100 === 0) {
                console.log(`Iteration ${iteration}: Cost = ${currentCost.toFixed(6)}`);
            }
        }
        const improvementPercentage = ((this.getBaselineCost(trainingData) - bestCost) / this.getBaselineCost(trainingData)) * 100;
        console.log(`Optimization completed: ${iteration} iterations, final cost: ${bestCost.toFixed(6)}, improvement: ${improvementPercentage.toFixed(2)}%`);
        return {
            parameters: bestParameters,
            cost: bestCost,
            iterations: iteration,
            converged: converged,
            improvementPercentage: improvementPercentage
        };
    }
    evaluateParameterPerformance(parameters, trainingData) {
        let sumSquaredError = 0;
        let count = 0;
        for (const point of trainingData) {
            try {
                const predicted = this.predictRetrievability(point, parameters);
                const actual = point.actualSuccess ? 1.0 : 0.0;
                const error = predicted - actual;
                sumSquaredError += error * error;
                count++;
            }
            catch (error) {
                continue;
            }
        }
        if (count === 0) {
            throw new Error('No valid training data points');
        }
        return Math.sqrt(sumSquaredError / count);
    }
    prepareTrainingData(reviewHistory) {
        const trainingData = [];
        const cardReviews = this.groupReviewsByCard(reviewHistory);
        for (const [cardId, reviews] of cardReviews.entries()) {
            reviews.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            for (let i = 1; i < reviews.length; i++) {
                const currentReview = reviews[i];
                const previousReview = reviews[i - 1];
                const interval = this.calculateDaysBetween(previousReview.timestamp, currentReview.timestamp);
                if (interval > 0) {
                    trainingData.push({
                        cardId: cardId,
                        interval: interval,
                        previousDifficulty: this.estimateDifficulty(reviews.slice(0, i)),
                        previousStability: this.estimateStability(reviews.slice(0, i)),
                        actualSuccess: currentReview.rating !== 'again',
                        responseTime: currentReview.responseTime,
                        contextualFactors: currentReview.contextualFactors
                    });
                }
            }
        }
        return trainingData;
    }
    groupReviewsByCard(reviews) {
        const grouped = new Map();
        for (const review of reviews) {
            const cardId = review.cardId || 'unknown';
            if (!grouped.has(cardId)) {
                grouped.set(cardId, []);
            }
            grouped.get(cardId).push(review);
        }
        return grouped;
    }
    calculateGradients(parameters, trainingData) {
        const gradients = new Array(21).fill(0);
        const epsilon = 1e-5;
        for (let i = 0; i < parameters.length; i++) {
            const parametersPlus = [...parameters];
            const parametersMinus = [...parameters];
            parametersPlus[i] += epsilon;
            parametersMinus[i] -= epsilon;
            const costPlus = this.evaluateParameterPerformance(parametersPlus, trainingData);
            const costMinus = this.evaluateParameterPerformance(parametersMinus, trainingData);
            gradients[i] = (costPlus - costMinus) / (2 * epsilon);
        }
        return gradients;
    }
    updateParameters(parameters, gradients, config, momentum = new Array(21).fill(0), momentumDecay = 0.9) {
        const updatedParameters = new Array(21);
        for (let i = 0; i < parameters.length; i++) {
            momentum[i] = momentumDecay * momentum[i] - config.learningRate * gradients[i];
            const regularizationTerm = config.regularization * parameters[i];
            updatedParameters[i] = parameters[i] + momentum[i] - config.learningRate * regularizationTerm;
            updatedParameters[i] = this.applyParameterConstraints(updatedParameters[i], i);
        }
        return updatedParameters;
    }
    applyParameterConstraints(value, parameterIndex) {
        const constraints = {
            0: { min: 0.1, max: 2.0 },
            1: { min: 0.1, max: 2.0 },
            2: { min: 1.0, max: 5.0 },
            3: { min: 2.0, max: 10.0 },
        };
        const constraint = constraints[parameterIndex];
        if (constraint) {
            return Math.max(constraint.min, Math.min(constraint.max, value));
        }
        return Math.max(0.01, Math.min(10.0, value));
    }
    predictRetrievability(point, parameters) {
        const stability = Math.max(0.1, point.previousStability);
        const retrievability = Math.exp(-point.interval / stability);
        return Math.max(0.01, Math.min(0.99, retrievability));
    }
    getInitialParameters() {
        return [
            0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94,
            2.18, 0.05, 0.34, 1.26, 0.29, 2.61, 0.62, 0.36, 0.26, 2.4
        ];
    }
    getBaselineCost(trainingData) {
        const defaultParameters = this.getInitialParameters();
        return this.evaluateParameterPerformance(defaultParameters, trainingData);
    }
    calculateDaysBetween(timestamp1, timestamp2) {
        const date1 = new Date(timestamp1);
        const date2 = new Date(timestamp2);
        return Math.abs(date2.getTime() - date1.getTime()) / (24 * 60 * 60 * 1000);
    }
    estimateDifficulty(reviews) {
        if (reviews.length === 0)
            return 5.0;
        const successRate = reviews.filter(r => r.rating !== 'again').length / reviews.length;
        return Math.max(1, Math.min(10, 5.0 + (1 - successRate) * 5));
    }
    estimateStability(reviews) {
        if (reviews.length === 0)
            return 1.0;
        const successRate = reviews.filter(r => r.rating !== 'again').length / reviews.length;
        const reviewCount = reviews.length;
        return Math.max(0.1, successRate * Math.sqrt(reviewCount));
    }
    validateParameters(parameters) {
        const errors = [];
        if (parameters.length !== 21) {
            errors.push(`Invalid parameter count: expected 21, got ${parameters.length}`);
        }
        for (let i = 0; i < parameters.length; i++) {
            if (!isFinite(parameters[i])) {
                errors.push(`Parameter ${i} is not finite: ${parameters[i]}`);
            }
        }
        for (let i = 0; i < parameters.length; i++) {
            if (parameters[i] < 0.001 || parameters[i] > 100) {
                errors.push(`Parameter ${i} is out of reasonable bounds: ${parameters[i]}`);
            }
        }
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
}
exports.FSRSParameterOptimizer = FSRSParameterOptimizer;
//# sourceMappingURL=parameterOptimizer.js.map