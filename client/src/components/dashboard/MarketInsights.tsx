import { useMarketInsights } from '../../hooks/useRealTimeData'

interface MarketInsightsProps {
  className?: string
  maxSkills?: number
  maxIndustries?: number
  showCertifications?: boolean
}

const MarketInsights: React.FC<MarketInsightsProps> = ({
  className = '',
  maxSkills = 6,
  maxIndustries = 4,
  showCertifications = true
}) => {
  const { data: insights, isLoading, error, refresh } = useMarketInsights()

  if (isLoading) {
    return (
      <div className={`card p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex justify-between items-center">
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24"></div>
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-300 dark:bg-gray-600 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !insights) {
    return (
      <div className={`card p-6 border-red-200 dark:border-red-800 ${className}`}>
        <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">
          💼 Market Insights
        </h3>
        <div className="text-sm text-red-600 dark:text-red-400 mb-2">
          Failed to load market data
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

  const getDemandColor = (demand: number): string => {
    if (demand >= 90) return 'text-red-600 dark:text-red-400'
    if (demand >= 80) return 'text-orange-600 dark:text-orange-400'
    if (demand >= 70) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-green-600 dark:text-green-400'
  }

  const getDemandLabel = (demand: number): string => {
    if (demand >= 90) return 'Very High'
    if (demand >= 80) return 'High'
    if (demand >= 70) return 'Medium'
    return 'Growing'
  }

  const getGrowthIcon = (growth: number): string => {
    if (growth >= 150) return '🚀'
    if (growth >= 100) return '📈'
    if (growth >= 50) return '⬆️'
    return '➡️'
  }

  return (
    <div className={`card p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          💼 Market Insights
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        </h3>
        <button
          onClick={refresh}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          title="Refresh market data"
        >
          🔄
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Skills in Demand */}
        <div>
          <h4 className="text-md font-semibold mb-4 text-gray-800 dark:text-gray-200 flex items-center gap-2">
            🎯 Skills in High Demand
          </h4>
          <div className="space-y-3">
            {insights.skillDemand.slice(0, maxSkills).map((skill, index) => (
              <div
                key={skill.skill}
                className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                      {index + 1}
                    </div>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {skill.skill}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getGrowthIcon(skill.growth)}</span>
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">
                      +{skill.growth.toFixed(0)}%
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex-1 mr-3">
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${skill.demand}%` }}
                      ></div>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ${getDemandColor(skill.demand)}`}>
                    {getDemandLabel(skill.demand)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Industry Trends */}
        <div>
          <h4 className="text-md font-semibold mb-4 text-gray-800 dark:text-gray-200 flex items-center gap-2">
            🏭 Growing Industries
          </h4>
          <div className="space-y-3">
            {insights.industryTrends.slice(0, maxIndustries).map((industry, index) => (
              <div
                key={industry.industry}
                className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                      {index + 1}
                    </div>
                    {industry.industry}
                  </h5>
                  <div className="flex items-center gap-1">
                    <span className="text-lg">{getGrowthIcon(industry.growth)}</span>
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">
                      +{industry.growth.toFixed(0)}%
                    </span>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Key Skills: </span>
                  {industry.skills.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Certifications Section */}
      {showCertifications && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-md font-semibold mb-4 text-gray-800 dark:text-gray-200 flex items-center gap-2">
            🏆 Most Valuable Certifications
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.certificationValue.slice(0, 4).map((cert, index) => (
              <div
                key={cert.cert}
                className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                      {index + 1}
                    </div>
                    <span className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                      {cert.cert}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 dark:text-gray-400">Value:</span>
                    <div className="w-12 bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                      <div
                        className="bg-yellow-500 h-1.5 rounded-full"
                        style={{ width: `${cert.value}%` }}
                      ></div>
                    </div>
                    <span className="font-semibold text-yellow-600 dark:text-yellow-400">
                      {cert.value.toFixed(0)}%
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <span className="text-gray-600 dark:text-gray-400">Popular:</span>
                    <span className="font-semibold text-orange-600 dark:text-orange-400">
                      {cert.popularity.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Market Summary */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <h5 className="font-semibold text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
            💡 Market Summary
          </h5>
          <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <p>• AI/ML skills show the highest demand with {insights.skillDemand[0]?.growth.toFixed(0)}% growth</p>
            <p>• Technology sector leads with {insights.industryTrends[0]?.growth.toFixed(0)}% industry growth</p>
            <p>• Cloud certifications offer the best ROI for career advancement</p>
            <p>• Remote learning skills are becoming increasingly valuable</p>
          </div>
        </div>
      </div>

      {/* Last Updated */}
      <div className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
        Market data updated: {new Date(insights.lastUpdated).toLocaleTimeString()}
      </div>
    </div>
  )
}

export default MarketInsights