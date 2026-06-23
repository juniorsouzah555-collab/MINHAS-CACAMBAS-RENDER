import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = 'https://wxxyvsidghvidqbypmmp.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function callRpc(sqlText: string) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/execute_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': KEY,
      'Authorization': `Bearer ${KEY}`
    },
    body: JSON.stringify({ sql_text: sqlText })
  });
  return { status: r.status, body: await r.text() };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const sql = `
      CREATE TABLE IF NOT EXISTS garage_config (
        id TEXT PRIMARY KEY DEFAULT 'default',
        diesel_qty NUMERIC DEFAULT 5000,
        diesel_price NUMERIC DEFAULT 5.68,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      INSERT INTO garage_config (id, diesel_qty, diesel_price)
      VALUES ('default', 5000, 5.68)
      ON CONFLICT (id) DO NOTHING;
    `;

    const result = await callRpc(sql);
    res.json({ ok: result.status < 400, ...result });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
