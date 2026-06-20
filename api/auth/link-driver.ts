import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = 'https://rhmgkapdvexzjasvbifd.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email, linkedDriver } = req.body;
  if (!email) return res.status(400).json({ error: 'Email é obrigatório' });
  try {
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` }
    });
    if (!userRes.ok) return res.json({ ok: false, error: 'Failed to list users' });
    const data = await userRes.json();
    const user = (data?.users || []).find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
    if (!user) return res.json({ ok: false, error: 'Usuário não encontrado no Auth' });
    const updateRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        user_metadata: { ...(user.user_metadata || {}), linkedDriver: linkedDriver || '' }
      })
    });
    res.json({ ok: updateRes.ok });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
