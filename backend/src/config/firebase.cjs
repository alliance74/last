const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin
let app;

try {
  if (admin.apps.length === 0) {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set');
    }
    
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://rizzchatt-a9bea.firebaseio.com'
    });
  } else {
    app = admin.app();
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
  throw new Error('Failed to initialize Firebase. Please check your service account configuration.');
}

// Get Firestore and Auth instances
const db = admin.firestore();
const auth = admin.auth();

// Export Firebase services
module.exports = { admin, db, auth };
