// Simple CommonJS script to test PocketBase and create test user
const https = require('https');
const http = require('http');

const API_BASE = 'http://127.0.0.1:8090/api';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = {
            status: res.statusCode,
            data: data ? JSON.parse(data) : null
          };
          resolve(result);
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testConnection() {
  try {
    console.log('🔍 Testing PocketBase connection...');
    const result = await makeRequest(`${API_BASE}/health`);
    
    if (result.status === 200) {
      console.log('✅ PocketBase is healthy:', result.data.message);
      return true;
    } else {
      console.log('❌ PocketBase health check failed:', result.status);
      return false;
    }
  } catch (error) {
    console.error('❌ PocketBase is not accessible:', error.message);
    return false;
  }
}

async function testUserCreation() {
  try {
    console.log('🧪 Testing user creation endpoint...');
    
    const userData = JSON.stringify({
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
    });

    const result = await makeRequest(`${API_BASE}/collections/users/records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(userData)
      },
      body: userData
    });

    if (result.status === 200 || result.status === 201) {
      console.log('✅ Test user "gurka" created successfully!');
      console.log('User ID:', result.data.id);
      return result.data;
    } else {
      console.log('⚠️  Could not create user via API:', result.status);
      console.log('Response:', result.data);
      
      if (result.status === 404) {
        console.log('📝 Collections might not exist yet. Please create them manually.');
      }
      
      return null;
    }
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
    return null;
  }
}

async function testAuthentication() {
  try {
    console.log('🔐 Testing authentication with gurka/gurka123...');
    
    const authData = JSON.stringify({
      identity: 'gurka',
      password: 'gurka123'
    });

    const result = await makeRequest(`${API_BASE}/collections/users/auth-with-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(authData)
      },
      body: authData
    });

    if (result.status === 200) {
      console.log('✅ Authentication successful!');
      console.log('User:', result.data.record.username);
      console.log('Token length:', result.data.token.length);
      return true;
    } else {
      console.log('❌ Authentication failed:', result.status);
      console.log('Response:', result.data);
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing authentication:', error.message);
    return false;
  }
}

async function main() {
  console.log('🔧 PocketBase Setup and Testing');
  console.log('===============================');
  
  // Test basic connectivity
  const isHealthy = await testConnection();
  if (!isHealthy) {
    console.log('\n❌ Please start PocketBase server first:');
    console.log('cd pocketbase && ./pocketbase.exe serve --dev');
    return;
  }
  
  // Try to create test user
  const user = await testUserCreation();
  
  // If user creation was successful, test authentication
  if (user) {
    await testAuthentication();
  }
  
  console.log('\n📝 Manual Setup Instructions:');
  console.log('1. Visit http://127.0.0.1:8090/_');
  console.log('2. Log in with daniel6651@gmail.com / gulligull123');
  console.log('3. Create collections using the PocketBase admin interface:');
  console.log('');
  console.log('   📁 Users Collection (Auth):');
  console.log('   - username (text, required, unique)');
  console.log('   - level (number, default: 1)');
  console.log('   - total_xp (number, default: 0)');
  console.log('   - coins (number, default: 100)');
  console.log('   - gems (number, default: 10)');
  console.log('   - last_active (date)');
  console.log('   - preferences (json)');
  console.log('');
  console.log('   📁 Decks Collection:');
  console.log('   - user_id (relation to users)');
  console.log('   - title (text, required)');
  console.log('   - description (text)');
  console.log('   - card_count (number, default: 0)');
  console.log('   - is_public (bool, default: false)');
  console.log('   - settings (json)');
  console.log('   - tags (json)');
  console.log('   - category (text)');
  console.log('');
  console.log('   📁 Cards Collection:');
  console.log('   - deck_id (relation to decks)');
  console.log('   - front_content (text, required)');
  console.log('   - back_content (text, required)');
  console.log('   - card_type (json)');
  console.log('   - state (select: new, learning, review, etc.)');
  console.log('   - due (number)');
  console.log('   - interval_days (number)');
  console.log('   - ease_factor (number)');
  console.log('   - review_count (number)');
  console.log('   - lapse_count (number)');
  console.log('');
  console.log('4. Create test user "gurka" with password "gurka123"');
  console.log('5. Test authentication in the React app');
}

main().catch(console.error);