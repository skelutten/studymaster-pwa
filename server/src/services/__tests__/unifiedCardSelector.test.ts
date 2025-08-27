import { UnifiedCardSelector } from '../selection/unifiedCardSelector';
import { UnifiedCard, UnifiedSessionState } from '../../../../shared/types/enhanced-types';

describe('UnifiedCardSelector', () => {
  let cardSelector: UnifiedCardSelector;
  let sessionState: UnifiedSessionState;
  let cards: UnifiedCard[];

  beforeEach(() => {
    cardSelector = new UnifiedCardSelector();
    sessionState = {
      userId: '1',
      sessionId: '1',
      sessionMomentumScore: 0.5,
      momentumTrend: 'stable',
      sessionFatigueIndex: 0,
      cognitiveLoadCapacity: 1,
      attentionSpanRemaining: 1,
      reviewQueue: [],
      lookaheadBuffer: [],
      emergencyBuffer: [],
      challengeReserve: [],
      sessionStartTime: new Date().toISOString(),
      contextualFactors: { timeOfDay: new Date().toISOString(), dayOfWeek: 'Monday', sessionDuration: 0, studyStreak: 0, environmentalFactors: { device: 'desktop', networkQuality: 'excellent' }, lastSessionQuality: 0 },
      adaptationHistory: [],
      explanationLog: [],
      flowStateMetrics: { challengeSkillBalance: 0, engagementLevel: 0, satisfactionPrediction: 0, momentumMaintenance: false },
    };
    cards = [
      {
        id: '1',
        deckId: '1',
        frontContent: 'front',
        backContent: 'back',
        cardType: { type: 'basic' },
        mediaRefs: [],
        easeFactor: 2.5,
        intervalDays: 0,
        nextReview: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        reviewCount: 0,
        lapseCount: 0,
        lastReviewed: new Date().toISOString(),
        difficulty: 5,
        stability: 1,
        retrievability: 0.9,
        fsrsParameters: [],
        performanceHistory: [],
        averageResponseTime: 0,
        cognitiveLoadIndex: 0,
        confidenceLevel: 'building',
        conceptSimilarity: [],
        lastClusterReview: '',
        contextualDifficulty: { timeOfDay: {}, dayOfWeek: {}, sessionPosition: {}, cognitiveLoad: {} },
        stabilityTrend: 'stable',
        retrievabilityHistory: [],
        optimalInterval: 1,
      },
      {
        id: '2',
        deckId: '1',
        frontContent: 'front',
        backContent: 'back',
        cardType: { type: 'basic' },
        mediaRefs: [],
        easeFactor: 2.5,
        intervalDays: 0,
        nextReview: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        reviewCount: 0,
        lapseCount: 0,
        lastReviewed: new Date().toISOString(),
        difficulty: 8,
        stability: 10,
        retrievability: 0.5,
        fsrsParameters: [],
        performanceHistory: [],
        averageResponseTime: 0,
        cognitiveLoadIndex: 0,
        confidenceLevel: 'optimal',
        conceptSimilarity: [],
        lastClusterReview: '',
        contextualDifficulty: { timeOfDay: {}, dayOfWeek: {}, sessionPosition: {}, cognitiveLoad: {} },
        stabilityTrend: 'stable',
        retrievabilityHistory: [],
        optimalInterval: 1,
      }
    ];
  });

  it('should be defined', () => {
    expect(cardSelector).toBeDefined();
  });

  it('should select a card', () => {
    const selectedCard = cardSelector.selectNextOptimalCard(sessionState, cards);
    expect(selectedCard).toBeDefined();
    expect(selectedCard.card).toBeDefined();
  });

  it('should select an easier card when momentum is low', () => {
    sessionState.sessionMomentumScore = 0.2;
    const selectedCard = cardSelector.selectNextOptimalCard(sessionState, cards);
    expect(selectedCard.card.difficulty).toBeLessThan(6);
  });

  it('should select a harder card when momentum is high', () => {
    sessionState.sessionMomentumScore = 0.8;
    const selectedCard = cardSelector.selectNextOptimalCard(sessionState, cards);
    expect(selectedCard.card.difficulty).toBeGreaterThan(6);
  });
});
