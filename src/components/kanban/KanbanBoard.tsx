import { useState, useMemo, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  closestCenter,
  rectIntersection,
  getFirstCollision,
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

  // Sincroniza localCards com cards do pai APENAS quando o pai envia dados novos.
  // NÃO depende de activeCard/activeColumn para evitar flash-back:
  // (activeCard vai pra null ANTES do pai atualizar cards → flash para posição antiga)
  useEffect(() => {
    if (!activeCard && !activeColumn) {
      setLocalCards(cards);
    }
  }, [cards]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleSelect = (cardId: string) => {
    setSelectedCardIds(prev => 
      prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]
    );
  };

  const columnIds = useMemo(() => columns.map((col) => col.id), [columns]);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
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
    if (!canEdit) return;
    if (event.active.data.current?.type === 'Column') {
      setActiveColumn(event.active.data.current.column);
      return;
    }

    if (event.active.data.current?.type === 'Card') {
      setActiveCard(event.active.data.current.card);
      return;
    }
  }

  function onDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveCard = active.data.current?.type === 'Card';
    const isOverCard = over.data.current?.type === 'Card';
    const isOverColumn = over.data.current?.type === 'Column';

    if (!isActiveCard) return;

    if (isActiveCard && isOverCard) {
      const activeIndex = localCards.findIndex((t) => t.id === activeId);
      const overIndex = localCards.findIndex((t) => t.id === overId);
      
      let newCards = [...localCards];
      // Clone the object to avoid mutating the original reference
      newCards[activeIndex] = { ...newCards[activeIndex], column_id: localCards[overIndex].column_id };
      setLocalCards(arrayMove(newCards, activeIndex, overIndex));
    }

    if (isActiveCard && isOverColumn) {
      const activeIndex = localCards.findIndex((t) => t.id === activeId);
      const targetCol = overId.toString();
      
      let newCards = [...localCards];
      newCards[activeIndex] = { ...newCards[activeIndex], column_id: targetCol };
      
      // Encontra o primeiro cartão daquela coluna para colocar o novo no topo
      const targetColFirstIndex = localCards.findIndex(c => c.column_id === targetCol);
      // Se a coluna estiver vazia, vai para o final do array. Se não, vai para o topo da coluna.
      const insertIndex = targetColFirstIndex !== -1 ? targetColFirstIndex : newCards.length - 1;
      
      setLocalCards(arrayMove(newCards, activeIndex, insertIndex));
    }
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveColumn(null);
    setActiveCard(null);

    const { active, over } = event;

    // Se não tem alvo (over), commita o estado que onDragOver já calculou
    // Isso garante que o card fique onde foi visualmente posicionado
    if (!over) {
      if (active.data.current?.type === 'Card') {
        const activeIndex = localCards.findIndex(c => c.id === active.id);
        const originalIndex = cards.findIndex(c => c.id === active.id);
        if (activeIndex !== -1 && originalIndex !== -1) {
          const sourceCol = cards[originalIndex].column_id;
          const currentCol = localCards[activeIndex].column_id;
          if (sourceCol !== currentCol) {
            // O card já foi movido pelo onDragOver, commita a mudança
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

    if (active.data.current?.type === 'Column') {
      if (activeId === overId) return;
      const activeColumnIndex = columns.findIndex((col) => col.id === activeId);
      const overColumnIndex = columns.findIndex((col) => col.id === overId);
      onColumnsChange(arrayMove(columns, activeColumnIndex, overColumnIndex));
      return;
    }

    if (active.data.current?.type === 'Card') {
      const activeIndex = localCards.findIndex(c => c.id === activeId);
      const originalIndex = cards.findIndex(c => c.id === activeId);
      
      if (activeIndex === -1 || originalIndex === -1) return;
      
      const sourceCol = cards[originalIndex].column_id;
      const finalTargetCol = localCards[activeIndex].column_id;
      
      // Se não mudou de coluna e foi solto no mesmo lugar, não faz nada
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
    <div className="flex-1 w-full h-full min-h-0 flex flex-col overflow-x-auto overflow-y-hidden custom-scrollbar bg-background">
      <DndContext
        sensors={sensors}
        collisionDetection={customCollisionDetection}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-6 p-4 sm:p-8 pt-2 min-w-max flex-1 min-h-0 h-full">
          <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
            {columns.map((col, idx) => (
              <KanbanColumn
                key={col.id}
                column={col}
                cards={localCards.filter((c) => c.column_id === col.id)}
                onCardClick={onCardClick}
                onAddCard={onAddCard}
                onUpdateColumn={onUpdateColumn}
                onDeleteColumn={onDeleteColumn}
                canEdit={canEdit}
                onMoveCardMobile={(cardId, direction) => {
                  const destIdx = direction === 'left' ? idx - 1 : idx + 1;
                  if (destIdx >= 0 && destIdx < columns.length) {
                    const destColId = columns[destIdx].id;
                    const newCards = cards.map(c => 
                      c.id === cardId ? { ...c, column_id: destColId } : c
                    );
                    onCardsChange(newCards);
                    onCardMove?.(cardId, col.id, destColId);
                  }
                }}
                isFirstColumn={idx === 0}
                isLastColumn={idx === columns.length - 1}
                allCards={cards}
                allColumns={columns}
                selectedCardIds={selectedCardIds}
                onToggleSelect={handleToggleSelect}
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
                {/* Background stacked cards for bulk drag */}
                {selectedCardIds.includes(activeCard.id) && selectedCardIds.length > 1 && (
                  <>
                    <div 
                      className="absolute inset-0 bg-card rounded-lg border border-border shadow-md pointer-events-none"
                      style={{
                        transform: `translate(4px, 4px) rotate(2deg)`,
                        zIndex: 1
                      }}
                    />
                    {selectedCardIds.length > 2 && (
                      <div 
                        className="absolute inset-0 bg-card rounded-lg border border-border shadow-md pointer-events-none"
                        style={{
                          transform: `translate(8px, 8px) rotate(4deg)`,
                          zIndex: 0
                        }}
                      />
                    )}
                  </>
                )}
                
                {/* Main dragged card */}
                <div className="relative z-10">
                  <KanbanCard
                    card={activeCard}
                    onClick={onCardClick}
                    isOverlay
                    columnColor={columns.find(c => c.id === activeCard.column_id)?.color}
                    selectionCount={selectedCardIds.includes(activeCard.id) ? selectedCardIds.length : undefined}
                  />
                </div>
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
            className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-md border border-border shadow-2xl px-6 py-3 flex items-center gap-4 z-50 overflow-hidden whitespace-nowrap"
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
