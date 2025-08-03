// Temporary PocketBase client implementation
// TODO: Replace with 'import PocketBase from "pocketbase"' after npm install
/* eslint-disable @typescript-eslint/no-unused-vars */
class SimplePocketBase {
  baseUrl: string
  authStore: {
    token: string | null
    model: Record<string, unknown> | null
    isValid: boolean
    onChange: (callback: (token: string | null, model: Record<string, unknown> | null) => void) => void
    clear: () => void
  }

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
    this.authStore = {
      token: null,
      model: null,
      isValid: false,
      onChange: (_callback: (token: string | null, model: Record<string, unknown> | null) => void) => {
        // Simple implementation - in real PocketBase this would be more sophisticated
      },
      clear: () => {
        this.authStore.token = null
        this.authStore.model = null
        this.authStore.isValid = false
      }
    }
  }

  collection(name: string) {
    return {
      create: async (data: Record<string, unknown>) => {
        const response = await fetch(`${this.baseUrl}/api/collections/${name}/records`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        return response.json()
      },
      
      getOne: async (id: string, _options?: Record<string, unknown>) => {
        const response = await fetch(`${this.baseUrl}/api/collections/${name}/records/${id}`)
        return response.json()
      },
      
      getList: async (page = 1, perPage = 30, _options?: Record<string, unknown>) => {
        const response = await fetch(`${this.baseUrl}/api/collections/${name}/records?page=${page}&perPage=${perPage}`)
        return response.json()
      },
      
      update: async (id: string, data: Record<string, unknown>) => {
        const response = await fetch(`${this.baseUrl}/api/collections/${name}/records/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        return response.json()
      },
      
      delete: async (id: string) => {
        const response = await fetch(`${this.baseUrl}/api/collections/${name}/records/${id}`, {
          method: 'DELETE'
        })
        return response.ok
      },
      
      authWithPassword: async (usernameOrEmail: string, password: string) => {
        const response = await fetch(`${this.baseUrl}/api/collections/${name}/auth-with-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identity: usernameOrEmail,
            password: password
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          this.authStore.token = data.token
          this.authStore.model = data.record
          this.authStore.isValid = true
          return data
        } else {
          throw new Error('Authentication failed')
        }
      },
      
      requestPasswordReset: async (email: string) => {
        const response = await fetch(`${this.baseUrl}/api/collections/${name}/request-password-reset`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        })
        return response.json()
      }
    }
  }
}

import { debugLogger } from '../utils/debugLogger'

const pocketbaseUrl = import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090'

// Log PocketBase initialization details
debugLogger.log('[POCKETBASE]', 'Initializing PocketBase client', {
  url: pocketbaseUrl,
  environment: import.meta.env.MODE
});

// Create PocketBase client
export const pb = new SimplePocketBase(pocketbaseUrl)

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
export default SimplePocketBase