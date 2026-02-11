
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInAnonymously,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signOut
} from 'firebase/auth';
// Import type explicitly to resolve 'no exported member' errors for interfaces in modular SDK
import type { User } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore/lite';

/**
 * FIREBASE CONFIGURATION
 */
const firebaseConfig = {
  apiKey: "AIzaSyCF35wI60LIyyDti66D5rr9dTjqa_5DqYs",
  authDomain: "gen-lang-client-0147461910.firebaseapp.com",
  projectId: "gen-lang-client-0147461910",
  storageBucket: "gen-lang-client-0147461910.firebasestorage.app",
  messagingSenderId: "383246160842",
  appId: "1:383246160842:web:59a998ad29f99034acf533"
};

// --- Do not edit below this line ---

let app: any = null;
let auth: any = null;
let db: any = null;
let isMock = false;

try {
  // Check if keys are actually set (simple check on apiKey)
  if (firebaseConfig.apiKey.includes("PASTE_YOUR")) {
    console.warn("Firebase Keys not set. App is in Mock Mode.");
    isMock = true;
  } else {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("Firebase initialized successfully.");
  }
} catch (error) {
  console.error("Firebase initialization error:", error);
  isMock = true;
}

const MOCK_STORAGE_KEY = 'sales_sidekik_mock_session';

export { isMock };

/**
 * Authentication Wrappers
 */
export const onAuthStateChangedWrapper = (authInstance: any, callback: (user: User | null) => void) => {
  if (isMock || !authInstance) {
    const stored = localStorage.getItem(MOCK_STORAGE_KEY);
    if (stored) {
      try {
        const mockUser = JSON.parse(stored);
        callback(mockUser as User);
      } catch (e) {
        callback(null);
      }
    } else {
      callback(null);
    }
    return () => {}; 
  }
  return onAuthStateChanged(authInstance, callback);
};

export const signInAnonymouslyWrapper = async () => {
  if (isMock || !auth) return null;
  return signInAnonymously(auth);
};

export const signInWithGoogle = async () => {
  if (isMock || !auth) {
     const mockUser = {
       uid: 'mock-user-123',
       displayName: 'Demo User',
       email: 'demo@salessidekik.ai',
       emailVerified: true,
       isAnonymous: false,
       metadata: {},
       providerData: [],
       refreshToken: '',
       tenantId: null,
       delete: async () => {},
       getIdToken: async () => 'mock-token',
       getIdTokenResult: async () => ({ token: 'mock-token' } as any),
       reload: async () => {},
       toJSON: () => ({})
     };
     localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(mockUser));
     window.location.reload(); 
     return { user: mockUser };
  }
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
};

export const loginWithEmail = async (email: string, pass: string) => {
  if (isMock || !auth) {
     const mockUser = {
       uid: 'mock-user-' + email.split('@')[0],
       displayName: email.split('@')[0],
       email: email,
       emailVerified: true,
       isAnonymous: false
     } as any;
     localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(mockUser));
     window.location.reload();
     return { user: mockUser };
  }
  return signInWithEmailAndPassword(auth, email, pass);
};

export const registerWithEmail = async (email: string, pass: string) => {
  if (isMock || !auth) {
     return loginWithEmail(email, pass);
  }
  return createUserWithEmailAndPassword(auth, email, pass);
};

export const sendPasswordReset = async (email: string) => {
  if (isMock || !auth) return;
  return sendPasswordResetEmail(auth, email);
};

export const signOutWrapper = async () => {
  if (isMock || !auth) {
    localStorage.removeItem(MOCK_STORAGE_KEY);
    window.location.reload();
    return;
  }
  return signOut(auth);
};

export { auth, db, onAuthStateChangedWrapper as onAuthStateChanged, signOutWrapper as signOut };
export type { User };
export default app;
