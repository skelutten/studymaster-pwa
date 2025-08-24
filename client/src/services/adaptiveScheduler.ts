import { EnhancedCard, SessionState, ResponseLog } from '../types/enhancedTypes';
import { FSRS } from './fsrsEngine';
import { MomentumManager } from './momentumManager';

export class AdaptiveScheduler {
  public static scheduleNextCard(
    session: SessionState,
    currentCard: EnhancedCard,
    response: ResponseLog
  ): EnhancedCard | null {
    // Update the current card based on the response
    const updatedCard = FSRS.updateCardAfterReview(currentCard, response);

    // Update the session state based on the response
    const updatedSession = MomentumManager.updateSessionMomentum(session, response);

    // Determine the next card to review based on the updated session state
    const nextCard = this.selectNextCard(updatedSession);

    return nextCard;
  }

  private static selectNextCard(session: SessionState): EnhancedCard | null {
    // Implement card selection logic based on session state
    // This is a placeholder implementation
    if (session.review_queue.length > 0) {
      const nextCardId = session.review_queue.shift();
      if (nextCardId) {
        // Fetch the card from the database or cache
        // This is a placeholder implementation
        return {
          id: nextCardId,
          difficulty: 5.0,
          stability: 1.0,
          retrievability: 0.9,
          fsrs_parameters: [],
          performance_history: [],
          average_response_time: 0.0,
          cognitive_load_index: 0.0,
          confidence_level: 'building',
          concept_similarity: [],
          last_cluster_review: '',
          contextual_difficulty: {},
          stability_trend: 'stable',
          retrievability_history: [],
          optimal_interval: 1,
        } as EnhancedCard;
      }
    }
    return null;
  }
}