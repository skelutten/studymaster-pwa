// PocketBase Setup and Migration Script
// This script creates the necessary collections and initial data for the StudyMaster app

import PocketBase from 'pocketbase'

const pb = new PocketBase('http://127.0.0.1:8090')

// Admin credentials - loaded from environment variables
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@example.com'
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD

async function setupPocketBase() {
  try {
    console.log('🚀 Starting PocketBase setup...')
    
    // Check required environment variables
    if (!ADMIN_PASSWORD) {
      throw new Error('POCKETBASE_ADMIN_PASSWORD environment variable is required')
    }
    
    // Authenticate as admin
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD)
    console.log('✅ Admin authenticated')
    
    // Create collections
    await createCollections()
    
    // Create test user
    await createTestUser()
    
    console.log('🎉 PocketBase setup completed successfully!')
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message)
    
    // If admin doesn't exist, create one
    if (error.message.includes('Failed to authenticate')) {
      console.log('📝 Creating admin account...')
      try {
        await pb.admins.create({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          passwordConfirm: ADMIN_PASSWORD
        })
        console.log('✅ Admin account created')
        
        // Retry setup
        await setupPocketBase()
      } catch (createError) {
        console.error('❌ Failed to create admin:', createError.message)
      }
    }
  }
}

async function createCollections() {
  console.log('📋 Creating collections...')
  
  // Users collection (auth collection)
  try {
    await pb.collections.create({
      name: 'users',
      type: 'auth',
      schema: [
        {
          name: 'username',
          type: 'text',
          required: true,
          options: {
            min: 3,
            max: 50,
            pattern: '^[a-zA-Z0-9_]+$'
          }
        },
        {
          name: 'level',
          type: 'number',
          required: false,
          options: {
            min: 1,
            max: 999
          }
        },
        {
          name: 'total_xp',
          type: 'number',
          required: false,
          options: {
            min: 0
          }
        },
        {
          name: 'coins',
          type: 'number',
          required: false,
          options: {
            min: 0
          }
        },
        {
          name: 'gems',
          type: 'number',
          required: false,
          options: {
            min: 0
          }
        },
        {
          name: 'last_active',
          type: 'date',
          required: false
        },
        {
          name: 'preferences',
          type: 'json',
          required: false
        }
      ],
      listRule: 'id = @request.auth.id',
      viewRule: 'id = @request.auth.id',
      createRule: '',
      updateRule: 'id = @request.auth.id',
      deleteRule: 'id = @request.auth.id'
    })
    console.log('✅ Users collection created')
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Users collection already exists')
    } else {
      console.error('❌ Failed to create users collection:', error.message)
    }
  }
  
  // Decks collection
  try {
    await pb.collections.create({
      name: 'decks',
      type: 'base',
      schema: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          options: {
            collectionId: 'users',
            cascadeDelete: true,
            maxSelect: 1
          }
        },
        {
          name: 'title',
          type: 'text',
          required: true,
          options: {
            min: 1,
            max: 200
          }
        },
        {
          name: 'description',
          type: 'text',
          required: false,
          options: {
            max: 1000
          }
        },
        {
          name: 'card_count',
          type: 'number',
          required: false,
          options: {
            min: 0
          }
        },
        {
          name: 'is_public',
          type: 'bool',
          required: false
        },
        {
          name: 'settings',
          type: 'json',
          required: false
        },
        {
          name: 'tags',
          type: 'json',
          required: false
        },
        {
          name: 'category',
          type: 'text',
          required: false,
          options: {
            max: 100
          }
        }
      ],
      listRule: 'user_id = @request.auth.id || is_public = true',
      viewRule: 'user_id = @request.auth.id || is_public = true',
      createRule: 'user_id = @request.auth.id',
      updateRule: 'user_id = @request.auth.id',
      deleteRule: 'user_id = @request.auth.id'
    })
    console.log('✅ Decks collection created')
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Decks collection already exists')
    } else {
      console.error('❌ Failed to create decks collection:', error.message)
    }
  }
  
  // Cards collection
  try {
    await pb.collections.create({
      name: 'cards',
      type: 'base',
      schema: [
        {
          name: 'deck_id',
          type: 'relation',
          required: true,
          options: {
            collectionId: 'decks',
            cascadeDelete: true,
            maxSelect: 1
          }
        },
        {
          name: 'front_content',
          type: 'text',
          required: true,
          options: {
            min: 1,
            max: 5000
          }
        },
        {
          name: 'back_content',
          type: 'text',
          required: true,
          options: {
            min: 1,
            max: 5000
          }
        },
        {
          name: 'card_type',
          type: 'json',
          required: false
        },
        {
          name: 'state',
          type: 'select',
          required: false,
          options: {
            values: ['new', 'learning', 'review', 'relearning', 'suspended', 'buried'],
            maxSelect: 1
          }
        },
        {
          name: 'due',
          type: 'number',
          required: false
        },
        {
          name: 'interval_days',
          type: 'number',
          required: false
        },
        {
          name: 'ease_factor',
          type: 'number',
          required: false
        },
        {
          name: 'review_count',
          type: 'number',
          required: false,
          options: {
            min: 0
          }
        },
        {
          name: 'lapse_count',
          type: 'number',
          required: false,
          options: {
            min: 0
          }
        }
      ],
      listRule: '@request.auth.id != "" && @collection.decks.user_id ?= @request.auth.id',
      viewRule: '@request.auth.id != "" && @collection.decks.user_id ?= @request.auth.id',
      createRule: '@request.auth.id != "" && @collection.decks.user_id ?= @request.auth.id',
      updateRule: '@request.auth.id != "" && @collection.decks.user_id ?= @request.auth.id',
      deleteRule: '@request.auth.id != "" && @collection.decks.user_id ?= @request.auth.id'
    })
    console.log('✅ Cards collection created')
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Cards collection already exists')
    } else {
      console.error('❌ Failed to create cards collection:', error.message)
    }
  }
}

async function createTestUser() {
  console.log('👤 Creating test user...')
  
  try {
    const user = await pb.collection('users').create({
      username: 'demo_user',
      email: 'demo@studymaster.app',
      password: process.env.DEMO_USER_PASSWORD || 'demo123456',
      passwordConfirm: process.env.DEMO_USER_PASSWORD || 'demo123456',
      level: 5,
      total_xp: 2500,
      coins: 150,
      gems: 25,
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
    
    console.log('✅ Test user "demo_user" created with ID:', user.id)
    
    // Create a sample deck for the test user
    const deck = await pb.collection('decks').create({
      user_id: user.id,
      title: 'Sample Spanish Vocabulary',
      description: 'Basic Spanish words for beginners',
      card_count: 2,
      is_public: false,
      settings: {
        newCardsPerDay: 20,
        maxReviewsPerDay: 200,
        easyBonus: 1.3,
        intervalModifier: 1.0,
        maximumInterval: 36500,
        minimumInterval: 1
      },
      tags: ['spanish', 'vocabulary', 'beginner'],
      category: 'language'
    })
    
    console.log('✅ Sample deck created with ID:', deck.id)
    
    // Create sample cards
    await pb.collection('cards').create({
      deck_id: deck.id,
      front_content: 'Hello',
      back_content: 'Hola',
      card_type: { type: 'basic' },
      state: 'new',
      due: 0,
      interval_days: 0,
      ease_factor: 2500,
      review_count: 0,
      lapse_count: 0
    })
    
    await pb.collection('cards').create({
      deck_id: deck.id,
      front_content: 'Goodbye',
      back_content: 'Adiós',
      card_type: { type: 'basic' },
      state: 'new',
      due: 0,
      interval_days: 0,
      ease_factor: 2500,
      review_count: 0,
      lapse_count: 0
    })
    
    console.log('✅ Sample cards created')
    
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Test user "demo_user" already exists')
    } else {
      console.error('❌ Failed to create test user:', error.message)
    }
  }
}

// Run setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupPocketBase()
}

export { setupPocketBase }