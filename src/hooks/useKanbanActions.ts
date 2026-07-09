import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useEvent } from './useEvent';
import type { KanbanColumnType, KanbanCardType } from '@/types/kanban';
import type { User } from '@supabase/supabase-js';

interface UseKanbanActionsProps {
  projectId: string | undefined;
  columns: KanbanColumnType[];
  cards: KanbanCardType[];
  user: User | null;
  openPrompt: (title: string, placeholder: string, onSubmit: (val: string) => void) => void;
  openConfirm: (title: string, message: string, onConfirm: () => void) => void;
  setOptimisticColumns: (columns: KanbanColumnType[]) => void;
  setOptimisticCards: (cards: KanbanCardType[]) => void;
  refetch: () => void;
}

export function useKanbanActions({
  projectId,
  columns,
  cards,
  user,
  openPrompt,
  openConfirm,
  setOptimisticColumns,
  setOptimisticCards,
  refetch
}: UseKanbanActionsProps) {

  const handleColumnsChange = useEvent(async (newColumns: KanbanColumnType[]) => {
    if (!projectId) return;
    const updatedColumns = newColumns.map((col, index) => ({
      ...col,
      position: (index + 1) * 1000
    }));
    setOptimisticColumns(updatedColumns);

    try {
      const updates = updatedColumns.map(col => ({
        id: col.id,
        project_id: col.project_id,
        title: col.title,
        position: col.position
      }));
      
      const { error } = await supabase.from('columns').upsert(updates);
      if (error) throw error;
    } catch (error: any) {
      toast.error('Erro ao salvar nova ordem das colunas');
      refetch();
    }
  });

  const handleCardsChange = useEvent(async (newCards: KanbanCardType[]) => {
    if (!projectId) return;
    const updatedCards = newCards.map((card, index) => ({
      ...card,
      position: (index + 1) * 1000
    }));
    setOptimisticCards(updatedCards);

    try {
      const updates = updatedCards.map(card => ({
        id: card.id,
        project_id: card.project_id,
        column_id: card.column_id,
        title: card.title,
        position: card.position
      }));

      const { error } = await supabase.from('cards').upsert(updates);
      if (error) throw error;
    } catch (error: any) {
      toast.error('Erro ao salvar posição: ' + error?.message);
      refetch();
    }
  });

  const handleCardMove = useEvent(async (cardId: string, sourceColId: string, destColId: string) => {
    if (!user || !projectId) return;
    const sourceCol = columns.find(c => c.id === sourceColId);
    const destCol = columns.find(c => c.id === destColId);
    if (!sourceCol || !destCol) return;

    try {
      await supabase.from('card_activity_logs').insert({
        card_id: cardId,
        project_id: projectId,
        user_id: user.id,
        action: 'moved_card',
        old_value: { column_title: sourceCol.title },
        new_value: { column_title: destCol.title }
      });
    } catch (error) {
      console.error('Failed to log move:', error);
    }
  });

  const handleAddColumn = useEvent(() => {
    if (!projectId) return;
    openPrompt('Nome da nova coluna:', 'Ex: Para Fazer', async (title: string) => {
      if (!title.trim()) return;

      const newPosition = columns.length > 0 ? columns[columns.length - 1].position + 1000 : 1000;

      try {
        const { data, error } = await supabase
          .from('columns')
          .insert({
            project_id: projectId,
            title: title.trim(),
            position: newPosition,
          })
          .select()
          .single();

        if (error) throw error;
        setOptimisticColumns([...columns, data]);
      } catch (error: any) {
        toast.error('Erro ao criar coluna: ' + error.message);
      }
    });
  });

  const handleUpdateColumn = useEvent(async (columnId: string, updates: Partial<KanbanColumnType>) => {
    setOptimisticColumns(columns.map(c => c.id === columnId ? { ...c, ...updates } : c));
    try {
      const { error } = await supabase.from('columns').update(updates).eq('id', columnId);
      if (error) throw error;
    } catch (error: any) {
      toast.error('Erro ao atualizar coluna');
      refetch();
    }
  });

  const handleDeleteColumn = useEvent((columnId: string) => {
    openConfirm(
      'Excluir Coluna',
      'Tem certeza que deseja excluir esta coluna? Todas as tarefas nela serão perdidas.',
      async () => {
        try {
          const { error } = await supabase
            .from('columns')
            .delete()
            .eq('id', columnId);

          if (error) throw error;
          setOptimisticColumns(columns.filter(c => c.id !== columnId));
        } catch (error: any) {
          toast.error('Erro ao excluir coluna: ' + error.message);
        }
      }
    );
  });

  const handleAddCard = useEvent((columnId: string) => {
    if (!projectId) return;
    openPrompt('Título da tarefa:', 'Ex: Desenvolver página inicial', async (title: string) => {
      if (!title.trim()) return;

      const columnCards = cards.filter(c => c.column_id === columnId);
      const newPosition = columnCards.length > 0 ? columnCards[columnCards.length - 1].position + 1000 : 1000;

      try {
        const { data, error } = await supabase
          .from('cards')
          .insert({
            project_id: projectId,
            column_id: columnId,
            title: title.trim(),
            position: newPosition,
            priority: 'medium'
          })
          .select()
          .single();

        if (error) throw error;
        setOptimisticCards([...cards, data]);
        
        if (user) {
          await supabase.from('card_activity_logs').insert({
            card_id: data.id,
            project_id: projectId,
            user_id: user.id,
            action: 'created_card'
          });
        }
      } catch (error: any) {
        toast.error('Erro ao criar cartão: ' + error.message);
      }
    });
  });

  return {
    handleColumnsChange,
    handleCardsChange,
    handleCardMove,
    handleAddColumn,
    handleUpdateColumn,
    handleDeleteColumn,
    handleAddCard
  };
}
