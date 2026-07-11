import { useState, useMemo, memo } from 'react';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { KanbanColumnType, KanbanCardType } from '@/types/kanban';
import { KanbanCard } from './KanbanCard';
import { GripVertical, Plus, Pencil, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface KanbanColumnProps {
  column: KanbanColumnType;
  cards: KanbanCardType[];
  onCardClick: (card: KanbanCardType) => void;
  onAddCard: (columnId: string) => void;
  onUpdateColumn?: (columnId: string, updates: Partial<KanbanColumnType>) => void;
  onDeleteColumn?: (columnId: string) => void;
  canEdit?: boolean;
  onMoveCardMobile?: (cardId: string, direction: 'left' | 'right') => void;
  isFirstColumn?: boolean;
  isLastColumn?: boolean;
  allCards?: KanbanCardType[];
  allColumns?: KanbanColumnType[];
}

export const KanbanColumnInner = ({ column, cards, onCardClick, onAddCard, onUpdateColumn, onDeleteColumn, canEdit = true, onMoveCardMobile, isFirstColumn, isLastColumn, allCards = [], allColumns = [] }: KanbanColumnProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(column.title);
  const [editColor, setEditColor] = useState(column.color || '');
  const [editIsCompleted, setEditIsCompleted] = useState(column.is_completed || false);
  const [isHovered, setIsHovered] = useState(false);
  const [showCompletedCards, setShowCompletedCards] = useState(false);

  const COLUMN_COLORS = [
    { value: '', label: 'Padrão' },
    { value: '#ef4444', label: 'Vermelho' },
    { value: '#f97316', label: 'Laranja' },
    { value: '#eab308', label: 'Amarelo' },
    { value: '#22c55e', label: 'Verde' },
    { value: '#3b82f6', label: 'Azul' },
    { value: '#8b5cf6', label: 'Roxo' },
    { value: '#ec4899', label: 'Rosa' },
  ];

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: {
      type: 'Column',
      column,
    },
    disabled: isEditing,
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  const cardIds = useMemo(() => cards.map((c) => c.id), [cards]);

  const handleSaveEdit = () => {
    if (editTitle.trim() && (editTitle !== column.title || editColor !== (column.color || '') || editIsCompleted !== (column.is_completed || false)) && onUpdateColumn) {
      onUpdateColumn(column.id, { title: editTitle.trim(), color: editColor || null, is_completed: editIsCompleted });
    }
    setIsEditing(false);
  };

  if (isDragging) {
    return (
      <div 
        ref={setNodeRef}
        style={style}
        className="flex flex-col bg-muted/20 border border-border/50 rounded-xl flex-shrink-0 w-[85vw] md:w-[320px] h-full transition-all opacity-40"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
      }}
      className="bg-muted/60 border border-border/50 rounded-xl flex-shrink-0 flex flex-col h-full w-[85vw] md:w-[300px] relative group/col overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Top Color Detail */}
      {column.color && (
        <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: column.color, opacity: 0.8 }} />
      )}
      {/* Column Header */}
      <div 
        className="px-2 py-3 flex items-center justify-between group/header shrink-0"
      >
        <div className="flex items-center gap-1.5 flex-1 min-w-0" {...attributes} {...listeners} style={{ cursor: isEditing ? 'default' : 'grab' }}>
          
          {isEditing && canEdit ? (
            <div className="flex flex-col gap-3 w-full bg-card p-3 rounded-lg border border-border/60 shadow-sm z-10 w-full relative">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit();
                  if (e.key === 'Escape') {
                    setEditTitle(column.title);
                    setEditColor(column.color || '');
                    setEditIsCompleted(column.is_completed || false);
                    setIsEditing(false);
                  }
                }}
                autoFocus
                className="w-full bg-background border border-border/60 px-2 py-1.5 rounded-md text-sm font-semibold focus:outline-none focus:border-primary/50"
              />
              <div className="flex flex-wrap items-center gap-1.5">
                {COLUMN_COLORS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setEditColor(c.value)}
                    className={`w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center ${editColor === c.value ? 'border-primary scale-110' : 'border-transparent hover:scale-110'}`}
                    style={{ backgroundColor: c.value || 'var(--muted)' }}
                    title={c.label}
                  />
                ))}
                <div className="w-[1px] h-4 bg-border/60 mx-0.5" />
                <label className="relative flex items-center justify-center cursor-pointer group" title="Cor hexadecimal personalizada">
                  <input
                    type="color"
                    value={editColor || '#ffffff'}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div 
                    className="w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center border-dashed border-muted-foreground/50 group-hover:border-primary"
                    style={{ backgroundColor: editColor && !COLUMN_COLORS.find(c => c.value === editColor) ? editColor : 'transparent' }}
                  >
                    <Plus size={12} className={editColor && !COLUMN_COLORS.find(c => c.value === editColor) ? 'text-background mix-blend-difference' : 'text-muted-foreground'} />
                  </div>
                </label>
              </div>
              <div className="flex flex-col gap-2 mt-1">
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={editIsCompleted} 
                    onChange={(e) => setEditIsCompleted(e.target.checked)} 
                    className="rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
                  />
                  Coluna de Concluídos (oculta cartões)
                </label>
              </div>
              <div className="flex justify-between items-center gap-2 mt-1">
                {canEdit && onDeleteColumn && (
                  <button 
                    onClick={() => onDeleteColumn(column.id)}
                    className="text-xs text-destructive hover:underline"
                  >
                    Excluir
                  </button>
                )}
                <div className="flex gap-2 ml-auto">
                  <button onClick={() => { setEditTitle(column.title); setEditColor(column.color || ''); setEditIsCompleted(column.is_completed || false); setIsEditing(false); }} className="px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground">Cancelar</button>
                  <button onClick={handleSaveEdit} className="px-2 py-1 text-xs font-medium bg-foreground text-background rounded hover:bg-foreground/90">Salvar</button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Subtle drag handle */}
              <GripVertical size={14} className="text-muted-foreground/30 opacity-0 group-hover/header:opacity-100 transition-opacity cursor-grab shrink-0" />
              
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {/* Column color indicator */}
                {column.color && (
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: column.color }} />
                )}
                <h3 className="font-semibold text-foreground text-sm truncate">{column.title}</h3>
                
                {/* Minimal Counter */}
                <span className="text-muted-foreground text-xs font-medium shrink-0 mr-auto">
                  {cards.length}
                </span>

                {/* Edit Button */}
                {canEdit && (
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => {
                      setEditTitle(column.title);
                      setEditColor(column.color || '');
                      setEditIsCompleted(column.is_completed || false);
                      setIsEditing(true);
                    }}
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 opacity-0 group-hover/header:opacity-100 transition-all shrink-0"
                    title="Editar coluna"
                  >
                    <Pencil size={14} />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
        
        {/* Quick Add Button on Header Hover */}
        {!isEditing && canEdit && (
          <button
            onClick={() => onAddCard(column.id)}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 opacity-0 group-hover/header:opacity-100 transition-all shrink-0 ml-1"
            title="Adicionar tarefa"
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      {/* Cards Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-1 px-2 custom-scrollbar flex flex-col relative rounded-lg">
        {/* Subtle background for the drop area that only appears on column hover */}
        <div className={`absolute inset-0 bg-muted/20 border border-border/40 rounded-lg pointer-events-none transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`} />
        
        <div className="relative z-10 flex flex-col h-full min-h-[50px]">
          {column.is_completed && !showCompletedCards ? (
            <div className="flex flex-col items-center justify-center py-10 px-2 text-center mt-4 relative">
              <motion.div 
                key={cards.length}
                initial={{ scale: 0.8, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                className="flex flex-col items-center w-full"
              >
                <motion.div
                  initial={{ scale: 1.8, rotate: -20, color: '#22c55e' }}
                  animate={{ scale: 1, rotate: 0, color: 'currentColor' }}
                  transition={{ type: 'spring', stiffness: 250, damping: 12 }}
                  className="text-muted-foreground/40 mb-3"
                >
                  <CheckCircle2 size={36} />
                </motion.div>
                
                <motion.p 
                  initial={{ scale: 1.1, color: '#22c55e' }}
                  animate={{ scale: 1, color: 'currentColor' }}
                  transition={{ duration: 0.5 }}
                  className="text-sm font-bold text-foreground mb-4"
                >
                  {cards.length} tarefas concluídas
                </motion.p>

                {cards.length > 0 && (
                  <button 
                    onClick={() => setShowCompletedCards(true)}
                    className="text-xs font-bold px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-full transition-all active:scale-95"
                  >
                    Mostrar cartões
                  </button>
                )}
              </motion.div>
            </div>
          ) : (
            <>
              <SortableContext items={cardIds}>
                {cards.map((card) => {
                  const subtasks = allCards.filter(c => c.parent_id === card.id);
                  let subtasksProgress = undefined;
                  if (subtasks.length > 0) {
                    const completed = subtasks.filter(st => {
                      const col = allColumns.find(c => c.id === st.column_id);
                      return col?.is_completed;
                    });
                    subtasksProgress = (completed.length / subtasks.length) * 100;
                  }

                  return (
                    <KanbanCard 
                      key={card.id} 
                      card={card} 
                      onClick={onCardClick} 
                      onMoveMobile={canEdit ? onMoveCardMobile : undefined}
                      canMoveLeft={canEdit && !isFirstColumn}
                      canMoveRight={canEdit && !isLastColumn}
                      columnColor={column.color}
                      isCompleted={column.is_completed}
                      subtasksProgress={subtasksProgress}
                    />
                  );
                })}
              </SortableContext>
              
              {/* Subtle Add Button at bottom of column */}
              {canEdit && (
                <button
                  onClick={() => onAddCard(column.id)}
                  className="mt-1 flex items-center gap-2 text-[13px] font-medium text-muted-foreground hover:text-foreground py-1.5 px-2 rounded-md hover:bg-muted/40 transition-colors w-full group/add"
                >
                  <Plus size={14} className="opacity-70 group-hover/add:opacity-100" /> Nova tarefa
                </button>
              )}

              {column.is_completed && showCompletedCards && cards.length > 0 && (
                <button 
                  onClick={() => setShowCompletedCards(false)}
                  className="mt-4 mx-auto block text-[11px] font-medium px-3 py-1.5 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground rounded-full transition-colors"
                >
                  Ocultar cartões
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
KanbanColumnInner.displayName = 'KanbanColumnInner';

export const KanbanColumn = memo(KanbanColumnInner, (prev, next) => {
  if (prev.column !== next.column) return false;
  if (prev.canEdit !== next.canEdit) return false;
  if (prev.cards.length !== next.cards.length) return false;
  
  for (let i = 0; i < prev.cards.length; i++) {
    if (prev.cards[i] !== next.cards[i]) return false;
  }
  
  return true;
});
