import type { VercelRequest, VercelResponse } from '@vercel/node';
import { adminAuth } from '../lib/firebase-admin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email, linkedDriver } = req.body;
  if (!email) return res.status(400).json({ error: 'Email é obrigatório' });
  try {
    const user = await adminAuth.getUserByEmail(email);
    await adminAuth.updateUser(user.uid, { displayName: linkedDriver || '' });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}