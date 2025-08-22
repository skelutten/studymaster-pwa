import { useEducationalTrends } from '../../hooks/useRealTimeData'

interface TrendingTopicsProps {
  className?: string
  maxItems?: number
  showGrowth?: boolean
}

const TrendingTopics: React.FC<TrendingTopicsProps> = ({
  className = '',
  maxItems = 8,
  showGrowth = true
}) => {
  const { data: trends, isLoading, error, refresh } = useEducationalTrends()

  if (isLoading) {
    return (
      <div className={`card p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-48 mb-4"></div>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-32"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !trends) {
    return (
      <div className={`card p-6 border-red-200 dark:border-red-800 ${className}`}>
        <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">
          📈 Trending Topics
        </h3>
        <div className="text-sm text-red-600 dark:text-red-400 mb-2">
          Failed to load trending data
        </div>
        <button
          onClick={refresh}
          className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 underline"
        >
          Try again
        </button>
      </div>
    )
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const getGrowthColor = (growth: number): string => {
    if (growth >= 100) return 'text-green-600 dark:text-green-400'
    if (growth >= 50) return 'text-blue-600 dark:text-blue-400'
    if (growth >= 20) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-gray-600 dark:text-gray-400'
  }

  const getGrowthIcon = (growth: number): string => {
    if (growth >= 100) return '🚀'
    if (growth >= 50) return '📈'
    if (growth >= 20) return '⬆️'
    return '➡️'
  }

  return (
    <div className={`card p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          📈 Trending Topics
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        </h3>
        <button
          onClick={refresh}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          title="Refresh trends"
        >
          🔄
        </button>
      </div>

      <div className="space-y-3">
        {trends.popularSubjects.slice(0, maxItems).map((subject, index) => (
          <div
            key={subject.subject}
            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {index + 1}
              </div>
              <div>
                <div className="font-semibold text-gray-800 dark:text-gray-200">
                  {subject.subject}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {formatNumber(subject.learners)} learners
                </div>
              </div>
            </div>
            
            {showGrowth && (
              <div className="flex items-center gap-2">
                <span className="text-lg">{getGrowthIcon(subject.growth)}</span>
                <div className="text-right">
                  <div className={`font-bold ${getGrowthColor(subject.growth)}`}>
                    +{subject.growth.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    growth
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Learning Methods Section */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <h4 className="text-md font-semibold mb-3 text-gray-800 dark:text-gray-200">
          🎯 Most Effective Methods
        </h4>
        <div className="space-y-2">
          {trends.learningMethods.slice(0, 3).map((method) => (
            <div key={method.method} className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {method.method}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-16 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${method.effectiveness}%` }}
                  ></div>
                </div>
                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                  {method.effectiveness.toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Peak Hours Visualization */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <h4 className="text-md font-semibold mb-3 text-gray-800 dark:text-gray-200">
          ⏰ Peak Study Hours Today
        </h4>
        <div className="flex items-end justify-between gap-1 h-16">
          {trends.studyPatterns.peakHours.filter((_, i) => i % 2 === 0).map((hour) => (
            <div key={hour.hour} className="flex flex-col items-center flex-1">
              <div
                className="bg-gradient-to-t from-blue-600 to-blue-400 rounded-sm w-full"
                style={{ height: `${Math.max(hour.activity / 2, 8)}px` }}
                title={`${hour.hour}:00 - ${hour.activity}% activity`}
              ></div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {hour.hour}h
              </div>
            </div>
          ))}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
          Current hour activity: {trends.studyPatterns.peakHours[new Date().getHours()]?.activity || 0}%
        </div>
      </div>

      {/* Last Updated */}
      <div className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
        Last updated: {new Date(trends.lastUpdated).toLocaleTimeString()}
      </div>
    </div>
  )
}

export default TrendingTopics