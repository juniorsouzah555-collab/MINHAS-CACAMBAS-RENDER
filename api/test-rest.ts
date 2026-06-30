import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.json({ ok: true, env: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY });
}
