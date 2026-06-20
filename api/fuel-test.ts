import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rhmgkapdvexzjasvbifd.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const r: any = { method: req.method, keySet: KEY.length > 0 };

  if (!KEY) { r.error = 'no key'; res.json(r); return; }

  try {
    const admin = createClient(SUPABASE_URL, KEY);

    // Test various table access
    const tables = ['lancamentos', 'fuel_logs', 'fuel_log', 'lancamento', 'vehicles'];
    r.tables = {};
    for (const t of tables) {
      try {
        const { error } = await admin.from(t).select('id').limit(1);
        r.tables[t] = error ? { error: error.message } : { ok: true };
      } catch (e: any) {
        r.tables[t] = { catch: e.message };
      }
    }

    // Test insert into lancamentos
    const testId = `TEST-${Date.now()}`;
    const insertData = {
      id: testId,
      bota_fora_id: 'TEST',
      bota_fora_nome: 'Test',
      quantidade_cacambas: 1,
      valor: 1,
      data: '2026-06-20',
      status: 'PENDING'
    };
    const { error: insertLancError } = await admin.from('lancamentos').insert([insertData]);
    r.insertLancamento = insertLancError ? { error: insertLancError.message, details: insertLancError.details, code: insertLancError.code } : 'ok';

    // Clean up
    if (!insertLancError) {
      await admin.from('lancamentos').delete().eq('id', testId);
      r.cleanupLanc = 'ok';
    }
  } catch (e: any) {
    r.catch = e.message;
  }

  res.json(r);
}
