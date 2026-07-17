import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useEvent } from './useEvent';
import type { KanbanColumnType, KanbanCardType } from '@/types/kanban';
import type { User } from '@supabase/supabase-js';
import { queueMutation, isNetworkError } from '@/lib/offlineSync';
import { reorderCardsByPriority } from '@/utils/kanban';

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
  onCardCreated?: (card: KanbanCardType) => void;
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
  refetch,
  onCardCreated
}: UseKanbanActionsProps) {

  const handleColumnsChange = useEvent(async (newColumns: KanbanColumnType[]) => {
    if (!projectId) return;
    const updatedColumns = newColumns.map((col, index) => ({
      ...col,
      position: (index + 1) * 1000
    }));
    setOptimisticColumns(updatedColumns);

    const updates = updatedColumns.map(col => ({
      id: col.id,
      project_id: col.project_id,
      title: col.title,
      position: col.position
    }));
    
    try {
      const { error } = await supabase.from('columns').upsert(updates);
      if (error) throw error;
    } catch (error: any) {
      if (isNetworkError(error)) {
        queueMutation('columns', 'upsert', updates);
        toast.success('Modo Offline: Nova ordem das colunas salva no dispositivo.');
        return;
      }
      toast.error('Erro ao salvar nova ordem das colunas');
      refetch();
    }
  });

  const handleCardsChange = useEvent(async (newCards: KanbanCardType[]) => {
    if (!projectId) return;
    
    // Calcula as novas posições matematicamente por coluna
    const updatedCards = newCards.map((card) => {
      // Encontra todos os cards na mesma coluna deste card
      const cardsInColumn = newCards.filter(c => c.column_id === card.column_id);
      // Encontra a posição relativa deste card na coluna
      const indexInColumn = cardsInColumn.findIndex(c => c.id === card.id);
      
      return {
        ...card,
        position: (indexInColumn + 1) * 1000
      };
    });
    
    // Otimista: atualiza a tela instantaneamente
    const fullUpdatedCards = cards.map(c => {
      const updated = updatedCards.find(uc => uc.id === c.id);
      return updated ? updated : c;
    });
    setOptimisticCards(fullUpdatedCards);

    // OTIMIZAÇÃO: Só envia pro banco de dados os cards que de fato mudaram de lugar ou coluna.
    const changedCards = updatedCards.filter(updatedCard => {
      const oldCard = cards.find(c => c.id === updatedCard.id);
      if (!oldCard) return true;
      const hasChanged = oldCard.position !== updatedCard.position || oldCard.column_id !== updatedCard.column_id;
      return hasChanged;
    });

    console.log('DEBUG: newCards length', newCards.length);
    console.log('DEBUG: updatedCards length', updatedCards.length);
    console.log('DEBUG: original cards length', cards.length);
    console.log('DEBUG: changedCards length', changedCards.length);
    console.log('DEBUG: changedCards:', changedCards);

    if (changedCards.length === 0) {
        return; // Nada pra salvar no DB
    }

    const updates = changedCards.map(card => {
      // Remove campos relacionais que não pertencem à tabela 'cards' diretamente
      const { assignees, categories, comments_count, ...dbCard } = card as any;
      return dbCard;
    });

    try {
      const { _data, error } = await supabase.from('cards').upsert(updates);
      if (error) {
        toast.error('Erro ao salvar no banco: ' + error.message);
        throw error;
      }
      toast.success('Cartões salvos com sucesso!');
    } catch (error: any) {
      if (isNetworkError(error)) {
        queueMutation('cards', 'upsert', updates);
        toast.success('Modo Offline: Movimentação salva no dispositivo.');
        return;
      }
      toast.error('Erro ao salvar posição: ' + error?.message);
      refetch();
    }
  });

  const handleCardMove = useEvent(async (cardId: string, sourceColId: string, destColId: string) => {
    console.log('Moving card:', cardId, 'from', sourceColId, 'to', destColId);
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

      // Se moveu o cartão pai, move automaticamente todos os cartões filhos (sub-tarefas) para a mesma coluna!
      const subtasks = cards.filter(c => c.parent_id === cardId);
      if (subtasks.length > 0) {
        const subtaskUpdates = subtasks.map(st => ({
          id: st.id,
          column_id: destColId
        }));
        try {
           const { error } = await supabase.from('cards').upsert(subtaskUpdates);
           if (error) throw error;
        } catch (err: any) {
           if (isNetworkError(err)) {
              queueMutation('cards', 'upsert', subtaskUpdates);
           } else {
              throw err;
           }
        }
        setOptimisticCards(cards.map(c => c.parent_id === cardId ? { ...c, column_id: destColId } : c));
      }
    } catch (error: any) {
      if (isNetworkError(error)) {
        // Log is not essential offline, but we could queue it
        queueMutation('card_activity_logs', 'insert', {
          card_id: cardId,
          project_id: projectId,
          user_id: user.id,
          action: 'moved_card',
          old_value: { column_title: sourceCol.title },
          new_value: { column_title: destCol.title }
        });
      } else {
        console.error('Failed to log move:', error);
      }
    }
  });

  const handleBulkDelete = useEvent(async (cardIds: string[]) => {
    if (!projectId || cardIds.length === 0) return;
    try {
      // Create activity logs for deletions before the actual deletion
      const cardsToDelete = cards.filter(c => cardIds.includes(c.id));
      if (cardsToDelete.length > 0 && user) {
        const logs = cardsToDelete.map(c => ({
          project_id: projectId,
          card_id: c.id,
          user_id: user.id,
          action: 'deleted',
          old_value: { title: c.title }
        }));
        await supabase.from('card_activity_logs').insert(logs);
      }

      const { error } = await supabase.from('cards').delete().in('id', cardIds);
      if (error) throw error;
      toast.success(`${cardIds.length} cartões excluídos com sucesso`);
      refetch();
    } catch (error: any) {
      if (isNetworkError(error)) {
        queueMutation('cards', 'delete', null, { id: cardIds });
        toast.success(`Modo Offline: Deleção salva no dispositivo.`);
        // Simulate immediate removal offline
        setOptimisticCards(cards.filter(c => !cardIds.includes(c.id)));
        return;
      }
      toast.error('Erro ao excluir cartões: ' + error?.message);
    }
  });

  const handleBulkMove = useEvent(async (cardIds: string[], targetColumnId: string) => {
    if (!projectId || cardIds.length === 0) return;
    try {
      const { error } = await supabase
        .from('cards')
        .update({ column_id: targetColumnId })
        .in('id', cardIds);
      if (error) throw error;
      toast.success(`${cardIds.length} cartões movidos com sucesso`);
      refetch();
    } catch (error: any) {
      if (isNetworkError(error)) {
        queueMutation('cards', 'update', { column_id: targetColumnId }, { id: cardIds });
        toast.success(`Modo Offline: Movimentação salva no dispositivo.`);
        setOptimisticCards(cards.map(c => cardIds.includes(c.id) ? { ...c, column_id: targetColumnId } : c));
        return;
      }
      toast.error('Erro ao mover cartões: ' + error?.message);
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

        onCardCreated?.(data);
      } catch (error: any) {
        toast.error('Erro ao criar cartão: ' + error.message);
      }
    });
  });

  const handlePriorityChange = useEvent(async (cardId: string) => {
    if (!projectId) return;
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    const column = columns.find(c => c.id === card.column_id);
    if (!column?.sort_by_priority) return;

    const columnCards = cards.filter(c => c.column_id === card.column_id);
    const reordered = reorderCardsByPriority(columnCards);

    setOptimisticCards(cards.map(c => {
      const updated = reordered.find(r => r.id === c.id);
      return updated ? updated : c;
    }));

    const changedCards = reordered.filter(newCard => {
      const oldCard = columnCards.find(c => c.id === newCard.id);
      return oldCard && oldCard.position !== newCard.position;
    });

    if (changedCards.length === 0) return;

    const updates = changedCards.map(c => {
      const { assignees, categories, comments_count, ...dbCard } = c as any;
      return dbCard;
    });

    try {
      const { error } = await supabase.from('cards').upsert(updates);
      if (error) throw error;
    } catch (error: any) {
      if (isNetworkError(error)) {
        queueMutation('cards', 'upsert', updates);
        toast.success('Modo Offline: Reordenção salva no dispositivo.');
        return;
      }
      toast.error('Erro ao reordenar por prioridade: ' + error?.message);
      refetch();
    }
  });

  return {
    handleColumnsChange,
    handleCardsChange,
    handleCardMove,
    handleBulkDelete,
    handleBulkMove,
    handleAddColumn,
    handleUpdateColumn,
    handleDeleteColumn,
    handleAddCard,
    handlePriorityChange
  };
}
