import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Client } from 'pg';

const PROJECT_REF = 'wxxyvsidghvidqbypmmp';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Try direct DB connection using service_role key as password via pooler
    const client = new Client({
      host: `${PROJECT_REF}.pooler.supabase.com`,
      port: 6543,
      database: 'postgres',
      user: `postgres.${PROJECT_REF}`,
      password: KEY,
      ssl: { rejectUnauthorized: false }
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

    res.json({ ok: true, message: 'Table created successfully' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
