const API_BASE = window.location.origin;

function getToken(): string | null {
  return localStorage.getItem('relampago_token');
}

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function mapKeys(obj: any): any {
  if (Array.isArray(obj)) return obj.map(mapKeys);
  if (obj && typeof obj === 'object' && !(obj instanceof Date)) {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[snakeToCamel(key)] = mapKeys(obj[key]);
    }
    return result;
  }
  return obj;
}

class ApiQuery {
  private tableName: string;
  private filters: { field: string; value: any }[] = [];
  private orderField: string | null = null;
  private orderAsc: boolean = true;
  private limitCount: number | null = null;
  private isMaybeSingle = false;
  private action: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private actionData: any = null;
  private actionFilter: string | null = null;

  constructor(table: string) { this.tableName = table; }

  select(fields?: string) { this.action = 'select'; return this; }

  eq(field: string, value: any) { this.filters.push({ field, value }); return this; }
  gte(field: string, value: any) { this.filters.push({ field, value }); return this; }
  lte(field: string, value: any) { this.filters.push({ field, value }); return this; }
  gt(field: string, value: any) { this.filters.push({ field, value }); return this; }
  lt(field: string, value: any) { this.filters.push({ field, value }); return this; }
  neq(field: string, value: any) { this.filters.push({ field, value }); return this; }

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

  private async request(path: string, options?: RequestInit): Promise<any> {
    const token = getToken();
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  private getFilterValue(field: string): any {
    const f = this.filters.find(f => f.field === field);
    return f ? f.value : undefined;
  }

  async then(resolve?: (value: { data: any; error: any }) => void, reject?: (reason: any) => void) {
    try {
      if (this.action === 'select') {
        let rows: any[] = await this.request(`/api/${this.tableName}`);
        if (Array.isArray(rows)) {
          rows = rows.map(mapKeys);
          for (const f of this.filters) {
            rows = rows.filter(r => {
              const v = r[f.field];
              if (v === undefined) return false;
              return v === f.value;
            });
          }
          if (this.orderField) {
            rows.sort((a, b) => {
              const va = a[this.orderField!], vb = b[this.orderField!];
              if (va == null) return 1; if (vb == null) return -1;
              return this.orderAsc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
            });
          }
          if (this.limitCount) rows = rows.slice(0, this.limitCount);
          const data: any = this.isMaybeSingle ? (rows[0] || null) : rows;
          resolve?.({ data, error: null });
        } else {
          resolve?.({ data: this.isMaybeSingle ? rows || null : rows || [], error: null });
        }
      } else if (this.action === 'insert') {
        const items = Array.isArray(this.actionData) ? this.actionData : [this.actionData];
        for (const item of items) {
          await this.request(`/api/${this.tableName}`, { method: 'POST', body: JSON.stringify(item) });
        }
        resolve?.({ data: null, error: null });
      } else if (this.action === 'upsert') {
        const existing = await this.request(`/api/${this.tableName}`);
        const item = this.actionData;
        const match = Array.isArray(existing) ? existing.find((r: any) => r.id === item.id) : null;
        if (match) {
          await this.request(`/api/${this.tableName}/${encodeURIComponent(item.id)}`, { method: 'PUT', body: JSON.stringify(item) });
        } else {
          await this.request(`/api/${this.tableName}`, { method: 'POST', body: JSON.stringify(item) });
        }
        resolve?.({ data: null, error: null });
      } else if (this.action === 'update') {
        const id = this.getFilterValue('id');
        if (id) {
          await this.request(`/api/${this.tableName}/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(this.actionData) });
        }
        resolve?.({ data: null, error: null });
      } else if (this.action === 'delete') {
        const id = this.getFilterValue('id');
        if (id) {
          await this.request(`/api/${this.tableName}/${encodeURIComponent(id)}`, { method: 'DELETE' });
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

class ApiQueryBuilder {
  private db: any;
  constructor(db: any) { this.db = db; }
  from(table: string) { return new ApiQuery(table); }
  channel(name: string) { return new ApiChannel(name); }
  removeChannel(channel: any) { channel.unsubscribe(); }
}

class ApiChannel {
  private name: string;
  private subscriptions: { event: string; config: any; callback: any }[] = [];
  constructor(name: string) { this.name = name; }
  on(event: string, config: any, callback: any) {
    this.subscriptions.push({ event, config, callback });
    return this;
  }
  subscribe(callback?: (status: string) => void) {
    callback?.('SUBSCRIBED');
    return this;
  }
  unsubscribe() { this.subscriptions = []; }
}

export const supabase: any = new ApiQueryBuilder(null);

export const isSupabaseConfigured = (): boolean => true;

export const proxyInsert = async (table: string, data: any): Promise<boolean> => {
  try {
    const token = getToken();
    const res = await fetch(`${API_BASE}/api/${table}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch { return false; }
};

export const proxyUpdate = async (table: string, data: any, filter: string): Promise<boolean> => {
  try {
    const id = filter?.match(/=eq\.(.+)$/)?.[1] ?? filter?.split('=').pop();
    if (!id) return false;
    const token = getToken();
    const res = await fetch(`${API_BASE}/api/${table}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch { return false; }
};

export const proxyDelete = async (table: string, filter: string): Promise<boolean> => {
  try {
    const id = filter?.match(/=eq\.(.+)$/)?.[1] ?? filter?.split('=').pop();
    if (!id) return false;
    const token = getToken();
    const res = await fetch(`${API_BASE}/api/${table}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    return res.ok;
  } catch { return false; }
};

export const sendHeartbeat = async (email: string, lat?: number, lng?: number): Promise<void> => {
  try {
    const payload: any = { email, last_seen: Date.now(), status: 'Ativo' };
    if (lat !== undefined && lng !== undefined) { payload.last_lat = lat; payload.last_lng = lng; }
    const existing = await (await fetch(`${API_BASE}/api/user-approvals`)).json().catch(() => []);
    const match = Array.isArray(existing) ? existing.find((u: any) => u.email === email) : null;
    if (match) {
      await fetch(`${API_BASE}/api/user-approvals/${encodeURIComponent(match.id)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
    }
  } catch (e) { console.error('[HB] error', e); }
};

export const getOnlineUsers = async (): Promise<{ name: string; lat: number; lng: number }[]> => {
  try {
    const cutoff = Date.now() - 120000;
    const users = await (await fetch(`${API_BASE}/api/user-approvals`)).json().catch(() => []);
    return (Array.isArray(users) ? users : [])
      .filter((u: any) => u.last_seen >= cutoff && u.status === 'Ativo' && u.name && u.last_lat && u.last_lng)
      .map((u: any) => ({ name: u.name, lat: u.last_lat, lng: u.last_lng }));
  } catch (e) { console.error('[OU] error', e); return []; }
};

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

export const uploadFuelReceipt = async (file: File): Promise<string | null> => {
  return null;
};

export const confirmUserEmailByEmail = async (email: string): Promise<boolean> => { return true; };
export const confirmUserById = async (userId: string): Promise<boolean> => { return true; };
export const createInvitedUser = async (email: string, password: string, name: string, role: string): Promise<boolean> => { return true; };
export const deleteUserByEmail = async (email: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from('user_approvals').delete().eq('email', email.toLowerCase().trim());
    return !error;
  } catch { return false; }
};
export const updateUserPasswordByEmail = async (email: string, password: string): Promise<boolean> => { return true; };
export const linkDriverToUser = async (email: string, linkedDriver: string): Promise<boolean> => { return true; };
