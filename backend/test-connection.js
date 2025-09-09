const { admin, db } = require('./src/config/firebase-simple');

async function testConnection() {
  try {
    console.log('Testing Firebase connection...');
    
    // Test Firestore connection
    const snapshot = await db.collection('test').limit(1).get();
    console.log('✅ Successfully connected to Firestore');
    
    // Test Auth connection
    const auth = admin.auth();
    const users = await auth.listUsers(1);
    console.log('✅ Successfully connected to Firebase Auth');
    
    console.log('\n🎉 All tests passed! Your Firebase connection is working correctly.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    process.exit(1);
  }
}

testConnection();
