import React, { useState, useEffect } from 'react';
import { UAMSClient } from '../services/uamsClient';
import { EnhancedCard, SessionState } from '../types/enhancedTypes';

const UAMSComponent: React.FC = () => {
  const [session, setSession] = useState<SessionState | null>(null);
  const [currentCard, setCurrentCard] = useState<EnhancedCard | null>(null);
  const [responseTime, setResponseTime] = useState<number>(0);
  const [responseAccuracy, setResponseAccuracy] = useState<number>(0);
  const [responseConfidence, setResponseConfidence] = useState<number>(0);
  const [cognitiveLoad, setCognitiveLoad] = useState<number>(0);
  const [emotionalState, setEmotionalState] = useState<string>('');
  const [contextFactors, setContextFactors] = useState<{ [key: string]: any }>({});

  useEffect(() => {
    const initializeSession = async () => {
      const userId = 'test-user-id'; // Replace with actual user ID
      const newSession = await UAMSClient.startSession(userId);
      setSession(newSession);
    };

    if (!session) {
      initializeSession();
    }
  }, [session]);

  const handleReviewCard = async () => {
    if (session && currentCard) {
      const nextCard = await UAMSClient.reviewCard(
        session.id,
        currentCard.id,
        responseTime,
        responseAccuracy,
        responseConfidence,
        cognitiveLoad,
        emotionalState,
        contextFactors
      );
      setCurrentCard(nextCard || null);
    }
  };

  const handleGetSessionStatus = async () => {
    if (session) {
      const updatedSession = await UAMSClient.getSessionStatus(session.id);
      setSession(updatedSession);
    }
  };

  return (
    <div>
      <h1>UAMS Component</h1>
      {session ? (
        <div>
          <p>Session ID: {session.id}</p>
          <p>Momentum Score: {session.session_momentum_score}</p>
          <p>Fatigue Index: {session.session_fatigue_index}</p>
          <button onClick={handleGetSessionStatus}>Refresh Session Status</button>
        </div>
      ) : (
        <p>Loading session...</p>
      )}
      {currentCard && (
        <div>
          <h2>Current Card</h2>
          <p>ID: {currentCard.id}</p>
          <p>Difficulty: {currentCard.difficulty}</p>
          <p>Stability: {currentCard.stability}</p>
          <p>Retrievability: {currentCard.retrievability}</p>
          <button onClick={handleReviewCard}>Review Card</button>
        </div>
      )}
      <div>
        <h2>Review Card</h2>
        <label>
          Response Time (ms):
          <input
            type="number"
            value={responseTime}
            onChange={(e) => setResponseTime(Number(e.target.value))}
          />
        </label>
        <label>
          Response Accuracy (%):
          <input
            type="number"
            value={responseAccuracy}
            onChange={(e) => setResponseAccuracy(Number(e.target.value))}
          />
        </label>
        <label>
          Response Confidence (%):
          <input
            type="number"
            value={responseConfidence}
            onChange={(e) => setResponseConfidence(Number(e.target.value))}
          />
        </label>
        <label>
          Cognitive Load (%):
          <input
            type="number"
            value={cognitiveLoad}
            onChange={(e) => setCognitiveLoad(Number(e.target.value))}
          />
        </label>
        <label>
          Emotional State:
          <input
            type="text"
            value={emotionalState}
            onChange={(e) => setEmotionalState(e.target.value)}
          />
        </label>
        <label>
          Context Factors (JSON):
          <textarea
            value={JSON.stringify(contextFactors, null, 2)}
            onChange={(e) =>
              setContextFactors(JSON.parse(e.target.value))
            }
          />
        </label>
      </div>
    </div>
  );
};

export default UAMSComponent;