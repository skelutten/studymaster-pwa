import { 
  UnifiedSessionState, 
  UnifiedCard, 
  CardSelectionResult,
  EnvironmentalContext,
  MomentumTrend,
  FlowStateMetrics
} from '../../../../shared/types/enhanced-types';
import { UnifiedCardSelector } from '../selection/unifiedCardSelector';

export interface QueueGenerationResult {
  reviewQueue: UnifiedCard[];
  lookaheadBuffer: UnifiedCard[];
  emergencyBuffer: UnifiedCard[];
  challengeReserve: UnifiedCard[];
  adaptationLog: string[];
}

export class UnifiedAdaptiveQueueManager {
  private cardSelector: UnifiedCardSelector;

  constructor() {
    this.cardSelector = new UnifiedCardSelector();
  }

  /**
   * Generate adaptive queue based on current session state
   */
  async generateAdaptiveQueue(
    sessionState: UnifiedSessionState,
    availableCards: UnifiedCard[],
    environmentalContext: EnvironmentalContext
  ): Promise<QueueGenerationResult> {
    try {
      const adaptationLog: string[] = [];
      
      // Filter cards that are ready for review
      const reviewReadyCards = availableCards.filter(card => {
        if (!card.nextReviewTime) return true;
        return new Date(card.nextReviewTime) <= new Date();
      });

      // Use the card selector to get optimal cards for current state
      const selectionResult = await this.cardSelector.selectOptimalCards(
        sessionState,
        reviewReadyCards,
        environmentalContext
      );

      adaptationLog.push(`Selected ${selectionResult.selectedCards.length} cards for review queue`);
      adaptationLog.push(`Current momentum: ${sessionState.sessionMomentumScore.toFixed(2)}`);
      adaptationLog.push(`Cognitive load capacity: ${sessionState.cognitiveLoadCapacity.toFixed(2)}`);

      // Main review queue (next 10-15 cards)
      const reviewQueue = selectionResult.selectedCards.slice(0, 15);

      // Lookahead buffer (next 5-10 cards pre-loaded)
      const lookaheadBuffer = selectionResult.selectedCards.slice(15, 25);

      // Emergency buffer (easy cards for fatigue)
      const emergencyBuffer = this.selectEmergencyCards(availableCards, sessionState);

      // Challenge reserve (harder cards for high momentum)
      const challengeReserve = this.selectChallengeCards(availableCards, sessionState);

      return {
        reviewQueue,
        lookaheadBuffer,
        emergencyBuffer,
        challengeReserve,
        adaptationLog
      };

    } catch (error) {
      console.error('Queue generation error:', error);
      
      // Fallback: simple FIFO queue
      return {
        reviewQueue: availableCards.slice(0, 10),
        lookaheadBuffer: availableCards.slice(10, 15),
        emergencyBuffer: [],
        challengeReserve: [],
        adaptationLog: ['Fallback to simple queue due to error: ' + error]
      };
    }
  }

  /**
   * Select emergency cards for when user is fatigued
   */
  private selectEmergencyCards(
    availableCards: UnifiedCard[],
    sessionState: UnifiedSessionState
  ): UnifiedCard[] {
    // Select easier cards with high stability (well-learned)
    return availableCards
      .filter(card => card.difficulty < 4 && card.stability > 7)
      .sort((a, b) => b.stability - a.stability)
      .slice(0, 5);
  }

  /**
   * Select challenge cards for high momentum states
   */
  private selectChallengeCards(
    availableCards: UnifiedCard[],
    sessionState: UnifiedSessionState
  ): UnifiedCard[] {
    // Select harder cards or cards that haven't been reviewed recently
    return availableCards
      .filter(card => card.difficulty > 6 || card.reviewCount < 3)
      .sort((a, b) => b.difficulty - a.difficulty)
      .slice(0, 5);
  }

  /**
   * Dynamically adjust queue based on real-time performance
   */
  async adjustQueueDynamically(
    currentQueue: UnifiedCard[],
    sessionState: UnifiedSessionState,
    recentPerformance: number[]
  ): Promise<UnifiedCard[]> {
    const avgPerformance = recentPerformance.length > 0 
      ? recentPerformance.reduce((sum, p) => sum + p, 0) / recentPerformance.length
      : 0.5;

    // If performance is declining, inject easier cards
    if (avgPerformance < 0.3 && sessionState.sessionFatigueIndex > 0.6) {
      const easyCards = this.selectEmergencyCards(currentQueue, sessionState);
      return [...easyCards, ...currentQueue.slice(0, 10)];
    }

    // If performance is high, add more challenging cards
    if (avgPerformance > 0.7 && sessionState.sessionMomentumScore > 0.8) {
      const challengeCards = this.selectChallengeCards(currentQueue, sessionState);
      return [...currentQueue.slice(0, 5), ...challengeCards, ...currentQueue.slice(5, 10)];
    }

    return currentQueue;
  }

  /**
   * Calculate queue efficiency metrics
   */
  calculateQueueEfficiency(
    queueResult: QueueGenerationResult,
    sessionState: UnifiedSessionState
  ): {
    diversityScore: number;
    difficultyBalance: number;
    momentumAlignment: number;
  } {
    const cards = queueResult.reviewQueue;
    
    if (cards.length === 0) {
      return { diversityScore: 0, difficultyBalance: 0, momentumAlignment: 0 };
    }

    // Diversity: spread of card types/difficulties
    const difficulties = cards.map(c => c.difficulty);
    const difficultyRange = Math.max(...difficulties) - Math.min(...difficulties);
    const diversityScore = Math.min(difficultyRange / 10, 1); // Normalize to 0-1

    // Balance: how well difficulties are distributed
    const avgDifficulty = difficulties.reduce((sum, d) => sum + d, 0) / difficulties.length;
    const targetDifficulty = this.calculateTargetDifficulty(sessionState);
    const difficultyBalance = 1 - Math.abs(avgDifficulty - targetDifficulty) / 10;

    // Momentum alignment: how well queue matches current momentum
    const momentumAlignment = this.calculateMomentumAlignment(cards, sessionState);

    return {
      diversityScore: Math.max(0, Math.min(1, diversityScore)),
      difficultyBalance: Math.max(0, Math.min(1, difficultyBalance)),
      momentumAlignment: Math.max(0, Math.min(1, momentumAlignment))
    };
  }

  /**
   * Calculate target difficulty based on session state
   */
  private calculateTargetDifficulty(sessionState: UnifiedSessionState): number {
    const baseTargetDifficulty = 5.0; // Neutral difficulty
    
    // Adjust based on momentum
    const momentumAdjustment = (sessionState.sessionMomentumScore - 0.5) * 2; // -1 to +1
    
    // Adjust based on fatigue
    const fatigueAdjustment = -sessionState.sessionFatigueIndex * 2; // -2 to 0
    
    // Adjust based on cognitive load capacity
    const cognitiveAdjustment = (sessionState.cognitiveLoadCapacity - 0.5) * 2; // -1 to +1
    
    return Math.max(1, Math.min(10, 
      baseTargetDifficulty + momentumAdjustment + fatigueAdjustment + cognitiveAdjustment
    ));
  }

  /**
   * Calculate how well the queue aligns with current momentum
   */
  private calculateMomentumAlignment(
    cards: UnifiedCard[],
    sessionState: UnifiedSessionState
  ): number {
    if (cards.length === 0) return 0;

    const targetDifficulty = this.calculateTargetDifficulty(sessionState);
    const avgQueueDifficulty = cards.reduce((sum, c) => sum + c.difficulty, 0) / cards.length;
    
    // Calculate alignment score (closer to target = higher score)
    const alignment = 1 - Math.abs(avgQueueDifficulty - targetDifficulty) / 10;
    
    return Math.max(0, Math.min(1, alignment));
  }

  /**
   * Optimize queue ordering based on advanced criteria
   */
  optimizeQueueOrdering(
    cards: UnifiedCard[],
    sessionState: UnifiedSessionState
  ): UnifiedCard[] {
    return cards.sort((a, b) => {
      // Primary: urgency (how overdue the card is)
      const urgencyA = this.calculateUrgency(a);
      const urgencyB = this.calculateUrgency(b);
      
      if (Math.abs(urgencyA - urgencyB) > 0.1) {
        return urgencyB - urgencyA; // Higher urgency first
      }

      // Secondary: difficulty alignment with current state
      const targetDifficulty = this.calculateTargetDifficulty(sessionState);
      const diffAlignA = 1 - Math.abs(a.difficulty - targetDifficulty) / 10;
      const diffAlignB = 1 - Math.abs(b.difficulty - targetDifficulty) / 10;
      
      if (Math.abs(diffAlignA - diffAlignB) > 0.1) {
        return diffAlignB - diffAlignA; // Better alignment first
      }

      // Tertiary: retrievability (lower retrievability = needs more practice)
      return a.retrievability - b.retrievability;
    });
  }

  /**
   * Calculate how urgent a card review is
   */
  private calculateUrgency(card: UnifiedCard): number {
    if (!card.nextReviewTime) return 1.0; // New cards have high urgency
    
    const now = new Date().getTime();
    const reviewTime = new Date(card.nextReviewTime).getTime();
    const overdueDays = Math.max(0, (now - reviewTime) / (1000 * 60 * 60 * 24));
    
    // Urgency increases with how overdue the card is, but caps at 1.0
    return Math.min(1.0, overdueDays / 7); // Full urgency after a week overdue
  }
}