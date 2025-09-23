import admin from 'firebase-admin';

// This file should only be imported on the server.

const firebaseConfig = {
  "projectId": "studio-9073256923-aa22b",
  "appId": "1:117384842882:web:13057eeb9b22473a3b2e9b",
  "apiKey": "AIzaSyDd1oylUOmbhlhPOejWHBVvj7Qay6r81XI",
  "authDomain": "studio-9073256923-aa22b.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "117384842882"
};

if (!admin.apps.length) {
  admin.initializeApp({
    // projectId is the only value needed for server-side authentication
    projectId: firebaseConfig.projectId,
  });
}

const adminDb = admin.firestore();

export { adminDb };
