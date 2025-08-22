import React, { useState } from 'react'
import type { LeaderboardEntry } from '@shared/types'

interface ExtendedLeaderboardEntry extends LeaderboardEntry {
  seasonalRewards?: Record<string, number>
}

interface CommunityLeaderboardProps {
  challengeId: string
  challengeName: string
}

export const CommunityLeaderboard: React.FC<CommunityLeaderboardProps> = ({
  challengeName
}) => {
  const [selectedTier, setSelectedTier] = useState<'bronze' | 'silver' | 'gold' | 'diamond'>('gold')
  const [timeFilter, setTimeFilter] = useState<'daily' | 'weekly' | 'monthly'>('weekly')

  // Mock leaderboard data with tiers
  const mockLeaderboardData: Record<string, ExtendedLeaderboardEntry[]> = {
    bronze: [
      { userId: '101', username: 'NewLearner', score: 150, rank: 1, change: 0, seasonalRewards: { bronze: 1 } },
      { userId: '102', username: 'StudyBuddy', score: 140, rank: 2, change: 1, seasonalRewards: { bronze: 1 } },
      { userId: '103', username: 'FlashFan', score: 135, rank: 3, change: -1, seasonalRewards: { bronze: 1 } },
      { userId: '104', username: 'CardMaster', score: 130, rank: 4, change: 2, seasonalRewards: { bronze: 1 } },
      { userId: '105', username: 'QuickStudy', score: 125, rank: 5, change: 0, seasonalRewards: { bronze: 1 } }
    ],
    silver: [
      { userId: '201', username: 'SilverStar', score: 450, rank: 1, change: 0, seasonalRewards: { silver: 1 } },
      { userId: '202', username: 'StudyPro', score: 420, rank: 2, change: 1, seasonalRewards: { silver: 1 } },
      { userId: '203', username: 'FlashExpert', score: 400, rank: 3, change: -1, seasonalRewards: { silver: 1 } },
      { userId: '204', username: 'MemoryMaster', score: 380, rank: 4, change: 2, seasonalRewards: { silver: 1 } },
      { userId: '205', username: 'StudyElite', score: 360, rank: 5, change: -1, seasonalRewards: { silver: 1 } }
    ],
    gold: [
      { userId: '301', username: 'GoldChampion', score: 850, rank: 1, change: 0, seasonalRewards: { gold: 1 } },
      { userId: '302', username: 'StudyLegend', score: 820, rank: 2, change: 1, seasonalRewards: { gold: 1 } },
      { userId: '303', username: 'FlashMaster', score: 800, rank: 3, change: -1, seasonalRewards: { gold: 1 } },
      { userId: '304', username: 'MemoryGuru', score: 780, rank: 4, change: 2, seasonalRewards: { gold: 1 } },
      { userId: '305', username: 'StudyKing', score: 760, rank: 5, change: -1, seasonalRewards: { gold: 1 } }
    ],
    diamond: [
      { userId: '401', username: 'DiamondElite', score: 1500, rank: 1, change: 0, seasonalRewards: { diamond: 1 } },
      { userId: '402', username: 'StudyGod', score: 1450, rank: 2, change: 0, seasonalRewards: { diamond: 1 } },
      { userId: '403', username: 'FlashLegend', score: 1400, rank: 3, change: 1, seasonalRewards: { diamond: 1 } },
      { userId: '404', username: 'MemoryTitan', score: 1350, rank: 4, change: -1, seasonalRewards: { diamond: 1 } },
      { userId: '405', username: 'StudyEmperor', score: 1300, rank: 5, change: 0, seasonalRewards: { diamond: 1 } }
    ]
  }

  const currentLeaderboard = mockLeaderboardData[selectedTier] || []

  const getTierColor = (tier: string) => {
    const colors = {
      bronze: 'from-orange-400 to-orange-600',
      silver: 'from-gray-400 to-gray-600',
      gold: 'from-yellow-400 to-yellow-600',
      diamond: 'from-blue-400 to-purple-600'
    }
    return colors[tier as keyof typeof colors] || colors.gold
  }

  const getTierIcon = (tier: string) => {
    const icons = {
      bronze: '🥉',
      silver: '🥈',
      gold: '🥇',
      diamond: '💎'
    }
    return icons[tier as keyof typeof icons] || icons.gold
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '👑'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  const getChangeIcon = (change: number) => {
    if (change > 0) return <span className="text-green-500">↗️ +{change}</span>
    if (change < 0) return <span className="text-red-500">↘️ {change}</span>
    return <span className="text-gray-500">➡️ 0</span>
  }

  const getTierRequirement = (tier: string) => {
    const requirements = {
      bronze: '0-200 points',
      silver: '201-500 points',
      gold: '501-1000 points',
      diamond: '1000+ points'
    }
    return requirements[tier as keyof typeof requirements]
  }

  const getTierRewards = (tier: string) => {
    const rewards = {
      bronze: '50 XP, 10 Gold',
      silver: '150 XP, 50 Gold, 5 Gems',
      gold: '300 XP, 150 Gold, 15 Gems, Badge',
      diamond: '500 XP, 300 Gold, 30 Gems, Exclusive Badge, Custom Theme'
    }
    return rewards[tier as keyof typeof rewards]
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            🌍 Community Leaderboard
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            {challengeName} - Compete with players worldwide
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500 dark:text-gray-400">Updated</div>
          <div className="text-sm font-medium text-gray-900 dark:text-white">2 min ago</div>
        </div>
      </div>

      {/* Time Filter */}
      <div className="flex gap-2 mb-6">
        {(['daily', 'weekly', 'monthly'] as const).map(filter => (
          <button
            key={filter}
            onClick={() => setTimeFilter(filter)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              timeFilter === filter
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
          </button>
        ))}
      </div>

      {/* Tier Selection */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {(['bronze', 'silver', 'gold', 'diamond'] as const).map(tier => (
          <button
            key={tier}
            onClick={() => setSelectedTier(tier)}
            className={`p-4 rounded-lg border-2 transition-all ${
              selectedTier === tier
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className={`text-2xl mb-2 bg-gradient-to-r ${getTierColor(tier)} bg-clip-text text-transparent`}>
              {getTierIcon(tier)}
            </div>
            <div className="font-medium text-gray-900 dark:text-white capitalize">
              {tier} Tier
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {getTierRequirement(tier)}
            </div>
          </button>
        ))}
      </div>

      {/* Tier Info */}
      <div className={`p-4 rounded-lg bg-gradient-to-r ${getTierColor(selectedTier)} bg-opacity-10 border border-opacity-20 mb-6`}>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">{getTierIcon(selectedTier)}</span>
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white capitalize">
              {selectedTier} Tier Rewards
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {getTierRewards(selectedTier)}
            </p>
          </div>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Requirement: {getTierRequirement(selectedTier)}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="space-y-3">
        {currentLeaderboard.map((entry) => (
          <div
            key={entry.userId}
            className={`flex items-center gap-4 p-4 rounded-lg border transition-all hover:shadow-md ${
              entry.rank <= 3
                ? 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-800'
                : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
            }`}
          >
            {/* Rank */}
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white dark:bg-gray-800 shadow-sm">
              <span className="text-lg font-bold">
                {typeof getRankIcon(entry.rank) === 'string' && getRankIcon(entry.rank).includes('#') 
                  ? getRankIcon(entry.rank) 
                  : getRankIcon(entry.rank)
                }
              </span>
            </div>

            {/* User Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-gray-900 dark:text-white">
                  {entry.username}
                </span>
                <span className={`text-xs px-2 py-1 rounded-full bg-gradient-to-r ${getTierColor(selectedTier)} text-white`}>
                  {selectedTier.toUpperCase()}
                </span>
                {entry.seasonalRewards && Object.keys(entry.seasonalRewards).length > 0 && (
                  <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full">
                    🏆 Seasonal Winner
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {entry.score.toLocaleString()} points this {timeFilter}
              </div>
            </div>

            {/* Change Indicator */}
            <div className="text-sm">
              {getChangeIcon(entry.change)}
            </div>

            {/* Score */}
            <div className="text-right">
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {entry.score.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                points
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Promotion/Demotion Info */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-blue-500">ℹ️</span>
          <span className="font-medium text-blue-900 dark:text-blue-100">
            Tier Progression
          </span>
        </div>
        <div className="text-sm text-blue-800 dark:text-blue-200">
          • Reach the next tier's point threshold to get promoted
          • Fall below your current tier's minimum to get demoted
          • Tier changes happen at the end of each weekly period
          • Higher tiers unlock better rewards and exclusive features
        </div>
      </div>

      {/* Global Stats */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-lg font-bold text-gray-900 dark:text-white">47,892</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Total Players</div>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-lg font-bold text-gray-900 dark:text-white">2.4M</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Cards Studied</div>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-lg font-bold text-gray-900 dark:text-white">89.2%</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Avg Accuracy</div>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-lg font-bold text-gray-900 dark:text-white">156h</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Study Time</div>
        </div>
      </div>
    </div>
  )
}