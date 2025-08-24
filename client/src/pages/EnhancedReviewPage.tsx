import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UnifiedQueueManager } from '../services/unifiedQueueManager';
import { EnvironmentalContextService } from '../services/environmental/environmentalContextService';
import { 
  UnifiedSessionState, 
  CardSelectionResult, 
  EnhancedResponseLog, 
  FlowStateMetrics,
  CognitiveLoadAnalysis
} from '../../../shared/types/enhanced-types';

interface EnhancedReviewPageProps {
  deckId: string;
  userId: string;
}

interface SessionMetrics {
  cardsReviewed: number;
  accuracy: number;
  averageResponseTime: number;
  sessionDuration: number;
}

const RATING_DESCRIPTIONS = {
  'again': { label: 'Again', color: 'bg-red-500', description: 'I need to review this again' },
  'hard': { label: 'Hard', color: 'bg-orange-500', description: 'It was difficult but I got it' },
  'good': { label: 'Good', color: 'bg-green-500', description: 'Good, normal effort' },
  'easy': { label: 'Easy', color: 'bg-blue-500', description: 'Easy, no effort required' }
};

export const EnhancedReviewPage: React.FC<EnhancedReviewPageProps> = ({ deckId, userId }) => {
  // Core state
  const [sessionState, setSessionState] = useState<UnifiedSessionState | null>(null);
  const [currentCard, setCurrentCard] = useState<CardSelectionResult | null>(null);
  const [responseStartTime, setResponseStartTime] = useState<number>(0);
  const [sessionMetrics, setSessionMetrics] = useState<SessionMetrics>({
    cardsReviewed: 0,
    accuracy: 0,
    averageResponseTime: 0,
    sessionDuration: 0
  });
  
  // UI state
  const [showExplanation, setShowExplanation] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMetricsPanel, setShowMetricsPanel] = useState(true);
  const [showCognitiveLoadDetail, setShowCognitiveLoadDetail] = useState(false);
  
  // Advanced state
  const [cognitiveLoadAnalysis, setCognitiveLoadAnalysis] = useState<CognitiveLoadAnalysis | null>(null);
  const [environmentalAdaptations, setEnvironmentalAdaptations] = useState<any>(null);
  
  // Services
  const queueManagerRef = useRef(new UnifiedQueueManager());
  const environmentalServiceRef = useRef(new EnvironmentalContextService());
  const intervalRef = useRef<NodeJS.Timeout>();
  
  const queueManager = queueManagerRef.current;
  const environmentalService = environmentalServiceRef.current;

  /**
   * Initialize session
   */
  useEffect(() => {
    const initializeSession = async () => {
      try {
        setIsLoading(true);
        console.log('Initializing UAMS v3.0 session...');
        
        const newSession = await queueManager.initializeSession(userId, deckId);
        setSessionState(newSession);
        
        const firstCard = await queueManager.getNextCard(newSession);
        setCurrentCard(firstCard);
        setResponseStartTime(Date.now());
        
        // Start environmental monitoring
        await startEnvironmentalMonitoring();
        
        console.log('Session initialized successfully');
      } catch (err) {
        console.error('Failed to initialize session:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize session');
      } finally {
        setIsLoading(false);
      }
    };

    initializeSession();

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [userId, deckId]);

  /**
   * Start environmental context monitoring
   */
  const startEnvironmentalMonitoring = async () => {
    try {
      const context = await environmentalService.getCurrentContext();
      const adaptations = environmentalService.getEnvironmentalAdaptations(context);
      setEnvironmentalAdaptations(adaptations);
      
      // Set up periodic context monitoring
      intervalRef.current = setInterval(async () => {
        await environmentalService.trackContextChanges();
      }, 30000); // Check every 30 seconds
      
      // Listen for context changes
      environmentalService.onContextChange = (current, previous) => {
        console.log('Environmental context changed:', { current, previous });
        const newAdaptations = environmentalService.getEnvironmentalAdaptations(current);
        setEnvironmentalAdaptations(newAdaptations);
      };
    } catch (error) {
      console.warn('Environmental monitoring setup failed:', error);
    }
  };

  /**
   * Handle card response
   */
  const handleCardResponse = useCallback(async (rating: 'again' | 'hard' | 'good' | 'easy') => {
    if (!sessionState || !currentCard) return;
    
    try {
      const responseTime = Date.now() - responseStartTime;
      const environmentalContext = await environmentalService.getCurrentContext();
      
      const enhancedResponse: EnhancedResponseLog = {
        timestamp: new Date().toISOString(),
        rating,
        responseTime,
        contextualFactors: {
          sessionTime: Date.now() - new Date(sessionState.sessionStartTime).getTime(),
          timeOfDay: new Date().toISOString(),
          sessionFatigueIndex: sessionState.sessionFatigueIndex,
          cognitiveLoadAtTime: sessionState.cognitiveLoadCapacity,
          environmentalFactors: environmentalContext
        },
        momentumImpact: calculateMomentumImpact(rating, sessionState),
        confidenceChange: calculateConfidenceChange(rating, currentCard.card),
        previousCardSimilarity: 0.0, // Would be calculated based on content
        clusteringContext: 'general'
      };
      
      console.log('Processing response:', { rating, responseTime, cardId: currentCard.card.id });
      
      // Process response and update session
      const updatedSession = await queueManager.processCardResponse(
        sessionState,
        currentCard.card.id,
        enhancedResponse
      );
      
      setSessionState(updatedSession);
      
      // Update session metrics
      updateSessionMetrics(rating, responseTime);
      
      // Get next card
      const nextCard = await queueManager.getNextCard(updatedSession);
      setCurrentCard(nextCard);
      setResponseStartTime(Date.now());
      setShowAnswer(false);
      
    } catch (err) {
      console.error('Error processing response:', err);
      setError('Failed to process your response. Please try again.');
    }
  }, [sessionState, currentCard, responseStartTime]);

  /**
   * Update session metrics
   */
  const updateSessionMetrics = (rating: string, responseTime: number) => {
    setSessionMetrics(prev => {
      const isCorrect = rating !== 'again';
      const newCardsReviewed = prev.cardsReviewed + 1;
      const newCorrectAnswers = isCorrect ? (prev.accuracy * prev.cardsReviewed + 1) : (prev.accuracy * prev.cardsReviewed);
      const newAccuracy = newCorrectAnswers / newCardsReviewed;
      const newAverageResponseTime = ((prev.averageResponseTime * prev.cardsReviewed) + responseTime) / newCardsReviewed;
      
      return {
        cardsReviewed: newCardsReviewed,
        accuracy: newAccuracy,
        averageResponseTime: newAverageResponseTime,
        sessionDuration: sessionState ? Date.now() - new Date(sessionState.sessionStartTime).getTime() : 0
      };
    });
  };

  /**
   * Show answer
   */
  const handleShowAnswer = () => {
    setShowAnswer(true);
  };

  /**
   * Handle keyboard shortcuts
   */
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!showAnswer) {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          handleShowAnswer();
        }
        return;
      }
      
      // Response shortcuts (when answer is shown)
      switch (e.key) {
        case '1':
          e.preventDefault();
          handleCardResponse('again');
          break;
        case '2':
          e.preventDefault();
          handleCardResponse('hard');
          break;
        case '3':
          e.preventDefault();
          handleCardResponse('good');
          break;
        case '4':
          e.preventDefault();
          handleCardResponse('easy');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showAnswer, handleCardResponse]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing UAMS v3.0 session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-red-700 mb-2">Session Error</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header with Session Metrics */}
      {showMetricsPanel && (
        <SessionMetricsHeader 
          sessionState={sessionState} 
          sessionMetrics={sessionMetrics}
          environmentalAdaptations={environmentalAdaptations}
          onToggleCognitiveDetail={() => setShowCognitiveLoadDetail(!showCognitiveLoadDetail)}
        />
      )}
      
      {/* Cognitive Load Detail Panel */}
      {showCognitiveLoadDetail && cognitiveLoadAnalysis && (
        <CognitiveLoadDetailPanel analysis={cognitiveLoadAnalysis} />
      )}
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Main Card Display */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          {currentCard && (
            <CardDisplay 
              card={currentCard.card} 
              showAnswer={showAnswer}
              onShowAnswer={handleShowAnswer}
            />
          )}
        </div>
        
        {/* Response Buttons */}
        {showAnswer && currentCard && (
          <ResponseButtons 
            onResponse={handleCardResponse}
            disabled={!showAnswer}
          />
        )}
        
        {/* Explanation Panel */}
        {showExplanation && currentCard && (
          <ExplanationPanel 
            explanation={currentCard.explanation}
            reasoning={currentCard.reasoning}
            confidence={currentCard.confidence}
            sessionState={sessionState}
          />
        )}
        
        {/* Flow State Indicator */}
        <FlowStateIndicator sessionState={sessionState} />
        
        {/* Session Controls */}
        <SessionControls 
          sessionState={sessionState}
          showMetricsPanel={showMetricsPanel}
          showExplanation={showExplanation}
          onToggleMetrics={() => setShowMetricsPanel(!showMetricsPanel)}
          onToggleExplanation={() => setShowExplanation(!showExplanation)}
          onEndSession={() => {/* Implement session end */}}
        />
      </div>
    </div>
  );
};

// Sub-components

const SessionMetricsHeader: React.FC<{
  sessionState: UnifiedSessionState | null;
  sessionMetrics: SessionMetrics;
  environmentalAdaptations: any;
  onToggleCognitiveDetail: () => void;
}> = ({ sessionState, sessionMetrics, environmentalAdaptations, onToggleCognitiveDetail }) => {
  if (!sessionState) return null;
  
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
          {/* Momentum */}
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="font-medium">Momentum</span>
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${sessionState.sessionMomentumScore * 100}%` }}
              />
            </div>
            <span className="text-xs font-mono">
              {(sessionState.sessionMomentumScore * 100).toFixed(0)}%
            </span>
          </div>
          
          {/* Energy */}
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="font-medium">Energy</span>
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(1 - sessionState.sessionFatigueIndex) * 100}%` }}
              />
            </div>
            <span className="text-xs font-mono">
              {((1 - sessionState.sessionFatigueIndex) * 100).toFixed(0)}%
            </span>
          </div>
          
          {/* Cognitive Load */}
          <button 
            onClick={onToggleCognitiveDetail}
            className="flex items-center space-x-2 hover:bg-gray-50 rounded px-2 py-1"
          >
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <span className="font-medium">Cognitive</span>
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${sessionState.cognitiveLoadCapacity * 100}%` }}
              />
            </div>
            <span className="text-xs font-mono">
              {(sessionState.cognitiveLoadCapacity * 100).toFixed(0)}%
            </span>
          </button>
          
          {/* Session Stats */}
          <div className="flex items-center space-x-4 text-xs">
            <span><strong>{sessionMetrics.cardsReviewed}</strong> cards</span>
            <span><strong>{(sessionMetrics.accuracy * 100).toFixed(0)}%</strong> accuracy</span>
          </div>
          
          {/* Duration */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="font-medium">Duration:</span>
            <span className="font-mono">{formatDuration(sessionMetrics.sessionDuration)}</span>
          </div>
        </div>
        
        {/* Flow State Indicator */}
        <div className="mt-3 flex items-center justify-between">
          <FlowStateIndicator sessionState={sessionState} />
          
          {environmentalAdaptations && (
            <EnvironmentalIndicator adaptations={environmentalAdaptations} />
          )}
        </div>
      </div>
    </div>
  );
};

const CardDisplay: React.FC<{
  card: any;
  showAnswer: boolean;
  onShowAnswer: () => void;
}> = ({ card, showAnswer, onShowAnswer }) => {
  return (
    <div className="text-center">
      {/* Front Content */}
      <div className="mb-8">
        <div className="prose prose-lg mx-auto">
          <div dangerouslySetInnerHTML={{ __html: card.frontContent }} />
        </div>
      </div>
      
      {/* Show Answer Button or Back Content */}
      {!showAnswer ? (
        <button
          onClick={onShowAnswer}
          className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-lg font-medium"
        >
          Show Answer
        </button>
      ) : (
        <div className="border-t pt-8">
          <div className="prose prose-lg mx-auto">
            <div dangerouslySetInnerHTML={{ __html: card.backContent }} />
          </div>
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-500 space-x-4">
        <span>Difficulty: {card.difficulty?.toFixed(1) || 'N/A'}</span>
        <span>•</span>
        <span>Success Rate: {((card.retrievability || 0.5) * 100).toFixed(0)}%</span>
        <span>•</span>
        <span>Confidence: {card.confidenceLevel || 'Unknown'}</span>
      </div>
    </div>
  );
};

const ResponseButtons: React.FC<{
  onResponse: (rating: 'again' | 'hard' | 'good' | 'easy') => void;
  disabled: boolean;
}> = ({ onResponse, disabled }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {Object.entries(RATING_DESCRIPTIONS).map(([rating, config]) => (
        <button
          key={rating}
          onClick={() => onResponse(rating as any)}
          disabled={disabled}
          className={`
            p-4 rounded-lg text-white font-medium transition-all duration-200
            ${config.color} hover:scale-105 hover:shadow-lg
            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
          `}
        >
          <div className="text-lg mb-1">{config.label}</div>
          <div className="text-xs opacity-90">{config.description}</div>
          <div className="text-xs mt-2 opacity-75">
            Press {Object.keys(RATING_DESCRIPTIONS).indexOf(rating) + 1}
          </div>
        </button>
      ))}
    </div>
  );
};

const FlowStateIndicator: React.FC<{ sessionState: UnifiedSessionState | null }> = ({ sessionState }) => {
  if (!sessionState) return null;
  
  const { challengeSkillBalance, engagementLevel, momentumMaintenance } = sessionState.flowStateMetrics;
  
  const getFlowZone = (balance: number): { zone: string; color: string } => {
    if (balance < 0.3) return { zone: 'Bored', color: 'text-yellow-600' };
    if (balance > 0.7) return { zone: 'Anxious', color: 'text-red-600' };
    return { zone: 'Flow Zone', color: 'text-green-600' };
  };
  
  const flowZone = getFlowZone(challengeSkillBalance);
  
  return (
    <div className="flex items-center space-x-4 text-sm">
      <div className={`font-medium ${flowZone.color}`}>
        {flowZone.zone}
      </div>
      <div className="text-gray-600">
        Engagement: {(engagementLevel * 100).toFixed(0)}%
      </div>
      {momentumMaintenance && (
        <div className="text-green-600">✓ Optimal Learning</div>
      )}
    </div>
  );
};

const EnvironmentalIndicator: React.FC<{ adaptations: any }> = ({ adaptations }) => {
  if (!adaptations) return null;
  
  return (
    <div className="flex items-center space-x-2 text-xs text-gray-600">
      {adaptations.difficultyAdjustment !== 0 && (
        <span className={`px-2 py-1 rounded ${
          adaptations.difficultyAdjustment > 0 ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
        }`}>
          Difficulty {adaptations.difficultyAdjustment > 0 ? '+' : ''}{adaptations.difficultyAdjustment.toFixed(1)}
        </span>
      )}
      {adaptations.visualOptimizations.colorScheme !== 'auto' && (
        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
          {adaptations.visualOptimizations.colorScheme} mode
        </span>
      )}
    </div>
  );
};

const ExplanationPanel: React.FC<{
  explanation: string;
  reasoning: string;
  confidence: number;
  sessionState: UnifiedSessionState | null;
}> = ({ explanation, reasoning, confidence, sessionState }) => {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
      <h4 className="text-lg font-semibold text-blue-900 mb-3">Why this card?</h4>
      <p className="text-blue-800 mb-4">{explanation}</p>
      
      <div className="flex items-center justify-between text-sm">
        <div className="flex space-x-4">
          <span className="px-3 py-1 bg-blue-200 text-blue-800 rounded-full">
            {reasoning.replace('_', ' ')}
          </span>
          <span className="text-blue-700">
            Confidence: {(confidence * 100).toFixed(0)}%
          </span>
        </div>
        
        {sessionState && (
          <div className="text-blue-600 text-xs">
            Queue: {sessionState.lookaheadBuffer.length} cards ahead
          </div>
        )}
      </div>
    </div>
  );
};

const CognitiveLoadDetailPanel: React.FC<{ analysis: CognitiveLoadAnalysis }> = ({ analysis }) => {
  return (
    <div className="bg-purple-50 border-b border-purple-200 px-6 py-4">
      <div className="max-w-6xl mx-auto">
        <h3 className="text-lg font-semibold text-purple-900 mb-3">Cognitive Load Analysis</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div>
            <h4 className="font-medium text-purple-800 mb-2">Current Status</h4>
            <div className="space-y-1 text-purple-700">
              <div>Load: {(analysis.currentLoad * 100).toFixed(0)}%</div>
              <div>Capacity: {(analysis.capacity * 100).toFixed(0)}%</div>
              <div>Utilization: {(analysis.utilizationRate * 100).toFixed(0)}%</div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-purple-800 mb-2">Predictions</h4>
            <div className="space-y-1 text-purple-700">
              <div>Attention Remaining: {analysis.attentionRemainingMinutes.toFixed(0)}min</div>
              <div>Sustainability: {(analysis.sustainabilityScore * 100).toFixed(0)}%</div>
              <div className={`font-medium ${
                analysis.alertLevel === 'red' ? 'text-red-600' :
                analysis.alertLevel === 'orange' ? 'text-orange-600' :
                analysis.alertLevel === 'yellow' ? 'text-yellow-600' : 'text-green-600'
              }`}>
                Status: {analysis.alertLevel.toUpperCase()}
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-purple-800 mb-2">Recommendations</h4>
            <div className="text-xs text-purple-600 space-y-1">
              {analysis.recommendations.slice(0, 3).map((rec, idx) => (
                <div key={idx}>• {rec}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SessionControls: React.FC<{
  sessionState: UnifiedSessionState | null;
  showMetricsPanel: boolean;
  showExplanation: boolean;
  onToggleMetrics: () => void;
  onToggleExplanation: () => void;
  onEndSession: () => void;
}> = ({ sessionState, showMetricsPanel, showExplanation, onToggleMetrics, onToggleExplanation, onEndSession }) => {
  return (
    <div className="fixed bottom-6 right-6 flex flex-col space-y-2">
      <button
        onClick={onToggleMetrics}
        className="px-4 py-2 bg-white rounded-full shadow-lg hover:shadow-xl transition-shadow text-sm font-medium"
      >
        {showMetricsPanel ? 'Hide' : 'Show'} Metrics
      </button>
      
      <button
        onClick={onToggleExplanation}
        className="px-4 py-2 bg-white rounded-full shadow-lg hover:shadow-xl transition-shadow text-sm font-medium"
      >
        {showExplanation ? 'Hide' : 'Show'} AI Reasoning
      </button>
      
      <button
        onClick={onEndSession}
        className="px-4 py-2 bg-red-500 text-white rounded-full shadow-lg hover:shadow-xl transition-shadow text-sm font-medium"
      >
        End Session
      </button>
    </div>
  );
};

// Helper functions
const calculateMomentumImpact = (rating: string, sessionState: UnifiedSessionState): number => {
  const baseImpact = { 'again': -0.2, 'hard': -0.05, 'good': 0.1, 'easy': 0.15 };
  return baseImpact[rating as keyof typeof baseImpact] || 0;
};

const calculateConfidenceChange = (rating: string, card: any): number => {
  const baseChange = { 'again': -0.1, 'hard': -0.02, 'good': 0.05, 'easy': 0.08 };
  return baseChange[rating as keyof typeof baseChange] || 0;
};

const getCurrentUserId = (): string => {
  // This would get the current user ID from your auth system
  return 'user-123';
};

const getCurrentDeckId = (): string => {
  // This would get the current deck ID from your routing/state
  return 'deck-456';
};

export default EnhancedReviewPage;