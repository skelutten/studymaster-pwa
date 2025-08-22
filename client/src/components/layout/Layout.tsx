import { Outlet } from 'react-router-dom'
import { useState } from 'react'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import { useAuthStore } from '../../stores/authStore'
import AuthModal from './AuthModal'

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot-password'>('login')
  const { isAuthenticated, user } = useAuthStore()
  
  // Debug authentication state
  console.log('[LAYOUT]', 'Layout render - Auth state:', {
    isAuthenticated,
    hasUser: !!user,
    userId: user?.id,
    timestamp: new Date().toISOString()
  })

  const handleSignIn = () => {
    setAuthMode('login')
    setAuthModalOpen(true)
  }

  const handleCreateAccount = () => {
    setAuthMode('register')
    setAuthModalOpen(true)
  }

  if (!isAuthenticated) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="max-w-md w-full space-y-8 p-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gradient mb-4">StudyMaster</h1>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                Master your learning with spaced repetition and gamification
              </p>
              <div className="space-y-4">
                <button
                  onClick={handleSignIn}
                  className="btn btn-primary btn-lg w-full"
                >
                  Sign In
                </button>
                <button
                  onClick={handleCreateAccount}
                  className="btn btn-secondary btn-lg w-full"
                >
                  Create Account
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          mode={authMode}
          onModeChange={setAuthMode}
        />
      </>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top navbar */}
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        
        {/* Page content */}
        <main className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default Layout