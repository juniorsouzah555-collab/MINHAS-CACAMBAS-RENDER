import type { VercelRequest, VercelResponse } from '@vercel/node';
import { adminDb } from '../lib/firebase-admin';

const CLIENT_ID = process.env.GMAIL_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || '';
const REDIRECT_URI = 'https://relampago-cacambas-novo.vercel.app/api/gmail/callback';

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
      const existing = await adminDb.collection('gmail_tokens').where('email', '==', email).get();
      const tokenData = { refresh_token: tokens.refresh_token, access_token: tokens.access_token, expires_at: Date.now() + tokens.expires_in * 1000 };
      if (!existing.empty) {
        await existing.docs[0].ref.update(tokenData);
      } else {
        await adminDb.collection('gmail_tokens').doc(email).set({ email, ...tokenData });
      }
    }
    res.redirect('/?gmail=connected');
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}