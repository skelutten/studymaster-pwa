// Challenge and gamification types

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