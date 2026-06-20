import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = 'https://rhmgkapdvexzjasvbifd.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/fuel_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': KEY,
        'Authorization': `Bearer ${KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(req.body)
    });
    const text = await r.text();
    res.status(r.status).json({
      ok: r.ok,
      status: r.status,
      body: text
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message, stack: e.stack });
  }
}
