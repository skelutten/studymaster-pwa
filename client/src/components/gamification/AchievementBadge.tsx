import React from 'react'
import type { Achievement, UserAchievement } from '@shared/types'

interface AchievementBadgeProps {
  achievement: Achievement
  userAchievement?: UserAchievement
  size?: 'sm' | 'md' | 'lg'
  showProgress?: boolean
  progress?: number
  className?: string
}

const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  achievement,
  userAchievement,
  size = 'md',
  showProgress = false,
  progress = 0,
  className = ''
}) => {
  const isEarned = !!userAchievement
  
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-12 h-12 text-xs'
      case 'lg':
        return 'w-20 h-20 text-lg'
      default:
        return 'w-16 h-16 text-sm'
    }
  }

  const getRarityColor = () => {
    switch (achievement.rarity) {
      case 'legendary':
        return 'from-yellow-400 to-orange-500'
      case 'epic':
        return 'from-purple-500 to-pink-500'
      case 'rare':
        return 'from-blue-500 to-cyan-500'
      default:
        return 'from-gray-400 to-gray-500'
    }
  }

  const getRarityBorder = () => {
    switch (achievement.rarity) {
      case 'legendary':
        return 'border-yellow-400 shadow-yellow-400/50'
      case 'epic':
        return 'border-purple-500 shadow-purple-500/50'
      case 'rare':
        return 'border-blue-500 shadow-blue-500/50'
      default:
        return 'border-gray-400 shadow-gray-400/50'
    }
  }

  return (
    <div className={`relative group ${className}`}>
      <div
        className={`
          ${getSizeClasses()}
          rounded-full border-2 flex items-center justify-center
          transition-all duration-300 cursor-pointer
          ${isEarned 
            ? `bg-gradient-to-br ${getRarityColor()} ${getRarityBorder()} shadow-lg hover:shadow-xl` 
            : 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 opacity-50'
          }
        `}
      >
        <span className={`${size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-lg' : 'text-xl'}`}>
          {achievement.icon}
        </span>
        
        {!isEarned && (
          <div className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center">
            <span className="text-white text-xs">🔒</span>
          </div>
        )}
      </div>
      
      {/* Progress ring for unearned achievements */}
      {!isEarned && showProgress && progress > 0 && (
        <svg 
          className="absolute inset-0 transform -rotate-90"
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-gray-300 dark:text-gray-600"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeDasharray={`${progress * 2.83} 283`}
            className="text-blue-500 transition-all duration-500"
          />
        </svg>
      )}
      
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
        <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
          <div className="font-semibold">{achievement.name}</div>
          <div className="text-gray-300 dark:text-gray-600">{achievement.description}</div>
          {isEarned && userAchievement && (
            <div className="text-green-400 dark:text-green-600 text-xs mt-1">
              Earned {new Date(userAchievement.earnedAt).toLocaleDateString()}
            </div>
          )}
          {!isEarned && showProgress && (
            <div className="text-blue-400 dark:text-blue-600 text-xs mt-1">
              Progress: {Math.round(progress)}%
            </div>
          )}
          <div className="text-yellow-400 dark:text-yellow-600 text-xs">
            +{achievement.xpReward} XP, +{achievement.coinReward} coins
          </div>
          
          {/* Arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
        </div>
      </div>
      
      {/* Rarity indicator */}
      {isEarned && achievement.rarity !== 'common' && (
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center">
          <span className="text-xs">
            {achievement.rarity === 'legendary' ? '👑' : 
             achievement.rarity === 'epic' ? '💎' : 
             achievement.rarity === 'rare' ? '⭐' : ''}
          </span>
        </div>
      )}
    </div>
  )
}

export default AchievementBadge