import { createClient, SupabaseClient } from '@supabase/supabase-js';

declare global {
  interface ImportMeta {
    readonly env: Record<string, string | undefined>;
  }
}

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

// Confirma o email de um usuário no Supabase Auth via Admin API (requer service_role key)
export const confirmUserEmail = async (userId: string): Promise<boolean> => {
  try {
    const res = await fetch(`https://rhmgkapdvexzjasvbifd.supabase.co/auth/v1/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ email_confirm: true })
    });
    return res.ok;
  } catch {
    return false;
  }
};

// Atualiza a senha de um usuário no Supabase Auth via Admin API
const getUserIdByEmail = async (email: string): Promise<string | null> => {
  try {
    const res = await fetch('https://rhmgkapdvexzjasvbifd.supabase.co/auth/v1/admin/users', {
      method: 'GET',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      }
    });
    if (!res.ok) return null;
    const data = await res.json();
    const user = (data?.users || []).find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
    return user?.id || null;
  } catch {
    return null;
  }
};

export const updateUserPasswordByEmail = async (email: string, newPassword: string): Promise<boolean> => {
  try {
    const userId = await getUserIdByEmail(email);
    if (!userId) return false;
    const updateRes = await fetch(`https://rhmgkapdvexzjasvbifd.supabase.co/auth/v1/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ password: newPassword, email_confirm: true })
    });
    return updateRes.ok;
  } catch {
    return false;
  }
};

// Busca um usuário pelo email e confirma seu email
export const confirmUserEmailByEmail = async (email: string): Promise<boolean> => {
  try {
    const userId = await getUserIdByEmail(email);
    if (!userId) return false;
    return confirmUserEmail(userId);
  } catch {
    return false;
  }
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
