import { createClient } from '@supabase/supabase-js'
import { debugLogger } from '../utils/debugLogger'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

// Log Supabase initialization details
debugLogger.log('[SUPABASE]', 'Initializing Supabase client', {
  url: supabaseUrl,
  hasAnonKey: !!supabaseAnonKey,
  anonKeyLength: supabaseAnonKey?.length,
  environment: import.meta.env.MODE
});

// Create Supabase client with auth configuration
const authConfig = {
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: true
};

debugLogger.log('[SUPABASE]', 'Auth configuration', authConfig);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: authConfig
})

// Log successful client creation
debugLogger.log('[SUPABASE]', 'Supabase client created successfully');

// Set up a listener to log all auth state changes at the Supabase level
supabase.auth.onAuthStateChange((event, session) => {
  debugLogger.info('[SUPABASE]', 'Low-level auth state change', {
    event,
    hasSession: !!session,
    hasUser: !!session?.user,
    userId: session?.user?.id,
    userEmail: session?.user?.email,
    sessionExpiresAt: session?.expires_at,
    timestamp: new Date().toISOString()
  });

  // Log specific details for different events
  switch (event) {
    case 'INITIAL_SESSION':
      debugLogger.log('[SUPABASE]', 'Initial session detected', {
        hasSession: !!session,
        userId: session?.user?.id
      });
      break;
    
    case 'SIGNED_IN':
      debugLogger.log('[SUPABASE]', 'User signed in', {
        userId: session?.user?.id,
        email: session?.user?.email,
        provider: session?.user?.app_metadata?.provider
      });
      break;
    
    case 'SIGNED_OUT':
      debugLogger.log('[SUPABASE]', 'User signed out');
      break;
    
    case 'PASSWORD_RECOVERY':
      debugLogger.info('[SUPABASE]', 'Password recovery event', {
        userId: session?.user?.id,
        email: session?.user?.email,
        hasAccessToken: !!session?.access_token,
        hasRefreshToken: !!session?.refresh_token
      });
      break;
    
    case 'TOKEN_REFRESHED':
      debugLogger.log('[SUPABASE]', 'Token refreshed', {
        userId: session?.user?.id,
        expiresAt: session?.expires_at
      });
      break;
    
    case 'USER_UPDATED':
      debugLogger.log('[SUPABASE]', 'User updated', {
        userId: session?.user?.id,
        email: session?.user?.email
      });
      break;
    
    default:
      debugLogger.warn('[SUPABASE]', `Unknown auth event: ${event}`, {
        hasSession: !!session
      });
  }
});

// Also log any auth errors
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' && session === null) {
    // Check if there was an error
    supabase.auth.getSession().then(({ error }) => {
      if (error) {
        debugLogger.error('[SUPABASE]', 'Auth error detected', {
          error: error.message,
          errorCode: (error as any).code,
          errorStatus: (error as any).status
        });
      }
    });
  }
});

// Log when the Supabase client is ready
debugLogger.log('[SUPABASE]', 'Supabase client initialization complete', {
  timestamp: new Date().toISOString()
});

// Database Types
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          username: string
          level: number
          total_xp: number
          coins: number
          gems: number
          created_at: string
          last_active: string
          preferences: UserPreferences
        }
        Insert: {
          id: string
          email: string
          username: string
          level?: number
          total_xp?: number
          coins?: number
          gems?: number
          created_at?: string
          last_active?: string
          preferences?: UserPreferences
        }
        Update: {
          id?: string
          email?: string
          username?: string
          level?: number
          total_xp?: number
          coins?: number
          gems?: number
          created_at?: string
          last_active?: string
          preferences?: UserPreferences
        }
      }
      decks: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string
          card_count: number
          is_public: boolean
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          settings: any
          created_at: string
          updated_at: string
          tags: string[]
          category: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description: string
          card_count?: number
          is_public?: boolean
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          settings?: any
          created_at?: string
          updated_at?: string
          tags?: string[]
          category?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string
          card_count?: number
          is_public?: boolean
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          settings?: any
          created_at?: string
          updated_at?: string
          tags?: string[]
          category?: string
        }
      }
      cards: {
        Row: {
          id: string
          deck_id: string
          front_content: string
          back_content: string
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          card_type: any
          state: string
          due: number
          interval_days: number
          ease_factor: number
          review_count: number
          lapse_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          deck_id: string
          front_content: string
          back_content: string
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          card_type?: any
          state?: string
          due?: number
          interval_days?: number
          ease_factor?: number
          review_count?: number
          lapse_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          deck_id?: string
          front_content?: string
          back_content?: string
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          card_type?: any
          state?: string
          due?: number
          interval_days?: number
          ease_factor?: number
          review_count?: number
          lapse_count?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  language: string
  notifications: boolean
  soundEffects: boolean
  dailyGoal: number
  timezone: string
}