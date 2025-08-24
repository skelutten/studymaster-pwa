import { UnifiedSessionState, UnifiedCard, CardSelectionResult, EnhancedResponseLog, SessionContext, UserProfile } from '../../../shared/types/enhanced-types';
import { UnifiedFSRSEngine } from '../../../server/src/services/fsrs/unifiedFSRSEngine';
import { UnifiedMomentumManager } from '../../../server/src/services/momentum/unifiedMomentumManager';
import { UnifiedCardSelector } from '../../../server/src/services/selection/unifiedCardSelector';

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
  private fsrsEngine: UnifiedFSRSEngine;
  private momentumManager: UnifiedMomentumManager;
  private cardSelector: UnifiedCardSelector;
  private config: QueueManagerConfig;

  constructor(config: Partial<QueueManagerConfig> = {}) {
    this.fsrsEngine = new UnifiedFSRSEngine();
    this.momentumManager = new UnifiedMomentumManager();
    this.cardSelector = new UnifiedCardSelector();
    
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
    console.log(`Initializing UAMS v3.0 session for user ${userId}, deck ${deckId}`);
    
    try {
      // Load available cards and user profile
      const availableCards = await this.loadAvailableCards(userId, deckId);
      const userProfile = await this.loadUserProfile(userId);
      const sessionContext = await this.getSessionContext();

      if (availableCards.length === 0) {
        throw new Error('No cards available for study in this deck');
      }

      // Create initial session state
      const initialState: UnifiedSessionState = {
        userId,
        sessionId: this.generateSessionId(),
        sessionMomentumScore: 0.5,
        momentumTrend: 'stable',
        sessionFatigueIndex: 0.0,
        cognitiveLoadCapacity: 1.0,
        attentionSpanRemaining: 1.0,
        reviewQueue: [],
        lookaheadBuffer: [],
        emergencyBuffer: [],
        challengeReserve: [],
        sessionStartTime: new Date().toISOString(),
        contextualFactors: sessionContext,
        adaptationHistory: [],
        explanationLog: [],
        flowStateMetrics: {
          challengeSkillBalance: 0.5,
          engagementLevel: 0.5,
          satisfactionPrediction: 0.7,
          momentumMaintenance: true
        }
      };

      // Populate initial buffers
      await this.populateInitialBuffers(initialState, availableCards, userProfile);
      
      // Log session initialization
      this.logSessionEvent(initialState, 'session_initialized', {
        availableCards: availableCards.length,
        initialBufferSizes: {
          lookahead: initialState.lookaheadBuffer.length,
          emergency: initialState.emergencyBuffer.length,
          challenge: initialState.challengeReserve.length
        }
      });

      console.log(`Session initialized successfully. Buffers populated: ${initialState.lookaheadBuffer.length} lookahead, ${initialState.emergencyBuffer.length} emergency, ${initialState.challengeReserve.length} challenge`);
      
      return initialState;
    } catch (error) {
      console.error('Error initializing session:', error);
      throw error;
    }
  }

  /**
   * Get the next card for review
   */
  async getNextCard(sessionState: UnifiedSessionState): Promise<CardSelectionResult> {
    console.log(`Getting next card. Current momentum: ${sessionState.sessionMomentumScore.toFixed(3)}, Fatigue: ${sessionState.sessionFatigueIndex.toFixed(3)}`);
    
    try {
      // Check session limits
      this.checkSessionLimits(sessionState);
      
      // Refresh buffers if needed
      if (sessionState.lookaheadBuffer.length < this.config.refreshThreshold) {
        console.log('Refreshing lookahead buffer...');
        await this.refreshLookaheadBuffer(sessionState);
      }

      // Select next card using intelligent selection
      const selection = this.cardSelector.selectNextOptimalCard(
        sessionState, 
        sessionState.lookaheadBuffer
      );

      // Update session state after card selection
      this.updateQueueAfterSelection(sessionState, selection.card);

      // Log the selection
      sessionState.explanationLog.push({
        timestamp: new Date().toISOString(),
        cardId: selection.card.id,
        explanation: selection.explanation,
        reasoning: selection.reasoning as any,
        confidence: selection.confidence,
        userVisible: true
      });

      // Log selection event
      this.logSessionEvent(sessionState, 'card_selected', {
        cardId: selection.card.id,
        strategy: selection.reasoning,
        confidence: selection.confidence,
        difficulty: selection.card.difficulty,
        retrievability: selection.card.retrievability
      });

      console.log(`Selected card ${selection.card.id} using ${selection.reasoning} strategy`);
      
      return selection;
    } catch (error) {
      console.error('Error getting next card:', error);
      throw error;
    }
  }

  /**
   * Process user response and update session state
   */
  async processCardResponse(
    sessionState: UnifiedSessionState,
    cardId: string,
    response: EnhancedResponseLog
  ): Promise<UnifiedSessionState> {
    console.log(`Processing response for card ${cardId}: ${response.rating}`);
    
    try {
      // Update card with FSRS calculations
      const card = await this.getCard(cardId);
      const userProfile = await this.getUserProfile(sessionState.userId);
      
      if (!card) {
        throw new Error(`Card ${cardId} not found`);
      }

      // Calculate DSR updates
      const dsrUpdate = this.fsrsEngine.calculateEnhancedDSR(card, response, userProfile);
      await this.updateCardDSR(cardId, dsrUpdate);
      
      console.log(`DSR updated - Difficulty: ${dsrUpdate.difficulty.toFixed(2)}, Stability: ${dsrUpdate.stability.toFixed(2)}, Retrievability: ${dsrUpdate.retrievability.toFixed(2)}`);

      // Update session momentum and state
      const updatedSession = this.momentumManager.updateSessionMomentum(sessionState, response);
      
      console.log(`Momentum updated: ${sessionState.sessionMomentumScore.toFixed(3)} -> ${updatedSession.sessionMomentumScore.toFixed(3)}`);

      // Add to adaptation history
      updatedSession.adaptationHistory.push({
        timestamp: new Date().toISOString(),
        cardId,
        action: 'selected',
        reason: 'user_response_processed',
        algorithmVersion: '3.0',
        parameters: { 
          momentum: updatedSession.sessionMomentumScore, 
          fatigue: updatedSession.sessionFatigueIndex,
          rating: response.rating,
          responseTime: response.responseTime
        }
      });

      // Perform adaptive buffer refresh based on new session state
      await this.adaptiveBufferRefresh(updatedSession);

      // Log response processing
      this.logSessionEvent(updatedSession, 'response_processed', {
        cardId,
        rating: response.rating,
        responseTime: response.responseTime,
        momentumChange: updatedSession.sessionMomentumScore - sessionState.sessionMomentumScore,
        fatigueChange: updatedSession.sessionFatigueIndex - sessionState.sessionFatigueIndex
      });

      return updatedSession;
    } catch (error) {
      console.error('Error processing card response:', error);
      throw error;
    }
  }

  /**
   * Populate initial buffers with optimally sorted cards
   */
  private async populateInitialBuffers(
    sessionState: UnifiedSessionState, 
    availableCards: UnifiedCard[],
    userProfile: UserProfile
  ): Promise<void> {
    // Sort cards by optimal review priority
    const sortedCards = availableCards.sort((a, b) => {
      const scoreA = this.calculateInitialPriority(a, userProfile);
      const scoreB = this.calculateInitialPriority(b, userProfile);
      return scoreB - scoreA;
    });

    // Populate lookahead buffer (main study queue)
    sessionState.lookaheadBuffer = sortedCards
      .slice(0, this.config.lookaheadBufferSize)
      .map(card => ({ ...card })); // Deep copy

    // Populate emergency buffer (confidence boosters)
    sessionState.emergencyBuffer = sortedCards
      .filter(card => 
        card.stability > 10 && 
        card.difficulty < 4 && 
        card.retrievability > 0.8 &&
        card.confidenceLevel !== 'struggling'
      )
      .slice(0, this.config.emergencyBufferSize);

    // Populate challenge reserve (engagement cards)
    sessionState.challengeReserve = sortedCards
      .filter(card => 
        card.difficulty > 6 && 
        card.retrievability > 0.4 && 
        card.retrievability < 0.8 &&
        card.confidenceLevel !== 'struggling'
      )
      .slice(0, this.config.challengeReserveSize);

    console.log(`Buffers populated: ${sessionState.lookaheadBuffer.length} lookahead, ${sessionState.emergencyBuffer.length} emergency, ${sessionState.challengeReserve.length} challenge`);
  }

  /**
   * Calculate initial priority for card ordering
   */
  private calculateInitialPriority(card: UnifiedCard, userProfile: UserProfile): number {
    let priority = 0;

    // FSRS-based due priority (most important factor)
    const dueDate = card.nextReview ? new Date(card.nextReview) : new Date();
    const daysDue = Math.max(0, (Date.now() - dueDate.getTime()) / (24 * 60 * 60 * 1000));
    priority += daysDue * 10; // High weight for overdue cards

    // Forgetting curve priority (cards closer to forgetting)
    priority += (1 - card.retrievability) * 8;

    // Stability consideration (unstable memories need attention)
    if (card.stability < 7) {
      priority += (7 - card.stability) * 0.5;
    }

    // User-specific adjustments
    if (userProfile.optimalStudyTimes) {
      const currentHour = new Date().getHours().toString();
      if (userProfile.optimalStudyTimes.includes(currentHour)) {
        priority += 2; // Bonus for optimal study times
      }
    }

    // Performance history consideration
    if (card.performanceHistory.length > 0) {
      const recentPerformance = card.performanceHistory.slice(-3);
      const strugglingCards = recentPerformance.filter(h => h.rating === 'again').length;
      if (strugglingCards >= 2) {
        priority += 3; // Priority for struggling cards
      }
    }

    return priority;
  }

  /**
   * Adaptive buffer refresh based on session state
   */
  private async adaptiveBufferRefresh(sessionState: UnifiedSessionState): Promise<void> {
    const momentum = sessionState.sessionMomentumScore;
    const fatigue = sessionState.sessionFatigueIndex;
    
    console.log(`Adaptive refresh triggered - Momentum: ${momentum.toFixed(3)}, Fatigue: ${fatigue.toFixed(3)}`);

    if (fatigue > 0.8 || momentum < 0.3) {
      // Crisis mode: prioritize emergency buffer
      console.log('Crisis mode: prioritizing emergency buffer');
      await this.prioritizeEmergencyBuffer(sessionState);
    } else if (momentum > 0.8 && fatigue < 0.4) {
      // High performance: inject challenges
      console.log('High performance mode: injecting challenges');
      await this.prioritizeChallengeReserve(sessionState);
    } else {
      // Normal mode: balanced selection
      console.log('Normal mode: balanced buffer refresh');
      await this.balancedBufferRefresh(sessionState);
    }
  }

  /**
   * Prioritize emergency buffer for momentum recovery
   */
  private async prioritizeEmergencyBuffer(sessionState: UnifiedSessionState): Promise<void> {
    // Move emergency cards to front of lookahead buffer
    const emergencyCards = sessionState.emergencyBuffer.slice(0, 3);
    
    // Remove emergency cards from their current positions in lookahead
    sessionState.lookaheadBuffer = sessionState.lookaheadBuffer.filter(
      card => !emergencyCards.some(emergency => emergency.id === card.id)
    );
    
    // Add emergency cards to front
    sessionState.lookaheadBuffer.unshift(...emergencyCards);
    
    // Replenish emergency buffer if possible
    await this.replenishEmergencyBuffer(sessionState);
  }

  /**
   * Prioritize challenge reserve for engagement
   */
  private async prioritizeChallengeReserve(sessionState: UnifiedSessionState): Promise<void> {
    // Add 1-2 challenge cards to lookahead buffer
    const challengeCards = sessionState.challengeReserve.slice(0, 2);
    
    // Insert challenge cards at strategic positions (not first, to avoid overwhelming)
    const insertPosition = Math.min(2, sessionState.lookaheadBuffer.length);
    sessionState.lookaheadBuffer.splice(insertPosition, 0, ...challengeCards);
    
    // Remove used challenge cards from reserve
    sessionState.challengeReserve = sessionState.challengeReserve.filter(
      card => !challengeCards.some(challenge => challenge.id === card.id)
    );
    
    // Replenish challenge reserve
    await this.replenishChallengeReserve(sessionState);
  }

  /**
   * Balanced buffer refresh for normal operation
   */
  private async balancedBufferRefresh(sessionState: UnifiedSessionState): Promise<void> {
    // Standard refresh of lookahead buffer
    if (sessionState.lookaheadBuffer.length < this.config.lookaheadBufferSize) {
      await this.refreshLookaheadBuffer(sessionState);
    }
    
    // Periodic maintenance of emergency and challenge buffers
    if (sessionState.emergencyBuffer.length < this.config.emergencyBufferSize) {
      await this.replenishEmergencyBuffer(sessionState);
    }
    
    if (sessionState.challengeReserve.length < this.config.challengeReserveSize) {
      await this.replenishChallengeReserve(sessionState);
    }
  }

  /**
   * Refresh lookahead buffer with new cards
   */
  private async refreshLookaheadBuffer(sessionState: UnifiedSessionState): Promise<void> {
    const currentCardIds = new Set([
      ...sessionState.lookaheadBuffer.map(c => c.id),
      ...sessionState.emergencyBuffer.map(c => c.id),
      ...sessionState.challengeReserve.map(c => c.id)
    ]);

    // Get fresh cards excluding those already in buffers
    const availableCards = await this.loadAvailableCards(sessionState.userId, ''); // All decks
    const freshCards = availableCards.filter(card => !currentCardIds.has(card.id));
    
    if (freshCards.length === 0) {
      console.warn('No fresh cards available for buffer refresh');
      return;
    }

    // Sort by current priority
    const userProfile = await this.getUserProfile(sessionState.userId);
    const sortedFreshCards = freshCards.sort((a, b) => {
      const scoreA = this.calculateCurrentPriority(a, sessionState, userProfile);
      const scoreB = this.calculateCurrentPriority(b, sessionState, userProfile);
      return scoreB - scoreA;
    });

    // Add cards to fill buffer
    const cardsNeeded = this.config.lookaheadBufferSize - sessionState.lookaheadBuffer.length;
    const newCards = sortedFreshCards.slice(0, cardsNeeded);
    sessionState.lookaheadBuffer.push(...newCards);

    console.log(`Refreshed lookahead buffer with ${newCards.length} new cards`);
  }

  /**
   * Calculate current priority considering session state
   */
  private calculateCurrentPriority(
    card: UnifiedCard, 
    sessionState: UnifiedSessionState, 
    userProfile: UserProfile
  ): number {
    let priority = this.calculateInitialPriority(card, userProfile);

    // Session-specific adjustments
    const momentum = sessionState.sessionMomentumScore;
    const fatigue = sessionState.sessionFatigueIndex;

    // Adjust for current momentum and fatigue
    if (momentum < 0.5) {
      // Low momentum: prefer easier cards
      priority += Math.max(0, (8 - card.difficulty)) * 0.5;
    } else if (momentum > 0.7) {
      // High momentum: allow harder cards
      priority += Math.max(0, (card.difficulty - 5)) * 0.3;
    }

    // Fatigue adjustment
    if (fatigue > 0.6) {
      // High fatigue: prefer easier cards
      priority += (card.retrievability * 3);
    }

    // Prevent recent cards (clustering prevention)
    const recentCardIds = sessionState.adaptationHistory
      .slice(-5)
      .map(a => a.cardId);
    
    if (recentCardIds.includes(card.id)) {
      priority -= 10; // Strong penalty for recent cards
    }

    return priority;
  }

  /**
   * Update queue after card selection
   */
  private updateQueueAfterSelection(sessionState: UnifiedSessionState, selectedCard: UnifiedCard): void {
    // Remove selected card from lookahead buffer
    sessionState.lookaheadBuffer = sessionState.lookaheadBuffer.filter(
      card => card.id !== selectedCard.id
    );

    // Update card's last cluster review timestamp
    selectedCard.lastClusterReview = new Date().toISOString();
  }

  /**
   * Check session limits and constraints
   */
  private checkSessionLimits(sessionState: UnifiedSessionState): void {
    const sessionDurationMinutes = (Date.now() - new Date(sessionState.sessionStartTime).getTime()) / (1000 * 60);
    
    if (sessionDurationMinutes > this.config.maxSessionDurationMinutes) {
      throw new Error(`Session duration limit reached (${this.config.maxSessionDurationMinutes} minutes)`);
    }

    if (sessionState.sessionFatigueIndex > 0.95) {
      console.warn('Critical fatigue level detected - recommend session break');
    }

    if (sessionState.attentionSpanRemaining < 0.1) {
      console.warn('Attention span critically low - recommend session break');
    }
  }

  /**
   * Replenish emergency buffer
   */
  private async replenishEmergencyBuffer(sessionState: UnifiedSessionState): Promise<void> {
    const availableCards = await this.loadAvailableCards(sessionState.userId, '');
    const currentBufferIds = new Set([
      ...sessionState.lookaheadBuffer.map(c => c.id),
      ...sessionState.emergencyBuffer.map(c => c.id),
      ...sessionState.challengeReserve.map(c => c.id)
    ]);

    const emergencyCandidates = availableCards
      .filter(card => 
        !currentBufferIds.has(card.id) &&
        card.stability > 8 && 
        card.difficulty < 5 && 
        card.retrievability > 0.75
      )
      .sort((a, b) => (b.retrievability - a.retrievability));

    const cardsNeeded = this.config.emergencyBufferSize - sessionState.emergencyBuffer.length;
    const newEmergencyCards = emergencyCandidates.slice(0, cardsNeeded);
    sessionState.emergencyBuffer.push(...newEmergencyCards);
  }

  /**
   * Replenish challenge reserve
   */
  private async replenishChallengeReserve(sessionState: UnifiedSessionState): Promise<void> {
    const availableCards = await this.loadAvailableCards(sessionState.userId, '');
    const currentBufferIds = new Set([
      ...sessionState.lookaheadBuffer.map(c => c.id),
      ...sessionState.emergencyBuffer.map(c => c.id),
      ...sessionState.challengeReserve.map(c => c.id)
    ]);

    const challengeCandidates = availableCards
      .filter(card => 
        !currentBufferIds.has(card.id) &&
        card.difficulty > 6 && 
        card.retrievability > 0.3 && 
        card.retrievability < 0.8
      )
      .sort((a, b) => b.difficulty - a.difficulty);

    const cardsNeeded = this.config.challengeReserveSize - sessionState.challengeReserve.length;
    const newChallengeCards = challengeCandidates.slice(0, cardsNeeded);
    sessionState.challengeReserve.push(...newChallengeCards);
  }

  /**
   * Get buffer health metrics
   */
  getBufferMetrics(sessionState: UnifiedSessionState): BufferMetrics {
    return {
      lookaheadUtilization: sessionState.lookaheadBuffer.length / this.config.lookaheadBufferSize,
      emergencyBufferHealth: sessionState.emergencyBuffer.length / this.config.emergencyBufferSize,
      challengeReserveReadiness: sessionState.challengeReserve.length / this.config.challengeReserveSize,
      overallQueueHealth: (
        (sessionState.lookaheadBuffer.length / this.config.lookaheadBufferSize) +
        (sessionState.emergencyBuffer.length / this.config.emergencyBufferSize) +
        (sessionState.challengeReserve.length / this.config.challengeReserveSize)
      ) / 3
    };
  }

  // Helper methods that would need to be implemented based on your data layer

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async loadAvailableCards(userId: string, deckId: string): Promise<UnifiedCard[]> {
    // This would load cards from your database
    // For now, return empty array - implement based on your data layer
    console.log(`Loading available cards for user ${userId}, deck ${deckId}`);
    return [];
  }

  private async loadUserProfile(userId: string): Promise<UserProfile> {
    // This would load user profile from your database
    console.log(`Loading user profile for ${userId}`);
    return { id: userId };
  }

  private async getSessionContext(): Promise<SessionContext> {
    // This would gather current environmental context
    return {
      timeOfDay: new Date().toISOString(),
      dayOfWeek: new Date().toLocaleDateString('en', { weekday: 'long' }),
      sessionDuration: 0,
      studyStreak: 1,
      environmentalFactors: {
        device: 'desktop',
        networkQuality: 'excellent'
      },
      lastSessionQuality: 0.7
    };
  }

  private async getCard(cardId: string): Promise<UnifiedCard | null> {
    // This would fetch a specific card from your database
    console.log(`Getting card ${cardId}`);
    return null;
  }

  private async getUserProfile(userId: string): Promise<UserProfile> {
    return this.loadUserProfile(userId);
  }

  private async updateCardDSR(cardId: string, dsrUpdate: any): Promise<void> {
    // This would update card DSR values in your database
    console.log(`Updating DSR for card ${cardId}:`, dsrUpdate);
  }

  private logSessionEvent(sessionState: UnifiedSessionState, eventType: string, data: any): void {
    console.log(`[Session ${sessionState.sessionId}] ${eventType}:`, data);
    // In production, this would log to your analytics system
  }
}