import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];

  // 1. Try environment variable (Vercel)
  const envKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (envKey) {
    try {
      return initializeApp({ credential: cert(JSON.parse(envKey)) });
    } catch (e) {
      console.error('[FirebaseAdmin] Failed to initialize with env var:', e);
    }
  }

  // 2. Try local file (development)
  const localPath = resolve(__dirname, 'firebase-service-account.json');
  if (existsSync(localPath)) {
    try {
      const localKey = readFileSync(localPath, 'utf-8');
      return initializeApp({ credential: cert(JSON.parse(localKey)) });
    } catch (e) {
      console.error('[FirebaseAdmin] Failed to initialize with local file:', e);
    }
  }

  // 3. Fallback: use default application credentials
  return initializeApp({ projectId: 'cacambas-4ecdb' });
}

const adminApp = getAdminApp();
export const adminDb = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);
export const adminStorage = getStorage(adminApp);
