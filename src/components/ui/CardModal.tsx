import { useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase';
import type { KanbanCardType } from '@/types/kanban';
import { Clock, CheckSquare, Trash2, Tag, Loader2, ArrowRight, X, AlignLeft, Plus, Flag, ChevronDown, ArrowDownRight, ArrowUpRight, AlertCircle, Users, ListTree, CheckCircle2, Pencil } from 'lucide-react';
import { queueMutation, isNetworkError } from '@/lib/offlineSync';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { CardComments } from '@/components/kanban/CardComments';

import { TagSelector } from '@/components/ui/TagSelector';
import type { Category, Profile } from '@/types/database';
import { NotificationService } from '@/services/notifications/notificationService';
import type { ProjectMember } from '@/hooks/useProjectQuery';

interface CardModalProps {
  card: KanbanCardType | null;
  isOpen: boolean;
  initialDate?: Date;
  initialColumnId?: string;
  onClose: () => void;
  onUpdate: () => void;
  onOptimisticDelete?: (cardId: string) => void;
  onCardSave?: (cardId: string) => void;
  onPriorityChange?: (cardId: string) => void;
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

export function CardModal({ card, isOpen, onClose, onUpdate, onOptimisticDelete, onCardSave, onPriorityChange, projectCategories = [], projectMembers = [], projectId, canEdit = true, allCards = [], columns = [], initialDate, initialColumnId }: CardModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [localTags, setLocalTags] = useState<Category[]>([]);
  const [localAssignees, setLocalAssignees] = useState<Profile[]>([]);
  const [newItemText, setNewItemText] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [isAssigneeOpen, setIsAssigneeOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    variant?: 'danger' | 'primary';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    confirmText: 'Excluir',
    variant: 'danger'
  });
  
  const { register, reset, setValue, watch } = useForm({
    defaultValues: {
      title: '',
      description: '',
        priority: 'medium',
        due_date: initialDate ? toLocalDatetimeString(initialDate) : '',
        external_link: '',
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
        external_link: card.external_link || '',
        border_color: card.border_color || '',
      });
      setLocalTags(card.categories || []);
      setLocalAssignees(card.assignees || []);
      setIsAssigneeOpen(false);
      setIsPriorityOpen(false);
      fetchChecklists();

      // Foco automático na descrição quando o modal é aberto ou um cartão é selecionado
      setTimeout(() => {
        descriptionRef.current?.focus();
      }, 300);
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

  const saveCardRef = useRef<(data: any) => void>(() => {});

  const saveCard = useCallback(async (data: any) => {
    if (!card) return;
    setSaveStatus('saving');
    const sanitizedDescription = (data.description || '').trimEnd();
    try {
      const { error } = await supabase
        .from('cards')
        .update({
          title: data.title,
          description: sanitizedDescription,
          priority: data.priority,
          due_date: data.due_date ? new Date(data.due_date).toISOString() : null,
          external_link: data.external_link || null,
          border_color: data.border_color || null,
        })
        .eq('id', card.id);

      if (error) throw error;

      if (data.due_date) {
        NotificationService.scheduleTaskReminder(card.id, data.title, data.due_date);
      } else {
        NotificationService.cancelTaskReminder(card.id);
      }

      if (card.priority !== data.priority && onPriorityChange) {
        onPriorityChange(card.id);
      }

      onUpdate();
      if (onCardSave) onCardSave(card.id);
      setSaveStatus('saved');
    } catch (error: any) {
      if (isNetworkError(error)) {
        queueMutation('cards', 'update', {
          title: data.title,
          description: sanitizedDescription,
          priority: data.priority,
          due_date: data.due_date ? new Date(data.due_date).toISOString() : null,
          external_link: data.external_link || null,
          border_color: data.border_color || null,
        }, { id: card.id });
        setSaveStatus('saved');
      } else {
        setSaveStatus('idle');
      }
    }
  }, [card, onUpdate, onCardSave, onPriorityChange]);

  saveCardRef.current = saveCard;

  useEffect(() => {
    if (!card || !canEdit) return;
    let debounceTimer: ReturnType<typeof setTimeout>;
    const subscription = watch((data) => {
      setSaveStatus('idle');
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        saveCardRef.current(data);
      }, 500);
    });
    return () => {
      clearTimeout(debounceTimer);
      subscription.unsubscribe();
    };
  }, [card, canEdit, watch]);

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
      if (isNetworkError(error)) {
        queueMutation('cards', 'insert', {
          project_id: projectId,
          column_id: card.column_id,
          parent_id: card.id,
          title: newSubtaskTitle.trim(),
          priority: 'medium',
          position: card.position + subtasks.length + 1
        });
        toast.success('Modo Offline: Subtarefa guardada.');
        setNewSubtaskTitle('');
        onUpdate();
      } else {
        toast.error('Erro ao criar sub-tarefa');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSubtask = (subtaskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmConfig({
      isOpen: true,
      title: 'Excluir Sub-tarefa',
      message: 'Tem certeza que deseja excluir esta sub-tarefa? Essa ação não pode ser desfeita.',
      onConfirm: async () => {
        try {
          setIsLoading(true);
          const { error } = await supabase.from('cards').delete().eq('id', subtaskId);
          if (error) throw error;
          toast.success('Sub-tarefa excluída com sucesso');
          onUpdate();
        } catch (error) {
          if (isNetworkError(error)) {
            queueMutation('cards', 'delete', null, { id: subtaskId });
            toast.success('Modo Offline: Deleção agendada.');
            onUpdate();
          } else {
            toast.error('Erro ao excluir sub-tarefa');
          }
        } finally {
          setIsLoading(false);
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        }
      },
      confirmText: 'Excluir',
      variant: 'danger'
    });
  };

  if (!isOpen) return null;


  const handleDelete = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Excluir Cartão',
      message: 'Tem certeza que deseja excluir este cartão? Todas as informações dele serão perdidas.',
      onConfirm: async () => {
        setIsLoading(true);
        try {
          if (!card) return;
          
          // Otimização: Deleção imediata
          if (onOptimisticDelete) {
            onOptimisticDelete(card.id);
          }
          
          const { error } = await supabase.from('cards').delete().eq('id', card.id);
          if (error) throw error;
          
          toast.success('Cartão excluído!');
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
          onClose();
          onUpdate();
        } catch (error: any) {
          if (isNetworkError(error)) {
            queueMutation('cards', 'delete', null, { id: card!.id });
            toast.success('Modo Offline: Deleção agendada.');
            setConfirmConfig(prev => ({ ...prev, isOpen: false }));
            onClose();
            onUpdate();
          } else {
            toast.error('Erro ao excluir: ' + error.message);
          }
        } finally {
          setIsLoading(false);
        }
      },
      confirmText: 'Excluir',
      variant: 'danger'
    });
  };

  const handleCreateChecklist = async () => {
    if (!card) return;
    setSaveStatus('saving');
    try {
      const { data, error } = await supabase
        .from('checklists')
        .insert({ card_id: card.id, title: 'Checklist' })
        .select()
        .single();
      
      if (error) throw error;
      setChecklists([...checklists, { ...data, items: [] }]);
      setSaveStatus('saved');
    } catch (error: any) {
      setSaveStatus('idle');
      toast.error('Erro ao criar checklist: ' + error?.message);
    }
  };

  const handleAddItem = async (checklistId: string) => {
    if (!newItemText.trim()) return;
    
    const checklist = checklists.find(c => c.id === checklistId);
    const newPosition = checklist && checklist.items.length > 0 
      ? checklist.items[checklist.items.length - 1].position + 1000 
      : 1000;

    setSaveStatus('saving');
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
      setSaveStatus('saved');
    } catch (error: any) {
      setSaveStatus('idle');
      toast.error('Erro ao adicionar item');
    }
  };

  const handleToggleItem = async (itemId: string, checked: boolean) => {
    setChecklists(checklists.map(c => ({
      ...c,
      items: c.items.map(i => i.id === itemId ? { ...i, checked } : i)
    })));

    setSaveStatus('saving');
    try {
      const { error } = await supabase
        .from('checklist_items')
        .update({ checked })
        .eq('id', itemId);
      
      if (error) throw error;
      setSaveStatus('saved');
    } catch (error: any) {
      setSaveStatus('idle');
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
    setSaveStatus('saving');
    try {
      const isSelected = localTags.some(c => c.id === tag.id);
      
      if (isSelected) {
        setLocalTags(prev => prev.filter(t => t.id !== tag.id));
        await supabase
          .from('card_categories')
          .delete()
          .eq('card_id', card.id)
          .eq('category_id', tag.id);
      } else {
        setLocalTags(prev => [...prev, tag]);
        await supabase
          .from('card_categories')
          .insert({
            card_id: card.id,
            category_id: tag.id
          });
      }
      onUpdate();
      setSaveStatus('saved');
    } catch (error) {
      setSaveStatus('idle');
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
    setSaveStatus('saving');
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
      setSaveStatus('saved');
    } catch (error: any) {
      setSaveStatus('idle');
      toast.error('Erro ao atualizar responsável: ' + (error?.message || ''));
    }
  };

  const handleCreateTag = async (name: string, color: string) => {
    if (!projectId) return;
    setSaveStatus('saving');
    try {
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

      setLocalTags(prev => [...prev, newCategory]);

      if (card) {
        await supabase
          .from('card_categories')
          .insert({
            card_id: card.id,
            category_id: newCategory.id
          });
      }
        
      toast.success('Etiqueta criada!');
      onUpdate();
      setSaveStatus('saved');
    } catch (error: any) {
      setSaveStatus('idle');
      toast.error('Erro ao criar etiqueta: ' + error?.message);
    }
  };

  const handleDeleteTag = async (tag: Category) => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', tag.id);

      if (error) throw error;

      setLocalTags(prev => prev.filter(t => t.id !== tag.id));
      toast.success('Etiqueta excluída!');
      onUpdate();
    } catch (error: any) {
      toast.error('Erro ao excluir etiqueta: ' + error?.message);
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
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
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
              <div className="flex-1 pr-4 flex items-center gap-2">
                {canEdit && (
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setIsEditingTitle(true);
                      requestAnimationFrame(() => {
                        titleInputRef.current?.focus();
                        titleInputRef.current?.select();
                      });
                    }}
                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-2"
                    title="Editar título"
                  >
                    <Pencil size={16} />
                  </button>
                )}
                {(() => {
                  const { ref: registerRef, ...registerProps } = register('title');
                  return (
                    <input 
                      ref={(node) => {
                        if (typeof registerRef === 'function') registerRef(node);
                        else if (registerRef) (registerRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
                        titleInputRef.current = node;
                      }}
                      type="text"
                      {...registerProps}
                      readOnly={!canEdit || !isEditingTitle}
                      className="w-full text-2xl font-extrabold bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-lg px-3 py-1.5 -ml-3 text-foreground transition-all"
                    />
                  );
                })()}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={onClose} className="text-muted-foreground hover:text-foreground hover:bg-muted p-1.5 rounded-full transition-colors flex-shrink-0">
                  <X size={20} />
                </button>
              </div>
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
                    {...(() => {
                      const { ref, ...rest } = register('description');
                      return {
                        ...rest,
                        ref: (e: HTMLTextAreaElement | null) => {
                          ref(e);
                          descriptionRef.current = e;
                        }
                      };
                    })()}
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
                                  <button
                                    onClick={async () => {
                                      try {
                                        const { error } = await supabase.from('checklist_items').delete().eq('id', item.id);
                                        if (error) throw error;
                                        setChecklists(checklists.map(c => ({
                                          ...c,
                                          items: c.items.filter(i => i.id !== item.id)
                                        })));
                                      } catch {
                                        toast.error('Erro ao excluir item');
                                      }
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive hover:text-destructive-foreground rounded-md transition-all"
                                  >
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
                
                {/* Comentários e Atividades */}
                {card && <CardComments cardId={card.id} canEdit={canEdit} />}
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
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsPriorityOpen(false)} />
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
                          </>
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
                              <div key={a.id} className="flex items-center gap-1.5 bg-muted px-2 py-1 rounded-full">
                                <img src={a.avatar_url || `https://ui-avatars.com/api/?name=${a.name || 'User'}`} alt={a.name || 'User'} className="w-4 h-4 rounded-full border border-border" title={a.name || 'User'} />
                                <span className="text-xs font-medium truncate max-w-[100px]">{a.name}</span>
                              </div>
                            ))
                          )}
                        </div>
                        <ChevronDown size={16} className="text-muted-foreground ml-2 shrink-0" />
                      </button>

                      <AnimatePresence>
                        {isAssigneeOpen && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsAssigneeOpen(false)} />
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
                          </>
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
                    
                    {/* Link Externo */}
                    <div>
                      <label className="flex items-center gap-2 text-xs font-semibold text-foreground mb-2">
                        <div className="p-1 rounded-full bg-primary/10">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                        </div>
                        LINK EXTERNO
                      </label>
                      <div className="flex gap-2">
                        <input 
                          type="url"
                          {...register('external_link')}
                          readOnly={!canEdit}
                          placeholder="https://..."
                          className={`flex-1 bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${!canEdit ? 'pointer-events-none opacity-70' : ''}`}
                        />
                        {watch('external_link') && (
                          <a 
                            href={watch('external_link')} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-2.5 bg-muted rounded-lg hover:bg-border transition-colors flex-shrink-0"
                          >
                             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                          </a>
                        )}
                      </div>
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
                        onDeleteTag={handleDeleteTag}
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
                        {canEdit && (
                          <button
                            onClick={(e) => handleDeleteSubtask(st.id, e)}
                            className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="Excluir sub-tarefa"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
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
              <div className="px-5 py-3.5 border-t border-border/50 bg-card flex items-center justify-between shrink-0">
                <input type="hidden" {...register('column_id')} />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {saveStatus === 'saving' && (
                    <>
                      <Loader2 size={14} className="animate-spin text-primary" />
                      <span>Salvando...</span>
                    </>
                  )}
                  {saveStatus === 'saved' && (
                    <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                      <CheckCircle2 size={14} />
                      Salvo
                    </span>
                  )}
                </div>
                {card && (
                  <button 
                    onClick={handleDelete}
                    disabled={isLoading}
                    className="flex items-center gap-2 text-sm text-destructive hover:bg-destructive/10 font-medium rounded-lg px-4 py-2 transition-all"
                  >
                    <Trash2 size={14} />
                    Excluir
                  </button>
                )}
              </div>
            )}
          </motion.div>
          <ConfirmModal
            isOpen={confirmConfig.isOpen}
            title={confirmConfig.title}
            message={confirmConfig.message}
            onConfirm={confirmConfig.onConfirm}
            onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
            confirmText={confirmConfig.confirmText}
            variant={confirmConfig.variant}
          />
        </div>
      )}
    </AnimatePresence>
  );
}
