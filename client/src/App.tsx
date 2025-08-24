import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import Layout from './components/layout/Layout'
import HomePage from './pages/HomePage'
import StudyPage from './pages/StudyPage'
import DecksPage from './pages/DecksPage'
import ProfilePage from './pages/ProfilePage'
import ChallengesPage from './pages/ChallengesPage'
import LeaderboardPage from './pages/LeaderboardPage'
import GlobalStatsPage from './pages/GlobalStatsPage'
import AnalyticsDashboard from './pages/AnalyticsDashboard'
import EnhancedReviewPage from './pages/EnhancedReviewPage'
import TestResetPage from './pages/TestResetPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import MapTestPage from './pages/MapTestPage'
import DebugLogTestPage from './pages/DebugLogTestPage'

// Development/testing pages - can be removed in production
const isDev = import.meta.env.DEV

function App() {
  const { isAuthenticated } = useAuthStore()

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route 
          path="/study/:deckId" 
          element={isAuthenticated ? <StudyPage /> : <Navigate to="/" replace />} 
        />
        <Route 
          path="/enhanced-review/:deckId" 
          element={isAuthenticated ? <EnhancedReviewPage /> : <Navigate to="/" replace />} 
        />
        <Route 
          path="/decks" 
          element={isAuthenticated ? <DecksPage /> : <Navigate to="/" replace />} 
        />
        <Route 
          path="/profile" 
          element={isAuthenticated ? <ProfilePage /> : <Navigate to="/" replace />} 
        />
        <Route 
          path="/challenges" 
          element={isAuthenticated ? <ChallengesPage /> : <Navigate to="/" replace />} 
        />
        <Route 
          path="/leaderboard" 
          element={<LeaderboardPage />} 
        />
        <Route 
          path="/stats" 
          element={<GlobalStatsPage />} 
        />
        <Route 
          path="/analytics" 
          element={isAuthenticated ? <AnalyticsDashboard /> : <Navigate to="/" replace />} 
        />
        <Route 
          path="/reset-password" 
          element={<ResetPasswordPage />} 
        />
        
        {/* Development/Testing Routes */}
        {isDev && (
          <>
            <Route path="/test/reset" element={<TestResetPage />} />
            <Route path="/test/map" element={<MapTestPage />} />
            <Route path="/test/debug" element={<DebugLogTestPage />} />
          </>
        )}
        
        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App