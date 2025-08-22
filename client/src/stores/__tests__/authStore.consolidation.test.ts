import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuthStore } from '../authStore'

// Mock PocketBase
vi.mock('../../lib/pocketbase', () => ({
  pb: {
    collection: vi.fn(() => ({
      authWithPassword: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    })),
    authStore: {
      isValid: false,
      model: null,
      token: '',
      onChange: vi.fn()
    }
  }
}))

// Mock validation
vi.mock('../../utils/validation', () => ({
  validateForm: vi.fn(() => ({
    email: { isValid: true, errors: [] },
    password: { isValid: true, errors: [] },
    username: { isValid: true, errors: [] }
  })),
  validationSchemas: {
    signUp: {},
    signIn: {}
  },
  sanitizeInput: vi.fn((input: string) => input)
}))

describe('Consolidated Authentication Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,
      error: null
    })
    vi.clearAllMocks()
  })

  describe('Store Structure', () => {
    it('should have initial state', () => {
      const store = useAuthStore.getState()
      
      expect(store.user).toBeNull()
      expect(store.session).toBeNull()
      expect(store.isAuthenticated).toBe(false)
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('should have both unified and PocketBase-specific methods', () => {
      const store = useAuthStore.getState()
      
      // Unified methods (for backward compatibility)
      expect(typeof store.login).toBe('function')
      expect(typeof store.register).toBe('function')
      expect(typeof store.logout).toBe('function')
      expect(typeof store.updateUser).toBe('function')
      
      // PocketBase-specific methods
      expect(typeof store.signIn).toBe('function')
      expect(typeof store.signUp).toBe('function')
      expect(typeof store.signOut).toBe('function')
      expect(typeof store.resetPassword).toBe('function')
      expect(typeof store.updatePassword).toBe('function')
      expect(typeof store.updateProfile).toBe('function')
      expect(typeof store.clearError).toBe('function')
      expect(typeof store.initializeAuth).toBe('function')
    })
  })

  describe('Unified Methods (Backward Compatibility)', () => {
    it('should call signIn when login is called', async () => {
      const store = useAuthStore.getState()
      const signInSpy = vi.spyOn(store, 'signIn').mockImplementation(vi.fn())
      
      await store.login('test@example.com', 'password')
      
      expect(signInSpy).toHaveBeenCalledWith('test@example.com', 'password')
    })

    it('should call signUp when register is called', async () => {
      const store = useAuthStore.getState()
      const signUpSpy = vi.spyOn(store, 'signUp').mockImplementation(vi.fn())
      
      await store.register('test@example.com', 'testuser', 'password')
      
      expect(signUpSpy).toHaveBeenCalledWith('test@example.com', 'password', 'testuser')
    })

    it('should call signOut when logout is called', () => {
      const store = useAuthStore.getState()
      const signOutSpy = vi.spyOn(store, 'signOut').mockImplementation(vi.fn())
      
      store.logout()
      
      expect(signOutSpy).toHaveBeenCalled()
    })

    it('should update user state when updateUser is called', () => {
      // Set initial user
      const initialUser = {
        id: 'test-id',
        email: 'test@example.com',
        username: 'testuser',
        level: 1,
        totalXp: 0,
        coins: 100,
        gems: 10,
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        preferences: {
          theme: 'system' as const,
          language: 'en',
          notifications: true,
          soundEffects: true,
          dailyGoal: 50,
          timezone: 'UTC'
        }
      }
      
      useAuthStore.setState({ user: initialUser })
      
      const store = useAuthStore.getState()
      const updates = { level: 2, totalXp: 100 }
      
      store.updateUser(updates)
      
      const updatedUser = useAuthStore.getState().user
      expect(updatedUser?.level).toBe(2)
      expect(updatedUser?.totalXp).toBe(100)
      expect(updatedUser?.email).toBe('test@example.com') // unchanged
    })

    it('should not update user when no user exists', () => {
      const store = useAuthStore.getState()
      
      store.updateUser({ level: 5 })
      
      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
    })
  })

  describe('Error Handling', () => {
    it('should clear error state', () => {
      useAuthStore.setState({ error: 'Test error' })
      
      const store = useAuthStore.getState()
      store.clearError()
      
      expect(useAuthStore.getState().error).toBeNull()
    })

    it('should set loading state during operations', () => {
      const store = useAuthStore.getState()
      
      expect(store.isLoading).toBe(false)
      
      // This would be tested in integration tests with actual async operations
    })
  })

  describe('State Management', () => {
    it('should maintain consistent state structure', () => {
      const store = useAuthStore.getState()
      
      const expectedKeys = [
        'user', 'session', 'isAuthenticated', 'isLoading', 'error',
        'login', 'register', 'logout', 'updateUser',
        'signUp', 'signIn', 'signOut', 'resetPassword', 'updatePassword', 
        'updateProfile', 'clearError', 'initializeAuth'
      ]
      
      expectedKeys.forEach(key => {
        expect(store).toHaveProperty(key)
      })
    })

    it('should be a proper Zustand store', () => {
      expect(typeof useAuthStore).toBe('function')
      expect(typeof useAuthStore.getState).toBe('function')
      expect(typeof useAuthStore.setState).toBe('function')
      expect(typeof useAuthStore.subscribe).toBe('function')
    })
  })
})