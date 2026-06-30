import { createRequire } from 'node:module';

let admin: any;
let adminApp: any;
export let adminDb: any;
export let adminAuth: any;
export let adminStorage: any;

try {
  admin = createRequire(import.meta.url)('firebase-admin');
} catch (e: any) {
  console.error('[FBA] require error:', e?.message);
  throw e;
}

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

try {
  adminApp = getAdminApp();
  adminDb = admin.firestore(adminApp);
  adminAuth = admin.auth(adminApp);
  adminStorage = admin.storage(adminApp);
  console.log('[FBA] initialized successfully');
} catch (e: any) {
  console.error('[FBA] setup error:', e?.message);
  throw e;
}
