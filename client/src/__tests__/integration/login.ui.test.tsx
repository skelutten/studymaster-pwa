// Login Integration Test
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuthStore } from '../../stores/authStore'

// Mock the environment variables for demo login
const mockEnv = {
  NODE_ENV: 'development',
  VITE_ENABLE_DEBUG_LOGGING: 'true',
  VITE_DEMO_PASSWORD: 'demo123456'
}

Object.defineProperty(import.meta, 'env', {
  value: mockEnv,
  writable: false,
  configurable: true
})

// Mock PocketBase
vi.mock('../../lib/pocketbase', () => ({
  pb: {
    collection: vi.fn(() => ({
      authWithPassword: vi.fn(),
      update: vi.fn(),
      requestPasswordReset: vi.fn()
    })),
    authStore: {
      clear: vi.fn(),
      onChange: vi.fn()
    }
  }
}))

describe('Login Integration', () => {
  beforeEach(() => {
    // Reset auth store before each test
    const store = useAuthStore.getState()
    store.signOut()
    store.clearError()
  })

  it('should successfully authenticate demo user', async () => {
    const store = useAuthStore.getState()
    
    // Test demo login
    await store.signIn('demo', 'demo123456')
    
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.user).toBeDefined()
    expect(state.user?.email).toBe('demo@studymaster.app')
    expect(state.user?.username).toBe('DemoUser')
    expect(state.user?.level).toBe(5)
    expect(state.user?.totalXp).toBe(2500)
    expect(state.user?.coins).toBe(150)
    expect(state.user?.gems).toBe(25)
    expect(state.error).toBeNull()
  })

  it('should successfully authenticate gurka user with mocked PocketBase', async () => {
    const { pb } = await import('../../lib/pocketbase')
    
    // Mock PocketBase response for gurka user
    const mockPbResponse = {
      token: 'mock-token-gurka',
      record: {
        id: 'gurka-user-id',
        email: 'gurka@studymaster.app',
        username: 'gurka',
        level: 5,
        total_xp: 2500,
        coins: 150,
        gems: 25,
        created: new Date().toISOString(),
        last_active: new Date().toISOString(),
        preferences: {
          theme: 'system',
          language: 'en',
          notifications: true,
          soundEffects: true,
          dailyGoal: 50,
          timezone: 'UTC'
        }
      }
    }

    // Mock the authWithPassword method
    const mockAuthWithPassword = vi.fn().mockResolvedValue(mockPbResponse)
    const mockCollection = vi.fn(() => ({
      authWithPassword: mockAuthWithPassword,
      update: vi.fn(),
      requestPasswordReset: vi.fn()
    }))
    pb.collection = mockCollection

    const store = useAuthStore.getState()
    
    // Test gurka login (password must be at least 6 characters)
    await store.signIn('gurka', 'gurka123')
    
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.user).toBeDefined()
    expect(state.user?.email).toBe('gurka@studymaster.app')
    expect(state.user?.username).toBe('gurka')
    expect(state.user?.level).toBe(5)
    expect(state.error).toBeNull()

    // Verify the correct API call was made
    expect(mockAuthWithPassword).toHaveBeenCalledWith('gurka', 'gurka123')
  })

  it('should handle login errors gracefully', async () => {
    const { pb } = await import('../../lib/pocketbase')
    
    // Mock PocketBase to throw an error
    const mockAuthWithPassword = vi.fn().mockRejectedValue(new Error('Invalid credentials'))
    const mockCollection = vi.fn(() => ({
      authWithPassword: mockAuthWithPassword,
      update: vi.fn(),
      requestPasswordReset: vi.fn()
    }))
    pb.collection = mockCollection

    const store = useAuthStore.getState()
    
    // Test failed login
    await store.signIn('invalid@example.com', 'wrongpassword')
    
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
    expect(state.error).toBeTruthy()
  })

  it('should clear auth state on sign out', async () => {
    const store = useAuthStore.getState()
    
    // First sign in as demo user
    await store.signIn('demo', 'demo123456')
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
    
    // Then sign out
    await store.signOut()
    const state = useAuthStore.getState()
    
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
    expect(state.session).toBeNull()
  })

  it('should initialize auth store properly', async () => {
    const store = useAuthStore.getState()
    
    // Test initialization
    await store.initializeAuth()
    
    // Should not crash and should maintain proper state
    const state = useAuthStore.getState()
    expect(state.isLoading).toBe(false)
  })
})