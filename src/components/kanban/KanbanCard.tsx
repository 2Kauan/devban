import { forwardRef, memo, useEffect, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { KanbanCardType } from '@/types/kanban';
import { MessageSquare, Clock, ArrowDownRight, ArrowRight, ArrowUpRight, AlertCircle, ChevronLeft, ChevronRight, GripHorizontal } from 'lucide-react';

interface KanbanCardProps {
  card: KanbanCardType;
  onClick: (card: KanbanCardType) => void;
  isOverlay?: boolean;
  onMoveMobile?: (cardId: string, direction: 'left' | 'right') => void;
  canMoveLeft?: boolean;
  canMoveRight?: boolean;
  columnColor?: string | null;
  isCompleted?: boolean;
}

export const KanbanCardInner = forwardRef<HTMLDivElement, KanbanCardProps>(
  ({ card, onClick, isOverlay, onMoveMobile, canMoveLeft, canMoveRight, columnColor, isCompleted }, ref) => {
    const localRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      if (!isOverlay) return;
      let frame: number;
      let currentRotate = 0;
      let smoothVelocity = 0;
      let lastX = 0;
      let lastTime = 0;

      const loop = (time: number) => {
        if (localRef.current) {
          const rect = localRef.current.getBoundingClientRect();
          if (lastTime > 0) {
            const dt = time - lastTime;
            if (dt > 0) {
              const dx = rect.x - lastX;
              const rawVelocity = dx / dt; // px per ms
              
              // Low-pass filter on velocity to remove spikes and add "weight"
              smoothVelocity += (rawVelocity - smoothVelocity) * 0.15;
              
              // Target rotation based on smooth velocity. Max 18 degrees.
              const targetRotate = Math.max(-18, Math.min(18, smoothVelocity * 12));
              
              // Smooth approach to target rotation (springy feel)
              currentRotate += (targetRotate - currentRotate) * 0.2;
              
              // Apply transform with a slight scale bump
              localRef.current.style.transform = `rotate(${currentRotate}deg) scale(1.05)`;
            }
          } else {
             // Initial frame setup
             localRef.current.style.transform = `rotate(0deg) scale(1.05)`;
          }
          lastX = rect.x;
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
        ref={(node) => {
          localRef.current = node;
          if (isOverlay) {
            if (typeof ref === 'function') ref(node);
            else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
          } else {
            setNodeRef(node);
          }
        }}
        style={{
          ...style,
          borderColor: card.border_color || columnColor || undefined,
          borderWidth: card.border_color || columnColor ? '2px' : '1px'
        }}
        onClick={() => onClick(card)}
        className={`bg-card p-4 rounded-xl border border-border shadow-sm mb-3 cursor-grab active:cursor-grabbing group hover:border-primary/50 transition-colors relative overflow-hidden ${
          isOverlay ? 'shadow-xl' : ''
        } ${isCompleted && !isOverlay ? 'opacity-60 grayscale-[0.3]' : ''}`}
        {...attributes}
        {...listeners}
      >
        <div className="flex justify-center mb-1 -mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-8 h-1 bg-border/50 rounded-full" />
        </div>
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
          <GripHorizontal size={14} className="text-muted-foreground/30 ml-2 shrink-0 hidden md:block" />
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
          <div className="flex items-center gap-4">
            {card.assignees && card.assignees.length > 0 && (
              <div className="flex -space-x-2">
                {card.assignees.slice(0, 3).map((assignee, idx) => (
                  <div key={assignee.id || idx} className="w-5 h-5 rounded-full border border-background overflow-hidden relative z-10" style={{ zIndex: 10 - idx }}>
                    <img src={assignee.avatar_url || `https://ui-avatars.com/api/?name=${assignee.name}&size=20`} alt={assignee.name || 'User'} className="w-full h-full object-cover" />
                  </div>
                ))}
                {card.assignees.length > 3 && (
                  <div className="w-5 h-5 rounded-full bg-muted border border-background flex items-center justify-center text-[8px] font-bold relative z-0">
                    +{card.assignees.length - 3}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {onMoveMobile && !isOverlay && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50 md:hidden">
            <button
              type="button"
              disabled={!canMoveLeft}
              onClick={(e) => { e.stopPropagation(); onMoveMobile(card.id, 'left'); }}
              className="p-1.5 rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Mover</span>
            <button
              type="button"
              disabled={!canMoveRight}
              onClick={(e) => { e.stopPropagation(); onMoveMobile(card.id, 'right'); }}
              className="p-1.5 rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
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
