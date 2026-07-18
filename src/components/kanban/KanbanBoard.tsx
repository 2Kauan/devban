import { useState, useMemo, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragStartEvent, DragOverEvent, DragEndEvent, CollisionDetection } from '@dnd-kit/core';
import { defaultDropAnimationSideEffects } from '@dnd-kit/core';
import type { DropAnimation } from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import type { KanbanColumnType, KanbanCardType } from '@/types/kanban';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { compareByPriority } from '@/utils/kanban';

const dropAnimationConfig: DropAnimation = {
  duration: 250,
  easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.4',
      },
    },
  }),
};

interface KanbanBoardProps {
  columns: KanbanColumnType[];
  cards: KanbanCardType[];
  onColumnsChange: (columns: KanbanColumnType[]) => void;
  onCardsChange: (cards: KanbanCardType[]) => void;
  onCardMove?: (cardId: string, sourceColumnId: string, destColumnId: string) => void;
  onCardClick: (card: KanbanCardType) => void;
  onAddCard: (columnId: string) => void;
  onAddColumn: () => void;
  onUpdateColumn: (columnId: string, updates: Partial<KanbanColumnType>) => void;
  onDeleteColumn: (columnId: string) => void;
  canEdit?: boolean;
  onBulkDelete?: (cardIds: string[]) => void;
  onBulkMove?: (cardIds: string[], destColumnId: string) => void;
}

export function KanbanBoard({
  columns,
  cards,
  onColumnsChange,
  onCardsChange,
  onCardMove,
  onCardClick,
  onAddCard,
  onAddColumn,
  onUpdateColumn,
  onDeleteColumn,
  canEdit = true,
  onBulkDelete,
  onBulkMove,
}: KanbanBoardProps) {
  const [activeColumn, setActiveColumn] = useState<KanbanColumnType | null>(null);
  const [activeCard, setActiveCard] = useState<KanbanCardType | null>(null);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [localCards, setLocalCards] = useState<KanbanCardType[]>(cards);
  const [localColumns, setLocalColumns] = useState<KanbanColumnType[]>(columns);

  // Sincroniza localCards com cards do pai APENAS quando o pai envia dados novos.
  // NÃO depende de activeCard/activeColumn para evitar flash-back:
  // (activeCard vai pra null ANTES do pai atualizar cards → flash para posição antiga)
  useEffect(() => {
    if (!activeCard && !activeColumn) {
      setLocalCards(cards);
    }
  }, [cards]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!activeCard && !activeColumn) {
      setLocalColumns(columns);
    }
  }, [columns]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleSelect = (cardId: string) => {
    setSelectedCardIds(prev => 
      prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]
    );
  };

  const handleSelectAllColumnCards = (columnId: string) => {
    const columnCardIds = localCards.filter(c => c.column_id === columnId).map(c => c.id);
    setSelectedCardIds(prev => {
      // If all are already selected, unselect them all
      const allSelected = columnCardIds.every(id => prev.includes(id));
      if (allSelected) {
        return prev.filter(id => !columnCardIds.includes(id));
      }
      // Otherwise, add any missing ones
      const newSelected = new Set(prev);
      columnCardIds.forEach(id => newSelected.add(id));
      return Array.from(newSelected);
    });
  };

  const columnIds = useMemo(() => localColumns.map((col) => col.id), [localColumns]);

  const noopKeyboardGetter = useMemo(() => (() => null) as any, []);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: canEdit ? 8 : Infinity,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: canEdit ? 250 : Infinity,
        tolerance: canEdit ? 5 : 0,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: canEdit ? sortableKeyboardCoordinates : noopKeyboardGetter,
    })
  );

  // Detecção de colisão customizada:
  // - pointerWithin: detecta quando o ponteiro está dentro de um droppable (generoso)
  // - closestCenter: fallback que SEMPRE retorna o droppable mais perto (nunca retorna vazio)
  const customCollisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      return pointerCollisions;
    }
    // Fallback: closestCenter sempre acha o mais próximo, nunca retorna vazio
    return closestCenter(args);
  };

  function onDragStart(event: DragStartEvent) {
    if (!canEdit) {
      toast.error('Você tem permissão apenas de Leitor.');
      return;
    }
    const { active } = event;
    const activeColumn = localColumns.find(c => c.id === active.id);
    if (activeColumn) {
      setActiveColumn(activeColumn);
      return;
    }

    const activeCard = localCards.find(c => c.id === active.id);
    if (activeCard) {
      setActiveCard(activeCard);
      return;
    }
  }

  function onDragOver(event: DragOverEvent) {
    if (!canEdit) return;
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveCard = localCards.some(c => c.id === activeId);
    const isOverCard = localCards.some(c => c.id === overId);
    const isOverColumn = localColumns.some(c => c.id === overId);

    if (!isActiveCard) return;

    if (isActiveCard && isOverCard) {
      const activeIndex = localCards.findIndex((t) => t.id === activeId);
      const overIndex = localCards.findIndex((t) => t.id === overId);
      
      if (activeIndex === -1 || overIndex === -1) return;

      let newCards = [...localCards];
      newCards[activeIndex] = { ...newCards[activeIndex], column_id: localCards[overIndex].column_id };
      setLocalCards(arrayMove(newCards, activeIndex, overIndex));
    }

    if (isActiveCard && isOverColumn) {
      const activeIndex = localCards.findIndex((t) => t.id === activeId);
      const targetCol = overId.toString();
      
      if (activeIndex === -1) return;
      
      if (localCards[activeIndex].column_id === targetCol) return;
      
      let newCards = [...localCards];
      newCards[activeIndex] = { ...newCards[activeIndex], column_id: targetCol };
      
      const targetColFirstIndex = localCards.findIndex(c => c.column_id === targetCol);
      const insertIndex = targetColFirstIndex !== -1 ? targetColFirstIndex : newCards.length - 1;
      
      setLocalCards(arrayMove(newCards, activeIndex, insertIndex));
    }
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveColumn(null);
    setActiveCard(null);

    if (!canEdit) return;

    const { active, over } = event;

    if (!over) {
      if (localCards.some(c => c.id === active.id)) {
        const activeIndex = localCards.findIndex(c => c.id === active.id);
        const originalIndex = cards.findIndex(c => c.id === active.id);
        if (activeIndex !== -1 && originalIndex !== -1) {
          const sourceCol = cards[originalIndex].column_id;
          const currentCol = localCards[activeIndex].column_id;
          if (sourceCol !== currentCol) {
            if (onCardMove) onCardMove(active.id.toString(), sourceCol, currentCol);
            onCardsChange(localCards);
            return;
          }
        }
      }
      setLocalCards(cards);
      return;
    }

    const activeId = active.id;
    const overId = over.id;

    const isColumn = localColumns.some(c => c.id === activeId);
    const isCard = localCards.some(c => c.id === activeId);

    if (isColumn) {
      if (activeId === overId) return;
      const activeColumnIndex = localColumns.findIndex((col) => col.id === activeId);
      const overColumnIndex = localColumns.findIndex((col) => col.id === overId);
      const newColumns = arrayMove(localColumns, activeColumnIndex, overColumnIndex);
      setLocalColumns(newColumns);
      onColumnsChange(newColumns);
      return;
    }

    if (isCard) {
      const activeIndex = localCards.findIndex(c => c.id === activeId);
      const originalIndex = cards.findIndex(c => c.id === activeId);
      
      if (activeIndex === -1 || originalIndex === -1) return;
      
      const sourceCol = cards[originalIndex].column_id;
      const finalTargetCol = localCards[activeIndex].column_id;
      
      if (sourceCol === finalTargetCol && activeId === overId) return;
      
      const isBulk = selectedCardIds.includes(activeId.toString()) && selectedCardIds.length > 1;

      let finalCards = [...localCards];

      if (sourceCol !== finalTargetCol) {
        if (isBulk) {
          finalCards = finalCards.map(c => 
            selectedCardIds.includes(c.id) ? { ...c, column_id: finalTargetCol } : c
          );
          if (onBulkMove) onBulkMove(selectedCardIds, finalTargetCol);
          setSelectedCardIds([]);
        } else {
          if (onCardMove) onCardMove(activeId.toString(), sourceCol, finalTargetCol);
        }
      }
      
      onCardsChange(finalCards);
    }
  }

  return (
    <div className="flex-1 w-full min-h-0 flex flex-col overflow-x-auto overflow-y-hidden custom-scrollbar bg-background">
      <DndContext
        id="kanban-board-dnd-context"
        sensors={sensors}
        collisionDetection={customCollisionDetection}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-6 p-4 sm:p-8 pt-2 min-w-max flex-1 min-h-0 h-full">
          <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
            {localColumns.map((col, idx) => (
              <KanbanColumn
                key={col.id}
                column={col}
                cards={col.sort_by_priority
                  ? localCards.filter((c) => c.column_id === col.id).sort(compareByPriority)
                  : localCards.filter((c) => c.column_id === col.id)
                }
                onCardClick={onCardClick}
                onAddCard={onAddCard}
                onUpdateColumn={onUpdateColumn}
                onDeleteColumn={onDeleteColumn}
                canEdit={canEdit}
                onMoveCardMobile={(cardId, direction) => {
                  const destIdx = direction === 'left' ? idx - 1 : idx + 1;
                  if (destIdx >= 0 && destIdx < localColumns.length) {
                    const destColId = localColumns[destIdx].id;
                    const newCards = cards.map(c => 
                      c.id === cardId ? { ...c, column_id: destColId } : c
                    );
                    onCardsChange(newCards);
                    onCardMove?.(cardId, col.id, destColId);
                  }
                }}
                isFirstColumn={idx === 0}
                isLastColumn={idx === localColumns.length - 1}
                allCards={localCards}
                allColumns={localColumns}
                selectedCardIds={selectedCardIds}
                onToggleSelect={handleToggleSelect}
                onSelectAll={() => handleSelectAllColumnCards(col.id)}
                isBulkDragging={!!(activeCard && selectedCardIds.includes(activeCard.id) && selectedCardIds.length > 1)}
              />
            ))}
          </SortableContext>
          
          {/* Botão de adicionar nova coluna */}
          {canEdit && (
            <button 
              onClick={onAddColumn}
              className="flex-shrink-0 w-[320px] h-[60px] bg-card/50 border border-dashed border-border rounded-2xl flex items-center justify-center text-muted-foreground hover:bg-card hover:text-foreground hover:border-primary/50 transition-all font-medium"
            >
              + Adicionar Coluna
            </button>
          )}
        </div>

        {createPortal(
          <DragOverlay dropAnimation={dropAnimationConfig}>
            {activeColumn && (
              <KanbanColumn
                column={activeColumn}
                cards={cards.filter((c) => c.column_id === activeColumn.id)}
                onCardClick={onCardClick}
                onAddCard={onAddCard}
                onUpdateColumn={onUpdateColumn}
                onDeleteColumn={onDeleteColumn}
                canEdit={canEdit}
                allCards={cards}
                allColumns={columns}
              />
            )}
            {activeCard && (
                <div className="relative cursor-grabbing" style={{ filter: 'drop-shadow(0 20px 30px rgb(0 0 0 / 0.2))' }}>
                  <KanbanCard
                    card={activeCard}
                    onClick={onCardClick}
                    isOverlay
                    columnColor={columns.find(c => c.id === activeCard.column_id)?.color}
                    selectionCount={selectedCardIds.includes(activeCard.id) ? selectedCardIds.length : undefined}
                  />
                </div>
            )}
          </DragOverlay>,
          document.body
        )}
      </DndContext>

      {/* Floating Action Bar (Bulk Actions) */}
      <AnimatePresence>
        {selectedCardIds.length > 0 && (
          <motion.div 
            initial={{ y: 100, scale: 0.3, borderRadius: 100, opacity: 0 }}
            animate={{ y: 0, scale: 1, borderRadius: 9999, opacity: 1 }}
            exit={{ y: 100, scale: 0.3, borderRadius: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 15, stiffness: 300 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-md border border-border shadow-2xl px-6 py-3 flex items-center gap-4 z-[100] overflow-hidden whitespace-nowrap"
          >
            <div className="flex items-center gap-2 border-r border-border/60 pr-4">
              <div className="bg-primary text-primary-foreground text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {selectedCardIds.length}
              </div>
              <span className="text-sm font-medium text-foreground">
                cartões selecionados
              </span>
            </div>
            
            <button 
              onClick={() => setSelectedCardIds([])}
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </button>

            {onBulkDelete && canEdit && (
              <button
                onClick={() => {
                  onBulkDelete(selectedCardIds);
                  setSelectedCardIds([]);
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-destructive hover:bg-destructive/10 px-3 py-1.5 rounded-full transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/></svg>
                Excluir
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
