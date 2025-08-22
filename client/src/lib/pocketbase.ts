// Official PocketBase SDK Implementation
import PocketBase from 'pocketbase'

import { debugLogger } from '../utils/debugLogger'

const pocketbaseUrl = import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090'

// Log PocketBase initialization details
debugLogger.log('[POCKETBASE]', 'Initializing PocketBase client', {
  url: pocketbaseUrl,
  environment: import.meta.env.MODE
});

// Create PocketBase client with official SDK
export const pb = new PocketBase(pocketbaseUrl)

// Log successful client creation
debugLogger.log('[POCKETBASE]', 'PocketBase client created successfully');

// Set up a listener to log all auth state changes at the PocketBase level
pb.authStore.onChange((token, record) => {
  debugLogger.info('[POCKETBASE]', 'Low-level auth state change', {
    hasToken: !!token,
    hasRecord: !!record,
    userId: record?.id,
    userEmail: record?.email,
    timestamp: new Date().toISOString()
  });

  // Log specific details for different states
  if (token && record) {
    debugLogger.log('[POCKETBASE]', 'User authenticated', {
      userId: record.id,
      email: record.email,
      username: record.username
    });
  } else if (!token && !record) {
    debugLogger.log('[POCKETBASE]', 'User signed out');
  }
});

// Log when the PocketBase client is ready
debugLogger.log('[POCKETBASE]', 'PocketBase client initialization complete', {
  timestamp: new Date().toISOString()
});

// PocketBase Collections Structure
export interface PocketBaseCollections {
  users: {
    id: string
    email: string
    username: string
    level: number
    total_xp: number
    coins: number
    gems: number
    last_active: string
    preferences: UserPreferences
    created: string
    updated: string
  }
  
  decks: {
    id: string
    user_id: string
    title: string
    description: string
    card_count: number
    is_public: boolean
    settings: Record<string, unknown>
    tags: string[]
    category: string
    created: string
    updated: string
  }
  
  cards: {
    id: string
    deck_id: string
    front_content: string
    back_content: string
    card_type: Record<string, unknown>
    state: string
    due: number
    interval_days: number
    ease_factor: number
    review_count: number
    lapse_count: number
    created: string
    updated: string
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

// Type-safe collection helpers
export const collections = {
  users: () => pb.collection('users'),
  decks: () => pb.collection('decks'),
  cards: () => pb.collection('cards')
}

// Export PocketBase client as default
export default pb