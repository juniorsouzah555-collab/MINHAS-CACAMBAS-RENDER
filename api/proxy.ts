import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rhmgkapdvexzjasvbifd.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { table, action, data, filter } = req.body;
  if (!table || !action) return res.status(400).json({ error: 'table and action are required' });

  try {
    let result;

    switch (action) {
      case 'insert':
        result = await admin.from(table).insert([data]);
        break;
      case 'update':
        if (!filter) return res.status(400).json({ error: 'filter is required for update' });
        result = await admin.from(table).update(data).match(JSON.parse(filter));
        break;
      case 'delete':
        if (!filter) return res.status(400).json({ error: 'filter is required for delete' });
        result = await admin.from(table).delete().match(JSON.parse(filter));
        break;
      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }

    if (result.error) {
      return res.status(500).json({ error: result.error.message });
    }

    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
