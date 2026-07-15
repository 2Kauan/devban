import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'As variáveis de ambiente do Supabase não estão definidas. Verifique seu arquivo .env'
  );
}

const isBrowser = typeof window !== 'undefined';

// Adaptador de Storage Blindado para PWA (IndexedDB + Fallback para LocalStorage)
// Impede que celulares (especialmente iOS) apaguem a sessão ao fechar o app
const customStorage = {
  async getItem(key: string): Promise<string | null> {
    if (!isBrowser) return null;
    return new Promise((resolve) => {
      const request = indexedDB.open('supabase-storage', 1);
      request.onupgradeneeded = (e: any) => e.target.result.createObjectStore('keyval');
      request.onsuccess = (e: any) => {
        try {
          const store = e.target.result.transaction('keyval', 'readonly').objectStore('keyval');
          const getReq = store.get(key);
          getReq.onsuccess = () => resolve(getReq.result || window.localStorage.getItem(key));
          getReq.onerror = () => resolve(window.localStorage.getItem(key));
        } catch {
          resolve(window.localStorage.getItem(key));
        }
      };
      request.onerror = () => resolve(window.localStorage.getItem(key));
    });
  },
  async setItem(key: string, value: string): Promise<void> {
    if (!isBrowser) return;
    window.localStorage.setItem(key, value); // Double safe
    return new Promise((resolve) => {
      const request = indexedDB.open('supabase-storage', 1);
      request.onupgradeneeded = (e: any) => e.target.result.createObjectStore('keyval');
      request.onsuccess = (e: any) => {
        try {
          const store = e.target.result.transaction('keyval', 'readwrite').objectStore('keyval');
          store.put(value, key).onsuccess = () => resolve();
        } catch {
          resolve();
        }
      };
      request.onerror = () => resolve();
    });
  },
  async removeItem(key: string): Promise<void> {
    if (!isBrowser) return;
    window.localStorage.removeItem(key);
    return new Promise((resolve) => {
      const request = indexedDB.open('supabase-storage', 1);
      request.onupgradeneeded = (e: any) => e.target.result.createObjectStore('keyval');
      request.onsuccess = (e: any) => {
        try {
          const store = e.target.result.transaction('keyval', 'readwrite').objectStore('keyval');
          store.delete(key).onsuccess = () => resolve();
        } catch {
          resolve();
        }
      };
      request.onerror = () => resolve();
    });
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: customStorage
  }
});
