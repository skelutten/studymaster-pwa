import { useState, useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { type AuthenticatedUser, type LeaderboardData, type LeaderboardEntry } from '../services/userDataService'
import { getLeaderboardService } from '../services/leaderboard'
import { repos } from '../data'
import { isOnlineLeaderboardEnabled } from '../config/featureFlags'

type LeaderboardType = 'global' | 'friends' | 'weekly' | 'monthly'

const LeaderboardPage = () => {
  const { user } = useAuthStore()
  
  // Dynamic data state
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null)
  const [dataLoading, setDataLoading] = useState(false)
  const [dataError, setDataError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const [queuedCount, setQueuedCount] = useState(0)
  const [cacheInfo, setCacheInfo] = useState<{ ageSec: number | null; ttlSec: number | null; expired: boolean | null } | null>(null)
  
  const [selectedType, setSelectedType] = useState<LeaderboardType>('global')

  // Online feature gating
  const [onlineEnabled, setOnlineEnabled] = useState<boolean>(isOnlineLeaderboardEnabled())
  const [linked, setLinked] = useState<boolean | null>(null)

  // Resolve linked status and track feature flag changes
  useEffect(() => {
    let cancelled = false
    const { isOnlineLinked } = useAuthStore.getState()

    const run = async () => {
      try {
        const result = await isOnlineLinked('studymaster')
        if (!cancelled) setLinked(result)
      } catch {
        if (!cancelled) setLinked(false)
      }
    }

    // Initialize from current state
    setOnlineEnabled(isOnlineLeaderboardEnabled())
    if (useAuthStore.getState().user) {
      void run()
    } else {
      setLinked(false)
    }

    // Listen to storage changes for the online flag (in case user toggles it from Profile page)
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'sm.onlineLeaderboardEnabled') {
        setOnlineEnabled(e.newValue === 'true')
      }
    }
    window.addEventListener('storage', onStorage)

    return () => {
      cancelled = true
      window.removeEventListener('storage', onStorage)
    }
  }, [])
  
  // Load dynamic leaderboard data when user is available and online is enabled + linked
  useEffect(() => {
    const loadLeaderboardData = async () => {
      if (!user || !onlineEnabled || !linked) return

      setDataLoading(true)
      setDataError(null)

      try {
        const authenticatedUser: AuthenticatedUser = {
          ...user,
          token: (user as AuthenticatedUser).token,
          tokenType: (user as AuthenticatedUser).tokenType
        }

        const provider = getLeaderboardService()
        const data = await provider.fetchAll(authenticatedUser)
        setLeaderboardData(data)
        setLastUpdated(Date.now())
      } catch (error) {
        console.error('Failed to load leaderboard data:', error)
        setDataError('Failed to load leaderboard data')
      } finally {
        setDataLoading(false)
      }
    }

    void loadLeaderboardData()
  }, [user, refreshTick, onlineEnabled, linked])

  // Compute cache TTL/age info for the selected scope
  useEffect(() => {
    let mounted = true
    const toScopeKey = (s: LeaderboardType) => (s === 'friends' ? 'friends:global' : `${s}:global`)
    const run = async () => {
      try {
        const row = await repos.leaderboardCache.get(toScopeKey(selectedType), { ignoreTTL: true })
        if (!mounted) return
        if (!row) {
          setCacheInfo(null)
          return
        }
        const ageMs = Date.now() - row.fetchedAt
        const ageSec = Math.max(0, Math.floor(ageMs / 1000))
        const ttlSec = Math.max(0, Math.floor((row.ttlMs ?? 0) / 1000))
        const expired = ttlSec > 0 ? ageSec > ttlSec : false
        setCacheInfo({ ageSec, ttlSec, expired })
      } catch {
        if (!mounted) return
        setCacheInfo(null)
      }
    }
    void run()
    return () => { mounted = false }
  }, [selectedType, refreshTick])
  
  // Poll queued leaderboard submissions to inform user about pending sync
  useEffect(() => {
    let mounted = true
    let timer: number | undefined

    const updateQueued = async () => {
      try {
        const rows = await repos.syncQueue.list(200)
        const count = rows.filter(r => r.opType === 'leaderboard:submit').length
        if (mounted) setQueuedCount(count)
      } catch {
        // ignore
      }
    }

    void updateQueued()
    timer = window.setInterval(() => void updateQueued(), 10000)

    const onOnline = () => void updateQueued()
    window.addEventListener('online', onOnline)

    return () => {
      mounted = false
      if (timer) window.clearInterval(timer)
      window.removeEventListener('online', onOnline)
    }
  }, [])
  
  const leaderboardTypes: { value: LeaderboardType; label: string; icon: string; description: string }[] = [
    { value: 'global', label: 'Global Rankings', icon: '🌍', description: 'Compete with all users worldwide' },
    { value: 'friends', label: 'Friends', icon: '👥', description: 'Compare with your friends' },
    { value: 'weekly', label: 'This Week', icon: '📅', description: 'Weekly performance rankings' },
    { value: 'monthly', label: 'This Month', icon: '📊', description: 'Monthly achievement rankings' }
  ]
  
  const getCurrentLeaderboard = (): LeaderboardEntry[] => {
    if (!leaderboardData) return []
    return leaderboardData[selectedType] || []
  }
  
  const currentLeaderboard = getCurrentLeaderboard()
  
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🥇'
      case 2: return '🥈'
      case 3: return '🥉'
      default: return `#${rank}`
    }
  }
  
  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'text-yellow-600 dark:text-yellow-400'
      case 2: return 'text-gray-600 dark:text-gray-400'
      case 3: return 'text-orange-600 dark:text-orange-400'
      default: return 'text-gray-700 dark:text-gray-300'
    }
  }
  
  const getChangeIcon = (change: number) => {
    if (change > 0) return '📈'
    if (change < 0) return '📉'
    return '➖'
  }
  
  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600 dark:text-green-400'
    if (change < 0) return 'text-red-600 dark:text-red-400'
    return 'text-gray-500 dark:text-gray-400'
  }
  
  const formatScore = (score: number) => {
    return score.toLocaleString() + ' XP'
  }
  
  const currentUserEntry = currentLeaderboard.find(entry => entry.userId === user?.id)

  // Gate UI until online is enabled and account is linked
  if (onlineEnabled && linked === null) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center text-gray-600 dark:text-gray-400">Checking online account link…</div>
      </div>
    )
  }
  if (!onlineEnabled || linked === false) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            🏆 Leaderboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Compete with other learners and climb the ranks!
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Online leaderboards are disabled
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Enable online features and link your account to participate in global rankings.
          </p>
          <div className="flex items-center justify-between">
            <a
              href="/profile"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go to Account Settings
            </a>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Status: {onlineEnabled ? 'Online enabled' : 'Online disabled'} • {linked ? 'Linked' : 'Not linked'}
            </span>
          </div>
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Note: Study data and media are stored locally. Nothing is uploaded unless you enable online features.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          🏆 Leaderboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Compete with other learners and climb the ranks!
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Leaderboard Category
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {leaderboardTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => setSelectedType(type.value)}
              className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                selectedType === type.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
            >
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-2xl">{type.icon}</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {type.label}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {type.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Current User Position */}
      {currentUserEntry && (
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <h3 className="text-lg font-semibold mb-4">Your Position</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
                {currentUserEntry.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-bold text-lg">{currentUserEntry.username}</div>
                <div className="text-blue-100">
                  {formatScore(currentUserEntry.score)}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">
                {getRankIcon(currentUserEntry.rank)}
              </div>
              <div className="text-sm text-blue-100 flex items-center space-x-1">
                <span>{getChangeIcon(currentUserEntry.change)}</span>
                <span>
                  {currentUserEntry.change === 0 
                    ? 'No change' 
                    : `${Math.abs(currentUserEntry.change)} ${currentUserEntry.change > 0 ? 'up' : 'down'}`
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {leaderboardTypes.find(t => t.value === selectedType)?.label}
            </h3>
            <div className="flex items-center space-x-3">
              {!dataLoading && leaderboardData && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {lastUpdated ? `Updated ${Math.max(1, Math.floor((Date.now() - lastUpdated) / 1000))}s ago` : '—'}
                </div>
              )}
              {cacheInfo && (
                <div
                  title="Cache age and TTL"
                  className={`text-xs px-2 py-1 rounded-full border ${
                    cacheInfo.expired
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200 border-red-300 dark:border-red-800'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800'
                  }`}
                >
                  {cacheInfo.ageSec ?? '—'}s / TTL {cacheInfo.ttlSec ?? '—'}s {cacheInfo.expired ? '(expired)' : ''}
                </div>
              )}
              {queuedCount > 0 && (
                <div className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
                  {queuedCount} queued
                </div>
              )}
              <button
                onClick={() => setRefreshTick(t => t + 1)}
                className="text-sm px-3 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
        
        {dataLoading ? (
          <div className="p-8">
            <div className="space-y-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4">
                  <div className="flex items-center space-x-4">
                    <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-8 w-8 rounded"></div>
                    <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-10 w-10 rounded-full"></div>
                    <div className="space-y-2">
                      <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-4 w-24 rounded"></div>
                      <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-3 w-16 rounded"></div>
                    </div>
                  </div>
                  <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-4 w-8 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        ) : currentLeaderboard.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {currentLeaderboard.map((entry) => (
              <div
                key={entry.userId}
                className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  entry.userId === user?.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Rank */}
                    <div className={`text-2xl font-bold ${getRankColor(entry.rank)} min-w-[3rem] text-center`}>
                      {getRankIcon(entry.rank)}
                    </div>
                    
                    {/* User Info */}
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                        {entry.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {entry.username}
                          {entry.userId === user?.id && (
                            <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {formatScore(entry.score)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Change Indicator */}
                  <div className={`text-sm font-medium ${getChangeColor(entry.change)} flex items-center space-x-1`}>
                    <span className="text-lg">{getChangeIcon(entry.change)}</span>
                    <span>
                      {entry.change === 0 
                        ? '—' 
                        : `${Math.abs(entry.change)}`
                      }
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {dataError ? 'Unable to Load Data' : 'No Data Available'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {dataError || 'Leaderboard data for this category is not available yet.'}
            </p>
          </div>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            How Rankings Work
          </h3>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-start space-x-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>Rankings update regularly based on your study activity</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>XP is earned through studying, accuracy bonuses, and streaks</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>Global rankings include all StudyMaster users</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>Weekly and monthly rankings reset at the start of each period</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Climb the Ranks
          </h3>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-start space-x-2">
              <span className="text-green-500 mt-1">•</span>
              <span>Study consistently to maintain and improve your streak</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-500 mt-1">•</span>
              <span>Focus on accuracy to maximize your XP gains</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-500 mt-1">•</span>
              <span>Complete challenges for bonus XP and achievements</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-500 mt-1">•</span>
              <span>Invite friends to compete in the friends leaderboard</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LeaderboardPage