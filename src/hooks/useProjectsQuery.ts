import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Project } from '@/types/database';
import { sortProjectsByRecent } from '@/utils/recentProjects';
import { isNetworkError } from '@/lib/offlineSync';

const CACHE_KEY = 'devban_projects_cache_';

function getCachedProjects(userId: string): Project[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY + userId);
    if (!raw) return null;
    const { data } = JSON.parse(raw);
    return sortProjectsByRecent(data || []);
  } catch {
    return null;
  }
}

function setCachedProjects(userId: string, data: Project[]) {
  try {
    localStorage.setItem(CACHE_KEY + userId, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {}
}

export function useProjectsQuery() {
  const { user } = useAuth();

  return useQuery<Project[], Error>({
    queryKey: ['projects', user?.id],
    queryFn: async () => {
      if (!user) return [];

      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('owner_id', user.id)
          .order('updated_at', { ascending: false });

        if (error) throw error;

        const projects = sortProjectsByRecent(data || []);
        setCachedProjects(user.id, projects);
        return projects;
      } catch (err: any) {
        if (isNetworkError(err) || !navigator.onLine) {
          console.log('[ProjectsQuery] Modo Offline: Carregando lista de projetos do cache local...');
          const cached = getCachedProjects(user.id);
          if (cached) return cached;
        }
        throw err;
      }
    },
    enabled: !!user,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    placeholderData: (prev) => {
      if (prev) return prev;
      if (!user) return [];
      const cached = getCachedProjects(user.id);
      return cached || [];
    },
  });
}
