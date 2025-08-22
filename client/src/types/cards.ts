// Card and deck types

// Enhanced Anki-style card states
export type CardState = 'new' | 'learning' | 'review' | 'relearning' | 'suspended' | 'buried'

// Review card sub-types (for statistics and UI)
export type ReviewCardType = 'young' | 'mature'

export interface Card {
  id: string
  deckId: string
  frontContent: string
  backContent: string
  cardType: CardType
  mediaRefs: MediaReference[]
  
  // Legacy fields (for backward compatibility)
  easeFactor: number
  intervalDays: number
  nextReview: string
  createdAt: string
  reviewCount: number
  lapseCount: number
  
  // Enhanced Anki-style fields
  state: CardState
  queue: number // 0=new, 1=learning, 2=review, 3=day learning, -1=suspended, -2=buried
  due: number // Days since epoch for scheduling
  ivl: number // Current interval in days
  factor: number // Ease factor (2500 = 250%)
  reps: number // Total number of reviews
  lapses: number // Number of times card has lapsed
  left: number // Reviews left today (for learning cards)
  
  // Learning state
  learningStep: number // Current step in learning/relearning sequence
  graduationInterval: number // Days until card graduates to review
  easyInterval: number // Days if marked as easy during learning
  
  // Timing and performance
  totalStudyTime: number // Total time spent studying this card (ms)
  averageAnswerTime: number // Average answer time (ms)
  
  // Metadata
  flags: number // Bitfield for various flags (marked, leech, etc.)
  originalDue: number // Original due date before preview/cramming
  originalDeck: string // Original deck ID if moved
  
  // Gamification integration
  xpAwarded: number // Total XP awarded for this card
  difficultyRating: number // User-perceived difficulty (1-5)
}

export interface CardType {
  type: 'basic' | 'cloze' | 'multiple_choice' | 'image_occlusion' | 'audio' | 'svg_map'
  template?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: any
}

export interface SvgMapCardOptions {
  mapId: string
  countryId: string
  countryName: string
  svgPath: string
}

export interface MediaReference {
  id: string
  type: 'image' | 'audio' | 'video'
  url: string
  filename: string
  size: number
}

export type ReviewRating = 1 | 2 | 3 | 4 // Again, Hard, Good, Easy

export interface CardReview {
  id: string
  cardId: string
  sessionId: string
  rating: ReviewRating
  responseTimeMs: number
  reviewedAt: string
  wasCorrect: boolean
}

// Enhanced review with timing and context
export interface EnhancedCardReview extends CardReview {
  timeTaken: number // Time taken to answer in milliseconds
  previousState: CardState // Card state before this review
  newState: CardState // Card state after this review
  previousInterval: number // Previous interval before review
  newInterval: number // New interval after review
  easeFactor: number // Ease factor after review
  learningStep?: number // Learning step if applicable
  isLapse: boolean // Whether this review was a lapse
  schedulingData: {
    algorithm: 'SM2' | 'SM2+' | 'ANKI'
    fuzzFactor: number // Random factor applied to interval
    intervalModifier: number // Deck-specific modifier applied
  }
}

// Learning step configuration
export interface LearningStep {
  stepNumber: number
  intervalMinutes: number
  isGraduating: boolean // True if this step graduates the card
}

// Card scheduling result
export interface SchedulingResult {
  card: Card
  wasCorrect: boolean
  previousState: CardState
  newState: CardState
  intervalChange: number
  nextReviewDate: Date
  debugInfo: {
    algorithm: string
    calculatedInterval: number
    appliedFuzz: number
    finalInterval: number
    easeFactorChange: number
    reasoning: string
  }
}

// Card migration data for backward compatibility
export interface CardMigrationData {
  cardId: string
  migratedAt: string
  oldFormat: {
    easeFactor: number
    intervalDays: number
    nextReview: string
    reviewCount: number
    lapseCount: number
  }
  newFormat: {
    state: CardState
    queue: number
    due: number
    ivl: number
    factor: number
    reps: number
    lapses: number
  }
  migrationNotes: string[]
}

// Utility functions for Anki-style card state management
export const CardStateUtils = {
  /**
   * Determine if a review card is young (interval < 21 days) or mature (interval >= 21 days)
   */
  getReviewCardType(card: Card): ReviewCardType {
    if (card.state !== 'review') {
      throw new Error('Card must be in review state to determine maturity')
    }
    return card.ivl < 21 ? 'young' : 'mature'
  },

  /**
   * Get human-readable card state description
   */
  getCardStateDescription(card: Card): string {
    switch (card.state) {
      case 'new':
        return 'New - Never studied before'
      case 'learning':
        return 'Learning - Recently seen, still being learned'
      case 'review': {
        const maturity = card.ivl < 21 ? 'Young' : 'Mature'
        return `Review (${maturity}) - Finished learning, scheduled for review`
      }
      case 'relearning':
        return 'Relearning - Failed in review, being relearned'
      case 'suspended':
        return 'Suspended - Manually suspended from study'
      case 'buried':
        return 'Buried - Hidden until next day'
      default:
        return 'Unknown state'
    }
  },

  /**
   * Get card state color for UI display
   */
  getCardStateColor(card: Card): string {
    switch (card.state) {
      case 'new':
        return '#3b82f6' // Blue
      case 'learning':
        return '#f59e0b' // Amber
      case 'review':
        return card.ivl < 21 ? '#10b981' : '#059669' // Green (lighter for young, darker for mature)
      case 'relearning':
        return '#ef4444' // Red
      case 'suspended':
        return '#6b7280' // Gray
      case 'buried':
        return '#9ca3af' // Light gray
      default:
        return '#374151' // Dark gray
    }
  },

  /**
   * Check if a card is due for study
   */
  isCardDue(card: Card, currentDate: Date = new Date()): boolean {
    const currentDay = Math.floor(currentDate.getTime() / (24 * 60 * 60 * 1000))
    
    switch (card.state) {
      case 'new':
        return true // New cards are always available (subject to daily limits)
      case 'learning':
      case 'relearning': {
        // Learning cards use minutes, check if due time has passed
        const dueTime = currentDate.getTime() + (card.left * 60 * 1000)
        return dueTime <= currentDate.getTime()
      }
      case 'review':
        return card.due <= currentDay
      case 'suspended':
      case 'buried':
        return false // These cards are not available for study
      default:
        return false
    }
  },

  /**
   * Get the next review date for a card
   */
  getNextReviewDate(card: Card): Date | null {
    switch (card.state) {
      case 'new':
        return null // New cards don't have a scheduled review
      case 'learning':
      case 'relearning':
        // Learning cards are due in 'left' minutes
        return new Date(Date.now() + card.left * 60 * 1000)
      case 'review':
        // Review cards use days since epoch
        return new Date(card.due * 24 * 60 * 60 * 1000)
      case 'suspended':
      case 'buried':
        return null // These cards have no scheduled review
      default:
        return null
    }
  },

  /**
   * Calculate days overdue for a review card
   */
  getDaysOverdue(card: Card, currentDate: Date = new Date()): number {
    if (card.state !== 'review') {
      return 0
    }
    
    const currentDay = Math.floor(currentDate.getTime() / (24 * 60 * 60 * 1000))
    return Math.max(0, currentDay - card.due)
  },

  /**
   * Get study priority for card ordering
   */
  getStudyPriority(card: Card): number {
    switch (card.state) {
      case 'learning':
      case 'relearning':
        return 1 // Highest priority
      case 'review':
        return 2 // Medium priority
      case 'new':
        return 3 // Lower priority
      case 'suspended':
      case 'buried':
        return 999 // Should not be studied
      default:
        return 999
    }
  }
}