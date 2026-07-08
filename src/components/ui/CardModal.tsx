import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase';
import type { KanbanCardType } from '@/types/kanban';
import { X, AlignLeft, CheckSquare, Clock, Tag, Flag, Loader2, Plus, Trash2, ChevronDown, ArrowDownRight, ArrowRight, ArrowUpRight, AlertCircle, Users } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

import { TagSelector } from '@/components/ui/TagSelector';
import type { Category, Profile } from '@/types/database';
import type { ProjectMember } from '@/hooks/useProjectQuery';

interface CardModalProps {
  card: KanbanCardType | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  projectCategories?: Category[];
  projectMembers?: ProjectMember[];
  projectId?: string;
  canEdit?: boolean;
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

export function CardModal({ card, isOpen, onClose, onUpdate, projectCategories = [], projectMembers = [], projectId, canEdit = true }: CardModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [localTags, setLocalTags] = useState<Category[]>([]);
  const [localAssignees, setLocalAssignees] = useState<Profile[]>([]);
  const [newItemText, setNewItemText] = useState('');
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
      due_date: '',
      border_color: '',
    }
  });

  const priorityValue = watch('priority');
  const borderColorValue = watch('border_color');

  const CARD_COLORS = [
    { value: '', label: 'Padrão' },
    { value: '#ef4444', label: 'Vermelho' },
    { value: '#f97316', label: 'Laranja' },
    { value: '#eab308', label: 'Amarelo' },
    { value: '#22c55e', label: 'Verde' },
    { value: '#3b82f6', label: 'Azul' },
    { value: '#8b5cf6', label: 'Roxo' },
    { value: '#ec4899', label: 'Rosa' },
  ];

  useEffect(() => {
    if (card) {
      reset({
        title: card.title,
        description: card.description || '',
        priority: card.priority,
        due_date: card.due_date ? new Date(card.due_date).toISOString().split('T')[0] : '',
        border_color: card.border_color || '',
      });
      setLocalTags(card.categories || []);
      setLocalAssignees(card.assignees || []);
      fetchChecklists();
    }
  }, [card, reset]);

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

  if (!isOpen || !card) return null;

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
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
      onUpdate();
      onClose();
    } catch (error: any) {
      toast.error('Erro ao atualizar: ' + error.message);
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
    try {
      const { data, error } = await supabase
        .from('checklists')
        .insert({ card_id: card.id, title: 'Checklist' })
        .select()
        .single();
      
      if (error) throw error;
      setChecklists([...checklists, { ...data, items: [] }]);
    } catch (error: any) {
      toast.error('Erro ao criar checklist');
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
    if (!card) return;
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
    if (!card) return;
    try {
      const isSelected = localAssignees.some(a => a.id === profile.id);
      
      if (isSelected) {
        setLocalAssignees(prev => prev.filter(a => a.id !== profile.id));
        await supabase
          .from('card_assignees')
          .delete()
          .eq('card_id', card.id)
          .eq('user_id', profile.id);
      } else {
        setLocalAssignees(prev => [...prev, profile]);
        await supabase
          .from('card_assignees')
          .insert({
            card_id: card.id,
            user_id: profile.id
          });
      }
      onUpdate();
    } catch (error) {
      toast.error('Erro ao atualizar responsável');
    }
  };

  const handleCreateTag = async (name: string, color: string) => {
    if (!card || !projectId) return;
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

      // 2. Attach to card
      await supabase
        .from('card_categories')
        .insert({
          card_id: card.id,
          category_id: newCategory.id
        });
        
      toast.success('Etiqueta criada!');
      onUpdate(); // Reload project data
    } catch (error) {
      toast.error('Erro ao criar etiqueta');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && card && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar flex flex-col md:flex-row gap-10">
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
                        onClick={() => setIsPriorityOpen(!isPriorityOpen)}
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
                        onClick={() => setIsAssigneeOpen(!isAssigneeOpen)}
                        className={`w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all flex items-center justify-between shadow-sm min-h-[42px] ${!canEdit ? 'opacity-70 cursor-default' : ''}`}
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
                        type="date"
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
                    
                    {/* Cor do Cartão */}
                    <div>
                      <label className="flex items-center gap-2 text-xs font-semibold text-foreground mb-2">
                        <div className="w-3.5 h-3.5 rounded-full border border-border" style={{ backgroundColor: borderColorValue || 'transparent' }}></div>
                        COR DO CARTÃO
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {CARD_COLORS.map(color => (
                          <button
                            key={color.value}
                            type="button"
                            disabled={!canEdit}
                            onClick={() => setValue('border_color', color.value, { shouldDirty: true })}
                            className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${borderColorValue === color.value ? 'border-primary scale-110 shadow-sm' : 'border-transparent hover:scale-110'} ${!canEdit ? 'pointer-events-none' : ''}`}
                            style={{ backgroundColor: color.value || 'var(--card)' }}
                            title={color.label}
                          >
                            {!color.value && <X size={12} className="text-muted-foreground" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                
                {canEdit && (
                  <>
                    <hr className="border-border" />

                    <div>
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Ações</h4>
                      <button 
                        onClick={handleSubmit(onSubmit)}
                        disabled={isLoading}
                        className="w-full bg-primary text-primary-foreground font-semibold rounded-lg px-4 py-3 text-sm hover:bg-primary-hover shadow-md transition-all flex items-center justify-center gap-2 mb-3 active:scale-95"
                      >
                        {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Salvar Alterações'}
                      </button>
                      <button 
                        onClick={handleDelete}
                        disabled={isLoading}
                        className="w-full bg-destructive text-destructive-foreground hover:bg-red-700 font-semibold rounded-lg px-4 py-2.5 text-sm transition-all active:scale-95 shadow-md"
                      >
                        Excluir Cartão
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
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
