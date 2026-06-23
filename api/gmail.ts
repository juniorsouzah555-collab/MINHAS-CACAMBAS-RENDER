import type { VercelRequest, VercelResponse } from '@vercel/node';

const CLIENT_ID = process.env.GMAIL_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || '';
const REDIRECT_URI = 'https://relampago-cacambas-novo.vercel.app/api/gmail/callback';
const SUPABASE_URL = 'https://wxxyvsidghvidqbypmmp.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
};

// ---- TOKEN STORAGE ----

async function getStoredToken(email: string) {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/gmail_tokens?email=eq.${encodeURIComponent(email)}&select=refresh_token,access_token,expires_at&limit=1`, { headers: SB_HEADERS });
    if (!r.ok) return null;
    const data = await r.json();
    return data?.[0] || null;
  } catch { return null; }
}

async function storeToken(email: string, refreshToken: string, accessToken: string, expiresAt: number) {
  try {
    const body = { refresh_token: refreshToken, access_token: accessToken, expires_at: expiresAt };
    const existing = await getStoredToken(email);
    if (existing) {
      await fetch(`${SUPABASE_URL}/rest/v1/gmail_tokens?email=eq.${encodeURIComponent(email)}`, {
        method: 'PATCH', headers: { ...SB_HEADERS, Prefer: 'return=minimal' }, body: JSON.stringify(body),
      });
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/gmail_tokens`, {
        method: 'POST', headers: { ...SB_HEADERS, Prefer: 'return=minimal' }, body: JSON.stringify({ email, ...body }),
      });
    }
  } catch {}
}

async function refreshAccessToken(refreshToken: string) {
  try {
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, refresh_token: refreshToken, grant_type: 'refresh_token' }),
    });
    if (!r.ok) return null;
    const data = await r.json();
    return { accessToken: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  } catch { return null; }
}

// ---- GMAIL FETCH ----

interface BoletoEmail {
  id: string; subject: string; from: string; date: string; snippet: string;
  hasAttachment: boolean; attachmentId?: string; filename?: string; mimeType?: string;
}

async function fetchBoletoEmails(accessToken: string) {
  const query = '(subject:boleto OR subject:fatura OR subject:2\u00aa OR boleto OR fatura OR "segunda via" OR "cobran\u00e7a") newer_than:180d';
  const r = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=30`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!r.ok) {
    const err = await r.text();
    console.error('[GMAIL] search error', r.status, err);
    return [];
  }
  const { messages = [], resultSizeEstimate } = await r.json();
  console.log('[GMAIL] search found', messages.length, 'results, estimate:', resultSizeEstimate);
  if (messages.length === 0) return [];
  const result: BoletoEmail[] = [];
  for (const msg of messages.slice(0, 30)) {
    try {
      const detail = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!detail.ok) { console.error('[GMAIL] detail error', msg.id, detail.status); continue; }
      const data = await detail.json();
      const headers = data.payload?.headers || [];
      const from = headers.find((h: any) => h.name === 'From')?.value?.replace(/<[^>]+>/g, '').trim().split('"').join('') || '';
      const subject = headers.find((h: any) => h.name === 'Subject')?.value || '(sem assunto)';
      const date = headers.find((h: any) => h.name === 'Date')?.value || '';
      const parts = data.payload?.parts || [];
      const attach = parts.find((p: any) => p.filename && p.filename.length > 0 && (p.mimeType === 'application/pdf' || p.filename?.toLowerCase().includes('boleto')));
      result.push({ id: msg.id, subject, from, date, snippet: data.snippet || '', hasAttachment: !!attach, attachmentId: attach?.body?.attachmentId, filename: attach?.filename, mimeType: attach?.mimeType });
    } catch (e) { console.error('[GMAIL] detail catch', msg.id); }
  }
  console.log('[GMAIL] returning', result.length, 'emails');
  return result;
}

// ---- HANDLER ----

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = (req.query.action as string) || '';

  // AUTH — redirect to Google OAuth
  if (action === 'auth') {
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/gmail.readonly',
      access_type: 'offline',
      prompt: 'consent',
    });
    return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  }

  // CALLBACK — handle OAuth redirect
  if (action === 'callback') {
    const { code, error: oauthError } = req.query;
    if (oauthError) return res.redirect('/?gmail=error');
    if (!code) return res.status(400).json({ error: 'Missing authorization code' });

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
      await storeToken(email, tokens.refresh_token, tokens.access_token, Date.now() + tokens.expires_in * 1000);
    }
    return res.redirect('/?gmail=connected');
  }

  // FETCH — get boleto emails (GET)
  if (action === 'fetch') {
    let email = req.query.email as string;
    let stored = email ? await getStoredToken(email) : null;
    if (!stored) {
      // Try to get any stored token
      try {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/gmail_tokens?select=email&limit=1`, { headers: SB_HEADERS });
        const list = await r.json();
        if (list?.[0]?.email) {
          email = list[0].email;
          stored = await getStoredToken(email);
        }
      } catch {}
    }
    if (!stored) return res.json({ connected: false, emails: [] });

    let accessToken = stored.access_token;
    const now = Date.now();
    if (!accessToken || !stored.expires_at || stored.expires_at < now) {
      if (!stored.refresh_token) return res.json({ connected: false, emails: [], error: 'refresh token expired' });
      const refreshed = await refreshAccessToken(stored.refresh_token);
      if (!refreshed) return res.json({ connected: false, emails: [], error: 'failed to refresh token' });
      accessToken = refreshed.accessToken;
      await storeToken(email, stored.refresh_token, refreshed.accessToken, refreshed.expiresAt);
    }

    const emails = await fetchBoletoEmails(accessToken!);
    return res.json({ connected: true, emails });
  }

  // DISCONNECT — delete stored token
  if (action === 'disconnect') {
    try {
      // Delete all tokens
      const r = await fetch(`${SUPABASE_URL}/rest/v1/gmail_tokens`, {
        method: 'DELETE',
        headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
      });
      if (!r.ok) {
        const text = await r.text();
        return res.status(500).json({ error: text });
      }
      return res.json({ ok: true });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.status(400).json({ error: 'Unknown action. Use ?action=auth|callback|fetch|disconnect' });
}
