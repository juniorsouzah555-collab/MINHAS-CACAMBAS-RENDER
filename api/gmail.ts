import type { VercelRequest, VercelResponse } from '@vercel/node';
import { adminDb } from './lib/firebase-admin';

const CLIENT_ID = process.env.GMAIL_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || '';
const REDIRECT_URI = 'https://relampago-cacambas-novo.vercel.app/api/gmail/callback';

// ---- FIRESTORE HELPERS ----

async function getDoc(table: string, field: string, value: string): Promise<any | null> {
  try {
    const snap = await adminDb.collection(table).where(field, '==', value).get();
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() };
  } catch { return null; }
}

async function getDocs(table: string, constraints?: { field: string; op: string; value: any }[]): Promise<any[]> {
  try {
    let query: FirebaseFirestore.Query = adminDb.collection(table);
    if (constraints) {
      for (const c of constraints) {
        query = query.where(c.field, c.op as any, c.value);
      }
    }
    const snap = await query.get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch { return []; }
}

async function upsertDoc(table: string, data: any, field?: string) {
  try {
    if (field && data[field]) {
      const snap = await adminDb.collection(table).where(field, '==', data[field]).get();
      if (!snap.empty) {
        await snap.docs[0].ref.update(data);
        return;
      }
    }
    const id = data.id || adminDb.collection(table).doc().id;
    await adminDb.collection(table).doc(id).set({ ...data, id });
  } catch {}
}

async function deleteDocs(table: string, field: string, value: string) {
  try {
    const snap = await adminDb.collection(table).where(field, '==', value).get();
    const batch = adminDb.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  } catch {}
}

async function deleteDocById(table: string, id: string) {
  try {
    await adminDb.collection(table).doc(id).delete();
  } catch {}
}

// ---- TOKEN STORAGE ----

async function getStoredToken(email: string) {
  return getDoc('gmail_tokens', 'email', email);
}

async function upsertToken(email: string, refreshToken: string, accessToken: string, expiresAt: number) {
  await upsertDoc('gmail_tokens', { email, refresh_token: refreshToken, access_token: accessToken, expires_at: expiresAt }, 'email');
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
    const docs = await getDocs('gmail_tokens');
    return docs?.[0]?.email || null;
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
  return getDocs('gmail_filters', [{ field: 'type', op: '!=', value: 'provider' }]);
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

async function buildSearchQuery(strict: boolean, days: number = 30) {
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
  const age = `newer_than:${days}d`;
  if (strict) {
    // Modo restrito: busca SÓ pelos remetentes cadastrados (filtro sender)
    const senderFilters = filters.filter(f => f.type === 'sender');
    if (senderFilters.length === 0) return null;
    const terms = senderFilters.map(f => q('from', f.value));
    return `(${terms.join(' OR ')}) ${age}`;
  }
  // Modo abrangente: termos padrão + filtros do usuário
  return `(${[...defaultTerms, ...filterTerms].join(' OR ')}) ${age}`;
}

interface BoletoEmail {
  id: string; subject: string; from: string; fromEmail?: string; date: string; snippet: string;
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
  let best = scored[0]?.url || null;

  // For Resolva Fácil URLs, unescape HTML entities and add uuid from JWT if missing
  if (best && (/resolvafacil/.test(best) || /lellocondominios/.test(best))) {
    try {
      // Unescape HTML entities like &amp; → &
      let cleaned = best.replace(/&amp;/g, '&');
      const parsed = new URL(cleaned);
      const token = parsed.searchParams.get('token') || '';

      // Extract uuid from JWT payload if not in URL
      if (token && !parsed.searchParams.has('uuid') && token.split('.').length === 3) {
        try {
          const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
          const uuid = payload.UUID || payload.uuid || '';
          if (uuid) parsed.searchParams.set('uuid', uuid);
        } catch {}
      }

      // Extract x-lello-parceiro-hashid from email body if not in URL
      if (!parsed.searchParams.has('x-lello-parceiro-hashid')) {
        for (const body of bodies) {
          const hashMatch = body.match(/x-lello-parceiro-hashid[=:]\s*([a-f0-9-]+)/i);
          if (hashMatch) {
            parsed.searchParams.set('x-lello-parceiro-hashid', hashMatch[1]);
            break;
          }
        }
      }

      // Prefer /boletos?token= over /prestacao-contas
      if (parsed.pathname.includes('/prestacao-contas') && token) {
        parsed.pathname = parsed.pathname.replace('/prestacao-contas', '/boletos');
      }

      best = parsed.toString();
    } catch {}
  }

  return best;
}

async function getAliases() {
  try {
    const docs = await getDocs('gmail_aliases');
    return docs;
  } catch { return []; }
}

async function getHiddenIds() {
  try {
    const docs = await getDocs('gmail_hidden');
    return new Set(docs.map((x: any) => x.message_id));
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
    const rows = await getDocs('gmail_filters', [{ field: 'type', op: '==', value: 'provider' }]);
    return rows.map(r => ({ id: r.id, ...JSON.parse(r.value || '{}') })).filter(p => p.sender && p.password);
  } catch { return []; }
}

async function addProvider(sender: string, password: string) {
  try {
    const data = { type: 'provider', value: JSON.stringify({ sender, password }) };
    const id = adminDb.collection('gmail_filters').doc().id;
    await adminDb.collection('gmail_filters').doc(id).set({ ...data, id });
    return true;
  } catch { return false; }
}

async function removeProvider(id: string) {
  try {
    await adminDb.collection('gmail_filters').doc(id).delete();
    return true;
  } catch { return false; }
}

async function tryFetchProviderPdf(boletoUrl: string, password: string): Promise<{ buffer: Buffer; filename: string } | null> {
  try {
    const parsed = new URL(boletoUrl);

    // Lello Resolva Fácil
    if (parsed.hostname.includes('lellocondominios') || parsed.hostname.includes('resolvafacil')) {
      const token = parsed.searchParams.get('token') || '';
      let uuid = parsed.searchParams.get('uuid') || '';
      const hashId = parsed.searchParams.get('x-lello-parceiro-hashid') || '';

      // If token is a JWT, decode it to extract the UUID from the payload
      if (!uuid && token && token.split('.').length === 3) {
        try {
          const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
          uuid = payload.UUID || payload.uuid || '';
        } catch {}
      }

      if (!token) return null;

      // Strategy 1: POST /primeira-via/boleto with Bearer token (used by SPA manual download)
      if (token.split('.').length === 3) {
        try {
          const postRes = await fetch('https://api.lellocondominios.com.br/resolvafacil-api/v2/external/primeira-via/boleto', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              ...(hashId ? { 'x-lello-parceiro-hashid': hashId } : {}),
            },
            body: JSON.stringify({ cpf: password }),
          });
          if (postRes.ok && postRes.headers.get('content-type')?.includes('pdf')) {
            const buffer = Buffer.from(await postRes.arrayBuffer());
            return { buffer, filename: `boleto-lello.pdf` };
          }
          if (postRes.status !== 404 && postRes.status !== 410) {
            console.error('[PROVIDER] POST /primeira-via/boleto failed', postRes.status);
          }
        } catch (e) {
          console.error('[PROVIDER] POST /primeira-via/boleto error', e);
        }
      }

      // Strategy 2: GET /primeira-via with query params (legacy, may return 500)
      if (uuid) {
        const apiUrl = `https://api.lellocondominios.com.br/resolvafacil-api/v2/external/primeira-via?token=${encodeURIComponent(token)}&uuid=${encodeURIComponent(uuid)}&digitosDocumento=${encodeURIComponent(password)}`;
        const res = await fetch(apiUrl, {
          headers: hashId ? { 'x-lello-parceiro-hashid': hashId } : {},
        });
        if (res.ok && res.headers.get('content-type')?.includes('pdf')) {
          const buffer = Buffer.from(await res.arrayBuffer());
          return { buffer, filename: `boleto-lello-${typeof uuid === 'string' ? uuid.substring(0, 8) : ''}.pdf` };
        }
      }
    }
  } catch (e) {
    console.error('[PROVIDER] fetch error', e);
  }
  return null;
}

async function fetchBoletoEmails(accessToken: string, strict: boolean, days: number = 30) {
  const query = await buildSearchQuery(strict, days);
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
        id: msg.id, subject, from, fromEmail, date, snippet: data.snippet || '',
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
      const days = parseInt(req.query.days as string) || 30;
      const [emails, aliases] = await Promise.all([fetchBoletoEmails(tok.token, strict, days), getAliases()]);
      return res.json({ connected: true, emails, aliases, mode: strict ? 'strict' : 'broad', days });
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
        await deleteDocs('gmail_tokens', 'email', email);
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
      const id = adminDb.collection('gmail_filters').doc().id;
      await adminDb.collection('gmail_filters').doc(id).set({ type, value, id });
      return res.json({ ok: true });
    }

    // FILTERS — remove
    if (action === 'removeFilter' && req.method === 'POST') {
      const id = req.body?.id || req.query.id;
      if (!id) return res.status(400).json({ error: 'id required' });
      await deleteDocById('gmail_filters', id);
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
      await removeProvider(id);
      return res.json({ ok: true });
    }

    // PROVIDERS — download PDF
    if (action === 'downloadProviderPdf') {
      const boletoUrl = req.query.url as string;
      const sender = req.query.sender as string;
      const senderEmail = req.query.senderEmail as string;
      if (!boletoUrl || !sender) return res.status(400).json({ error: 'url and sender required' });

      const providers = await getProviders();
      const provider = providers.find(p => p.sender === sender || (senderEmail && p.sender === senderEmail));
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
      const id = adminDb.collection('gmail_hidden').doc().id;
      await adminDb.collection('gmail_hidden').doc(id).set({ message_id: messageId, id });
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
      await upsertDoc('gmail_aliases', { sender, alias }, 'sender');
      return res.json({ ok: true });
    }

    // ALIASES — delete
    if (action === 'deleteAlias' && req.method === 'POST') {
      const id = req.body?.id || req.query.id;
      if (!id) return res.status(400).json({ error: 'id required' });
      await deleteDocById('gmail_aliases', id);
      return res.json({ ok: true });
    }

    res.status(400).json({ error: 'Unknown action' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
