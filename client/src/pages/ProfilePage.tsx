import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useDeckStore } from '../stores/deckStore'
import { useGamificationStore } from '../stores/gamificationStore'
import { userDataService, type AuthenticatedUser, type UserStats as DynamicUserStats, type UserActivity, type UserAchievement, type UserChallenge } from '../services/userDataService'
import XPBar from '../components/gamification/XPBar'
import StreakCounter from '../components/gamification/StreakCounter'
import ConfirmationDialog from '../components/ui/ConfirmationDialog'

const ProfilePage = () => {
  const { user, updateUser, isLoading, initializeAuth } = useAuthStore()
  
  // Dynamic data state
  const [, setUserStats] = useState<DynamicUserStats | null>(null)
  const [userActivity, setUserActivity] = useState<UserActivity[]>([])
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([])
  const [userChallenges, setUserChallenges] = useState<UserChallenge[]>([])
  const [dataLoading, setDataLoading] = useState(false)
  const [dataError, setDataError] = useState<string | null>(null)
  
  const [isEditing, setIsEditing] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  
  // Store actions and data
  const { resetAllStudyData } = useDeckStore()
  const { resetAllUserData, userStats: gamificationStats, isInitialized, userStreak, initializeUserData } = useGamificationStore()
  
  // Ensure auth is initialized when component mounts
  useEffect(() => {
    if (!user && !isLoading) {
      initializeAuth()
    }
  }, [user, isLoading, initializeAuth])

  // Load dynamic user data function
  const loadUserData = useCallback(async () => {
    if (!user) return
    
    setDataLoading(true)
    setDataError(null)
    
    try {
      // Check if user is demo user
      const isDemo = user.email === 'demo@studymaster.com' || (user as AuthenticatedUser).tokenType === 'demo'
      
      // Initialize gamification data based on user type
      initializeUserData(isDemo)
      
      if (isDemo) {
        // For demo users, use mock data or empty data
        setUserStats(null)
        setUserActivity([])
        setUserAchievements([])
        setUserChallenges([])
      } else {
        // For authenticated users, try to load from API
        const authenticatedUser: AuthenticatedUser = {
          ...user,
          token: (user as AuthenticatedUser).token,
          tokenType: (user as AuthenticatedUser).tokenType
        }
        
        try {
          const [stats, activity, achievements, challenges] = await Promise.all([
            userDataService.getUserStats(authenticatedUser),
            userDataService.getUserActivity(authenticatedUser, 30),
            userDataService.getUserAchievements(authenticatedUser),
            userDataService.getUserChallenges(authenticatedUser)
          ])
          
          setUserStats(stats)
          setUserActivity(activity)
          setUserAchievements(achievements)
          setUserChallenges(challenges)
          
        } catch (apiError) {
          console.warn('API data loading failed, using fallback:', apiError)
          // Fallback to empty state for authenticated users when API fails
          setUserStats(null)
          setUserActivity([])
          setUserAchievements([])
          setUserChallenges([])
        }
      }
      
    } catch (error) {
      console.error('Failed to load user data:', error)
      setDataError('Unable to load user statistics. Please try again later.')
    } finally {
      setDataLoading(false)
    }
  }, [user, initializeUserData])

  // Load dynamic user data when user is available
  useEffect(() => {
    loadUserData()
  }, [loadUserData])
  
  const [editForm, setEditForm] = useState({
    username: user?.username || '',
    email: user?.email || '',
    dailyGoal: user?.preferences.dailyGoal || 50
  })

  const handleSaveProfile = () => {
    if (user) {
      updateUser({
        username: editForm.username,
        email: editForm.email,
        preferences: {
          ...user.preferences,
          dailyGoal: editForm.dailyGoal
        }
      })
    }
    setIsEditing(false)
  }

  const handleResetAllData = async () => {
    if (!user) return
    
    setIsResetting(true)
    setResetError(null)
    
    try {
      // Check if user is demo user
      const isDemo = user.email === 'demo@studymaster.com' || (user as AuthenticatedUser).tokenType === 'demo'
      
      if (!isDemo) {
        // For authenticated users, call API
        const authenticatedUser: AuthenticatedUser = {
          ...user,
          token: (user as AuthenticatedUser).token,
          tokenType: (user as AuthenticatedUser).tokenType
        }
        
        try {
          await userDataService.resetAllUserData(authenticatedUser)
        } catch (apiError) {
          console.warn('API reset failed, proceeding with local reset:', apiError)
          // Continue with local reset even if API fails
        }
      }
      
      // Reset local store data
      resetAllUserData()
      resetAllStudyData()
      
      // Clear local user data state and reinitialize
      setUserStats(null)
      setUserActivity([])
      setUserAchievements([])
      setUserChallenges([])
      setDataError(null)
      
      setResetSuccess(true)
      setShowResetDialog(false)
      
      // Reload user data after reset
      setTimeout(async () => {
        setResetSuccess(false)
        // Reinitialize gamification data and reload user data
        const isDemo = user.email === 'demo@studymaster.com' || (user as AuthenticatedUser).tokenType === 'demo'
        initializeUserData(isDemo)
        await loadUserData()
      }, 1500)
      
    } catch (error) {
      console.error('Failed to reset user data:', error)
      setResetError('Failed to reset data. Please try again.')
    } finally {
      setIsResetting(false)
    }
  }

  // Show loading state while auth is being initialized
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl text-gray-900 dark:text-white">
            Loading profile...
          </h2>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Please log in to view your profile
          </h2>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Profile
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Track your progress and achievements
        </p>
      </div>

      {/* User Info Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div>
              {isEditing ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    className="text-2xl font-bold bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white"
                  />
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="text-gray-600 dark:text-gray-400 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              ) : (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {user.username}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="flex items-center space-x-2 text-yellow-600 dark:text-yellow-400">
                <span className="text-lg">💰</span>
                <span className="font-bold">{gamificationStats.gold}</span>
              </div>
              <div className="flex items-center space-x-2 text-purple-600 dark:text-purple-400">
                <span className="text-lg">💎</span>
                <span className="font-bold">{gamificationStats.diamonds}</span>
              </div>
            </div>
            
            {isEditing ? (
              <div className="space-x-2">
                <button
                  onClick={handleSaveProfile}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* XP Bar */}
        <XPBar
          currentXP={gamificationStats.xp}
          level={gamificationStats.level}
          className="mb-4"
        />
        
        {/* Quick Stats */}
        {dataLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="text-center">
                <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-8 w-16 mx-auto rounded mb-2"></div>
                <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-4 w-20 mx-auto rounded"></div>
              </div>
            ))}
          </div>
        ) : isInitialized ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {gamificationStats.totalCards.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Cards Studied</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {Math.floor(gamificationStats.totalStudyTime / 60)}h {gamificationStats.totalStudyTime % 60}m
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Study Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {gamificationStats.averageAccuracy.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {gamificationStats.currentStreak}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Day Streak</div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400">
            {dataError || 'Unable to load stats'}
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Activity Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Recent Activity
            </h3>
            
            {dataLoading ? (
              <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="bg-gray-300 dark:bg-gray-600 h-4 w-20 rounded"></div>
                    <div className="bg-gray-300 dark:bg-gray-600 h-4 w-16 rounded"></div>
                    <div className="bg-gray-300 dark:bg-gray-600 h-4 w-12 rounded"></div>
                  </div>
                ))}
              </div>
            ) : userActivity.length > 0 ? (
              <div className="space-y-3">
                {userActivity.slice(0, 10).map((activity, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(activity.date).toLocaleDateString()}
                    </div>
                    <div className="flex space-x-4 text-sm">
                      <span className="text-blue-600 dark:text-blue-400">
                        {activity.cardsStudied} cards
                      </span>
                      <span className="text-green-600 dark:text-green-400">
                        {activity.studyTime}m
                      </span>
                      <span className="text-purple-600 dark:text-purple-400">
                        {activity.accuracy}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📊</div>
                <p className="text-gray-600 dark:text-gray-400">
                  No activity data available yet. Start studying to see your progress!
                </p>
              </div>
            )}
          </div>
          
          {/* Active Challenges */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Active Challenges
            </h3>
            
            {dataLoading ? (
              <div className="animate-pulse space-y-4">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                    <div className="bg-gray-300 dark:bg-gray-600 h-6 w-3/4 rounded mb-2"></div>
                    <div className="bg-gray-300 dark:bg-gray-600 h-4 w-full rounded mb-3"></div>
                    <div className="bg-gray-300 dark:bg-gray-600 h-2 w-full rounded"></div>
                  </div>
                ))}
              </div>
            ) : userChallenges.length > 0 ? (
              <div className="space-y-4">
                {userChallenges.map((challenge) => {
                  const progressPercentage = Math.min((challenge.current / challenge.target) * 100, 100)
                  
                  return (
                    <div key={challenge.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {challenge.name}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {challenge.description}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          challenge.completedAt 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        }`}>
                          {challenge.completedAt ? 'Completed' : challenge.type}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">
                            Progress
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {challenge.current} / {challenge.target}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${progressPercentage}%` }}
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4 mt-3 text-sm text-gray-600 dark:text-gray-400">
                        <span>+{challenge.reward.xp} XP</span>
                        <span>+{challenge.reward.coins} coins</span>
                        {challenge.reward.gems && <span>+{challenge.reward.gems} gems</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🎯</div>
                <p className="text-gray-600 dark:text-gray-400">
                  No active challenges. Check the Challenges page to join some!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          {/* Streak Counter */}
          <StreakCounter
            currentStreak={gamificationStats.currentStreak}
            longestStreak={gamificationStats.longestStreak}
            lastStudyDate={userStreak?.lastStudyDate || new Date().toISOString()}
          />
          
          {/* Achievements */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Achievements ({userAchievements.length})
            </h3>
            
            {dataLoading ? (
              <div className="animate-pulse grid grid-cols-4 gap-3">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-gray-300 dark:bg-gray-600 h-16 w-16 rounded-lg"></div>
                ))}
              </div>
            ) : userAchievements.length > 0 ? (
              <div className="grid grid-cols-4 gap-3">
                {userAchievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg p-3 text-center text-white shadow-lg"
                    title={`${achievement.name}: ${achievement.description}`}
                  >
                    <div className="text-2xl mb-1">{achievement.icon}</div>
                    <div className="text-xs font-medium truncate">{achievement.name}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🏆</div>
                <p className="text-gray-600 dark:text-gray-400">
                  No achievements yet. Keep studying to unlock them!
                </p>
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Study Settings
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Daily Goal
                </label>
                {isEditing ? (
                  <input
                    type="number"
                    value={editForm.dailyGoal}
                    onChange={(e) => setEditForm({ ...editForm, dailyGoal: parseInt(e.target.value) || 50 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    min="1"
                    max="500"
                  />
                ) : (
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {user.preferences.dailyGoal} cards
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Notifications
                </span>
                <div className={`w-12 h-6 rounded-full transition-colors ${
                  user.preferences.notifications 
                    ? 'bg-blue-600' 
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                    user.preferences.notifications ? 'translate-x-6' : 'translate-x-0.5'
                  } mt-0.5`} />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Sound Effects
                </span>
                <div className={`w-12 h-6 rounded-full transition-colors ${
                  user.preferences.soundEffects 
                    ? 'bg-blue-600' 
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                    user.preferences.soundEffects ? 'translate-x-6' : 'translate-x-0.5'
                  } mt-0.5`} />
                </div>
              </div>
            </div>
            
            {/* Reset Data Section */}
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
                Data Management
              </h4>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <span className="text-red-500 text-xl">⚠️</span>
                  </div>
                  <div className="flex-1">
                    <h5 className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                      Reset All Statistics
                    </h5>
                    <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                      This will permanently delete all your study progress, achievements, streaks, and performance data. This action cannot be undone.
                    </p>
                    <button
                      onClick={() => setShowResetDialog(true)}
                      disabled={isResetting}
                      className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      {isResetting && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      )}
                      <span>Reset All Data</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {resetSuccess && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-2">
          <span className="text-lg">✅</span>
          <span>All statistics have been reset successfully!</span>
        </div>
      )}

      {/* Error Message */}
      {resetError && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-2">
          <span className="text-lg">❌</span>
          <span>{resetError}</span>
          <button
            onClick={() => setResetError(null)}
            className="ml-2 text-white hover:text-gray-200"
          >
            ×
          </button>
        </div>
      )}

      {/* Reset Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showResetDialog}
        onClose={() => setShowResetDialog(false)}
        onConfirm={handleResetAllData}
        title="Reset All Statistics"
        message="Are you absolutely sure you want to reset all your statistics? This will permanently delete all your study progress, achievements, streaks, challenge progress, and performance data. This action cannot be undone and you will lose all your current progress."
        confirmText="Yes, Reset Everything"
        cancelText="Cancel"
        isDestructive={true}
        isLoading={isResetting}
      />
    </div>
  )
}

export default ProfilePage