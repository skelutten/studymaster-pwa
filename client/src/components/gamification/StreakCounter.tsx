import React from 'react'

interface StreakCounterProps {
  currentStreak: number
  longestStreak: number
  lastStudyDate?: string
  className?: string
}

const StreakCounter: React.FC<StreakCounterProps> = ({ 
  currentStreak, 
  longestStreak, 
  lastStudyDate,
  className = '' 
}) => {
  const isStreakActive = () => {
    if (!lastStudyDate) return false
    const lastStudy = new Date(lastStudyDate)
    const today = new Date()
    const diffTime = Math.abs(today.getTime() - lastStudy.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays <= 1
  }

  const getStreakStatus = () => {
    if (currentStreak === 0) return 'inactive'
    if (isStreakActive()) return 'active'
    return 'broken'
  }

  const status = getStreakStatus()

  const getStreakColor = () => {
    switch (status) {
      case 'active':
        return 'text-green-600 dark:text-green-400'
      case 'broken':
        return 'text-orange-600 dark:text-orange-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  const getStreakIcon = () => {
    switch (status) {
      case 'active':
        return '🔥'
      case 'broken':
        return '💔'
      default:
        return '⭐'
    }
  }

  const getStreakMessage = () => {
    switch (status) {
      case 'active':
        return currentStreak === 1 ? 'Great start!' : 'Keep it up!'
      case 'broken':
        return 'Start a new streak today!'
      default:
        return 'Begin your streak!'
    }
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Study Streak
        </h3>
        <span className="text-2xl">{getStreakIcon()}</span>
      </div>
      
      <div className="space-y-3">
        <div className="text-center">
          <div className={`text-3xl font-bold ${getStreakColor()}`}>
            {currentStreak}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {currentStreak === 1 ? 'day' : 'days'}
          </div>
          <div className={`text-sm font-medium ${getStreakColor()}`}>
            {getStreakMessage()}
          </div>
        </div>
        
        <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Longest streak:
            </span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {longestStreak} {longestStreak === 1 ? 'day' : 'days'}
            </span>
          </div>
          
          {lastStudyDate && (
            <div className="flex justify-between items-center text-sm mt-1">
              <span className="text-gray-600 dark:text-gray-400">
                Last study:
              </span>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {new Date(lastStudyDate).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
        
        {/* Streak visualization */}
        <div className="flex justify-center space-x-1 pt-2">
          {Array.from({ length: Math.min(currentStreak, 7) }, (_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${
                status === 'active' 
                  ? 'bg-green-500' 
                  : status === 'broken'
                  ? 'bg-orange-500'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
            />
          ))}
          {currentStreak > 7 && (
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
              +{currentStreak - 7}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default StreakCounter