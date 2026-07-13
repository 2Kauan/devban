import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface ActivityProfile {
  id: string;
  name: string | null;
  avatar_url: string | null;
}

export interface ActivityItem {
  id: string;
  type: 'comment' | 'activity';
  content: string;
  created_at: string;
  user: ActivityProfile | null;
}

export function useCardActivity(cardId: string | undefined) {
  const queryClient = useQueryClient();

  const queryKey = ['card_activity', cardId];

  // Realtime subscription
  useEffect(() => {
    if (!cardId) return;

    const channel = supabase
      .channel(`card_activity_${cardId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments', filter: `card_id=eq.${cardId}` },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'card_activity_logs', filter: `card_id=eq.${cardId}` },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cardId, queryClient, queryKey.join(',')]);

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!cardId) return [];

      // Fetch comments
      const { data: commentsData, error: commentsErr } = await supabase
        .from('comments')
        .select('id, content, created_at, profiles(id, name, avatar_url)')
        .eq('card_id', cardId);

      if (commentsErr) throw commentsErr;

      // Fetch activity logs
      const { data: logsData, error: logsErr } = await supabase
        .from('card_activity_logs')
        .select('id, action, created_at, profiles(id, name, avatar_url)')
        .eq('card_id', cardId);

      if (logsErr) throw logsErr;

      const items: ActivityItem[] = [];

      if (commentsData) {
        items.push(...commentsData.map(c => ({
          id: c.id,
          type: 'comment' as const,
          content: c.content,
          created_at: c.created_at,
          user: (c.profiles as unknown as ActivityProfile) || null
        })));
      }

      if (logsData) {
        items.push(...logsData.map(l => ({
          id: l.id,
          type: 'activity' as const,
          content: l.action,
          created_at: l.created_at,
          user: (l.profiles as unknown as ActivityProfile) || null
        })));
      }

      // Sort chronological (newest to oldest)
      return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    enabled: !!cardId,
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!cardId) throw new Error('No card ID');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('comments')
        .insert({
          card_id: cardId,
          user_id: user.id,
          content
        })
        .select('id, content, created_at, profiles(id, name, avatar_url)')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (newComment) => {
      queryClient.setQueryData(queryKey, (old: ActivityItem[] | undefined) => {
        if (!old) return old;
        const item: ActivityItem = {
          id: newComment.id,
          type: 'comment',
          content: newComment.content,
          created_at: newComment.created_at,
          user: (newComment.profiles as unknown as ActivityProfile) || null
        };
        return [item, ...old].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      });
    },
    onError: (err: any) => {
      toast.error('Erro ao adicionar comentário: ' + err.message);
    }
  });

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    addComment: (content: string) => addCommentMutation.mutateAsync(content),
    isAdding: addCommentMutation.isPending
  };
}
