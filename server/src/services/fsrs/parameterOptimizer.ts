import { EnhancedResponseLog, UserProfile } from '../../../../shared/types/enhanced-types';

export interface OptimizationResult {
  parameters: number[];
  cost: number; // RMSE or other loss metric
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

export class FSRSParameterOptimizer {
  private defaultConfig: OptimizationConfig = {
    maxIterations: 1000,
    learningRate: 0.001,
    tolerance: 1e-6,
    regularization: 0.01,
    minDataPoints: 50
  };

  /**
   * Optimize FSRS parameters for a specific user based on their review history
   */
  async optimizeUserParameters(
    userId: string, 
    reviewHistory: EnhancedResponseLog[],
    config: Partial<OptimizationConfig> = {}
  ): Promise<OptimizationResult> {
    const finalConfig = { ...this.defaultConfig, ...config };
    
    // Validate input data
    if (reviewHistory.length < finalConfig.minDataPoints) {
      throw new Error(`Insufficient data for optimization. Need at least ${finalConfig.minDataPoints} reviews, got ${reviewHistory.length}`);
    }

    console.log(`Starting parameter optimization for user ${userId} with ${reviewHistory.length} reviews`);

    // Prepare training data
    const trainingData = this.prepareTrainingData(reviewHistory);
    
    // Initial parameters (default FSRS parameters)
    let parameters = this.getInitialParameters();
    let bestParameters = [...parameters];
    let bestCost = this.evaluateParameterPerformance(parameters, trainingData);
    
    console.log(`Initial cost: ${bestCost.toFixed(6)}`);

    // Gradient descent optimization
    let iteration = 0;
    let previousCost = bestCost;
    let converged = false;

    for (iteration = 0; iteration < finalConfig.maxIterations; iteration++) {
      // Calculate gradients
      const gradients = this.calculateGradients(parameters, trainingData);
      
      // Update parameters using gradient descent with momentum
      const updatedParameters = this.updateParameters(parameters, gradients, finalConfig);
      
      // Evaluate new parameters
      const currentCost = this.evaluateParameterPerformance(updatedParameters, trainingData);
      
      // Check for improvement
      if (currentCost < bestCost) {
        bestCost = currentCost;
        bestParameters = [...updatedParameters];
      }
      
      // Check for convergence
      if (Math.abs(previousCost - currentCost) < finalConfig.tolerance) {
        converged = true;
        console.log(`Converged at iteration ${iteration} with cost ${currentCost.toFixed(6)}`);
        break;
      }
      
      parameters = updatedParameters;
      previousCost = currentCost;
      
      // Log progress every 100 iterations
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

  /**
   * Evaluate parameter performance using Root Mean Square Error (RMSE)
   */
  evaluateParameterPerformance(
    parameters: number[], 
    trainingData: TrainingPoint[]
  ): number {
    let sumSquaredError = 0;
    let count = 0;

    for (const point of trainingData) {
      try {
        // Predict retrievability using current parameters
        const predicted = this.predictRetrievability(point, parameters);
        const actual = point.actualSuccess ? 1.0 : 0.0;
        
        // Calculate squared error
        const error = predicted - actual;
        sumSquaredError += error * error;
        count++;
      } catch (error) {
        // Skip invalid data points
        continue;
      }
    }

    if (count === 0) {
      throw new Error('No valid training data points');
    }

    // Return RMSE
    return Math.sqrt(sumSquaredError / count);
  }

  /**
   * Prepare training data from review history
   */
  private prepareTrainingData(reviewHistory: EnhancedResponseLog[]): TrainingPoint[] {
    const trainingData: TrainingPoint[] = [];
    
    // Group reviews by cards to track intervals and success rates
    const cardReviews = this.groupReviewsByCard(reviewHistory);
    
    for (const [cardId, reviews] of cardReviews.entries()) {
      // Sort reviews by timestamp
      reviews.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      for (let i = 1; i < reviews.length; i++) {
        const currentReview = reviews[i];
        const previousReview = reviews[i - 1];
        
        // Calculate interval between reviews
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

  /**
   * Group reviews by card ID
   */
  private groupReviewsByCard(reviews: EnhancedResponseLog[]): Map<string, EnhancedResponseLog[]> {
    const grouped = new Map<string, EnhancedResponseLog[]>();
    
    // Note: We need to extend EnhancedResponseLog to include cardId
    // For now, we'll use a placeholder approach
    for (const review of reviews) {
      const cardId = (review as any).cardId || 'unknown';
      if (!grouped.has(cardId)) {
        grouped.set(cardId, []);
      }
      grouped.get(cardId)!.push(review);
    }
    
    return grouped;
  }

  /**
   * Calculate gradients for parameter optimization
   */
  private calculateGradients(parameters: number[], trainingData: TrainingPoint[]): number[] {
    const gradients = new Array(21).fill(0);
    const epsilon = 1e-5; // Small value for numerical differentiation
    
    for (let i = 0; i < parameters.length; i++) {
      // Calculate partial derivative using numerical differentiation
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

  /**
   * Update parameters using gradient descent with momentum and regularization
   */
  private updateParameters(
    parameters: number[], 
    gradients: number[], 
    config: OptimizationConfig,
    momentum: number[] = new Array(21).fill(0),
    momentumDecay: number = 0.9
  ): number[] {
    const updatedParameters = new Array(21);
    
    for (let i = 0; i < parameters.length; i++) {
      // Update momentum
      momentum[i] = momentumDecay * momentum[i] - config.learningRate * gradients[i];
      
      // Apply regularization (L2)
      const regularizationTerm = config.regularization * parameters[i];
      
      // Update parameter
      updatedParameters[i] = parameters[i] + momentum[i] - config.learningRate * regularizationTerm;
      
      // Apply parameter constraints
      updatedParameters[i] = this.applyParameterConstraints(updatedParameters[i], i);
    }
    
    return updatedParameters;
  }

  /**
   * Apply constraints to keep parameters within reasonable bounds
   */
  private applyParameterConstraints(value: number, parameterIndex: number): number {
    // Different constraints for different parameters based on FSRS research
    const constraints: { [key: number]: { min: number; max: number } } = {
      0: { min: 0.1, max: 2.0 },   // w0: Initial stability for new cards
      1: { min: 0.1, max: 2.0 },   // w1: Initial stability for learning cards
      2: { min: 1.0, max: 5.0 },   // w2: Initial difficulty
      3: { min: 2.0, max: 10.0 },  // w3: Difficulty decay
      // Add more constraints as needed
    };
    
    const constraint = constraints[parameterIndex];
    if (constraint) {
      return Math.max(constraint.min, Math.min(constraint.max, value));
    }
    
    // Default constraints
    return Math.max(0.01, Math.min(10.0, value));
  }

  /**
   * Predict retrievability using FSRS formula
   */
  private predictRetrievability(point: TrainingPoint, parameters: number[]): number {
    // Simplified FSRS retrievability prediction
    // R = e^(-t/S) where t is interval and S is stability
    const stability = Math.max(0.1, point.previousStability);
    const retrievability = Math.exp(-point.interval / stability);
    
    return Math.max(0.01, Math.min(0.99, retrievability));
  }

  /**
   * Get initial parameters (default FSRS parameters)
   */
  private getInitialParameters(): number[] {
    return [
      0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94,
      2.18, 0.05, 0.34, 1.26, 0.29, 2.61, 0.62, 0.36, 0.26, 2.4
    ];
  }

  /**
   * Calculate baseline cost for comparison
   */
  private getBaselineCost(trainingData: TrainingPoint[]): number {
    // Use default parameters as baseline
    const defaultParameters = this.getInitialParameters();
    return this.evaluateParameterPerformance(defaultParameters, trainingData);
  }

  /**
   * Calculate days between two timestamps
   */
  private calculateDaysBetween(timestamp1: string, timestamp2: string): number {
    const date1 = new Date(timestamp1);
    const date2 = new Date(timestamp2);
    return Math.abs(date2.getTime() - date1.getTime()) / (24 * 60 * 60 * 1000);
  }

  /**
   * Estimate difficulty from review history
   */
  private estimateDifficulty(reviews: EnhancedResponseLog[]): number {
    if (reviews.length === 0) return 5.0;
    
    // Calculate success rate
    const successRate = reviews.filter(r => r.rating !== 'again').length / reviews.length;
    
    // Convert success rate to difficulty (inverse relationship)
    return Math.max(1, Math.min(10, 5.0 + (1 - successRate) * 5));
  }

  /**
   * Estimate stability from review history
   */
  private estimateStability(reviews: EnhancedResponseLog[]): number {
    if (reviews.length === 0) return 1.0;
    
    // Simple estimation based on review count and success rate
    const successRate = reviews.filter(r => r.rating !== 'again').length / reviews.length;
    const reviewCount = reviews.length;
    
    // More reviews and higher success rate = higher stability
    return Math.max(0.1, successRate * Math.sqrt(reviewCount));
  }

  /**
   * Validate optimized parameters
   */
  validateParameters(parameters: number[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (parameters.length !== 21) {
      errors.push(`Invalid parameter count: expected 21, got ${parameters.length}`);
    }
    
    // Check for NaN or infinite values
    for (let i = 0; i < parameters.length; i++) {
      if (!isFinite(parameters[i])) {
        errors.push(`Parameter ${i} is not finite: ${parameters[i]}`);
      }
    }
    
    // Check reasonable bounds
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

// Training data structure
interface TrainingPoint {
  cardId: string;
  interval: number;
  previousDifficulty: number;
  previousStability: number;
  actualSuccess: boolean;
  responseTime: number;
  contextualFactors: any;
}