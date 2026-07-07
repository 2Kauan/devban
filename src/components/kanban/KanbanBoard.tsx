import { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core';
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
}: KanbanBoardProps) {
  const [activeColumn, setActiveColumn] = useState<KanbanColumnType | null>(null);
  const [activeCard, setActiveCard] = useState<KanbanCardType | null>(null);

  const columnIds = useMemo(() => columns.map((col) => col.id), [columns]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

    // Cenário 1: Soltando um card sobre outro card
    if (isActiveCard && isOverCard) {
      const activeIndex = cards.findIndex((t) => t.id === activeId);
      const overIndex = cards.findIndex((t) => t.id === overId);

      if (cards[activeIndex].column_id !== cards[overIndex].column_id) {
        // Movendo para outra coluna
        const sourceCol = cards[activeIndex].column_id;
        const targetCol = cards[overIndex].column_id;
        const newCards = [...cards];
        newCards[activeIndex].column_id = targetCol;
        const reordered = arrayMove(newCards, activeIndex, overIndex);
        onCardsChange(reordered);
        if (onCardMove) onCardMove(activeId.toString(), sourceCol, targetCol);
      } else {
        // Reordenando na mesma coluna
        const reordered = arrayMove(cards, activeIndex, overIndex);
        onCardsChange(reordered);
      }
    }

    // Cenário 2: Soltando um card sobre uma coluna vazia
    if (isActiveCard && isOverColumn) {
      const activeIndex = cards.findIndex((t) => t.id === activeId);
      if (cards[activeIndex].column_id !== overId.toString()) {
        const sourceCol = cards[activeIndex].column_id;
        const targetCol = overId.toString();
        const newCards = [...cards];
        newCards[activeIndex].column_id = targetCol;
        onCardsChange(arrayMove(newCards, activeIndex, activeIndex));
        if (onCardMove) onCardMove(activeId.toString(), sourceCol, targetCol);
      }
    }
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveColumn(null);
    setActiveCard(null);

    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveColumn = active.data.current?.type === 'Column';
    if (isActiveColumn) {
      const activeColumnIndex = columns.findIndex((col) => col.id === activeId);
      const overColumnIndex = columns.findIndex((col) => col.id === overId);
      
      onColumnsChange(arrayMove(columns, activeColumnIndex, overColumnIndex));
    }
  }

  return (
    <div className="flex-1 flex overflow-x-auto custom-scrollbar overflow-y-hidden pb-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-6 h-full px-2">
          <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
            {columns.map((col) => (
              <KanbanColumn
                key={col.id}
                column={col}
                cards={cards.filter((c) => c.column_id === col.id)}
                onCardClick={onCardClick}
                onAddCard={onAddCard}
                onUpdateColumn={onUpdateColumn}
                onDeleteColumn={onDeleteColumn}
                canEdit={canEdit}
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
          <DragOverlay>
            {activeColumn && (
              <KanbanColumn
                column={activeColumn}
                cards={cards.filter((c) => c.column_id === activeColumn.id)}
                onCardClick={onCardClick}
                onAddCard={onAddCard}
                onUpdateColumn={onUpdateColumn}
                onDeleteColumn={onDeleteColumn}
                canEdit={canEdit}
              />
            )}
            {activeCard && (
              <KanbanCard
                card={activeCard}
                onClick={onCardClick}
                isOverlay
              />
            )}
          </DragOverlay>,
          document.body
        )}
      </DndContext>
    </div>
  );
}
