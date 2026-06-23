import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Client } from 'pg';

const PROJECT_REF = 'wxxyvsidghvidqbypmmp';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function tryCreateDirect() {
  // Try direct db connection with service_role as password
  const client = new Client({
    host: `db.${PROJECT_REF}.supabase.co`,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: KEY,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000
  });
  await client.connect();
  await client.query(`
    CREATE TABLE IF NOT EXISTS garage_config (
      id TEXT PRIMARY KEY DEFAULT 'default',
      diesel_qty NUMERIC DEFAULT 5000,
      diesel_price NUMERIC DEFAULT 5.68,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await client.query(`
    INSERT INTO garage_config (id, diesel_qty, diesel_price)
    VALUES ('default', 5000, 5.68)
    ON CONFLICT (id) DO NOTHING;
  `);
  await client.end();
}

async function tryCreateViaRpc() {
  const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;

  // Try various RPC function names
  for (const rpcName of ['exec_sql', 'execute_sql', 'exec', 'run_sql']) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${rpcName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': KEY,
        'Authorization': `Bearer ${KEY}`
      },
      body: JSON.stringify({
        sql_text: `
          CREATE TABLE IF NOT EXISTS garage_config (
            id TEXT PRIMARY KEY DEFAULT 'default',
            diesel_qty NUMERIC DEFAULT 5000,
            diesel_price NUMERIC DEFAULT 5.68,
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
          INSERT INTO garage_config (id, diesel_qty, diesel_price)
          VALUES ('default', 5000, 5.68)
          ON CONFLICT (id) DO NOTHING;
        `
      })
    });
    if (r.ok) return;
    const text = await r.text();
    console.log(`${rpcName} failed:`, r.status, text.substring(0, 100));
  }
  throw new Error('All RPC methods failed');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    try {
      await tryCreateDirect();
      return res.json({ ok: true, method: 'direct' });
    } catch (e: any) {
      console.log('Direct failed, trying RPC:', e.message);
    }
    await tryCreateViaRpc();
    res.json({ ok: true, method: 'rpc' });
  } catch (e: any) {
    res.status(500).json({ error: e.message, stack: e.stack });
  }
}
