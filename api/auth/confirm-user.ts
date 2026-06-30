import type { VercelRequest, VercelResponse } from '@vercel/node';
import { adminAuth } from '../lib/firebase-admin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId é obrigatório' });
  try {
    await adminAuth.updateUser(userId, { emailVerified: true });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}