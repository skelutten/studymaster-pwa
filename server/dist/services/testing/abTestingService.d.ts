import { ABTestEvent, ABTestResults } from '../../../../shared/types/enhanced-types';
export interface ABTest {
    id: string;
    name: string;
    description: string;
    status: 'draft' | 'active' | 'paused' | 'completed';
    variants: ABTestVariant[];
    trafficSplit: Record<string, number>;
    startDate: string;
    endDate?: string;
    targetMetrics: string[];
    minimumSampleSize: number;
    confidenceLevel: number;
    createdAt: string;
    updatedAt: string;
}
export interface ABTestVariant {
    id: string;
    name: string;
    description: string;
    config: Record<string, any>;
    isControl: boolean;
}
export interface ABTestAssignment {
    userId: string;
    testId: string;
    variantId: string;
    assignedAt: string;
    sticky: boolean;
}
export interface StatisticalTest {
    testType: 'ttest' | 'chisquare' | 'welch';
    pValue: number;
    confidenceInterval: [number, number];
    effectSize: number;
    powerAnalysis: number;
    isSignificant: boolean;
}
export interface TestResults extends ABTestResults {
    test: ABTest;
    sampleSizes: Record<string, number>;
    conversionRates: Record<string, number>;
    statisticalTests: Record<string, StatisticalTest>;
    bayesianAnalysis?: BayesianResults;
    recommendation: TestRecommendation;
    analysis: TestAnalysis;
}
export interface BayesianResults {
    posteriorProbabilities: Record<string, number>;
    credibleInterval: [number, number];
    probabilityOfImprovement: number;
    expectedLift: number;
}
export interface TestRecommendation {
    action: 'continue' | 'stop_winner' | 'stop_no_effect' | 'extend' | 'redesign';
    winner?: string;
    confidence: number;
    reasoning: string;
    implementationNotes: string[];
}
export interface TestAnalysis {
    samplesCollected: number;
    samplesNeeded: number;
    timeToCompletion?: string;
    potentialBias: string[];
    dataQuality: number;
    segmentAnalysis?: Record<string, any>;
}
export declare class ABTestingService {
    private assignments;
    private events;
    createTest(testConfig: Omit<ABTest, 'id' | 'createdAt' | 'updatedAt'>): Promise<ABTest>;
    assignUserToTest(userId: string, testId: string): Promise<'control' | 'treatment'>;
    assignUserToVariant(userId: string, testId: string, test: ABTest, userSegments?: string[]): Promise<string>;
    trackEvent(userId: string, event: ABTestEvent): Promise<void>;
    analyzeTestResults(testId: string, test: ABTest): Promise<TestResults>;
    private calculateVariantMetrics;
    private performStatisticalTests;
    private performTTest;
    private generateRecommendation;
    private performBayesianAnalysis;
    private analyzeTestQuality;
    private validateTestConfig;
    private hashUserId;
    private generateTestId;
    private generateSessionId;
    private isUserEligible;
    private groupEventsByVariant;
    private calculateConversionRate;
    private calculatePValue;
    private getCriticalValue;
    private calculatePower;
    private determineWinner;
    private calculatePracticalDifference;
    private estimateTimeToCompletion;
}
//# sourceMappingURL=abTestingService.d.ts.map