import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types'

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

          // Try API call first, fallback to local storage
          try {
            const response = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password })
            })
            
            if (response.ok) {
              const data = await response.json()
              
              if (data.success && data.user && data.token) {
                localStorage.setItem('authToken', data.token)
                
                set({
                  user: data.user,
                  isAuthenticated: true,
                  isLoading: false,
                  error: null
                })
                return
              }
            }
          } catch (apiError) {
            // API failed, fallback to local storage
          }
          
          // Fallback to local storage authentication
          const existingUsers = JSON.parse(localStorage.getItem('registeredUsers') || '{}')
          const user = existingUsers[email.toLowerCase()]
          
          if (!user || user.password !== password) {
            throw new Error('Invalid email or password')
          }
          
          // Update last active time
          user.lastActive = new Date().toISOString()
          existingUsers[email.toLowerCase()] = user
          localStorage.setItem('registeredUsers', JSON.stringify(existingUsers))
          
          // Generate token
          const token = 'local-token-' + user.id
          localStorage.setItem('authToken', token)
          
          // Remove password from user object before storing in state
          const { ...userWithoutPassword } = user
          
          set({
            user: userWithoutPassword,
            isAuthenticated: true,
            isLoading: false,
            error: null
          })
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
          // Validate inputs
          if (!email || !password || !username) {
            throw new Error('Email, username and password are required')
          }
          
          if (password.length < 4) {
            throw new Error('Password must be at least 4 characters long')
          }
          
          // Get existing users from localStorage
          const existingUsers = JSON.parse(localStorage.getItem('registeredUsers') || '{}')
          
          // Check if user already exists
          if (existingUsers[email.toLowerCase()]) {
            throw new Error('User with this email already exists')
          }
          
          // Create new user
          const newUser = {
            id: Date.now().toString(),
            email: email.toLowerCase(),
            username,
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
          
          // Store user credentials and data
          existingUsers[email.toLowerCase()] = {
            ...newUser,
            password // In a real app, this would be hashed
          }
          localStorage.setItem('registeredUsers', JSON.stringify(existingUsers))
          
          // Generate token
          const token = 'local-token-' + newUser.id
          localStorage.setItem('authToken', token)
          
          set({
            user: newUser,
            isAuthenticated: true,
            isLoading: false,
            error: null
          })
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
          // Check if it's a demo token
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
          } else if (token.startsWith('local-token-') || token.startsWith('mock-token-')) {
            // For local or mock tokens, we should have the user data in persist storage
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