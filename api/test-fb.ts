import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createRequire } from 'node:module';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const require = createRequire(import.meta.url);
    const admin = require('firebase-admin');
    
    let apps = 0;
    try { apps = admin.apps.length; } catch {}
    
    res.json({ ok: true, apps, hasInit: typeof admin.initializeApp === 'function' });
  } catch (e: any) {
    res.status(500).json({
      error: e.message,
      code: e.code,
      stack: (e.stack || '').split('\n').slice(0, 6).join('\n')
    });
  }
}
