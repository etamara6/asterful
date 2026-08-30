import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  Firestore, 
  collection, 
  doc, 
  setDoc, 
  addDoc,
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
    firebaseConfig.projectId || (firebaseConfig.apiKey && firebaseConfig.appId)
  );
}

try {
  if (getApps().length > 0) {
    appInstance = getApp();
  } else if (isFirebaseConfigured() || firebaseConfig.apiKey || firebaseConfig.projectId) {
    appInstance = initializeApp(firebaseConfig);
  }

  if (appInstance) {
    firestoreInstance = getFirestore(appInstance);
    authInstance = getAuth(appInstance);
  }
} catch (err) {
  console.error('[Firebase] Failed to initialize Firebase app instance:', err);
}

export function getFirebaseApp(): FirebaseApp | null {
  if (appInstance) return appInstance;
  if (!isFirebaseConfigured()) return null;
  try {
    if (getApps().length > 0) {
      appInstance = getApp();
    } else {
      appInstance = initializeApp(firebaseConfig);
    }
  } catch (err) {
    console.error('[Firebase] Error obtaining FirebaseApp:', err);
    return null;
  }
  return appInstance;
}

export function getFirebaseFirestore(): Firestore | null {
  if (firestoreInstance) return firestoreInstance;
  const app = getFirebaseApp();
  if (app) {
    try {
      firestoreInstance = getFirestore(app);
      return firestoreInstance;
    } catch (err) {
      console.error('[Firebase] Error obtaining Firestore instance:', err);
      return null;
    }
  }
  return null;
}

export function getFirebaseAuth(): Auth | null {
  if (authInstance) return authInstance;
  const app = getFirebaseApp();
  if (app) {
    try {
      authInstance = getAuth(app);
      return authInstance;
    } catch (err) {
      console.error('[Firebase] Error obtaining Auth instance:', err);
      return null;
    }
  }
  return null;
}

// Export primary direct instances for immediate module usage
export const app: FirebaseApp | null = appInstance;
export const db: Firestore | null = firestoreInstance;
export const auth: Auth | null = authInstance;

export { 
  collection, 
  doc, 
  setDoc, 
  addDoc,
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


