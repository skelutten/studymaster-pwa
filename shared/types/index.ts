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

export interface Card {
  id: string
  deckId: string
  frontContent: string
  backContent: string
  cardType: CardType
  mediaRefs: MediaReference[]
  easeFactor: number
  intervalDays: number
  nextReview: string
  createdAt: string
  reviewCount: number
  lapseCount: number
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