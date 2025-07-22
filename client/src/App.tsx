import { Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import Layout from './components/layout/Layout'
import HomePage from './pages/HomePage'
import StudyPage from './pages/StudyPage'
import DecksPage from './pages/DecksPage'
import ProfilePage from './pages/ProfilePage'
import LeaderboardPage from './pages/LeaderboardPage'
import ChallengesPage from './pages/ChallengesPage'
import GlobalStatsPage from './pages/GlobalStatsPage'
import MapTestPage from './pages/MapTestPage'
import { useThemeStore } from './stores/themeStore'
import { useSupabaseAuthStore } from './stores/supabaseAuthStore'

function App() {
  const { theme, initializeTheme } = useThemeStore()
  const { initializeAuth } = useSupabaseAuthStore()
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false)

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      console.log('SW Registered: ', r)
    },
    onRegisterError(error: unknown) {
      console.log('SW registration error', error)
    },
    onNeedRefresh() {
      setShowUpdatePrompt(true)
    },
  })

  useEffect(() => {
    // Initialize theme from localStorage or system preference
    initializeTheme()
    
    // Initialize authentication state
    initializeAuth()
    
    // Apply theme class to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    
    // Online/offline event listeners
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [theme, initializeTheme, initializeAuth])

  const handleUpdateApp = () => {
    updateServiceWorker(true)
    setShowUpdatePrompt(false)
    setNeedRefresh(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Offline Indicator */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white px-4 py-2 text-center text-sm z-50">
          ⚠️ You're currently offline. Some features may be limited.
        </div>
      )}
      
      {/* PWA Update Prompt */}
      {showUpdatePrompt && (
        <div className="fixed top-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg max-w-sm z-50">
          <p className="mb-3">A new version of StudyMaster is available!</p>
          <div className="flex gap-2">
            <button
              onClick={handleUpdateApp}
              className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100"
            >
              Update Now
            </button>
            <button
              onClick={() => setShowUpdatePrompt(false)}
              className="bg-blue-700 text-white px-3 py-1 rounded text-sm hover:bg-blue-800"
            >
              Later
            </button>
          </div>
        </div>
      )}
      
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="study" element={<StudyPage />} />
          <Route path="study/:deckId" element={<StudyPage />} />
          <Route path="decks" element={<DecksPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="leaderboard" element={<LeaderboardPage />} />
          <Route path="challenges" element={<ChallengesPage />} />
          <Route path="global-stats" element={<GlobalStatsPage />} />
          <Route path="map-test" element={<MapTestPage />} />
        </Route>
      </Routes>
    </div>
  )
}

export default App