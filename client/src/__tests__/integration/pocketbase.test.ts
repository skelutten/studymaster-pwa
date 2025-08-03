// PocketBase Integration Tests
import { describe, it, expect, vi } from 'vitest'
import { pb } from '../../lib/pocketbase'
import { usePocketbaseAuthStore } from '../../stores/pocketbaseAuthStore'

describe('PocketBase Integration', () => {
  it('should have PocketBase client configured correctly', () => {
    expect(pb).toBeDefined()
    expect(pb.baseUrl).toContain('8090')
  })

  it('should have PocketBase auth store configured', () => {
    const store = usePocketbaseAuthStore.getState()
    expect(store).toBeDefined()
    expect(store.signIn).toBeDefined()
    expect(store.signUp).toBeDefined()
    expect(store.signOut).toBeDefined()
    expect(store.initializeAuth).toBeDefined()
  })

  it('should handle demo user authentication', async () => {
    const store = usePocketbaseAuthStore.getState()
    
    // Test demo login
    await store.signIn('demo', 'any-password')
    
    const state = usePocketbaseAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.user).toBeDefined()
    expect(state.user?.email).toBe('demo@studymaster.app')
    expect(state.user?.username).toBe('DemoUser')
  })

  it('should handle PocketBase connection errors gracefully', async () => {
    // Mock PocketBase to throw an error
    const originalCollection = pb.collection
    pb.collection = vi.fn(() => ({
      authWithPassword: vi.fn().mockRejectedValue(new Error('Connection failed'))
    })) as unknown

    const store = usePocketbaseAuthStore.getState()
    
    try {
      await store.signIn('test@example.com', 'password')
      
      const state = usePocketbaseAuthStore.getState()
      // Should handle error gracefully
      expect(state.error).toBeDefined()
      expect(state.isAuthenticated).toBe(false)
    } finally {
      // Restore original function
      pb.collection = originalCollection
    }
  })

  it('should clear auth state on sign out', async () => {
    const store = usePocketbaseAuthStore.getState()
    
    // First sign in as demo user
    await store.signIn('demo', 'any-password')
    expect(usePocketbaseAuthStore.getState().isAuthenticated).toBe(true)
    
    // Then sign out
    await store.signOut()
    const state = usePocketbaseAuthStore.getState()
    
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
    expect(state.session).toBeNull()
  })

  it('should initialize auth store properly', async () => {
    const store = usePocketbaseAuthStore.getState()
    
    // Test initialization
    await store.initializeAuth()
    
    // Should not crash and should maintain proper state
    const state = usePocketbaseAuthStore.getState()
    expect(state.isLoading).toBe(false)
  })
})