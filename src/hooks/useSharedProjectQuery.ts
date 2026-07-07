import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Project as ProjectType } from '@/types/database';
import type { KanbanColumnType, KanbanCardType } from '@/types/kanban';

export interface SharedProjectData {
  project: ProjectType;
  columns: KanbanColumnType[];
  cards: KanbanCardType[];
}

export function useSharedProjectQuery(token: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery<SharedProjectData>({
    queryKey: ['sharedProject', token],
    queryFn: async () => {
      if (!token) throw new Error('No token');

      // Fetch project
      const { data: projectData, error: projError } = await supabase
        .from('projects')
        .select('*')
        .eq('share_token', token)
        .eq('share_enabled', true)
        .single();
      
      if (projError) throw projError;

      // Fetch columns
      const { data: colsData, error: colsError } = await supabase
        .from('columns')
        .select('*')
        .eq('project_id', projectData.id)
        .order('position', { ascending: true });
      
      if (colsError) throw colsError;

      // Fetch cards
      const { data: cardsData, error: cardsError } = await supabase
        .from('cards')
        .select('*')
        .eq('project_id', projectData.id)
        .order('position', { ascending: true });
      
      if (cardsError) throw cardsError;

      return {
        project: projectData,
        columns: colsData || [],
        cards: cardsData || [],
      };
    },
    enabled: !!token,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  const projectId = query.data?.project?.id;

  // Realtime subscription
  useEffect(() => {
    if (!projectId) return;

    const channel = supabase.channel(`public:shared_project_${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cards', filter: `project_id=eq.${projectId}` },
        (payload) => {
          queryClient.setQueryData(['sharedProject', token], (old: SharedProjectData | undefined) => {
             if (!old) return old;
             let newCards = [...old.cards];
             
             if (payload.eventType === 'INSERT') {
                 if (!newCards.find(c => c.id === payload.new.id)) {
                     newCards.push(payload.new as KanbanCardType);
                 }
             } else if (payload.eventType === 'UPDATE') {
                 newCards = newCards.map(c => c.id === payload.new.id ? { ...c, ...payload.new } : c);
             } else if (payload.eventType === 'DELETE') {
                 newCards = newCards.filter(c => c.id !== payload.old.id);
             }
             
             return { ...old, cards: newCards };
          });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'columns', filter: `project_id=eq.${projectId}` },
        (payload) => {
          queryClient.setQueryData(['sharedProject', token], (old: SharedProjectData | undefined) => {
             if (!old) return old;
             let newCols = [...old.columns];
             
             if (payload.eventType === 'INSERT') {
                 if (!newCols.find(c => c.id === payload.new.id)) {
                     newCols.push(payload.new as KanbanColumnType);
                 }
             } else if (payload.eventType === 'UPDATE') {
                 newCols = newCols.map(c => c.id === payload.new.id ? { ...c, ...payload.new } : c);
             } else if (payload.eventType === 'DELETE') {
                 newCols = newCols.filter(c => c.id !== payload.old.id);
             }
             
             newCols.sort((a, b) => a.position - b.position);
             return { ...old, columns: newCols };
          });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects', filter: `id=eq.${projectId}` },
        (payload) => {
           // If project changes (e.g. permission changed), invalidate query to fetch new state
           queryClient.invalidateQueries({ queryKey: ['sharedProject', token] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, token, queryClient]);

  // Funções utilitárias para Mutação Otimista no Cache
  const setOptimisticColumns = (columns: KanbanColumnType[]) => {
    queryClient.setQueryData(['sharedProject', token], (old: SharedProjectData | undefined) => {
      if (!old) return old;
      return { ...old, columns };
    });
  };

  const setOptimisticCards = (cards: KanbanCardType[]) => {
    queryClient.setQueryData(['sharedProject', token], (old: SharedProjectData | undefined) => {
      if (!old) return old;
      return { ...old, cards };
    });
  };

  return {
    ...query,
    setOptimisticColumns,
    setOptimisticCards,
  };
}
