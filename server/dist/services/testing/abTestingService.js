"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ABTestingService = void 0;
class ABTestingService {
    constructor() {
        this.assignments = new Map();
        this.events = [];
    }
    async createTest(testConfig) {
        const test = {
            ...testConfig,
            id: this.generateTestId(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        this.validateTestConfig(test);
        console.log(`Created A/B test: ${test.name} (${test.id})`);
        return test;
    }
    async assignUserToTest(userId, testId) {
        const existingAssignment = this.assignments.get(`${userId}:${testId}`);
        if (existingAssignment) {
            return existingAssignment.variantId === 'control' ? 'control' : 'treatment';
        }
        const hash = this.hashUserId(userId + testId);
        const variant = hash % 2 === 0 ? 'control' : 'treatment';
        const assignment = {
            userId,
            testId,
            variantId: variant,
            assignedAt: new Date().toISOString(),
            sticky: true
        };
        this.assignments.set(`${userId}:${testId}`, assignment);
        return variant;
    }
    async assignUserToVariant(userId, testId, test, userSegments) {
        const existingAssignment = this.assignments.get(`${userId}:${testId}`);
        if (existingAssignment && existingAssignment.sticky) {
            return existingAssignment.variantId;
        }
        if (!this.isUserEligible(userId, test, userSegments)) {
            throw new Error(`User ${userId} not eligible for test ${testId}`);
        }
        const hash = this.hashUserId(userId + testId);
        const normalizedHash = hash / 2147483647;
        let cumulativeWeight = 0;
        let selectedVariant = test.variants[0];
        for (const variant of test.variants) {
            const weight = test.trafficSplit[variant.id] || 0;
            cumulativeWeight += weight;
            if (normalizedHash <= cumulativeWeight) {
                selectedVariant = variant;
                break;
            }
        }
        const assignment = {
            userId,
            testId,
            variantId: selectedVariant.id,
            assignedAt: new Date().toISOString(),
            sticky: true
        };
        this.assignments.set(`${userId}:${testId}`, assignment);
        console.log(`Assigned user ${userId} to variant ${selectedVariant.id} in test ${testId}`);
        return selectedVariant.id;
    }
    async trackEvent(userId, event) {
        if (!event.testName || !event.variant || !event.eventType) {
            throw new Error('Invalid A/B test event: missing required fields');
        }
        const enrichedEvent = {
            ...event,
            sessionId: event.sessionId || this.generateSessionId()
        };
        this.events.push(enrichedEvent);
        console.log(`Tracked A/B test event: ${event.eventType} for test ${event.testName}`);
    }
    async analyzeTestResults(testId, test) {
        console.log(`Analyzing results for test ${testId}`);
        const testEvents = this.events.filter(e => e.testName === test.name);
        if (testEvents.length === 0) {
            throw new Error(`No events found for test ${testId}`);
        }
        const variantData = this.groupEventsByVariant(testEvents);
        const variantMetrics = {};
        const sampleSizes = {};
        const conversionRates = {};
        for (const [variantId, events] of Object.entries(variantData)) {
            const metrics = this.calculateVariantMetrics(events);
            variantMetrics[variantId] = metrics;
            sampleSizes[variantId] = metrics.sampleSize;
            conversionRates[variantId] = this.calculateConversionRate(events);
        }
        const statisticalTests = await this.performStatisticalTests(variantMetrics);
        const recommendation = this.generateRecommendation(test, variantMetrics, statisticalTests);
        const analysis = this.analyzeTestQuality(test, variantData);
        const bayesianAnalysis = await this.performBayesianAnalysis(variantMetrics);
        const results = {
            testName: test.name,
            control: variantMetrics['control'] || variantMetrics[test.variants.find(v => v.isControl)?.id || ''],
            treatment: variantMetrics['treatment'] || variantMetrics[test.variants.find(v => !v.isControl)?.id || ''],
            significance: statisticalTests['primary']?.pValue || 1,
            recommendation: recommendation.action,
            test,
            sampleSizes,
            conversionRates,
            statisticalTests,
            bayesianAnalysis,
            recommendation,
            analysis
        };
        return results;
    }
    calculateVariantMetrics(events) {
        const values = events.map(e => e.value);
        if (values.length === 0) {
            return {
                values: [],
                mean: 0,
                variance: 0,
                sampleSize: 0
            };
        }
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1);
        return {
            values,
            mean,
            variance: Math.max(variance, 0),
            sampleSize: values.length
        };
    }
    async performStatisticalTests(variantMetrics) {
        const tests = {};
        const variants = Object.keys(variantMetrics);
        if (variants.length >= 2) {
            const variant1 = variantMetrics[variants[0]];
            const variant2 = variantMetrics[variants[1]];
            const tTest = this.performTTest(variant1, variant2);
            tests['primary'] = tTest;
            if (variants.length > 2) {
                for (let i = 0; i < variants.length - 1; i++) {
                    for (let j = i + 1; j < variants.length; j++) {
                        const variantA = variantMetrics[variants[i]];
                        const variantB = variantMetrics[variants[j]];
                        const test = this.performTTest(variantA, variantB);
                        tests[`${variants[i]}_vs_${variants[j]}`] = test;
                    }
                }
            }
        }
        return tests;
    }
    performTTest(metrics1, metrics2) {
        const n1 = metrics1.sampleSize;
        const n2 = metrics2.sampleSize;
        const mean1 = metrics1.mean;
        const mean2 = metrics2.mean;
        const var1 = metrics1.variance;
        const var2 = metrics2.variance;
        if (n1 === 0 || n2 === 0) {
            return {
                testType: 'ttest',
                pValue: 1,
                confidenceInterval: [0, 0],
                effectSize: 0,
                powerAnalysis: 0,
                isSignificant: false
            };
        }
        const pooledSE = Math.sqrt(var1 / n1 + var2 / n2);
        const tStatistic = (mean1 - mean2) / pooledSE;
        const df = Math.pow(var1 / n1 + var2 / n2, 2) /
            (Math.pow(var1 / n1, 2) / (n1 - 1) + Math.pow(var2 / n2, 2) / (n2 - 1));
        const pValue = this.calculatePValue(tStatistic, df);
        const pooledSD = Math.sqrt(((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2));
        const effectSize = (mean1 - mean2) / pooledSD;
        const criticalValue = this.getCriticalValue(df, 0.05);
        const marginOfError = criticalValue * pooledSE;
        const confidenceInterval = [
            (mean1 - mean2) - marginOfError,
            (mean1 - mean2) + marginOfError
        ];
        const powerAnalysis = this.calculatePower(effectSize, n1, n2);
        return {
            testType: 'welch',
            pValue,
            confidenceInterval,
            effectSize,
            powerAnalysis,
            isSignificant: pValue < 0.05
        };
    }
    generateRecommendation(test, variantMetrics, statisticalTests) {
        const primaryTest = statisticalTests['primary'];
        if (!primaryTest) {
            return {
                action: 'continue',
                confidence: 0,
                reasoning: 'Insufficient data for analysis',
                implementationNotes: ['Collect more data before making decisions']
            };
        }
        const variants = Object.keys(variantMetrics);
        const minSampleSize = test.minimumSampleSize;
        const hasEnoughSamples = variants.every(v => variantMetrics[v].sampleSize >= minSampleSize);
        if (primaryTest.isSignificant && hasEnoughSamples) {
            const winner = this.determineWinner(variantMetrics);
            const effectSize = Math.abs(primaryTest.effectSize);
            if (effectSize > 0.2) {
                return {
                    action: 'stop_winner',
                    winner,
                    confidence: (1 - primaryTest.pValue) * 100,
                    reasoning: `Statistically significant result (p=${primaryTest.pValue.toFixed(4)}) with meaningful effect size (${effectSize.toFixed(2)})`,
                    implementationNotes: [
                        `Implement ${winner} variant`,
                        'Monitor for any unexpected changes post-implementation',
                        'Consider gradual rollout to mitigate risk'
                    ]
                };
            }
        }
        if (hasEnoughSamples) {
            const practicalDifference = this.calculatePracticalDifference(variantMetrics);
            if (practicalDifference < 0.01) {
                return {
                    action: 'stop_no_effect',
                    confidence: 85,
                    reasoning: 'No meaningful practical difference observed between variants',
                    implementationNotes: [
                        'No changes needed - current implementation is adequate',
                        'Consider testing different hypotheses',
                        'Document learnings for future test design'
                    ]
                };
            }
        }
        if (!hasEnoughSamples) {
            const samplesNeeded = minSampleSize - Math.min(...variants.map(v => variantMetrics[v].sampleSize));
            return {
                action: 'continue',
                confidence: 70,
                reasoning: `Need ${samplesNeeded} more samples per variant to reach minimum sample size`,
                implementationNotes: [
                    `Continue test until ${minSampleSize} samples per variant`,
                    'Monitor test for any data quality issues',
                    'Consider increasing traffic allocation if timeline is critical'
                ]
            };
        }
        return {
            action: 'extend',
            confidence: 60,
            reasoning: 'Test approaching significance but needs more time for conclusive results',
            implementationNotes: [
                'Extend test duration to capture more samples',
                'Monitor for seasonal or temporal effects',
                'Consider increasing statistical power through sample size'
            ]
        };
    }
    async performBayesianAnalysis(variantMetrics) {
        const variants = Object.keys(variantMetrics);
        if (variants.length < 2) {
            return {
                posteriorProbabilities: {},
                credibleInterval: [0, 0],
                probabilityOfImprovement: 0.5,
                expectedLift: 0
            };
        }
        const control = variantMetrics[variants[0]];
        const treatment = variantMetrics[variants[1]];
        const probabilityOfImprovement = treatment.mean > control.mean ? 0.7 : 0.3;
        const expectedLift = (treatment.mean - control.mean) / control.mean;
        return {
            posteriorProbabilities: {
                [variants[0]]: 0.3,
                [variants[1]]: 0.7
            },
            credibleInterval: [expectedLift * 0.8, expectedLift * 1.2],
            probabilityOfImprovement,
            expectedLift
        };
    }
    analyzeTestQuality(test, variantData) {
        const totalSamples = Object.values(variantData).reduce((sum, events) => sum + events.length, 0);
        const targetSamples = test.variants.length * test.minimumSampleSize;
        const potentialBias = [];
        const sampleSizes = Object.values(variantData).map(events => events.length);
        const maxSample = Math.max(...sampleSizes);
        const minSample = Math.min(...sampleSizes);
        if (maxSample > minSample * 1.5) {
            potentialBias.push('Unbalanced sample sizes between variants');
        }
        const timeRanges = Object.values(variantData).map(events => {
            const times = events.map(e => new Date(e.sessionId).getTime());
            return Math.max(...times) - Math.min(...times);
        });
        if (Math.max(...timeRanges) - Math.min(...timeRanges) > 7 * 24 * 60 * 60 * 1000) {
            potentialBias.push('Significant temporal differences in data collection');
        }
        let dataQuality = 1.0;
        dataQuality -= potentialBias.length * 0.1;
        dataQuality = Math.max(0, dataQuality);
        return {
            samplesCollected: totalSamples,
            samplesNeeded: Math.max(0, targetSamples - totalSamples),
            potentialBias,
            dataQuality,
            timeToCompletion: this.estimateTimeToCompletion(totalSamples, targetSamples)
        };
    }
    validateTestConfig(test) {
        if (test.variants.length < 2) {
            throw new Error('Test must have at least 2 variants');
        }
        const totalTraffic = Object.values(test.trafficSplit).reduce((sum, weight) => sum + weight, 0);
        if (Math.abs(totalTraffic - 1.0) > 0.01) {
            throw new Error('Traffic split must sum to 1.0');
        }
        const hasControl = test.variants.some(v => v.isControl);
        if (!hasControl) {
            throw new Error('Test must have at least one control variant');
        }
    }
    hashUserId(input) {
        let hash = 0;
        for (let i = 0; i < input.length; i++) {
            const char = input.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }
    generateTestId() {
        return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    isUserEligible(userId, test, userSegments) {
        return test.status === 'active';
    }
    groupEventsByVariant(events) {
        return events.reduce((groups, event) => {
            const variant = event.variant;
            if (!groups[variant]) {
                groups[variant] = [];
            }
            groups[variant].push(event);
            return groups;
        }, {});
    }
    calculateConversionRate(events) {
        if (events.length === 0)
            return 0;
        const conversions = events.filter(e => e.eventType === 'conversion' || e.value > 0).length;
        return conversions / events.length;
    }
    calculatePValue(tStatistic, df) {
        const absT = Math.abs(tStatistic);
        if (absT > 3)
            return 0.001;
        if (absT > 2.5)
            return 0.01;
        if (absT > 1.96)
            return 0.05;
        if (absT > 1)
            return 0.1;
        return 0.5;
    }
    getCriticalValue(df, alpha) {
        if (alpha <= 0.01)
            return 2.58;
        if (alpha <= 0.05)
            return 1.96;
        return 1.65;
    }
    calculatePower(effectSize, n1, n2) {
        const avgN = (n1 + n2) / 2;
        const power = Math.min(1, Math.abs(effectSize) * Math.sqrt(avgN) / 2.8);
        return power;
    }
    determineWinner(variantMetrics) {
        let bestVariant = '';
        let bestMean = -Infinity;
        for (const [variant, metrics] of Object.entries(variantMetrics)) {
            if (metrics.mean > bestMean) {
                bestMean = metrics.mean;
                bestVariant = variant;
            }
        }
        return bestVariant;
    }
    calculatePracticalDifference(variantMetrics) {
        const means = Object.values(variantMetrics).map(m => m.mean);
        const maxMean = Math.max(...means);
        const minMean = Math.min(...means);
        if (maxMean === 0)
            return 0;
        return Math.abs(maxMean - minMean) / maxMean;
    }
    estimateTimeToCompletion(currentSamples, targetSamples) {
        if (currentSamples >= targetSamples)
            return 'Complete';
        const remaining = targetSamples - currentSamples;
        const dailyRate = currentSamples / 7;
        const daysRemaining = Math.ceil(remaining / Math.max(dailyRate, 1));
        return `~${daysRemaining} days`;
    }
}
exports.ABTestingService = ABTestingService;
//# sourceMappingURL=abTestingService.js.map