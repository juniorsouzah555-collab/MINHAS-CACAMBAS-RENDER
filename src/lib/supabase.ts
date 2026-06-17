import { createClient, SupabaseClient } from '@supabase/supabase-js';

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
  
  const envUrl = (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const activeUrl = localUrl || envUrl;
  const activeKey = localKey || envKey;

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
