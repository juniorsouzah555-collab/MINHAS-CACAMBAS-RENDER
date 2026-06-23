import type { VercelRequest, VercelResponse } from '@vercel/node';

const CLIENT_ID = process.env.GMAIL_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || '';
const REDIRECT_URI = 'https://relampago-cacambas-novo.vercel.app/api/gmail/callback';
const SUPABASE_URL = 'https://wxxyvsidghvidqbypmmp.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const SB_H = { 'Content-Type': 'application/json', apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` };

// ---- TOKEN STORAGE ----

async function getStoredToken(email: string) {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/gmail_tokens?email=eq.${encodeURIComponent(email)}&select=refresh_token,access_token,expires_at&limit=1`, { headers: SB_H });
    if (!r.ok) return null;
    const data = await r.json();
    return data?.[0] || null;
  } catch { return null; }
}

async function upsertToken(email: string, refreshToken: string, accessToken: string, expiresAt: number) {
  try {
    const body = { refresh_token: refreshToken, access_token: accessToken, expires_at: expiresAt };
    const existing = await getStoredToken(email);
    if (existing) {
      await fetch(`${SUPABASE_URL}/rest/v1/gmail_tokens?email=eq.${encodeURIComponent(email)}`, { method: 'PATCH', headers: { ...SB_H, Prefer: 'return=minimal' }, body: JSON.stringify(body) });
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/gmail_tokens`, { method: 'POST', headers: { ...SB_H, Prefer: 'return=minimal' }, body: JSON.stringify({ email, ...body }) });
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

async function getFirstEmail(): Promise<string | null> {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/gmail_tokens?select=email&limit=1`, { headers: SB_H });
    if (!r.ok) return null;
    const list = await r.json();
    return list?.[0]?.email || null;
  } catch { return null; }
}

async function getAccessToken(): Promise<{ token: string; email: string } | null> {
  const email = await getFirstEmail();
  if (!email) return null;
  const stored = await getStoredToken(email);
  if (!stored) return null;
  let accessToken = stored.access_token;
  if (!accessToken || !stored.expires_at || stored.expires_at < Date.now()) {
    if (!stored.refresh_token) return null;
    const refreshed = await refreshAccessToken(stored.refresh_token);
    if (!refreshed) return null;
    accessToken = refreshed.accessToken;
    await upsertToken(email, stored.refresh_token, refreshed.accessToken, refreshed.expiresAt);
  }
  return { token: accessToken, email };
}

// ---- FILTERS ----

async function getFilters() {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/gmail_filters?select=id,type,value&order=id.asc`, { headers: SB_H });
    if (!r.ok) return [];
    return await r.json();
  } catch { return []; }
}

// ---- SEARCH ----

async function buildSearchQuery() {
  const defaultTerms = [
    'subject:boleto', 'subject:fatura', 'subject:2\u00aa via', 'subject:segunda via',
    'subject:cobran\u00e7a', 'subject:boleto eletr\u00f4nico',
  ];
  const filters = await getFilters();
  for (const f of filters) {
    if (f.type === 'subject') defaultTerms.push(`subject:${f.value}`);
    if (f.type === 'sender') defaultTerms.push(`from:${f.value}`);
    if (f.type === 'body') defaultTerms.push(f.value);
  }
  return `(${defaultTerms.join(' OR ')}) newer_than:180d`;
}

interface BoletoEmail {
  id: string; subject: string; from: string; date: string; snippet: string;
  hasAttachment: boolean; attachmentId?: string; filename?: string; mimeType?: string;
}

async function fetchBoletoEmails(accessToken: string) {
  const query = await buildSearchQuery();
  console.log('[GMAIL] query:', query);
  const r = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=50`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!r.ok) {
    const err = await r.text();
    console.error('[GMAIL] search error', r.status, err);
    return [];
  }
  const { messages = [] } = await r.json();
  if (messages.length === 0) return [];
  const result: BoletoEmail[] = [];
  for (const msg of messages.slice(0, 50)) {
    try {
      const detail = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!detail.ok) continue;
      const data = await detail.json();
      const h = data.payload?.headers || [];
      const from = h.find((x: any) => x.name === 'From')?.value?.replace(/<[^>]+>/g, '').trim().split('"').join('') || '';
      const subject = h.find((x: any) => x.name === 'Subject')?.value || '(sem assunto)';
      const date = h.find((x: any) => x.name === 'Date')?.value || '';
      const parts = data.payload?.parts || [];
      const attach = parts.find((p: any) => p.filename && p.filename.length > 0 && (p.mimeType === 'application/pdf' || p.filename?.toLowerCase().includes('boleto')));
      result.push({ id: msg.id, subject, from, date, snippet: data.snippet || '', hasAttachment: !!attach, attachmentId: attach?.body?.attachmentId, filename: attach?.filename, mimeType: attach?.mimeType });
    } catch {}
  }
  return result;
}

// ---- HANDLER ----

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = (req.query.action as string) || '';

  try {
    // AUTH
    if (action === 'auth') {
      return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
        client_id: CLIENT_ID, redirect_uri: REDIRECT_URI, response_type: 'code',
        scope: 'https://www.googleapis.com/auth/gmail.readonly', access_type: 'offline', prompt: 'consent',
      })}`);
    }

    // CALLBACK
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
      const profileRes = await fetch('https://www.googleapis.com/gmail/v1/users/me/profile', { headers: { Authorization: `Bearer ${tokens.access_token}` } });
      const profile = await profileRes.json();
      const email = profile.emailAddress || 'admin';
      if (tokens.refresh_token) await upsertToken(email, tokens.refresh_token, tokens.access_token, Date.now() + tokens.expires_in * 1000);
      return res.redirect('/?gmail=connected');
    }

    // FETCH
    if (action === 'fetch') {
      const tok = await getAccessToken();
      if (!tok) return res.json({ connected: false, emails: [] });
      const emails = await fetchBoletoEmails(tok.token);
      return res.json({ connected: true, emails });
    }

    // DOWNLOAD or VIEW (view opens inline, download saves)
    if (action === 'download' || action === 'view') {
      const msgId = req.query.msgId as string;
      const attachmentId = req.query.attachmentId as string;
      const filename = req.query.filename as string || 'boleto.pdf';
      if (!msgId || !attachmentId) return res.status(400).json({ error: 'Missing msgId or attachmentId' });
      const tok = await getAccessToken();
      if (!tok) return res.status(401).json({ error: 'Not connected' });
      const attRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}/attachments/${attachmentId}`, { headers: { Authorization: `Bearer ${tok.token}` } });
      if (!attRes.ok) return res.status(500).json({ error: 'Failed to fetch attachment' });
      const attData = await attRes.json();
      const buf = Buffer.from(attData.data, 'base64');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', action === 'view' ? `inline; filename="${filename}"` : `attachment; filename="${filename}"`);
      return res.send(buf);
    }

    // DISCONNECT
    if (action === 'disconnect') {
      const email = await getFirstEmail();
      if (email) {
        await fetch(`${SUPABASE_URL}/rest/v1/gmail_tokens?email=eq.${encodeURIComponent(email)}`, { method: 'DELETE', headers: { ...SB_H, Prefer: 'return=minimal' } });
      }
      return res.json({ ok: true });
    }

    // FILTERS — list
    if (action === 'getFilters') {
      const filters = await getFilters();
      return res.json({ filters });
    }

    // FILTERS — add
    if (action === 'addFilter' && req.method === 'POST') {
      const { type, value } = req.body;
      if (!type || !value) return res.status(400).json({ error: 'type and value required' });
      await fetch(`${SUPABASE_URL}/rest/v1/gmail_filters`, {
        method: 'POST', headers: { ...SB_H, Prefer: 'return=minimal' },
        body: JSON.stringify({ type, value }),
      });
      return res.json({ ok: true });
    }

    // FILTERS — remove
    if (action === 'removeFilter' && req.method === 'POST') {
      const id = req.body?.id || req.query.id;
      if (!id) return res.status(400).json({ error: 'id required' });
      await fetch(`${SUPABASE_URL}/rest/v1/gmail_filters?id=eq.${id}`, { method: 'DELETE', headers: { ...SB_H, Prefer: 'return=minimal' } });
      return res.json({ ok: true });
    }

    res.status(400).json({ error: 'Unknown action' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
