import { Link, useNavigate } from 'react-router-dom'
import { useDeckStore } from '../stores/deckStore'
import { useGamificationStore } from '../stores/gamificationStore'
import { useAuthStore } from '../stores/authStore'

const HomePage = () => {
  const navigate = useNavigate()
  const { decks, getCards } = useDeckStore()
  const { userStats, userAchievements, achievements } = useGamificationStore()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user } = useAuthStore()

  // Get due cards for today
  const getDueDecks = () => {
    return decks.map(deck => {
      const deckCards = getCards(deck.id)
      const dueCards = deckCards.filter(card => {
        if (card.reviewCount === 0) return true // New cards
        return new Date(card.nextReview) <= new Date() // Due cards
      })
      return { ...deck, dueCount: dueCards.length }
    }).filter(deck => deck.dueCount > 0)
  }

  // Get recent achievements
  const getRecentAchievements = () => {
    return userAchievements
      .map(ua => {
        const achievement = achievements.find(a => a.id === ua.achievementId)
        return achievement ? { ...achievement, earnedAt: ua.earnedAt } : null
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b!.earnedAt).getTime() - new Date(a!.earnedAt).getTime())
      .slice(0, 3)
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const dueDecks = getDueDecks()
  const recentAchievements = getRecentAchievements()

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gradient mb-4">
          Welcome to StudyMaster
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">
          Master your learning with spaced repetition and gamification
        </p>
        
        {/* Live Status Indicator */}
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Live data • Real-time insights</span>
        </div>
      </div>

      {/* Personal Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card p-6 text-center">
          <div className="text-3xl font-bold text-primary-600 mb-2">{formatNumber(userStats.xp)}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total XP</div>
        </div>
        <div className="card p-6 text-center">
          <div className="text-3xl font-bold text-success-600 mb-2">{userStats.currentStreak}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Day Streak</div>
        </div>
        <div className="card p-6 text-center">
          <div className="text-3xl font-bold text-warning-600 mb-2">{userStats.gold}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Coins</div>
        </div>
        <div className="card p-6 text-center">
          <div className="text-3xl font-bold text-purple-600 mb-2">{userStats.level}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Level</div>
        </div>
      </div>


      {/* Study Today */}
      <div className="card p-6">
        <h2 className="text-2xl font-bold mb-4">📚 Study Today</h2>
        {dueDecks.length > 0 ? (
          <div className="space-y-4">
            {dueDecks.slice(0, 3).map(deck => (
              <div key={deck.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <h3 className="font-semibold">{deck.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{deck.dueCount} cards due</p>
                </div>
                <button
                  onClick={() => navigate(`/study/${deck.id}`)}
                  className="btn btn-primary btn-sm"
                >
                  Study Now
                </button>
              </div>
            ))}
            {dueDecks.length > 3 && (
              <div className="text-center">
                <button
                  onClick={() => navigate('/decks')}
                  className="btn btn-secondary btn-sm"
                >
                  View All Decks ({dueDecks.length - 3} more)
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-xl font-semibold mb-2">All caught up!</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No cards are due for review right now. Great job!
            </p>
            <button
              onClick={() => navigate('/decks')}
              className="btn btn-primary"
            >
              Browse Your Decks
            </button>
          </div>
        )}
      </div>


      {/* Recent Achievements */}
      {recentAchievements.length > 0 && (
        <div className="card p-6">
          <h2 className="text-2xl font-bold mb-4">🏆 Recent Achievements</h2>
          <div className="space-y-3">
            {recentAchievements.map(achievement => (
              <div key={achievement!.id} className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-success-100 dark:bg-success-900 rounded-full flex items-center justify-center">
                  {achievement!.icon}
                </div>
                <div>
                  <h3 className="font-semibold">{achievement!.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{achievement!.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link to="/decks" className="card p-6 text-center hover:shadow-lg transition-shadow">
          <div className="text-4xl mb-2">📚</div>
          <h3 className="font-semibold">My Decks</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Manage your study materials</p>
        </Link>
        
        <Link to="/global-stats" className="card p-6 text-center hover:shadow-lg transition-shadow bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-800">
          <div className="text-4xl mb-2">🌍</div>
          <h3 className="font-semibold">Global Stats</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Real-time learning insights</p>
        </Link>
        
        <Link to="/challenges" className="card p-6 text-center hover:shadow-lg transition-shadow">
          <div className="text-4xl mb-2">🎯</div>
          <h3 className="font-semibold">Challenges</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Join learning challenges</p>
        </Link>
        
        <Link to="/leaderboard" className="card p-6 text-center hover:shadow-lg transition-shadow">
          <div className="text-4xl mb-2">🏆</div>
          <h3 className="font-semibold">Leaderboard</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">See how you rank</p>
        </Link>
      </div>

      {/* Educational Insights Footer */}
      <div className="card p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-semibold mb-3 text-blue-800 dark:text-blue-200 flex items-center gap-2">
          💡 Learning Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">87%</div>
            <div className="text-blue-700 dark:text-blue-300">Spaced repetition effectiveness</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">25min</div>
            <div className="text-green-700 dark:text-green-300">Optimal study session</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">7-9PM</div>
            <div className="text-purple-700 dark:text-purple-300">Peak learning hours</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">3x</div>
            <div className="text-orange-700 dark:text-orange-300">Retention improvement</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HomePage