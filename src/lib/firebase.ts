import { getApps, getApp, initializeApp, type FirebaseOptions } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

// Firebase client setup. Config comes from Vite env vars (see .env.example)
// rather than being hardcoded, and .env.local (the file that actually holds
// real values) is gitignored.
//
// Every Firestore/Auth read and write in the app goes through this module's
// `auth`/`db` exports — always via one of the src/lib/*Repo.ts service
// files (or AppStateContext.tsx's own sign-in/sign-up/sign-out calls),
// never directly from a page or component.
//
// Deliberately not initializing Firebase Storage: this app has no use for
// it yet, and every unused service is one more thing to configure security
// rules for.
const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

if (import.meta.env.DEV) {
  const missing = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length) {
    console.warn(
      `[firebase] Missing config value(s): ${missing.join(', ')}. ` +
      'Copy .env.example to .env.local and fill in your Firebase project\'s web app config.',
    );
  }
}

// getApps()/getApp() guards against "Firebase App named '[DEFAULT]' already
// exists" during Vite's hot module replacement, which can re-run this
// module without a full page reload.
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Point at the local emulators (ports match firebase.json) in dev, unless
// explicitly opted out via VITE_USE_FIREBASE_EMULATORS=false — e.g. to
// test against the real project without deploying. Never runs in a
// production build. Guarded against Vite HMR re-running this module and
// trying to connect a second time, which both SDKs throw on.
declare global {
  var __firebaseEmulatorsConnected: boolean | undefined;
}

if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS !== 'false' && !globalThis.__firebaseEmulatorsConnected) {
  globalThis.__firebaseEmulatorsConnected = true;
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  console.info('[firebase] Using local emulators (Auth :9099, Firestore :8080). Set VITE_USE_FIREBASE_EMULATORS=false to use the real project instead.');
}
