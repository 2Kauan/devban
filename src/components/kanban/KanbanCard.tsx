import { forwardRef, useEffect, useRef, memo, useCallback, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { KanbanCardType, KanbanColumnType } from '@/types/kanban';
import { Clock, ArrowDownRight, ArrowRight, ArrowUpRight, AlertCircle, ChevronLeft, ChevronRight, ListTree, MessageSquare, ChevronDown, ChevronUp, CheckSquare, Square, Plus, Loader2, Calendar, CheckCircle2, User, Pencil, Trash2, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface KanbanCardProps {
  card: KanbanCardType;
  onClick: (card: KanbanCardType) => void;
  isOverlay?: boolean;
  onMoveMobile?: (cardId: string, direction: 'left' | 'right') => void;
  canMoveLeft?: boolean;
  canMoveRight?: boolean;
  columnColor?: string | null;
  isCompleted?: boolean;
  subtasksProgress?: number;
  isSelected?: boolean;
  onToggleSelect?: (cardId: string) => void;
  selectionCount?: number; // Used only in overlay to show stack count
  isBulkDragging?: boolean;
  allCards?: KanbanCardType[];
  allColumns?: KanbanColumnType[];
  onCardMove?: (cardId: string, sourceColumnId: string, destColumnId: string) => void;
  onCardsChange?: (cards: KanbanCardType[]) => void;
}

export const KanbanCardInner = forwardRef<HTMLDivElement, KanbanCardProps>(
  ({ card, onClick, isOverlay, onMoveMobile, canMoveLeft, canMoveRight, columnColor, isCompleted, subtasksProgress, isSelected, onToggleSelect, selectionCount, isBulkDragging, allCards = [], allColumns = [], onCardMove, onCardsChange }, ref) => {
    const localRef = useRef<HTMLDivElement | null>(null);
    const itemInputRef = useRef<HTMLInputElement | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [checklists, setChecklists] = useState<{ id: string; title: string; items: { id: string; text: string; checked: boolean; position: number }[] }[]>([]);
    const [isLoadingChecklists, setIsLoadingChecklists] = useState(false);
    const [newItemText, setNewItemText] = useState('');
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [editingItemText, setEditingItemText] = useState('');

    const fetchChecklists = useCallback(async () => {
      if (!card?.id) return;
      setIsLoadingChecklists(true);
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
      } catch (error) {
        console.error('Error fetching card checklists:', error);
      } finally {
        setIsLoadingChecklists(false);
      }
    }, [card?.id]);

    useEffect(() => {
      if (isExpanded) {
        fetchChecklists();
      }
    }, [isExpanded, fetchChecklists]);

    const handleToggleItem = async (itemId: string, currentChecked: boolean, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const newChecked = !currentChecked;

      // Optimistic UI update
      setChecklists(prev => prev.map(c => ({
        ...c,
        items: c.items.map(item => item.id === itemId ? { ...item, checked: newChecked } : item)
      })));

      try {
        const { error } = await supabase
          .from('checklist_items')
          .update({ checked: newChecked })
          .eq('id', itemId);

        if (error) throw error;
      } catch (error) {
        console.error('Error updating checklist item:', error);
        toast.error('Erro ao atualizar item do checklist');
        fetchChecklists();
      }
    };

    const handleDeleteItem = async (itemId: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Optimistic delete
      setChecklists(prev => prev.map(c => ({
        ...c,
        items: c.items.filter(i => i.id !== itemId)
      })));

      try {
        const { error } = await supabase
          .from('checklist_items')
          .delete()
          .eq('id', itemId);

        if (error) throw error;
        toast.success('Especificação excluída');
      } catch (error) {
        console.error('Error deleting checklist item:', error);
        toast.error('Erro ao excluir especificação');
        fetchChecklists();
      }
    };

    const handleSaveItemEdit = async (itemId: string, e: React.FormEvent | React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!editingItemText.trim()) return;
      const newText = editingItemText.trim();
      setEditingItemId(null);

      // Optimistic update
      setChecklists(prev => prev.map(c => ({
        ...c,
        items: c.items.map(i => i.id === itemId ? { ...i, text: newText } : i)
      })));

      try {
        const { error } = await supabase
          .from('checklist_items')
          .update({ text: newText })
          .eq('id', itemId);

        if (error) throw error;
      } catch (error) {
        console.error('Error updating item text:', error);
        toast.error('Erro ao salvar alteração');
        fetchChecklists();
      }
    };

    // Subtasks e automação de movimentação de coluna
    const subtasks = allCards.filter(c => c.parent_id === card.id);

    const handleToggleSubtask = async (subtask: KanbanCardType, currentlyCompleted: boolean, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      let targetColumn: KanbanColumnType | undefined;
      if (!currentlyCompleted) {
        // Mover para a coluna de concluídos
        targetColumn = allColumns.find(c => c.is_completed) || allColumns[allColumns.length - 1];
      } else {
        // Mover para a primeira coluna ou para a mesma coluna do pai (se não for concluída)
        targetColumn = allColumns.find(c => c.id === card.column_id && !c.is_completed) || allColumns.find(c => !c.is_completed) || allColumns[0];
      }

      if (!targetColumn) return;

      const sourceColId = subtask.column_id;
      const destColId = targetColumn.id;

      // Atualização otimista
      if (onCardsChange && allCards.length > 0) {
        const updatedCards = allCards.map(c => c.id === subtask.id ? { ...c, column_id: destColId } : c);
        onCardsChange(updatedCards);
      }

      try {
        const { error } = await supabase
          .from('cards')
          .update({ column_id: destColId })
          .eq('id', subtask.id);

        if (error) throw error;

        if (onCardMove) {
          onCardMove(subtask.id, sourceColId, destColId);
        }

        toast.success(
          !currentlyCompleted 
            ? `Sub-tarefa movida para "${targetColumn.title}"!` 
            : `Sub-tarefa reaberta em "${targetColumn.title}"`
        );
      } catch (error) {
        console.error('Erro ao mover sub-tarefa:', error);
        toast.error('Erro ao atualizar sub-tarefa');
      }
    };

    const handleAddItem = async (checklistId: string, e: React.FormEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!newItemText.trim()) return;

      const checklist = checklists.find(c => c.id === checklistId);
      const newPosition = checklist && checklist.items.length > 0
        ? checklist.items[checklist.items.length - 1].position + 1000
        : 1000;

      const textToSave = newItemText.trim();
      setNewItemText('');

      // Foco automático mantido no campo de texto para continuar digitando novos itens rapidamente
      setTimeout(() => {
        itemInputRef.current?.focus();
      }, 10);

      try {
        const { data, error } = await supabase
          .from('checklist_items')
          .insert({
            checklist_id: checklistId,
            text: textToSave,
            position: newPosition
          })
          .select()
          .single();

        if (error) throw error;

        setChecklists(prev => prev.map(c => 
          c.id === checklistId 
            ? { ...c, items: [...c.items, data] }
            : c
        ));
      } catch (error) {
        console.error('Error adding item:', error);
        toast.error('Erro ao adicionar item');
      }
    };

    const handleCreateInitialChecklist = async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        const { data, error } = await supabase
          .from('checklists')
          .insert({ card_id: card.id, title: 'Especificações / Checklist' })
          .select()
          .single();

        if (error) throw error;
        setChecklists([{ ...data, items: [] }]);
        setTimeout(() => {
          itemInputRef.current?.focus();
        }, 100);
      } catch (error) {
        console.error('Error creating checklist:', error);
        toast.error('Erro ao criar checklist');
      }
    };

    // Cálculos detalhados de prazo e data de criação
    const getDueDateBadge = () => {
      if (!card.due_date) return null;
      if (isCompleted) {
        return { text: 'Concluído', color: 'text-green-600 bg-green-500/10 border-green-500/20' };
      }
      const due = new Date(card.due_date);
      const now = new Date();
      const diffMs = due.getTime() - now.getTime();
      const diffHours = Math.round(diffMs / (1000 * 60 * 60));

      if (diffMs < 0) {
        const absHours = Math.abs(diffHours);
        if (absHours < 24) return { text: `Atrasado há ${absHours}h`, color: 'text-destructive bg-destructive/10 border-destructive/20 font-semibold' };
        const absDays = Math.floor(absHours / 24);
        return { text: `Atrasado há ${absDays}d`, color: 'text-destructive bg-destructive/10 border-destructive/20 font-semibold' };
      }

      if (diffHours <= 24) {
        return { text: `Expira em ${diffHours}h`, color: 'text-amber-600 bg-amber-500/10 border-amber-500/20 font-medium' };
      }

      const diffDays = Math.ceil(diffHours / 24);
      return { text: `Expira em ${diffDays}d`, color: 'text-blue-600 bg-blue-500/10 border-blue-500/20' };
    };

    const getCreatedDateFormatted = () => {
      if (!card.created_at) return null;
      const d = new Date(card.created_at);
      if (isNaN(d.getTime())) return null;
      const now = new Date();
      const diffHours = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60));
      if (diffHours < 1) return 'Criado recentemente';
      if (diffHours < 24) return `Criado há ${diffHours}h`;
      const diffDays = Math.floor(diffHours / 24);
      return `Criado há ${diffDays}d (${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })})`;
    };

    const dueDateBadge = getDueDateBadge();
    const createdText = getCreatedDateFormatted();

    useEffect(() => {
      if (!isOverlay) return;
      let frame: number;
      let currentRotate = 0;
      let smoothVelocityX = 0;
      let smoothVelocityY = 0;
      let lastX = 0;
      let lastY = 0;
      let lastTime = 0;
      let currentScale = 1.04;

      const loop = (time: number) => {
        if (localRef.current) {
          const rect = localRef.current.getBoundingClientRect();
          if (lastTime > 0) {
            const dt = time - lastTime;
            if (dt > 0) {
              const dx = rect.x - lastX;
              const dy = rect.y - lastY;
              const rawVelX = dx / dt;
              const rawVelY = dy / dt;

              smoothVelocityX += (rawVelX - smoothVelocityX) * 0.25;
              smoothVelocityY += (rawVelY - smoothVelocityY) * 0.2;

              const targetRotate = Math.max(-12, Math.min(12, smoothVelocityX * 12));
              currentRotate += (targetRotate - currentRotate) * 0.35;

              const speed = Math.sqrt(smoothVelocityX ** 2 + smoothVelocityY ** 2);
              const targetScale = 1.04 + Math.min(speed * 0.03, 0.04);
              currentScale += (targetScale - currentScale) * 0.3;

              localRef.current.style.transform = `rotate(${currentRotate}deg) scale(${currentScale})`;
            }
          } else {
            localRef.current.style.transform = `rotate(0deg) scale(1.04)`;
          }
          lastX = rect.x;
          lastY = rect.y;
          lastTime = time;
        }
        frame = requestAnimationFrame(loop);
      };
      
      frame = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(frame);
    }, [isOverlay]);

    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id: card.id,
      data: {
        type: 'Card',
        card,
      },
    });

    const style = isDragging
      ? { transition, transform: CSS.Transform.toString(transform), opacity: 0.3 }
      : { transform: CSS.Transform.toString(transform), opacity: 1 };

    const handleNodeRef = useCallback((node: HTMLDivElement | null) => {
      localRef.current = node;
      if (isOverlay) {
        if (typeof ref === 'function') ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      } else {
        setNodeRef(node);
      }
    }, [isOverlay, ref, setNodeRef]);

    if (isBulkDragging && isSelected && !isDragging) {
      return (
        <motion.div 
          ref={handleNodeRef}
          style={{ ...style, display: 'none' }}
          layout
          layoutId={card.id}
        />
      );
    }

    const priorityColors = {
      low: 'text-green-500',
      medium: 'text-blue-500',
      high: 'text-amber-500',
      urgent: 'text-destructive',
    };

    const priorityKey = card.priority || 'medium';
    const PriorityIcon = {
      low: ArrowDownRight,
      medium: ArrowRight,
      high: ArrowUpRight,
      urgent: AlertCircle,
    }[priorityKey];

    return (
      <motion.div
        ref={handleNodeRef}
        style={style}
        layout={!isExpanded}
        className="relative mb-2"
      >
        {/* Background Stacked Cards for Bulk Drag */}
        {isOverlay && selectionCount && selectionCount > 1 && (
          <>
            <div 
              className="absolute inset-0 bg-card rounded-lg border border-border shadow-md pointer-events-none"
              style={{ transform: `translate(4px, 4px) rotate(2deg)`, zIndex: 0 }}
            />
            {selectionCount > 2 && (
              <div 
                className="absolute inset-0 bg-card rounded-lg border border-border shadow-md pointer-events-none"
                style={{ transform: `translate(8px, 8px) rotate(4deg)`, zIndex: -1 }}
              />
            )}
          </>
        )}

        <div
          onClick={() => onClick(card)}
          {...attributes} 
          {...listeners}
          className={`group bg-card hover:bg-muted/30 p-3 rounded-lg border shadow-sm cursor-grab active:cursor-grabbing transition-all relative flex flex-col gap-2 z-10 ${
            isOverlay ? 'shadow-xl ring-1 ring-primary/20' : ''
          } ${isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border/60'} ${isCompleted && !isOverlay ? 'opacity-50' : ''}`}
        >
        {/* Left Color Indicator (Optional based on column or tag) */}
        {columnColor && (
          <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: columnColor, opacity: 0.5 }} />
        )}

        {/* Selection Circle & Count Badge (for overlay) */}
        {onToggleSelect && !isOverlay && (
          <button 
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleSelect(card.id);
            }}
            className={`absolute top-2 right-2 w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
              isSelected ? 'opacity-100 border-primary bg-primary text-primary-foreground' : 'opacity-0 group-hover:opacity-100 border-muted-foreground/40 hover:border-primary/50'
            }`}
          >
            <AnimatePresence>
              {isSelected && (
                <motion.svg 
                  initial={{ opacity: 0, scale: 0.2 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.2 }}
                  transition={{ duration: 0.15 }}
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="3" 
                  className="w-3 h-3"
                >
                  <polyline points="20 6 9 17 4 12" />
                </motion.svg>
              )}
            </AnimatePresence>
          </button>
        )}

        {/* Comment Count Badge */}
        {(card.comments_count ?? 0) > 0 && (
          <div className="absolute top-2.5 right-8 flex items-center gap-1 text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded text-[10px] font-medium" title={`${card.comments_count} comentários`}>
            <MessageSquare size={10} />
            <span>{card.comments_count}</span>
          </div>
        )}

        {isOverlay && selectionCount && selectionCount > 1 && (
          <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-md animate-bounce">
            {selectionCount}
          </div>
        )}

        <div className={`flex items-start gap-2 ${(card.comments_count ?? 0) > 0 ? 'pr-14' : 'pr-6'}`}>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-foreground text-sm leading-snug break-words flex items-start gap-1.5">
              {card.parent_id && (
                <span title="Sub-tarefa" className="shrink-0 mt-0.5 flex">
                  <ListTree size={14} className="text-muted-foreground/70" />
                </span>
              )}
              {card.title}
            </h4>

            {card.description && (
              <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                {card.description}
              </p>
            )}
          </div>
        </div>

        {/* Footer Data */}
        <div className="flex items-center justify-between mt-1 pl-5">
          <div className="flex items-center gap-2.5">
            {/* Priority */}
            <span className={`flex items-center ${priorityColors[card.priority] || ''} opacity-70`} title={`Prioridade: ${card.priority}`}>
              <PriorityIcon size={12} strokeWidth={2.5} />
            </span>

            {/* Tags (Dot or very subtle outline) */}
            {card.categories && card.categories.length > 0 && (
              <div className="flex items-center gap-1.5">
                {card.categories.slice(0, 2).map(tag => (
                  <div 
                    key={tag.id}
                    className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground border border-border/60 rounded px-1.5 py-0.5 bg-muted/20 truncate max-w-[80px]"
                    title={tag.name}
                  >
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
                    <span className="truncate">{tag.name}</span>
                  </div>
                ))}
                {card.categories.length > 2 && (
                  <span className="text-[10px] text-muted-foreground">+{card.categories.length - 2}</span>
                )}
              </div>
            )}

            {/* Subtasks Progress */}
            {subtasksProgress !== undefined && (
              <div className="flex flex-col w-24 gap-1" title={`Sub-tarefas: ${Math.round(subtasksProgress)}% concluído`}>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                  <ListTree size={10} />
                  <span>{Math.round(subtasksProgress)}%</span>
                </div>
                <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300 ease-out" 
                    style={{ width: `${subtasksProgress}%` }} 
                  />
                </div>
              </div>
            )}
            
            {/* Due Date & Comments */}
            {card.due_date && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground" title="Prazo">
                <Clock size={10} />
                {new Date(card.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              </div>
            )}
          </div>

          {/* Assignees */}
          {card.assignees && card.assignees.length > 0 && (
            <div className="flex -space-x-1 shrink-0">
              {card.assignees.slice(0, 3).map((assignee, idx) => (
                <div key={assignee.id || idx} className="w-5 h-5 rounded-full border border-card overflow-hidden" style={{ zIndex: 10 - idx }}>
                  <img src={assignee.avatar_url || `https://ui-avatars.com/api/?name=${assignee.name}&size=20`} alt={assignee.name || 'User'} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mobile Quick Moves */}
        {onMoveMobile && !isOverlay && (
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30 md:hidden">
            <button
              type="button"
              disabled={!canMoveLeft}
              onClick={(e) => { e.stopPropagation(); onMoveMobile(card.id, 'left'); }}
              className="px-2 py-1 rounded bg-muted/50 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              disabled={!canMoveRight}
              onClick={(e) => { e.stopPropagation(); onMoveMobile(card.id, 'right'); }}
              className="px-2 py-1 rounded bg-muted/50 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* Exibir mais / Ler mais Toggle Button */}
        {!isOverlay && (
          <div className="mt-1 pt-1.5 border-t border-border/40 flex items-center justify-between">
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsExpanded(prev => !prev);
              }}
              className="flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors py-0.5 px-1 -ml-1 rounded hover:bg-primary/10"
            >
              {isExpanded ? (
                <>
                  <ChevronUp size={13} />
                  <span>Exibir menos</span>
                </>
              ) : (
                <>
                  <ChevronDown size={13} />
                  <span>Exibir mais / Especificações</span>
                </>
              )}
            </button>

            {/* Micro Badge de Prazo resumido */}
            {dueDateBadge && !isExpanded && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${dueDateBadge.color}`}>
                {dueDateBadge.text}
              </span>
            )}
          </div>
        )}

        {/* Expanded Specifications, Subtasks & Details Area */}
        <AnimatePresence>
          {isExpanded && !isOverlay && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-border/30 pt-2 mt-1 space-y-2.5"
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              onKeyDownCapture={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Detalhes de Prazo & Data de Criação */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 bg-muted/30 p-2 rounded-md border border-border/40 text-[10px]">
                {createdText && (
                  <div className="flex items-center gap-1 text-muted-foreground" title="Data de criação">
                    <Calendar size={11} />
                    <span>{createdText}</span>
                  </div>
                )}

                {dueDateBadge && (
                  <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded border ${dueDateBadge.color}`}>
                    <Clock size={11} />
                    <span>{dueDateBadge.text}</span>
                  </div>
                )}
              </div>

              {/* Sub-tarefas vinculadas (parent_id) */}
              {subtasks.length > 0 && (
                <div className="space-y-1.5 bg-muted/20 p-2 rounded-md border border-border/40">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-foreground">
                    <span className="flex items-center gap-1">
                      <ListTree size={12} className="text-primary" />
                      Sub-tarefas ({subtasks.filter(st => allColumns.find(col => col.id === st.column_id)?.is_completed).length}/{subtasks.length})
                    </span>
                  </div>

                  <div className="space-y-1 mt-1">
                    {subtasks.map(st => {
                      const stCol = allColumns.find(c => c.id === st.column_id);
                      const isStCompleted = stCol?.is_completed || false;

                      return (
                        <div
                          key={st.id}
                          onClick={(e) => handleToggleSubtask(st, isStCompleted, e)}
                          className="flex items-center justify-between gap-2 p-1 rounded hover:bg-background/80 cursor-pointer transition-colors group/st"
                          title={isStCompleted ? 'Clique para reabrir sub-tarefa' : 'Clique para mover para a coluna de Concluídos'}
                        >
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-primary shrink-0 transition-colors"
                            >
                              {isStCompleted ? (
                                <CheckCircle2 size={13} className="text-green-500" />
                              ) : (
                                <Square size={13} />
                              )}
                            </button>
                            <span className={`text-[11px] truncate ${isStCompleted ? 'line-through text-muted-foreground/70' : 'text-foreground'}`}>
                              {st.title}
                            </span>
                          </div>

                          {stCol && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/40 shrink-0">
                              {stCol.title}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Especificações & Checklist */}
              {isLoadingChecklists ? (
                <div className="flex items-center justify-center py-2 text-muted-foreground text-xs gap-1.5">
                  <Loader2 size={12} className="animate-spin" />
                  <span>Carregando especificações...</span>
                </div>
              ) : checklists.length === 0 ? (
                <div className="p-2 rounded-md bg-muted/20 text-center space-y-1.5">
                  <p className="text-[11px] text-muted-foreground">Nenhuma especificação cadastrada.</p>
                  <button
                    type="button"
                    onClick={handleCreateInitialChecklist}
                    className="inline-flex items-center gap-1 text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary/20 px-2 py-1 rounded transition-colors"
                  >
                    <Plus size={10} />
                    <span>Criar Lista de Especificações</span>
                  </button>
                </div>
              ) : (
                checklists.map(checklist => {
                  const total = checklist.items.length;
                  const completed = checklist.items.filter(i => i.checked).length;
                  const progress = total > 0 ? (completed / total) * 100 : 0;

                  return (
                    <div key={checklist.id} className="space-y-1.5 bg-muted/20 p-2 rounded-md border border-border/40">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-foreground">
                        <span>{checklist.title}</span>
                        {total > 0 && (
                          <span className="text-[10px] text-muted-foreground font-normal">
                            {completed}/{total} ({Math.round(progress)}%)
                          </span>
                        )}
                      </div>

                      {total > 0 && (
                        <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      )}

                      <div className="space-y-1 mt-1.5">
                        {checklist.items.map(item => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-1.5 p-1 rounded hover:bg-background/80 transition-colors group/item"
                          >
                            {editingItemId === item.id ? (
                              <form
                                onSubmit={(e) => handleSaveItemEdit(item.id, e)}
                                onKeyDown={(e) => e.stopPropagation()}
                                onKeyDownCapture={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                                onPointerDown={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 flex-1 min-w-0"
                              >
                                <input
                                  type="text"
                                  value={editingItemText}
                                  onChange={(e) => setEditingItemText(e.target.value)}
                                  autoFocus
                                  onKeyDown={(e) => e.stopPropagation()}
                                  onKeyDownCapture={(e) => e.stopPropagation()}
                                  className="flex-1 bg-background border border-primary/50 rounded px-1.5 py-0.5 text-[11px] focus:outline-none"
                                />
                                <button
                                  type="submit"
                                  className="p-1 text-green-500 hover:text-green-600 rounded hover:bg-green-500/10 shrink-0"
                                  title="Salvar"
                                >
                                  <Check size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setEditingItemId(null);
                                  }}
                                  className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-muted shrink-0"
                                  title="Cancelar"
                                >
                                  <X size={12} />
                                </button>
                              </form>
                            ) : (
                              <>
                                <div
                                  onClick={(e) => handleToggleItem(item.id, item.checked, e)}
                                  className="flex items-start gap-2 flex-1 min-w-0 cursor-pointer"
                                >
                                  <button
                                    type="button"
                                    className="mt-0.5 text-muted-foreground hover:text-primary shrink-0 transition-colors"
                                  >
                                    {item.checked ? (
                                      <CheckSquare size={13} className="text-primary" />
                                    ) : (
                                      <Square size={13} />
                                    )}
                                  </button>
                                  <span className={`text-[11px] leading-tight break-words ${item.checked ? 'line-through text-muted-foreground/70' : 'text-foreground'}`}>
                                    {item.text}
                                  </span>
                                </div>

                                {/* Ícones de Editar e Excluir */}
                                <div className="flex items-center gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0">
                                  <button
                                    type="button"
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setEditingItemId(item.id);
                                      setEditingItemText(item.text);
                                    }}
                                    className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                                    title="Editar especificação"
                                  >
                                    <Pencil size={11} />
                                  </button>
                                  <button
                                    type="button"
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => handleDeleteItem(item.id, e)}
                                    className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                                    title="Excluir especificação"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Add item input */}
                      <form 
                        onSubmit={(e) => handleAddItem(checklist.id, e)} 
                        onKeyDown={(e) => e.stopPropagation()}
                        onKeyDownCapture={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 mt-2"
                      >
                        <input
                          ref={itemInputRef}
                          type="text"
                          placeholder="Adicionar especificação..."
                          value={newItemText}
                          onChange={(e) => setNewItemText(e.target.value)}
                          onKeyDown={(e) => e.stopPropagation()}
                          onKeyDownCapture={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                          className="flex-1 bg-background border border-border/60 rounded px-2 py-0.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <button
                          type="submit"
                          disabled={!newItemText.trim()}
                          className="p-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors shrink-0"
                        >
                          <Plus size={10} />
                        </button>
                      </form>
                    </div>
                  );
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </motion.div>
    );
  }
);
KanbanCardInner.displayName = 'KanbanCardInner';

export const KanbanCard = memo(KanbanCardInner, (prev: KanbanCardProps, next: KanbanCardProps) => {
  return prev.card === next.card && 
         prev.isOverlay === next.isOverlay &&
         prev.onClick === next.onClick &&
         prev.isSelected === next.isSelected &&
         prev.isCompleted === next.isCompleted &&
         prev.subtasksProgress === next.subtasksProgress &&
         prev.columnColor === next.columnColor &&
         prev.isBulkDragging === next.isBulkDragging &&
         prev.selectionCount === next.selectionCount &&
         prev.allCards === next.allCards &&
         prev.allColumns === next.allColumns;
});


