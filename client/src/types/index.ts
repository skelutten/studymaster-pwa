// User types
export interface User {
  id: string
  email: string
  username: string
  level: number
  totalXp: number
  coins: number
  gems: number
  createdAt: string
  lastActive: string
  preferences: UserPreferences
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  language: string
  notifications: boolean
  soundEffects: boolean
  dailyGoal: number
  timezone: string
}

// Deck and Card types
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

export interface CardType {
  type: 'basic' | 'cloze' | 'multiple_choice' | 'image_occlusion' | 'audio' | 'svg_map'
  template?: string
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

export interface CardReview {
  id: string
  cardId: string
  sessionId: string
  rating: ReviewRating
  responseTimeMs: number
  reviewedAt: string
  wasCorrect: boolean
}

export type ReviewRating = 1 | 2 | 3 | 4 // Again, Hard, Good, Easy

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

// Gamification types
export interface UserStreak {
  id: string
  userId: string
  currentStreak: number
  longestStreak: number
  lastStudyDate: string
  freezeCount: number
  createdAt: string
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  category: AchievementCategory
  requirements: AchievementRequirement[]
  xpReward: number
  coinReward: number
  isSecret: boolean
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

export type AchievementCategory = 
  | 'study_milestones' 
  | 'accuracy' 
  | 'streaks' 
  | 'social' 
  | 'challenges' 
  | 'special'

export interface AchievementRequirement {
  type: string
  value: number
  operator: 'gte' | 'lte' | 'eq'
}

export interface UserAchievement {
  id: string
  userId: string
  achievementId: string
  earnedAt: string
  progressData?: any
}

export interface Challenge {
  id: string
  title: string
  description: string
  type: ChallengeType
  requirements: ChallengeRequirement[]
  rewards: ChallengeReward[]
  startDate: string
  endDate: string
  isActive: boolean
  participantCount: number
  // Enhanced monthly challenge properties
  difficulty?: ChallengeDifficulty
  storyArc?: ChallengeStoryArc
  milestones?: ChallengeMilestone[]
  communityGoal?: CommunityGoal
  exclusiveRewards?: ExclusiveReward[]
}

export type ChallengeType = 'daily' | 'weekly' | 'monthly' | 'community' | 'friend' | 'seasonal' | 'epic'

export type ChallengeDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'legendary'

export interface ChallengeStoryArc {
  id: string
  title: string
  description: string
  theme: string
  chapters: StoryChapter[]
  totalWeeks: number
  currentWeek: number
}

export interface StoryChapter {
  week: number
  title: string
  description: string
  narrative: string
  objectives: string[]
  unlockConditions: ChallengeRequirement[]
}

export interface ChallengeMilestone {
  id: string
  title: string
  description: string
  targetProgress: number
  rewards: ChallengeReward[]
  isCompleted: boolean
  completedAt?: string
}

export interface CommunityGoal {
  id: string
  title: string
  description: string
  targetValue: number
  currentValue: number
  participantCount: number
  rewards: ChallengeReward[]
  isGlobal: boolean
}

export interface ExclusiveReward {
  id: string
  type: 'title' | 'badge' | 'avatar' | 'theme' | 'emote' | 'border'
  name: string
  description: string
  rarity: 'rare' | 'epic' | 'legendary' | 'mythic'
  isLimited: boolean
  availableUntil?: string
}

export interface ChallengeRequirement {
  type: string
  target: number
  description: string
  // Enhanced requirement properties
  category?: 'study' | 'accuracy' | 'streak' | 'social' | 'time' | 'deck'
  subType?: string
  conditions?: RequirementCondition[]
}

export interface RequirementCondition {
  field: string
  operator: 'gte' | 'lte' | 'eq' | 'between'
  value: number | string
  secondValue?: number // for 'between' operator
}

export interface ChallengeReward {
  type: 'xp' | 'coins' | 'gems' | 'badge' | 'title' | 'exclusive'
  amount?: number
  itemId?: string
  // Enhanced reward properties
  multiplier?: number
  isRare?: boolean
  description?: string
}

export interface ChallengeParticipation {
  id: string
  userId: string
  challengeId: string
  progress: Record<string, number>
  completed: boolean
  joinedAt: string
  completedAt?: string
  // Enhanced participation properties
  milestoneProgress: Record<string, boolean>
  weeklyProgress: WeeklyProgress[]
  currentStreak: number
  bestWeek: number
}

export interface WeeklyProgress {
  week: number
  startDate: string
  endDate: string
  progress: Record<string, number>
  completed: boolean
  completedAt?: string
  storyUnlocked: boolean
}

// Leaderboard types
export interface LeaderboardEntry {
  userId: string
  username: string
  score: number
  rank: number
  change: number // Position change from previous period
  avatar?: string
  // Enhanced leaderboard properties
  tier?: LeaderboardTier
  badges?: string[]
  monthlyScore?: number
  weeklyScore?: number
}

export interface Leaderboard {
  id: string
  type: LeaderboardType
  period: LeaderboardPeriod
  entries: LeaderboardEntry[]
  updatedAt: string
  // Enhanced leaderboard properties
  seasonId?: string
  rewards?: LeaderboardRewards
  tiers?: LeaderboardTier[]
}

export type LeaderboardType = 'xp' | 'streak' | 'accuracy' | 'cards_studied' | 'monthly_challenge' | 'community_contribution'
export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'seasonal' | 'all_time'

export interface LeaderboardTier {
  name: string
  minRank: number
  maxRank: number
  color: string
  rewards: ChallengeReward[]
}

export interface LeaderboardRewards {
  top1: ChallengeReward[]
  top3: ChallengeReward[]
  top10: ChallengeReward[]
  top100: ChallengeReward[]
  participation: ChallengeReward[]
}

// Social types
export interface Friendship {
  id: string
  userId: string
  friendId: string
  status: 'pending' | 'accepted' | 'blocked'
  createdAt: string
}

export interface StudyGroup {
  id: string
  name: string
  description: string
  ownerId: string
  memberIds: string[]
  deckIds: string[]
  isPrivate: boolean
  createdAt: string
}

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  hasNext: boolean
  hasPrev: boolean
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

// Notification types
export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  data?: any
  read: boolean
  createdAt: string
}

export type NotificationType = 
  | 'achievement_earned'
  | 'challenge_completed'
  | 'streak_reminder'
  | 'friend_request'
  | 'study_reminder'
  | 'deck_shared'
  | 'monthly_challenge_started'
  | 'story_chapter_unlocked'
  | 'milestone_reached'
  | 'community_goal_achieved'
  | 'leaderboard_position_changed'

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
      case 'review':
        const maturity = card.ivl < 21 ? 'Young' : 'Mature'
        return `Review (${maturity}) - Finished learning, scheduled for review`
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
      case 'relearning':
        // Learning cards use minutes, check if due time has passed
        const dueTime = currentDate.getTime() + (card.left * 60 * 1000)
        return dueTime <= currentDate.getTime()
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