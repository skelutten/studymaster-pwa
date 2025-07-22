import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { userDataService, type AuthenticatedUser, type UserChallenge } from '../services/userDataService'
import { MonthlyChallenge } from '../components/gamification/MonthlyChallenge'
import { CommunityLeaderboard } from '../components/gamification/CommunityLeaderboard'

const ChallengesPage: React.FC = () => {
  const { user } = useAuthStore()
  
  // Dynamic data state
  const [userChallenges, setUserChallenges] = useState<UserChallenge[]>([])
  const [dataLoading, setDataLoading] = useState(false)
  const [dataError, setDataError] = useState<string | null>(null)
  
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'available'>('all')
  const [sortBy, setSortBy] = useState<'expiresAt' | 'reward' | 'progress'>('expiresAt')

  // Load dynamic challenge data when user is available
  useEffect(() => {
    const loadChallengeData = async () => {
      if (!user) return
      
      setDataLoading(true)
      setDataError(null)
      
      try {
        const authenticatedUser: AuthenticatedUser = {
          ...user,
          token: (user as AuthenticatedUser).token,
          tokenType: (user as AuthenticatedUser).tokenType
        }
        
        const challenges = await userDataService.getUserChallenges(authenticatedUser)
        setUserChallenges(challenges)
      } catch (error) {
        console.error('Failed to load challenge data:', error)
        setDataError('Failed to load challenge data')
      } finally {
        setDataLoading(false)
      }
    }
    
    loadChallengeData()
  }, [user])

  const getFilteredChallenges = () => {
    let filtered = userChallenges

    // Apply filter
    switch (filter) {
      case 'active':
        filtered = userChallenges.filter(challenge => !challenge.completedAt && new Date(challenge.expiresAt) > new Date())
        break
      case 'completed':
        filtered = userChallenges.filter(challenge => challenge.completedAt)
        break
      case 'available':
        filtered = userChallenges.filter(challenge => !challenge.completedAt)
        break
      default:
        // 'all' - no filtering
        break
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'expiresAt':
          return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime()
        case 'reward': {
          const aRewardValue = a.reward.xp + a.reward.coins + (a.reward.gems || 0) * 10
          const bRewardValue = b.reward.xp + b.reward.coins + (b.reward.gems || 0) * 10
          return bRewardValue - aRewardValue
        }
        case 'progress': {
          const aProgress = (a.current / a.target) * 100
          const bProgress = (b.current / b.target) * 100
          return bProgress - aProgress
        }
        default:
          return 0
      }
    })
  }

  const getFilterCount = (filterType: typeof filter) => {
    switch (filterType) {
      case 'active':
        return userChallenges.filter(challenge => !challenge.completedAt && new Date(challenge.expiresAt) > new Date()).length
      case 'completed':
        return userChallenges.filter(challenge => challenge.completedAt).length
      case 'available':
        return userChallenges.filter(challenge => !challenge.completedAt).length
      default:
        return userChallenges.length
    }
  }

  const getProgressPercentage = (challenge: UserChallenge) => {
    return Math.min((challenge.current / challenge.target) * 100, 100)
  }

  const isExpired = (challenge: UserChallenge) => {
    return new Date(challenge.expiresAt) < new Date()
  }

  const getTimeRemaining = (challenge: UserChallenge) => {
    const now = new Date()
    const expires = new Date(challenge.expiresAt)
    const diff = expires.getTime() - now.getTime()
    
    if (diff <= 0) return 'Expired'
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    
    if (days > 0) return `${days}d ${hours}h`
    return `${hours}h`
  }

  const filteredChallenges = getFilteredChallenges()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            🏆 Challenges
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Complete challenges to earn XP, achievements, and compete with other learners
          </p>
        </div>

        {/* Stats Overview */}
        {dataLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-8 w-12 rounded mb-2"></div>
                <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-4 w-16 rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {userChallenges.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {userChallenges.filter(c => c.completedAt).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {userChallenges.filter(c => !c.completedAt && new Date(c.expiresAt) > new Date()).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Active</div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {userChallenges.filter(c => new Date(c.expiresAt) < new Date()).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Expired</div>
            </div>
          </div>
        )}

        {/* Filters and Sorting */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-6 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            {/* Filter Tabs */}
            <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              {(['all', 'active', 'completed', 'available'] as const).map((filterType) => (
                <button
                  key={filterType}
                  onClick={() => setFilter(filterType)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    filter === filterType
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {filterType.charAt(0).toUpperCase() + filterType.slice(1)} ({getFilterCount(filterType)})
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="expiresAt">Time Remaining</option>
                <option value="reward">Reward Value</option>
                <option value="progress">Progress</option>
              </select>
            </div>
          </div>
        </div>

        {/* Challenges Grid */}
        {dataLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="animate-pulse space-y-4">
                  <div className="bg-gray-300 dark:bg-gray-600 h-6 w-3/4 rounded"></div>
                  <div className="bg-gray-300 dark:bg-gray-600 h-4 w-full rounded"></div>
                  <div className="bg-gray-300 dark:bg-gray-600 h-2 w-full rounded"></div>
                  <div className="bg-gray-300 dark:bg-gray-600 h-8 w-1/2 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredChallenges.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {dataError ? 'Unable to Load Challenges' : 'No challenges found'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {dataError || (filter === 'all' 
                ? 'No challenges are currently available.'
                : `No ${filter} challenges found. Try a different filter.`
              )}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredChallenges.map((challenge) => {
              const progressPercentage = getProgressPercentage(challenge)
              const expired = isExpired(challenge)
              
              return (
                <div
                  key={challenge.id}
                  className={`bg-white dark:bg-gray-800 rounded-lg p-6 border transition-all duration-200 hover:shadow-lg ${
                    challenge.completedAt
                      ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                      : expired
                      ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        {challenge.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {challenge.description}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ml-2 ${
                      challenge.completedAt
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : expired
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        : challenge.type === 'daily'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : challenge.type === 'weekly'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                        : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                    }`}>
                      {challenge.completedAt ? 'Completed' : expired ? 'Expired' : challenge.type}
                    </span>
                  </div>

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600 dark:text-gray-400">Progress</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {challenge.current} / {challenge.target}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          challenge.completedAt
                            ? 'bg-green-600'
                            : expired
                            ? 'bg-red-600'
                            : 'bg-blue-600'
                        }`}
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Rewards */}
                  <div className="mb-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Rewards</div>
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-blue-600 dark:text-blue-400">
                        +{challenge.reward.xp} XP
                      </span>
                      <span className="text-yellow-600 dark:text-yellow-400">
                        +{challenge.reward.coins} coins
                      </span>
                      {challenge.reward.gems && (
                        <span className="text-purple-600 dark:text-purple-400">
                          +{challenge.reward.gems} gems
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Time Remaining */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        {expired ? 'Expired' : 'Time remaining: '}
                      </span>
                      <span className={`font-medium ${
                        expired 
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {expired ? '' : getTimeRemaining(challenge)}
                      </span>
                    </div>
                    
                    {challenge.completedAt && (
                      <div className="text-green-600 dark:text-green-400 text-2xl">
                        ✅
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Monthly Challenge Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            🌟 Monthly Challenge
          </h2>
          <MonthlyChallenge challenge={{
            id: "monthly-2025-01",
            title: "January Learning Marathon",
            description: "Master new knowledge throughout January with progressive challenges",
            type: "monthly" as const,
            requirements: [],
            rewards: [],
            startDate: "2025-01-01T00:00:00Z",
            endDate: "2025-01-31T23:59:59Z",
            isActive: true,
            participantCount: 47892,
            difficulty: "intermediate" as const,
            storyArc: {
              id: "winter-learning-saga",
              title: "Winter Learning Saga",
              description: "Embark on a month-long journey of discovery",
              theme: "winter",
              chapters: [],
              totalWeeks: 4,
              currentWeek: 2
            }
          }} />
        </div>

        {/* Community Leaderboard Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            🏆 Community Leaderboard
          </h2>
          <CommunityLeaderboard
            challengeId="monthly-2025-01"
            challengeName="January Learning Marathon"
          />
        </div>

        {/* Help Section */}
        <div className="mt-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
            💡 How Challenges Work
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800 dark:text-blue-200">
            <div>
              <h4 className="font-medium mb-2">🎯 Challenge Types</h4>
              <ul className="space-y-1">
                <li>• <strong>Daily:</strong> Reset every 24 hours</li>
                <li>• <strong>Weekly:</strong> Reset every Monday</li>
                <li>• <strong>Monthly:</strong> Reset on the 1st</li>
                <li>• <strong>Special:</strong> Limited-time events</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">🏆 Rewards</h4>
              <ul className="space-y-1">
                <li>• <strong>XP:</strong> Experience points for leveling up</li>
                <li>• <strong>Coins:</strong> In-app currency</li>
                <li>• <strong>Gems:</strong> Premium currency</li>
                <li>• <strong>Achievements:</strong> Unlock special badges</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChallengesPage