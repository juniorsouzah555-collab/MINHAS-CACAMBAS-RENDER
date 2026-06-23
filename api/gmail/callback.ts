import type { VercelRequest, VercelResponse } from '@vercel/node';

const CLIENT_ID = process.env.GMAIL_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || '';
const REDIRECT_URI = `${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000'}/api/gmail/callback`;
const SUPABASE_URL = 'https://wxxyvsidghvidqbypmmp.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function storeToken(email: string, refreshToken: string, accessToken: string, expiresAt: number) {
  // Upsert into gmail_tokens table via Supabase REST (service_role)
  const body = { refresh_token: refreshToken, access_token: accessToken, expires_at: expiresAt };
  const headers = {
    'Content-Type': 'application/json',
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    Prefer: 'resolution=merge-duplicates',
  };
  // Try upsert — if table doesn't exist, silently skip
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/gmail_tokens?email=eq.${encodeURIComponent(email)}`, {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify(body),
    });
  } catch {}
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { code, error: oauthError } = req.query;

  if (oauthError) {
    return res.redirect('/?gmail=error');
  }
  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code as string,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      return res.status(400).json({ error: 'Token exchange failed', details: err });
    }

    const tokens = await tokenRes.json();

    // Get user email from Google
    const profileRes = await fetch('https://www.googleapis.com/gmail/v1/users/me/profile', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await profileRes.json();
    const email = profile.emailAddress || 'admin';

    // Store refresh token
    if (tokens.refresh_token) {
      await storeToken(email, tokens.refresh_token, tokens.access_token, Date.now() + tokens.expires_in * 1000);
    }

    // Redirect back to app
    res.redirect('/?gmail=connected');
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
