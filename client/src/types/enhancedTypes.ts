export interface EnhancedCard {
  id: string;
  difficulty: number;
  stability: number;
  retrievability: number;
  fsrs_parameters: any[];
  performance_history: any[];
  average_response_time: number;
  cognitive_load_index: number;
  confidence_level: string;
  concept_similarity: string[];
  last_cluster_review: string;
  contextual_difficulty: { [key: string]: any };
  stability_trend: string;
  retrievability_history: any[];
  optimal_interval: number;
}

export interface SessionState {
  id: string;
  user_id: string;
  session_momentum_score: number;
  momentum_trend: string;
  session_fatigue_index: number;
  cognitive_load_capacity: number;
  attention_span_remaining: number;
  review_queue: string[];
  lookahead_buffer: string[];
  emergency_buffer: string[];
  challenge_reserve: string[];
  session_start_time: string;
  contextual_factors: { [key: string]: any };
  adaptation_history: any[];
  explanation_log: any[];
  flow_state_metrics: { [key: string]: any };
  created: Date;
  updated: Date;
}

export interface ResponseLog {
  id: string;
  user_id: string;
  card_id: string;
  session_id: string;
  response_time: number;
  response_accuracy: number;
  response_confidence: number;
  cognitive_load: number;
  emotional_state: string;
  context_factors: { [key: string]: any };
  timestamp: Date;
  created: Date;
  updated: Date;
}