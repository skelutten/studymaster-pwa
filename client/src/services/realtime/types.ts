// Types for real-time data services

export interface GlobalLearningStats {
  totalLearners: number
  cardsStudiedToday: number
  activeStudySessions: number
  languagesBeingLearned: number
  topSubjects: Array<{ name: string; learners: number }>
  studyTimeToday: number // in minutes
  lastUpdated: string
}

export interface EducationalTrends {
  popularSubjects: Array<{ subject: string; growth: number; learners: number }>
  learningMethods: Array<{ method: string; effectiveness: number; usage: number }>
  studyPatterns: {
    peakHours: Array<{ hour: number; activity: number }>
    weeklyTrends: Array<{ day: string; sessions: number }>
  }
  lastUpdated: string
}

export interface LiveUserMetrics {
  onlineUsers: number
  studyingSessions: number
  completedToday: number
  averageAccuracy: number
  topPerformers: Array<{ username: string; score: number; country: string }>
  lastUpdated: string
}

export interface MarketInsights {
  skillDemand: Array<{ skill: string; demand: number; growth: number }>
  industryTrends: Array<{ industry: string; skills: string[]; growth: number }>
  certificationValue: Array<{ cert: string; value: number; popularity: number }>
  lastUpdated: string
}

export type DataType = 'globalStats' | 'educationalTrends' | 'liveMetrics' | 'marketInsights'

export interface SubscriptionCallback<T = unknown> {
  (data: T): void
}

export interface UnsubscribeFunction {
  (): void
}