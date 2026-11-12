import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

export const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'storehouse-finance-app',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:175636734866:web:b0cdd7eafee8ef03b8974b',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'storehouse-finance-app.firebasestorage.app',
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyC-abzA14GoWDF9gxJFYpr3K6FpZzD4hCY',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'storehouse-finance-app.firebaseapp.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '175636734866',
};

// Initialize Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

