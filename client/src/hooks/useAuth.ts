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
  
  // PocketBase specific methods
  const signIn = useAuthStore((state) => state.signIn)
  const signUp = useAuthStore((state) => state.signUp)
  const signOut = useAuthStore((state) => state.signOut)
  const resetPassword = useAuthStore((state) => state.resetPassword)
  const updatePassword = useAuthStore((state) => state.updatePassword)
  const updateProfile = useAuthStore((state) => state.updateProfile)
  const initializeAuth = useAuthStore((state) => state.initializeAuth)

  // Enhanced user object with token for API requests
  const userWithToken = user && session ? {
    ...user,
    token: session.token
  } : null

  return {
    // State
    user: userWithToken, // Enhanced user object with token
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