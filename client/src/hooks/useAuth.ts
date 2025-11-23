import { useAuthStore } from '../stores/authStore'

/**
 * Hook to access authentication state and methods
 * Provides a convenient interface to the auth store
 */
export const useAuth = () => {
  const user = useAuthStore((state) => state.user)
  const session = useAuthStore((state) => state.session)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isLoading = useAuthStore((state) => state.isLoading)
  const error = useAuthStore((state) => state.error)
  
  const login = useAuthStore((state) => state.login)
  const register = useAuthStore((state) => state.register)
  const logout = useAuthStore((state) => state.logout)
  const updateUser = useAuthStore((state) => state.updateUser)
  const clearError = useAuthStore((state) => state.clearError)
  
  // Local + Online Link helpers
  const connectOnline = useAuthStore((state) => state.connectOnline)
  const disconnectOnline = useAuthStore((state) => state.disconnectOnline)
  const isOnlineLinked = useAuthStore((state) => state.isOnlineLinked)

  // PocketBase specific methods
  const signIn = useAuthStore((state) => state.signIn)
  const signUp = useAuthStore((state) => state.signUp)
  const signOut = useAuthStore((state) => state.signOut)
  const resetPassword = useAuthStore((state) => state.resetPassword)
  const updatePassword = useAuthStore((state) => state.updatePassword)
  const updateProfile = useAuthStore((state) => state.updateProfile)
  const initializeAuth = useAuthStore((state) => state.initializeAuth)

  // Enhanced user object with token for API requests when available (do NOT nullify local user)
  const userWithOptionalToken = user
    ? (session ? { ...user, token: session.token } : user)
    : null

  return {
    // State
    user: userWithOptionalToken, // Keep local user; add token only when session exists
    session,
    isAuthenticated,
    isLoading,
    error,
    
    // Unified methods (backward compatibility)
    login,
    register,
    logout,
    updateUser,
    clearError,

    // Local + Online Link helpers
    connectOnline,
    disconnectOnline,
    isOnlineLinked,
    
    // PocketBase specific methods
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    initializeAuth
  }
}

export default useAuth