import type { VercelRequest, VercelResponse } from '@vercel/node';

const CLIENT_ID = process.env.GMAIL_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.GMAIL_REDIRECT_URI || 'https://relampago-cacambas-novo.vercel.app/api/gmail/callback';
const SUPABASE_URL = 'https://wxxyvsidghvidqbypmmp.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { code, error: oauthError } = req.query;
  if (oauthError) return res.redirect('/?gmail=error');
  if (!code) return res.status(400).json({ error: 'Missing authorization code' });

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code: code as string, client_id: CLIENT_ID, client_secret: CLIENT_SECRET, redirect_uri: REDIRECT_URI, grant_type: 'authorization_code' }),
    });
    if (!tokenRes.ok) return res.status(400).json({ error: 'Token exchange failed' });
    const tokens = await tokenRes.json();

    const profileRes = await fetch('https://www.googleapis.com/gmail/v1/users/me/profile', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await profileRes.json();
    const email = profile.emailAddress || 'admin';

    if (tokens.refresh_token) {
      const headers = { 'Content-Type': 'application/json', apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` };
      const existing = await fetch(`${SUPABASE_URL}/rest/v1/gmail_tokens?email=eq.${encodeURIComponent(email)}&select=email&limit=1`, { headers });
      const body = { refresh_token: tokens.refresh_token, access_token: tokens.access_token, expires_at: Date.now() + tokens.expires_in * 1000 };
      const existingData = await existing.json();
      if (existingData?.length > 0) {
        await fetch(`${SUPABASE_URL}/rest/v1/gmail_tokens?email=eq.${encodeURIComponent(email)}`, { method: 'PATCH', headers: { ...headers, Prefer: 'return=minimal' }, body: JSON.stringify(body) });
      } else {
        await fetch(`${SUPABASE_URL}/rest/v1/gmail_tokens`, { method: 'POST', headers: { ...headers, Prefer: 'return=minimal' }, body: JSON.stringify({ email, ...body }) });
      }
    }
    res.redirect('/?gmail=connected');
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
