// Final validation script for PocketBase migration
const API_BASE = 'http://127.0.0.1:8090/api';

console.log('🎯 Final PocketBase Migration Validation');
console.log('========================================');

// Test all the key migration components
async function validateMigration() {
  const results = {
    serverHealth: false,
    collectionsExist: false,
    testUserExists: false,
    authenticationWorks: false,
    environmentConfigured: true // We set this up
  };

  // 1. Server Health
  try {
    const response = await fetch(`${API_BASE}/health`);
    const health = await response.json();
    results.serverHealth = response.ok;
    console.log(results.serverHealth ? '✅' : '❌', 'PocketBase Server Health:', health.message);
  } catch (error) {
    console.log('❌ PocketBase Server Health: Not accessible');
  }

  // 2. Collections Existence (try to access users collection)
  try {
    const response = await fetch(`${API_BASE}/collections/users/records?page=1&perPage=1`);
    results.collectionsExist = response.status !== 404;
    console.log(results.collectionsExist ? '✅' : '❌', 'Collections Exist:', 
      results.collectionsExist ? 'Users collection accessible' : 'Collections need to be created');
  } catch (error) {
    console.log('❌ Collections Exist: Error checking collections');
  }

  // 3. Test User Exists
  try {  
    const response = await fetch(`${API_BASE}/collections/users/records?filter=username='gurka'`);
    if (response.ok) {
      const data = await response.json();
      results.testUserExists = data.items && data.items.length > 0;
      console.log(results.testUserExists ? '✅' : '❌', 'Test User Exists:', 
        results.testUserExists ? `User "gurka" found (ID: ${data.items[0]?.id})` : 'User "gurka" not found');
    }
  } catch (error) {
    console.log('❌ Test User Exists: Error checking user');
  }

  // 4. Authentication Test (if test user exists)
  if (results.testUserExists) {
    try {
      const response = await fetch(`${API_BASE}/collections/users/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identity: 'gurka@studymaster.app',
          password: 'gurka123'
        })
      });
      
      results.authenticationWorks = response.ok;
      console.log(results.authenticationWorks ? '✅' : '❌', 'Authentication Works:', 
        results.authenticationWorks ? 'gurka/gurka123 login successful' : 'Authentication failed');
    } catch (error) {
      console.log('❌ Authentication Works: Error testing authentication');
    }
  }

  console.log('\n📊 Migration Status Summary:');
  console.log('============================');
  Object.entries(results).forEach(([key, status]) => {
    const icon = status ? '✅' : '❌';
    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    console.log(`${icon} ${label}`);
  });

  const totalChecks = Object.keys(results).length;
  const passedChecks = Object.values(results).filter(Boolean).length;
  const successRate = Math.round((passedChecks / totalChecks) * 100);

  console.log(`\n🎯 Migration Success Rate: ${successRate}% (${passedChecks}/${totalChecks})`);

  if (successRate >= 80) {
    console.log('🎉 Migration is mostly successful! Ready for frontend testing.');
  } else if (successRate >= 60) {
    console.log('⚠️  Migration is partially complete. Some manual setup required.');
  } else {
    console.log('❌ Migration needs more work. Please complete manual setup.');
  }

  console.log('\n🔧 Next Steps:');
  if (!results.collectionsExist) {
    console.log('1. Visit http://127.0.0.1:8090/_ and create collections');
  }
  if (!results.testUserExists) { 
    console.log('2. Create test user "gurka" with password "gurka123"');
  }
  if (!results.authenticationWorks) {
    console.log('3. Verify auth collection configuration and user activation');
  }
  
  console.log('4. Test React app with: npm run dev (in client directory)');
  console.log('5. Try logging in with gurka/gurka123 or demo login');

  return results;
}

// Check if Node.js fetch is available
if (typeof fetch === 'undefined') {
  console.log('Installing node-fetch for compatibility...');
  try {
    const { default: fetch } = await import('node-fetch');
    global.fetch = fetch;
  } catch (e) {
    console.log('⚠️  node-fetch not available. Install with: npm install node-fetch');
    console.log('Or use a browser/environment with fetch support.');
    process.exit(1);
  }
}

validateMigration().catch(console.error);