import type { VercelRequest, VercelResponse } from '@vercel/node';

const CLIENT_ID = process.env.GMAIL_CLIENT_ID || '';
const REDIRECT_URI = process.env.GMAIL_REDIRECT_URI || 'https://relampago-cacambas-novo.vercel.app/api/gmail/callback';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  if (!CLIENT_ID) {
    return res.status(400).json({ error: 'GMAIL_CLIENT_ID not configured' });
  }

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
    access_type: 'offline',
    prompt: 'consent',
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
