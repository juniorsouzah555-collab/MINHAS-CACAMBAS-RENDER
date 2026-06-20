import { createClient, SupabaseClient } from '@supabase/supabase-js';

declare global {
  interface ImportMeta {
    readonly env: Record<string, string | undefined>;
  }
}

const API_BASE = window.location.origin;

const sanitizeSecret = (str: string): string => {
  if (!str) return '';
  let cleaned = str.trim();
  // Strip starting/ending double quotes if any
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1);
  }
  // Strip starting/ending single quotes if any
  if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
    cleaned = cleaned.slice(1, -1);
  }
  return cleaned.trim();
};

const isValidHttpUrl = (str: string): boolean => {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const HARDCODED_URL = 'https://rhmgkapdvexzjasvbifd.supabase.co';
const HARDCODED_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJobWdrYXBkdmV4emphc3ZiaWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2NTIwNzksImV4cCI6MjA5NzIyODA3OX0.EO0tflk_Q7wNYXEIIXLoyAMXj9J-XKtGQO1gNdp7Lzc';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJobWdrYXBkdmV4emphc3ZiaWZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTY1MjA3OSwiZXhwIjoyMDk3MjI4MDc5fQ.uZgF0vW3Q7DpeEqNDgv1ItiwncBwBBaCgpE5CnJ5fIM';

// Retrieve keys from localStorage or fallback to hardcoded values
export const getSupabaseConfig = () => {
  const localUrl = localStorage.getItem('supabase_url');
  const localKey = localStorage.getItem('supabase_anon_key');

  const activeUrl = localUrl && isValidHttpUrl(sanitizeSecret(localUrl))
    ? sanitizeSecret(localUrl)
    : HARDCODED_URL;
  const activeKey = localKey ? sanitizeSecret(localKey) : HARDCODED_KEY;

  return {
    url: activeUrl,
    key: activeKey,
    isConfigured: true,
    source: (localUrl && isValidHttpUrl(sanitizeSecret(localUrl))) ? 'browser_storage' : 'hardcoded'
  };
};

export const isSupabaseConfigured = (): boolean => true;

export let supabase = createClient(HARDCODED_URL, HARDCODED_KEY);

// Atualiza senha + confirma email via servidor local
export const updateUserPasswordByEmail = async (email: string, newPassword: string): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE}/api/auth/update-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: newPassword })
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.ok === true;
  } catch {
    return false;
  }
};

// Busca um usuário pelo email e confirma seu email via servidor local
export const confirmUserEmailByEmail = async (email: string): Promise<boolean> => {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${API_BASE}/api/auth/confirm-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (!res.ok) { await new Promise(r => setTimeout(r, 1000)); continue; }
      const data = await res.json();
      if (data.ok === true) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 1000));
  }
  return false;
};

// Deleta um usuário de user_approvals via servidor (service_role, sem RLS)
export const deleteUserByEmail = async (email: string): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE}/api/auth/delete-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return res.ok;
  } catch { return false; }
};

// Cria um usuário já confirmado via servidor (Admin API, sem depender de SMTP)
export const createInvitedUser = async (email: string, password: string): Promise<{ ok: boolean; userId: string | null }> => {
  try {
    const res = await fetch(`${API_BASE}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) return { ok: false, userId: null };
    const data = await res.json();
    return { ok: data.ok === true, userId: data.userId || null };
  } catch {
    return { ok: false, userId: null };
  }
};

// Confirma um usuário pelo ID (mais confiável, sem precisar fazer lookup)
export const confirmUserById = async (userId: string): Promise<boolean> => {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${API_BASE}/api/auth/confirm-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (!res.ok) { await new Promise(r => setTimeout(r, 1000)); continue; }
      const data = await res.json();
      if (data.ok === true) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 1000));
  }
  return false;
};

// Atualiza o linkedDriver no metadata do usuário no Auth (via servidor)
export const linkDriverToUser = async (email: string, linkedDriver: string): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE}/api/auth/link-driver`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, linkedDriver })
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.ok === true;
  } catch {
    return false;
  }
};

// Generic proxy for Supabase operations using service_role key (bypasses RLS)
export const proxyInsert = async (table: string, data: any): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE}/api/proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, action: 'insert', data })
    });
    return res.ok;
  } catch { return false; }
};

export const proxyUpdate = async (table: string, data: any, filter: string): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE}/api/proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, action: 'update', data, filter })
    });
    return res.ok;
  } catch { return false; }
};

export const proxyDelete = async (table: string, filter: string): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE}/api/proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, action: 'delete', filter })
    });
    return res.ok;
  } catch { return false; }
};

// Heartbeat: atualiza last_seen no metadata do Auth via Admin API direta
const getUserIdByEmail = async (email: string): Promise<string | null> => {
  try {
    const r = await fetch(`${HARDCODED_URL}/auth/v1/admin/users`, {
      headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` }
    });
    if (!r.ok) return null;
    const d = await r.json();
    const u = (d?.users || []).find((x: any) => x.email?.toLowerCase() === email.toLowerCase());
    return u?.id || null;
  } catch { return null; }
};

export const heartbeat = async (email: string, driverName: string): Promise<boolean> => {
  try {
    const userId = await getUserIdByEmail(email);
    if (!userId) return false;
    const r = await fetch(`${HARDCODED_URL}/auth/v1/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ user_metadata: { last_seen: Date.now(), driver_name: driverName } })
    });
    return r.ok;
  } catch { return false; }
};

// Retorna nomes dos motoristas com last_seen nos últimos 2 minutos
const ONLINE_TIMEOUT = 120000;
export const fetchOnlineUsers = async (): Promise<string[]> => {
  try {
    const r = await fetch(`${HARDCODED_URL}/auth/v1/admin/users`, {
      headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` }
    });
    if (!r.ok) return [];
    const d = await r.json();
    const now = Date.now();
    const online = (d?.users || [])
      .filter((u: any) => u?.user_metadata?.last_seen && (now - u.user_metadata.last_seen) < ONLINE_TIMEOUT)
      .map((u: any) => u?.user_metadata?.driver_name || u.email?.split('@')[0] || '')
      .filter(Boolean);
    return [...new Set(online)];
  } catch { return []; }
};

// Reinitializes the live client with new credentials
export const updateSupabaseCredentials = (url: string, key: string) => {
  if (url && key) {
    localStorage.setItem('supabase_url', url);
    localStorage.setItem('supabase_anon_key', key);
  } else {
    localStorage.removeItem('supabase_url');
    localStorage.removeItem('supabase_anon_key');
  }
  
  const cfg = getSupabaseConfig();
  supabase = createClient(cfg.url, cfg.key);
};
