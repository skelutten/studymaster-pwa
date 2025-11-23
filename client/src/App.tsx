import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import { useEffect } from 'react'
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
import StoragePage from './pages/StoragePage'
import AuthRoute from './components/AuthRoute' // Import AuthRoute

// Development/testing pages - can be removed in production
const isDev = import.meta.env.DEV

function EnhancedReviewRoute() {
  const { deckId } = useParams();
  const { user } = useAuthStore();
  // Fallback user id for offline/local mode
  const userId = user?.id ?? 'local-user';
  return <EnhancedReviewPage deckId={deckId!} userId={userId} />;
}

function AnalyticsRoute() {
  const { user } = useAuthStore();
  const userId = user?.id ?? 'local-user';
  // Provide a sensible default time range; component should handle this
  return <AnalyticsDashboard userId={userId} timeRange={'30d'} />;
}

function App() {
  const { initializeAuth } = useAuthStore()

  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route 
          path="/study/:deckId" 
          element={<AuthRoute><StudyPage /></AuthRoute>} 
        />
        <Route
          path="/enhanced-review/:deckId"
          element={<AuthRoute><EnhancedReviewRoute /></AuthRoute>}
        />
        <Route 
          path="/decks" 
          element={<AuthRoute><DecksPage /></AuthRoute>} 
        />
        <Route 
          path="/profile" 
          element={<AuthRoute><ProfilePage /></AuthRoute>} 
        />
        <Route 
          path="/challenges" 
          element={<AuthRoute><ChallengesPage /></AuthRoute>} 
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
          element={<AuthRoute><AnalyticsRoute /></AuthRoute>}
        />
        <Route
          path="/reset-password"
          element={<ResetPasswordPage />}
        />
        <Route
          path="/storage"
          element={<StoragePage />}
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