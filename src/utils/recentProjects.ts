import { supabase } from '@/lib/supabase';
import type { QueryClient } from '@tanstack/react-query';

const RECENT_KEY = 'devban_recent_touch_';

export function getLocalTouchTimestamp(projectId: string): number {
  try {
    const raw = localStorage.getItem(RECENT_KEY + projectId);
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

export function setLocalTouchTimestamp(projectId: string) {
  try {
    localStorage.setItem(RECENT_KEY + projectId, Date.now().toString());
  } catch {}
}

export function getProjectTimestamp(project: { id: string; updated_at?: string; created_at?: string }): number {
  const localTime = getLocalTouchTimestamp(project.id);
  const dbTime = new Date(project.updated_at || project.created_at || 0).getTime();
  return Math.max(localTime, dbTime);
}

export function sortProjectsByRecent<T extends { id: string; updated_at?: string; created_at?: string }>(projects: T[]): T[] {
  return [...projects].sort((a, b) => {
    const timeA = getProjectTimestamp(a);
    const timeB = getProjectTimestamp(b);
    return timeB - timeA;
  });
}

/**
 * Touch/update a project timestamp when accessed or modified.
 * Places the project at the top of recent projects (like WhatsApp chats).
 */
export async function touchProject(projectId: string, queryClient?: QueryClient) {
  if (!projectId) return;

  setLocalTouchTimestamp(projectId);

  if (queryClient) {
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    queryClient.invalidateQueries({ queryKey: ['sharedProjects'] });
  }

  try {
    const nowIso = new Date().toISOString();
    await supabase
      .from('projects')
      .update({ updated_at: nowIso })
      .eq('id', projectId);
  } catch (err) {
    console.error('Failed to update project updated_at in database', err);
  }
}
