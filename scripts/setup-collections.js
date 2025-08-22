// PocketBase Collections Setup Script
const API_BASE = 'http://127.0.0.1:8090/api';

console.log('🔧 PocketBase Collections Setup');
console.log('===============================');

// Admin credentials
const ADMIN_EMAIL = 'daniel6651@gmail.com';
const ADMIN_PASSWORD = 'gulligull123';

let adminToken = null;

async function makeRequest(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (adminToken) {
    headers['Authorization'] = `Bearer ${adminToken}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers
  });
  
  const data = await response.json();
  return { status: response.status, data };
}

async function adminLogin() {
  console.log('🔐 Logging in as admin...');
  
  const result = await makeRequest(`${API_BASE}/admins/auth-with-password`, {
    method: 'POST',
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    })
  });
  
  if (result.status === 200) {
    adminToken = result.data.token;
    console.log('✅ Admin login successful');
    return true;
  } else {
    console.log('❌ Admin login failed:', result.data);
    return false;
  }
}

async function createUsersCollection() {
  console.log('👥 Creating Users auth collection...');
  
  const collectionSchema = {
    name: 'users',
    type: 'auth',
    schema: [
      {
        name: 'level',
        type: 'number',
        required: false,
        options: {
          min: 1,
          noDecimal: true
        }
      },
      {
        name: 'total_xp',
        type: 'number',
        required: false,
        options: {
          min: 0,
          noDecimal: true
        }
      },
      {
        name: 'coins',
        type: 'number',
        required: false,
        options: {
          min: 0,
          noDecimal: true
        }
      },
      {
        name: 'gems',
        type: 'number',
        required: false,
        options: {
          min: 0,
          noDecimal: true
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
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != "" && (@request.auth.id = id || @collection.users.id ?= @request.auth.id)',
    createRule: '',
    updateRule: '@request.auth.id = id',
    deleteRule: '@request.auth.id = id',
    options: {
      allowEmailAuth: true,
      allowUsernameAuth: true,
      allowOAuth2Auth: false,
      requireEmail: true,
      exceptEmailDomains: [],
      onlyEmailDomains: [],
      minPasswordLength: 6
    }
  };
  
  const result = await makeRequest(`${API_BASE}/collections`, {
    method: 'POST',
    body: JSON.stringify(collectionSchema)
  });
  
  if (result.status === 200) {
    console.log('✅ Users collection created successfully');
    return true;
  } else if (result.status === 400 && result.data.message?.includes('already exists')) {
    console.log('ℹ️  Users collection already exists');
    return true;
  } else {
    console.log('❌ Failed to create Users collection:', result.data);
    return false;
  }
}

async function createDecksCollection() {
  console.log('📚 Creating Decks collection...');
  
  const collectionSchema = {
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
          minSelect: 1,
          maxSelect: 1,
          displayFields: ['username', 'email']
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
          min: 0,
          noDecimal: true
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
    listRule: '@request.auth.id != "" && (user_id = @request.auth.id || is_public = true)',
    viewRule: '@request.auth.id != "" && (user_id = @request.auth.id || is_public = true)',
    createRule: '@request.auth.id != "" && user_id = @request.auth.id',
    updateRule: '@request.auth.id != "" && user_id = @request.auth.id',
    deleteRule: '@request.auth.id != "" && user_id = @request.auth.id'
  };
  
  const result = await makeRequest(`${API_BASE}/collections`, {
    method: 'POST',
    body: JSON.stringify(collectionSchema)
  });
  
  if (result.status === 200) {
    console.log('✅ Decks collection created successfully');
    return true;
  } else if (result.status === 400 && result.data.message?.includes('already exists')) {
    console.log('ℹ️  Decks collection already exists');
    return true;
  } else {
    console.log('❌ Failed to create Decks collection:', result.data);
    return false;
  }
}

async function createCardsCollection() {
  console.log('🃏 Creating Cards collection...');
  
  const collectionSchema = {
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
          minSelect: 1,
          maxSelect: 1,
          displayFields: ['title']
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
          maxSelect: 1,
          values: ['new', 'learning', 'review', 'graduated', 'relearning']
        }
      },
      {
        name: 'due',
        type: 'number',
        required: false,
        options: {
          min: 0,
          noDecimal: true
        }
      },
      {
        name: 'interval_days',
        type: 'number',
        required: false,
        options: {
          min: 0
        }
      },
      {
        name: 'ease_factor',
        type: 'number',
        required: false,
        options: {
          min: 1.3,
          max: 3.0
        }
      },
      {
        name: 'review_count',
        type: 'number',
        required: false,
        options: {
          min: 0,
          noDecimal: true
        }
      },
      {
        name: 'lapse_count',
        type: 'number',
        required: false,
        options: {
          min: 0,
          noDecimal: true
        }
      }
    ],
    listRule: '@request.auth.id != "" && @collection.decks.id ?= deck_id && (@collection.decks.user_id ?= @request.auth.id || @collection.decks.is_public ?= true)',
    viewRule: '@request.auth.id != "" && @collection.decks.id ?= deck_id && (@collection.decks.user_id ?= @request.auth.id || @collection.decks.is_public ?= true)',
    createRule: '@request.auth.id != "" && @collection.decks.id ?= deck_id && @collection.decks.user_id ?= @request.auth.id',
    updateRule: '@request.auth.id != "" && @collection.decks.id ?= deck_id && @collection.decks.user_id ?= @request.auth.id',
    deleteRule: '@request.auth.id != "" && @collection.decks.id ?= deck_id && @collection.decks.user_id ?= @request.auth.id'
  };
  
  const result = await makeRequest(`${API_BASE}/collections`, {
    method: 'POST',
    body: JSON.stringify(collectionSchema)
  });
  
  if (result.status === 200) {
    console.log('✅ Cards collection created successfully');
    return true;
  } else if (result.status === 400 && result.data.message?.includes('already exists')) {
    console.log('ℹ️  Cards collection already exists');
    return true;
  } else {
    console.log('❌ Failed to create Cards collection:', result.data);
    return false;
  }
}

async function createTestUser() {
  console.log('🧪 Creating test user gurka...');
  
  const userData = {
    username: 'gurka',
    email: 'gurka@studymaster.app',
    password: 'gurka123',
    passwordConfirm: 'gurka123',
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
  };
  
  const result = await makeRequest(`${API_BASE}/collections/users/records`, {
    method: 'POST',
    body: JSON.stringify(userData)
  });
  
  if (result.status === 200) {
    console.log('✅ Test user "gurka" created successfully');
    console.log('   Email: gurka@studymaster.app');
    console.log('   Password: gurka123');
    return true;
  } else if (result.status === 400) {
    console.log('ℹ️  Test user might already exist or validation failed');
    console.log('   Details:', result.data);
    return false;
  } else {
    console.log('❌ Failed to create test user:', result.data);
    return false;
  }
}

async function main() {
  try {
    // Step 1: Admin login
    const loginSuccess = await adminLogin();
    if (!loginSuccess) {
      console.log('❌ Cannot proceed without admin access');
      return;
    }
    
    console.log('');
    
    // Step 2: Create collections
    const usersSuccess = await createUsersCollection();
    console.log('');
    
    const decksSuccess = await createDecksCollection();
    console.log('');
    
    const cardsSuccess = await createCardsCollection();
    console.log('');
    
    // Step 3: Create test user
    if (usersSuccess) {
      await createTestUser();
    }
    
    console.log('');
    console.log('🎉 PocketBase setup complete!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('1. Test authentication in your React app');
    console.log('2. Try logging in with gurka/gurka123');
    console.log('3. Verify PocketBase is now the primary auth method');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  }
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.log('❌ This script requires Node.js 18+ with fetch support');
  console.log('Or install node-fetch: npm install node-fetch');
  process.exit(1);
}

main().catch(console.error);