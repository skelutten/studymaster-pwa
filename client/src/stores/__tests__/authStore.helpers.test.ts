import { describe, it, expect, vi } from 'vitest'

// Since the helper functions are not exported, we'll test their behavior through the public API
// This tests the refactored method structure and error handling improvements

// Mock dependencies
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

vi.mock('../../utils/validation', () => ({
  validateForm: vi.fn(),
  validationSchemas: {
    signUp: {},
    signIn: {}
  },
  sanitizeInput: vi.fn((input: string) => input)
}))

import { useAuthStore } from '../authStore'
import { validateForm } from '../../utils/validation'

describe('Refactored Authentication Methods', () => {
  describe('Input Validation Helper Logic', () => {
    it('should validate signUp inputs properly', async () => {
      const mockValidateForm = vi.mocked(validateForm)
      
      // Mock validation failure
      mockValidateForm.mockReturnValue({
        email: { isValid: false, errors: ['Invalid email'] },
        password: { isValid: true, errors: [] },
        username: { isValid: true, errors: [] }
      })

      const store = useAuthStore.getState()
      
      await store.signUp('invalid-email', 'password', 'username')
      
      // Should handle validation errors - the error handler converts validation errors
      const state = useAuthStore.getState()
      expect(state.error).toBeTruthy()
      expect(state.error).toContain('email')
      expect(useAuthStore.getState().isLoading).toBe(false)
    })

    it('should validate signIn inputs properly', async () => {
      const mockValidateForm = vi.mocked(validateForm)
      
      // Mock validation failure
      mockValidateForm.mockReturnValue({
        email: { isValid: true, errors: [] },
        password: { isValid: false, errors: ['Password too short'] }
      })

      const store = useAuthStore.getState()
      
      await store.signIn('test@example.com', 'weak')
      
      // Should handle validation errors
      expect(useAuthStore.getState().error).toContain('password: Password too short')
      expect(useAuthStore.getState().isLoading).toBe(false)
    })
  })

  describe('Error Handling Improvements', () => {
    it('should handle signUp errors with descriptive messages', async () => {
      const mockValidateForm = vi.mocked(validateForm)
      mockValidateForm.mockReturnValue({
        email: { isValid: true, errors: [] },
        password: { isValid: true, errors: [] },
        username: { isValid: true, errors: [] }
      })

      // Mock PocketBase to throw username error
      const { pb } = await import('../../lib/pocketbase')
      const mockCollection = vi.mocked(pb.collection)
      mockCollection.mockReturnValue({
        create: vi.fn().mockRejectedValue(new Error('username already exists')),
        authWithPassword: vi.fn(),
        update: vi.fn()
      } as any)

      const store = useAuthStore.getState()
      await store.signUp('test@example.com', 'password', 'existinguser')

      const state = useAuthStore.getState()
      expect(state.error).toBe('Username already exists or is invalid')
      expect(state.isLoading).toBe(false)
    })

    it('should handle signIn errors with descriptive messages', async () => {
      const mockValidateForm = vi.mocked(validateForm)
      mockValidateForm.mockReturnValue({
        email: { isValid: true, errors: [] },
        password: { isValid: true, errors: [] }
      })

      // Mock PocketBase to throw authentication error
      const { pb } = await import('../../lib/pocketbase')
      const mockCollection = vi.mocked(pb.collection)
      mockCollection.mockReturnValue({
        authWithPassword: vi.fn().mockRejectedValue(new Error('Failed to authenticate')),
        create: vi.fn(),
        update: vi.fn()
      } as any)

      const store = useAuthStore.getState()
      await store.signIn('test@example.com', 'wrongpassword')

      const state = useAuthStore.getState()
      expect(state.error).toBe('Invalid email/username or password. Please check your credentials and try again.')
      expect(state.isLoading).toBe(false)
    })

    it('should handle rate limiting errors', async () => {
      const mockValidateForm = vi.mocked(validateForm)
      mockValidateForm.mockReturnValue({
        email: { isValid: true, errors: [] },
        password: { isValid: true, errors: [] }
      })

      // Mock PocketBase to throw rate limit error
      const { pb } = await import('../../lib/pocketbase')
      const mockCollection = vi.mocked(pb.collection)
      mockCollection.mockReturnValue({
        authWithPassword: vi.fn().mockRejectedValue(new Error('Too many requests')),
        create: vi.fn(),
        update: vi.fn()
      } as any)

      const store = useAuthStore.getState()
      await store.signIn('test@example.com', 'password')

      const state = useAuthStore.getState()
      expect(state.error).toBe('Too many login attempts. Please wait a moment and try again.')
      expect(state.isLoading).toBe(false)
    })
  })

  describe('Demo Login Logic', () => {
    it('should handle demo login in development', async () => {
      // Mock development environment
      vi.stubEnv('NODE_ENV', 'development')
      vi.stubEnv('VITE_DEMO_PASSWORD', 'demo123456')

      const store = useAuthStore.getState()
      await store.signIn('demo', 'demo123456')

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(true)
      expect(state.user?.email).toBe('demo@studymaster.app')
      expect(state.user?.username).toBe('DemoUser')
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })

    it('should not allow demo login in production', async () => {
      // Mock production environment
      vi.stubEnv('NODE_ENV', 'production')
      vi.stubEnv('VITE_ENABLE_DEBUG_LOGGING', 'false')
      vi.stubEnv('VITE_DEMO_PASSWORD', 'demo123456')

      const mockValidateForm = vi.mocked(validateForm)
      mockValidateForm.mockReturnValue({
        email: { isValid: true, errors: [] },
        password: { isValid: true, errors: [] }
      })

      // Mock PocketBase to reject authentication
      const { pb } = await import('../../lib/pocketbase')
      const mockCollection = vi.mocked(pb.collection)
      mockCollection.mockReturnValue({
        authWithPassword: vi.fn().mockRejectedValue(new Error('Authentication failed')),
        create: vi.fn(),
        update: vi.fn()
      } as any)

      const store = useAuthStore.getState()
      await store.signIn('demo', 'demo123456') // Use correct demo password but in production

      // Should proceed to normal authentication, not demo (because NODE_ENV is production)
      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(false) // Because mocked PB will fail
      expect(state.error).toBeTruthy() // Should have authentication error
    })
  })

  describe('Method Structure Improvements', () => {
    it('should have cleaner signUp method structure', () => {
      const store = useAuthStore.getState()
      const signUpMethod = store.signUp.toString()
      
      // Method should be significantly shorter after refactoring
      // Original was ~78 lines, refactored should be ~42 lines
      const lineCount = signUpMethod.split('\n').length
      expect(lineCount).toBeLessThan(60) // Allow some margin for formatting
    })

    it('should have cleaner signIn method structure', () => {
      const store = useAuthStore.getState()
      const signInMethod = store.signIn.toString()
      
      // Method should be significantly shorter after refactoring  
      // Original was ~122 lines, refactored should be ~52 lines
      const lineCount = signInMethod.split('\n').length
      expect(lineCount).toBeLessThan(80) // Allow some margin for formatting
    })
  })
})