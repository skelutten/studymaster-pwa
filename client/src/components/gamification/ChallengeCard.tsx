import React from 'react'
import type { Challenge, ChallengeParticipation } from '@shared/types'

interface ChallengeCardProps {
  challenge: Challenge
  participation?: ChallengeParticipation
  onJoin?: (challengeId: string) => void
  onClaim?: (challengeId: string) => void
  className?: string
}

const ChallengeCard: React.FC<ChallengeCardProps> = ({
  challenge,
  participation,
  onJoin,
  onClaim,
  className = ''
}) => {
  const isParticipating = !!participation
  const isCompleted = participation?.completed || false
  
  const getTimeRemaining = () => {
    const endDate = new Date(challenge.endDate)
    const now = new Date()
    const diffMs = endDate.getTime() - now.getTime()
    
    if (diffMs <= 0) return 'Expired'
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }
  
  const getChallengeTypeColor = () => {
    switch (challenge.type) {
      case 'daily':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'weekly':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'monthly':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'community':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      case 'friend':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }
  
  const getChallengeTypeIcon = () => {
    switch (challenge.type) {
      case 'daily': return '📅'
      case 'weekly': return '📊'
      case 'monthly': return '🗓️'
      case 'community': return '🌍'
      case 'friend': return '👥'
      default: return '🎯'
    }
  }
  
  const getProgress = () => {
    if (!participation || !challenge.requirements.length) return 0
    
    const requirement = challenge.requirements[0]
    const progress = participation.progress[requirement.type] || 0
    return Math.min((progress / requirement.target) * 100, 100)
  }
  
  const getProgressText = () => {
    if (!participation || !challenge.requirements.length) return '0 / 0'
    
    const requirement = challenge.requirements[0]
    const progress = participation.progress[requirement.type] || 0
    return `${progress} / ${requirement.target}`
  }
  
  const timeRemaining = getTimeRemaining()
  const progress = getProgress()
  const isExpired = timeRemaining === 'Expired'

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{getChallengeTypeIcon()}</span>
            <div>
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                {challenge.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {challenge.description}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col items-end space-y-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getChallengeTypeColor()}`}>
              {challenge.type.charAt(0).toUpperCase() + challenge.type.slice(1)}
            </span>
            
            {isCompleted && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                ✅ Completed
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>⏰ {timeRemaining}</span>
          <span>👥 {challenge.participantCount.toLocaleString()} participants</span>
        </div>
      </div>
      
      {/* Requirements */}
      <div className="p-4">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Requirements</h4>
        <div className="space-y-3">
          {challenge.requirements.map((requirement, index) => (
            <div key={index}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">
                  {requirement.description}
                </span>
                {isParticipating && (
                  <span className="font-medium text-gray-900 dark:text-white">
                    {getProgressText()}
                  </span>
                )}
              </div>
              
              {isParticipating && (
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      isCompleted 
                        ? 'bg-green-600' 
                        : 'bg-blue-600'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Rewards */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Rewards</h4>
        <div className="flex flex-wrap gap-2">
          {challenge.rewards.map((reward, index) => (
            <div
              key={index}
              className="flex items-center space-x-1 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded-full text-sm"
            >
              <span>
                {reward.type === 'xp' && '⭐'}
                {reward.type === 'coins' && '💰'}
                {reward.type === 'gems' && '💎'}
                {reward.type === 'badge' && '🏆'}
                {reward.type === 'title' && '👑'}
              </span>
              <span className="font-medium">
                {reward.amount ? `+${reward.amount}` : ''} {reward.type.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Action Button */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        {isExpired ? (
          <button
            disabled
            className="w-full py-2 px-4 bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded-lg cursor-not-allowed"
          >
            Challenge Expired
          </button>
        ) : isCompleted ? (
          <button
            onClick={() => onClaim?.(challenge.id)}
            className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
          >
            🎉 Claim Rewards
          </button>
        ) : isParticipating ? (
          <div className="text-center">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              You're participating in this challenge
            </div>
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {progress.toFixed(1)}% Complete
            </div>
          </div>
        ) : (
          <button
            onClick={() => onJoin?.(challenge.id)}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            🚀 Join Challenge
          </button>
        )}
      </div>
    </div>
  )
}

export default ChallengeCard