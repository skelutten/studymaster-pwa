import { useState } from 'react'
import { useRealTimeData } from '../../hooks/useRealTimeData'

interface RealTimeStatsCardProps {
  title: string
  icon: string
  className?: string
  showRefreshButton?: boolean
  compact?: boolean
}

const RealTimeStatsCard: React.FC<RealTimeStatsCardProps> = ({
  title,
  icon,
  className = '',
  showRefreshButton = true,
  compact = false
}) => {
  const {
    globalStats,
    liveMetrics,
    isLoading,
    error,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    lastUpdated,
    refresh,
    formatNumber,
    formatTime,
    getTimeSinceUpdate
  } = useRealTimeData()

  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refresh()
    setTimeout(() => setIsRefreshing(false), 1000) // Visual feedback
  }

  if (isLoading && !globalStats) {
    return (
      <div className={`card p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-32"></div>
            <div className="h-4 w-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
          </div>
          <div className="space-y-3">
            <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`card p-6 border-red-200 dark:border-red-800 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
            {icon} {title}
          </h3>
          {showRefreshButton && (
            <button
              onClick={handleRefresh}
              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              disabled={isRefreshing}
            >
              <span className={isRefreshing ? 'animate-spin' : ''}>🔄</span>
            </button>
          )}
        </div>
        <div className="text-sm text-red-600 dark:text-red-400">
          Failed to load real-time data
        </div>
        <button
          onClick={handleRefresh}
          className="mt-2 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 underline"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className={`card p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`font-semibold flex items-center gap-2 ${compact ? 'text-base' : 'text-lg'}`}>
          {icon} {title}
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        </h3>
        {showRefreshButton && (
          <button
            onClick={handleRefresh}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            disabled={isRefreshing}
            title="Refresh data"
          >
            <span className={isRefreshing ? 'animate-spin' : ''}>🔄</span>
          </button>
        )}
      </div>

      {globalStats && liveMetrics && (
        <div className={`space-y-${compact ? '2' : '4'}`}>
          {/* Key Metrics */}
          <div className={`grid grid-cols-2 ${compact ? 'gap-2' : 'gap-4'}`}>
            <div className="text-center">
              <div className={`font-bold text-blue-600 ${compact ? 'text-lg' : 'text-2xl'}`}>
                {formatNumber(globalStats.activeStudySessions)}
              </div>
              <div className={`text-gray-600 dark:text-gray-400 ${compact ? 'text-xs' : 'text-sm'}`}>
                Active Sessions
              </div>
            </div>
            <div className="text-center">
              <div className={`font-bold text-green-600 ${compact ? 'text-lg' : 'text-2xl'}`}>
                {formatNumber(liveMetrics.onlineUsers)}
              </div>
              <div className={`text-gray-600 dark:text-gray-400 ${compact ? 'text-xs' : 'text-sm'}`}>
                Online Users
              </div>
            </div>
          </div>

          {!compact && (
            <>
              {/* Additional Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-purple-600">
                    {formatNumber(globalStats.cardsStudiedToday)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Cards Today
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-orange-600">
                    {liveMetrics.averageAccuracy.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Avg Accuracy
                  </div>
                </div>
              </div>

              {/* Study Time */}
              <div className="text-center">
                <div className="text-lg font-bold text-red-600">
                  {formatTime(globalStats.studyTimeToday)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Global Study Time Today
                </div>
              </div>
            </>
          )}

          {/* Last Updated */}
          <div className={`text-center text-gray-500 dark:text-gray-400 ${compact ? 'text-xs' : 'text-sm'}`}>
            Updated {getTimeSinceUpdate()}
          </div>
        </div>
      )}
    </div>
  )
}

export default RealTimeStatsCard