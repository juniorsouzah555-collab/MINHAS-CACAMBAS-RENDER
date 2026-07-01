import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createSign, createPrivateKey } from 'node:crypto';

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
      return res.json({ ok: false, step: 'json_parse', error: e.message, rawStart: raw.slice(0, 30) });
    }

    const rawPem = sa.private_key;
    let pem: string;
    try {
      pem = normalizePem(rawPem);
    } catch (e: any) {
      return res.json({ ok: false, step: 'normalize_pem', error: e.message });
    }

    let keyObj: any;
    try {
      keyObj = createPrivateKey(pem);
    } catch (e: any) {
      return res.json({ ok: false, step: 'create_key', error: e.message, pemStart: pem.slice(0, 80) });
    }

    try {
      const signer = createSign('RSA-SHA256');
      signer.update('test');
      const sig = signer.sign(keyObj, 'base64url');
      res.json({ ok: true, env: true, sigLen: sig.length });
    } catch (e: any) {
      return res.json({ ok: false, step: 'sign', error: e.message });
    }
  } catch (e: any) {
    res.json({ ok: false, step: 'unknown', error: e.message });
  }
}
