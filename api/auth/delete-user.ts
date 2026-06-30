import type { VercelRequest, VercelResponse } from '@vercel/node';
import { adminAuth, adminDb } from '../lib/firebase-admin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email é obrigatório' });
  try {
    const results: any[] = [];

    // 1. Deleta do user_approvals
    try {
      const snap = await adminDb.collection('user_approvals').where('email', '==', email).get();
      const batch = adminDb.batch();
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      results.push({ step: 'delete-approvals', ok: true });
    } catch (e: any) { results.push({ step: 'delete-approvals', error: e.message }); }

    // 2. Deleta do Auth
    try {
      const user = await adminAuth.getUserByEmail(email);
      await adminAuth.deleteUser(user.uid);
      results.push({ step: 'delete-auth', ok: true });
    } catch (e: any) { results.push({ step: 'delete-auth', error: e.message }); }

    res.json({ ok: results.some(r => r.ok), results });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}