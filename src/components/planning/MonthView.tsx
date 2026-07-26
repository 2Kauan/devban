import { useMemo, useState } from 'react';
import { isSameMonth, isSameDay, format } from 'date-fns';
import { AnimatePresence } from 'framer-motion';
import type { KanbanCardType } from '@/types/kanban';
import { getMonthDays, getEventsForDay } from '@/utils/calendar';
import { CalendarEvent } from './CalendarEvent';

interface MonthViewProps {
  currentDate: Date;
  cards: KanbanCardType[];
  onEventClick: (card: KanbanCardType) => void;
  onDayClick: (date: Date) => void;
  onEventDrop: (cardId: string, date: Date) => void;
  highlightedCardId?: string | null;
}

export function MonthView({ currentDate, cards, onEventClick, onDayClick, onEventDrop, highlightedCardId }: MonthViewProps) {
  const days = useMemo(() => getMonthDays(currentDate), [currentDate]);
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  
  const weekDaysHeader = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    setHoveredDay(null);
    const cardId = e.dataTransfer.getData('text/plain');
    if (cardId) {
      onEventDrop(cardId, date);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-y-auto custom-scrollbar pb-8">
      {/* Header (Dias da Semana) */}
      <div className="grid grid-cols-7 border-b border-border/50 bg-muted/30 shrink-0 sticky top-0 z-10 backdrop-blur-sm">
        {weekDaysHeader.map(day => (
          <div key={day} className="py-2 text-center text-xs font-semibold text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Grid Principal */}
      <div className="flex-1 grid grid-cols-7 grid-rows-6 min-h-[580px]">
        {days.map((day, i) => {
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, new Date());
          const dayEvents = getEventsForDay(cards, day);
          const isHovered = hoveredDay === day.toISOString();

          return (
            <div
              key={day.toISOString()}
              onDragOver={handleDragOver}
              onDragEnter={() => setHoveredDay(day.toISOString())}
              onDragLeave={(e) => {
                if (!e.relatedTarget || !e.currentTarget.contains(e.relatedTarget as Node)) {
                  setHoveredDay(null);
                }
              }}
              onDrop={(e) => handleDrop(e, day)}
              onClick={() => onDayClick(day)}
              className={`
                min-h-[110px] p-1 sm:p-2 border-r border-b border-border/40 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col
                ${isCurrentMonth ? 'bg-background hover:bg-muted/10' : 'bg-muted/5 hover:bg-muted/20'}
                ${i % 7 === 6 ? 'border-r-0' : ''}
                ${isHovered ? 'scale-[1.05] border-primary z-10 shadow-lg bg-muted/20' : ''}
              `}
            >
              {/* Day Number */}
              <div className="flex justify-between items-start mb-1 shrink-0">
                <span className={`
                  w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium
                  ${isToday ? 'bg-primary text-primary-foreground' : isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/50'}
                `}>
                  {format(day, 'd')}
                </span>
              </div>

              {/* Events list wrapper with Top/Bottom Blur */}
              <div className="flex-1 min-h-0 relative">
                {/* Top Fade */}
                <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-b from-background to-transparent pointer-events-none z-10" />
                
                {/* Scrollable list */}
                <div 
                  className="h-full overflow-y-auto custom-scrollbar flex flex-col gap-1 pr-0.5"
                  onClick={(e) => {
                    // Impede o clique na lista de tarefas de abrir o DayDrawer
                    e.stopPropagation();
                  }}
                >
                  <AnimatePresence>
                    {dayEvents.map(event => (
                      <div 
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(event);
                        }}
                      >
                        <CalendarEvent 
                          event={event} 
                          onClick={onEventClick} 
                          isHighlighted={event.id === highlightedCardId}
                        />
                      </div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Bottom Fade */}
                <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-t from-background to-transparent pointer-events-none z-10" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
