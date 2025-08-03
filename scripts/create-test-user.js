const API_BASE = "http://127.0.0.1:8090/api";

console.log("🧪 Creating Test User in PocketBase");
console.log("===================================");

async function createTestUser() {
  const userData = {
    username: "gurka",
    email: "gurka@studymaster.app", 
    password: "gurka123",
    passwordConfirm: "gurka123",
    level: 5,
    total_xp: 2500,
    coins: 150,
    gems: 25,
    last_active: new Date().toISOString(),
    preferences: {
      theme: "system",
      language: "en",
      notifications: true,
      soundEffects: true,
      dailyGoal: 50,
      timezone: "UTC"
    }
  };
  
  console.log("Creating user gurka...");
  
  try {
    const response = await fetch(`${API_BASE}/collections/users/records`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(userData)
    });
    
    const data = await response.json();
    
    console.log("Status:", response.status);
    console.log("Response:", data);
    
    if (response.status === 200) {
      console.log("✅ Test user created successfully\!");
      console.log("   Username: gurka");
      console.log("   Email: gurka@studymaster.app");
      console.log("   Password: gurka123");
      console.log("   User ID:", data.id);
      return true;
    } else {
      console.log("❌ Failed to create user");
      console.log("   Error:", data.message || "Unknown error");
      return false;
    }
    
  } catch (error) {
    console.log("❌ Request failed:", error.message);
    return false;
  }
}

async function testAuthentication() {
  console.log("\n🔐 Testing authentication with gurka...");
  
  try {
    const response = await fetch(`${API_BASE}/collections/users/auth-with-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        identity: "gurka",
        password: "gurka123"
      })
    });
    
    const data = await response.json();
    
    console.log("Auth Status:", response.status);
    
    if (response.status === 200) {
      console.log("✅ Authentication successful\!");
      console.log("   Token length:", data.token?.length || 0);
      console.log("   User:", data.record?.username);
      console.log("   Level:", data.record?.level);
      return true;
    } else {
      console.log("❌ Authentication failed");
      console.log("   Error:", data.message || "Unknown error");
      return false;
    }
    
  } catch (error) {
    console.log("❌ Auth request failed:", error.message);
    return false;
  }
}

async function main() {
  const userCreated = await createTestUser();
  const authWorked = await testAuthentication();
  
  console.log("\n📊 Results:");
  console.log("   User Creation:", userCreated ? "✅ Success" : "❌ Failed");
  console.log("   Authentication:", authWorked ? "✅ Success" : "❌ Failed");
  
  if (userCreated && authWorked) {
    console.log("\n🎉 PocketBase setup is working\!");
    console.log("   Try logging in with gurka/gurka123 in your React app");
  } else {
    console.log("\n⚠️  Manual setup may be needed through admin interface");
  }
}

main().catch(console.error);
