import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = 'https://wxxyvsidghvidqbypmmp.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function getUserIdByEmail(email: string): Promise<string | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` }
    });
    if (!res.ok) return null;
    const data = await res.json();
    const user = (data?.users || []).find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
    return user?.id || null;
  } catch { return null; }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  try {
    const userId = await getUserIdByEmail(email);
    if (!userId) return res.json({ ok: false, error: 'Usuário não encontrado no Auth' });
    const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ password, email_confirm: true })
    });
    res.json({ ok: r.ok });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
