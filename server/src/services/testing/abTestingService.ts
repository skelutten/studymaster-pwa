import { ABTestEvent, ABTestResults, TestMetrics } from '../../../../shared/types/enhanced-types';

export interface ABTest {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  variants: ABTestVariant[];
  trafficSplit: Record<string, number>; // variant -> percentage (0-1)
  startDate: string;
  endDate?: string;
  targetMetrics: string[];
  minimumSampleSize: number;
  confidenceLevel: number; // 0.95 = 95% confidence
  createdAt: string;
  updatedAt: string;
}

export interface ABTestVariant {
  id: string;
  name: string;
  description: string;
  config: Record<string, any>; // Feature configuration
  isControl: boolean;
}

export interface ABTestAssignment {
  userId: string;
  testId: string;
  variantId: string;
  assignedAt: string;
  sticky: boolean; // Whether user stays in same variant
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
  dataQuality: number; // 0-1
  segmentAnalysis?: Record<string, any>;
}

export class ABTestingService {
  private assignments: Map<string, ABTestAssignment> = new Map();
  private events: ABTestEvent[] = [];

  /**
   * Create new A/B test
   */
  async createTest(testConfig: Omit<ABTest, 'id' | 'createdAt' | 'updatedAt'>): Promise<ABTest> {
    const test: ABTest = {
      ...testConfig,
      id: this.generateTestId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Validate test configuration
    this.validateTestConfig(test);

    // Store test (in real implementation, this would save to database)
    console.log(`Created A/B test: ${test.name} (${test.id})`);
    
    return test;
  }

  /**
   * Assign user to test variant
   */
  async assignUserToTest(userId: string, testId: string): Promise<'control' | 'treatment'> {
    // Check if user is already assigned
    const existingAssignment = this.assignments.get(`${userId}:${testId}`);
    if (existingAssignment) {
      return existingAssignment.variantId === 'control' ? 'control' : 'treatment';
    }

    // Deterministic assignment based on user ID and test ID
    const hash = this.hashUserId(userId + testId);
    const variant = hash % 2 === 0 ? 'control' : 'treatment';
    
    // Store assignment
    const assignment: ABTestAssignment = {
      userId,
      testId,
      variantId: variant,
      assignedAt: new Date().toISOString(),
      sticky: true
    };
    
    this.assignments.set(`${userId}:${testId}`, assignment);
    
    return variant;
  }

  /**
   * Advanced user assignment with traffic splitting and segmentation
   */
  async assignUserToVariant(
    userId: string, 
    testId: string, 
    test: ABTest,
    userSegments?: string[]
  ): Promise<string> {
    // Check existing assignment
    const existingAssignment = this.assignments.get(`${userId}:${testId}`);
    if (existingAssignment && existingAssignment.sticky) {
      return existingAssignment.variantId;
    }

    // Check if user is eligible for test
    if (!this.isUserEligible(userId, test, userSegments)) {
      throw new Error(`User ${userId} not eligible for test ${testId}`);
    }

    // Deterministic assignment using hash
    const hash = this.hashUserId(userId + testId);
    const normalizedHash = hash / 2147483647; // Normalize to 0-1

    // Find variant based on traffic split
    let cumulativeWeight = 0;
    let selectedVariant = test.variants[0]; // Default to first variant

    for (const variant of test.variants) {
      const weight = test.trafficSplit[variant.id] || 0;
      cumulativeWeight += weight;
      
      if (normalizedHash <= cumulativeWeight) {
        selectedVariant = variant;
        break;
      }
    }

    // Store assignment
    const assignment: ABTestAssignment = {
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

  /**
   * Track A/B test event
   */
  async trackEvent(userId: string, event: ABTestEvent): Promise<void> {
    // Validate event
    if (!event.testName || !event.variant || !event.eventType) {
      throw new Error('Invalid A/B test event: missing required fields');
    }

    // Add timestamp if not provided
    const enrichedEvent: ABTestEvent = {
      ...event,
      sessionId: event.sessionId || this.generateSessionId()
    };

    this.events.push(enrichedEvent);

    // Store event (in real implementation, this would save to database)
    console.log(`Tracked A/B test event: ${event.eventType} for test ${event.testName}`);
  }

  /**
   * Get comprehensive test results with statistical analysis
   */
  async analyzeTestResults(testId: string, test: ABTest): Promise<TestResults> {
    console.log(`Analyzing results for test ${testId}`);

    // Get events for this test
    const testEvents = this.events.filter(e => e.testName === test.name);
    
    if (testEvents.length === 0) {
      throw new Error(`No events found for test ${testId}`);
    }

    // Group events by variant
    const variantData = this.groupEventsByVariant(testEvents);

    // Calculate basic metrics for each variant
    const variantMetrics: Record<string, TestMetrics> = {};
    const sampleSizes: Record<string, number> = {};
    const conversionRates: Record<string, number> = {};

    for (const [variantId, events] of Object.entries(variantData)) {
      const metrics = this.calculateVariantMetrics(events);
      variantMetrics[variantId] = metrics;
      sampleSizes[variantId] = metrics.sampleSize;
      conversionRates[variantId] = this.calculateConversionRate(events);
    }

    // Perform statistical tests
    const statisticalTests = await this.performStatisticalTests(variantMetrics);

    // Generate recommendation
    const recommendation = this.generateRecommendation(test, variantMetrics, statisticalTests);

    // Analyze test quality and completion
    const analysis = this.analyzeTestQuality(test, variantData);

    // Bayesian analysis (optional, advanced)
    const bayesianAnalysis = await this.performBayesianAnalysis(variantMetrics);

    const results: TestResults = {
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

  /**
   * Calculate variant metrics
   */
  private calculateVariantMetrics(events: ABTestEvent[]): TestMetrics {
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
      variance: Math.max(variance, 0), // Ensure non-negative
      sampleSize: values.length
    };
  }

  /**
   * Perform statistical tests
   */
  private async performStatisticalTests(
    variantMetrics: Record<string, TestMetrics>
  ): Promise<Record<string, StatisticalTest>> {
    const tests: Record<string, StatisticalTest> = {};

    const variants = Object.keys(variantMetrics);
    
    if (variants.length >= 2) {
      // Two-sample t-test between first two variants
      const variant1 = variantMetrics[variants[0]];
      const variant2 = variantMetrics[variants[1]];

      const tTest = this.performTTest(variant1, variant2);
      tests['primary'] = tTest;

      // Additional pairwise tests if more than 2 variants
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

  /**
   * Perform two-sample t-test
   */
  private performTTest(metrics1: TestMetrics, metrics2: TestMetrics): StatisticalTest {
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

    // Welch's t-test (unequal variances)
    const pooledSE = Math.sqrt(var1/n1 + var2/n2);
    const tStatistic = (mean1 - mean2) / pooledSE;
    
    // Degrees of freedom for Welch's t-test
    const df = Math.pow(var1/n1 + var2/n2, 2) / 
               (Math.pow(var1/n1, 2)/(n1-1) + Math.pow(var2/n2, 2)/(n2-1));

    // Approximate p-value calculation (simplified)
    const pValue = this.calculatePValue(tStatistic, df);

    // Effect size (Cohen's d)
    const pooledSD = Math.sqrt(((n1-1)*var1 + (n2-1)*var2) / (n1+n2-2));
    const effectSize = (mean1 - mean2) / pooledSD;

    // Confidence interval for difference in means
    const criticalValue = this.getCriticalValue(df, 0.05); // 95% confidence
    const marginOfError = criticalValue * pooledSE;
    const confidenceInterval: [number, number] = [
      (mean1 - mean2) - marginOfError,
      (mean1 - mean2) + marginOfError
    ];

    // Power analysis (simplified)
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

  /**
   * Generate test recommendation
   */
  private generateRecommendation(
    test: ABTest,
    variantMetrics: Record<string, TestMetrics>,
    statisticalTests: Record<string, StatisticalTest>
  ): TestRecommendation {
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

    // Check statistical significance
    if (primaryTest.isSignificant && hasEnoughSamples) {
      const winner = this.determineWinner(variantMetrics);
      const effectSize = Math.abs(primaryTest.effectSize);
      
      if (effectSize > 0.2) { // Meaningful effect size
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

    // Check for practical significance even without statistical significance
    if (hasEnoughSamples) {
      const practicalDifference = this.calculatePracticalDifference(variantMetrics);
      if (practicalDifference < 0.01) { // Less than 1% difference
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

    // Decide whether to continue or extend
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

  /**
   * Perform Bayesian analysis (advanced)
   */
  private async performBayesianAnalysis(
    variantMetrics: Record<string, TestMetrics>
  ): Promise<BayesianResults> {
    // Simplified Bayesian analysis
    // In production, you'd use proper Bayesian inference libraries
    
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

    // Simplified calculation - use Beta distribution for conversion rates
    const probabilityOfImprovement = treatment.mean > control.mean ? 0.7 : 0.3; // Simplified
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

  /**
   * Analyze test quality
   */
  private analyzeTestQuality(test: ABTest, variantData: Record<string, ABTestEvent[]>): TestAnalysis {
    const totalSamples = Object.values(variantData).reduce((sum, events) => sum + events.length, 0);
    const targetSamples = test.variants.length * test.minimumSampleSize;
    
    // Identify potential biases
    const potentialBias: string[] = [];
    
    // Check for imbalanced samples
    const sampleSizes = Object.values(variantData).map(events => events.length);
    const maxSample = Math.max(...sampleSizes);
    const minSample = Math.min(...sampleSizes);
    
    if (maxSample > minSample * 1.5) {
      potentialBias.push('Unbalanced sample sizes between variants');
    }

    // Check for temporal bias
    const timeRanges = Object.values(variantData).map(events => {
      const times = events.map(e => new Date(e.sessionId).getTime()); // Simplified
      return Math.max(...times) - Math.min(...times);
    });
    
    if (Math.max(...timeRanges) - Math.min(...timeRanges) > 7 * 24 * 60 * 60 * 1000) { // 7 days
      potentialBias.push('Significant temporal differences in data collection');
    }

    // Calculate data quality score
    let dataQuality = 1.0;
    dataQuality -= potentialBias.length * 0.1; // Each bias reduces quality by 10%
    dataQuality = Math.max(0, dataQuality);

    return {
      samplesCollected: totalSamples,
      samplesNeeded: Math.max(0, targetSamples - totalSamples),
      potentialBias,
      dataQuality,
      timeToCompletion: this.estimateTimeToCompletion(totalSamples, targetSamples)
    };
  }

  // Helper methods

  private validateTestConfig(test: ABTest): void {
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

  private hashUserId(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  private generateTestId(): string {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private isUserEligible(userId: string, test: ABTest, userSegments?: string[]): boolean {
    // Implement eligibility logic based on test criteria
    // For now, all users are eligible
    return test.status === 'active';
  }

  private groupEventsByVariant(events: ABTestEvent[]): Record<string, ABTestEvent[]> {
    return events.reduce((groups, event) => {
      const variant = event.variant;
      if (!groups[variant]) {
        groups[variant] = [];
      }
      groups[variant].push(event);
      return groups;
    }, {} as Record<string, ABTestEvent[]>);
  }

  private calculateConversionRate(events: ABTestEvent[]): number {
    if (events.length === 0) return 0;
    
    const conversions = events.filter(e => e.eventType === 'conversion' || e.value > 0).length;
    return conversions / events.length;
  }

  private calculatePValue(tStatistic: number, df: number): number {
    // Simplified p-value calculation - use proper statistical library in production
    const absT = Math.abs(tStatistic);
    
    if (absT > 3) return 0.001;
    if (absT > 2.5) return 0.01;
    if (absT > 1.96) return 0.05;
    if (absT > 1) return 0.1;
    
    return 0.5;
  }

  private getCriticalValue(df: number, alpha: number): number {
    // Simplified critical value - use proper statistical tables in production
    if (alpha <= 0.01) return 2.58;
    if (alpha <= 0.05) return 1.96;
    return 1.65;
  }

  private calculatePower(effectSize: number, n1: number, n2: number): number {
    // Simplified power calculation
    const avgN = (n1 + n2) / 2;
    const power = Math.min(1, Math.abs(effectSize) * Math.sqrt(avgN) / 2.8);
    return power;
  }

  private determineWinner(variantMetrics: Record<string, TestMetrics>): string {
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

  private calculatePracticalDifference(variantMetrics: Record<string, TestMetrics>): number {
    const means = Object.values(variantMetrics).map(m => m.mean);
    const maxMean = Math.max(...means);
    const minMean = Math.min(...means);
    
    if (maxMean === 0) return 0;
    return Math.abs(maxMean - minMean) / maxMean;
  }

  private estimateTimeToCompletion(currentSamples: number, targetSamples: number): string {
    if (currentSamples >= targetSamples) return 'Complete';
    
    const remaining = targetSamples - currentSamples;
    const dailyRate = currentSamples / 7; // Assume 7 days of data
    const daysRemaining = Math.ceil(remaining / Math.max(dailyRate, 1));
    
    return `~${daysRemaining} days`;
  }
}