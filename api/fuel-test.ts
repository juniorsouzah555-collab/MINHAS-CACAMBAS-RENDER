import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rhmgkapdvexzjasvbifd.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const r: any = { keySet: KEY.length > 0 };
  if (!KEY) { r.error = 'no key'; res.json(r); return; }

  try {
    const admin = createClient(SUPABASE_URL, KEY);
    r.supabaseUrl = SUPABASE_URL;

    // Full payload that the app sends to /api/fuel-log
    const testId = `FULL-TEST-${Date.now()}`;
    const fullPayload = {
      id: testId,
      vehicle_id: 'VH-001',
      quantidade_litros: 50,
      km_inicial: 10000,
      km_final: 10500,
      valor_pago: 250,
      data: '2026-06-20',
      driver: 'Test Driver',
      media_km_l: 10,
      tipo: 'GASOLINA',
      is_retirada_diversa: false,
      lat: -23.5,
      lng: -46.6
    };
    r.payload = fullPayload;

    const { data, error } = await admin.from('fuel_logs').insert([fullPayload]);
    if (error) {
      r.error = error.message;
      r.details = error.details;
      r.code = error.code;
      r.hint = error.hint;
    } else {
      r.insertOk = true;
      // Cleanup
      await admin.from('fuel_logs').delete().eq('id', testId);
      r.cleanupOk = true;
    }
  } catch (e: any) {
    r.catch = e.message;
    r.stack = e.stack?.substring(0, 500);
  }

  res.json(r);
}
