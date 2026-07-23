import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, createUniqueChannel } from '@/lib/supabase';
import type { Project as ProjectType, Category, ProjectPermission } from '@/types/database';
import type { KanbanColumnType, KanbanCardType } from '@/types/kanban';
import { useAuth } from '@/contexts/AuthContext';
import type { Profile } from '@/types/database';
import { cacheBoardData, getCachedBoardData, isNetworkError } from '@/lib/offlineSync';

export interface ProjectMember {
  permission: ProjectPermission;
  job_title: string | null;
  profiles: Profile;
}

export interface ProjectData {
  project: ProjectType;
  columns: KanbanColumnType[];
  cards: KanbanCardType[];
  projectCategories: Category[];
  userPermission: ProjectPermission;
  pendingRequestsCount: number;
  projectMembers: ProjectMember[];
}

export function useProjectQuery(projectId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery<ProjectData>({
    queryKey: ['project', projectId],
    placeholderData: (prev) => {
      if (prev) return prev;
      if (!projectId) return undefined;
      const cached = getCachedBoardData(projectId);
      return cached?.fullData || undefined;
    },
    queryFn: async () => {
      if (!projectId) throw new Error('No project ID');

      try {
        // Parallel batch 1: Fetch project, members, columns, cards, categories, and access requests simultaneously
        const [
          projectRes,
          membersRes,
          colsRes,
          cardsRes,
          catRes,
          pendingRequestsRes
        ] = await Promise.all([
          supabase.from('projects').select('*').eq('id', projectId).single(),
          supabase.from('project_members').select('permission, job_title, profiles(*)').eq('project_id', projectId),
          supabase.from('columns').select('*').eq('project_id', projectId).order('position', { ascending: true }),
          supabase.from('cards').select('*').eq('project_id', projectId).order('position', { ascending: true }),
          supabase.from('categories').select('*').eq('project_id', projectId),
          user
            ? supabase.from('project_access_requests').select('*', { count: 'exact', head: true }).eq('project_id', projectId).eq('status', 'pending')
            : Promise.resolve({ count: 0, error: null }),
        ]);

        if (projectRes.error) throw projectRes.error;
        const projectData = projectRes.data;

        // Determine permission & process members
        let perm: ProjectPermission = 'viewer';
        const pendingCount = (pendingRequestsRes as any).count || 0;
        const allMembersData = membersRes.data || [];

        let projectMembers: ProjectMember[] = allMembersData
          .filter(m => m.profiles)
          .map(m => ({
            permission: m.permission as ProjectPermission,
            job_title: m.job_title,
            profiles: m.profiles as unknown as Profile
          }));

        if (user) {
          if (projectData.owner_id === user.id) {
            perm = 'owner';
          } else {
            const currentMember = allMembersData.find((m: any) => m.profiles?.id === user.id);
            if (currentMember) {
              perm = currentMember.permission as ProjectPermission;
            } else if (projectData.share_enabled) {
              perm = 'editor';
            } else {
              throw new Error('Acesso negado. Você não é mais membro deste projeto.');
            }
          }
        } else if (projectData.share_enabled) {
          perm = 'viewer';
        } else {
          throw new Error('Acesso negado. Faça login para acessar este projeto.');
        }

        // Include owner in members list if missing
        if (projectData.owner_id && !projectMembers.some(m => m.profiles.id === projectData.owner_id)) {
          const { data: ownerProfile } = await supabase.from('profiles').select('*').eq('id', projectData.owner_id).single();
          if (ownerProfile) {
            projectMembers.push({
              permission: 'owner',
              job_title: 'Dono do Projeto',
              profiles: ownerProfile
            });
          }
        }

        // Include guest user in members list if missing
        if (user && perm === 'editor' && projectData.owner_id !== user.id && !projectMembers.some(m => m.profiles.id === user.id)) {
          const { data: userProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
          if (userProfile) {
            projectMembers.push({
              permission: 'editor',
              job_title: 'Convidado (Link)',
              profiles: userProfile
            });
          }
        }

        // Process columns
        if (colsRes.error) throw colsRes.error;
        let columns = colsRes.data || [];

        try {
          const localColSettings = JSON.parse(localStorage.getItem('devban_local_column_settings') || '{}');
          columns = columns.map(c => ({
            ...c,
            sort_by_category: c.sort_by_category ?? localColSettings[c.id]?.sort_by_category ?? false
          }));
        } catch {}

        if (columns.length === 0) {
          const defaultCols = [
            { project_id: projectId, title: 'Ideias', position: 1000 },
            { project_id: projectId, title: 'A Fazer', position: 2000 },
            { project_id: projectId, title: 'Fazendo', position: 3000 },
            { project_id: projectId, title: 'Revisão', position: 4000 },
            { project_id: projectId, title: 'Concluído', position: 5000, is_completed: true },
          ];
          const { data: insertedCols, error: insertError } = await supabase
            .from('columns')
            .insert(defaultCols)
            .select();
          
          if (!insertError && insertedCols) {
            columns = insertedCols;
          }
        }

        // Process cards & categories
        if (cardsRes.error) throw cardsRes.error;
        const cardsData = cardsRes.data || [];
        const projectCategories = catRes.data || [];

        let enrichedCards = cardsData;

        if (cardsData.length > 0) {
          const cardIds = cardsData.map(c => c.id);

          // Parallel batch 2: Fetch card_categories, card_assignees, and comments in parallel
          const [cardCatRes, cardAssigneesRes, commentsCountRes] = await Promise.all([
            supabase.from('card_categories').select('*').in('card_id', cardIds),
            supabase.from('card_assignees').select('card_id, profiles(*)').in('card_id', cardIds),
            supabase.from('comments').select('card_id').in('card_id', cardIds),
          ]);

          const cardCatData = cardCatRes.data || [];
          const cardAssigneesData = cardAssigneesRes.data || [];
          const commentsCountData = commentsCountRes.data || [];

          const commentsCounts: Record<string, number> = {};
          commentsCountData.forEach((c: any) => {
            commentsCounts[c.card_id] = (commentsCounts[c.card_id] || 0) + 1;
          });

          enrichedCards = cardsData.map(card => {
            const cardCatRelations = cardCatData.filter((cc: any) => cc.card_id === card.id);
            const cardCategories = cardCatRelations
              .map((cc: any) => projectCategories.find(c => c.id === cc.category_id))
              .filter(Boolean) as Category[];

            const cardAssignees = cardAssigneesData
              .filter((ca: any) => ca.card_id === card.id && ca.profiles)
              .map((ca: any) => ca.profiles as unknown as Profile);

            return {
              ...card,
              categories: cardCategories,
              assignees: cardAssignees,
              comments_count: commentsCounts[card.id] || 0
            };
          });
        }

        const finalData = {
          project: projectData,
          columns,
          cards: enrichedCards,
          projectCategories,
          userPermission: perm,
          pendingRequestsCount: pendingCount,
          projectMembers
        };

        // Cache board data for instant future loads
        cacheBoardData(projectId, columns, enrichedCards, finalData);
        
        return finalData;

      } catch (err: any) {
        if (isNetworkError(err)) {
           console.log('Sem internet, carregando dados do cache...');
           const cached = getCachedBoardData(projectId);
           if (cached && cached.fullData) {
              return cached.fullData;
           }
           throw new Error('Você está offline e não há dados em cache para este projeto.');
        }
        throw err;
      }
    },
    enabled: !!projectId,
    staleTime: 1000 * 30, // 30 seconds cache
  });

  // Realtime subscription
  useEffect(() => {
    if (!projectId) return;

    const channel = createUniqueChannel(`project_${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cards', filter: `project_id=eq.${projectId}` },
        (payload) => {
          // Mutating cache directly depending on payload
          queryClient.setQueryData(['project', projectId], (old: ProjectData | undefined) => {
             if (!old) return old;
             let newCards = [...old.cards];
             
             if (payload.eventType === 'INSERT') {
                 // Check if it exists to avoid duplicates
                 if (!newCards.find(c => c.id === payload.new.id)) {
                      // Fetch missing categories if needed, for now insert raw
                      newCards.push({
                        ...payload.new as KanbanCardType,
                        categories: [],
                        assignees: []
                      });
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
          queryClient.setQueryData(['project', projectId], (old: ProjectData | undefined) => {
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
             
             // Keep it sorted
             newCols.sort((a, b) => a.position - b.position);
             return { ...old, columns: newCols };
          });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects', filter: `id=eq.${projectId}` },
        () => queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_members', filter: `project_id=eq.${projectId}` },
        () => queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_access_requests', filter: `project_id=eq.${projectId}` },
        () => queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, queryClient]);

  // Funções utilitárias para Mutação Otimista no Cache
  const setOptimisticColumns = (columns: KanbanColumnType[]) => {
    queryClient.setQueryData(['project', projectId], (old: ProjectData | undefined) => {
      if (!old) return old;
      return { ...old, columns };
    });
  };

  const setOptimisticCards = (cards: KanbanCardType[]) => {
    queryClient.setQueryData(['project', projectId], (old: ProjectData | undefined) => {
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
