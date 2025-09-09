const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

// Initialize Firebase Admin
let app;
let db;

try {
  if (admin.apps.length === 0) {
    // Path to service account file
    const serviceAccountPath = path.join(__dirname, '../../config/service-account.json');

    // Check if service account file exists
    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error('Firebase service account file not found. Please make sure config/service-account.json exists.');
    }

    // Initialize Firebase Admin SDK with service account file
    const serviceAccount = require(serviceAccountPath);

    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: 'https://rizzchatt-a9bea.firebaseio.com' // Using the actual database URL
    });
    
    // Initialize Firestore
    db = admin.firestore();
    
    console.log('Firebase Admin SDK initialized successfully');
  } else {
    app = admin.app();
    db = admin.firestore();
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
  process.exit(1); // Exit process with error
}

const auth = admin.auth(app);

// Export Firebase services
module.exports = { admin, db, auth };
