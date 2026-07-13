import { forwardRef, useEffect, useRef, memo, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { KanbanCardType } from '@/types/kanban';
import { Clock, ArrowDownRight, ArrowRight, ArrowUpRight, AlertCircle, ChevronLeft, ChevronRight, ListTree, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
}

export const KanbanCardInner = forwardRef<HTMLDivElement, KanbanCardProps>(
  ({ card, onClick, isOverlay, onMoveMobile, canMoveLeft, canMoveRight, columnColor, isCompleted, subtasksProgress, isSelected, onToggleSelect, selectionCount, isBulkDragging }, ref) => {
    const localRef = useRef<HTMLDivElement | null>(null);

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

              // Reação rápida ao movimento (0.25 = responsivo e direto)
              smoothVelocityX += (rawVelX - smoothVelocityX) * 0.25;
              smoothVelocityY += (rawVelY - smoothVelocityY) * 0.2;

              // Rotação baseada na velocidade horizontal (max ±12deg)
              const targetRotate = Math.max(-12, Math.min(12, smoothVelocityX * 12));
              currentRotate += (targetRotate - currentRotate) * 0.35;

              // Scale pulsa levemente baseado na velocidade total
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

    const style = {
      transition,
      transform: CSS.Transform.toString(transform),
      opacity: isDragging ? 0.3 : 1,
    };

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
      // If a bulk drag is active, and this card is selected (but not the active one, since isDragging is false)
      // We should hide it visually so it looks like it was picked up with the stack
      return (
        <div 
          ref={handleNodeRef}
          style={{ ...style, display: 'none' }}
        />
      );
    }

    const priorityColors = {
      low: 'text-muted-foreground',
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
      <div
        ref={handleNodeRef}
        style={style}
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

        <div className="flex items-start gap-2 pr-6">
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
        </div>
      </div>
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
         prev.selectionCount === next.selectionCount;
});
