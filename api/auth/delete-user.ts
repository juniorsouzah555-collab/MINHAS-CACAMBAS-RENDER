import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wxxyvsidghvidqbypmmp.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email é obrigatório' });
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const results: any[] = [];

    // 1. Deleta do user_approvals
    const { error: delApprovalError } = await admin
      .from('user_approvals')
      .delete()
      .eq('email', email);
    if (delApprovalError) results.push({ step: 'delete-approvals', error: delApprovalError.message });
    else results.push({ step: 'delete-approvals', ok: true });

    // 2. Busca usuario no Auth pelo email
    const { data: users, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
    if (listError) {
      results.push({ step: 'list-users', error: listError.message });
    } else {
      const user = users.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
      if (user) {
        // 3. Deleta do Auth
        const { error: delAuthError } = await admin.auth.admin.deleteUser(user.id);
        if (delAuthError) results.push({ step: 'delete-auth', error: delAuthError.message });
        else results.push({ step: 'delete-auth', ok: true });
      } else {
        results.push({ step: 'user-not-found-in-auth' });
      }
    }

    res.json({ ok: results.some(r => r.ok || r.step === 'user-not-found-in-auth'), results });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
