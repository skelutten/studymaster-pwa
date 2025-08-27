import { UnifiedMomentumManager } from '../momentum/unifiedMomentumManager';
import { UnifiedSessionState, EnhancedResponseLog } from '../../../../shared/types/enhanced-types';

describe('UnifiedMomentumManager', () => {
  let momentumManager: UnifiedMomentumManager;
  let sessionState: UnifiedSessionState;

  beforeEach(() => {
    momentumManager = new UnifiedMomentumManager();
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
  });

  it('should be defined', () => {
    expect(momentumManager).toBeDefined();
  });

  it('should increase momentum on a good response', () => {
    const response: EnhancedResponseLog = {
      timestamp: new Date().toISOString(),
      rating: 'good',
      responseTime: 1000,
      contextualFactors: {
        sessionTime: 0,
        timeOfDay: new Date().toISOString(),
        sessionFatigueIndex: 0,
        cognitiveLoadAtTime: 0,
      },
      momentumImpact: 0,
      confidenceChange: 0,
      previousCardSimilarity: 0,
      clusteringContext: '',
    };
    const newSessionState = momentumManager.updateSessionMomentum(sessionState, response);
    expect(newSessionState.sessionMomentumScore).toBeGreaterThan(0.5);
  });

  it('should decrease momentum on an again response', () => {
    const response: EnhancedResponseLog = {
      timestamp: new Date().toISOString(),
      rating: 'again',
      responseTime: 2000,
      contextualFactors: {
        sessionTime: 0,
        timeOfDay: new Date().toISOString(),
        sessionFatigueIndex: 0,
        cognitiveLoadAtTime: 0,
      },
      momentumImpact: 0,
      confidenceChange: 0,
      previousCardSimilarity: 0,
      clusteringContext: '',
    };
    const newSessionState = momentumManager.updateSessionMomentum(sessionState, response);
    expect(newSessionState.sessionMomentumScore).toBeLessThan(0.5);
  });
});
