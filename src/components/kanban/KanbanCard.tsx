import { forwardRef, memo, useEffect, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { KanbanCardType } from '@/types/kanban';
import { MessageSquare, Clock, ArrowDownRight, ArrowRight, ArrowUpRight, AlertCircle, ChevronLeft, ChevronRight, GripVertical, ListTree } from 'lucide-react';

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
}

export const KanbanCardInner = forwardRef<HTMLDivElement, KanbanCardProps>(
  ({ card, onClick, isOverlay, onMoveMobile, canMoveLeft, canMoveRight, columnColor, isCompleted, subtasksProgress }, ref) => {
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
              const rawVelocity = dx / dt;
              smoothVelocity += (rawVelocity - smoothVelocity) * 0.15;
              const targetRotate = Math.max(-8, Math.min(8, smoothVelocity * 8));
              currentRotate += (targetRotate - currentRotate) * 0.2;
              localRef.current.style.transform = `rotate(${currentRotate}deg) scale(1.02)`;
            }
          } else {
             localRef.current.style.transform = `rotate(0deg) scale(1.02)`;
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
          className="bg-primary/5 border border-primary/20 rounded-lg h-[90px] mb-2 opacity-50"
        />
      );
    }

    const priorityColors = {
      low: 'text-muted-foreground',
      medium: 'text-blue-500',
      high: 'text-amber-500',
      urgent: 'text-destructive',
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
        }}
        onClick={() => onClick(card)}
        {...attributes} 
        {...listeners}
        className={`group bg-card hover:bg-muted/30 p-3 rounded-lg border border-border/60 shadow-sm mb-2 cursor-grab active:cursor-grabbing transition-colors relative overflow-hidden flex flex-col gap-2 ${
          isOverlay ? 'shadow-xl ring-1 ring-primary/20' : ''
        } ${isCompleted && !isOverlay ? 'opacity-50' : ''}`}
      >
        {/* Left Color Indicator (Optional based on column or tag) */}
        {columnColor && (
          <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: columnColor, opacity: 0.5 }} />
        )}

        <div className="flex items-start gap-2">
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
              <p className="text-[11px] text-muted-foreground line-clamp-1 mt-1 leading-relaxed">
                {card.description}
              </p>
            )}
          </div>
        </div>

        {/* Footer Data */}
        <div className="flex items-center justify-between mt-1 pl-5">
          <div className="flex items-center gap-2.5">
            {/* Priority */}
            <span className={`flex items-center ${priorityColors[card.priority]} opacity-70`} title={`Prioridade: ${card.priority}`}>
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
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium" title="Sub-tarefas">
                <ListTree size={10} />
                <span>{Math.round(subtasksProgress)}%</span>
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
