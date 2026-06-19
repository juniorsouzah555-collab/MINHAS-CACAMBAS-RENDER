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
