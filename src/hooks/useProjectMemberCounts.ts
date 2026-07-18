import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const CACHE_KEY = 'devban_member_counts_';
const CACHE_TTL = 1000 * 60 * 5;

function getCachedCounts(): Record<string, number> | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL) return null;
    return data;
  } catch {
    return null;
  }
}

function setCachedCounts(data: Record<string, number>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {}
}

export function useProjectMemberCounts(projectIds: string[]) {
  const { user } = useAuth();
  const enabled = !!user && projectIds.length > 0;

  return useQuery<Record<string, number>, Error>({
    queryKey: ['projectMemberCounts', projectIds.sort().join(',')],
    queryFn: async () => {
      if (projectIds.length === 0) return {};

      const { data, error } = await supabase
        .from('project_members')
        .select('project_id')
        .in('project_id', projectIds);

      if (error) throw error;

      const counts: Record<string, number> = {};
      (data || []).forEach(row => {
        counts[row.project_id] = (counts[row.project_id] || 0) + 1;
      });

      setCachedCounts(counts);
      return counts;
    },
    enabled,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
    placeholderData: (prev) => {
      if (prev) return prev;
      const cached = getCachedCounts();
      if (!cached) return {};
      const filtered: Record<string, number> = {};
      projectIds.forEach(id => {
        if (cached[id] !== undefined) filtered[id] = cached[id];
      });
      return filtered;
    },
  });
}
