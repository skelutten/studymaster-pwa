// User and social types

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

export interface UserStreak {
  id: string
  userId: string
  currentStreak: number
  longestStreak: number
  lastStudyDate: string
  freezeCount: number
  createdAt: string
}

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

export interface UserAchievement {
  id: string
  userId: string
  achievementId: string
  earnedAt: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  progressData?: any
}

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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