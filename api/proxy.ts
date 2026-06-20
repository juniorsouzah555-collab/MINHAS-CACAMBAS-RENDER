import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = 'https://rhmgkapdvexzjasvbifd.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const headers = {
  'Content-Type': 'application/json',
  'apikey': KEY,
  'Authorization': `Bearer ${KEY}`,
  'Prefer': 'return=minimal'
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { table, action, data, filter } = req.body;
  if (!table || !action) return res.status(400).json({ error: 'table and action are required' });

  try {
    let url = `${SUPABASE_URL}/rest/v1/${table}`;
    let method = 'GET';
    let body: string | undefined;

    switch (action) {
      case 'insert':
        method = 'POST';
        body = JSON.stringify(data);
        break;
      case 'update':
        if (!filter) return res.status(400).json({ error: 'filter is required for update' });
        url += `?${filter}`;
        method = 'PATCH';
        body = JSON.stringify(data);
        break;
      case 'delete':
        if (!filter) return res.status(400).json({ error: 'filter is required for delete' });
        url += `?${filter}`;
        method = 'DELETE';
        break;
      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }

    const r = await fetch(url, { method, headers, body });
    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).json({ error: text });
    }
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
