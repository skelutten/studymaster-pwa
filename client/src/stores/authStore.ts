import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types'
import { usePocketbaseAuthStore } from './pocketbaseAuthStore'
import { debugLogger } from '../utils/debugLogger'

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
        debugLogger.log('[AUTH_STORE]', 'START - login (primary store)', {
          email,
          passwordLength: password.length
        });
        
        set({ isLoading: true, error: null })
        
        try {
          // Check for demo login
          if (email === 'demo' || email === '') {
            debugLogger.info('[AUTH_STORE]', 'Demo login detected in primary store');
            
            const mockUser = {
              id: 'demo-user',
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
            
            localStorage.setItem('authToken', 'demo-token')
            
            set({
              user: mockUser,
              isAuthenticated: true,
              isLoading: false,
              error: null
            })
            return
          }

          // Primary: Try PocketBase authentication
          try {
            debugLogger.log('[AUTH_STORE]', 'Attempting PocketBase authentication');
            
            const pocketbaseStore = usePocketbaseAuthStore.getState()
            await pocketbaseStore.signIn(email, password)
            
            // If successful, sync with primary store
            const pbState = usePocketbaseAuthStore.getState()
            if (pbState.isAuthenticated && pbState.user) {
              debugLogger.log('[AUTH_STORE]', 'PocketBase auth successful, syncing to primary store');
              
              set({
                user: pbState.user,
                isAuthenticated: true,
                isLoading: false,
                error: null
              })
              return
            } else if (pbState.error) {
              throw new Error(pbState.error)
            }
          } catch (pocketbaseError) {
            debugLogger.warn('[AUTH_STORE]', 'PocketBase authentication failed, trying fallback', {
              error: pocketbaseError
            });
            
            // Fallback: Try local storage authentication
            const existingUsers = JSON.parse(localStorage.getItem('registeredUsers') || '{}')
            const user = existingUsers[email.toLowerCase()]
            
            if (!user || user.password !== password) {
              throw new Error('Invalid email or password')
            }
            
            debugLogger.log('[AUTH_STORE]', 'Local storage authentication successful');
            
            // Update last active time
            user.lastActive = new Date().toISOString()
            existingUsers[email.toLowerCase()] = user
            localStorage.setItem('registeredUsers', JSON.stringify(existingUsers))
            
            // Generate token
            const token = 'local-token-' + user.id
            localStorage.setItem('authToken', token)
            
            // Remove password from user object before storing in state
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { password: _, ...userWithoutPassword } = user
            
            set({
              user: userWithoutPassword,
              isAuthenticated: true,
              isLoading: false,  
              error: null
            })
          }
        } catch (error) {
          debugLogger.error('[AUTH_STORE]', 'All authentication methods failed', {
            error,
            stack: error instanceof Error ? error.stack : undefined
          });
          
          set({
            error: error instanceof Error ? error.message : 'Login failed',
            isLoading: false
          })
        }
        
        debugLogger.log('[AUTH_STORE]', 'END - login');
      },

      register: async (email: string, username: string, password: string) => {
        debugLogger.log('[AUTH_STORE]', 'START - register (primary store)', {
          email,
          username,
          passwordLength: password.length
        });
        
        set({ isLoading: true, error: null })
        
        try {
          // Validate inputs
          if (!email || !password || !username) {
            throw new Error('Email, username and password are required')
          }
          
          if (password.length < 6) {
            throw new Error('Password must be at least 6 characters long')
          }
          
          // Primary: Try PocketBase registration
          try {
            debugLogger.log('[AUTH_STORE]', 'Attempting PocketBase registration');
            
            const pocketbaseStore = usePocketbaseAuthStore.getState()
            await pocketbaseStore.signUp(email, password, username)
            
            // If successful, sync with primary store
            const pbState = usePocketbaseAuthStore.getState()
            if (pbState.isAuthenticated && pbState.user) {
              debugLogger.log('[AUTH_STORE]', 'PocketBase registration successful, syncing to primary store');
              
              set({
                user: pbState.user,
                isAuthenticated: true,
                isLoading: false,
                error: null
              })
              return
            } else if (pbState.error) {
              throw new Error(pbState.error)
            }
          } catch (pocketbaseError) {
            debugLogger.warn('[AUTH_STORE]', 'PocketBase registration failed, trying fallback', {
              error: pocketbaseError
            });
            
            // Fallback: Try local storage registration
            const existingUsers = JSON.parse(localStorage.getItem('registeredUsers') || '{}')
            
            // Check if user already exists
            if (existingUsers[email.toLowerCase()]) {
              throw new Error('User with this email already exists')
            }
            
            debugLogger.log('[AUTH_STORE]', 'Creating user in local storage');
            
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
          }
        } catch (error) {
          debugLogger.error('[AUTH_STORE]', 'All registration methods failed', {
            error,
            stack: error instanceof Error ? error.stack : undefined
          });
          
          set({
            error: error instanceof Error ? error.message : 'Registration failed',
            isLoading: false
          })
        }
        
        debugLogger.log('[AUTH_STORE]', 'END - register');
      },

      logout: () => {
        debugLogger.log('[AUTH_STORE]', 'START - logout (primary store)');
        
        // Try PocketBase logout
        try {
          const pocketbaseStore = usePocketbaseAuthStore.getState()
          pocketbaseStore.signOut()
          debugLogger.log('[AUTH_STORE]', 'PocketBase logout successful');
        } catch (error) {
          debugLogger.warn('[AUTH_STORE]', 'PocketBase logout failed', { error });
        }
        
        // Always clear local storage and state
        localStorage.removeItem('authToken')
        set({ 
          user: null, 
          isAuthenticated: false, 
          error: null 
        })
        
        debugLogger.log('[AUTH_STORE]', 'END - logout');
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

      initializeAuth: async () => {
        debugLogger.log('[AUTH_STORE]', 'START - initializeAuth (primary store)');
        
        const token = localStorage.getItem('authToken')
        const { user, isAuthenticated } = get()
        
        // If we already have a user from persist, don't override
        if (user && isAuthenticated) {
          debugLogger.log('[AUTH_STORE]', 'User already authenticated from persist storage');
          return
        }
        
        // Primary: Try PocketBase initialization
        try {
          debugLogger.log('[AUTH_STORE]', 'Attempting PocketBase auth initialization');
          
          const pocketbaseStore = usePocketbaseAuthStore.getState()
          await pocketbaseStore.initializeAuth()
          
          const pbState = usePocketbaseAuthStore.getState()
          if (pbState.isAuthenticated && pbState.user) {
            debugLogger.log('[AUTH_STORE]', 'PocketBase auth initialized, syncing to primary store');
            
            set({
              user: pbState.user,
              isAuthenticated: true
            })
            return
          }
        } catch (error) {
          debugLogger.warn('[AUTH_STORE]', 'PocketBase initialization failed, trying fallback', {
            error
          });
        }
        
        // Fallback: Check local storage tokens
        if (token) {
          debugLogger.log('[AUTH_STORE]', 'Checking local storage token', {
            tokenType: token.split('-')[0],
            hasToken: !!token
          });
          
          // Check if it's a demo token
          if (token === 'demo-token') {
            debugLogger.log('[AUTH_STORE]', 'Demo token found, setting demo user');
            
            set({
              isAuthenticated: true,
              user: {
                id: 'demo-user',
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
              debugLogger.warn('[AUTH_STORE]', 'Local token found but no user data, clearing token');
              localStorage.removeItem('authToken')
              set({ isAuthenticated: false, user: null })
            } else {
              debugLogger.log('[AUTH_STORE]', 'Local token and user data found, maintaining auth state');
            }
          } else {
            // Clear unknown tokens
            debugLogger.warn('[AUTH_STORE]', 'Unknown token found, clearing');
            localStorage.removeItem('authToken')
            set({ isAuthenticated: false, user: null })
          }
        } else {
          debugLogger.log('[AUTH_STORE]', 'No token found, user not authenticated');
        }
        
        debugLogger.log('[AUTH_STORE]', 'END - initializeAuth');
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