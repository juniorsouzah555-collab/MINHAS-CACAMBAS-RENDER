import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = 'https://rhmgkapdvexzjasvbifd.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const results: any[] = [];

  const sql = `CREATE TABLE IF NOT EXISTS garage_refills (
    id TEXT PRIMARY KEY,
    data DATE NOT NULL,
    quantidade_litros NUMERIC NOT NULL,
    valor_total NUMERIC NOT NULL,
    preco_por_litro NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );`;

  // Try pg-meta query endpoint
  try {
    const r = await fetch(`${SUPABASE_URL}/pg-meta/default/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': KEY,
        'Authorization': `Bearer ${KEY}`
      },
      body: JSON.stringify({ query: sql })
    });
    const text = await r.text();
    results.push({ method: 'pg-meta', status: r.status, body: text.substring(0, 500) });
  } catch (e: any) {
    results.push({ method: 'pg-meta', error: e.message });
  }

  // Try rest endpoint with raw query
  if (results.some(r => r.status >= 400 || r.error)) {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/pg_meta_exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': KEY,
          'Authorization': `Bearer ${KEY}`
        },
        body: JSON.stringify({ query: sql })
      });
      const text = await r.text();
      results.push({ method: 'rpc', status: r.status, body: text.substring(0, 500) });
    } catch (e: any) {
      results.push({ method: 'rpc', error: e.message });
    }
  }

  // Try creating via proxy insert to verify
  if (!results.some(r => r.status === 200 || r.status === 201)) {
    try {
      const admin = (await import('@supabase/supabase-js')).createClient(SUPABASE_URL, KEY);
      const { error } = await admin.from('garage_refills').select('id').limit(1);
      results.push({ method: 'check-table', exists: !error, error: error?.message });
    } catch (e: any) {
      results.push({ method: 'check-table', error: e.message });
    }
  }

  res.json({ results });
}
