import { useState, useEffect } from 'react'
import { useAuthStore } from '../../stores/authStore'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'login' | 'register' | 'forgot-password'
  onModeChange: (mode: 'login' | 'register' | 'forgot-password') => void
}

const AuthModal = ({ isOpen, onClose, mode, onModeChange }: AuthModalProps) => {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const { login, register, isLoading, error, clearError, isAuthenticated } = useAuthStore()
  const [resetEmailSent, setResetEmailSent] = useState(false)

  // Clear errors when modal opens or mode changes
  useEffect(() => {
    if (isOpen) {
      clearError()
    }
  }, [isOpen, clearError])

  useEffect(() => {
    clearError()
  }, [mode, clearError])

  const handleModeChange = (newMode: 'login' | 'register' | 'forgot-password') => {
    clearError()
    setResetEmailSent(false)
    onModeChange(newMode)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (mode === 'login') {
      await login(email, password)
    } else if (mode === 'register') {
      await register(email, username, password)
    } else if (mode === 'forgot-password') {
      // For now, show a message that password reset is not implemented
      alert('Password reset functionality will be implemented soon. Please use demo login or register a new account.')
      setResetEmailSent(true)
    }
  }

  // Close modal when successfully authenticated
  useEffect(() => {
    console.log('[AUTH_MODAL]', 'Auth state changed:', {
      isAuthenticated,
      isOpen,
      timestamp: new Date().toISOString()
    })
    
    if (isAuthenticated && isOpen) {
      console.log('[AUTH_MODAL]', 'Closing modal due to successful authentication')
      onClose()
      // Reset form
      setEmail('')
      setUsername('')
      setPassword('')
    }
  }, [isAuthenticated, isOpen, onClose])

  const handleDemoLogin = async () => {
    try {
      // Use demo credentials that trigger the bypass logic
      await signIn('demo', '')
      onClose()
    } catch (error) {
      // Error is handled by the store
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="text-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                {mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Reset Password'}
              </h3>
              
              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  {error}
                </div>
              )}

              {resetEmailSent && mode === 'forgot-password' && (
                <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                  Password reset email sent! Check your inbox and follow the instructions to reset your password.
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  />
                </div>
                
                {mode === 'register' && (
                  <div>
                    <input
                      type="text"
                      placeholder="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    />
                  </div>
                )}
                
                {mode !== 'forgot-password' && (
                  <div>
                    <input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn btn-primary"
                >
                  {isLoading ? 'Loading...' : 
                   mode === 'login' ? 'Sign In' : 
                   mode === 'register' ? 'Create Account' : 
                   'Send Reset Email'}
                </button>
              </form>

              <div className="mt-4">
                <button
                  onClick={handleDemoLogin}
                  className="w-full btn btn-secondary"
                  disabled={isLoading}
                >
                  Demo Login
                </button>
              </div>

              <div className="mt-4 text-sm space-y-2">
                {mode === 'login' ? (
                  <>
                    <div>
                      Don't have an account?{' '}
                      <button
                        onClick={() => handleModeChange('register')}
                        className="text-blue-600 hover:text-blue-500"
                      >
                        Create one
                      </button>
                    </div>
                    <div>
                      Forgot your password?{' '}
                      <button
                        onClick={() => handleModeChange('forgot-password')}
                        className="text-blue-600 hover:text-blue-500"
                      >
                        Reset it
                      </button>
                    </div>
                  </>
                ) : mode === 'register' ? (
                  <div>
                    Already have an account?{' '}
                    <button
                      onClick={() => handleModeChange('login')}
                      className="text-blue-600 hover:text-blue-500"
                    >
                      Sign in
                    </button>
                  </div>
                ) : (
                  <div>
                    Remember your password?{' '}
                    <button
                      onClick={() => handleModeChange('login')}
                      className="text-blue-600 hover:text-blue-500"
                    >
                      Back to login
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthModal