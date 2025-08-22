import { Routes, Route } from 'react-router-dom'
import { useEffect, useState, Suspense, lazy } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import Layout from './components/layout/Layout'
import { useThemeStore } from './stores/themeStore'
import { useAuthStore } from './stores/authStore'
import { ErrorBoundary, logInfo } from './services/errorTrackingService'

// Lazy load pages for code splitting
const HomePage = lazy(() => import('./pages/HomePage'))
const StudyPage = lazy(() => import('./pages/StudyPage'))
const DecksPage = lazy(() => import('./pages/DecksPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'))
const ChallengesPage = lazy(() => import('./pages/ChallengesPage'))
const GlobalStatsPage = lazy(() => import('./pages/GlobalStatsPage'))
const MapTestPage = lazy(() => import('./pages/MapTestPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const DebugLogTestPage = lazy(() => import('./pages/DebugLogTestPage'))

// Loading component for Suspense fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p className="text-gray-600 dark:text-gray-400">Loading...</p>
    </div>
  </div>
)

function App() {
  const { theme, initializeTheme } = useThemeStore()
  const { initializeAuth } = useAuthStore()
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false)

  const {
    needRefresh: [, setNeedRefresh],
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
    
    // Log app initialization
    logInfo('StudyMaster PWA initialized', {
      theme,
      userAgent: navigator.userAgent,
      language: navigator.language,
      online: navigator.onLine
    })
    
    // Apply theme class to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    
    // Online/offline event listeners
    const handleOnline = () => {
      setIsOnline(true)
      logInfo('App went online')
    }
    const handleOffline = () => {
      setIsOnline(false)
      logInfo('App went offline')
    }
    
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
    <ErrorBoundary>
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
        
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Standalone routes - outside of Layout and authentication checks */}
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/debug-log-test" element={<DebugLogTestPage />} />
            
            {/* Main app routes - wrapped in Layout */}
            <Route path="*" element={<Layout />}>
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
        </Suspense>
      </div>
    </ErrorBoundary>
  )
}

export default App