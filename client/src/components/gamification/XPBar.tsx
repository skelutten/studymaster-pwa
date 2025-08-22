import React from 'react'

interface XPBarProps {
  currentXP: number
  level: number
  className?: string
}

const XPBar: React.FC<XPBarProps> = ({ currentXP, level, className = '' }) => {
  // Calculate XP needed for current level and next level using the same formula as gamification store
  const getXPForLevel = (lvl: number) => Math.pow(lvl - 1, 2) * 100
  const getXPForNextLevel = (lvl: number) => Math.pow(lvl, 2) * 100
  
  const currentLevelXP = getXPForLevel(level)
  const nextLevelXP = getXPForNextLevel(level)
  const xpInCurrentLevel = currentXP - currentLevelXP
  const xpNeededForNextLevel = nextLevelXP - currentLevelXP
  
  const progressPercentage = Math.max(0, Math.min((xpInCurrentLevel / xpNeededForNextLevel) * 100, 100))

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700 dark:text-gray-300">
          Level {level}
        </span>
        <span className="text-gray-500 dark:text-gray-400">
          {xpInCurrentLevel.toLocaleString()} / {xpNeededForNextLevel.toLocaleString()} XP
        </span>
      </div>
      
      <div className="relative">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-500 ease-out relative"
            style={{ width: `${progressPercentage}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full"></div>
          </div>
        </div>
        
        {/* Level indicator */}
        <div className="absolute -top-1 -left-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-white dark:border-gray-800">
          {level}
        </div>
      </div>
      
      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
        {nextLevelXP - currentXP > 0 ? (
          <>
            {(nextLevelXP - currentXP).toLocaleString()} XP to level {level + 1}
          </>
        ) : (
          'Max level reached!'
        )}
      </div>
    </div>
  )
}

export default XPBar