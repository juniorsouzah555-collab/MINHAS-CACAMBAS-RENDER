import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = 'https://rhmgkapdvexzjasvbifd.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { table, action, data, filter } = req.body;
  if (!table || !action) return res.status(400).json({ error: 'table and action are required' });

  try {
    const url = `${SUPABASE_URL}/rest/v1/${table}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'return=minimal'
    };

    let response: Response;

    switch (action) {
      case 'insert':
        response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(data)
        });
        break;
      case 'update':
        if (!filter) return res.status(400).json({ error: 'filter is required for update' });
        response = await fetch(`${url}?${filter}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(data)
        });
        break;
      case 'delete':
        if (!filter) return res.status(400).json({ error: 'filter is required for delete' });
        response = await fetch(`${url}?${filter}`, {
          method: 'DELETE',
          headers
        });
        break;
      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: text });
    }

    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
