import type { VercelRequest, VercelResponse } from '@vercel/node';

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const SQL = `
ALTER PUBLICATION supabase_realtime ADD TABLE vehicles;
ALTER PUBLICATION supabase_realtime ADD TABLE lancamentos;
ALTER PUBLICATION supabase_realtime ADD TABLE fuel_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE comissoes;
ALTER PUBLICATION supabase_realtime ADD TABLE garage_refills;
`;

// Tenta via Supabase REST API usando /rest/v1/rpc/ — não funciona para DDL,
// mas tentamos mesmo assim.
async function tryRpc(): Promise<{ ok: boolean; error?: string }> {
  const url = 'https://wxxyvsidghvidqbypmmp.supabase.co/rest/v1/rpc/';
  const headers = {
    'Content-Type': 'application/json',
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
  };
  // Tenta chamar uma função fictícia para ver se há algo útil
  try {
    const r = await fetch(url + 'enable_realtime', { method: 'POST', headers, body: '{}' });
    // 404 = função não existe
    if (r.status !== 404) {
      const txt = await r.text();
      return { ok: r.ok, error: txt.substring(0, 200) };
    }
  } catch {}
  return { ok: false, error: 'rpc not available' };
}

// Tenta via Management API (requer PAT, mas testamos mesmo assim)
async function tryMgmtApi(): Promise<{ ok: boolean; error?: string }> {
  const ref = 'wxxyvsidghvidqbypmmp';
  const fetches = [
    // Tenta via config/database/replication
    fetch(`https://api.supabase.com/v1/projects/${ref}/config/database/replication`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${SERVICE_KEY}` },
    }).then(async r => ({ source: 'mgmt/replication', status: r.status, body: (await r.text()).substring(0, 200) })),
    // Tenta via database/query (SQL direto)
    fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: SQL }),
    }).then(async r => ({ source: 'mgmt/query', status: r.status, body: (await r.text()).substring(0, 200) })),
  ];
  const results = await Promise.all(fetches);
  return { ok: results.some(r => r.status === 200), error: results.map(r => `${r.source} -> ${r.status}: ${r.body}`).join(' | ') };
}

// Tenta conexão pg via pooler
async function tryPgPooler(): Promise<{ ok: boolean; error?: string }> {
  const { Pool } = await import('pg');
  const configs = [
    // Pooler session mode
    {
      connectionString: `postgresql://postgres.wxxyvsidghvidqbypmmp:${encodeURIComponent(SERVICE_KEY)}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`,
      max: 1,
      connectionTimeoutMillis: 10000,
    },
    // Pooler transaction mode
    {
      connectionString: `postgresql://postgres.wxxyvsidghvidqbypmmp:${encodeURIComponent(SERVICE_KEY)}@aws-0-sa-east-1.pooler.supabase.com:5432/postgres`,
      max: 1,
      connectionTimeoutMillis: 10000,
    },
    // Direto
    {
      connectionString: `postgresql://postgres:${encodeURIComponent(SERVICE_KEY)}@db.wxxyvsidghvidqbypmmp.supabase.co:5432/postgres`,
      max: 1,
      connectionTimeoutMillis: 10000,
    },
  ];

  for (const cfg of configs) {
    const pool = new Pool(cfg);
    try {
      const client = await pool.connect();
      await client.query(SQL);
      client.release();
      await pool.end();
      return { ok: true };
    } catch (e: any) {
      await pool.end().catch(() => {});
      if (e.code === 'ENOTFOUND') continue;
      if (e.message?.includes('tenant') || e.message?.includes('not found')) continue;
      if (e.code === 'ECONNREFUSED') continue;
      return { ok: false, error: e.message?.substring(0, 200) || String(e) };
    }
  }
  return { ok: false, error: 'todas as conexões falharam' };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!SERVICE_KEY) {
    return res.status(500).json({ error: 'SERVICE_KEY not configured on Vercel env' });
  }

  const rpc = await tryRpc();
  const mgmt = await tryMgmtApi();
  const pg = await tryPgPooler();

  res.json({
    rpc,
    mgmt,
    pg,
    conclusion: pg.ok
      ? 'Realtime enabled via pg pooler!'
      : 'Could not enable Realtime automatically. Go to Supabase Dashboard → Database → Replication and toggle the tables.',
  });
}
