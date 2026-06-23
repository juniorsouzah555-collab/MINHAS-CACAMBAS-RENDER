import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wxxyvsidghvidqbypmmp.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const r: any = { keySet: KEY.length > 0 };
  if (!KEY) { r.error = 'no key'; res.json(r); return; }

  try {
    const admin = createClient(SUPABASE_URL, KEY);

    // Test 1: insert into lancamentos WITH observacao
    const testId1 = `OBS-TEST-${Date.now()}`;
    const payload1 = {
      id: testId1,
      bota_fora_id: 'BTF-01',
      bota_fora_nome: 'Test',
      quantidade_cacambas: 1,
      valor: 100,
      data: '2026-06-20',
      driver_name: 'Driver',
      vehicle_id: 'VH-01',
      status: 'PENDING',
      created_at: new Date().toISOString(),
      lat: -23.5,
      lng: -46.6,
      observacao: 'Test observacao'
    };
    const { error: e1 } = await admin.from('lancamentos').insert([payload1]);
    r.insertWithObservacao = e1 ? { error: e1.message, details: e1.details, code: e1.code } : 'ok';
    if (!e1) await admin.from('lancamentos').delete().eq('id', testId1);

    // Test 2: insert into lancamentos WITHOUT observacao
    const testId2 = `NOOBS-${Date.now()}`;
    const payload2 = { ...payload1, id: testId2 };
    delete (payload2 as any).observacao;
    const { error: e2 } = await admin.from('lancamentos').insert([payload2]);
    r.insertWithoutObservacao = e2 ? { error: e2.message } : 'ok';
    if (!e2) await admin.from('lancamentos').delete().eq('id', testId2);

    // Test 3: check the proxy endpoint
    const proxyRes = await fetch(`${SUPABASE_URL}/rest/v1/lancamentos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': KEY,
        'Authorization': `Bearer ${KEY}`
      },
      body: JSON.stringify(payload1)
    });
    r.proxyDirect = { status: proxyRes.status, statusText: proxyRes.statusText };
    if (!proxyRes.ok) {
      const text = await proxyRes.text();
      r.proxyDirect.body = text.substring(0, 500);
    }
  } catch (e: any) {
    r.catch = e.message;
  }

  res.json(r);
}
