import { getApps, getApp, initializeApp, type FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase client setup. Config comes from Vite env vars (see .env.example)
// rather than being hardcoded, and .env.local (the file that actually holds
// real values) is gitignored.
//
// This module only wires up the SDK connection — the app still runs on the
// mocked state in src/state/AppStateContext.tsx. Nothing here is consumed
// by the UI yet.
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
    // eslint-disable-next-line no-console
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
