import admin from 'firebase-admin';

// This file should only be imported on the server.

const firebaseConfig = {
  "projectId": "studio-9073256923-aa22b",
};

if (!admin.apps.length) {
  admin.initializeApp({
    // projectId is the only value needed for server-side authentication in this environment
    projectId: firebaseConfig.projectId,
  });
}

const adminDb = admin.firestore();

export { adminDb };
