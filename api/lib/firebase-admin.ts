import { randomUUID } from 'node:crypto';
const subtle = globalThis.crypto.subtle;

const PROJECT_ID = 'cacambas-4ecdb';

let cachedToken: { value: string; exp: number } | null = null;
let cachedSA: any = null;
let cachedKey: any = null;

function getSA(): any {
  if (cachedSA) return cachedSA;
  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!key) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not set');
  cachedSA = JSON.parse(key);
  return cachedSA;
}

function b64url(s: string): string {
  return Buffer.from(s).toString('base64url');
}

async function signJwt(payload: Record<string, any>): Promise<string> {
  const sa = getSA();
  let pem = sa.private_key;
  if (pem.includes('\\n')) pem = pem.replace(/\\n/g, '\n');
  const match = pem.match(/-----BEGIN[^-]+-----([\s\S]+?)-----END[^-]+-----/);
  if (!match) throw new Error('No PEM match');
  const b64 = match[1].replace(/\s/g, '');
  const der = Buffer.from(b64, 'base64');

  if (!cachedKey) {
    const info = `derLen:${der.length} firstHex:${der.slice(0,12).toString('hex')}`;
    const { createPrivateKey } = await import('node:crypto');
    let nodeKey: any;
    try {
      nodeKey = createPrivateKey({ key: der, format: 'der', type: 'pkcs8' });
    } catch (e: any) {
      throw new Error(`createPrivateKey fail: ${e.message} (${info})`);
    }
    try {
      cachedKey = await subtle.importKey(
        'pkcs8',
        nodeKey.export({ format: 'der', type: 'pkcs8' }),
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['sign']
      );
    } catch (e: any) {
      throw new Error(`subtle.importKey fail: ${e.message} (${info})`);
    }
  }

  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify(payload));
  const message = new TextEncoder().encode(`${header}.${body}`);
  const sig = await subtle.sign({ name: 'RSASSA-PKCS1-v1_5' }, cachedKey, message);
  return `${header}.${body}.${Buffer.from(sig).toString('base64url')}`;
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.exp) return cachedToken.value;
  const sa = getSA();
  const now = Math.floor(Date.now() / 1000);
  const jwt = await signJwt({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/identitytoolkit',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  const data: any = await res.json();
  if (!data.access_token) throw new Error(`Token exchange failed: ${data.error} - ${data.error_description}`);
  cachedToken = { value: data.access_token, exp: Date.now() + (data.expires_in - 60) * 1000 };
  return data.access_token;
}

// ─── Firestore REST ───

function docUrl(collection: string, docId?: string) {
  const base = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${encodeURIComponent(collection)}`;
  return docId ? `${base}/${encodeURIComponent(docId)}` : base;
}

function toFields(data: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    if (typeof v === 'string') fields[k] = { stringValue: v };
    else if (typeof v === 'number') fields[k] = Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    else if (typeof v === 'boolean') fields[k] = { booleanValue: v };
    else if (v instanceof Date) fields[k] = { timestampValue: v.toISOString() };
    else if (v === null) fields[k] = { nullValue: null };
    else fields[k] = { stringValue: String(v) };
  }
  return fields;
}

function fromDoc(doc: any): any {
  if (!doc?.fields) return {};
  const data: Record<string, any> = {};
  for (const [k, v] of Object.entries(doc.fields as Record<string, any>)) {
    if ((v as any).stringValue !== undefined) data[k] = (v as any).stringValue;
    else if ((v as any).integerValue !== undefined) data[k] = parseInt((v as any).integerValue, 10);
    else if ((v as any).doubleValue !== undefined) data[k] = (v as any).doubleValue;
    else if ((v as any).booleanValue !== undefined) data[k] = (v as any).booleanValue;
    else if ((v as any).timestampValue !== undefined) data[k] = (v as any).timestampValue;
    else if ((v as any).nullValue !== null) data[k] = null;
  }
  return data;
}

const opMap: Record<string, string> = {
  '==': 'EQUAL', '>=': 'GREATER_THAN_OR_EQUAL', '<=': 'LESS_THAN_OR_EQUAL',
  '>': 'GREATER_THAN', '<': 'LESS_THAN', '!=': 'NOT_EQUAL',
};

class DocRef {
  constructor(private col: string, public docId: string) {}

  get id() { return this.docId; }

  async get() {
    const token = await getAccessToken();
    const res = await fetch(docUrl(this.col, this.docId), { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 404) return { exists: false as const, data: () => null, id: this.docId };
    const json: any = await res.json();
    return { exists: true as const, data: () => ({ id: this.docId, ...fromDoc(json) }), id: this.docId };
  }

  async set(data: Record<string, any>) {
    const token = await getAccessToken();
    await fetch(docUrl(this.col, this.docId), {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: toFields(data) }),
    });
  }

  async update(data: Record<string, any>) { return this.set(data); }

  async delete() {
    const token = await getAccessToken();
    await fetch(docUrl(this.col, this.docId), { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  }
}

class QueryBuilder {
  private conditions: { field: string; op: string; value: any }[] = [];
  private orderByField: string | null = null;
  private orderDir: 'ASCENDING' | 'DESCENDING' = 'ASCENDING';
  private limitCount: number | null = null;

  constructor(private col: string) {}

  where(field: string, op: string, value: any) {
    this.conditions.push({ field, op, value });
    return this;
  }

  orderBy(field: string, dir?: 'asc' | 'desc') {
    this.orderByField = field;
    this.orderDir = dir === 'desc' ? 'DESCENDING' : 'ASCENDING';
    return this;
  }

  limit(n: number) {
    this.limitCount = n;
    return this;
  }

  async get() {
    const token = await getAccessToken();
    const sq: any = { from: [{ collectionId: this.col }] };

    if (this.conditions.length > 0) {
      sq.where = {
        compositeFilter: {
          op: 'AND',
          filters: this.conditions.map(c => ({
            fieldFilter: {
              field: { fieldPath: c.field },
              op: opMap[c.op] || 'EQUAL',
              value: typeof c.value === 'number' ? { integerValue: String(c.value) } : { stringValue: String(c.value) },
            },
          })),
        },
      };
    }

    if (this.orderByField) {
      sq.orderBy = [{ field: { fieldPath: this.orderByField }, direction: this.orderDir }];
    }
    if (this.limitCount) sq.limit = this.limitCount;

    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ structuredQuery: sq }),
      },
    );
    const data: any = await res.json();
    if (!Array.isArray(data)) return { docs: [], empty: true, size: 0, forEach: (_fn: any) => {} };

    const docs = data.filter((d: any) => d.document).map((d: any) => {
      const id = d.document.name.split('/').pop();
      const ref = new DocRef(this.col, id);
      return { id, data: () => ({ id, ...fromDoc(d.document) }), ref, exists: true };
    });

    return {
      docs,
      empty: docs.length === 0,
      size: docs.length,
      forEach: (fn: (d: any) => void) => docs.forEach(fn),
    };
  }
}

class CollectionRef {
  constructor(private name: string) {}

  doc(id?: string) {
    return new DocRef(this.name, id ?? randomUUID());
  }

  where(field: string, op: string, value: any) {
    return new QueryBuilder(this.name).where(field, op, value);
  }

  orderBy(field: string, dir?: 'asc' | 'desc') {
    return new QueryBuilder(this.name).orderBy(field, dir);
  }

  limit(n: number) {
    return new QueryBuilder(this.name).limit(n);
  }

  async get() {
    return new QueryBuilder(this.name).get();
  }
}

class WriteBatch {
  private ops: (() => Promise<void>)[] = [];

  update(ref: DocRef, data: Record<string, any>) { this.ops.push(() => ref.update(data)); }
  delete(ref: DocRef) { this.ops.push(() => ref.delete()); }
  async commit() { for (const op of this.ops) await op(); }
}

class FirestoreAdmin {
  collection(name: string) { return new CollectionRef(name); }
  batch() { return new WriteBatch(); }
}

export const adminDb = new FirestoreAdmin();

// ─── Auth Admin ───

export const adminAuth = {
  async createUser(data: { email: string; password: string; emailVerified?: boolean }) {
    const token = await getAccessToken();
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: data.email, password: data.password, emailVerified: data.emailVerified ?? false }),
    });
    const json: any = await res.json();
    if (json.error) throw new Error(json.error.message || 'Failed to create user');
    return { uid: json.localId };
  },

  async deleteUser(uid: string) {
    const token = await getAccessToken();
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:delete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ localId: uid }),
    });
    const json: any = await res.json();
    if (json.error) throw new Error(json.error.message || 'Failed to delete user');
  },

  async getUserByEmail(email: string) {
    const token = await getAccessToken();
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:lookup`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: [email] }),
    });
    const json: any = await res.json();
    if (json.error || !json.users?.length) return null;
    return { uid: json.users[0].localId, ...json.users[0] };
  },

  async updateUser(uid: string, data: Record<string, any>) {
    const token = await getAccessToken();
    const body: any = { localId: uid };
    if (data.password !== undefined) body.password = data.password;
    if (data.emailVerified !== undefined) body.emailVerified = data.emailVerified;
    if (data.email !== undefined) body.email = data.email;
    if (data.displayName !== undefined) body.displayName = data.displayName;
    if (data.disabled !== undefined) body.disableUser = data.disabled;
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:update`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json: any = await res.json();
    if (json.error) throw new Error(json.error.message || 'Failed to update user');
  },
};

export const adminStorage: any = null;

export const FieldValue = {
  increment(n: number) { return n; },
  serverTimestamp() { return new Date().toISOString(); },
  arrayUnion(...args: any[]) { return args; },
  arrayRemove(...args: any[]) { return args; },
  delete() { return null; },
};
