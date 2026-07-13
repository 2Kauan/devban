import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Project as ProjectType, Category, ProjectPermission } from '@/types/database';
import type { KanbanColumnType, KanbanCardType } from '@/types/kanban';
import { useAuth } from '@/contexts/AuthContext';
import type { Profile } from '@/types/database';

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
    queryFn: async () => {
      if (!projectId) throw new Error('No project ID');

      // Fetch project
      const { data: projectData, error: projError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      
      if (projError) throw projError;

      // Determine permission
      let perm: ProjectPermission = 'viewer';
      let pendingCount = 0;

      if (user) {
        if (projectData.owner_id === user.id) {
          perm = 'owner';
          const { count } = await supabase
            .from('project_access_requests')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', projectId)
            .eq('status', 'pending');
          pendingCount = count || 0;
        } else {
          const { data: memberData } = await supabase
            .from('project_members')
            .select('permission')
            .eq('project_id', projectId)
            .eq('user_id', user.id)
            .maybeSingle();
          if (memberData) {
            perm = memberData.permission;
          } else if (projectData.share_enabled) {
            perm = projectData.share_permission === 'edit' ? 'editor' : 'viewer';
            // Auto-join authenticated user via public link so they appear in members list
            const { error } = await supabase.from('project_members').insert({
              project_id: projectId,
              user_id: user.id,
              permission: perm
            });
            if (error && error.code !== '23505') { // Ignore unique constraint violation
              console.error(error);
            }
          }
        }
      } else if (projectData.share_enabled && projectData.share_permission === 'edit') {
        perm = 'editor';
      }

      // Fetch all project members
      const { data: allMembersData, error: allMemError } = await supabase
        .from('project_members')
        .select('permission, job_title, profiles(*)')
        .eq('project_id', projectId);
      
      let projectMembers: ProjectMember[] = [];
      if (!allMemError && allMembersData) {
        projectMembers = allMembersData
          .filter(m => m.profiles)
          .map(m => ({
            permission: m.permission as ProjectPermission,
            job_title: m.job_title,
            profiles: m.profiles as unknown as Profile
          }));
      }
      
      // Also, we need to include the owner as a member if they are not explicitly in project_members
      if (projectData.owner_id) {
         const ownerInMembers = projectMembers.find(m => m.profiles.id === projectData.owner_id);
         if (!ownerInMembers) {
            const { data: ownerProfile } = await supabase.from('profiles').select('*').eq('id', projectData.owner_id).single();
            if (ownerProfile) {
               projectMembers.push({
                 permission: 'owner',
                 job_title: 'Dono do Projeto',
                 profiles: ownerProfile
               });
            }
         }
      }

      // If user is authenticated and has access via public link, include them in projectMembers so they can assign themselves
      if (user && perm === 'editor' && projectData.owner_id !== user.id) {
         const userInMembers = projectMembers.find(m => m.profiles.id === user.id);
         if (!userInMembers) {
            const { data: userProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            if (userProfile) {
               projectMembers.push({
                 permission: 'editor',
                 job_title: 'Convidado (Link)',
                 profiles: userProfile
               });
            }
         }
      }

      // Fetch columns
      const { data: colsData, error: colsError } = await supabase
        .from('columns')
        .select('*')
        .eq('project_id', projectId)
        .order('position', { ascending: true });
      
      if (colsError) throw colsError;
      
      let columns = colsData || [];

      // Create default columns if none exist
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

      // Fetch cards
      const { data: cardsData, error: cardsError } = await supabase
        .from('cards')
        .select('*')
        .eq('project_id', projectId)
        .order('position', { ascending: true });
      
      if (cardsError) throw cardsError;

      // Fetch categories
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('*')
        .eq('project_id', projectId);
      
      if (catError) throw catError;
      const projectCategories = catData || [];

      // Fetch card_assignees
      let enrichedCards = cardsData || [];
      if (cardsData && cardsData.length > 0) {
        const cardIds = cardsData.map(c => c.id);
        
        // Fetch categories
        const { data: cardCatData, error: cardCatError } = await supabase
          .from('card_categories')
          .select('*')
          .in('card_id', cardIds);
          
        // Fetch assignees
        const { data: cardAssigneesData, error: assigneesError } = await supabase
          .from('card_assignees')
          .select('card_id, profiles(*)')
          .in('card_id', cardIds);
          
        // Fetch comment counts
        const { data: commentsCountData } = await supabase
          .from('comments')
          .select('card_id')
          .in('card_id', cardIds);

        const commentsCounts: Record<string, number> = {};
        if (commentsCountData) {
          commentsCountData.forEach(c => {
            commentsCounts[c.card_id] = (commentsCounts[c.card_id] || 0) + 1;
          });
        }
        
        enrichedCards = cardsData.map(card => {
          let cardCategories: Category[] = [];
          if (!cardCatError && cardCatData) {
            const cardCatRelations = cardCatData.filter(cc => cc.card_id === card.id);
            cardCategories = cardCatRelations
              .map(cc => projectCategories.find(c => c.id === cc.category_id))
              .filter(Boolean) as Category[];
          }
          
          let cardAssignees: Profile[] = [];
          if (!assigneesError && cardAssigneesData) {
            cardAssignees = cardAssigneesData
              .filter(ca => ca.card_id === card.id && ca.profiles)
              .map(ca => ca.profiles as unknown as Profile);
          }
          
          return { 
            ...card, 
            categories: cardCategories, 
            assignees: cardAssignees,
            comments_count: commentsCounts[card.id] || 0
          };
        });
      }

      return {
        project: projectData,
        columns,
        cards: enrichedCards,
        projectCategories,
        userPermission: perm,
        pendingRequestsCount: pendingCount,
        projectMembers
      };
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  // Realtime subscription
  useEffect(() => {
    if (!projectId) return;

    const channel = supabase.channel(`public:project_${projectId}`)
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
