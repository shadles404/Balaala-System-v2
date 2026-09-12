import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export { firebaseConfig };

// Initialize Firebase App singleton
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth & Google Provider
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Firestore with custom database ID if provisioned
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Connection test helper per Firebase integration guidelines
export async function validateFirestoreConnection(): Promise<boolean> {
  try {
    // Attempt to read from the test collection
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[Firebase] Successfully connected to Firestore database:', firebaseConfig.firestoreDatabaseId || '(default)');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firebase] Client is offline or database is initializing:', error.message);
    } else {
      console.log('[Firebase] Connection check response:', error);
    }
    return false;
  }
}

// Run connection validation on initialization
validateFirestoreConnection();
