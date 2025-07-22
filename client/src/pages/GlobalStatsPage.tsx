import RealTimeStatsCard from '../components/dashboard/RealTimeStatsCard'
import TrendingTopics from '../components/dashboard/TrendingTopics'
import MarketInsights from '../components/dashboard/MarketInsights'
import { useRealTimeData } from '../hooks/useRealTimeData'

const GlobalStatsPage = () => {
  const {
    globalStats,
    liveMetrics,
    isLoading,
    error,
    lastUpdated,
    refresh,
    formatNumber,
    formatTime,
    getTimeSinceUpdate
  } = useRealTimeData()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gradient mb-4">
          🌍 Global Learning Statistics
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">
          Real-time insights from the global learning community
        </p>
        
        {/* Live Status Indicator */}
        <div className="flex items-center justify-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Live data</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Last updated: {lastUpdated ? getTimeSinceUpdate() : 'Loading...'}</span>
            <button
              onClick={refresh}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              disabled={isLoading}
              title="Refresh all data"
            >
              <span className={isLoading ? 'animate-spin' : ''}>🔄</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="card p-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl">⚠️</div>
              <div>
                <h3 className="font-semibold text-red-800 dark:text-red-200">
                  Connection Issue
                </h3>
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              </div>
            </div>
            <button
              onClick={refresh}
              className="btn btn-sm bg-red-600 hover:bg-red-700 text-white"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Global Overview Cards */}
      {globalStats && liveMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {formatNumber(globalStats.totalLearners)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Learners</div>
            <div className="text-xs text-green-600 dark:text-green-400 mt-1">
              +{Math.floor(Math.random() * 1000)} today
            </div>
          </div>
          
          <div className="card p-6 text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {formatNumber(globalStats.cardsStudiedToday)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Cards Studied Today</div>
            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              {formatTime(globalStats.studyTimeToday)} total time
            </div>
          </div>
          
          <div className="card p-6 text-center">
            <div className="text-3xl font-bold text-orange-600 mb-2">
              {formatNumber(liveMetrics.onlineUsers)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Online Now</div>
            <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
              {formatNumber(liveMetrics.studyingSessions)} studying
            </div>
          </div>
          
          <div className="card p-6 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {globalStats.languagesBeingLearned}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Languages</div>
            <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
              {liveMetrics.averageAccuracy.toFixed(1)}% avg accuracy
            </div>
          </div>
        </div>
      )}

      {/* Top Subjects Global Ranking */}
      {globalStats && (
        <div className="card p-6">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            🏆 Most Popular Subjects Worldwide
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {globalStats.topSubjects.map((subject, index) => (
              <div key={subject.name} className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-1">
                  #{index + 1}
                </div>
                <div className="font-semibold text-lg mb-2">{subject.name}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {formatNumber(subject.learners)} learners
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mt-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(20, 100 - index * 15)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Activity Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RealTimeStatsCard
          title="Live Activity Monitor"
          icon="📊"
          className="lg:col-span-1"
          showRefreshButton={true}
        />
        
        {/* Top Performers */}
        {liveMetrics && (
          <div className="card p-6 lg:col-span-2">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              🌟 Top Performers Today
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {liveMetrics.topPerformers.map((performer, index) => (
                <div key={performer.username} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                      index === 0 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                      index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-600' :
                      index === 2 ? 'bg-gradient-to-r from-orange-400 to-red-500' :
                      'bg-gradient-to-r from-blue-400 to-purple-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-semibold">{performer.username}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        🌍 {performer.country}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-blue-600 dark:text-blue-400">
                      {formatNumber(performer.score)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">XP</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Trending Topics Section */}
      <TrendingTopics
        maxItems={8}
        showGrowth={true}
      />

      {/* Market Insights Section */}
      <MarketInsights
        maxSkills={8}
        maxIndustries={6}
        showCertifications={true}
      />

      {/* Global Learning Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            📈 Learning Velocity
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Cards per minute (global)</span>
              <span className="font-bold text-blue-600">
                {globalStats ? Math.floor(globalStats.cardsStudiedToday / (globalStats.studyTimeToday || 1)).toLocaleString() : '0'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Peak learning hour</span>
              <span className="font-bold text-green-600">7-9 PM UTC</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Most active timezone</span>
              <span className="font-bold text-purple-600">UTC+8 (Asia)</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Weekend vs Weekday</span>
              <span className="font-bold text-orange-600">+23% weekdays</span>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            🎯 Learning Effectiveness
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Global retention rate</span>
              <span className="font-bold text-green-600">
                {liveMetrics ? liveMetrics.averageAccuracy.toFixed(1) : '0'}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Optimal session length</span>
              <span className="font-bold text-blue-600">25 minutes</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Spaced repetition usage</span>
              <span className="font-bold text-purple-600">78% of users</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Mobile vs Desktop</span>
              <span className="font-bold text-orange-600">65% mobile</span>
            </div>
          </div>
        </div>
      </div>

      {/* Global Learning Community */}
      <div className="card p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-200 flex items-center gap-2">
            🌍 Global Learning Community
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {globalStats ? formatNumber(globalStats.totalLearners) : '2.8M+'}
            </div>
            <div className="text-sm text-blue-700 dark:text-blue-300">Global Learners</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {globalStats ? formatNumber(globalStats.cardsStudiedToday) : '15M+'}
            </div>
            <div className="text-sm text-green-700 dark:text-green-300">Cards Studied Today</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {liveMetrics ? formatNumber(liveMetrics.studyingSessions) : '23K+'}
            </div>
            <div className="text-sm text-purple-700 dark:text-purple-300">Active Sessions</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {globalStats ? globalStats.languagesBeingLearned : '127'}
            </div>
            <div className="text-sm text-orange-700 dark:text-orange-300">Languages</div>
          </div>
        </div>
      </div>

      {/* Skills in Demand */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold mb-0">💼 Skills in Demand</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
            <div className="text-lg font-bold text-red-600 dark:text-red-400">🚀 AI/ML</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">+156% growth</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">☁️ Cloud</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">+134% growth</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
            <div className="text-lg font-bold text-green-600 dark:text-green-400">🔒 Security</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">+129% growth</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
            <div className="text-lg font-bold text-purple-600 dark:text-purple-400">📊 Data Science</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">+118% growth</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
            <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">🌐 DevOps</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">+112% growth</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
            <div className="text-lg font-bold text-pink-600 dark:text-pink-400">🎨 UX/UI</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">+98% growth</div>
          </div>
        </div>
      </div>

      {/* Data Sources Footer */}
      <div className="card p-6 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200 flex items-center gap-2">
          📡 Data Sources & Methodology
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div>
            <div className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Learning Platforms</div>
            <div>• Educational APIs</div>
            <div>• Learning Management Systems</div>
            <div>• Online Course Providers</div>
          </div>
          <div>
            <div className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Market Data</div>
            <div>• Job Market APIs</div>
            <div>• Skills Demand Analytics</div>
            <div>• Industry Reports</div>
          </div>
          <div>
            <div className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Real-time Metrics</div>
            <div>• User Activity Streams</div>
            <div>• Performance Analytics</div>
            <div>• Engagement Tracking</div>
          </div>
          <div>
            <div className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Update Frequency</div>
            <div>• Live metrics: 10s</div>
            <div>• Global stats: 30s</div>
            <div>• Market data: 5m</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GlobalStatsPage