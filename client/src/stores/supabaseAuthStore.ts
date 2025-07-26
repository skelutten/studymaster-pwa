import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { User } from '../types'
import type { Session, User as SupabaseUser } from '@supabase/supabase-js'
import { debugLogger } from '../utils/debugLogger'

interface AuthState {
  user: User | null
  session: Session | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  
  // Actions
  signUp: (email: string, password: string, username: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>
  clearError: () => void
  initializeAuth: () => Promise<void>
}

// Helper function to convert Supabase user to our User type
const convertSupabaseUser = async (supabaseUser: SupabaseUser): Promise<User> => {
  debugLogger.log('[AUTH_STORE]', 'START - convertSupabaseUser', {
    userId: supabaseUser.id,
    email: supabaseUser.email,
    hasMetadata: !!supabaseUser.user_metadata
  });

  try {
    // First check if profile exists
    debugLogger.log('[AUTH_STORE]', 'Fetching user profile from database', {
      userId: supabaseUser.id
    });

    // Add timeout to database query
    const profilePromise = supabase
      .from('profiles')
      .select('*')
      .eq('id', supabaseUser.id)
      .single();

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        debugLogger.error('[AUTH_STORE]', 'Profile fetch timed out after 5 seconds');
        reject(new Error('Profile fetch timed out'));
      }, 5000);
    });

    let profile, error;
    try {
      const result = await Promise.race([profilePromise, timeoutPromise]);
      profile = result.data;
      error = result.error;
    } catch (timeoutError) {
      debugLogger.warn('[AUTH_STORE]', 'Profile fetch timed out, creating fallback user');
      profile = null;
      error = timeoutError;
    }

    debugLogger.logApiResponse('[AUTH_STORE]', 'Profile fetch response', { data: profile, error });

    if (error || !profile) {
      debugLogger.warn('[AUTH_STORE]', 'Profile not found, creating default profile', {
        error: error?.message,
        userId: supabaseUser.id
      });
      
      // Create default profile if it doesn't exist
      const defaultProfile = {
        id: supabaseUser.id,
        email: supabaseUser.email!,
        username: supabaseUser.user_metadata?.username || supabaseUser.email!.split('@')[0],
        level: 1,
        total_xp: 0,
        coins: 100,
        gems: 10,
        created_at: new Date().toISOString(),
        last_active: new Date().toISOString(),
        preferences: {
          theme: 'system' as const,
          language: 'en',
          notifications: true,
          soundEffects: true,
          dailyGoal: 50,
          timezone: 'UTC'
        }
      }

      debugLogger.log('[AUTH_STORE]', 'Default profile created', defaultProfile);

      // Try to create profile, but don't fail if table doesn't exist
      try {
        debugLogger.log('[AUTH_STORE]', 'Attempting to insert profile into database');
        
        // Add timeout to insert operation
        const insertPromise = supabase
          .from('profiles')
          .insert([defaultProfile])
          .select()
          .single();

        const insertTimeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            debugLogger.warn('[AUTH_STORE]', 'Profile insert timed out after 3 seconds');
            reject(new Error('Profile insert timed out'));
          }, 3000);
        });

        const insertResponse = await Promise.race([insertPromise, insertTimeoutPromise]);
        debugLogger.logApiResponse('[AUTH_STORE]', 'Profile insert response', insertResponse);
      } catch (insertError) {
        debugLogger.error('[AUTH_STORE]', 'Could not create profile in database', {
          error: insertError,
          stack: insertError instanceof Error ? insertError.stack : undefined
        });
      }

      const convertedUser = {
        id: supabaseUser.id,
        email: supabaseUser.email!,
        username: defaultProfile.username,
        level: defaultProfile.level,
        totalXp: defaultProfile.total_xp,
        coins: defaultProfile.coins,
        gems: defaultProfile.gems,
        createdAt: defaultProfile.created_at,
        lastActive: defaultProfile.last_active,
        preferences: defaultProfile.preferences
      };

      debugLogger.log('[AUTH_STORE]', 'END - convertSupabaseUser (default profile)', convertedUser);
      return convertedUser;
    }

    const convertedUser = {
      id: profile.id,
      email: profile.email,
      username: profile.username,
      level: profile.level,
      totalXp: profile.total_xp,
      coins: profile.coins,
      gems: profile.gems,
      createdAt: profile.created_at,
      lastActive: profile.last_active,
      preferences: profile.preferences
    };

    debugLogger.log('[AUTH_STORE]', 'END - convertSupabaseUser (existing profile)', convertedUser);
    return convertedUser;
  } catch (error) {
    debugLogger.error('[AUTH_STORE]', 'Error in convertSupabaseUser', {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      userId: supabaseUser.id
    });
    
    // Fallback: create a basic user object from Supabase user data
    const fallbackUser = {
      id: supabaseUser.id,
      email: supabaseUser.email!,
      username: supabaseUser.user_metadata?.username || supabaseUser.email!.split('@')[0],
      level: 1,
      totalXp: 0,
      coins: 100,
      gems: 10,
      createdAt: supabaseUser.created_at,
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

    debugLogger.log('[AUTH_STORE]', 'END - convertSupabaseUser (fallback)', fallbackUser);
    return fallbackUser;
  }
}

export const useSupabaseAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  signUp: async (email: string, password: string, username: string) => {
    debugLogger.log('[AUTH_STORE]', 'START - signUp', {
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

      debugLogger.log('[AUTH_STORE]', 'Calling Supabase signUp', {
        email,
        username,
        hasMetadata: true
      });

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username
          }
        }
      })

      debugLogger.logApiResponse('[AUTH_STORE]', 'SignUp response', { data, error });

      if (error) throw error

      if (data.user && data.session) {
        debugLogger.log('[AUTH_STORE]', 'SignUp successful with session', {
          userId: data.user.id,
          hasSession: true
        });

        const user = await convertSupabaseUser(data.user)
        
        debugLogger.log('[AUTH_STORE]', 'Setting authenticated state after signup');
        set({
          user,
          session: data.session,
          isAuthenticated: true,
          isLoading: false,
          error: null
        })
      } else {
        // Email confirmation required
        debugLogger.info('[AUTH_STORE]', 'Email confirmation required', {
          hasUser: !!data.user,
          hasSession: !!data.session
        });

        set({
          isLoading: false,
          error: 'Please check your email and click the confirmation link to complete registration.'
        })
      }
    } catch (error) {
      debugLogger.error('[AUTH_STORE]', 'SignUp error', {
        error,
        stack: error instanceof Error ? error.stack : undefined
      });

      set({
        error: error instanceof Error ? error.message : 'Registration failed',
        isLoading: false
      })
    }

    debugLogger.log('[AUTH_STORE]', 'END - signUp');
  },

  signIn: async (email: string, password: string) => {
    debugLogger.log('[AUTH_STORE]', 'START - signIn', {
      email,
      passwordLength: password.length,
      isDemoLogin: email === 'demo' || email === ''
    });

    set({ isLoading: true, error: null })
    
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      debugLogger.warn('[AUTH_STORE]', 'SignIn timeout reached');
      set({ 
        isLoading: false, 
        error: 'Login timed out. Please try again.' 
      })
    }, 10000) // 10 second timeout
    
    try {
      // Check for demo login
      if (email === 'demo' || email === '') {
        debugLogger.info('[AUTH_STORE]', 'Demo login detected');
        
        // Demo user - create temporary session
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
        
        debugLogger.log('[AUTH_STORE]', 'Setting demo user state');
        set({
          user: demoUser,
          session: null,
          isAuthenticated: true,
          isLoading: false,
          error: null
        })
        
        debugLogger.log('[AUTH_STORE]', 'END - signIn (demo user)');
        return
      }

      debugLogger.log('[AUTH_STORE]', 'Attempting Supabase signInWithPassword');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      debugLogger.logApiResponse('[AUTH_STORE]', 'SignIn response', { data, error });

      if (error) {
        throw error
      }

      if (data.user && data.session) {
        debugLogger.log('[AUTH_STORE]', 'SignIn successful, converting user profile');
        
        const user = await convertSupabaseUser(data.user)
        
        // Try to update last active time, but don't fail if it doesn't work
        try {
          debugLogger.log('[AUTH_STORE]', 'Updating last active time');
          
          const updatePromise = supabase
            .from('profiles')
            .update({ last_active: new Date().toISOString() })
            .eq('id', data.user.id);

          const updateTimeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
              debugLogger.warn('[AUTH_STORE]', 'Last active update timed out after 2 seconds');
              reject(new Error('Last active update timed out'));
            }, 2000);
          });

          const updateResponse = await Promise.race([updatePromise, updateTimeoutPromise]);
          debugLogger.logApiResponse('[AUTH_STORE]', 'Last active update response', updateResponse);
        } catch (updateError) {
          debugLogger.warn('[AUTH_STORE]', 'Could not update last active time', {
            error: updateError
          });
        }
        
        clearTimeout(timeoutId)
        
        debugLogger.log('[AUTH_STORE]', 'Setting authenticated state after signin');
        debugLogger.logSession('[AUTH_STORE]', 'New session', data.session);
        
        set({
          user,
          session: data.session,
          isAuthenticated: true,
          isLoading: false,
          error: null
        })
        
        debugLogger.log('[AUTH_STORE]', 'END - signIn (success)');
      } else {
        debugLogger.warn('[AUTH_STORE]', 'No user or session in response', {
          hasUser: !!data.user,
          hasSession: !!data.session
        });
        
        clearTimeout(timeoutId)
        set({
          error: 'Invalid login response - no user or session',
          isLoading: false
        })
      }
    } catch (error) {
      debugLogger.error('[AUTH_STORE]', 'SignIn error', {
        error,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      clearTimeout(timeoutId)
      
      let errorMessage = 'Login failed'
      if (error instanceof Error) {
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.'
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please check your email and confirm your account before signing in.'
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

    debugLogger.log('[AUTH_STORE]', 'END - signIn');
  },

  signOut: async () => {
    debugLogger.log('[AUTH_STORE]', 'START - signOut');
    
    try {
      debugLogger.log('[AUTH_STORE]', 'Calling Supabase signOut');
      const { error } = await supabase.auth.signOut()
      
      debugLogger.logApiResponse('[AUTH_STORE]', 'SignOut response', { error });
      
      if (error) throw error
      
      debugLogger.log('[AUTH_STORE]', 'Clearing auth state');
      set({ 
        user: null,
        session: null,
        isAuthenticated: false, 
        error: null 
      })
      
      debugLogger.log('[AUTH_STORE]', 'END - signOut (success)');
    } catch (error) {
      debugLogger.error('[AUTH_STORE]', 'SignOut error', {
        error,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      set({
        error: error instanceof Error ? error.message : 'Logout failed'
      })
    }
  },

  resetPassword: async (email: string) => {
    debugLogger.log('[AUTH_STORE]', 'START - resetPassword', { email });
    
    set({ isLoading: true, error: null })
    
    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      
      debugLogger.log('[AUTH_STORE]', 'Calling resetPasswordForEmail', {
        email,
        redirectTo
      });
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo
      })
      
      debugLogger.logApiResponse('[AUTH_STORE]', 'Reset password response', { error });
      
      if (error) throw error
      
      set({
        isLoading: false,
        error: null
      })
      
      debugLogger.log('[AUTH_STORE]', 'END - resetPassword (success)');
    } catch (error) {
      debugLogger.error('[AUTH_STORE]', 'Reset password error', {
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
    debugLogger.log('[AUTH_STORE]', 'START - updatePassword', {
      passwordLength: newPassword.length,
      timestamp: new Date().toISOString()
    });
    
    // Log current session state before attempting update
    const currentState = get();
    debugLogger.logSession('[AUTH_STORE]', 'Current session before update', currentState.session);
    debugLogger.log('[AUTH_STORE]', 'Current auth state', {
      hasUser: !!currentState.user,
      hasSession: !!currentState.session,
      isAuthenticated: currentState.isAuthenticated
    });
    
    set({ isLoading: true, error: null });
    
    try {
      // Validate password
      if (!newPassword || newPassword.length < 6) {
        const error = new Error("Password must be at least 6 characters long.");
        debugLogger.warn('[AUTH_STORE]', 'Password validation failed', {
          passwordLength: newPassword?.length || 0
        });
        throw error;
      }

      debugLogger.log('[AUTH_STORE]', 'Calling supabase.auth.updateUser', {
        hasPassword: !!newPassword
      });

      // Get current session to verify it's valid
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      debugLogger.log('[AUTH_STORE]', 'Current session check before update', {
        hasSession: !!sessionData.session,
        hasUser: !!sessionData.session?.user,
        sessionError: sessionError?.message,
        accessToken: sessionData.session?.access_token ? `${sessionData.session.access_token.slice(0, 20)}...` : 'none'
      });

      if (!sessionData.session) {
        throw new Error('No active session found for password update');
      }

      // Add timeout to prevent hanging
      const updateUserPromise = supabase.auth.updateUser({
        password: newPassword,
      });

      debugLogger.log('[AUTH_STORE]', 'updateUser promise created - adding timeout');

      // Create timeout Promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          debugLogger.error('[AUTH_STORE]', 'Password update timed out', {
            timeoutSeconds: 10,
            timestamp: new Date().toISOString()
          });
          reject(new Error('Password update timed out after 10 seconds'));
        }, 10000);
      });

      // Race between updateUser and timeout
      const result = await Promise.race([
        updateUserPromise,
        timeoutPromise
      ]);

      const { error, data } = result as any;

      debugLogger.logApiResponse('[AUTH_STORE]', 'UpdatePassword response', { data, error });

      if (error) {
        debugLogger.error('[AUTH_STORE]', 'Supabase updateUser error', {
          error,
          errorMessage: error.message,
          errorCode: (error as any).code,
          errorStatus: (error as any).status
        });
        throw error;
      }

      debugLogger.log('[AUTH_STORE]', 'Password update successful', {
        hasUser: !!data?.user,
        userId: data?.user?.id
      });

      set({ isLoading: false, error: null });
      
      debugLogger.log('[AUTH_STORE]', 'END - updatePassword (success)');
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unknown error occurred during password update.";
      
      debugLogger.error('[AUTH_STORE]', 'UpdatePassword failed', {
        error: errorMessage,
        errorType: error?.constructor?.name,
        errorDetails: error,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      set({ isLoading: false, error: errorMessage });
      
      // Re-throwing allows the UI component to handle the error
      throw new Error(errorMessage);
    }
  },

  updateProfile: async (updates: Partial<User>) => {
    const { user } = get()
    
    debugLogger.log('[AUTH_STORE]', 'START - updateProfile', {
      userId: user?.id,
      updates: Object.keys(updates)
    });
    
    if (!user) {
      debugLogger.warn('[AUTH_STORE]', 'No user found for profile update');
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
      
      debugLogger.log('[AUTH_STORE]', 'Updating profile in database', updateData);
      
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)
      
      debugLogger.logApiResponse('[AUTH_STORE]', 'Profile update response', { error });
      
      if (error) throw error
      
      debugLogger.log('[AUTH_STORE]', 'Updating local user state');
      set({ user: { ...user, ...updates } })
      
      debugLogger.log('[AUTH_STORE]', 'END - updateProfile (success)');
    } catch (error) {
      debugLogger.error('[AUTH_STORE]', 'Profile update error', {
        error,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      set({
        error: error instanceof Error ? error.message : 'Profile update failed'
      })
    }
  },

  clearError: () => {
    debugLogger.log('[AUTH_STORE]', 'Clearing error state');
    set({ error: null })
  },

  initializeAuth: async () => {
    debugLogger.log('[AUTH_STORE]', 'START - initializeAuth');
    
    try {
      debugLogger.log('[AUTH_STORE]', 'Getting current session from Supabase');
      const { data: { session }, error } = await supabase.auth.getSession()
      
      debugLogger.logApiResponse('[AUTH_STORE]', 'Get session response', { session, error });
      
      if (session?.user) {
        debugLogger.log('[AUTH_STORE]', 'Session found, converting user', {
          userId: session.user.id,
          email: session.user.email
        });
        
        const user = await convertSupabaseUser(session.user)
        
        debugLogger.log('[AUTH_STORE]', 'Setting authenticated state from initialization');
        set({
          user,
          session,
          isAuthenticated: true
        })
      } else {
        debugLogger.info('[AUTH_STORE]', 'No session found during initialization');
      }
      
      debugLogger.log('[AUTH_STORE]', 'END - initializeAuth');
    } catch (error) {
      debugLogger.error('[AUTH_STORE]', 'Auth initialization error', {
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

// Set up auth state change listener with PASSWORD_RECOVERY support
supabase.auth.onAuthStateChange(async (event, session) => {
  debugLogger.info('[AUTH_STORE]', 'Auth state change detected', {
    event,
    hasSession: !!session,
    hasUser: !!session?.user,
    userId: session?.user?.id,
    timestamp: new Date().toISOString()
  });
  
  if (session) {
    debugLogger.logSession('[AUTH_STORE]', `Auth event: ${event}`, session);
  }
  
  if (event === 'SIGNED_IN' && session?.user) {
    debugLogger.log('[AUTH_STORE]', 'Processing SIGNED_IN event');
    
    try {
      const user = await convertSupabaseUser(session.user)
      
      debugLogger.log('[AUTH_STORE]', 'Updating auth store for SIGNED_IN');
      useSupabaseAuthStore.setState({
        user,
        session,
        isAuthenticated: true
      })
    } catch (error) {
      debugLogger.error('[AUTH_STORE]', 'Failed to convert user during SIGNED_IN', {
        error,
        userId: session.user.id
      });
      
      // Create minimal fallback user to prevent auth failure
      const fallbackUser = {
        id: session.user.id,
        email: session.user.email!,
        username: session.user.user_metadata?.username || session.user.email!.split('@')[0],
        level: 1,
        totalXp: 0,
        coins: 100,
        gems: 10,
        createdAt: session.user.created_at,
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
      
      debugLogger.log('[AUTH_STORE]', 'Using fallback user for SIGNED_IN after error');
      useSupabaseAuthStore.setState({
        user: fallbackUser,
        session,
        isAuthenticated: true
      })
    }
  } else if (event === 'SIGNED_OUT') {
    debugLogger.log('[AUTH_STORE]', 'Processing SIGNED_OUT event');
    
    useSupabaseAuthStore.setState({
      user: null,
      session: null,
      isAuthenticated: false
    })
  } else if (event === 'PASSWORD_RECOVERY' && session?.user) {
    debugLogger.info('[AUTH_STORE]', 'Processing PASSWORD_RECOVERY event', {
      userId: session.user.id,
      email: session.user.email,
      hasAccessToken: !!session.access_token,
      accessTokenLength: session.access_token?.length,
      hasRefreshToken: !!session.refresh_token
    });
    
    debugLogger.log('[AUTH_STORE]', 'Creating minimal user for PASSWORD_RECOVERY');
    
    // Create minimal user object for password recovery - skip database lookup
    const minimalUser = {
      id: session.user.id,
      email: session.user.email!,
      username: session.user.user_metadata?.username || session.user.email!.split('@')[0],
      level: 1,
      totalXp: 0,
      coins: 100,
      gems: 10,
      createdAt: session.user.created_at,
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
    
    debugLogger.log('[AUTH_STORE]', 'Setting auth state for PASSWORD_RECOVERY');
    useSupabaseAuthStore.setState({
      user: minimalUser,
      session,
      isAuthenticated: true
    })
    
    debugLogger.log('[AUTH_STORE]', 'Auth store updated with password recovery session');
  } else if (event === 'TOKEN_REFRESHED' && session) {
    debugLogger.log('[AUTH_STORE]', 'Processing TOKEN_REFRESHED event');
    
    const currentState = useSupabaseAuthStore.getState()
    if (currentState.user) {
      debugLogger.log('[AUTH_STORE]', 'Updating session after token refresh');
      useSupabaseAuthStore.setState({
        session,
        isAuthenticated: true
      })
    }
  } else {
    debugLogger.info('[AUTH_STORE]', 'Unhandled auth event', { event });
  }
})