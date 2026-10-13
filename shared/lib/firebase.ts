import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInAnonymously } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

const env = import.meta.env;
const useEmulators = env.VITE_USE_EMULATORS === 'true';

// Estos valores son públicos por diseño (identifican el proyecto). La protección real son firestore.rules.
const config = {
  apiKey: env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: (env.VITE_FIREBASE_PROJECT_ID as string | undefined) || (useEmulators ? 'demo-rastreo' : undefined),
  appId: env.VITE_FIREBASE_APP_ID as string | undefined,
};

export const isFirebaseConfigured = useEmulators || Boolean(config.apiKey && config.projectId && config.appId);

const app = isFirebaseConfigured
  ? initializeApp(useEmulators ? { apiKey: 'demo', projectId: config.projectId, appId: 'demo' } : config)
  : null;

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;

if (useEmulators && auth && db) {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8080);
}

export function requireDb() {
  if (!db) throw new Error('Firebase no está configurado. Revisa las variables VITE_FIREBASE_* en .env.local.');
  return db;
}

/** Cada dispositivo usa una cuenta anónima: no pedimos datos personales. */
export async function ensureSignedIn(): Promise<string> {
  if (!auth) throw new Error('Firebase no está configurado. Revisa las variables VITE_FIREBASE_* en .env.local.');
  await auth.authStateReady();
  if (auth.currentUser) return auth.currentUser.uid;
  const credential = await signInAnonymously(auth);
  return credential.user.uid;
}
