import type { VercelRequest, VercelResponse } from '@vercel/node';
import { adminAuth } from '../lib/firebase-admin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  try {
    const user = await adminAuth.createUser({ email, password, emailVerified: true });
    res.json({ ok: true, userId: user.uid, error: null });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}