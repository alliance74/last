import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin
let app;

try {
  if (admin.apps.length === 0) {
    // For development, you can use the service account file
    // For production, use environment variables
    const serviceAccount = process.env.NODE_ENV === 'production' 
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
      : await import('../firebase-service-account.json', { assert: { type: 'json' } });

    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://your-project-id.firebaseio.com'
    });
  } else {
    app = admin.app();
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
  throw new Error('Failed to initialize Firebase. Please check your service account configuration.');
}

// Get Firestore instance
const db = getFirestore(app);
const auth = admin.auth(app);

// Export Firebase services
export { admin, db, auth };

// Environment variables needed in your .env file:
/*
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
FIREBASE_DATABASE_URL=https://your-project-id.firebaseio.com
*/
