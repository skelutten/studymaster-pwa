import React from 'react'
import type { Challenge, ChallengeParticipation } from '@shared/types'
import { useGamificationStore } from '../../stores/gamificationStore'

interface MonthlyChallengeProps {
  challenge: Challenge
  participation?: ChallengeParticipation
}

export const MonthlyChallenge: React.FC<MonthlyChallengeProps> = ({
  challenge,
  participation
}) => {
  const {
    claimMilestoneReward
  } = useGamificationStore()

  const progress = participation?.progress || {}
  const milestoneProgress = participation?.milestoneProgress || {}
  const weeklyProgress = participation?.weeklyProgress || []
  const currentStreak = participation?.currentStreak || 0
  const bestWeek = participation?.bestWeek || 0

  // Calculate overall progress percentage
  const totalTarget = challenge.requirements.reduce((sum, req) => sum + req.target, 0)
  const totalCurrent = challenge.requirements.reduce((sum, req) => {
    const key = req.type
    return sum + (progress[key] || 0)
  }, 0)
  const progressPercentage = Math.min((totalCurrent / totalTarget) * 100, 100)

  // Mock milestone data (would come from challenge definition in real implementation)
  const milestones = [
    { id: 'milestone_1', name: 'First Week', target: 25, reward: '100 XP + 20 Gold' },
    { id: 'milestone_2', name: 'Consistency', target: 50, reward: '200 XP + 50 Gold' },
    { id: 'milestone_3', name: 'Dedication', target: 75, reward: '300 XP + 100 Gold + 5 Gems' },
    { id: 'milestone_4', name: 'Mastery', target: 100, reward: '500 XP + 200 Gold + 10 Gems + Badge' }
  ]

  // Mock story chapters (would come from challenge definition)
  const storyChapters = [
    { week: 1, title: 'The Journey Begins', unlocked: weeklyProgress.some(w => w.week === 1 && w.storyUnlocked) },
    { week: 2, title: 'Building Momentum', unlocked: weeklyProgress.some(w => w.week === 2 && w.storyUnlocked) },
    { week: 3, title: 'Overcoming Challenges', unlocked: weeklyProgress.some(w => w.week === 3 && w.storyUnlocked) },
    { week: 4, title: 'The Final Push', unlocked: weeklyProgress.some(w => w.week === 4 && w.storyUnlocked) }
  ]

  const handleClaimMilestone = (milestoneId: string) => {
    claimMilestoneReward(challenge.id, milestoneId)
  }

  const getWeekProgress = (week: number) => {
    return weeklyProgress.find(w => w.week === week)
  }

  const getDifficultyColor = (week: number) => {
    const colors = ['bg-green-500', 'bg-yellow-500', 'bg-orange-500', 'bg-red-500']
    return colors[Math.min(week - 1, 3)]
  }

  const getDifficultyLabel = (week: number) => {
    const labels = ['Beginner', 'Intermediate', 'Advanced', 'Expert']
    return labels[Math.min(week - 1, 3)]
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🏆</span>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {challenge.title}
            </h3>
            <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs font-medium rounded-full">
              Monthly Epic
            </span>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mb-2">
            {challenge.description}
          </p>
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span>🔥 Streak: {currentStreak} days</span>
            <span>⭐ Best Week: {bestWeek}</span>
            <span>📅 {Math.ceil((new Date(challenge.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days left</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {progressPercentage.toFixed(0)}%
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Complete</div>
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-2">
          <span>Overall Progress</span>
          <span>{totalCurrent} / {totalTarget}</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Weekly Progress with Difficulty Scaling */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Weekly Progress & Difficulty Scaling
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(week => {
            const weekData = getWeekProgress(week)
            const isCompleted = weekData?.completed || false
            const isCurrentWeek = Math.ceil((Date.now() - new Date(challenge.startDate).getTime()) / (1000 * 60 * 60 * 24 * 7)) === week
            
            return (
              <div 
                key={week}
                className={`p-3 rounded-lg border-2 ${
                  isCompleted 
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                    : isCurrentWeek
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900 dark:text-white">Week {week}</span>
                  {isCompleted && <span className="text-green-500">✓</span>}
                  {isCurrentWeek && !isCompleted && <span className="text-purple-500">📍</span>}
                </div>
                <div className={`text-xs px-2 py-1 rounded-full text-white ${getDifficultyColor(week)} mb-2`}>
                  {getDifficultyLabel(week)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Target: {25 * week} cards
                </div>
                {weekData && (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Progress: {Object.values(weekData.progress).reduce((a, b) => a + b, 0)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Story Arc Progress */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          📖 Story Arc: "The Path to Mastery"
        </h4>
        <div className="space-y-2">
          {storyChapters.map(chapter => (
            <div 
              key={chapter.week}
              className={`flex items-center gap-3 p-3 rounded-lg ${
                chapter.unlocked 
                  ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' 
                  : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                chapter.unlocked ? 'bg-blue-500 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-500'
              }`}>
                {chapter.unlocked ? '📖' : '🔒'}
              </div>
              <div className="flex-1">
                <div className={`font-medium ${
                  chapter.unlocked ? 'text-blue-900 dark:text-blue-100' : 'text-gray-500 dark:text-gray-400'
                }`}>
                  Chapter {chapter.week}: {chapter.title}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {chapter.unlocked ? 'Unlocked! Click to read' : `Complete Week ${chapter.week} to unlock`}
                </div>
              </div>
              {chapter.unlocked && (
                <button className="px-3 py-1 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors">
                  Read
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Milestones */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          🎯 Milestones & Rewards
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {milestones.map(milestone => {
            const isCompleted = milestoneProgress[milestone.id] === true
            const isClaimed = milestoneProgress[`${milestone.id}_claimed`] === true
            const canClaim = isCompleted && !isClaimed
            
            return (
              <div 
                key={milestone.id}
                className={`p-4 rounded-lg border-2 ${
                  isClaimed 
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                    : isCompleted
                    ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {milestone.name}
                  </span>
                  <div className="flex items-center gap-2">
                    {isClaimed && <span className="text-green-500">✅</span>}
                    {isCompleted && !isClaimed && <span className="text-yellow-500">🎁</span>}
                    {!isCompleted && <span className="text-gray-400">⏳</span>}
                  </div>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                  Target: {milestone.target}% completion
                </div>
                <div className="text-sm text-purple-600 dark:text-purple-400 mb-3">
                  Reward: {milestone.reward}
                </div>
                {canClaim && (
                  <button 
                    onClick={() => handleClaimMilestone(milestone.id)}
                    className="w-full px-3 py-2 bg-yellow-500 text-white text-sm font-medium rounded-lg hover:bg-yellow-600 transition-colors"
                  >
                    Claim Reward
                  </button>
                )}
                {isClaimed && (
                  <div className="w-full px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-sm font-medium rounded-lg text-center">
                    Claimed
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Community Goals */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          🌍 Community Goals
        </h4>
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between mb-3">
            <span className="font-medium text-gray-900 dark:text-white">
              Global Study Challenge
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              12,847 / 50,000 participants
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
              style={{ width: '25.7%' }}
            />
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300 mb-3">
            Help the community reach 50,000 participants to unlock exclusive rewards for everyone!
          </div>
          <div className="text-sm text-purple-600 dark:text-purple-400">
            Community Reward: Exclusive "Unity" badge + 100 bonus gems for all participants
          </div>
        </div>
      </div>

      {/* Exclusive Rewards Preview */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          💎 Exclusive Monthly Rewards
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="text-center">
              <div className="text-2xl mb-2">🏅</div>
              <div className="font-medium text-gray-900 dark:text-white">Monthly Master</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Exclusive Badge</div>
            </div>
          </div>
          <div className="p-3 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="text-center">
              <div className="text-2xl mb-2">👑</div>
              <div className="font-medium text-gray-900 dark:text-white">Royal Title</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Profile Enhancement</div>
            </div>
          </div>
          <div className="p-3 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="text-center">
              <div className="text-2xl mb-2">🎨</div>
              <div className="font-medium text-gray-900 dark:text-white">Custom Theme</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">UI Customization</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}