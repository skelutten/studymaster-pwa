// Simple PocketBase Collections Setup 
const API_BASE = 'http://127.0.0.1:8090/api';

console.log('🔧 Testing PocketBase API Access');
console.log('===============================');

async function testEndpoints() {
  // Test 1: Health check
  console.log('1. Testing health endpoint...');
  try {
    const response = await fetch(`${API_BASE}/health`);
    const data = await response.json();
    console.log('✅ Health:', data.message);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
  }
  
  // Test 2: Try to list collections
  console.log('\n2. Testing collections endpoint...');
  try {
    const response = await fetch(`${API_BASE}/collections`);
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', data);
  } catch (error) {
    console.log('❌ Collections endpoint failed:', error.message);
  }
  
  // Test 3: Try different admin endpoints
  console.log('\n3. Testing admin auth endpoints...');
  
  const adminEndpoints = [
    '/admins/auth-with-password',
    '/admins/auth-via-email',
    '/admin/auth-with-password',
    '/admin/auth-via-email'
  ];
  
  for (const endpoint of adminEndpoints) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: process.env.POCKETBASE_ADMIN_EMAIL || 'admin@example.com',
          password: process.env.POCKETBASE_ADMIN_PASSWORD || 'REPLACE_WITH_ACTUAL_PASSWORD'
        })
      });
      console.log(`${endpoint}: ${response.status}`);
      if (response.status !== 404) {
        const data = await response.json();
        console.log('  Response:', data);
      }
    } catch (error) {
      console.log(`${endpoint}: Error -`, error.message);
    }
  }
  
  // Test 4: Check if users collection already exists
  console.log('\n4. Testing users collection...');
  try {
    const response = await fetch(`${API_BASE}/collections/users/records?page=1&perPage=1`);
    console.log('Users collection status:', response.status);
    if (response.ok) {
      const data = await response.json();
      console.log('Users collection exists, items:', data.items?.length || 0);
    }
  } catch (error) {
    console.log('❌ Users collection test failed:', error.message);
  }
}

testEndpoints().catch(console.error);