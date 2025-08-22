// Deck and study configuration types

import { Card } from './cards'

export interface Deck {
  id: string
  userId: string
  title: string
  description: string
  cardCount: number
  isPublic: boolean
  settings: DeckSettings
  advancedSettings?: AdvancedDeckSettings
  createdAt: string
  updatedAt: string
  tags?: string[]
  category?: string
}

export interface DeckSettings {
  newCardsPerDay: number
  maxReviewsPerDay: number
  easyBonus: number
  intervalModifier: number
  maximumInterval: number
  minimumInterval: number
}

// Advanced Anki-style deck settings
export interface AdvancedDeckSettings {
  // New Cards
  newCards: {
    stepsMinutes: number[] // Learning steps in minutes [1, 10]
    orderNewCards: 'due' | 'random' // Order of new cards
    newCardsPerDay: number // Maximum new cards per day
    graduatingInterval: number // Days for graduating interval
    easyInterval: number // Days for easy interval
    startingEase: number // Starting ease factor (2500 = 250%)
    buryRelated: boolean // Bury related new cards
  }
  
  // Reviews
  reviews: {
    maximumReviewsPerDay: number // Maximum reviews per day
    easyBonus: number // Easy bonus multiplier (1.3 = 130%)
    intervalModifier: number // Global interval modifier (1.0 = 100%)
    maximumInterval: number // Maximum interval in days
    hardInterval: number // Hard interval multiplier (1.2 = 120%)
    newInterval: number // New interval after lapse (0.0 = 0%)
    minimumInterval: number // Minimum interval in days
    leechThreshold: number // Lapses before card becomes leech
    leechAction: 'suspend' | 'tag' // Action for leeches
  }
  
  // Lapses
  lapses: {
    stepsMinutes: number[] // Relearning steps [10]
    newInterval: number // New interval percentage (0.0 = 0%)
    minimumInterval: number // Minimum interval after lapse
    leechThreshold: number // Lapses to become leech
    leechAction: 'suspend' | 'tag' // Leech action
  }
  
  // General
  general: {
    ignoreAnswerTimesLongerThan: number // Seconds
    showAnswerTimer: boolean
    autoAdvance: boolean
    buryRelated: boolean
  }
  
  // Advanced
  advanced: {
    maximumAnswerSeconds: number
    showRemainingCardCount: boolean
    showNextReviewTime: boolean
    dayStartsAt: number // Hour when day starts (4 = 4 AM)
    learnAheadLimit: number // Minutes to learn ahead
    timezoneOffset: number
  }
}

// Study queue information
export interface StudyQueue {
  deckId: string
  newCards: Card[]
  learningCards: Card[]
  reviewCards: Card[]
  relearnCards: Card[]
  counts: {
    newCards: number
    learningCards: number
    reviewCards: number
    youngReviewCards: number // Review cards with interval < 21 days
    matureReviewCards: number // Review cards with interval >= 21 days
    relearnCards: number
    totalDue: number
  }
  limits: {
    newCardsRemaining: number
    reviewsRemaining: number
  }
  nextCardDue?: Date
  estimatedStudyTime: number // Estimated time in minutes
}

// Deck options preset
export interface DeckOptionsPreset {
  id: string
  name: string
  description: string
  settings: AdvancedDeckSettings
  isBuiltIn: boolean
  createdAt: string
  updatedAt: string
}

// Daily study limits and tracking
export interface DailyStudyLimits {
  deckId: string
  date: string // YYYY-MM-DD format
  newCardsStudied: number
  reviewsCompleted: number
  learningCardsCompleted: number
  totalStudyTime: number // in milliseconds
  resetAt: string // ISO timestamp when limits reset
}

// Study and Review types
export interface StudySession {
  id: string
  userId: string
  deckId: string
  cardsStudied: number
  correctAnswers: number
  sessionDurationMs: number
  xpEarned: number
  startedAt: string
  endedAt?: string
}

// Study algorithm types
export interface SpacedRepetitionData {
  easeFactor: number
  interval: number
  repetitions: number
  nextReview: Date
}

export interface StudyStats {
  totalCards: number
  newCards: number
  reviewCards: number
  learnCards: number
  averageEase: number
  retentionRate: number
  studyTime: number
  streak: number
}