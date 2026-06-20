import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rhmgkapdvexzjasvbifd.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const r: any = { method: req.method, keySet: KEY.length > 0 };

  if (!KEY) { r.error = 'no key'; res.json(r); return; }

  try {
    const admin = createClient(SUPABASE_URL, KEY);

    if (req.method === 'POST' && req.body) {
      const { error } = await admin.from('fuel_logs').insert([req.body]);
      r.insertResult = error ? { error: error.message, details: error.details, code: error.code } : 'ok';
    }

    // Test: try selecting
    const { data, error } = await admin.from('fuel_logs').select('id').limit(1);
    r.selectResult = error ? { error: error.message } : { count: data?.length };
  } catch (e: any) {
    r.catch = e.message;
  }

  res.json(r);
}
