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

function q(prefix: string, value: string): string {
  // Quote value if it contains spaces so Gmail treats it as a phrase
  return value.includes(' ') ? `${prefix}:"${value}"` : `${prefix}:${value}`;
}

function raw(value: string): string {
  // For body search, quote if it contains spaces
  return value.includes(' ') ? `"${value}"` : value;
}

async function buildSearchQuery(strict: boolean) {
  const defaultTerms = [
    q('subject', 'boleto'), q('subject', 'fatura'), q('subject', '2\u00aa via'),
    q('subject', 'segunda via'), q('subject', 'cobran\u00e7a'), q('subject', 'boleto eletr\u00f4nico'),
  ];
  const filters = await getFilters();
  const filterTerms: string[] = [];
  for (const f of filters) {
    if (f.type === 'subject') filterTerms.push(q('subject', f.value));
    if (f.type === 'sender') filterTerms.push(q('from', f.value));
    if (f.type === 'body') filterTerms.push(raw(f.value));
  }
  if (strict) {
    // Modo restrito: busca SÓ pelos remetentes cadastrados (filtro sender)
    const senderFilters = filters.filter(f => f.type === 'sender');
    if (senderFilters.length === 0) return null;
    const terms = senderFilters.map(f => q('from', f.value));
    return `(${terms.join(' OR ')}) newer_than:180d`;
  }
  // Modo abrangente: termos padrão + filtros do usuário
  return `(${[...defaultTerms, ...filterTerms].join(' OR ')}) newer_than:180d`;
}

interface BoletoEmail {
  id: string; subject: string; from: string; date: string; snippet: string;
  hasAttachment: boolean; attachmentId?: string; filename?: string; mimeType?: string;
  boletoLink?: string;
  alias?: string;
  hasProvider?: boolean;
}

function findAttachment(part: any): any {
  if (!part) return null;
  if (part.filename && part.filename.length > 0 && (part.mimeType === 'application/pdf' || part.filename?.toLowerCase().includes('boleto'))) {
    return part;
  }
  if (part.parts) {
    for (const p of part.parts) {
      const found = findAttachment(p);
      if (found) return found;
    }
  }
  return null;
}

function decodeBody(part: any): string[] {
  const texts: string[] = [];
  if (!part) return texts;
  if (part.body?.data && (part.mimeType === 'text/html' || part.mimeType === 'text/plain')) {
    try {
      texts.push(Buffer.from(part.body.data, 'base64').toString('utf-8'));
    } catch {}
  }
  if (part.parts) {
    for (const p of part.parts) {
      texts.push(...decodeBody(p));
    }
  }
  return texts;
}

function extractBoletoLink(bodies: string[]): string | null {
  const allUrls: string[] = [];
  const urlRegex = /https?:\/\/[^\s"<>']+/gi;
  for (const body of bodies) {
    const matches = body.match(urlRegex);
    if (matches) allUrls.push(...matches);
  }

  // Score URLs: higher is more likely to be the boleto link
  const score = (url: string): number => {
    const u = url.toLowerCase();
    let s = 0;
    if (/\.pdf\b/.test(u)) s += 100;
    if (/\b(?:boleto|fatura|cobranca)\b/.test(u)) s += 50;
    if (/\b(?:invoice|payment|pay|checkout)\b/.test(u)) s += 30;
    if (/asaas\.com\/[a-z]\/[a-z0-9]{16}/.test(u)) s += 80; // ASAAS invoice pattern
    if (/asaas\.com\/(?:cobranca|invoice|payment)/.test(u)) s += 60;
    if (/mercadopago/.test(u)) s += 40;
    if (/pagar\.me/.test(u)) s += 40;
    if (/\/(?:boleto|fatura|cobranca|2avia|2a-via|segunda-via)\b/.test(u)) s += 50;
    // Lello / Resolva Fácil patterns
    if (/resolvafacil/.test(u)) s += 80;
    if (/\?.*token=/.test(u)) s += 60;
    if (/\?.*uuid=/.test(u)) s += 50;
    if (/lellocondominios/.test(u) && /\/api\//.test(u)) s += 70;
    // Penalize image/resource URLs
    if (/customerLogo|logo|\.png|\.jpg|\.gif|\.css|favicon/i.test(u)) s -= 80;
    if (/unsubscribe|tracking|open\?/i.test(u)) s -= 60;
    if (/prevencao-fraude|prevencao[/-]fraude/i.test(u)) s -= 80;
    return s;
  };

  const scored = allUrls.map(u => ({ url: u, score: score(u) })).filter(x => x.score > 0);
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.url || null;
}

async function getAliases() {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/gmail_aliases?select=*&order=id.asc`, { headers: SB_H });
    if (!r.ok) return [];
    return await r.json();
  } catch { return []; }
}

async function getHiddenIds() {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/gmail_hidden?select=message_id`, { headers: SB_H });
    if (!r.ok) return new Set<string>();
    const data = await r.json();
    return new Set(data.map((x: any) => x.message_id));
  } catch { return new Set(); }
}

function resolveAlias(from: string, aliases: any[]): string | undefined {
  const lower = from.toLowerCase();
  // Try exact email match first, then domain match
  const emailMatch = aliases.find(a => lower.includes(a.sender.toLowerCase()));
  if (emailMatch) return emailMatch.alias;
  // Try domain-only match
  const domain = from.match(/@([\w-]+\.\w+)/)?.[1]?.toLowerCase();
  if (domain) {
    const domainMatch = aliases.find(a => domain.includes(a.sender.toLowerCase()) || a.sender.toLowerCase().includes(domain));
    if (domainMatch) return domainMatch.alias;
  }
  return undefined;
}

// ---- BOLETO PROVIDERS ----

interface BoletoProvider {
  id: number; sender: string; password: string;
}

async function getProviders(): Promise<BoletoProvider[]> {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/gmail_filters?type=eq.provider&select=id,value&order=id.asc`, { headers: SB_H });
    if (!r.ok) return [];
    const rows = await r.json() as { id: number; value: string }[];
    return rows.map(r => ({ id: r.id, ...JSON.parse(r.value) })).filter(p => p.sender && p.password);
  } catch { return []; }
}

async function addProvider(sender: string, password: string) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/gmail_filters`, {
      method: 'POST', headers: { ...SB_H, Prefer: 'return=minimal' },
      body: JSON.stringify({ type: 'provider', value: JSON.stringify({ sender, password }) }),
    });
    return true;
  } catch { return false; }
}

async function removeProvider(id: number) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/gmail_filters?id=eq.${id}`, { method: 'DELETE', headers: { ...SB_H, Prefer: 'return=minimal' } });
    return true;
  } catch { return false; }
}

async function tryFetchProviderPdf(boletoUrl: string, password: string): Promise<{ buffer: Buffer; filename: string } | null> {
  try {
    const parsed = new URL(boletoUrl);

    // Lello Resolva Fácil
    if (parsed.hostname.includes('lellocondominios') || parsed.hostname.includes('resolvafacil')) {
      const token = parsed.searchParams.get('token');
      const uuid = parsed.searchParams.get('uuid');
      const hashId = parsed.searchParams.get('x-lello-parceiro-hashid') || '';
      if (!token || !uuid) return null;

      const apiUrl = `https://api.lellocondominios.com.br/resolvafacil-api/v2/external/primeira-via?token=${encodeURIComponent(token)}&uuid=${encodeURIComponent(uuid)}&digitosDocumento=${encodeURIComponent(password)}`;
      const res = await fetch(apiUrl, {
        headers: hashId ? { 'x-lello-parceiro-hashid': hashId } : {},
      });
      if (res.ok && res.headers.get('content-type')?.includes('pdf')) {
        const buffer = Buffer.from(await res.arrayBuffer());
        return { buffer, filename: `boleto-lello-${uuid.substring(0, 8)}.pdf` };
      }
    }
  } catch (e) {
    console.error('[PROVIDER] fetch error', e);
  }
  return null;
}

async function fetchBoletoEmails(accessToken: string, strict: boolean) {
  const query = await buildSearchQuery(strict);
  if (!query) return []; // strict mode sem filtros → vazio
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
  console.log('[GMAIL] found', messages.length, 'messages');
  if (messages.length === 0) return [];

  const hiddenIds = await getHiddenIds();
  const aliases = await getAliases();
  const providers = await getProviders();

  const result: BoletoEmail[] = [];
  for (const msg of messages.slice(0, 50)) {
    if (hiddenIds.has(msg.id)) continue;
    try {
      const detail = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!detail.ok) continue;
      const data = await detail.json();
      const h = data.payload?.headers || [];
      const rawFrom = h.find((x: any) => x.name === 'From')?.value || '';
      const from = rawFrom.replace(/<[^>]+>/g, '').trim().split('"').join('') || '';
      const fromEmail = rawFrom.match(/<([^>]+)>/)?.[1] || rawFrom.trim();
      const subject = h.find((x: any) => x.name === 'Subject')?.value || '(sem assunto)';
      const date = h.find((x: any) => x.name === 'Date')?.value || '';

      const attach = data.payload?.body?.attachmentId
        ? data.payload.body
        : findAttachment(data.payload);

      let boletoLink: string | undefined;
      if (!attach) {
        const bodies = decodeBody(data.payload);
        const link = extractBoletoLink(bodies);
        if (link) boletoLink = link;
      }

      // Só inclui se tem PDF anexado OU link válido para gerar o boleto
      if (!attach && !boletoLink) continue;

      const hasProvider = !!boletoLink && providers.some(p => p.sender && (p.sender === from || p.sender === fromEmail));

      result.push({
        id: msg.id, subject, from, date, snippet: data.snippet || '',
        hasAttachment: !!attach,
        attachmentId: attach?.body?.attachmentId || attach?.attachmentId,
        filename: attach?.filename, mimeType: attach?.mimeType,
        boletoLink,
        alias: resolveAlias(from, aliases),
        hasProvider,
      });
    } catch (e) { console.error('[GMAIL] detail error', msg.id, e); }
  }
  console.log('[GMAIL] returning', result.length, 'emails,', result.filter(r => r.hasAttachment).length, 'with attachments,', result.filter(r => r.boletoLink).length, 'with links');
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
      if (!tok) return res.json({ connected: false, emails: [], mode: req.query.mode || 'broad' });
      const strict = req.query.mode === 'strict';
      const [emails, aliases] = await Promise.all([fetchBoletoEmails(tok.token, strict), getAliases()]);
      return res.json({ connected: true, emails, aliases, mode: strict ? 'strict' : 'broad' });
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

    // FILTERS — list (exclude provider-type filters)
    if (action === 'getFilters') {
      const all = await getFilters();
      const filters = all.filter((f: any) => f.type !== 'provider');
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

    // PROVIDERS — list
    if (action === 'getProviders') {
      const providers = await getProviders();
      return res.json({ providers });
    }

    // PROVIDERS — add
    if (action === 'addProvider' && req.method === 'POST') {
      const { sender, password } = req.body || {};
      if (!sender || !password) return res.status(400).json({ error: 'sender and password required' });
      await addProvider(sender, password);
      return res.json({ ok: true });
    }

    // PROVIDERS — remove
    if (action === 'removeProvider' && req.method === 'POST') {
      const id = req.body?.id || req.query.id;
      if (!id) return res.status(400).json({ error: 'id required' });
      await removeProvider(Number(id));
      return res.json({ ok: true });
    }

    // PROVIDERS — download PDF
    if (action === 'downloadProviderPdf') {
      const boletoUrl = req.query.url as string;
      const sender = req.query.sender as string;
      if (!boletoUrl || !sender) return res.status(400).json({ error: 'url and sender required' });

      const providers = await getProviders();
      const provider = providers.find(p => p.sender === sender);
      if (!provider) return res.status(404).json({ error: 'Provider not found for this sender' });

      const pdf = await tryFetchProviderPdf(boletoUrl, provider.password);
      if (!pdf) return res.status(404).json({ error: 'Não foi possível obter o PDF. Verifique a senha cadastrada.' });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${pdf.filename}"`);
      return res.send(pdf.buffer);
    }

    // HIDE EMAIL
    if (action === 'hideEmail' && req.method === 'POST') {
      const { messageId } = req.body;
      if (!messageId) return res.status(400).json({ error: 'messageId required' });
      await fetch(`${SUPABASE_URL}/rest/v1/gmail_hidden`, {
        method: 'POST', headers: { ...SB_H, Prefer: 'return=minimal' },
        body: JSON.stringify({ message_id: messageId }),
      });
      return res.json({ ok: true });
    }

    // ALIASES — list
    if (action === 'getAliases') {
      const aliases = await getAliases();
      return res.json({ aliases });
    }

    // ALIASES — save
    if (action === 'saveAlias' && req.method === 'POST') {
      const { sender, alias } = req.body;
      if (!sender || !alias) return res.status(400).json({ error: 'sender and alias required' });
      // Upsert: try insert, conflict on sender -> update
      const existing = await fetch(`${SUPABASE_URL}/rest/v1/gmail_aliases?sender=eq.${encodeURIComponent(sender)}&select=id&limit=1`, { headers: SB_H });
      const existingData = await existing.json();
      if (existingData?.[0]?.id) {
        await fetch(`${SUPABASE_URL}/rest/v1/gmail_aliases?id=eq.${existingData[0].id}`, {
          method: 'PATCH', headers: { ...SB_H, Prefer: 'return=minimal' },
          body: JSON.stringify({ alias }),
        });
      } else {
        await fetch(`${SUPABASE_URL}/rest/v1/gmail_aliases`, {
          method: 'POST', headers: { ...SB_H, Prefer: 'return=minimal' },
          body: JSON.stringify({ sender, alias }),
        });
      }
      return res.json({ ok: true });
    }

    // ALIASES — delete
    if (action === 'deleteAlias' && req.method === 'POST') {
      const id = req.body?.id || req.query.id;
      if (!id) return res.status(400).json({ error: 'id required' });
      await fetch(`${SUPABASE_URL}/rest/v1/gmail_aliases?id=eq.${id}`, { method: 'DELETE', headers: { ...SB_H, Prefer: 'return=minimal' } });
      return res.json({ ok: true });
    }

    res.status(400).json({ error: 'Unknown action' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
