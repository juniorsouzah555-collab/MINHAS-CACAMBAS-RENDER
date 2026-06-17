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

// Retrieve keys from localStorage or fallback to environment variables
export const getSupabaseConfig = () => {
  const localUrl = localStorage.getItem('supabase_url');
  const localKey = localStorage.getItem('supabase_anon_key');
  
  // Statically access import.meta.env variables so Vite can replace them at compile-time for production/Vercel
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string) || 
                 (import.meta.env.NEXT_PUBLIC_SUPABASE_URL as string) || 
                 (import.meta.env.SUPABASE_URL as string) || '';
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 
                 (import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string) || 
                 (import.meta.env.SUPABASE_ANON_KEY as string) || 
                 (import.meta.env.SUPABASE_KEY as string) || '';

  const activeUrl = sanitizeSecret(localUrl || envUrl);
  const activeKey = sanitizeSecret(localKey || envKey);

  return {
    url: activeUrl,
    key: activeKey,
    isConfigured: isValidHttpUrl(activeUrl) && !!activeKey,
    source: localUrl ? 'browser_storage' : (envUrl ? 'environment' : 'missing')
  };
};

const config = getSupabaseConfig();
const resolvedUrl = isValidHttpUrl(config.url) ? config.url : 'https://placeholder.supabase.co';
const resolvedKey = config.key || 'placeholder-anon-key';

// Keep an active client instance that can be dynamically updated
export let supabase = createClient(resolvedUrl, resolvedKey);

export const isSupabaseConfigured = (): boolean => {
  return getSupabaseConfig().isConfigured;
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
  
  const currentConfig = getSupabaseConfig();
  const nextUrl = isValidHttpUrl(currentConfig.url) ? currentConfig.url : 'https://placeholder.supabase.co';
  const nextKey = currentConfig.key || 'placeholder-anon-key';
  
  supabase = createClient(nextUrl, nextKey);
};
