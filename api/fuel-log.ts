import type { VercelRequest, VercelResponse } from '@vercel/node';
import { adminDb } from './lib/firebase-admin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const data = req.body;
    const id = data.id || adminDb.collection('fuel_logs').doc().id;
    await adminDb.collection('fuel_logs').doc(id).set({ ...data, id, createdAt: data.createdAt || new Date().toISOString() });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
