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

// Heartbeat via REST (anon key)
export const sendHeartbeat = async (email: string, lat?: number, lng?: number): Promise<void> => {
  try {
    const payload: any = { last_seen: Date.now() };
    if (lat !== undefined && lng !== undefined) { payload.last_lat = lat; payload.last_lng = lng; }
    console.log('[HB] sending', payload, 'for', email);
    const { error } = await supabase.from('user_approvals').update(payload).eq('email', email);
    if (error) console.error('[HB] error', error);
  } catch (e) { console.error('[HB] catch', e); }
};
export const getOnlineUsers = async (): Promise<{ name: string; lat: number; lng: number }[]> => {
  try {
    const cutoff = Date.now() - 120000;
    const { data, error } = await supabase.from('user_approvals').select('name, last_lat, last_lng').gte('last_seen', cutoff);
    if (error) console.error('[OU] error', error);
    console.log('[OU] data', data);
    return (data || []).filter((u: any) => u.name).map((u: any) => ({ name: u.name, lat: u.last_lat || 0, lng: u.last_lng || 0 }));
  } catch (e) { console.error('[OU] catch', e); return []; }
};

// Faz upload da foto da nota fiscal pro Supabase Storage e retorna a URL pública.
// Substitui o antigo formato (base64 direto na coluna foto_nota), que era o maior
// gerador de egress no polling de sincronização.
export const uploadFuelReceipt = async (file: File): Promise<string | null> => {
  try {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('fuel-receipts').upload(path, file, { contentType: file.type });
    if (error) { console.error('Upload foto_nota error:', error); return null; }
    const { data } = supabase.storage.from('fuel-receipts').getPublicUrl(path);
    return data.publicUrl;
  } catch (e) { console.error('Upload foto_nota catch:', e); return null; }
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
