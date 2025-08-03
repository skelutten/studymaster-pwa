const API_BASE = "http://127.0.0.1:8090/api";

console.log("🔐 Testing PocketBase Authentication");
console.log("====================================");

async function testAuth() {
  const credentials = [
    { identity: "gurka", password: "gurka123" },
    { identity: "gurka@studymaster.app", password: "gurka123" },
    { identity: "daniel6651@gmail.com", password: "gulligull123" }
  ];
  
  for (const cred of credentials) {
    console.log(`\nTrying ${cred.identity}...`);
    
    try {
      const response = await fetch(`${API_BASE}/collections/users/auth-with-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cred)
      });
      
      const data = await response.json();
      
      if (response.status === 200) {
        console.log("✅ SUCCESS\!");
        console.log("   User:", data.record?.username || data.record?.email);
        console.log("   Level:", data.record?.level || "N/A");
        console.log("   Token exists:", \!\!data.token);
        return true;
      } else {
        console.log("❌ Failed:", data.message);
      }
    } catch (error) {
      console.log("❌ Error:", error.message);
    }
  }
  
  return false;
}

testAuth().then(success => {
  if (success) {
    console.log("\n🎉 PocketBase authentication is working\!");
    console.log("You can now test in your React app.");
  } else {
    console.log("\n⚠️  No valid credentials found.");
    console.log("You may need to create users through the admin interface.");
  }
});
