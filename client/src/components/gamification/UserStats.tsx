import React from 'react'

interface UserStatsProps {
  stats: {
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
  }
  className?: string
}

const UserStats: React.FC<UserStatsProps> = ({ stats, className = '' }) => {
  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toString()
  }

  const statItems = [
    {
      label: 'Cards Studied',
      value: formatNumber(stats.totalCards),
      subValue: `${stats.cardsStudiedToday} today`,
      icon: '📚',
      color: 'text-blue-600 dark:text-blue-400'
    },
    {
      label: 'Study Time',
      value: formatTime(stats.totalStudyTime),
      subValue: `${formatTime(stats.studyTimeToday)} today`,
      icon: '⏱️',
      color: 'text-green-600 dark:text-green-400'
    },
    {
      label: 'Accuracy',
      value: `${stats.averageAccuracy.toFixed(1)}%`,
      subValue: 'Average',
      icon: '🎯',
      color: 'text-purple-600 dark:text-purple-400'
    },
    {
      label: 'Current Streak',
      value: `${stats.currentStreak}`,
      subValue: `${stats.longestStreak} longest`,
      icon: '🔥',
      color: 'text-orange-600 dark:text-orange-400'
    },
    {
      label: 'This Week',
      value: formatNumber(stats.cardsStudiedThisWeek),
      subValue: 'cards studied',
      icon: '📅',
      color: 'text-indigo-600 dark:text-indigo-400'
    },
    {
      label: 'This Month',
      value: formatNumber(stats.cardsStudiedThisMonth),
      subValue: 'cards studied',
      icon: '📊',
      color: 'text-pink-600 dark:text-pink-400'
    },
    {
      label: 'Decks Created',
      value: formatNumber(stats.decksCreated),
      subValue: `${stats.decksCompleted} completed`,
      icon: '📦',
      color: 'text-cyan-600 dark:text-cyan-400'
    },
    {
      label: 'Study Time',
      value: formatTime(stats.studyTimeThisWeek),
      subValue: 'this week',
      icon: '⌚',
      color: 'text-teal-600 dark:text-teal-400'
    }
  ]

  return (
    <div className={`${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Study Statistics
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statItems.map((item, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{item.icon}</span>
              <div className={`text-right ${item.color}`}>
                <div className="text-lg font-bold">{item.value}</div>
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {item.label}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {item.subValue}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Progress indicators */}
      <div className="mt-6 space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
            Weekly Progress
          </h4>
          
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">Cards Studied</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {stats.cardsStudiedThisWeek} / 350 goal
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((stats.cardsStudiedThisWeek / 350) * 100, 100)}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">Study Time</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatTime(stats.studyTimeThisWeek)} / 10h goal
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((stats.studyTimeThisWeek / 600) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserStats