import { UnifiedFSRSEngine } from '../fsrs/unifiedFSRSEngine';
import { UnifiedCard, EnhancedResponseLog, UserProfile } from '../../../../shared/types/enhanced-types';

describe('UnifiedFSRSEngine', () => {
  let fsrsEngine: UnifiedFSRSEngine;
  let card: UnifiedCard;
  let userProfile: UserProfile;

  beforeEach(() => {
    fsrsEngine = new UnifiedFSRSEngine();
    card = {
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
    };
    userProfile = {
      id: '1',
    };
  });

  it('should be defined', () => {
    expect(fsrsEngine).toBeDefined();
  });

  it('should calculate DSR for a good response', () => {
    const response: EnhancedResponseLog = {
      timestamp: new Date().toISOString(),
      rating: 'good',
      responseTime: 1000,
      contextualFactors: {
        sessionTime: 0,
        timeOfDay: new Date().toISOString(),
        sessionFatigueIndex: 0,
        cognitiveLoadAtTime: 0,
        environmentalFactors: {},
      },
      momentumImpact: 0,
      confidenceChange: 0,
      previousCardSimilarity: 0,
      clusteringContext: '',
    };
    const dsr = fsrsEngine.calculateEnhancedDSR(card, response, userProfile);
    expect(dsr).toBeDefined();
    expect(dsr.difficulty).toBeGreaterThanOrEqual(3);
    expect(dsr.difficulty).toBeLessThanOrEqual(7);
    expect(dsr.stability).toBeGreaterThan(1);
    expect(dsr.retrievability).toBeGreaterThan(0.8);
  });

  it('should calculate DSR for an again response', () => {
    const response: EnhancedResponseLog = {
      timestamp: new Date().toISOString(),
      rating: 'again',
      responseTime: 2000,
      contextualFactors: {
        sessionTime: 0,
        timeOfDay: new Date().toISOString(),
        sessionFatigueIndex: 0,
        cognitiveLoadAtTime: 0,
        environmentalFactors: {},
      },
      momentumImpact: 0,
      confidenceChange: 0,
      previousCardSimilarity: 0,
      clusteringContext: '',
    };
    const dsr = fsrsEngine.calculateEnhancedDSR(card, response, userProfile);
    expect(dsr).toBeDefined();
    expect(dsr.difficulty).toBeGreaterThan(5);
    expect(dsr.stability).toBeGreaterThan(0.1); // FSRS ensures minimum stability
    expect(dsr.retrievability).toBeLessThan(0.9);
  });
});
