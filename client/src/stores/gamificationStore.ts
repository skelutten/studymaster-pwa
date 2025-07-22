import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Achievement,
  UserAchievement,
  UserStreak,
  Challenge,
  ChallengeParticipation,
  Leaderboard,
  WeeklyProgress
} from '@shared/types'

interface UserStats {
  totalCards: number
  cardsStudiedToday: number
  cardsStudiedThisWeek: number
  cardsStudiedThisMonth: number
  averageAccuracy: number
  totalStudyTime: number // in minutes
  studyTimeToday: number // in minutes
  studyTimeThisWeek: number // in minutes
  decksCreated: number
  decksCompleted: number
  longestStreak: number
  currentStreak: number
  // Currency system
  gold: number
  diamonds: number
  // User level and XP
  level: number
  xp: number
  xpToNextLevel: number
}

interface GamificationState {
  // User stats
  userStats: UserStats
  
  // Achievements
  achievements: Achievement[]
  userAchievements: UserAchievement[]
  
  // Streaks
  userStreak: UserStreak | null
  
  // Challenges
  activeChallenges: Challenge[]
  userChallengeParticipations: ChallengeParticipation[]
  
  // Leaderboards
  leaderboards: Record<string, Leaderboard>
  
  // User state tracking
  isFirstTimeUser: boolean
  isInitialized: boolean
  
  // Actions
  updateUserStats: (stats: Partial<UserStats>) => void
  addUserAchievement: (achievementId: string) => void
  updateStreak: (streak: Partial<UserStreak>) => void
  joinChallenge: (challengeId: string) => void
  updateChallengeProgress: (challengeId: string, progress: Record<string, number>) => void
  claimChallengeReward: (challengeId: string) => void
  initializeMockData: () => void
  initializeNewUser: () => void
  initializeUserData: (isDemo?: boolean) => void
  resetAllUserData: () => void
  addCurrency: (gold: number, diamonds: number) => void
  spendCurrency: (gold: number, diamonds: number) => boolean
  awardStudyXP: (cardsStudied: number, correctAnswers: number) => void
  
  // Monthly Challenge Management
  updateMilestoneProgress: (challengeId: string, milestoneId: string, completed: boolean) => void
  updateWeeklyProgress: (challengeId: string, weekData: WeeklyProgress) => void
  updateChallengeStreak: (challengeId: string, streak: number) => void
  unlockStoryChapter: (challengeId: string, week: number) => void
  claimMilestoneReward: (challengeId: string, milestoneId: string) => void
  contributeToCommunityGoal: (goalId: string, contribution: number) => void
}

// Mock data
const mockAchievements: Achievement[] = [
  {
    id: '1',
    name: 'First Steps',
    description: 'Complete your first study session',
    icon: '🎯',
    category: 'study_milestones',
    requirements: [{ type: 'sessions_completed', value: 1, operator: 'gte' }],
    xpReward: 50,
    coinReward: 10,
    isSecret: false,
    rarity: 'common'
  },
  {
    id: '2',
    name: 'Streak Master',
    description: 'Maintain a 7-day study streak',
    icon: '🔥',
    category: 'streaks',
    requirements: [{ type: 'current_streak', value: 7, operator: 'gte' }],
    xpReward: 200,
    coinReward: 50,
    isSecret: false,
    rarity: 'rare'
  },
  {
    id: '3',
    name: 'Perfect Score',
    description: 'Get 100% accuracy in a 20+ card session',
    icon: '💯',
    category: 'accuracy',
    requirements: [
      { type: 'session_accuracy', value: 100, operator: 'eq' },
      { type: 'session_cards', value: 20, operator: 'gte' }
    ],
    xpReward: 150,
    coinReward: 30,
    isSecret: false,
    rarity: 'rare'
  },
  {
    id: '4',
    name: 'Speed Demon',
    description: 'Complete 50 cards in under 10 minutes',
    icon: '⚡',
    category: 'special',
    requirements: [
      { type: 'cards_in_session', value: 50, operator: 'gte' },
      { type: 'session_time', value: 600, operator: 'lte' }
    ],
    xpReward: 300,
    coinReward: 75,
    isSecret: false,
    rarity: 'epic'
  },
  {
    id: '5',
    name: 'Scholar',
    description: 'Study 1000 cards total',
    icon: '📚',
    category: 'study_milestones',
    requirements: [{ type: 'total_cards', value: 1000, operator: 'gte' }],
    xpReward: 500,
    coinReward: 100,
    isSecret: false,
    rarity: 'epic'
  },
  {
    id: '6',
    name: 'Legend',
    description: 'Reach level 20',
    icon: '👑',
    category: 'special',
    requirements: [{ type: 'user_level', value: 20, operator: 'gte' }],
    xpReward: 1000,
    coinReward: 500,
    isSecret: false,
    rarity: 'legendary'
  }
]

const mockChallenges: Challenge[] = [
  {
    id: '1',
    title: 'Daily Grind',
    description: 'Study 25 cards today',
    type: 'daily',
    requirements: [{ type: 'cards_studied_today', target: 25, description: 'Study 25 cards' }],
    rewards: [
      { type: 'xp', amount: 50 },
      { type: 'coins', amount: 10 }
    ],
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    isActive: true,
    participantCount: 1247
  },
  {
    id: '2',
    title: 'Weekly Warrior',
    description: 'Complete 200 cards this week',
    type: 'weekly',
    requirements: [{ type: 'cards_studied_week', target: 200, description: 'Study 200 cards this week' }],
    rewards: [
      { type: 'xp', amount: 200 },
      { type: 'coins', amount: 50 },
      { type: 'gems', amount: 5 }
    ],
    startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true,
    participantCount: 892
  },
  {
    id: '3',
    title: 'Accuracy Master',
    description: 'Maintain 90%+ accuracy for 5 sessions',
    type: 'weekly',
    requirements: [{ type: 'accuracy_sessions', target: 5, description: 'Complete 5 sessions with 90%+ accuracy' }],
    rewards: [
      { type: 'xp', amount: 300 },
      { type: 'coins', amount: 75 },
      { type: 'badge', itemId: 'accuracy_master' }
    ],
    startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true,
    participantCount: 456
  }
]

const mockLeaderboards: Record<string, Leaderboard> = {
  'xp_weekly': {
    id: 'xp_weekly',
    type: 'xp',
    period: 'weekly',
    entries: [
      { userId: '1', username: 'DemoUser', score: 2500, rank: 1, change: 0 },
      { userId: '2', username: 'StudyMaster', score: 2350, rank: 2, change: 1 },
      { userId: '3', username: 'FlashcardPro', score: 2200, rank: 3, change: -1 },
      { userId: '4', username: 'LearnFast', score: 2100, rank: 4, change: 2 },
      { userId: '5', username: 'MemoryKing', score: 2050, rank: 5, change: -1 },
      { userId: '6', username: 'QuizWhiz', score: 1980, rank: 6, change: 0 },
      { userId: '7', username: 'CardShark', score: 1920, rank: 7, change: 3 },
      { userId: '8', username: 'BrainBoost', score: 1850, rank: 8, change: -2 },
      { userId: '9', username: 'StudyBuddy', score: 1800, rank: 9, change: 1 },
      { userId: '10', username: 'FlashGenius', score: 1750, rank: 10, change: -1 }
    ],
    updatedAt: new Date().toISOString()
  },
  'streak_all_time': {
    id: 'streak_all_time',
    type: 'streak',
    period: 'all_time',
    entries: [
      { userId: '2', username: 'StudyMaster', score: 45, rank: 1, change: 0 },
      { userId: '3', username: 'FlashcardPro', score: 38, rank: 2, change: 0 },
      { userId: '4', username: 'LearnFast', score: 32, rank: 3, change: 1 },
      { userId: '1', username: 'DemoUser', score: 28, rank: 4, change: -1 },
      { userId: '5', username: 'MemoryKing', score: 25, rank: 5, change: 0 },
      { userId: '6', username: 'QuizWhiz', score: 22, rank: 6, change: 2 },
      { userId: '7', username: 'CardShark', score: 20, rank: 7, change: -1 },
      { userId: '8', username: 'BrainBoost', score: 18, rank: 8, change: -1 },
      { userId: '9', username: 'StudyBuddy', score: 15, rank: 9, change: 0 },
      { userId: '10', username: 'FlashGenius', score: 12, rank: 10, change: 0 }
    ],
    updatedAt: new Date().toISOString()
  }
}

// Helper function to calculate level from XP
const calculateLevel = (xp: number): number => {
  return Math.floor(Math.sqrt(xp / 100)) + 1
}

// Helper function to calculate XP needed for next level
const calculateXPToNextLevel = (level: number): number => {
  const nextLevelXP = Math.pow(level, 2) * 100
  return nextLevelXP
}

// Initial clean state for new users
const getInitialUserStats = (): UserStats => ({
  totalCards: 0,
  cardsStudiedToday: 0,
  cardsStudiedThisWeek: 0,
  cardsStudiedThisMonth: 0,
  averageAccuracy: 0,
  totalStudyTime: 0,
  studyTimeToday: 0,
  studyTimeThisWeek: 0,
  decksCreated: 0,
  decksCompleted: 0,
  longestStreak: 0,
  currentStreak: 0,
  gold: 0,
  diamonds: 0,
  level: 1,
  xp: 0,
  xpToNextLevel: 100
})

// Demo data for demonstration purposes
const getDemoUserStats = (): UserStats => ({
  totalCards: 1250,
  cardsStudiedToday: 45,
  cardsStudiedThisWeek: 180,
  cardsStudiedThisMonth: 720,
  averageAccuracy: 87.5,
  totalStudyTime: 2400, // 40 hours
  studyTimeToday: 35,
  studyTimeThisWeek: 240, // 4 hours
  decksCreated: 8,
  decksCompleted: 3,
  longestStreak: 28,
  currentStreak: 12,
  gold: 100,
  diamonds: 10,
  level: 8,
  xp: 6400,
  xpToNextLevel: 8100
})

export const useGamificationStore = create<GamificationState>()(
  persist(
    (set, get) => ({
      userStats: getInitialUserStats(),
      isFirstTimeUser: true,
      isInitialized: false,
      
      achievements: mockAchievements,
      userAchievements: [],
      
      userStreak: null,
      
      activeChallenges: mockChallenges,
      userChallengeParticipations: [],
      
      leaderboards: mockLeaderboards,
      
      updateUserStats: (stats) => {
        set((state) => {
          const newStats = { ...state.userStats, ...stats }
          
          // Recalculate level and XP if XP changed
          if (stats.xp !== undefined) {
            newStats.level = calculateLevel(newStats.xp)
            newStats.xpToNextLevel = calculateXPToNextLevel(newStats.level)
          }
          
          return {
            userStats: newStats,
            isFirstTimeUser: false,
            isInitialized: true
          }
        })
      },
      
      addUserAchievement: (achievementId) => {
        const { userAchievements } = get()
        if (!userAchievements.find(ua => ua.achievementId === achievementId)) {
          set((state) => ({
            userAchievements: [
              ...state.userAchievements,
              {
                id: Date.now().toString(),
                userId: '1',
                achievementId,
                earnedAt: new Date().toISOString()
              }
            ]
          }))
        }
      },
      
      updateStreak: (streak) => {
        set((state) => ({
          userStreak: state.userStreak ? { ...state.userStreak, ...streak } : null
        }))
      },
      
      joinChallenge: (challengeId) => {
        const { userChallengeParticipations } = get()
        if (!userChallengeParticipations.find(p => p.challengeId === challengeId)) {
          set((state) => ({
            userChallengeParticipations: [
              ...state.userChallengeParticipations,
              {
                id: Date.now().toString(),
                userId: '1',
                challengeId,
                progress: {},
                completed: false,
                joinedAt: new Date().toISOString(),
                milestoneProgress: {},
                weeklyProgress: [],
                currentStreak: 0,
                bestWeek: 0
              }
            ]
          }))
        }
      },
      
      updateChallengeProgress: (challengeId, progress) => {
        set((state) => ({
          userChallengeParticipations: state.userChallengeParticipations.map(p =>
            p.challengeId === challengeId
              ? { ...p, progress: { ...p.progress, ...progress } }
              : p
          )
        }))
      },
      
      claimChallengeReward: (challengeId) => {
        const { activeChallenges, userChallengeParticipations } = get()
        const challenge = activeChallenges.find(c => c.id === challengeId)
        const participation = userChallengeParticipations.find(p => p.challengeId === challengeId)
        
        if (challenge && participation && participation.completed) {
          // Calculate total XP and coins from rewards
          let xpGained = 0
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          let _coinsGained = 0
          
          challenge.rewards.forEach(reward => {
            if (reward.type === 'xp' && reward.amount) {
              xpGained += reward.amount
            } else if (reward.type === 'coins' && reward.amount) {
              _coinsGained += reward.amount
            }
          })
          
          // Update user stats with rewards
          set((state) => ({
            userStats: {
              ...state.userStats,
              totalCards: state.userStats.totalCards + xpGained / 10 // Rough conversion
            },
            // Remove the participation since reward is claimed
            userChallengeParticipations: state.userChallengeParticipations.filter(
              p => p.challengeId !== challengeId
            )
          }))
        }
      },
      
      initializeMockData: () => {
        // This function can be called to load demo data
        set({
          userStats: getDemoUserStats(),
          achievements: mockAchievements,
          activeChallenges: mockChallenges,
          leaderboards: mockLeaderboards,
          userAchievements: [
            {
              id: '1',
              userId: '1',
              achievementId: '1',
              earnedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
              id: '2',
              userId: '1',
              achievementId: '2',
              earnedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
            }
          ],
          userStreak: {
            id: '1',
            userId: '1',
            currentStreak: 12,
            longestStreak: 28,
            lastStudyDate: new Date().toISOString(),
            freezeCount: 2,
            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
          },
          userChallengeParticipations: [
            {
              id: '1',
              userId: '1',
              challengeId: '1',
              progress: { cards_studied_today: 45 } as Record<string, number>,
              completed: true,
              joinedAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
              milestoneProgress: { 'milestone_1': true },
              weeklyProgress: [],
              currentStreak: 5,
              bestWeek: 1
            },
            {
              id: '2',
              userId: '1',
              challengeId: '2',
              progress: { cards_studied_week: 180 } as Record<string, number>,
              completed: false,
              joinedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
              milestoneProgress: { 'milestone_1': true, 'milestone_2': false },
              weeklyProgress: [
                {
                  week: 1,
                  startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                  endDate: new Date().toISOString(),
                  progress: { cards_studied_week: 180 },
                  completed: true,
                  completedAt: new Date().toISOString(),
                  storyUnlocked: true
                }
              ],
              currentStreak: 3,
              bestWeek: 1
            }
          ] as ChallengeParticipation[],
          isFirstTimeUser: false,
          isInitialized: true
        })
      },

      initializeNewUser: () => {
        // Initialize a completely fresh user
        set({
          userStats: getInitialUserStats(),
          userAchievements: [],
          userStreak: null,
          userChallengeParticipations: [],
          isFirstTimeUser: false,
          isInitialized: true
        })
      },

      resetAllUserData: () => {
        // Reset all user-specific data to initial state
        set({
          userStats: getInitialUserStats(),
          userAchievements: [],
          userStreak: null,
          userChallengeParticipations: [],
          isFirstTimeUser: true,
          isInitialized: true
        })
      },

      addCurrency: (gold, diamonds) => {
        set((state) => ({
          userStats: {
            ...state.userStats,
            gold: state.userStats.gold + gold,
            diamonds: state.userStats.diamonds + diamonds
          }
        }))
      },

      spendCurrency: (gold, diamonds) => {
        const { userStats } = get()
        if (userStats.gold >= gold && userStats.diamonds >= diamonds) {
          set((state) => ({
            userStats: {
              ...state.userStats,
              gold: state.userStats.gold - gold,
              diamonds: state.userStats.diamonds - diamonds
            }
          }))
          return true
        }
        return false
      },

      // Initialize user data based on authentication status
      initializeUserData: (isDemo: boolean = false) => {
        const state = get()
        
        // Only initialize if not already done
        if (!state.isInitialized) {
          if (isDemo) {
            // Load demo data for demo users
            set({
              userStats: getDemoUserStats(),
              achievements: mockAchievements,
              activeChallenges: mockChallenges,
              leaderboards: mockLeaderboards,
              userAchievements: [
                {
                  id: '1',
                  userId: '1',
                  achievementId: '1',
                  earnedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
                },
                {
                  id: '2',
                  userId: '1',
                  achievementId: '2',
                  earnedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
                }
              ],
              userStreak: {
                id: '1',
                userId: '1',
                currentStreak: 12,
                longestStreak: 28,
                lastStudyDate: new Date().toISOString(),
                freezeCount: 2,
                createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
              },
              userChallengeParticipations: [
                {
                  id: '1',
                  userId: '1',
                  challengeId: '1',
                  progress: { cards_studied_today: 45 } as Record<string, number>,
                  completed: true,
                  joinedAt: new Date().toISOString(),
                  completedAt: new Date().toISOString()
                },
                {
                  id: '2',
                  userId: '1',
                  challengeId: '2',
                  progress: { cards_studied_week: 180 } as Record<string, number>,
                  completed: false,
                  joinedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
                }
              ] as ChallengeParticipation[],
              isFirstTimeUser: false,
              isInitialized: true
            })
          } else {
            // Initialize fresh user data for new authenticated users
            set({
              userStats: getInitialUserStats(),
              userAchievements: [],
              userStreak: null,
              userChallengeParticipations: [],
              isFirstTimeUser: false,
              isInitialized: true
            })
          }
        }
      },

      // Monthly Challenge Management Methods
      updateMilestoneProgress: (challengeId, milestoneId, completed) => {
        set((state) => ({
          userChallengeParticipations: state.userChallengeParticipations.map(p =>
            p.challengeId === challengeId
              ? {
                  ...p,
                  milestoneProgress: {
                    ...p.milestoneProgress,
                    [milestoneId]: completed
                  }
                }
              : p
          )
        }))
      },

      updateWeeklyProgress: (challengeId, weekData) => {
        set((state) => ({
          userChallengeParticipations: state.userChallengeParticipations.map(p =>
            p.challengeId === challengeId
              ? {
                  ...p,
                  weeklyProgress: p.weeklyProgress
                    ? [...p.weeklyProgress.filter(w => w.week !== weekData.week), weekData]
                    : [weekData]
                }
              : p
          )
        }))
      },

      updateChallengeStreak: (challengeId, streak) => {
        set((state) => ({
          userChallengeParticipations: state.userChallengeParticipations.map(p =>
            p.challengeId === challengeId
              ? { ...p, currentStreak: streak }
              : p
          )
        }))
      },

      unlockStoryChapter: (challengeId, week) => {
        set((state) => ({
          userChallengeParticipations: state.userChallengeParticipations.map(p =>
            p.challengeId === challengeId
              ? {
                  ...p,
                  weeklyProgress: p.weeklyProgress?.map(w =>
                    w.week === week
                      ? { ...w, storyUnlocked: true }
                      : w
                  ) || []
                }
              : p
          )
        }))
      },

      claimMilestoneReward: (challengeId, milestoneId) => {
        // Find the challenge and milestone to get reward details
        const { activeChallenges } = get()
        const challenge = activeChallenges.find(c => c.id === challengeId)
        
        if (challenge) {
          // Add milestone reward logic here
          // For now, just mark milestone as claimed
          set((state) => ({
            userChallengeParticipations: state.userChallengeParticipations.map(p =>
              p.challengeId === challengeId
                ? {
                    ...p,
                    milestoneProgress: {
                      ...p.milestoneProgress,
                      [`${milestoneId}_claimed`]: true
                    }
                  }
                : p
            )
          }))
        }
      },

      contributeToCommunityGoal: (goalId, contribution) => {
        // Update community goal progress
        // This would typically involve API calls to update server-side data
        // For now, we'll just update local state
        console.log(`Contributing ${contribution} to community goal ${goalId}`)
        
        // Update user stats to reflect contribution
        set((state) => ({
          userStats: {
            ...state.userStats,
            // Add contribution tracking if needed
          }
        }))
      },

      awardStudyXP: (cardsStudied, correctAnswers) => {
        // Award XP based on study performance
        // Base XP: 1 XP per card studied
        // Bonus XP: 1 additional XP per correct answer (rating higher than "Again")
        // Milestone bonus: 10 XP for every 10 cards studied with good performance
        
        let xpGained = cardsStudied // Base XP
        xpGained += correctAnswers // Bonus for correct answers
        
        // Milestone bonus: 10 XP for every 10 cards with good performance
        const milestoneBonus = Math.floor(correctAnswers / 10) * 10
        xpGained += milestoneBonus
        
        if (xpGained > 0) {
          set((state) => {
            const newXP = state.userStats.xp + xpGained
            const newLevel = calculateLevel(newXP)
            const newXPToNextLevel = calculateXPToNextLevel(newLevel)
            
            console.log(`🎉 XP Awarded: +${xpGained} XP (${cardsStudied} cards, ${correctAnswers} correct, ${milestoneBonus} milestone bonus)`)
            console.log(`📊 Total XP: ${state.userStats.xp} → ${newXP} (Level ${state.userStats.level} → ${newLevel})`)
            
            return {
              userStats: {
                ...state.userStats,
                xp: newXP,
                level: newLevel,
                xpToNextLevel: newXPToNextLevel,
                totalCards: state.userStats.totalCards + cardsStudied,
                cardsStudiedToday: state.userStats.cardsStudiedToday + cardsStudied
              }
            }
          })
        }
      }
    }),
    {
      name: 'gamification-storage',
      partialize: (state) => ({
        userStats: state.userStats,
        userAchievements: state.userAchievements,
        userStreak: state.userStreak,
        userChallengeParticipations: state.userChallengeParticipations,
        isFirstTimeUser: state.isFirstTimeUser,
        isInitialized: state.isInitialized
      })
    }
  )
)