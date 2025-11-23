import type {
  User
} from '@shared/types';
import { debugLogger } from '../utils/debugLogger';

// Extended User interface for authentication context
export interface AuthenticatedUser extends User {
  token?: string;
  tokenType?: 'demo' | 'mock' | 'real';
}

// Types for user data and statistics
export interface UserStats {
  totalXP: number;
  level: number;
  currentLevelXP: number;
  nextLevelXP: number;
  cardsStudied: number;
  studyTime: number; // in minutes
  accuracy: number; // percentage
  currentStreak: number;
  longestStreak: number;
  coins: number;
  gems: number;
  lastStudyDate: string;
  joinDate: string;
}

export interface UserActivity {
  date: string;
  cardsStudied: number;
  studyTime: number;
  accuracy: number;
  xpGained: number;
}

export interface UserAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: string;
  category: 'study' | 'streak' | 'accuracy' | 'time' | 'social';
}

export interface UserChallenge {
  id: string;
  name: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly';
  target: number;
  current: number;
  reward: {
    xp: number;
    coins: number;
    gems?: number;
  };
  expiresAt: string;
  completedAt?: string;
}

export interface UserPerformanceMetrics {
  weeklyProgress: {
    cardsStudied: number;
    studyTime: number;
    accuracy: number;
    goal: number;
  };
  monthlyProgress: {
    cardsStudied: number;
    studyTime: number;
    decksCompleted: number;
  };
  studyPattern: {
    preferredTime: string;
    averageSessionLength: number;
    studyFrequency: number;
  };
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  avatar?: string;
  score: number;
  rank: number;
  change: number; // position change from last period
}

export interface LeaderboardData {
  global: LeaderboardEntry[];
  friends: LeaderboardEntry[];
  weekly: LeaderboardEntry[];
  monthly: LeaderboardEntry[];
}

// Demo data for demo users
const DEMO_USER_STATS: UserStats = {
  totalXP: 2500,
  level: 5,
  currentLevelXP: 100,
  nextLevelXP: 500,
  cardsStudied: 1250,
  studyTime: 2400, // 40 hours
  accuracy: 87.5,
  currentStreak: 15,
  longestStreak: 28,
  coins: 150,
  gems: 10,
  lastStudyDate: new Date().toISOString(),
  joinDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
};

const DEMO_ACHIEVEMENTS: UserAchievement[] = [
  {
    id: 'first_study',
    name: 'First Steps',
    description: 'Complete your first study session',
    icon: '🎯',
    unlockedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    category: 'study'
  },
  {
    id: 'week_streak',
    name: 'Week Warrior',
    description: 'Study for 7 days in a row',
    icon: '🔥',
    unlockedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    category: 'streak'
  }
];

// Enhanced Monthly Challenges
const ENHANCED_MONTHLY_CHALLENGES: UserChallenge[] = [
  {
    id: 'monthly_mastery',
    name: 'Monthly Mastery Challenge',
    description: 'Complete an intensive month-long study challenge with progressive difficulty',
    type: 'monthly',
    target: 1000,
    current: 245,
    reward: { xp: 1500, coins: 500, gems: 50 },
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'knowledge_seeker',
    name: 'Knowledge Seeker',
    description: 'Explore diverse subjects and maintain high accuracy throughout the month',
    type: 'monthly',
    target: 800,
    current: 156,
    reward: { xp: 1200, coins: 400, gems: 30 },
    expiresAt: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const DEMO_CHALLENGES: UserChallenge[] = [
  {
    id: 'daily_grind',
    name: 'Daily Grind',
    description: 'Study 25 cards today',
    type: 'daily',
    target: 25,
    current: 18,
    reward: { xp: 50, coins: 10 },
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'weekly_warrior',
    name: 'Weekly Warrior',
    description: 'Study 200 cards this week',
    type: 'weekly',
    target: 200,
    current: 145,
    reward: { xp: 200, coins: 50, gems: 5 },
    expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  ...ENHANCED_MONTHLY_CHALLENGES
];

const DEMO_LEADERBOARD: LeaderboardData = {
  global: [
    { userId: 'demo1', username: 'StudyMaster', score: 5420, rank: 1, change: 0 },
    { userId: 'demo2', username: 'FlashcardPro', score: 4890, rank: 2, change: 1 },
    { userId: 'demo3', username: 'MemoryWiz', score: 4650, rank: 3, change: -1 },
    { userId: 'demo4', username: 'QuizKing', score: 4200, rank: 4, change: 2 },
    { userId: 'demo_user', username: 'Demo User', score: 2500, rank: 15, change: 3 }
  ],
  friends: [
    { userId: 'friend1', username: 'StudyBuddy', score: 3200, rank: 1, change: 0 },
    { userId: 'demo_user', username: 'Demo User', score: 2500, rank: 2, change: 1 },
    { userId: 'friend2', username: 'LearningPal', score: 2100, rank: 3, change: -1 }
  ],
  weekly: [
    { userId: 'demo1', username: 'StudyMaster', score: 890, rank: 1, change: 2 },
    { userId: 'demo_user', username: 'Demo User', score: 420, rank: 8, change: 5 }
  ],
  monthly: [
    { userId: 'demo1', username: 'StudyMaster', score: 3200, rank: 1, change: 0 },
    { userId: 'demo_user', username: 'Demo User', score: 1800, rank: 12, change: -2 }
  ]
};

// API service class
export class UserDataService {
  private baseUrl = '/api';

  // Check if user is demo user
  private isDemoUser(user: AuthenticatedUser): boolean {
    return user.tokenType === 'demo' || user.email === 'demo@studymaster.app';
  }

  // Get user statistics
  async getUserStats(user: AuthenticatedUser): Promise<UserStats> {
    debugLogger.log('[USER_DATA_SERVICE]', 'START - getUserStats', {
      userId: user.id,
      isDemoUser: this.isDemoUser(user)
    });

    if (this.isDemoUser(user)) {
      debugLogger.log('[USER_DATA_SERVICE]', 'Returning demo user stats');
      return DEMO_USER_STATS;
    }

    // Primary: Try REST API
    try {
      const response = await fetch(`${this.baseUrl}/users/${user.id}/stats`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user stats from REST API');
      }

      const data = await response.json();
      debugLogger.log('[USER_DATA_SERVICE]', 'REST API user stats fetched successfully');
      return data;
    } catch (apiError) {
      debugLogger.warn('[USER_DATA_SERVICE]', 'REST API failed, using mock data', {
        apiError
      });
      
      // Final fallback: Return personalized mock data
      return this.generatePersonalizedMockStats(user);
    }
  }

  // Get user activity history
  async getUserActivity(user: AuthenticatedUser, days: number = 30): Promise<UserActivity[]> {
    if (this.isDemoUser(user)) {
      return this.generateDemoActivity(days);
    }

    try {
      const response = await fetch(`${this.baseUrl}/users/${user.id}/activity?days=${days}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user activity');
      }

      return await response.json();
    } catch (error) {
      console.warn('Failed to fetch real user activity, using mock data:', error);
      return this.generatePersonalizedActivity(user, days);
    }
  }

  // Get user achievements
  async getUserAchievements(user: AuthenticatedUser): Promise<UserAchievement[]> {
    if (this.isDemoUser(user)) {
      return DEMO_ACHIEVEMENTS;
    }

    try {
      const response = await fetch(`${this.baseUrl}/users/${user.id}/achievements`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user achievements');
      }

      return await response.json();
    } catch (error) {
      console.warn('Failed to fetch real user achievements, using mock data:', error);
      return this.generatePersonalizedAchievements(user);
    }
  }

  // Get user challenges
  async getUserChallenges(user: AuthenticatedUser): Promise<UserChallenge[]> {
    if (this.isDemoUser(user)) {
      return DEMO_CHALLENGES;
    }

    try {
      const response = await fetch(`${this.baseUrl}/users/${user.id}/challenges`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user challenges');
      }

      return await response.json();
    } catch (error) {
      console.warn('Failed to fetch real user challenges, using mock data:', error);
      return this.generatePersonalizedChallenges(user);
    }
  }

  // Get leaderboard data
  async getLeaderboardData(user: AuthenticatedUser): Promise<LeaderboardData> {
    if (this.isDemoUser(user)) {
      return DEMO_LEADERBOARD;
    }

    try {
      const response = await fetch(`${this.baseUrl}/gamification/leaderboard`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard data');
      }

      return await response.json();
    } catch (error) {
      console.warn('Failed to fetch real leaderboard data, using mock data:', error);
      return this.generatePersonalizedLeaderboard(user);
    }
  }

  // Get performance metrics
  async getPerformanceMetrics(user: AuthenticatedUser): Promise<UserPerformanceMetrics> {
    if (this.isDemoUser(user)) {
      return this.generateDemoPerformanceMetrics();
    }

    try {
      const response = await fetch(`${this.baseUrl}/users/${user.id}/performance`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch performance metrics');
      }

      return await response.json();
    } catch (error) {
      console.warn('Failed to fetch real performance metrics, using mock data:', error);
      return this.generatePersonalizedPerformanceMetrics(user);
    }
  }

  // Get comprehensive user profile data
  async getCompleteUserProfile(user: AuthenticatedUser): Promise<{
    stats: UserStats;
    activity: UserActivity[];
    achievements: UserAchievement[];
    challenges: UserChallenge[];
    performance: UserPerformanceMetrics;
  }> {
    const [stats, activity, achievements, challenges, performance] = await Promise.all([
      this.getUserStats(user),
      this.getUserActivity(user, 30),
      this.getUserAchievements(user),
      this.getUserChallenges(user),
      this.getPerformanceMetrics(user)
    ]);

    return {
      stats,
      activity,
      achievements,
      challenges,
      performance
    };
  }

  // Reset all user data
  async resetAllUserData(user: AuthenticatedUser): Promise<void> {
    if (this.isDemoUser(user)) {
      // For demo users, we don't need to do anything as data is static
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/users/${user.id}/reset`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to reset user data');
      }
    } catch (error) {
      console.warn('Failed to reset real user data via API:', error);
      // For mock users, we don't need to do anything as the stores will handle the reset
      // The error is expected when API is not available
    }
  }

  // Generate personalized mock data for authenticated users
  private generatePersonalizedMockStats(user: AuthenticatedUser): UserStats {
    const userHash = this.hashString(user.email);
    const daysSinceJoin = Math.floor(userHash % 60) + 1; // 1-60 days
    
    return {
      totalXP: Math.floor(userHash % 1000) + 100,
      level: Math.floor((userHash % 1000) / 200) + 1,
      currentLevelXP: userHash % 200,
      nextLevelXP: 200,
      cardsStudied: Math.floor(userHash % 500) + 50,
      studyTime: Math.floor(userHash % 1200) + 60, // 1-20 hours
      accuracy: 75 + (userHash % 20), // 75-95%
      currentStreak: Math.floor(userHash % 15) + 1,
      longestStreak: Math.floor(userHash % 30) + 5,
      coins: Math.floor(userHash % 200) + 50,
      gems: Math.floor(userHash % 20) + 5,
      lastStudyDate: new Date().toISOString(),
      joinDate: new Date(Date.now() - daysSinceJoin * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  private generatePersonalizedActivity(user: AuthenticatedUser, days: number): UserActivity[] {
    const activities: UserActivity[] = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dayHash = this.hashString(user.email + date.toDateString());
      
      // Some days have no activity
      if (dayHash % 4 === 0) continue;
      
      activities.push({
        date: date.toISOString().split('T')[0],
        cardsStudied: Math.floor(dayHash % 50) + 5,
        studyTime: Math.floor(dayHash % 120) + 10,
        accuracy: 70 + (dayHash % 25),
        xpGained: Math.floor(dayHash % 100) + 20
      });
    }
    
    return activities.reverse();
  }

  private generatePersonalizedAchievements(user: AuthenticatedUser): UserAchievement[] {
    const userHash = this.hashString(user.email);
    const baseAchievements = [...DEMO_ACHIEVEMENTS];
    
    // Add user-specific achievements based on their hash
    if (userHash % 3 === 0) {
      baseAchievements.push({
        id: 'accuracy_master',
        name: 'Accuracy Master',
        description: 'Achieve 90% accuracy in a session',
        icon: '🎯',
        unlockedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        category: 'accuracy'
      });
    }
    
    return baseAchievements;
  }

  private generatePersonalizedChallenges(user: AuthenticatedUser): UserChallenge[] {
    // Generate personalized data based on user email
    const challenges = [...DEMO_CHALLENGES];
    
    // Personalize challenge progress based on user
    challenges.forEach(challenge => {
      const progressHash = this.hashString(user.email + challenge.id);
      challenge.current = Math.floor((progressHash % 80) / 100 * challenge.target);
    });
    
    return challenges;
  }

  private generatePersonalizedLeaderboard(user: AuthenticatedUser): LeaderboardData {
    const userHash = this.hashString(user.email);
    const userScore = Math.floor(userHash % 1000) + 100;
    const userRank = Math.floor(userHash % 50) + 5;
    
    const leaderboard = { ...DEMO_LEADERBOARD };
    
    // Insert user into leaderboards
    leaderboard.global.push({
      userId: user.id,
      username: user.username,
      score: userScore,
      rank: userRank,
      change: Math.floor(userHash % 10) - 5
    });
    
    return leaderboard;
  }

  private generateDemoActivity(days: number): UserActivity[] {
    const activities: UserActivity[] = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      
      // Skip some days to make it realistic
      if (i % 3 === 0) continue;
      
      activities.push({
        date: date.toISOString().split('T')[0],
        cardsStudied: Math.floor(Math.random() * 40) + 10,
        studyTime: Math.floor(Math.random() * 90) + 15,
        accuracy: 80 + Math.floor(Math.random() * 15),
        xpGained: Math.floor(Math.random() * 80) + 30
      });
    }
    
    return activities.reverse();
  }

  private generateDemoPerformanceMetrics(): UserPerformanceMetrics {
    return {
      weeklyProgress: {
        cardsStudied: 180,
        studyTime: 240, // 4 hours
        accuracy: 87.5,
        goal: 350
      },
      monthlyProgress: {
        cardsStudied: 720,
        studyTime: 1200, // 20 hours
        decksCompleted: 8
      },
      studyPattern: {
        preferredTime: 'evening',
        averageSessionLength: 25,
        studyFrequency: 5.2
      }
    };
  }

  private generatePersonalizedPerformanceMetrics(user: AuthenticatedUser): UserPerformanceMetrics {
    const userHash = this.hashString(user.email);
    
    return {
      weeklyProgress: {
        cardsStudied: Math.floor(userHash % 200) + 50,
        studyTime: Math.floor(userHash % 300) + 60,
        accuracy: 75 + (userHash % 20),
        goal: 300
      },
      monthlyProgress: {
        cardsStudied: Math.floor(userHash % 800) + 200,
        studyTime: Math.floor(userHash % 1500) + 300,
        decksCompleted: Math.floor(userHash % 15) + 3
      },
      studyPattern: {
        preferredTime: ['morning', 'afternoon', 'evening'][userHash % 3],
        averageSessionLength: Math.floor(userHash % 30) + 15,
        studyFrequency: 3 + (userHash % 4)
      }
    };
  }

  // Simple hash function for consistent personalization
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

// Export singleton instance
export const userDataService = new UserDataService();