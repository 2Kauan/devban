import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { AIKanbanBoard } from '@/types/ai';
import { toast } from 'sonner';

export function useAIImport() {
  const [isImporting, setIsImporting] = useState(false);

  const importBoard = async (projectId: string, board: AIKanbanBoard) => {
    setIsImporting(true);
    try {
      // 1. Fetch current max position for columns
      const { data: existingCols } = await supabase
        .from('columns')
        .select('position')
        .eq('project_id', projectId)
        .order('position', { ascending: false })
        .limit(1);
      
      let baseColPosition = existingCols?.[0]?.position || 0;

      // Iterate over each generated column
      for (const col of board.columns) {
        baseColPosition += 1000;
        
        // 2. Insert Column
        const { data: newCol, error: colError } = await supabase
          .from('columns')
          .insert({
            project_id: projectId,
            title: col.title,
            position: baseColPosition,
            color: '#94a3b8' // Default color
          })
          .select()
          .single();

        if (colError || !newCol) throw new Error('Erro ao criar coluna: ' + colError?.message);

        // 3. Insert Tasks for this column
        let baseCardPosition = 0;
        for (const task of col.tasks) {
          baseCardPosition += 1000;
          
          const { data: newCard, error: cardError } = await supabase
            .from('cards')
            .insert({
              column_id: newCol.id,
              project_id: projectId, // Ensure denormalized project_id if it exists
              title: task.title,
              description: task.description || '',
              position: baseCardPosition,
              priority: task.priority || 'medium',
            })
            .select()
            .single();
            
          if (cardError) {
            console.error('Error inserting card:', cardError);
            continue;
          }

          // 4. Insert Checklist items if they exist
          if (task.checklist && task.checklist.length > 0) {
            const checklistInserts = task.checklist.map(item => ({
              card_id: newCard.id,
              title: item,
              is_completed: false
            }));
            
            await supabase.from('checklist_items').insert(checklistInserts);
          }
        }
      }

      toast.success('Kanban importado com sucesso!');
      return true;
    } catch (error: any) {
      toast.error('Erro na importação: ' + error.message);
      return false;
    } finally {
      setIsImporting(false);
    }
  };

  return { importBoard, isImporting };
}
