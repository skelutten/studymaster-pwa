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
  
  // Primary Actions (unified interface for components)
  login: (email: string, password: string) => Promise<void>
  register: (email: string, username: string, password: string) => Promise<void>
  logout: () => void
  updateUser: (updates: Partial<User>) => void
  
  // PocketBase-specific Actions
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

// Helper functions for authentication operations
const validateSignUpInputs = (email: string, password: string, username: string) => {
  const validationResults = validateForm(
    { email, password, username },
    validationSchemas.signUp
  )
  
  const validationErrors = Object.entries(validationResults)
    .filter(([_, result]) => !result.isValid)
    .map(([field, result]) => `${field}: ${result.errors.join(', ')}`)
  
  if (validationErrors.length > 0) {
    throw new Error(validationErrors.join('; '))
  }
}

const validateSignInInputs = (email: string, password: string) => {
  const validationResults = validateForm(
    { email, password },
    validationSchemas.signIn
  )
  
  const validationErrors = Object.entries(validationResults)
    .filter(([_, result]) => !result.isValid)
    .map(([field, result]) => `${field}: ${result.errors.join(', ')}`)
  
  if (validationErrors.length > 0) {
    throw new Error(validationErrors.join('; '))
  }
}

const createPocketBaseUserData = (email: string, username: string, password: string) => ({
  username: sanitizeInput(username),
  email: sanitizeInput(email),
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
})

const createDemoUser = (): User => ({
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
})

const handleSignUpError = (error: unknown): string => {
  if (!(error instanceof Error)) return 'Registration failed'
  
  if (error.message.includes('username')) {
    return 'Username already exists or is invalid'
  } else if (error.message.includes('email')) {
    return 'Email already exists or is invalid'
  } else {
    return error.message
  }
}

const handleSignInError = (error: unknown): string => {
  if (!(error instanceof Error)) return 'Login failed'
  
  if (error.message.includes('Failed to authenticate')) {
    return 'Invalid email/username or password. Please check your credentials and try again.'
  } else if (error.message.includes('Too many requests')) {
    return 'Too many login attempts. Please wait a moment and try again.'
  } else {
    return error.message
  }
}

const isDemoLogin = (email: string, password: string): boolean => {
  const isDevelopment = import.meta.env.NODE_ENV === 'development' || import.meta.env.VITE_ENABLE_DEBUG_LOGGING === 'true'
  const demoPassword = import.meta.env.VITE_DEMO_PASSWORD || 'demo123456'
  return isDevelopment && email === 'demo' && password === demoPassword
}

const performPocketBaseAuth = async (email: string, password: string) => {
  const sanitizedEmail = sanitizeInput(email)
  
  // Try email first, then username fallback
  try {
    return await pb.collection('users').authWithPassword(sanitizedEmail, password)
  } catch (emailError) {
    debugLogger.log('[POCKETBASE_AUTH_STORE]', 'Email login failed, trying username');
    return await pb.collection('users').authWithPassword(sanitizedEmail, password)
  }
}

const updateUserLastActive = async (userId: string) => {
  try {
    await pb.collection('users').update(userId, {
      last_active: new Date().toISOString()
    })
    debugLogger.log('[POCKETBASE_AUTH_STORE]', 'Updated last active time');
  } catch (updateError) {
    debugLogger.warn('[POCKETBASE_AUTH_STORE]', 'Could not update last active time', {
      error: updateError
    });
  }
}

// Consolidated authentication store - combines PocketBase + local fallback
// This replaces the dual authStore/pocketbaseAuthStore pattern
export const useAuthStore = create<AuthState>()((set, get) => ({
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
      validateSignUpInputs(email, password, username)
      
      const userData = createPocketBaseUserData(email, username, password)
      debugLogger.log('[POCKETBASE_AUTH_STORE]', 'Creating user in PocketBase', {
        email: userData.email,
        username: userData.username
      });

      const newUser = await pb.collection('users').create(userData)
      debugLogger.log('[POCKETBASE_AUTH_STORE]', 'User created successfully', {
        userId: newUser.id
      });

      // Authenticate the newly created user
      const authData = await pb.collection('users').authWithPassword(userData.email, password)
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

      set({
        error: handleSignUpError(error),
        isLoading: false
      })
    }

    debugLogger.log('[POCKETBASE_AUTH_STORE]', 'END - signUp');
  },

  signIn: async (email: string, password: string) => {
    debugLogger.log('[POCKETBASE_AUTH_STORE]', 'START - signIn', {
      email,
      passwordLength: password.length,
      isDemoLogin: email === 'demo'
    });

    set({ isLoading: true, error: null })
    
    const timeoutId = setTimeout(() => {
      debugLogger.warn('[POCKETBASE_AUTH_STORE]', 'SignIn timeout reached');
      set({ isLoading: false, error: 'Login timed out. Please try again.' })
    }, 10000)
    
    try {
      // Handle demo login in development
      if (isDemoLogin(email, password)) {
        debugLogger.info('[POCKETBASE_AUTH_STORE]', 'Demo login detected (development mode)');
        const demoUser = createDemoUser()
        
        clearTimeout(timeoutId)
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

      // Validate inputs for regular login
      validateSignInInputs(email, password)
      
      // Perform PocketBase authentication
      debugLogger.log('[POCKETBASE_AUTH_STORE]', 'Attempting PocketBase authentication');
      const authData = await performPocketBaseAuth(email, password)

      debugLogger.log('[POCKETBASE_AUTH_STORE]', 'SignIn response', {
        hasRecord: !!authData.record,
        hasToken: !!authData.token,
        userId: authData.record?.id
      });

      if (authData.record && authData.token) {
        debugLogger.log('[POCKETBASE_AUTH_STORE]', 'SignIn successful, converting user profile');
        
        const user = await convertPocketbaseUser(authData.record)
        await updateUserLastActive(authData.record.id)
        
        clearTimeout(timeoutId)
        
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
      set({
        error: handleSignInError(error),
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
  },

  // Unified methods for backward compatibility with existing components
  login: async (email: string, password: string) => {
    const { signIn } = get()
    await signIn(email, password)
  },

  register: async (email: string, username: string, password: string) => {
    const { signUp } = get()
    await signUp(email, password, username)
  },

  logout: () => {
    const { signOut } = get()
    signOut()
  },

  updateUser: (updates: Partial<User>) => {
    const { user } = get()
    if (user) {
      set({ user: { ...user, ...updates } })
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
      useAuthStore.setState({
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
    
    useAuthStore.setState({
      user: null,
      session: null,
      isAuthenticated: false
    })
  }
})