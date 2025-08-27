import axios from 'axios';
import { UnifiedSessionState, CardSelectionResult, EnhancedResponseLog } from '../../../shared/types/enhanced-types';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  withCredentials: true,
});

export const uamsApiService = {
  async initializeSession(userId: string, deckId: string): Promise<UnifiedSessionState> {
    const response = await apiClient.post('/uams/session/initialize', { userId, deckId });
    return response.data;
  },

  async getNextCard(sessionState: UnifiedSessionState): Promise<CardSelectionResult> {
    const response = await apiClient.post('/uams/session/next-card', { sessionState });
    return response.data;
  },

  async processCardResponse(sessionState: UnifiedSessionState, cardId: string, response: EnhancedResponseLog): Promise<UnifiedSessionState> {
    const apiResponse = await apiClient.post('/uams/session/response', { sessionState, cardId, response });
    return apiResponse.data;
  },
};
