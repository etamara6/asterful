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
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser
} from 'firebase/auth';

/**
 * Firebase Web Configuration & Client Instance Initialization
 */
const getEnvVar = (key: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return String(import.meta.env[key]).trim();
  }
  if (typeof window !== 'undefined') {
    const win = window as any;
    if (win.__FIREBASE_CONFIG__ && win.__FIREBASE_CONFIG__[key]) {
      return String(win.__FIREBASE_CONFIG__[key]).trim();
    }
    if (win.env && win.env[key]) {
      return String(win.env[key]).trim();
    }
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return String(process.env[key]).trim();
  }
  return '';
};

const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY') || getEnvVar('FIREBASE_API_KEY'),
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN') || getEnvVar('FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID') || getEnvVar('FIREBASE_PROJECT_ID'),
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET') || getEnvVar('FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID') || getEnvVar('FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvVar('VITE_FIREBASE_APP_ID') || getEnvVar('FIREBASE_APP_ID'),
  measurementId: getEnvVar('VITE_FIREBASE_MEASUREMENT_ID') || getEnvVar('FIREBASE_MEASUREMENT_ID'),
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
    console.log('[Firebase] Using existing initialized Firebase App instance:', appInstance.name);
  } else if (isFirebaseConfigured() || firebaseConfig.apiKey || firebaseConfig.projectId) {
    appInstance = initializeApp(firebaseConfig);
    console.log('[Firebase] Initialized new Firebase App instance with Project ID:', firebaseConfig.projectId || '(none)');
  } else {
    console.warn('[Firebase] Warning: Firebase configuration keys not detected in environment variables. Please check VITE_FIREBASE_PROJECT_ID / VITE_FIREBASE_API_KEY.');
  }

  if (appInstance) {
    firestoreInstance = getFirestore(appInstance);
    authInstance = getAuth(appInstance);
    console.log('[Firebase] Firestore database (db) instance initialized successfully.');
  }
} catch (err) {
  console.error('[Firebase] Error during Firebase initialization:', err);
}

export function getFirebaseApp(): FirebaseApp | null {
  if (appInstance) return appInstance;
  if (!isFirebaseConfigured()) {
    console.warn('[Firebase] getFirebaseApp: Firebase is not configured in environment variables.');
    return null;
  }
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
      console.log('[Firebase] Obtained active Firestore instance.');
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
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  signOut,
  onAuthStateChanged
};
export type { Firestore, CollectionReference, DocumentData, Unsubscribe, Auth, FirebaseUser };


