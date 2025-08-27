import { UnifiedSessionState, UnifiedCard, CardSelectionResult, EnhancedResponseLog, SessionContext, UserProfile } from '../../../shared/types/enhanced-types';
import { uamsApiService } from './uamsApiService';

export interface QueueManagerConfig {
  lookaheadBufferSize: number;
  emergencyBufferSize: number;
  challengeReserveSize: number;
  refreshThreshold: number;
  maxSessionDurationMinutes: number;
  adaptiveRefreshInterval: number;
}

export interface BufferMetrics {
  lookaheadUtilization: number;
  emergencyBufferHealth: number;
  challengeReserveReadiness: number;
  overallQueueHealth: number;
}

export class UnifiedQueueManager {
  private config: QueueManagerConfig;

  constructor(config: Partial<QueueManagerConfig> = {}) {
    this.config = {
      lookaheadBufferSize: 10,
      emergencyBufferSize: 5,
      challengeReserveSize: 5,
      refreshThreshold: 3,
      maxSessionDurationMinutes: 120,
      adaptiveRefreshInterval: 5000,
      ...config
    };
  }

  /**
   * Initialize a new study session
   */
  async initializeSession(userId: string, deckId: string): Promise<UnifiedSessionState> {
    return uamsApiService.initializeSession(userId, deckId);
  }

  /**
   * Get the next card for review
   */
  async getNextCard(sessionState: UnifiedSessionState): Promise<CardSelectionResult> {
    return uamsApiService.getNextCard(sessionState);
  }

  /**
   * Process user response and update session state
   */
  async processCardResponse(
    sessionState: UnifiedSessionState,
    cardId: string,
    response: EnhancedResponseLog
  ): Promise<UnifiedSessionState> {
    return uamsApiService.processCardResponse(sessionState, cardId, response);
  }
}