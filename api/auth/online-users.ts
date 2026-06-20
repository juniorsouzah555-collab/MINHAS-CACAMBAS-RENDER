import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = 'https://rhmgkapdvexzjasvbifd.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ONLINE_TIMEOUT = 120000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` }
    });
    if (!r.ok) return res.json({ users: [] });
    const d = await r.json();
    const now = Date.now();
    const online = (d?.users || [])
      .filter((u: any) => u?.user_metadata?.last_seen && (now - u.user_metadata.last_seen) < ONLINE_TIMEOUT)
      .map((u: any) => u?.user_metadata?.driver_name || u.email?.split('@')[0] || '')
      .filter(Boolean);
    res.json({ users: [...new Set(online)] });
  } catch { res.json({ users: [] }); }
}
