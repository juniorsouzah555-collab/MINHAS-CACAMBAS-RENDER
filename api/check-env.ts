import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  res.json({
    keyLength: KEY.length,
    keySet: KEY.length > 0,
    keyPrefix: KEY.substring(0, 10) + '...',
    envKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE') || k.includes('supabase'))
  });
}
