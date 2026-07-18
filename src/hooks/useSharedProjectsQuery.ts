import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Project } from '@/types/database';

const CACHE_KEY = 'devban_shared_projects_cache_';
const CACHE_TTL = 1000 * 60 * 5;

export interface SharedProject extends Project {
  owner_name?: string | null;
  permission?: string;
}

function getCachedSharedProjects(userId: string): SharedProject[] | null {
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

function setCachedSharedProjects(userId: string, data: SharedProject[]) {
  try {
    localStorage.setItem(CACHE_KEY + userId, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {}
}

export function useSharedProjectsQuery() {
  const { user } = useAuth();

  return useQuery<SharedProject[], Error>({
    queryKey: ['sharedProjects', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: memberships, error: memberError } = await supabase
        .from('project_members')
        .select('project_id, permission')
        .eq('user_id', user.id)
        .neq('permission', 'owner');

      if (memberError) throw memberError;
      if (!memberships || memberships.length === 0) return [];

      const projectIds = memberships.map(m => m.project_id);
      const permissionMap = new Map(memberships.map(m => [m.project_id, m.permission]));

      const { data: projectsData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .in('id', projectIds);

      if (projectError) throw projectError;

      const ownerIds = [...new Set((projectsData || []).map(p => p.owner_id))];
      const { data: owners } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', ownerIds);

      const ownerMap = new Map((owners || []).map(o => [o.id, o.name]));

      const sharedProjects: SharedProject[] = (projectsData || []).map(p => ({
        ...p,
        owner_name: ownerMap.get(p.owner_id),
        permission: permissionMap.get(p.id),
      }));

      setCachedSharedProjects(user.id, sharedProjects);
      return sharedProjects;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    placeholderData: (prev) => {
      if (prev) return prev;
      if (!user) return [];
      const cached = getCachedSharedProjects(user.id);
      return cached || [];
    },
  });
}
