import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  "projectId": "studio-9073256923-aa22b",
  "appId": "1:117384842882:web:13057eeb9b22473a3b2e9b",
  "apiKey": "AIzaSyDd1oylUOmbhlhPOejWHBVvj7Qay6r81XI",
  "authDomain": "studio-9073256923-aa22b.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "117384842882"
};


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
