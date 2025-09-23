import admin from 'firebase-admin';

// This file should only be imported on the server.

const firebaseConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

if (!admin.apps.length) {
  admin.initializeApp({
    // projectId is the only value needed for server-side authentication in this environment
    projectId: firebaseConfig.projectId,
  });
}

const adminDb = admin.firestore();

export { adminDb };
