import { EnhancedResponseLog } from '../../../../shared/types/enhanced-types';
export interface OptimizationResult {
    parameters: number[];
    cost: number;
    iterations: number;
    converged: boolean;
    improvementPercentage: number;
}
export interface OptimizationConfig {
    maxIterations: number;
    learningRate: number;
    tolerance: number;
    regularization: number;
    minDataPoints: number;
}
export declare class FSRSParameterOptimizer {
    private defaultConfig;
    optimizeUserParameters(userId: string, reviewHistory: EnhancedResponseLog[], config?: Partial<OptimizationConfig>): Promise<OptimizationResult>;
    evaluateParameterPerformance(parameters: number[], trainingData: TrainingPoint[]): number;
    private prepareTrainingData;
    private groupReviewsByCard;
    private calculateGradients;
    private updateParameters;
    private applyParameterConstraints;
    private predictRetrievability;
    private getInitialParameters;
    private getBaselineCost;
    private calculateDaysBetween;
    private estimateDifficulty;
    private estimateStability;
    validateParameters(parameters: number[]): {
        valid: boolean;
        errors: string[];
    };
}
interface TrainingPoint {
    cardId: string;
    interval: number;
    previousDifficulty: number;
    previousStability: number;
    actualSuccess: boolean;
    responseTime: number;
    contextualFactors: any;
}
export {};
//# sourceMappingURL=parameterOptimizer.d.ts.map