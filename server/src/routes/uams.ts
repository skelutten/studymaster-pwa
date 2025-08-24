import express from 'express';
import { Request, Response } from 'express';
import PocketBase from 'pocketbase';

const router = express.Router();
const pb = new PocketBase('http://127.0.0.1:8090');

/**
 * Simplified UAMS endpoints for MVP functionality
 * This provides the core UAMS v3.0 features with proper type safety
 */

/**
 * Start a new UAMS learning session
 */
router.post('/start-session', async (req: Request, res: Response) => {
  try {
    const { userId, deckId } = req.body;

    if (!userId || !deckId) {
      return res.status(400).json({
        success: false,
        error: 'userId and deckId are required'
      });
    }

    // Create initial session state with simplified structure
    const sessionState = {
      user_id: userId,
      deck_id: deckId,
      session_momentum_score: 0.5,
      momentum_trend: 'stable',
      session_fatigue_index: 0.0,
      cognitive_load_capacity: 1.0,
      attention_span_remaining: 1.0,
      session_start_time: new Date().toISOString(),
      contextual_factors: {
        device: 'desktop',
        networkQuality: 'good',
        timeOfDay: new Date().toISOString(),
        sessionDuration: 0
      },
      flow_state_metrics: {
        challengeSkillBalance: 0.5,
        engagementLevel: 0.5,
        satisfactionPrediction: 0.5,
        momentumMaintenance: true
      }
    };

    // Save to database
    const session = await pb.collection('session_states').create(sessionState);
    
    // Get available cards for this deck
    const availableCards = await pb.collection('cards').getList(1, 20, {
      filter: `deck_id="${deckId}"`,
      sort: 'created'
    });

    // Simple queue generation (can be enhanced with complex algorithms later)
    const reviewQueue = availableCards.items.slice(0, 10);
    const lookaheadBuffer = availableCards.items.slice(10, 15);

    // Update session with queue
    await pb.collection('session_states').update(session.id, {
      review_queue: reviewQueue.map(c => c.id),
      lookahead_buffer: lookaheadBuffer.map(c => c.id)
    });

    return res.json({
      success: true,
      sessionId: session.id,
      reviewQueue,
      lookaheadBuffer,
      sessionState: {
        ...session,
        reviewQueue,
        lookaheadBuffer
      }
    });

  } catch (error: any) {
    console.error('Start session error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to start session'
    });
  }
});

/**
 * Submit a card response and update with basic FSRS calculations
 */
router.post('/submit-response', async (req: Request, res: Response) => {
  try {
    const { 
      sessionId, 
      cardId, 
      responseTime, 
      responseQuality, // 1-4 FSRS scale
      cognitiveLoadLevel = 0.5
    } = req.body;

    if (!sessionId || !cardId || typeof responseQuality !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'sessionId, cardId, and responseQuality are required'
      });
    }

    // Get current session and card
    const session = await pb.collection('session_states').getOne(sessionId);
    const card = await pb.collection('cards').getOne(cardId);

    // Create response log
    const responseLog = {
      user_id: session.user_id,
      card_id: cardId,
      session_id: sessionId,
      response_time: responseTime,
      response_quality: responseQuality,
      cognitive_load_level: cognitiveLoadLevel,
      timestamp: new Date().toISOString()
    };

    // Save response log
    const savedResponse = await pb.collection('response_logs').create(responseLog);

    // Basic FSRS calculations (simplified)
    const currentDifficulty = card.difficulty || 5.0;
    const currentStability = card.stability || 1.0;
    const currentRetrievability = card.retrievability || 0.9;

    // Simple difficulty adjustment based on response quality
    let newDifficulty = currentDifficulty;
    let newStability = currentStability;
    let newRetrievability = currentRetrievability;

    if (responseQuality <= 2) { // Hard/Again
      newDifficulty = Math.min(10, currentDifficulty + 0.5);
      newStability = Math.max(0.1, currentStability * 0.8);
      newRetrievability = Math.max(0.1, currentRetrievability * 0.7);
    } else if (responseQuality >= 4) { // Easy
      newDifficulty = Math.max(1, currentDifficulty - 0.3);
      newStability = currentStability * 1.3;
      newRetrievability = Math.min(1, currentRetrievability * 1.1);
    } else { // Good
      newDifficulty = currentDifficulty + (responseQuality - 3) * 0.1;
      newStability = currentStability * 1.1;
      newRetrievability = Math.min(1, currentRetrievability * 1.05);
    }

    // Calculate next review time (simplified interval calculation)
    const intervalDays = Math.max(1, Math.round(newStability * newRetrievability));
    const nextReviewTime = new Date();
    nextReviewTime.setDate(nextReviewTime.getDate() + intervalDays);

    // Update card with new values
    await pb.collection('cards').update(cardId, {
      difficulty: newDifficulty,
      stability: newStability,
      retrievability: newRetrievability,
      next_review_time: nextReviewTime.toISOString(),
      last_review_time: new Date().toISOString(),
      review_count: (card.review_count || 0) + 1,
      lapse_count: responseQuality <= 2 ? (card.lapse_count || 0) + 1 : (card.lapse_count || 0)
    });

    // Update session momentum (simplified)
    const performanceImpact = (responseQuality - 2.5) / 1.5; // -1 to +1
    const currentMomentum = session.session_momentum_score || 0.5;
    const newMomentum = Math.max(0, Math.min(1, currentMomentum + performanceImpact * 0.1));

    await pb.collection('session_states').update(sessionId, {
      session_momentum_score: newMomentum,
      momentum_trend: newMomentum > currentMomentum ? 'improving' : 
                     newMomentum < currentMomentum ? 'declining' : 'stable'
    });

    return res.json({
      success: true,
      dsrUpdate: {
        difficulty: newDifficulty,
        stability: newStability,
        retrievability: newRetrievability,
        confidence: 0.8,
        explanation: `Adjusted based on ${responseQuality === 1 ? 'Again' : responseQuality === 2 ? 'Hard' : responseQuality === 3 ? 'Good' : 'Easy'} response`
      },
      sessionUpdate: {
        sessionMomentumScore: newMomentum,
        momentumTrend: newMomentum > currentMomentum ? 'improving' : 
                       newMomentum < currentMomentum ? 'declining' : 'stable'
      },
      responseId: savedResponse.id
    });

  } catch (error: any) {
    console.error('Submit response error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to submit response'
    });
  }
});

/**
 * Get adaptive card queue for session
 */
router.get('/queue/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = await pb.collection('session_states').getOne(sessionId);

    // Get cards that need review
    const now = new Date().toISOString();
    const availableCards = await pb.collection('cards').getList(1, 50, {
      filter: `deck_id="${session.deck_id}" && (next_review_time <= "${now}" || next_review_time = "")`,
      sort: 'next_review_time'
    });

    // Simple adaptive sorting based on session momentum
    const momentum = session.session_momentum_score || 0.5;
    let sortedCards = availableCards.items;

    if (momentum < 0.3) {
      // Low momentum: prioritize easier cards
      sortedCards = sortedCards.sort((a, b) => (a.difficulty || 5) - (b.difficulty || 5));
    } else if (momentum > 0.7) {
      // High momentum: include more challenging cards
      sortedCards = sortedCards.sort((a, b) => (b.difficulty || 5) - (a.difficulty || 5));
    }
    // Medium momentum: keep default order

    const reviewQueue = sortedCards.slice(0, 10);
    const lookaheadBuffer = sortedCards.slice(10, 15);

    return res.json({
      success: true,
      queueResult: {
        reviewQueue,
        lookaheadBuffer,
        emergencyBuffer: [],
        challengeReserve: []
      },
      sessionStats: {
        queueSize: reviewQueue.length,
        lookaheadSize: lookaheadBuffer.length,
        momentum: momentum,
        totalAvailable: availableCards.totalItems
      }
    });

  } catch (error: any) {
    console.error('Get queue error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to get queue'
    });
  }
});

/**
 * Get basic analytics for user
 */
router.get('/analytics/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Get recent sessions
    const sessions = await pb.collection('session_states').getList(1, 20, {
      filter: `user_id="${userId}"`,
      sort: '-created'
    });

    // Get recent responses
    const responses = await pb.collection('response_logs').getList(1, 100, {
      filter: `user_id="${userId}"`,
      sort: '-timestamp'
    });

    // Calculate basic analytics
    const analytics = {
      sessionCount: sessions.totalItems,
      totalReviews: responses.totalItems,
      averageAccuracy: responses.items.length > 0 
        ? responses.items.filter(r => r.response_quality >= 3).length / responses.items.length 
        : 0,
      averageResponseTime: responses.items.length > 0
        ? responses.items.reduce((sum: number, r: any) => sum + (r.response_time || 0), 0) / responses.items.length
        : 0,
      currentMomentum: sessions.items.length > 0 
        ? sessions.items[0].session_momentum_score || 0.5 
        : 0.5,
      recentSessions: sessions.items.slice(0, 5).map((s: any) => ({
        id: s.id,
        startTime: s.session_start_time,
        momentum: s.session_momentum_score,
        trend: s.momentum_trend
      }))
    };

    return res.json({
      success: true,
      analytics
    });

  } catch (error: any) {
    console.error('Get analytics error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to get analytics'
    });
  }
});

/**
 * Update environmental context for session
 */
router.post('/update-context', async (req: Request, res: Response) => {
  try {
    const { sessionId, environmentalContext } = req.body;

    if (!sessionId || !environmentalContext) {
      return res.status(400).json({
        success: false,
        error: 'sessionId and environmentalContext are required'
      });
    }

    // Update session with new context
    await pb.collection('session_states').update(sessionId, {
      contextual_factors: environmentalContext
    });

    return res.json({
      success: true,
      message: 'Environmental context updated successfully'
    });

  } catch (error: any) {
    console.error('Update context error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to update context'
    });
  }
});

export default router;
