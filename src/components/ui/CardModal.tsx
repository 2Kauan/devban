import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase';
import type { KanbanCardType } from '@/types/kanban';
import { X, AlignLeft, CheckSquare, Clock, Tag, Flag, Loader2, Plus, Trash2, ChevronDown, ArrowDownRight, ArrowRight, ArrowUpRight, AlertCircle, Users, ListTree } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

import { TagSelector } from '@/components/ui/TagSelector';
import type { Category, Profile } from '@/types/database';
import type { ProjectMember } from '@/hooks/useProjectQuery';

interface CardModalProps {
  card: KanbanCardType | null;
  isOpen: boolean;
  initialDate?: Date;
  initialColumnId?: string;
  onClose: () => void;
  onUpdate: () => void;
  projectCategories?: Category[];
  projectMembers?: ProjectMember[];
  projectId?: string;
  canEdit?: boolean;
  allCards?: KanbanCardType[];
  columns?: any[];
}

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  position: number;
}

interface Checklist {
  id: string;
  title: string;
  items: ChecklistItem[];
}

const toLocalDatetimeString = (dateObj: Date | string | null | undefined) => {
  if (!dateObj) return '';
  const d = new Date(dateObj);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function CardModal({ card, isOpen, onClose, onUpdate, projectCategories = [], projectMembers = [], projectId, canEdit = true, allCards = [], columns = [], initialDate, initialColumnId }: CardModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [localTags, setLocalTags] = useState<Category[]>([]);
  const [localAssignees, setLocalAssignees] = useState<Profile[]>([]);
  const [newItemText, setNewItemText] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);
  const [isAssigneeOpen, setIsAssigneeOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });
  
  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
      due_date: initialDate ? toLocalDatetimeString(initialDate) : '',
      border_color: '',
      column_id: initialColumnId || (columns?.length > 0 ? columns[0].id : '')
    }
  });

  const priorityValue = watch('priority');


  useEffect(() => {
    if (card) {
      reset({
        title: card.title,
        description: card.description || '',
        priority: card.priority,
        due_date: card.due_date ? toLocalDatetimeString(card.due_date) : '',
        border_color: card.border_color || '',
      });
      setLocalTags(card.categories || []);
      setLocalAssignees(card.assignees || []);
      setIsAssigneeOpen(false);
      setIsPriorityOpen(false);
      fetchChecklists();
    } else {
      reset({
        title: '',
        description: '',
        priority: 'medium',
        due_date: initialDate ? toLocalDatetimeString(initialDate) : '',
        border_color: '',
        column_id: initialColumnId || (columns?.length > 0 ? columns[0].id : '')
      });
      setLocalTags([]);
      setLocalAssignees([]);
      setChecklists([]);
    }
  }, [card, reset, initialDate, initialColumnId, columns]);

  const fetchChecklists = async () => {
    if (!card) return;
    try {
      const { data: checklistsData, error: checklistsError } = await supabase
        .from('checklists')
        .select('*')
        .eq('card_id', card.id);
      
      if (checklistsError) throw checklistsError;

      if (checklistsData && checklistsData.length > 0) {
        const { data: itemsData, error: itemsError } = await supabase
          .from('checklist_items')
          .select('*')
          .in('checklist_id', checklistsData.map(c => c.id))
          .order('position', { ascending: true });
        
        if (itemsError) throw itemsError;

        const combined = checklistsData.map(cl => ({
          ...cl,
          items: itemsData?.filter(item => item.checklist_id === cl.id) || []
        }));
        
        setChecklists(combined);
      } else {
        setChecklists([]);
      }
    } catch (error: any) {
      console.error('Error fetching checklists:', error);
    }
  };

  // Subtasks calculation
  const subtasks = allCards?.filter(c => c.parent_id === card?.id) || [];
  const completedSubtasks = subtasks.filter(st => {
    const col = columns?.find(c => c.id === st.column_id);
    return col?.is_completed;
  });
  const subtasksProgress = subtasks.length > 0 ? (completedSubtasks.length / subtasks.length) * 100 : 0;

  const handleCreateSubtask = async () => {
    if (!newSubtaskTitle.trim() || !card || !columns?.length) return;
    try {
      setIsLoading(true);
      const targetColumnId = card.column_id;
      // Posiciona a sub-tarefa imediatamente abaixo do pai. Somamos a quantidade de sub-tarefas
      // atuais para que se você criar várias de uma vez, elas fiquem em cascata na ordem correta.
      const newPosition = card.position + subtasks.length + 1;
      
      const { error } = await supabase.from('cards').insert({
        project_id: projectId,
        column_id: targetColumnId,
        parent_id: card.id,
        title: newSubtaskTitle.trim(),
        priority: 'medium',
        position: newPosition
      });
      if (error) throw error;
      setNewSubtaskTitle('');
      onUpdate();
    } catch (error: any) {
      toast.error('Erro ao criar sub-tarefa');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      if (card) {
        const { error } = await supabase
          .from('cards')
          .update({
            title: data.title,
            description: data.description,
            priority: data.priority,
            due_date: data.due_date ? new Date(data.due_date).toISOString() : null,
            border_color: data.border_color || null,
          })
          .eq('id', card.id);

        if (error) throw error;
        toast.success('Cartão atualizado!');
      } else {
        if (!projectId || !data.column_id) {
          throw new Error('Projeto ou Coluna não definidos');
        }
        
        // Find position for new card
        const colCards = allCards.filter(c => c.column_id === data.column_id);
        const position = colCards.length > 0 ? colCards[colCards.length - 1].position + 1000 : 1000;

        const { data: newCard, error } = await supabase
          .from('cards')
          .insert({
            project_id: projectId,
            column_id: data.column_id,
            title: data.title,
            description: data.description,
            priority: data.priority,
            due_date: data.due_date ? new Date(data.due_date).toISOString() : null,
            border_color: data.border_color || null,
            position
          })
          .select()
          .single();

        if (error) throw error;
        
        // Insert tags and assignees
        if (localTags.length > 0) {
          await supabase.from('card_categories').insert(
            localTags.map(tag => ({ card_id: newCard.id, category_id: tag.id }))
          );
        }
        if (localAssignees.length > 0) {
          await supabase.from('card_assignees').insert(
            localAssignees.map(user => ({ card_id: newCard.id, user_id: user.id }))
          );
        }

        toast.success('Cartão criado!');
      }
      
      onUpdate();
      onClose();
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Excluir Cartão',
      message: 'Tem certeza que deseja excluir este cartão? Todas as informações dele serão perdidas.',
      onConfirm: async () => {
        setIsLoading(true);
        try {
          if (!card) return;
          const { error } = await supabase.from('cards').delete().eq('id', card.id);
          if (error) throw error;
          toast.success('Cartão excluído!');
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
          onUpdate();
          onClose();
        } catch (error: any) {
          toast.error('Erro ao excluir: ' + error.message);
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  const handleCreateChecklist = async () => {
    if (!card) return;
    try {
      const { data, error } = await supabase
        .from('checklists')
        .insert({ card_id: card.id, title: 'Checklist' })
        .select()
        .single();
      
      if (error) throw error;
      setChecklists([...checklists, { ...data, items: [] }]);
    } catch (error: any) {
      toast.error('Erro ao criar checklist: ' + error?.message);
    }
  };

  const handleAddItem = async (checklistId: string) => {
    if (!newItemText.trim()) return;
    
    const checklist = checklists.find(c => c.id === checklistId);
    const newPosition = checklist && checklist.items.length > 0 
      ? checklist.items[checklist.items.length - 1].position + 1000 
      : 1000;

    try {
      const { data, error } = await supabase
        .from('checklist_items')
        .insert({
          checklist_id: checklistId,
          text: newItemText.trim(),
          position: newPosition
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setChecklists(checklists.map(c => 
        c.id === checklistId 
          ? { ...c, items: [...c.items, data] }
          : c
      ));
      setNewItemText('');
    } catch (error: any) {
      toast.error('Erro ao adicionar item');
    }
  };

  const handleToggleItem = async (itemId: string, checked: boolean) => {
    // Optimistic
    setChecklists(checklists.map(c => ({
      ...c,
      items: c.items.map(i => i.id === itemId ? { ...i, checked } : i)
    })));

    try {
      const { error } = await supabase
        .from('checklist_items')
        .update({ checked })
        .eq('id', itemId);
      
      if (error) throw error;
    } catch (error: any) {
      toast.error('Erro ao atualizar item');
      fetchChecklists();
    }
  };

  const handleToggleTag = async (tag: Category) => {
    if (!card) {
      const isSelected = localTags.some(c => c.id === tag.id);
      if (isSelected) setLocalTags(prev => prev.filter(t => t.id !== tag.id));
      else setLocalTags(prev => [...prev, tag]);
      return;
    }
    try {
      const isSelected = localTags.some(c => c.id === tag.id);
      
      if (isSelected) {
        // Optimistic update
        setLocalTags(prev => prev.filter(t => t.id !== tag.id));
        // Remove
        await supabase
          .from('card_categories')
          .delete()
          .eq('card_id', card.id)
          .eq('category_id', tag.id);
      } else {
        // Optimistic update
        setLocalTags(prev => [...prev, tag]);
        // Add
        await supabase
          .from('card_categories')
          .insert({
            card_id: card.id,
            category_id: tag.id
          });
      }
      onUpdate(); // Reload to get updated tags on background
    } catch (error) {
      toast.error('Erro ao atualizar etiqueta');
    }
  };

  const handleToggleAssignee = async (profile: Profile) => {
    if (!card) {
      const isSelected = localAssignees.some(a => a.id === profile.id);
      if (isSelected) setLocalAssignees(prev => prev.filter(a => a.id !== profile.id));
      else setLocalAssignees(prev => [...prev, profile]);
      return;
    }
    try {
      const isSelected = localAssignees.some(a => a.id === profile.id);
      
      if (isSelected) {
        setLocalAssignees(prev => prev.filter(a => a.id !== profile.id));
        await supabase
          .from('card_assignees')
          .delete()
          .eq('card_id', card.id)
          .eq('user_id', profile.id);
          
        if (subtasks.length > 0) {
          await supabase
            .from('card_assignees')
            .delete()
            .in('card_id', subtasks.map(st => st.id))
            .eq('user_id', profile.id);
        }
      } else {
        setLocalAssignees(prev => [...prev, profile]);
        await supabase
          .from('card_assignees')
          .insert({
            card_id: card.id,
            user_id: profile.id
          });
          
        if (subtasks.length > 0) {
          const subtaskInserts = subtasks.map(st => ({
            card_id: st.id,
            user_id: profile.id
          }));
          const { error: upsertError } = await supabase
            .from('card_assignees')
            .upsert(subtaskInserts, { onConflict: 'card_id,user_id' });
            
          if (upsertError) {
            console.error("Upsert subtasks assignees error:", upsertError);
            // Fallback: try inserting one by one and ignoring conflicts
            for (const st of subtasks) {
              const { error: insertError } = await supabase.from('card_assignees').insert({
                card_id: st.id,
                user_id: profile.id
              });
              if (insertError && insertError.code !== '23505') {
                 console.error("Insert subtask assignee error:", insertError);
              }
            }
          }
        }
      }
      onUpdate();
    } catch (error: any) {
      console.error(error);
      toast.error('Erro ao atualizar responsável: ' + (error?.message || ''));
    }
  };

  const handleCreateTag = async (name: string, color: string) => {
    if (!projectId) return;
    try {
      // 1. Create Category
      const { data: newCategory, error: catError } = await supabase
        .from('categories')
        .insert({
          project_id: projectId,
          name,
          color
        })
        .select()
        .single();
        
      if (catError) throw catError;

      // Optimistic Update
      setLocalTags(prev => [...prev, newCategory]);

      // 2. Attach to card if it already exists
      if (card) {
        await supabase
          .from('card_categories')
          .insert({
            card_id: card.id,
            category_id: newCategory.id
          });
      }
        
      toast.success('Etiqueta criada!');
      onUpdate(); // Reload project data
    } catch (error: any) {
      toast.error('Erro ao criar etiqueta: ' + error?.message);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-card w-full max-w-3xl rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[90vh] relative z-10"
          >
            <div className="flex justify-between items-start p-6 border-b border-border/50 bg-muted/10">
              <div className="flex-1 pr-4">
                <input 
                  type="text"
                  {...register('title')}
                  readOnly={!canEdit}
                  className={`w-full text-2xl font-extrabold bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-lg px-3 py-1.5 -ml-3 text-foreground transition-all ${!canEdit ? 'pointer-events-none' : ''}`}
                />
              </div>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground hover:bg-muted p-1.5 rounded-full transition-colors flex-shrink-0">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar flex flex-col gap-8">
              <div className="flex flex-col md:flex-row gap-10">
                {/* Coluna Principal */}
                <div className="flex-1 space-y-8">
                {/* Descrição */}
                <div>
                  <div className="flex items-center gap-2 mb-3 text-foreground font-semibold">
                    <AlignLeft size={18} className="text-primary" />
                    <h3 className="text-lg">Descrição</h3>
                  </div>
                  <textarea
                    {...register('description')}
                    readOnly={!canEdit}
                    className={`w-full min-h-[140px] bg-background border border-border rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-y placeholder:text-muted-foreground ${!canEdit ? 'bg-muted/50 focus:ring-0 cursor-default pointer-events-none' : ''}`}
                    placeholder="Adicione uma descrição mais detalhada..."
                  />
                </div>

                {/* Checklist */}
                {card && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-foreground font-semibold">
                      <CheckSquare size={18} className="text-primary" />
                      <h3 className="text-lg">Checklist</h3>
                    </div>
                    {checklists.length === 0 && canEdit && (
                      <button 
                        onClick={handleCreateChecklist}
                        className="text-xs bg-muted hover:bg-border text-foreground px-3 py-1.5 rounded-md transition-colors font-semibold"
                      >
                        Adicionar
                      </button>
                    )}
                  </div>
                  
                  {checklists.length === 0 ? (
                    <div className="bg-muted border border-border border-dashed rounded-xl p-8 text-center text-muted-foreground text-sm flex flex-col items-center justify-center min-h-[120px]">
                      <p>Nenhuma tarefa adicionada.</p>
                      {canEdit && (
                        <button 
                          onClick={handleCreateChecklist}
                          className="mt-4 px-5 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary-hover transition-all active:scale-95"
                        >
                          Criar Checklist
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {checklists.map(checklist => (
                        <div key={checklist.id} className="space-y-3 bg-muted p-4 rounded-xl border border-border">
                          {/* Items List */}
                          <div className="space-y-1">
                            {checklist.items.map(item => (
                              <div key={item.id} className="flex items-start gap-3 group hover:bg-background p-2 rounded-lg transition-colors">
                                <input 
                                  type="checkbox"
                                  checked={item.checked}
                                  disabled={!canEdit}
                                  onChange={(e) => handleToggleItem(item.id, e.target.checked)}
                                  className={`w-4 h-4 mt-0.5 rounded border-border text-primary focus:ring-primary ${canEdit ? 'cursor-pointer' : 'cursor-default opacity-50'}`}
                                />
                                <span className={`text-sm flex-1 leading-relaxed ${item.checked ? 'line-through text-muted-foreground' : 'text-foreground font-medium'}`}>
                                  {item.text}
                                </span>
                                {canEdit && (
                                  <button className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive hover:text-destructive-foreground rounded-md transition-all">
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                          
                          {/* Add new item */}
                          {canEdit && (
                            <div className="flex items-center gap-2 mt-2">
                              <input 
                                type="text"
                              value={newItemText}
                              onChange={(e) => setNewItemText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddItem(checklist.id);
                              }}
                              placeholder="Adicionar um item..."
                              className="flex-1 text-sm bg-background border border-border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            />
                            <button 
                              onClick={() => handleAddItem(checklist.id)}
                              disabled={!newItemText.trim()}
                              className="p-2.5 bg-primary text-primary-foreground hover:bg-primary-hover rounded-lg disabled:opacity-50 transition-colors"
                            >
                              <Plus size={16} />
                            </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                )}
              </div>

              {/* Sidebar do Card */}
              <div className="w-full md:w-64 space-y-6 bg-muted p-5 rounded-xl border border-border h-fit">
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Atributos</h4>
                  
                  <div className="space-y-5">
                    {/* Status / Prioridade */}
                    <div className="relative">
                      <label className="flex items-center gap-2 text-xs font-semibold text-foreground mb-2">
                        <Flag size={14} className="text-muted-foreground" />
                        PRIORIDADE
                      </label>
                      <button
                        type="button"
                        disabled={!canEdit}
                        onClick={() => {
                          setIsPriorityOpen(!isPriorityOpen);
                          setIsAssigneeOpen(false);
                        }}
                        className={`w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all flex items-center justify-between shadow-sm ${!canEdit ? 'opacity-70 cursor-default' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          {priorityValue === 'low' && <><ArrowDownRight size={16} className="text-green-500" /> Baixa</>}
                          {priorityValue === 'medium' && <><ArrowRight size={16} className="text-blue-500" /> Média</>}
                          {priorityValue === 'high' && <><ArrowUpRight size={16} className="text-amber-500" /> Alta</>}
                          {priorityValue === 'urgent' && <><AlertCircle size={16} className="text-destructive" /> Urgente</>}
                        </div>
                        <ChevronDown size={16} className="text-muted-foreground" />
                      </button>

                      <AnimatePresence>
                        {isPriorityOpen && (
                          <motion.div 
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-xl overflow-hidden z-20"
                          >
                            <button
                              type="button"
                              onClick={() => { setValue('priority', 'low', { shouldDirty: true }); setIsPriorityOpen(false); }}
                              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted transition-colors text-left"
                            >
                              <ArrowDownRight size={16} className="text-green-500" /> Baixa
                            </button>
                            <button
                              type="button"
                              onClick={() => { setValue('priority', 'medium', { shouldDirty: true }); setIsPriorityOpen(false); }}
                              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted transition-colors text-left"
                            >
                              <ArrowRight size={16} className="text-blue-500" /> Média
                            </button>
                            <button
                              type="button"
                              onClick={() => { setValue('priority', 'high', { shouldDirty: true }); setIsPriorityOpen(false); }}
                              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted transition-colors text-left"
                            >
                              <ArrowUpRight size={16} className="text-amber-500" /> Alta
                            </button>
                            <button
                              type="button"
                              onClick={() => { setValue('priority', 'urgent', { shouldDirty: true }); setIsPriorityOpen(false); }}
                              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted transition-colors text-left"
                            >
                              <AlertCircle size={16} className="text-destructive" /> Urgente
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    
                    {/* Responsáveis */}
                    <div className="relative">
                      <label className="flex items-center gap-2 text-xs font-semibold text-foreground mb-2">
                        <Users size={14} className="text-muted-foreground" />
                        RESPONSÁVEIS
                      </label>
                      <button
                        type="button"
                        disabled={!canEdit}
                        onClick={() => {
                          setIsAssigneeOpen(!isAssigneeOpen);
                          setIsPriorityOpen(false);
                        }}
                        className={`w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all flex items-center justify-between shadow-sm min-h-[42px] ${!canEdit ? 'opacity-70 cursor-default' : ''}`}
                      >
                        <div className="flex flex-wrap gap-1">
                          {localAssignees.length === 0 ? (
                            <span className="text-muted-foreground font-normal">Nenhum</span>
                          ) : (
                            localAssignees.map(a => (
                              <img key={a.id} src={a.avatar_url || `https://ui-avatars.com/api/?name=${a.name || 'User'}`} alt={a.name || 'User'} className="w-6 h-6 rounded-full border border-border" title={a.name || 'User'} />
                            ))
                          )}
                        </div>
                        <ChevronDown size={16} className="text-muted-foreground ml-2" />
                      </button>

                      <AnimatePresence>
                        {isAssigneeOpen && (
                          <motion.div 
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-xl overflow-hidden z-20 max-h-[250px] overflow-y-auto custom-scrollbar"
                          >
                            {projectMembers.map(member => {
                              const isSelected = localAssignees.some(a => a.id === member.profiles.id);
                              return (
                                <button
                                  key={member.profiles.id}
                                  type="button"
                                  onClick={() => handleToggleAssignee(member.profiles)}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted transition-colors text-left"
                                >
                                  <div className="relative">
                                    <img src={member.profiles.avatar_url || `https://ui-avatars.com/api/?name=${member.profiles.name || 'User'}`} className="w-8 h-8 rounded-full" />
                                    {isSelected && (
                                      <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                                        <CheckSquare size={10} />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-foreground">{member.profiles.name}</span>
                                    <span className="text-xs text-muted-foreground">{member.job_title || member.permission}</span>
                                  </div>
                                </button>
                              );
                            })}
                            {projectMembers.length === 0 && (
                               <div className="p-3 text-sm text-muted-foreground text-center">Nenhum membro no projeto</div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Prazo */}
                    <div>
                      <label className="flex items-center gap-2 text-xs font-semibold text-foreground mb-2">
                        <Clock size={14} className="text-muted-foreground" />
                        PRAZO
                      </label>
                      <input 
                        type="datetime-local"
                        {...register('due_date')}
                        readOnly={!canEdit}
                        className={`w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${!canEdit ? 'pointer-events-none opacity-70' : 'cursor-pointer'}`}
                      />
                    </div>
                    
                    {/* Categorias */}
                    <div>
                      <label className="flex items-center gap-2 text-xs font-semibold text-foreground mb-2">
                        <Tag size={14} className="text-muted-foreground" />
                        ETIQUETAS
                      </label>
                      <TagSelector 
                        selectedTags={localTags}
                        projectTags={projectCategories}
                        onToggleTag={handleToggleTag}
                        onCreateTag={handleCreateTag}
                        canEdit={canEdit}
                      />
                    </div>

                  </div>
                </div>
              </div>
            </div>
              
            {/* Sub-tarefas (Full Width Bottom) */}
            {card && (
            <div className="w-full mt-2 pt-6 border-t border-border/50">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2 text-foreground font-semibold">
                    <ListTree size={20} className="text-primary" />
                    <h3 className="text-lg">Sub-tarefas (Cartões Filhos)</h3>
                  </div>
                </div>
                
                {subtasks.length > 0 && (
                  <div className="mb-6 max-w-2xl">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Progresso ({completedSubtasks.length}/{subtasks.length})</span>
                      <span>{Math.round(subtasksProgress)}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden shadow-inner">
                      <div 
                        className="h-full bg-primary transition-all duration-500 ease-out"
                        style={{ width: `${subtasksProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                  {subtasks.map(st => {
                    const col = columns.find(c => c.id === st.column_id);
                    const isStCompleted = col?.is_completed;
                    return (
                      <div key={st.id} className="flex items-start gap-3 p-3.5 bg-card rounded-xl border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all group">
                        <input 
                          type="checkbox"
                          checked={isStCompleted || false}
                          readOnly
                          className="w-4 h-4 mt-0.5 rounded border-border text-primary cursor-default"
                        />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className={`text-sm leading-tight truncate ${isStCompleted ? 'line-through text-muted-foreground' : 'text-foreground font-medium'}`} title={st.title}>
                            {st.title}
                          </span>
                          <span className="text-[10px] mt-1.5 px-2 py-0.5 bg-muted rounded-md text-muted-foreground w-fit font-medium">
                            {col?.title}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {canEdit && (
                  <div className="flex items-center gap-2 max-w-2xl mt-4">
                    <input 
                      type="text"
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateSubtask();
                      }}
                      placeholder="Adicionar um novo cartão filho..."
                      className="flex-1 text-sm bg-muted/50 hover:bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-background transition-all shadow-sm"
                    />
                    <button 
                      onClick={handleCreateSubtask}
                      disabled={!newSubtaskTitle.trim() || isLoading}
                      className="p-3 bg-primary text-primary-foreground hover:bg-primary-hover rounded-xl shadow-sm disabled:opacity-50 transition-colors active:scale-95"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                )}
              </div>
            )}
            </div>
            
            {/* Ações (Sticky Footer) */}
            {canEdit && (
              <div className="px-6 py-4 border-t border-border/50 bg-card flex flex-col sm:flex-row justify-end gap-3 shrink-0">
                {card && (
                  <button 
                    onClick={handleDelete}
                    disabled={isLoading}
                    className="bg-destructive text-destructive-foreground hover:bg-red-700 font-semibold rounded-lg px-6 py-2.5 text-sm transition-all active:scale-95 shadow-md w-full sm:w-auto"
                  >
                    Excluir Cartão
                  </button>
                )}
                <input type="hidden" {...register('column_id')} />
                <button 
                  onClick={handleSubmit(onSubmit)}
                  disabled={isLoading}
                  className="bg-primary text-primary-foreground font-semibold rounded-lg px-8 py-2.5 text-sm hover:bg-primary-hover shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 w-full sm:w-auto"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Salvar Alterações'}
                </button>
              </div>
            )}
          </motion.div>
          <ConfirmModal
            isOpen={confirmConfig.isOpen}
            title={confirmConfig.title}
            message={confirmConfig.message}
            onConfirm={confirmConfig.onConfirm}
            onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
          />
        </div>
      )}
    </AnimatePresence>
  );
}
