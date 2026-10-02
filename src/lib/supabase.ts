import { createClient } from '@supabase/supabase-js';
import { authStorage } from './authStorage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const hasSupabaseConfig = Boolean(supabaseUrl && supabasePublishableKey);
export const sessionStorageKey = supabaseUrl ? `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token` : 'duet-auth-token';
let sessionEnabled = true;
export const isSessionEnabled = () => sessionEnabled;
export function enableSession() { sessionEnabled = true; }

// A logout also blocks late refresh responses from restoring local credentials.
const sessionStorage = {
  getItem: (key: string) => sessionEnabled ? authStorage.getItem(key) : Promise.resolve(null),
  setItem: (key: string, value: string) => sessionEnabled ? authStorage.setItem(key, value) : Promise.resolve(),
  removeItem: (key: string) => authStorage.removeItem(key),
};

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl!, supabasePublishableKey!, {
      auth: {
        storage: sessionStorage,
        storageKey: sessionStorageKey,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    })
  : null;

export async function clearLocalSession(): Promise<string | null> {
  if (!supabase) return null;
  sessionEnabled = false;
  await supabase.auth.stopAutoRefresh();
  const raw = await authStorage.getItem(sessionStorageKey);
  const accessToken = raw ? JSON.parse(raw).access_token as string | undefined : undefined;
  // Read returns null while gated: signOut cannot refresh or wait for the network.
  await authStorage.removeItem(sessionStorageKey);
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) throw error;
  return accessToken ?? null;
}

export async function revokeRemoteSession(accessToken: string, pushToken: string | null): Promise<void> {
  const headers = { apikey: supabasePublishableKey!, Authorization: `Bearer ${accessToken}` };
  const requests = [fetch(`${supabaseUrl}/auth/v1/logout?scope=local`, {
    method: 'POST', headers, signal: AbortSignal.timeout(5000),
  })];
  if (pushToken) requests.push(fetch(`${supabaseUrl}/rest/v1/wish_devices?token=eq.${encodeURIComponent(pushToken)}`, {
    method: 'DELETE', headers, signal: AbortSignal.timeout(5000),
  }));
  const results = await Promise.allSettled(requests);
  if (results.some(result => result.status === 'rejected' || !result.value.ok)) {
    console.warn('Локальный выход выполнен. Сервер не подтвердил отзыв сессии или push-регистрации.');
  }
}
