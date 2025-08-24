// Environmental and contextual types
export interface EnvironmentalContext {
  device: 'mobile' | 'desktop' | 'tablet';
  networkQuality: 'excellent' | 'good' | 'poor' | 'offline';
  batteryLevel?: number; // 0-1 for mobile devices
  ambientNoise?: 'quiet' | 'moderate' | 'noisy';
  lighting?: 'optimal' | 'dim' | 'bright';
}

export interface ContextualDifficultyMap {
  timeOfDay: Record<string, number>; // hour -> difficulty modifier
  dayOfWeek: Record<string, number>; // day -> difficulty modifier
  sessionPosition: Record<string, number>; // early/mid/late -> modifier
  cognitiveLoad: Record<string, number>; // load level -> modifier
}

export interface SessionContext {
  timeOfDay: string; // ISO time
  dayOfWeek: string;
  sessionDuration: number; // minutes
  studyStreak: number; // days
  environmentalFactors: EnvironmentalContext;
  lastSessionQuality: number; // 0-1 rating
}

export interface AdaptationLog {
  timestamp: string;
  cardId: string;
  action: 'selected' | 'skipped' | 'reordered';
  reason: string;
  algorithmVersion: string;
  parameters: Record<string, any>;
}

export interface ExplanationEvent {
  timestamp: string;
  cardId: string;
  explanation: string;
  reasoning: 'momentum_recovery' | 'engagement_optimization' | 'flow_maintenance';
  confidence: number; // 0-1
  userVisible: boolean;
}

export interface UserProfile {
  id: string;
  fsrsParameters?: number[]; // Personal 21-parameter optimization
  averageSessionLength?: number; // minutes
  attentionDecayRate?: number; // personal decay rate
  optimalStudyTimes?: string[]; // preferred study times
  cognitiveLoadProfile?: {
    baseCapacity: number;
    fatigueRate: number;
    recoveryRate: number;
  };
}

// Main enhanced interfaces
export interface UnifiedCard {
  // Base Card properties
  id: string;
  deckId: string;
  frontContent: string;
  backContent: string;
  cardType: any;
  mediaRefs: any[];
  
  // Legacy fields (for backward compatibility)
  easeFactor: number;
  intervalDays: number;
  nextReview: string;
  createdAt: string;
  reviewCount: number;
  lapseCount: number;
  lastReviewed: string;
  
  // FSRS-Enhanced DSR Metrics
  difficulty: number; // 1-10 (float, granular)
  stability: number; // Memory retention duration in days
  retrievability: number; // Current recall probability (0-1)
  fsrsParameters: number[]; // Personal 21-parameter optimization
  
  // Momentum & Performance Tracking
  performanceHistory: EnhancedResponseLog[];
  averageResponseTime: number; // Normalized for content length
  cognitiveLoadIndex: number; // 0-1, derived from response patterns
  confidenceLevel: 'building' | 'optimal' | 'struggling';
  
  // Clustering & Context
  conceptSimilarity: string[]; // Related card IDs for clustering prevention
  lastClusterReview: string; // Prevent back-to-back similar content
  contextualDifficulty: ContextualDifficultyMap;
  
  // Enhanced Metadata
  stabilityTrend: 'increasing' | 'decreasing' | 'stable';
  retrievabilityHistory: number[]; // Track recall probability over time
  optimalInterval: number; // FSRS-calculated optimal next review
}

export interface EnhancedResponseLog {
  timestamp: string;
  rating: 'again' | 'hard' | 'good' | 'easy';
  responseTime: number;
  
  // Context Awareness
  contextualFactors: {
    sessionTime: number;
    timeOfDay: string;
    sessionFatigueIndex: number; // 0-1 fatigue level
    cognitiveLoadAtTime: number; // Cognitive capacity when answered
    environmentalFactors?: EnvironmentalContext;
  };
  
  // Momentum Impact
  momentumImpact: number; // How this response affected session flow
  confidenceChange: number; // Change in user confidence
  
  // Clustering Context
  previousCardSimilarity: number; // Similarity to previous card (0-1)
  clusteringContext: string; // Type of content cluster
}

export interface FlowStateMetrics {
  challengeSkillBalance: number; // Current challenge vs skill ratio
  engagementLevel: number; // User engagement indicators
  satisfactionPrediction: number; // Predicted session satisfaction
  momentumMaintenance: boolean; // Whether in optimal learning zone
}

export interface UnifiedSessionState {
  userId: string;
  sessionId: string;
  
  // Core Momentum
  sessionMomentumScore: number; // 0-1 running performance score
  momentumTrend: 'improving' | 'declining' | 'stable';
  
  // Cognitive Load Awareness
  sessionFatigueIndex: number; // 0-1 accumulated fatigue
  cognitiveLoadCapacity: number; // Current cognitive bandwidth
  attentionSpanRemaining: number; // Estimated focus remaining
  
  // Advanced Queue Management
  reviewQueue: string[]; // Main queue of card IDs
  lookaheadBuffer: UnifiedCard[]; // Next 8-12 cards for dynamic sorting
  emergencyBuffer: UnifiedCard[]; // Confidence boosters for crisis intervention
  challengeReserve: UnifiedCard[]; // Harder cards for engagement injection
  
  // Context & Analytics
  sessionStartTime: string;
  contextualFactors: SessionContext;
  adaptationHistory: AdaptationLog[];
  explanationLog: ExplanationEvent[]; // Why each card was selected
  
  // Flow State Optimization
  flowStateMetrics: FlowStateMetrics;
}

export interface CardSelectionResult {
  card: UnifiedCard;
  explanation: string;
  reasoning: string;
  confidence: number;
  alternativeOptions?: UnifiedCard[];
}

export interface DSRUpdate {
  difficulty: number;
  stability: number;
  retrievability: number;
  confidence: number;
  explanation: string;
}

// Session Metrics
export interface SessionMetrics {
  sessionId: string;
  userId: string;
  duration: number; // milliseconds
  cardsReviewed: number;
  averageMomentum: number;
  finalFatigueIndex: number;
  flowStateTime: number; // milliseconds in flow state
  adaptationAccuracy: number; // 0-1
  userSatisfaction: number; // 0-1
  completionReason: 'user_ended' | 'time_limit' | 'fatigue_limit' | 'goal_reached';
}

export interface DailyLearningReport {
  date: string;
  totalStudyTime: number; // milliseconds
  cardsReviewed: number;
  averageAccuracy: number;
  momentumTrend: 'improving' | 'declining' | 'stable';
  optimalStudyTimes: string[];
  improvementAreas: string[];
  achievements: string[];
}

// A/B Testing types
export interface ABTestEvent {
  testName: string;
  variant: 'control' | 'treatment';
  eventType: string;
  value: number;
  sessionId: string;
}

export interface TestMetrics {
  values: number[];
  mean: number;
  variance: number;
  sampleSize: number;
}

export interface ABTestResults {
  testName: string;
  control: TestMetrics;
  treatment: TestMetrics;
  significance: number;
  recommendation: string;
}

// Cache types
export interface CacheItem<T> {
  value: T;
  expiry: number;
}

export interface CacheConfig {
  ttl: number; // time to live in milliseconds
  maxSize: number;
}