import { create } from 'zustand'
import { pb } from '../lib/pocketbase'
import type { User } from '../types'
import { debugLogger } from '../utils/debugLogger'
import { validateForm, validationSchemas, sanitizeInput } from '../utils/validation'
import { ensureLocalProfile, updateLocalProfile } from '../services/localProfileService'
import { linkAccount, unlinkAccount, isLinked } from '../services/onlineLinkService'
import { isRemoteAuthEnabled } from '../config/featureFlags'
import { useDeckStore } from './deckStore'

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

  // Local Account + Online Link (optional)
  connectOnline: (provider: 'studymaster', link: { serverUserId: string; accessToken: string; refreshToken?: string; scopes?: string[] }) => Promise<void>
  disconnectOnline: (provider: 'studymaster') => Promise<void>
  isOnlineLinked: (provider: 'studymaster') => Promise<boolean>
  
  // PocketBase-specific Actions (now private/internal)
  // signUp: (email: string, password: string, username: string) => Promise<void>
  // signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
  updateProfile: (updates: Partial<User>) => Promise<void>
  clearError: () => void
  initializeAuth: () => Promise<void>
}

// Helper function to convert PocketBase user to our User type
const convertPocketbaseUser = async (pocketbaseUser: Record<string, unknown>): Promise<User> => {
  const rec = pocketbaseUser as any;
  debugLogger.log('[POCKETBASE]', 'START - convertPocketbaseUser', {
    userId: rec?.id,
    email: rec?.email,
    username: rec?.username
  });

  try {
    const id: string = String(rec?.id ?? '');
    const email: string = String(rec?.email ?? '');
    const baseName = email && email.includes('@') ? email.split('@')[0] : 'User';
    const username: string = String(rec?.username ?? baseName ?? 'User');

    const convertedUser: User = {
      id,
      email: email || 'unknown@example.com',
      username,
      level: Number(rec?.level ?? 1),
      totalXp: Number(rec?.total_xp ?? 0),
      coins: Number(rec?.coins ?? 100),
      gems: Number(rec?.gems ?? 10),
      createdAt: String(rec?.created ?? new Date().toISOString()),
      lastActive: String(rec?.last_active ?? new Date().toISOString()),
      preferences: rec?.preferences ?? {
        theme: 'system',
        language: 'en',
        notifications: true,
        soundEffects: true,
        dailyGoal: 50,
        timezone: 'UTC'
      }
    };

    debugLogger.log('[POCKETBASE]', 'END - convertPocketbaseUser', convertedUser);
    return convertedUser;
  } catch (error) {
    debugLogger.error('[POCKETBASE]', 'Error in convertPocketbaseUser', {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      userId: (rec as any)?.id
    });
    
    // Fallback: create a basic user object
    const id: string = String(rec?.id ?? '');
    const email: string = String(rec?.email ?? 'unknown@example.com');
    const baseName = email && email.includes('@') ? email.split('@')[0] : 'User';
    const username: string = String(rec?.username ?? baseName ?? 'User');

    const fallbackUser: User = {
      id,
      email,
      username,
      level: 1,
      totalXp: 0,
      coins: 100,
      gems: 10,
      createdAt: String(rec?.created ?? new Date().toISOString()),
      lastActive: new Date().toISOString(),
      preferences: {
        theme: 'system',
        language: 'en',
        notifications: true,
        soundEffects: true,
        dailyGoal: 50,
        timezone: 'UTC'
      }
    };

    debugLogger.log('[POCKETBASE]', 'END - convertPocketbaseUser (fallback)', fallbackUser);
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
    debugLogger.log('[POCKETBASE]', 'Email login failed, trying username');
    return await pb.collection('users').authWithPassword(sanitizedEmail, password)
  }
}

const updateUserLastActive = async (userId: string) => {
  try {
    await pb.collection('users').update(userId, {
      last_active: new Date().toISOString()
    })
    debugLogger.log('[POCKETBASE]', 'Updated last active time');
  } catch (updateError) {
    debugLogger.warn('[POCKETBASE]', 'Could not update last active time', {
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

  // Unified methods for components (FORCE LOCAL by default)
  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      if (isRemoteAuthEnabled()) {
        debugLogger.info('[AUTH_STORE]', 'Login - attempting remote auth via PocketBase');
        const authData = await performPocketBaseAuth(email, password);
        const user = await convertPocketbaseUser(authData.record);
        set({
          user,
          session: authData,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        useDeckStore.getState().setCurrentUser(user.id);
        await updateUserLastActive(user.id);
      } else {
        debugLogger.info('[AUTH_STORE]', 'Login - forcing local auth (remote disabled)');
        const profile = await ensureLocalProfile();
        const localUser: User = {
          id: profile.deviceUserId,
          email: 'local@device',
          username: profile.displayName || 'You',
          level: 1,
          totalXp: 0,
          coins: 0,
          gems: 0,
          createdAt: new Date(profile.createdAt).toISOString(),
          lastActive: new Date().toISOString(),
          preferences: {
            theme: 'system',
            language: 'en',
            notifications: true,
            soundEffects: true,
            dailyGoal: 50,
            timezone: 'UTC',
          },
        };
        set({ user: localUser, session: null, isAuthenticated: true, isLoading: false, error: null });
        useDeckStore.getState().setCurrentUser(localUser.id);
      }
    } catch (error) {
      const errorMessage = handleSignInError(error);
      set({ error: errorMessage, isLoading: false });
      throw new Error(errorMessage);
    }
  },

  register: async (email: string, username: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      if (isRemoteAuthEnabled()) {
        debugLogger.info('[AUTH_STORE]', 'Register - attempting remote auth via PocketBase');
        validateSignUpInputs(email, password, username);
        const userData = createPocketBaseUserData(email, username, password);
        const record = await pb.collection('users').create(userData);
        const user = await convertPocketbaseUser(record);
        set({
          user,
          session: { record, token: pb.authStore.token },
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        useDeckStore.getState().setCurrentUser(user.id);
      } else {
        debugLogger.info('[AUTH_STORE]', 'Register - forcing local profile creation (remote disabled)');
        const profile = await ensureLocalProfile();
        await updateLocalProfile({ displayName: username });
        const localUser: User = {
          id: profile.deviceUserId,
          email: email || 'local@device',
          username: username || profile.displayName || 'You',
          level: 1,
          totalXp: 0,
          coins: 0,
          gems: 0,
          createdAt: new Date(profile.createdAt).toISOString(),
          lastActive: new Date().toISOString(),
          preferences: {
            theme: 'system',
            language: 'en',
            notifications: true,
            soundEffects: true,
            dailyGoal: 50,
            timezone: 'UTC',
          },
        };
        set({
          user: localUser,
          session: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        useDeckStore.getState().setCurrentUser(localUser.id);
      }
    } catch (error) {
      const errorMessage = handleSignUpError(error);
      set({ error: errorMessage, isLoading: false });
      throw new Error(errorMessage);
    }
  },

  logout: () => {
    const { signOut } = get();
    signOut();
  },

  updateUser: (updates: Partial<User>) => {
    const { user } = get();
    if (user) {
      set({ user: { ...user, ...updates } });
    }
  },

  // PocketBase-specific Actions
  signOut: async () => {
    debugLogger.log('[POCKETBASE]', 'START - signOut');
    
    try {
      debugLogger.log('[POCKETBASE]', 'Calling PocketBase authStore.clear');
      pb.authStore.clear();
      
      debugLogger.log('[POCKETBASE]', 'Clearing auth state');
      set({
        user: null,
        session: null,
        isAuthenticated: false,
        error: null,
      });
      useDeckStore.getState().setCurrentUser(null);
      
      debugLogger.log('[POCKETBASE]', 'END - signOut (success)');
    } catch (error) {
      debugLogger.error('[POCKETBASE]', 'SignOut error', {
        error,
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      set({
        error: error instanceof Error ? error.message : 'Logout failed',
      });
    }
  },

  resetPassword: async (email: string) => {
    debugLogger.log('[POCKETBASE]', 'START - resetPassword', { email });
    
    set({ isLoading: true, error: null });
    
    try {
      await pb.collection('users').requestPasswordReset(email);
      
      set({
        isLoading: false,
        error: null,
      });
      
      debugLogger.log('[POCKETBASE]', 'END - resetPassword (success)');
    } catch (error) {
      debugLogger.error('[POCKETBASE]', 'Reset password error', {
        error,
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      let errorMessage = 'Password reset failed';
      if (error instanceof Error) {
        if (error.message.includes('Invalid email')) {
          errorMessage = 'Please enter a valid email address.';
        } else if (error.message.includes('not found')) {
          errorMessage = 'No account found with this email address.';
        } else {
          errorMessage = error.message;
        }
      }
      
      set({
        error: errorMessage,
        isLoading: false,
      });
    }
  },

  updatePassword: async (newPassword: string) => {
    debugLogger.log('[POCKETBASE]', 'START - updatePassword', {
      passwordLength: newPassword.length,
    });
    
    const currentState = get();
    debugLogger.log('[POCKETBASE]', 'Current auth state', {
      hasUser: !!currentState.user,
      hasSession: !!currentState.session,
      isAuthenticated: currentState.isAuthenticated,
    });
    
    set({ isLoading: true, error: null });
    
    try {
      // Validate password
      if (!newPassword || newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters long.');
      }

      if (!currentState.user?.id) {
        throw new Error('No authenticated user found');
      }

      debugLogger.log('[POCKETBASE]', 'Calling pb.collection.update');

      await pb.collection('users').update(currentState.user.id, {
        password: newPassword,
        passwordConfirm: newPassword,
      });

      debugLogger.log('[POCKETBASE]', 'Password update successful');

      set({ isLoading: false, error: null });
      
      debugLogger.log('[POCKETBASE]', 'END - updatePassword (success)');
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'An unknown error occurred during password update.';
      
      debugLogger.error('[POCKETBASE]', 'UpdatePassword failed', {
        error: errorMessage,
        errorType: error?.constructor?.name,
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      set({ isLoading: false, error: errorMessage });
      
      throw new Error(errorMessage);
    }
  },

  updateProfile: async (updates: Partial<User>) => {
    const { user } = get();
    
    debugLogger.log('[POCKETBASE]', 'START - updateProfile', {
      userId: user?.id,
      updates: Object.keys(updates),
    });
    
    if (!user) {
      debugLogger.warn('[POCKETBASE]', 'No user found for profile update');
      return;
    }
    
    try {
      const updateData = {
        username: updates.username,
        level: updates.level,
        total_xp: updates.totalXp,
        coins: updates.coins,
        gems: updates.gems,
        preferences: updates.preferences,
        last_active: new Date().toISOString(),
      };
      
      debugLogger.log('[POCKETBASE]', 'Updating profile in database', updateData);
      
      await pb.collection('users').update(user.id, updateData);
      
      debugLogger.log('[POCKETBASE]', 'Updating local user state');
      set({ user: { ...user, ...updates } });
      
      debugLogger.log('[POCKETBASE]', 'END - updateProfile (success)');
    } catch (error) {
      debugLogger.error('[POCKETBASE]', 'Profile update error', {
        error,
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      set({
        error: error instanceof Error ? error.message : 'Profile update failed',
      });
    }
  },

  clearError: () => {
    debugLogger.log('[POCKETBASE]', 'Clearing error state');
    set({ error: null });
  },

  initializeAuth: async () => {
    debugLogger.log('[POCKETBASE]', 'START - initializeAuth');
    
    try {
      if (pb.authStore.isValid && pb.authStore.model) {
        debugLogger.log('[POCKETBASE]', 'Valid auth store found, converting user', {
          userId: pb.authStore.model.id,
          email: pb.authStore.model.email
        });
        
        const user = await convertPocketbaseUser(pb.authStore.model);
        
        debugLogger.log('[POCKETBASE]', 'Setting authenticated state from initialization');
        set({
          user,
          session: {
            record: pb.authStore.model,
            token: pb.authStore.token
          },
          isAuthenticated: true
        });
      } else {
        // Fallback: bootstrap a local-only profile (no server required)
        debugLogger.info('[AUTH_STORE]', 'No remote session. Bootstrapping local profile.');
        const profile = await ensureLocalProfile();
        const localUser: User = {
          id: profile.deviceUserId,
          email: 'local@device',
          username: profile.displayName || 'You',
          level: 1,
          totalXp: 0,
          coins: 0,
          gems: 0,
          createdAt: new Date(profile.createdAt).toISOString(),
          lastActive: new Date().toISOString(),
          preferences: {
            theme: 'system',
            language: 'en',
            notifications: true,
            soundEffects: true,
            dailyGoal: 50,
            timezone: 'UTC'
          }
        };
        set({
          user: localUser,
          session: null,
          isAuthenticated: true
        });
        useDeckStore.getState().setCurrentUser(localUser.id);
        debugLogger.log('[AUTH_STORE]', 'Local profile initialized', { deviceUserId: profile.deviceUserId });
      }
      
      debugLogger.log('[POCKETBASE]', 'END - initializeAuth');
    } catch (error) {
      debugLogger.error('[POCKETBASE]', 'Auth initialization error', {
        error,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      set({
        user: null,
        session: null,
        isAuthenticated: false
      });
    }
  },

  // Local account: optional online link helpers
  connectOnline: async (provider, link) => {
    const state = useAuthStore.getState();
    const deviceUserId = state.user?.id;
    if (!deviceUserId) {
      debugLogger.warn('[AUTH_STORE]', 'connectOnline called without local user');
      throw new Error('No local user');
    }
    await linkAccount({
      deviceUserId,
      provider,
      serverUserId: link.serverUserId,
      accessToken: link.accessToken,
      refreshToken: link.refreshToken,
      scopes: link.scopes,
    });
    debugLogger.info('[AUTH_STORE]', 'Online account linked', { provider });
  },

  disconnectOnline: async (provider) => {
    const state = useAuthStore.getState();
    const deviceUserId = state.user?.id;
    if (!deviceUserId) return;
    await unlinkAccount(deviceUserId, provider);
    debugLogger.info('[AUTH_STORE]', 'Online account unlinked', { provider });
  },

  isOnlineLinked: async (provider) => {
    const state = useAuthStore.getState();
    const deviceUserId = state.user?.id;
    if (!deviceUserId) return false;
    return isLinked(deviceUserId, provider);
  },

// Set up auth state change listener
pb.authStore.onChange((token, record) => {
  debugLogger.info('[POCKETBASE]', 'Auth state change detected', {
    hasToken: !!token,
    hasRecord: !!record,
    userId: record?.id,
    timestamp: new Date().toISOString()
  });
  
  if (token && record) {
    debugLogger.log('[POCKETBASE]', 'Processing auth state change - user logged in');
    
    convertPocketbaseUser(record).then(user => {
      debugLogger.log('[POCKETBASE]', 'Updating auth store for logged in user');
      useAuthStore.setState({
        user,
        session: { record, token },
        isAuthenticated: true
      })
      useDeckStore.getState().setCurrentUser(user.id)
    }).catch(error => {
      debugLogger.error('[POCKETBASE]', 'Failed to convert user during auth change', {
        error,
        userId: record.id
      });
    });
  } else {
    debugLogger.log('[POCKETBASE]', 'Processing auth state change - user logged out');
    
    useAuthStore.setState({
      user: null,
      session: null,
      isAuthenticated: false
    })
  }
})