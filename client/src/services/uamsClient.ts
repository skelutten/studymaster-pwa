import axios from 'axios';
import { EnhancedCard, SessionState, ResponseLog } from '../types/enhancedTypes';

const API_URL = 'http://localhost:3000/api/uams';

export class UAMSClient {
  static async startSession(userId: string): Promise<SessionState> {
    const response = await axios.post(`${API_URL}/start-session`, { userId });
    return response.data;
  }

  static async reviewCard(
    sessionId: string,
    cardId: string,
    responseTime: number,
    responseAccuracy: number,
    responseConfidence: number,
    cognitiveLoad: number,
    emotionalState: string,
    contextFactors: { [key: string]: any }
  ): Promise<EnhancedCard | null> {
    const response = await axios.post(`${API_URL}/review-card`, {
      sessionId,
      cardId,
      responseTime,
      responseAccuracy,
      responseConfidence,
      cognitiveLoad,
      emotionalState,
      contextFactors,
    });
    return response.data;
  }

  static async getSessionStatus(sessionId: string): Promise<SessionState> {
    const response = await axios.get(`${API_URL}/session-status/${sessionId}`);
    return response.data;
  }
}