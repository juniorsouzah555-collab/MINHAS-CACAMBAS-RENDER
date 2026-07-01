import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!raw) return res.json({ ok: false, step: 'env' });

    let sa: any;
    try { sa = JSON.parse(raw); } catch (e: any) {
      return res.json({ ok: false, step: 'json_parse', error: e.message });
    }

    let pem: string = sa.private_key;
    if (pem.includes('\\n')) pem = pem.replace(/\\n/g, '\n');

    const body = pem
      .replace(/-----BEGIN PRIVATE KEY-----/, '')
      .replace(/-----END PRIVATE KEY-----/, '')
      .replace(/\s/g, '');

    const validBase64 = /^[A-Za-z0-9+/=]+$/.test(body);
    if (!validBase64) {
      const bad = body.split('').filter(c => !/[A-Za-z0-9+/=]/.test(c));
      return res.json({ ok: false, step: 'base64_invalid', codes: bad.slice(0, 5).map(c => c.charCodeAt(0)), bodyLen: body.length });
    }

    // Pad base64 to multiple of 4, then decode
    const pad = (4 - (body.length % 4)) % 4;
    const der = Buffer.from(body + '='.repeat(pad), 'base64');

    // Parse outer SEQUENCE length from DER to strip any trailing bytes
    function exactDer(buf: Buffer): Buffer {
      if (buf[0] !== 0x30) return buf;
      let len: number;
      if (buf[1] === 0x82) len = (buf[2] << 8) | buf[3];
      else if (buf[1] === 0x81) len = buf[2];
      else len = buf[1];
      const hdrLen = buf[1] >= 0x80 ? 2 + (buf[1] & 0x7f) : 2;
      return buf.slice(0, hdrLen + len);
    }

    const trimmedDer = exactDer(der);

    let cryptoKey: CryptoKey;
    try {
      cryptoKey = await globalThis.crypto.subtle.importKey(
        'pkcs8', trimmedDer,
        { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' } },
        false, ['sign']
      );
    } catch (e: any) {
      return res.json({ ok: false, step: 'import_pkcs8', error: e.message, derLen: der.length, trimmedLen: trimmedDer.length, bodyLen: body.length });
    }

    try {
      const sigBytes = await globalThis.crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, Buffer.from('test'));
      res.json({ ok: true, env: true, sigLen: sigBytes.byteLength });
    } catch (e: any) {
      return res.json({ ok: false, step: 'sign', error: e.message });
    }
  } catch (e: any) {
    res.json({ ok: false, step: 'unknown', error: e.message });
  }
}
