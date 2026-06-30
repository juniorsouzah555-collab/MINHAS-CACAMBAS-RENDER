import { db, auth, storage, collection, doc, getDocs, getDoc, setDoc, addDoc, deleteDoc, updateDoc, query, where, orderBy, limit, Timestamp, onSnapshot, Unsubscribe, signInWithEmailAndPassword, fbSignOut, createUserWithEmailAndPassword, updatePassword, sendEmailVerification, fbDeleteUser, ref, uploadBytes, getDownloadURL, ref as storageRef } from './firebase';

declare global {
  interface ImportMeta {
    readonly env: Record<string, string | undefined>;
  }
}

const API_BASE = window.location.origin;

export const isSupabaseConfigured = (): boolean => true;

// ─── Firestore Query Builder (mimics Supabase postgrest-js API) ───

class FirestoreQuery {
  private tableName: string;
  private conditions: { field: string; op: string; value: any }[] = [];
  private orderField: string | null = null;
  private orderAsc: boolean = true;
  private limitCount: number | null = null;
  private isMaybeSingle = false;
  private action: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private actionData: any = null;

  constructor(table: string) { this.tableName = table; }

  select(fields?: string) { this.action = 'select'; return this; }

  eq(field: string, value: any) { this.conditions.push({ field, op: 'eq', value }); return this; }
  gte(field: string, value: any) { this.conditions.push({ field, op: 'gte', value }); return this; }
  lte(field: string, value: any) { this.conditions.push({ field, op: 'lte', value }); return this; }
  gt(field: string, value: any) { this.conditions.push({ field, op: 'gt', value }); return this; }
  lt(field: string, value: any) { this.conditions.push({ field, op: 'lt', value }); return this; }
  neq(field: string, value: any) { this.conditions.push({ field, op: 'neq', value }); return this; }

  order(field: string, opts?: { ascending?: boolean }) {
    this.orderField = field;
    this.orderAsc = opts?.ascending ?? true;
    return this;
  }

  limit(count: number) { this.limitCount = count; return this; }
  maybeSingle() { this.isMaybeSingle = true; return this; }

  insert(data: any | any[]) { this.action = 'insert'; this.actionData = data; return this; }
  upsert(data: any) { this.action = 'upsert'; this.actionData = data; return this; }
  update(data: any) { this.action = 'update'; this.actionData = data; return this; }
  delete() { this.action = 'delete'; return this; }

  private buildFirestoreQuery() {
    let constraints: any[] = [];
    for (const c of this.conditions) {
      if (c.op === 'eq') constraints.push(where(c.field, '==', c.value));
      else if (c.op === 'gte') constraints.push(where(c.field, '>=', c.value));
      else if (c.op === 'lte') constraints.push(where(c.field, '<=', c.value));
      else if (c.op === 'gt') constraints.push(where(c.field, '>', c.value));
      else if (c.op === 'lt') constraints.push(where(c.field, '<', c.value));
      else if (c.op === 'neq') constraints.push(where(c.field, '!=', c.value));
    }
    if (this.orderField) constraints.push(orderBy(this.orderField, this.orderAsc ? 'asc' : 'desc'));
    if (this.limitCount) constraints.push(limit(this.limitCount));
    return query(collection(db, this.tableName), ...constraints);
  }

  private getFilteredIds(): Promise<string[]> {
    const q = this.buildFirestoreQuery();
    return getDocs(q).then(snapshot => snapshot.docs.map(d => d.id));
  }

  async then(resolve?: (value: { data: any; error: any }) => void, reject?: (reason: any) => void) {
    try {
      if (this.action === 'select') {
        const q = this.buildFirestoreQuery();
        const snapshot = await getDocs(q);
        const rows = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        const data: any = this.isMaybeSingle ? (rows[0] || null) : rows;
        resolve?.({ data, error: null });
      } else if (this.action === 'insert') {
        const items = Array.isArray(this.actionData) ? this.actionData : [this.actionData];
        for (const item of items) {
          const id = item.id || doc(collection(db, this.tableName)).id;
          await setDoc(doc(db, this.tableName, id), { ...item, id, createdAt: item.createdAt || new Date().toISOString() });
        }
        resolve?.({ data: null, error: null });
      } else if (this.action === 'upsert') {
        const id = this.actionData.id || doc(collection(db, this.tableName)).id;
        await setDoc(doc(db, this.tableName, id), { ...this.actionData, id }, { merge: true });
        resolve?.({ data: null, error: null });
      } else if (this.action === 'update') {
        const ids = await this.getFilteredIds();
        for (const id of ids) {
          await updateDoc(doc(db, this.tableName, id), this.actionData);
        }
        resolve?.({ data: null, error: null });
      } else if (this.action === 'delete') {
        const ids = await this.getFilteredIds();
        for (const id of ids) {
          await deleteDoc(doc(db, this.tableName, id));
        }
        resolve?.({ data: null, error: null });
      } else {
        resolve?.({ data: null, error: { message: 'Unknown action' } });
      }
    } catch (e: any) {
      resolve?.({ data: null, error: { message: e.message } });
    }
  }
}

// ─── Channel (Realtime) Shim ───

class FirestoreChannel {
  private name: string;
  private subscriptions: { event: string; config: any; callback: any }[] = [];
  private unsubs: Unsubscribe[] = [];

  constructor(name: string) { this.name = name; }

  on(event: string, config: any, callback: any) {
    this.subscriptions.push({ event, config, callback });
    return this;
  }

  subscribe(callback?: (status: string) => void) {
    for (const sub of this.subscriptions) {
      if (sub.event === 'postgres_changes' && sub.config?.table) {
        const colRef = collection(db, sub.config.table);
        const unsub = onSnapshot(colRef, (snapshot) => {
          snapshot.docChanges().forEach(change => {
            const data = { id: change.doc.id, ...change.doc.data() };
            const oldData = { id: change.doc.id, ...change.doc.data() };
            const payload: any = { eventType: change.type.toUpperCase(), new: data, old: oldData };
            sub.callback(payload);
          });
        });
        this.unsubs.push(unsub);
      }
    }
    callback?.('SUBSCRIBED');
    return this;
  }

  unsubscribe() {
    this.unsubs.forEach(u => u());
    this.unsubs = [];
  }
}

// ─── Supabase Client ───

export const supabase = {
  from: (table: string) => new FirestoreQuery(table),
  channel: (name: string) => new FirestoreChannel(name),
  removeChannel: (channel: FirestoreChannel) => { channel.unsubscribe(); },
  auth: {
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      try {
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        return { data: { user: userCred.user }, error: null };
      } catch (e: any) {
        return { data: null, error: { message: e.message } };
      }
    },
    signOut: async () => {
      try { await fbSignOut(auth); return { error: null }; }
      catch (e: any) { return { error: { message: e.message } }; }
    },
    getUser: async () => {
      const user = auth.currentUser;
      return { data: { user: user ? { id: user.uid, email: user.email, user_metadata: { linkedDriver: (user as any).linkedDriver || '' } } : null }, error: null };
    }
  },
  storage: {
    from: (bucket: string) => ({
      upload: async (path: string, file: File, opts?: any) => {
        try {
          const storageRef = ref(storage, `${bucket}/${path}`);
          await uploadBytes(storageRef, file);
          return { error: null };
        } catch (e: any) { return { error: { message: e.message } }; }
      },
      getPublicUrl: (path: string) => {
        const storageRefObj = ref(storage, `${bucket}/${path}`);
        try {
          return { data: { publicUrl: `https://firebasestorage.googleapis.com/v0/b/${storageRefObj.bucket}/o/${encodeURIComponent(storageRefObj.fullPath)}?alt=media` } };
        } catch {
          return { data: { publicUrl: '' } };
        }
      }
    })
  }
};

// ─── Auth Helpers (client-side calls to API endpoints) ───

export const updateUserPasswordByEmail = async (email: string, newPassword: string): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE}/api/auth/update-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: newPassword })
    });
    return res.ok;
  } catch { return false; }
};

export const confirmUserEmailByEmail = async (email: string): Promise<boolean> => {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${API_BASE}/api/auth/confirm-email`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      if (!res.ok) { await new Promise(r => setTimeout(r, 1000)); continue; }
      const data = await res.json();
      if (data.ok === true) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 1000));
  }
  return false;
};

export const deleteUserByEmail = async (email: string): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE}/api/auth/delete-user`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
    return res.ok;
  } catch { return false; }
};

export const createInvitedUser = async (email: string, password: string): Promise<{ ok: boolean; userId: string | null }> => {
  try {
    const res = await fetch(`${API_BASE}/api/auth/signup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    if (!res.ok) return { ok: false, userId: null };
    const data = await res.json();
    return { ok: data.ok === true, userId: data.userId || null };
  } catch { return { ok: false, userId: null }; }
};

export const confirmUserById = async (userId: string): Promise<boolean> => {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${API_BASE}/api/auth/confirm-user`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) });
      if (!res.ok) { await new Promise(r => setTimeout(r, 1000)); continue; }
      const data = await res.json();
      if (data.ok === true) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 1000));
  }
  return false;
};

export const linkDriverToUser = async (email: string, linkedDriver: string): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE}/api/auth/link-driver`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, linkedDriver }) });
    return res.ok;
  } catch { return false; }
};

// ─── Proxy functions (Firestore-native now, still call /api/proxy for Admin operations) ───

export const proxyInsert = async (table: string, data: any): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE}/api/proxy`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table, action: 'insert', data }) });
    return res.ok;
  } catch { return false; }
};

export const proxyUpdate = async (table: string, data: any, filter: string): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE}/api/proxy`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table, action: 'update', data, filter }) });
    return res.ok;
  } catch { return false; }
};

export const proxyDelete = async (table: string, filter: string): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE}/api/proxy`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table, action: 'delete', filter }) });
    return res.ok;
  } catch { return false; }
};

// ─── Heartbeat ───

export const sendHeartbeat = async (email: string, lat?: number, lng?: number): Promise<void> => {
  try {
    const payload: any = { last_seen: Date.now() };
    if (lat !== undefined && lng !== undefined) { payload.last_lat = lat; payload.last_lng = lng; }
    await updateDoc(doc(db, 'user_approvals', email), payload);
  } catch (e) { console.error('[HB] error', e); }
};

export const getOnlineUsers = async (): Promise<{ name: string; lat: number; lng: number }[]> => {
  try {
    const cutoff = Date.now() - 120000;
    const q = query(collection(db, 'user_approvals'), where('last_seen', '>=', cutoff), where('status', '==', 'Ativo'));
    const snapshot = await getDocs(q);
    const seen = new Map<string, { lat: number; lng: number; ts: number }>();
    snapshot.docs.forEach(d => {
      const u = d.data();
      if (!u.name || !u.last_lat || !u.last_lng) return;
      const prev = seen.get(u.name);
      if (!prev || u.last_seen > prev.ts) seen.set(u.name, { lat: u.last_lat, lng: u.last_lng, ts: u.last_seen });
    });
    return [...seen.entries()].map(([name, v]) => ({ name, lat: v.lat, lng: v.lng }));
  } catch (e) { console.error('[OU] error', e); return []; }
};

// ─── Nominatim Reverse Geocode ───

const addressCache = new Map<string, string>();
let lastNominatimCall = 0;

export const getAddressFromCoords = async (lat: number, lng: number): Promise<string> => {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  const cached = addressCache.get(key);
  if (cached) return cached;
  const now = Date.now();
  const wait = Math.max(0, 1100 - (now - lastNominatimCall));
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastNominatimCall = Date.now();
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=0`, { headers: { 'User-Agent': 'RelampagoCacambas/1.0' } });
    if (!res.ok) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    const data = await res.json();
    const addr = data?.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    const short = addr.split(',').slice(0, 3).join(',').trim();
    addressCache.set(key, short);
    return short;
  } catch { return `${lat.toFixed(4)}, ${lng.toFixed(4)}`; }
};

// ─── Fuel Receipt Upload ───

export const uploadFuelReceipt = async (file: File): Promise<string | null> => {
  try {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const storageRef = ref(storage, `fuel-receipts/${path}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return url;
  } catch (e) { console.error('Upload foto_nota error:', e); return null; }
};
