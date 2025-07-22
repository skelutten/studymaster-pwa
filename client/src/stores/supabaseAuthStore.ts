import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { User } from '../types'
import type { Session, User as SupabaseUser } from '@supabase/supabase-js'

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
  updateProfile: (updates: Partial<User>) => Promise<void>
  clearError: () => void
  initializeAuth: () => Promise<void>
}

// Helper function to convert Supabase user to our User type
const convertSupabaseUser = async (supabaseUser: SupabaseUser): Promise<User> => {
  try {
    // First check if profile exists
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', supabaseUser.id)
      .single()

    if (error || !profile) {
      console.warn('Profile not found, creating default profile:', error?.message)
      
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

      // Try to create profile, but don't fail if table doesn't exist
      try {
        await supabase
          .from('profiles')
          .insert([defaultProfile])
          .select()
          .single()
      } catch (insertError) {
        console.warn('Could not create profile in database:', insertError)
        // Continue with default profile even if database insert fails
      }

      return {
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
      }
    }

    return {
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
    }
  } catch (error) {
    console.error('Error in convertSupabaseUser:', error)
    
    // Fallback: create a basic user object from Supabase user data
    return {
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
        theme: 'system',
        language: 'en',
        notifications: true,
        soundEffects: true,
        dailyGoal: 50,
        timezone: 'UTC'
      }
    }
  }
}

export const useSupabaseAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  signUp: async (email: string, password: string, username: string) => {
    set({ isLoading: true, error: null })
    
    try {
      // Validate inputs
      if (!email || !password || !username) {
        throw new Error('Email, username and password are required')
      }
      
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long')
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username
          }
        }
      })

      if (error) throw error

      if (data.user && data.session) {
        const user = await convertSupabaseUser(data.user)
        set({
          user,
          session: data.session,
          isAuthenticated: true,
          isLoading: false,
          error: null
        })
      } else {
        // Email confirmation required
        set({
          isLoading: false,
          error: 'Please check your email and click the confirmation link to complete registration.'
        })
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Registration failed',
        isLoading: false
      })
    }
  },

  signIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null })
    
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      set({ 
        isLoading: false, 
        error: 'Login timed out. Please try again.' 
      })
    }, 10000) // 10 second timeout
    
    try {
      console.log('Starting signIn process for:', email)
      
      // Check for demo login
      if (email === 'demo' || email === '') {
        console.log('Demo login detected')
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
        set({
          user: demoUser,
          session: null,
          isAuthenticated: true,
          isLoading: false,
          error: null
        })
        return
      }

      console.log('Attempting Supabase signIn...')
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        console.error('Supabase auth error:', error)
        throw error
      }

      console.log('Supabase signIn successful, data:', { user: !!data.user, session: !!data.session })

      if (data.user && data.session) {
        console.log('Converting user profile...')
        const user = await convertSupabaseUser(data.user)
        console.log('User profile converted:', user)
        
        // Try to update last active time, but don't fail if it doesn't work
        try {
          await supabase
            .from('profiles')
            .update({ last_active: new Date().toISOString() })
            .eq('id', data.user.id)
        } catch (updateError) {
          console.warn('Could not update last active time:', updateError)
        }
        
        console.log('Setting authenticated state...')
        clearTimeout(timeoutId)
        set({
          user,
          session: data.session,
          isAuthenticated: true,
          isLoading: false,
          error: null
        })
        console.log('SignIn completed successfully')
      } else {
        console.warn('No user or session in response')
        clearTimeout(timeoutId)
        set({
          error: 'Invalid login response - no user or session',
          isLoading: false
        })
      }
    } catch (error) {
      console.error('SignIn error:', error)
      clearTimeout(timeoutId)
      set({
        error: error instanceof Error ? error.message : 'Login failed',
        isLoading: false
      })
    }
  },

  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      set({ 
        user: null,
        session: null,
        isAuthenticated: false, 
        error: null 
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Logout failed'
      })
    }
  },

  resetPassword: async (email: string) => {
    set({ isLoading: true, error: null })
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })
      
      if (error) throw error
      
      set({
        isLoading: false,
        error: 'Password reset email sent. Please check your inbox.'
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Password reset failed',
        isLoading: false
      })
    }
  },

  updateProfile: async (updates: Partial<User>) => {
    const { user } = get()
    if (!user) return
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: updates.username,
          level: updates.level,
          total_xp: updates.totalXp,
          coins: updates.coins,
          gems: updates.gems,
          preferences: updates.preferences,
          last_active: new Date().toISOString()
        })
        .eq('id', user.id)
      
      if (error) throw error
      
      set({ user: { ...user, ...updates } })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Profile update failed'
      })
    }
  },

  clearError: () => {
    set({ error: null })
  },

  initializeAuth: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        const user = await convertSupabaseUser(session.user)
        set({
          user,
          session,
          isAuthenticated: true
        })
      }
    } catch (error) {
      console.error('Auth initialization error:', error)
      set({ 
        user: null,
        session: null,
        isAuthenticated: false 
      })
    }
  }
}))

// Set up auth state change listener
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session?.user) {
    const user = await convertSupabaseUser(session.user)
    useSupabaseAuthStore.setState({
      user,
      session,
      isAuthenticated: true
    })
  } else if (event === 'SIGNED_OUT') {
    useSupabaseAuthStore.setState({
      user: null,
      session: null,
      isAuthenticated: false
    })
  }
})