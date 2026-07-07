import { forwardRef, memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { KanbanCardType } from '@/types/kanban';
import { MessageSquare, Clock, ArrowDownRight, ArrowRight, ArrowUpRight, AlertCircle } from 'lucide-react';

interface KanbanCardProps {
  card: KanbanCardType;
  onClick: (card: KanbanCardType) => void;
  isOverlay?: boolean;
}

export const KanbanCardInner = forwardRef<HTMLDivElement, KanbanCardProps>(
  ({ card, onClick, isOverlay }, ref) => {
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

    const style = {
      transition,
      transform: CSS.Transform.toString(transform),
    };

    if (isDragging) {
      return (
        <div
          ref={setNodeRef}
          style={style}
          className="bg-primary/5 border-2 border-primary/20 rounded-xl h-[120px] mb-3 opacity-50"
        />
      );
    }

    const priorityColors = {
      low: 'bg-green-100 text-green-700',
      medium: 'bg-blue-100 text-blue-700',
      high: 'bg-amber-100 text-amber-700',
      urgent: 'bg-destructive/10 text-destructive',
    };

    const priorityLabels = {
      low: 'Baixa',
      medium: 'Média',
      high: 'Alta',
      urgent: 'Urgente',
    };

    const PriorityIcon = {
      low: ArrowDownRight,
      medium: ArrowRight,
      high: ArrowUpRight,
      urgent: AlertCircle,
    }[card.priority];

    return (
      <div
        ref={isOverlay ? ref : setNodeRef}
        style={{
          ...style,
          borderColor: card.border_color || undefined,
          borderWidth: card.border_color ? '2px' : '1px'
        }}
        onClick={() => onClick(card)}
        className={`bg-card p-4 rounded-xl border border-border shadow-sm mb-3 cursor-grab active:cursor-grabbing group hover:border-primary/50 transition-colors relative overflow-hidden ${
          isOverlay ? 'rotate-2 scale-105 shadow-xl' : ''
        }`}
        {...attributes}
        {...listeners}
      >
        <div className="flex justify-between items-start mb-2 mt-1">
          <div className="flex gap-2 items-center flex-wrap">
            <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${priorityColors[card.priority]}`}>
              <PriorityIcon size={12} />
              {priorityLabels[card.priority]}
            </span>
            {card.categories?.map(tag => (
              <span 
                key={tag.id}
                className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-sm"
                style={{ backgroundColor: tag.color }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        </div>

        <h4 className="font-semibold text-foreground text-sm leading-tight mb-2 line-clamp-2">
          {card.title}
        </h4>

        {card.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
            {card.description}
          </p>
        )}

        <div className="flex items-center justify-between mt-auto pt-2 text-muted-foreground">
          <div className="flex items-center gap-3">
            {card.due_date && (
              <div className="flex items-center gap-1 text-[11px] font-medium" title="Prazo">
                <Clock size={12} />
                {new Date(card.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              </div>
            )}
            <div className="flex items-center gap-1 text-[11px]" title="Comentários">
              <MessageSquare size={12} /> 0
            </div>
          </div>
          {card.assigned_to && (
            <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[9px] font-bold text-primary">
              A
            </div>
          )}
        </div>
      </div>
    );
  }
);
KanbanCardInner.displayName = 'KanbanCardInner';

export const KanbanCard = memo(KanbanCardInner, (prev, next) => {
  return prev.card === next.card && 
         prev.isOverlay === next.isOverlay &&
         prev.onClick === next.onClick;
});
