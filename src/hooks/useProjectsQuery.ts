import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Project } from '@/types/database';

const CACHE_KEY = 'devban_projects_cache_';
const CACHE_TTL = 1000 * 60 * 5; // 5 min

function getCachedProjects(userId: string): Project[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY + userId);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL) return null;
    return data;
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

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const projects = data || [];
      setCachedProjects(user.id, projects);
      return projects;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
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
