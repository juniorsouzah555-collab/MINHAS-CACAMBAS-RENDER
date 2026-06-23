import type { VercelRequest, VercelResponse } from '@vercel/node';

const CLIENT_ID = process.env.GMAIL_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || '';
const SUPABASE_URL = 'https://wxxyvsidghvidqbypmmp.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function getStoredToken(email: string): Promise<{ refreshToken: string; accessToken?: string; expiresAt?: number } | null> {
  try {
    const headers = { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` };
    const r = await fetch(`${SUPABASE_URL}/rest/v1/gmail_tokens?email=eq.${encodeURIComponent(email)}&select=refresh_token,access_token,expires_at&limit=1`, { headers });
    if (!r.ok) return null;
    const data = await r.json();
    if (!data || data.length === 0) return null;
    return { refreshToken: data[0].refresh_token, accessToken: data[0].access_token, expiresAt: data[0].expires_at };
  } catch { return null; }
}

async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: number } | null> {
  try {
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    if (!r.ok) return null;
    const data = await r.json();
    return { accessToken: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  } catch { return null; }
}

async function updateStoredToken(email: string, accessToken: string, expiresAt: number) {
  try {
    const headers = {
      'Content-Type': 'application/json',
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    };
    await fetch(`${SUPABASE_URL}/rest/v1/gmail_tokens?email=eq.${encodeURIComponent(email)}`, {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify({ access_token: accessToken, expires_at: expiresAt }),
    });
  } catch {}
}

interface BoletoEmail {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  hasAttachment: boolean;
  attachmentId?: string;
  filename?: string;
  mimeType?: string;
}

async function fetchBoletoEmails(accessToken: string): Promise<BoletoEmail[]> {
  // Search for emails with "boleto" or "fatura" in subject, from known senders
  const query = '(subject:boleto OR subject:BOLETO OR subject:fatura OR subject:FATURA) AND (from:bancodobrasil OR from:bb OR from:itau OR from:santander OR from:bradesco OR from:caixa OR from:picpay OR from:mercadopago)';
  const r = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=20`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!r.ok) return [];

  const { messages = [] } = await r.json();
  if (messages.length === 0) return [];

  const result: BoletoEmail[] = [];

  for (const msg of messages.slice(0, 20)) {
    try {
      const detail = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!detail.ok) continue;
      const data = await detail.json();

      const headers = data.payload?.headers || [];
      const from = headers.find((h: any) => h.name === 'From')?.value || '';
      const subject = headers.find((h: any) => h.name === 'Subject')?.value || '(sem assunto)';
      const date = headers.find((h: any) => h.name === 'Date')?.value || '';
      const snippet = data.snippet || '';

      // Check for attachments (PDF = boleto)
      const parts = data.payload?.parts || [];
      const attach = parts.find((p: any) => p.filename && p.filename.length > 0 && (p.mimeType === 'application/pdf' || p.mimeType?.includes('pdf') || p.filename?.toLowerCase().includes('boleto')));

      result.push({
        id: msg.id,
        subject,
        from: from.replace(/<[^>]+>/g, '').trim().split('"').join(''),
        date,
        snippet,
        hasAttachment: !!attach,
        attachmentId: attach?.body?.attachmentId || undefined,
        filename: attach?.filename || undefined,
        mimeType: attach?.mimeType || undefined,
      });
    } catch {}
  }

  return result;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const email = req.query.email as string || 'admin';

  try {
    const stored = await getStoredToken(email);
    if (!stored) {
      return res.json({ connected: false, emails: [] });
    }

    let accessToken = stored.accessToken;
    const now = Date.now();

    if (!accessToken || !stored.expiresAt || stored.expiresAt < now) {
      if (!stored.refreshToken) {
        return res.json({ connected: false, emails: [], error: 'refresh token expired' });
      }
      const refreshed = await refreshAccessToken(stored.refreshToken);
      if (!refreshed) {
        return res.json({ connected: false, emails: [], error: 'failed to refresh token' });
      }
      accessToken = refreshed.accessToken;
      await updateStoredToken(email, refreshed.accessToken, refreshed.expiresAt);
    }

    const emails = await fetchBoletoEmails(accessToken!);
    res.json({ connected: true, emails });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
