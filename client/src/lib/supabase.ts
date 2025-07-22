import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
})

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