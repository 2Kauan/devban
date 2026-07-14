import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const SYNC_QUEUE_KEY = 'devban_sync_queue';
const CACHE_PREFIX = 'devban_board_cache_';

type SyncAction = 'upsert' | 'insert' | 'delete' | 'update';

interface SyncItem {
  id: string;
  table: string;
  action: SyncAction;
  payload: any;
  match?: Record<string, any>; // Used for where/eq clauses on update/delete
  timestamp: number;
}

// ============================================
// BOARD DATA CACHE
// ============================================
export const cacheBoardData = (projectId: string, columns: any[], cards: any[], fullData?: any) => {
  try {
    localStorage.setItem(`${CACHE_PREFIX}${projectId}`, JSON.stringify({ columns, cards, fullData, timestamp: Date.now() }));
  } catch (error) {
    console.error('Failed to cache board data:', error);
  }
};

export const getCachedBoardData = (projectId: string) => {
  try {
    const cached = localStorage.getItem(`${CACHE_PREFIX}${projectId}`);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.error('Failed to load cached board data:', error);
  }
  return null;
};

// ============================================
// OFFLINE MUTATION QUEUE
// ============================================
export const getQueue = (): SyncItem[] => {
  try {
    const q = localStorage.getItem(SYNC_QUEUE_KEY);
    return q ? JSON.parse(q) : [];
  } catch (e) {
    return [];
  }
};

const setQueue = (queue: SyncItem[]) => {
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
};

export const queueMutation = (table: string, action: SyncAction, payload: any, match?: Record<string, any>) => {
  const queue = getQueue();
  const newItem: SyncItem = {
    id: crypto.randomUUID(),
    table,
    action,
    payload,
    match,
    timestamp: Date.now()
  };
  
  queue.push(newItem);
  setQueue(queue);
};

export const isNetworkError = (error: any): boolean => {
  if (!navigator.onLine) return true;
  if (!error) return false;
  const msg = error.message?.toLowerCase() || '';
  return msg.includes('fetch') || msg.includes('network') || msg.includes('failed to fetch');
};

let isSyncing = false;

export const processSyncQueue = async () => {
  if (!navigator.onLine) return; // Still offline
  if (isSyncing) return; // Already syncing

  const queue = getQueue();
  if (queue.length === 0) return; // Nothing to sync

  isSyncing = true;
  let successfulSyncs = 0;
  const failedItems: SyncItem[] = [];

  toast.info(`Modo Online: Sincronizando ${queue.length} alterações pendentes...`, { duration: 3000 });

  for (const item of queue) {
    try {
      let query = supabase.from(item.table) as any;
      
      switch (item.action) {
        case 'upsert':
          query = query.upsert(item.payload);
          break;
        case 'insert':
          query = query.insert(item.payload);
          break;
        case 'update':
          query = query.update(item.payload);
          if (item.match) {
            Object.entries(item.match).forEach(([k, v]) => {
              if (Array.isArray(v)) {
                query = query.in(k, v);
              } else {
                query = query.eq(k, v);
              }
            });
          }
          break;
        case 'delete':
          query = query.delete();
          if (item.match) {
            Object.entries(item.match).forEach(([k, v]) => {
              if (Array.isArray(v)) {
                query = query.in(k, v);
              } else {
                query = query.eq(k, v);
              }
            });
          }
          break;
      }

      const { error } = await query;
      
      if (error) {
        console.error('Sync error on item:', item, error);
        // Retain in queue only if it seems like a temporary error
        if (error.code !== '23503' && error.code !== '42501') {
           failedItems.push(item);
        }
      } else {
        successfulSyncs++;
      }
    } catch (err) {
      console.error('Fatal sync error on item:', item, err);
      failedItems.push(item);
    }
  }

  setQueue(failedItems);
  isSyncing = false;

  if (successfulSyncs > 0) {
    toast.success(`${successfulSyncs} alterações sincronizadas com a nuvem com sucesso!`);
  }
};
