import { NavLink } from 'react-router-dom'
import { useGamificationStore } from '../../stores/gamificationStore'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const { userStats } = useGamificationStore()
  
  const navigation = [
    { name: 'Home', href: '/', icon: '🏠' },
    { name: 'Study', href: '/study', icon: '📚' },
    { name: 'Decks', href: '/decks', icon: '📋' },
    { name: 'Global Stats', href: '/stats', icon: '🌍' },
    { name: 'Profile', href: '/profile', icon: '👤' },
    { name: 'Leaderboard', href: '/leaderboard', icon: '🏆' },
    { name: 'Challenges', href: '/challenges', icon: '🎯' },
    { name: 'Storage', href: '/storage', icon: '💾' },
  ]

  // Format numbers for display
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  // Calculate level progress
  const xpForCurrentLevel = userStats.level * 1000
  const xpForNextLevel = (userStats.level + 1) * 1000
  const progressPercentage = ((userStats.xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100

  return (
    <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform ${
      isOpen ? 'translate-x-0' : '-translate-x-full'
    } transition-transform duration-300 ease-in-out lg:translate-x-0`}>
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold text-gradient">StudyMaster</h1>
        <button
          onClick={onClose}
          className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex flex-col h-full">
        <nav className="flex-1 mt-8 overflow-y-auto">
          <div className="px-4 space-y-2">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                    isActive
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                  }`
                }
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                {item.name}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Quick Stats */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 dark:text-gray-400">XP</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatNumber(userStats.xp)}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 dark:text-gray-400">Streak</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {userStats.currentStreak} {userStats.currentStreak === 1 ? 'day' : 'days'}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, progressPercentage))}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Level {userStats.level} → Level {userStats.level + 1}
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500 text-center">
              {formatNumber(userStats.xp - xpForCurrentLevel)} / {formatNumber(xpForNextLevel - xpForCurrentLevel)} XP
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Sidebar