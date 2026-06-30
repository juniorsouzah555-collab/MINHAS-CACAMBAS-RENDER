// Static import to ensure Vercel includes firebase-admin in the bundle
import type { app, firestore, auth, storage } from 'firebase-admin';

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const admin: {
  apps: any[];
  initializeApp: Function;
  credential: { cert: Function };
  firestore: Function;
  auth: Function;
  storage: Function;
} = require('firebase-admin');

function getAdminApp() {
  if (admin.apps.length > 0) return admin.apps[0];

  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (key) {
    try {
      return admin.initializeApp({ credential: admin.credential.cert(JSON.parse(key)) });
    } catch (e) {
      console.error('[FBA] init error:', e);
    }
  }

  return admin.initializeApp({ projectId: 'cacambas-4ecdb' });
}

const adminApp = getAdminApp();
export const adminDb = admin.firestore(adminApp);
export const adminAuth = admin.auth(adminApp);
export const adminStorage = admin.storage(adminApp);
