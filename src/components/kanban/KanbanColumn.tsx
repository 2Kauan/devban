import { useState, useMemo, memo } from 'react';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { KanbanColumnType, KanbanCardType } from '@/types/kanban';
import { KanbanCard } from './KanbanCard';
import { GripHorizontal, Plus, Trash2, Edit2 } from 'lucide-react';

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
}

export const KanbanColumnInner = ({ column, cards, onCardClick, onAddCard, onUpdateColumn, onDeleteColumn, canEdit = true, onMoveCardMobile, isFirstColumn, isLastColumn }: KanbanColumnProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(column.title);
  const [editColor, setEditColor] = useState(column.color || '');

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
    if (editTitle.trim() && (editTitle !== column.title || editColor !== (column.color || '')) && onUpdateColumn) {
      onUpdateColumn(column.id, { title: editTitle.trim(), color: editColor || null });
    }
    setIsEditing(false);
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="bg-muted border-2 border-primary/20 opacity-40 rounded-2xl w-[320px] h-full min-h-[500px] flex-shrink-0"
      ></div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        borderTopWidth: column.color ? '4px' : '1px',
        borderTopColor: column.color || undefined,
      }}
      className="bg-muted/50 rounded-2xl w-[320px] flex-shrink-0 flex flex-col max-h-full border border-border/50 shadow-sm relative"
    >
      <div 
        className="p-4 flex items-center justify-between border-b border-border/50 bg-card rounded-t-xl group"
      >
        <div className="flex flex-col gap-2 flex-1 min-w-0" {...attributes} {...listeners} style={{ cursor: isEditing ? 'default' : 'grab' }}>
          
          {isEditing && canEdit ? (
            <div className="flex flex-col gap-3 w-full">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit();
                  if (e.key === 'Escape') {
                    setEditTitle(column.title);
                    setEditColor(column.color || '');
                    setIsEditing(false);
                  }
                }}
                autoFocus
                className="w-full bg-background border border-primary px-3 py-2 rounded-lg text-sm font-semibold focus:outline-none"
              />
              <div className="flex flex-wrap gap-1">
                {COLUMN_COLORS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setEditColor(c.value)}
                    className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center ${editColor === c.value ? 'border-primary scale-110' : 'border-transparent hover:scale-110'}`}
                    style={{ backgroundColor: c.value || 'var(--card)' }}
                    title={c.label}
                  />
                ))}
              </div>
              <div className="flex justify-end gap-2 mt-1">
                <button onClick={() => { setEditTitle(column.title); setEditColor(column.color || ''); setIsEditing(false); }} className="px-3 py-1 text-xs font-medium bg-muted rounded-md hover:bg-border">Cancelar</button>
                <button onClick={handleSaveEdit} className="px-3 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary-hover">Salvar</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <GripHorizontal size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-grab flex-shrink-0" />
                <div 
                  className={`flex items-center gap-2 flex-1 min-w-0 ${canEdit ? 'cursor-pointer hover:bg-muted/50' : ''} px-2 py-1 rounded-md transition-colors`}
                  onClick={() => {
                    if (canEdit) {
                      setEditTitle(column.title);
                      setEditColor(column.color || '');
                      setIsEditing(true);
                    }
                  }}
                >
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: column.color || 'var(--primary)' }} />
                  <h3 className="font-bold text-foreground text-sm truncate">{column.title}</h3>
                  <span className="bg-muted text-muted-foreground text-xs font-medium px-2 py-0.5 rounded-full ml-1 flex-shrink-0">
                    {cards.length}
                  </span>
                </div>
              </div>
              
              {canEdit && onDeleteColumn && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={() => onDeleteColumn(column.id)}
                    className="p-1.5 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 custom-scrollbar flex flex-col gap-2">
        <SortableContext items={cardIds}>
          {cards.map((card) => (
            <KanbanCard 
              key={card.id} 
              card={card} 
              onClick={onCardClick} 
              onMoveMobile={canEdit ? onMoveCardMobile : undefined}
              canMoveLeft={!isFirstColumn}
              canMoveRight={!isLastColumn}
              columnColor={column.color}
            />
          ))}
        </SortableContext>
      </div>

      <div className="p-3 pt-0 mt-auto">
        {canEdit && (
          <button
            onClick={() => onAddCard(column.id)}
            className="mt-2 w-full flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground bg-card hover:bg-muted/50 border border-transparent hover:border-border py-2.5 rounded-xl transition-all shadow-sm hover:shadow active:scale-95"
          >
            <Plus size={16} /> Tarefa
          </button>
        )}
      </div>
    </div>
  );
};
KanbanColumnInner.displayName = 'KanbanColumnInner';

export const KanbanColumn = memo(KanbanColumnInner, (prev, next) => {
  if (prev.column !== next.column) return false;
  if (prev.canEdit !== next.canEdit) return false;
  if (prev.cards.length !== next.cards.length) return false;
  
  // As React Query structural sharing is enabled, cards that haven't changed will maintain reference
  for (let i = 0; i < prev.cards.length; i++) {
    if (prev.cards[i] !== next.cards[i]) return false;
  }
  
  // We assume functions passed via props (onCardClick, onAddCard, etc) are stable (useCallback)
  return true;
});
