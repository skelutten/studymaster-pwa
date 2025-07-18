import { useState } from 'react'
import { useAuthStore } from '../../stores/authStore'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'login' | 'register'
  onModeChange: (mode: 'login' | 'register') => void
}

const AuthModal = ({ isOpen, onClose, mode, onModeChange }: AuthModalProps) => {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const { login, register, isLoading, error } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(email, username, password)
      }
      onClose()
      // Reset form
      setEmail('')
      setUsername('')
      setPassword('')
    } catch (error) {
      // Error is handled by the store
    }
  }

  const handleDemoLogin = async () => {
    try {
      // Use demo credentials that trigger the bypass logic
      await login('demo', '')
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
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </h3>
              
              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  {error}
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

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn btn-primary"
                >
                  {isLoading ? 'Loading...' : (mode === 'login' ? 'Sign In' : 'Create Account')}
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

              <div className="mt-4 text-sm">
                {mode === 'login' ? (
                  <span>
                    Don't have an account?{' '}
                    <button
                      onClick={() => onModeChange('register')}
                      className="text-blue-600 hover:text-blue-500"
                    >
                      Create one
                    </button>
                  </span>
                ) : (
                  <span>
                    Already have an account?{' '}
                    <button
                      onClick={() => onModeChange('login')}
                      className="text-blue-600 hover:text-blue-500"
                    >
                      Sign in
                    </button>
                  </span>
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