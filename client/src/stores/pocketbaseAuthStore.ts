import { create } from 'zustand'
import { pb } from '../lib/pocketbase'
import type { User } from '../types'
import { debugLogger } from '../utils/debugLogger'
import { validateForm, validationSchemas, sanitizeInput } from '../utils/validation'

interface AuthState {
  user: User | null
  session: { record: Record<string, unknown>; token: string } | null // PocketBase auth record
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  
  // Actions
  signUp: (email: string, password: string, username: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
  updateProfile: (updates: Partial<User>) => Promise<void>
  clearError: () => void
  initializeAuth: () => Promise<void>
}

// Helper function to convert PocketBase user to our User type
const convertPocketbaseUser = async (pocketbaseUser: Record<string, unknown>): Promise<User> => {
  debugLogger.log('[POCKETBASE_AUTH_STORE]', 'START - convertPocketbaseUser', {
    userId: pocketbaseUser.id,
    email: pocketbaseUser.email,
    username: pocketbaseUser.username
  });

  try {
    const convertedUser = {
      id: pocketbaseUser.id,
      email: pocketbaseUser.email,
      username: pocketbaseUser.username || pocketbaseUser.email?.split('@')[0] || 'User',
      level: pocketbaseUser.level || 1,
      totalXp: pocketbaseUser.total_xp || 0,
      coins: pocketbaseUser.coins || 100,
      gems: pocketbaseUser.gems || 10,
      createdAt: pocketbaseUser.created || new Date().toISOString(),
      lastActive: pocketbaseUser.last_active || new Date().toISOString(),
      preferences: pocketbaseUser.preferences || {
        theme: 'system' as const,
        language: 'en',
        notifications: true,
        soundEffects: true,
        dailyGoal: 50,
        timezone: 'UTC'
      }
    };

    debugLogger.log('[POCKETBASE_AUTH_STORE]', 'END - convertPocketbaseUser', convertedUser);
    return convertedUser;
  } catch (error) {
    debugLogger.error('[POCKETBASE_AUTH_STORE]', 'Error in convertPocketbaseUser', {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      userId: pocketbaseUser.id
    });
    
    // Fallback: create a basic user object
    const fallbackUser = {
      id: pocketbaseUser.id,
      email: pocketbaseUser.email || 'unknown@example.com',
      username: pocketbaseUser.username || pocketbaseUser.email?.split('@')[0] || 'User',
      level: 1,
      totalXp: 0,
      coins: 100,
      gems: 10,
      createdAt: pocketbaseUser.created || new Date().toISOString(),
      lastActive: new Date().toISOString(),
      preferences: {
        theme: 'system' as const,
        language: 'en',
        notifications: true,
        soundEffects: true,
        dailyGoal: 50,
        timezone: 'UTC'
      }
    };

    debugLogger.log('[POCKETBASE_AUTH_STORE]', 'END - convertPocketbaseUser (fallback)', fallbackUser);
    return fallbackUser;
  }
}

export const usePocketbaseAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  signUp: async (email: string, password: string, username: string) => {
    debugLogger.log('[POCKETBASE_AUTH_STORE]', 'START - signUp', {
      email,
      username,
      passwordLength: password.length
    });

    set({ isLoading: true, error: null })
    
    try {
      // Validate inputs using comprehensive validation
      const validationResults = validateForm(
        { email, password, username },
        validationSchemas.signUp
      )
      
      // Check for validation errors
      const validationErrors = Object.entries(validationResults)
        .filter(([_, result]) => !result.isValid)
        .map(([field, result]) => `${field}: ${result.errors.join(', ')}`)
      
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join('; '))
      }
      
      // Sanitize inputs
      const sanitizedEmail = sanitizeInput(email)
      const sanitizedUsername = sanitizeInput(username)

      debugLogger.log('[POCKETBASE_AUTH_STORE]', 'Calling PocketBase create user', {
        email: sanitizedEmail,
        username: sanitizedUsername
      });

      // Create user in PocketBase with sanitized data
      const userData = {
        username: sanitizedUsername,
        email: sanitizedEmail,
        password,
        passwordConfirm: password,
        level: 1,
        total_xp: 0,
        coins: 100,
        gems: 10,
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

      const newUser = await pb.collection('users').create(userData)
      
      debugLogger.log('[POCKETBASE_AUTH_STORE]', 'User created successfully', {
        userId: newUser.id
      });

      // Now sign in the user with sanitized email
      const authData = await pb.collection('users').authWithPassword(sanitizedEmail, password)
      
      debugLogger.log('[POCKETBASE_AUTH_STORE]', 'SignUp with auth successful', {
        userId: authData.record.id,
        hasToken: !!authData.token
      });

      const user = await convertPocketbaseUser(authData.record)
      
      set({
        user,
        session: authData,
        isAuthenticated: true,
        isLoading: false,
        error: null
      })

    } catch (error) {
      debugLogger.error('[POCKETBASE_AUTH_STORE]', 'SignUp error', {
        error,
        stack: error instanceof Error ? error.stack : undefined
      });

      let errorMessage = 'Registration failed'
      if (error instanceof Error) {
        if (error.message.includes('username')) {
          errorMessage = 'Username already exists or is invalid'
        } else if (error.message.includes('email')) {
          errorMessage = 'Email already exists or is invalid'
        } else {
          errorMessage = error.message
        }
      }

      set({
        error: errorMessage,
        isLoading: false
      })
    }

    debugLogger.log('[POCKETBASE_AUTH_STORE]', 'END - signUp');
  },

  signIn: async (email: string, password: string) => {
    debugLogger.log('[POCKETBASE_AUTH_STORE]', 'START - signIn', {
      email,
      passwordLength: password.length,
      isDemoLogin: email === 'demo' || email === ''
    });

    set({ isLoading: true, error: null })
    
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      debugLogger.warn('[POCKETBASE_AUTH_STORE]', 'SignIn timeout reached');
      set({ 
        isLoading: false, 
        error: 'Login timed out. Please try again.' 
      })
    }, 10000) // 10 second timeout
    
    try {
      // Check for demo login (only available in development)
      const isDevelopment = import.meta.env.NODE_ENV === 'development' || import.meta.env.VITE_ENABLE_DEBUG_LOGGING === 'true'
      const demoPassword = import.meta.env.VITE_DEMO_PASSWORD || 'demo123456'
      
      if (isDevelopment && email === 'demo' && password === demoPassword) {
        debugLogger.info('[POCKETBASE_AUTH_STORE]', 'Demo login detected (development mode)');
        
        // Demo user - create temporary session (development only)
        const demoUser: User = {
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
        
        clearTimeout(timeoutId)
        
        debugLogger.log('[POCKETBASE_AUTH_STORE]', 'Setting demo user state');
        set({
          user: demoUser,
          session: null,
          isAuthenticated: true,
          isLoading: false,
          error: null
        })
        
        debugLogger.log('[POCKETBASE_AUTH_STORE]', 'END - signIn (demo user)');
        return
      }

      // Validate inputs for non-demo login
      const validationResults = validateForm(
        { email, password },
        validationSchemas.signIn
      )
      
      // Check for validation errors
      const validationErrors = Object.entries(validationResults)
        .filter(([_, result]) => !result.isValid)
        .map(([field, result]) => `${field}: ${result.errors.join(', ')}`)
      
      if (validationErrors.length > 0) {
        clearTimeout(timeoutId)
        throw new Error(validationErrors.join('; '))
      }
      
      // Sanitize email input
      const sanitizedEmail = sanitizeInput(email)

      debugLogger.log('[POCKETBASE_AUTH_STORE]', 'Attempting PocketBase authWithPassword');
      
      // Try email first, then username
      let authData
      try {
        authData = await pb.collection('users').authWithPassword(sanitizedEmail, password)
      } catch (emailError) {
        // If email login fails, try username
        debugLogger.log('[POCKETBASE_AUTH_STORE]', 'Email login failed, trying username');
        authData = await pb.collection('users').authWithPassword(sanitizedEmail, password)
      }

      debugLogger.log('[POCKETBASE_AUTH_STORE]', 'SignIn response', {
        hasRecord: !!authData.record,
        hasToken: !!authData.token,
        userId: authData.record?.id
      });

      if (authData.record && authData.token) {
        debugLogger.log('[POCKETBASE_AUTH_STORE]', 'SignIn successful, converting user profile');
        
        const user = await convertPocketbaseUser(authData.record)
        
        // Update last active time
        try {
          await pb.collection('users').update(authData.record.id, {
            last_active: new Date().toISOString()
          })
          debugLogger.log('[POCKETBASE_AUTH_STORE]', 'Updated last active time');
        } catch (updateError) {
          debugLogger.warn('[POCKETBASE_AUTH_STORE]', 'Could not update last active time', {
            error: updateError
          });
        }
        
        clearTimeout(timeoutId)
        
        debugLogger.log('[POCKETBASE_AUTH_STORE]', 'Setting authenticated state after signin');
        
        set({
          user,
          session: authData,
          isAuthenticated: true,
          isLoading: false,
          error: null
        })
        
        debugLogger.log('[POCKETBASE_AUTH_STORE]', 'END - signIn (success)');
      } else {
        debugLogger.warn('[POCKETBASE_AUTH_STORE]', 'No user or token in response');
        
        clearTimeout(timeoutId)
        set({
          error: 'Invalid login response - no user or token',
          isLoading: false
        })
      }
    } catch (error) {
      debugLogger.error('[POCKETBASE_AUTH_STORE]', 'SignIn error', {
        error,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      clearTimeout(timeoutId)
      
      let errorMessage = 'Login failed'
      if (error instanceof Error) {
        if (error.message.includes('Failed to authenticate')) {
          errorMessage = 'Invalid email/username or password. Please check your credentials and try again.'
        } else if (error.message.includes('Too many requests')) {
          errorMessage = 'Too many login attempts. Please wait a moment and try again.'
        } else {
          errorMessage = error.message
        }
      }
      
      set({
        error: errorMessage,
        isLoading: false
      })
    }

    debugLogger.log('[POCKETBASE_AUTH_STORE]', 'END - signIn');
  },

  signOut: async () => {
    debugLogger.log('[POCKETBASE_AUTH_STORE]', 'START - signOut');
    
    try {
      debugLogger.log('[POCKETBASE_AUTH_STORE]', 'Calling PocketBase authStore.clear');
      pb.authStore.clear()
      
      debugLogger.log('[POCKETBASE_AUTH_STORE]', 'Clearing auth state');
      set({ 
        user: null,
        session: null,
        isAuthenticated: false, 
        error: null 
      })
      
      debugLogger.log('[POCKETBASE_AUTH_STORE]', 'END - signOut (success)');
    } catch (error) {
      debugLogger.error('[POCKETBASE_AUTH_STORE]', 'SignOut error', {
        error,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      set({
        error: error instanceof Error ? error.message : 'Logout failed'
      })
    }
  },

  resetPassword: async (email: string) => {
    debugLogger.log('[POCKETBASE_AUTH_STORE]', 'START - resetPassword', { email });
    
    set({ isLoading: true, error: null })
    
    try {
      await pb.collection('users').requestPasswordReset(email)
      
      set({
        isLoading: false,
        error: null
      })
      
      debugLogger.log('[POCKETBASE_AUTH_STORE]', 'END - resetPassword (success)');
    } catch (error) {
      debugLogger.error('[POCKETBASE_AUTH_STORE]', 'Reset password error', {
        error,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      let errorMessage = 'Password reset failed'
      if (error instanceof Error) {
        if (error.message.includes('Invalid email')) {
          errorMessage = 'Please enter a valid email address.'
        } else if (error.message.includes('not found')) {
          errorMessage = 'No account found with this email address.'
        } else {
          errorMessage = error.message
        }
      }
      
      set({
        error: errorMessage,
        isLoading: false
      })
    }
  },

  updatePassword: async (newPassword: string) => {
    debugLogger.log('[POCKETBASE_AUTH_STORE]', 'START - updatePassword', {
      passwordLength: newPassword.length
    });
    
    const currentState = get();
    debugLogger.log('[POCKETBASE_AUTH_STORE]', 'Current auth state', {
      hasUser: !!currentState.user,
      hasSession: !!currentState.session,
      isAuthenticated: currentState.isAuthenticated
    });
    
    set({ isLoading: true, error: null });
    
    try {
      // Validate password
      if (!newPassword || newPassword.length < 6) {
        throw new Error("Password must be at least 6 characters long.");
      }

      if (!currentState.user?.id) {
        throw new Error('No authenticated user found');
      }

      debugLogger.log('[POCKETBASE_AUTH_STORE]', 'Calling pb.collection.update');

      await pb.collection('users').update(currentState.user.id, {
        password: newPassword,
        passwordConfirm: newPassword
      });

      debugLogger.log('[POCKETBASE_AUTH_STORE]', 'Password update successful');

      set({ isLoading: false, error: null });
      
      debugLogger.log('[POCKETBASE_AUTH_STORE]', 'END - updatePassword (success)');
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unknown error occurred during password update.";
      
      debugLogger.error('[POCKETBASE_AUTH_STORE]', 'UpdatePassword failed', {
        error: errorMessage,
        errorType: error?.constructor?.name,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      set({ isLoading: false, error: errorMessage });
      
      throw new Error(errorMessage);
    }
  },

  updateProfile: async (updates: Partial<User>) => {
    const { user } = get()
    
    debugLogger.log('[POCKETBASE_AUTH_STORE]', 'START - updateProfile', {
      userId: user?.id,
      updates: Object.keys(updates)
    });
    
    if (!user) {
      debugLogger.warn('[POCKETBASE_AUTH_STORE]', 'No user found for profile update');
      return
    }
    
    try {
      const updateData = {
        username: updates.username,
        level: updates.level,
        total_xp: updates.totalXp,
        coins: updates.coins,
        gems: updates.gems,
        preferences: updates.preferences,
        last_active: new Date().toISOString()
      };
      
      debugLogger.log('[POCKETBASE_AUTH_STORE]', 'Updating profile in database', updateData);
      
      await pb.collection('users').update(user.id, updateData)
      
      debugLogger.log('[POCKETBASE_AUTH_STORE]', 'Updating local user state');
      set({ user: { ...user, ...updates } })
      
      debugLogger.log('[POCKETBASE_AUTH_STORE]', 'END - updateProfile (success)');
    } catch (error) {
      debugLogger.error('[POCKETBASE_AUTH_STORE]', 'Profile update error', {
        error,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      set({
        error: error instanceof Error ? error.message : 'Profile update failed'
      })
    }
  },

  clearError: () => {
    debugLogger.log('[POCKETBASE_AUTH_STORE]', 'Clearing error state');
    set({ error: null })
  },

  initializeAuth: async () => {
    debugLogger.log('[POCKETBASE_AUTH_STORE]', 'START - initializeAuth');
    
    try {
      if (pb.authStore.isValid && pb.authStore.model) {
        debugLogger.log('[POCKETBASE_AUTH_STORE]', 'Valid auth store found, converting user', {
          userId: pb.authStore.model.id,
          email: pb.authStore.model.email
        });
        
        const user = await convertPocketbaseUser(pb.authStore.model)
        
        debugLogger.log('[POCKETBASE_AUTH_STORE]', 'Setting authenticated state from initialization');
        set({
          user,
          session: {
            record: pb.authStore.model,
            token: pb.authStore.token
          },
          isAuthenticated: true
        })
      } else {
        debugLogger.info('[POCKETBASE_AUTH_STORE]', 'No valid auth store found during initialization');
      }
      
      debugLogger.log('[POCKETBASE_AUTH_STORE]', 'END - initializeAuth');
    } catch (error) {
      debugLogger.error('[POCKETBASE_AUTH_STORE]', 'Auth initialization error', {
        error,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      set({ 
        user: null,
        session: null,
        isAuthenticated: false 
      })
    }
  }
}))

// Set up auth state change listener
pb.authStore.onChange((token, record) => {
  debugLogger.info('[POCKETBASE_AUTH_STORE]', 'Auth state change detected', {
    hasToken: !!token,
    hasRecord: !!record,
    userId: record?.id,
    timestamp: new Date().toISOString()
  });
  
  if (token && record) {
    debugLogger.log('[POCKETBASE_AUTH_STORE]', 'Processing auth state change - user logged in');
    
    convertPocketbaseUser(record).then(user => {
      debugLogger.log('[POCKETBASE_AUTH_STORE]', 'Updating auth store for logged in user');
      usePocketbaseAuthStore.setState({
        user,
        session: { record, token },
        isAuthenticated: true
      })
    }).catch(error => {
      debugLogger.error('[POCKETBASE_AUTH_STORE]', 'Failed to convert user during auth change', {
        error,
        userId: record.id
      });
    });
  } else {
    debugLogger.log('[POCKETBASE_AUTH_STORE]', 'Processing auth state change - user logged out');
    
    usePocketbaseAuthStore.setState({
      user: null,
      session: null,
      isAuthenticated: false
    })
  }
})