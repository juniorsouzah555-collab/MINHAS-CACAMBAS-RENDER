import type { VercelRequest, VercelResponse } from '@vercel/node';
import { importPKCS8, SignJWT } from 'jose';

function normalizePem(raw: string): string {
  let pem = raw.includes('\\n') ? raw.replace(/\\n/g, '\n') : raw;
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  const lines = (body.match(/.{1,64}/g) || []).join('\n');
  return `-----BEGIN PRIVATE KEY-----\n${lines}\n-----END PRIVATE KEY-----\n`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!raw) return res.json({ ok: false, step: 'env', error: 'env not set' });

    let sa: any;
    try {
      sa = JSON.parse(raw);
    } catch (e: any) {
      return res.json({ ok: false, step: 'json_parse', error: e.message });
    }

    const rawPem = sa.private_key;
    const pem = normalizePem(rawPem);

    // Extract body and check for invalid chars
    const body = pem
      .replace(/-----BEGIN PRIVATE KEY-----/, '')
      .replace(/-----END PRIVATE KEY-----/, '')
      .replace(/\s/g, '');

    const validBase64 = /^[A-Za-z0-9+/=]+$/.test(body);
    const invalidChars = body.split('').filter(c => !/[A-Za-z0-9+/=]/.test(c)).slice(0, 5);

    // Try Buffer.from to decode base64 manually
    let bufferOk = false;
    let bufferErr = '';
    try {
      const buf = Buffer.from(body, 'base64');
      bufferOk = buf.length > 0;
    } catch (e: any) {
      bufferErr = e.message;
    }

    if (!validBase64) {
      return res.json({
        ok: false, step: 'base64_check',
        validBase64, invalidChars: invalidChars.map(c => c.charCodeAt(0)),
        bodyLen: body.length, bufferOk, bufferErr
      });
    }

    let key: any;
    try {
      key = await importPKCS8(pem, 'RS256');
    } catch (e: any) {
      return res.json({
        ok: false, step: 'import_key', error: e.message,
        validBase64, bodyLen: body.length, pemLen: pem.length,
        hasLiteralSlashN: rawPem.includes('\\n'),
        lineCount: pem.split('\n').length
      });
    }

    try {
      const now = Math.floor(Date.now() / 1000);
      const jwt = await new SignJWT({ iss: 'test', aud: 'test', exp: now + 60, iat: now })
        .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
        .sign(key);
      res.json({ ok: true, env: true, sigLen: jwt.length });
    } catch (e: any) {
      return res.json({ ok: false, step: 'sign', error: e.message });
    }
  } catch (e: any) {
    res.json({ ok: false, step: 'unknown', error: e.message });
  }
}
