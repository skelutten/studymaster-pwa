import { Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
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
import { useAuthStore } from './stores/authStore'

function App() {
  const { theme, initializeTheme } = useThemeStore()
  const { initializeAuth } = useAuthStore()

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
  }, [theme, initializeTheme, initializeAuth])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
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