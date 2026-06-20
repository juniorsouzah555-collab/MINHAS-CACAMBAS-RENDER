import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rhmgkapdvexzjasvbifd.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const results: any[] = [];
  
  results.push({ step: 'env', keyLength: KEY.length, keySet: KEY.length > 0 });

  if (!KEY) {
    res.json({ ok: false, results, error: 'SUPABASE_SERVICE_ROLE_KEY not set' });
    return;
  }

  try {
    const admin = createClient(SUPABASE_URL, KEY);
    results.push({ step: 'client-created' });

    const testId = `TEST-${Date.now()}`;
    const testData = {
      id: testId,
      vehicle_id: 'TEST',
      quantidade_litros: 1,
      valor_pago: 1,
      data: '2026-06-20'
    };
    results.push({ step: 'inserting', data: testData });

    const { data, error } = await admin.from('fuel_logs').insert([testData]);
    
    if (error) {
      results.push({ step: 'insert-error', error: error.message, details: error.details, code: error.code });
    } else {
      results.push({ step: 'insert-success', data });

      // Clean up test record
      await admin.from('fuel_logs').delete().eq('id', testId);
      results.push({ step: 'cleanup-success' });
    }

    res.json({ ok: !error, results });
  } catch (e: any) {
    results.push({ step: 'catch', error: e.message, stack: e.stack?.substring(0, 500) });
    res.json({ ok: false, results });
  }
}
