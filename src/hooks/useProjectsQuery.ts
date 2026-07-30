import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Project } from '@/types/database';
import { sortProjectsByRecent } from '@/utils/recentProjects';
import { isNetworkError, saveProjectsToCache, getProjectsFromCache } from '@/lib/offlineSync';

export function useProjectsQuery() {
  const { user } = useAuth();

  return useQuery<Project[], Error>({
    queryKey: ['projects', user?.id],
    queryFn: async () => {
      if (!user) {
        return getProjectsFromCache();
      }

      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('owner_id', user.id)
          .order('updated_at', { ascending: false });

        if (error) throw error;

        const projects = sortProjectsByRecent(data || []);
        saveProjectsToCache(projects);
        return projects;
      } catch (err: any) {
        if (isNetworkError(err) || !navigator.onLine) {
          console.log('[ProjectsQuery] Modo Offline: Carregando lista de projetos do cache local...');
          const cached = getProjectsFromCache();
          if (cached && cached.length > 0) return cached;
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
      if (prev && prev.length > 0) return prev;
      const cached = getProjectsFromCache();
      return cached || [];
    },
  });
}
