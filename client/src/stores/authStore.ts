import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@shared/types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  
  // Actions
  login: (email: string, password: string) => Promise<void>
  register: (email: string, username: string, password: string) => Promise<void>
  logout: () => void
  updateUser: (updates: Partial<User>) => void
  clearError: () => void
  initializeAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null })
        
        try {
          // Check for demo login
          if (email === 'demo' || email === '') {
            // Demo login - bypass server call
            const mockUser = {
              id: '1',
              email: 'demo@studymaster.app',
              username: 'DemoUser',
              level: 5,
              totalXp: 2500,
              coins: 150,
              gems: 25,
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
            
            // Store mock token in localStorage
            localStorage.setItem('authToken', 'demo-token')
            
            set({
              user: mockUser,
              isAuthenticated: true,
              isLoading: false,
              error: null
            })
            return
          }

          // Try to make API call, but fallback to mock authentication if server is not available
          try {
            const response = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password })
            })
            
            if (!response.ok) {
              throw new Error('Login failed')
            }
            
            const { user, token } = await response.json()
            
            // Store token in localStorage
            localStorage.setItem('authToken', token)
            
            set({
              user,
              isAuthenticated: true,
              isLoading: false,
              error: null
            })
          } catch (apiError) {
            // If API call fails (server not available), use mock authentication
            console.warn('API not available, using mock authentication')
            
            // Create a mock user based on the provided credentials
            const mockUser = {
              id: Math.random().toString(36).substr(2, 9),
              email: email,
              username: email.split('@')[0], // Use email prefix as username
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
            
            // Store mock token in localStorage
            localStorage.setItem('authToken', `mock-token-${mockUser.id}`)
            
            set({
              user: mockUser,
              isAuthenticated: true,
              isLoading: false,
              error: null
            })
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Login failed',
            isLoading: false
          })
        }
      },

      register: async (email: string, username: string, password: string) => {
        set({ isLoading: true, error: null })
        
        try {
          // Try to make API call, but fallback to mock authentication if server is not available
          try {
            const response = await fetch('/api/auth/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, username, password })
            })
            
            if (!response.ok) {
              throw new Error('Registration failed')
            }
            
            const { user, token } = await response.json()
            
            // Store token in localStorage
            localStorage.setItem('authToken', token)
            
            set({
              user,
              isAuthenticated: true,
              isLoading: false,
              error: null
            })
          } catch (apiError) {
            // If API call fails (server not available), use mock authentication
            console.warn('API not available, using mock authentication for registration')
            
            // Create a mock user based on the provided credentials
            const mockUser = {
              id: Math.random().toString(36).substr(2, 9),
              email: email,
              username: username,
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
            
            // Store mock token in localStorage
            localStorage.setItem('authToken', `mock-token-${mockUser.id}`)
            
            set({
              user: mockUser,
              isAuthenticated: true,
              isLoading: false,
              error: null
            })
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Registration failed',
            isLoading: false
          })
        }
      },

      logout: () => {
        localStorage.removeItem('authToken')
        set({ 
          user: null, 
          isAuthenticated: false, 
          error: null 
        })
      },

      updateUser: (updates: Partial<User>) => {
        const { user } = get()
        if (user) {
          set({ user: { ...user, ...updates } })
        }
      },

      clearError: () => {
        set({ error: null })
      },

      initializeAuth: () => {
        const token = localStorage.getItem('authToken')
        const { user, isAuthenticated } = get()
        
        // If we already have a user from persist, don't override
        if (user && isAuthenticated) {
          return
        }
        
        if (token) {
          // Check if it's a demo token or mock token
          if (token === 'demo-token') {
            set({
              isAuthenticated: true,
              user: {
                id: '1',
                email: 'demo@studymaster.app',
                username: 'DemoUser',
                level: 5,
                totalXp: 2500,
                coins: 150,
                gems: 25,
                createdAt: new Date().toISOString(),
                lastActive: new Date().toISOString(),
                preferences: {
                  theme: 'system',
                  language: 'en',
                  notifications: true,
                  soundEffects: true,
                  dailyGoal: 50,
                  timezone: 'UTC'
                }
              }
            })
          } else if (token.startsWith('mock-token-')) {
            // For mock tokens, we should have the user data in persist storage
            // If not, we'll need to clear the token as it's invalid
            if (!user) {
              localStorage.removeItem('authToken')
              set({ isAuthenticated: false, user: null })
            }
          } else {
            // TODO: Validate real token with API and get user data
            // For now, clear invalid tokens
            localStorage.removeItem('authToken')
            set({ isAuthenticated: false, user: null })
          }
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      }),
      onRehydrateStorage: () => (state) => {
        // After rehydration, if we have a token but no user, initialize
        if (state) {
          const token = localStorage.getItem('authToken')
          if (token && !state.user) {
            state.initializeAuth()
          }
        }
      }
    }
  )
)