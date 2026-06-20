import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rhmgkapdvexzjasvbifd.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const admin = createClient(SUPABASE_URL, KEY);
    const { error, status, statusText } = await admin.from('fuel_logs').insert([req.body]);
    if (error) return res.status(500).json({ error: error.message, details: error.details, code: error.code });
    res.json({ ok: true, status, statusText });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
