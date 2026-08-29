import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  Firestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  getDoc,
  deleteDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  where,
  orderBy, 
  limit,
  CollectionReference,
  DocumentData,
  Unsubscribe
} from 'firebase/firestore';
import {
  getAuth,
  Auth,
  deleteUser,
  signInWithEmailAndPassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser
} from 'firebase/auth';

/**
 * Firebase Web Configuration
 * Reads from Vite environment variables (VITE_FIREBASE_*)
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
};

let appInstance: FirebaseApp | null = null;
let firestoreInstance: Firestore | null = null;
let authInstance: Auth | null = null;

export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
  );
}

export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) return null;
  if (!appInstance) {
    if (getApps().length > 0) {
      appInstance = getApp();
    } else {
      try {
        appInstance = initializeApp(firebaseConfig);
      } catch (err) {
        return null;
      }
    }
  }
  return appInstance;
}

export function getFirebaseFirestore(): Firestore | null {
  if (!isFirebaseConfigured()) return null;
  if (!firestoreInstance) {
    const app = getFirebaseApp();
    if (app) {
      try {
        firestoreInstance = getFirestore(app);
      } catch (err) {
        return null;
      }
    }
  }
  return firestoreInstance;
}

export function getFirebaseAuth(): Auth | null {
  if (!isFirebaseConfigured()) return null;
  if (!authInstance) {
    const app = getFirebaseApp();
    if (app) {
      try {
        authInstance = getAuth(app);
      } catch (err) {
        return null;
      }
    }
  }
  return authInstance;
}

export { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  getDoc,
  deleteDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  where,
  orderBy, 
  limit,
  deleteUser,
  signInWithEmailAndPassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  signOut,
  onAuthStateChanged
};
export type { Firestore, CollectionReference, DocumentData, Unsubscribe, Auth, FirebaseUser };

