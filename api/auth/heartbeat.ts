import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = 'https://rhmgkapdvexzjasvbifd.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function getUserIdByEmail(email: string): Promise<string | null> {
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` }
    });
    if (!r.ok) return null;
    const d = await r.json();
    const u = (d?.users || []).find((x: any) => x.email?.toLowerCase() === email.toLowerCase());
    return u?.id || null;
  } catch { return null; }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email, driverName } = req.body;
  if (!email) return res.status(400).json({ error: 'Email é obrigatório' });
  try {
    const userId = await getUserIdByEmail(email);
    if (!userId) return res.json({ ok: false });
    const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ user_metadata: { last_seen: Date.now(), driver_name: driverName || email.split('@')[0] } })
    });
    res.json({ ok: r.ok });
  } catch { res.json({ ok: false }); }
}
