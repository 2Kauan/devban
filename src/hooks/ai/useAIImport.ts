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
          
          // Map priority appropriately
          const validPriorities = ['low', 'medium', 'high', 'urgent'];
          const priority = validPriorities.includes(task.priority || '') ? task.priority : 'medium';
          
          const { data: newCard, error: cardError } = await supabase
            .from('cards')
            .insert({
              column_id: newCol.id,
              project_id: projectId,
              title: task.title,
              description: task.description || '',
              position: baseCardPosition,
              priority: priority,
              due_date: task.due_date || null,
            })
            .select()
            .single();
            
          if (cardError) {
            console.error('Error inserting card:', cardError);
            continue;
          }

          // 3.5 Insert Tags/Categories for this card
          if (task.tags && task.tags.length > 0) {
            for (const tag of task.tags) {
              let categoryId = '';
              const { data: existingCat } = await supabase
                .from('categories')
                .select('id')
                .eq('project_id', projectId)
                .ilike('name', tag.name)
                .maybeSingle();

              if (existingCat) {
                categoryId = existingCat.id;
              } else {
                const { data: newCat } = await supabase
                  .from('categories')
                  .insert({
                    project_id: projectId,
                    name: tag.name,
                    color: tag.color || '#3b82f6'
                  })
                  .select()
                  .single();
                
                if (newCat) categoryId = newCat.id;
              }

              if (categoryId) {
                await supabase.from('card_categories').insert({
                  card_id: newCard.id,
                  category_id: categoryId
                });
              }
            }
          }

          // 4. Insert Checklist items properly with parent Checklist
          if (task.checklist && task.checklist.length > 0) {
            const { data: newChecklist } = await supabase
              .from('checklists')
              .insert({
                card_id: newCard.id,
                title: 'Checklist'
              })
              .select()
              .single();

            if (newChecklist) {
              const checklistInserts = task.checklist.map((item, index) => ({
                checklist_id: newChecklist.id,
                text: item, // Ensure it's text or title based on DB. CardModal uses item.text
                checked: false,
                position: index * 1000
              }));
              
              await supabase.from('checklist_items').insert(checklistInserts);
            }
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
