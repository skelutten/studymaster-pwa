// Simple authentication test script
async function testAuth() {
  const baseUrl = 'http://localhost:3001/api/auth';
  
  console.log('🔐 Testing Authentication Security');
  console.log('=====================================');
  
  try {
    // Test 1: Valid login with correct credentials
    console.log('\n1️⃣ Testing valid login (gurka@gurka.com / gurka)...');
    const validLogin = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: 'gurka@gurka.com', 
        password: 'gurka' 
      })
    });
    
    const validResult = await validLogin.json();
    console.log(`Status: ${validLogin.status}`);
    console.log(`Response:`, validResult);
    console.log(validLogin.status === 200 && validResult.success ? '✅ PASS' : '❌ FAIL');
    
    // Test 2: Invalid login with wrong password  
    console.log('\n2️⃣ Testing invalid login (gurka@gurka.com / wrongpassword)...');
    const invalidLogin = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: 'gurka@gurka.com', 
        password: 'wrongpassword' 
      })
    });
    
    const invalidResult = await invalidLogin.json();
    console.log(`Status: ${invalidLogin.status}`);
    console.log(`Response:`, invalidResult);
    console.log(invalidLogin.status === 401 && !invalidResult.success ? '✅ PASS' : '❌ FAIL');
    
    // Test 3: Non-existent user
    console.log('\n3️⃣ Testing non-existent user (fake@fake.com / password)...');
    const nonExistentLogin = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: 'fake@fake.com', 
        password: 'password' 
      })
    });
    
    const nonExistentResult = await nonExistentLogin.json();
    console.log(`Status: ${nonExistentLogin.status}`);
    console.log(`Response:`, nonExistentResult);
    console.log(nonExistentLogin.status === 401 && !nonExistentResult.success ? '✅ PASS' : '❌ FAIL');
    
    console.log('\n🎉 Authentication tests completed!');
    
  } catch (error) {
    console.error('❌ Error testing authentication:', error);
    console.log('Make sure the server is running on port 3001');
  }
}

testAuth();