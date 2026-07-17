import { format, parseISO, isSameDay, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { KanbanCardType } from '@/types/kanban';
import { getEventsForDay } from '@/utils/calendar';
import { CalendarEvent } from './CalendarEvent';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useRef } from 'react';

interface DayViewProps {
  currentDate: Date;
  cards: KanbanCardType[];
  onEventClick: (card: KanbanCardType) => void;
  onEventDrop: (cardId: string, date: Date) => void;
  onPrevDay: () => void;
  onNextDay: () => void;
}

export function DayView({ currentDate, cards, onEventClick, onEventDrop, onPrevDay, onNextDay }: DayViewProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const isToday = isSameDay(currentDate, new Date());
  const touchStartX = useRef<number | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, hour?: number) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('text/plain');
    if (cardId) {
      const newDate = new Date(currentDate);
      if (hour !== undefined) {
        newDate.setHours(hour, 0, 0, 0);
      }
      onEventDrop(cardId, newDate);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    
    if (Math.abs(diff) > 50) { // Threshold
      if (diff > 0) {
        onNextDay();
      } else {
        onPrevDay();
      }
    }
    touchStartX.current = null;
  };

  const dayEvents = getEventsForDay(cards, currentDate);
  const allDayEvents = dayEvents.filter(e => !e.due_date?.includes('T') || e.due_date.endsWith('T00:00:00.000Z'));
  const timedEvents = dayEvents.filter(e => e.due_date?.includes('T') && !e.due_date.endsWith('T00:00:00.000Z'));

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {/* Header (Dia) */}
      <div className="flex border-b border-border/50 bg-muted/30 shrink-0 pl-12 sm:pl-16 relative">
        <button onClick={onPrevDay} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-muted"><ChevronLeft size={20} /></button>
        <button onClick={onNextDay} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-muted"><ChevronRight size={20} /></button>
        
        <div className="flex-1 py-4 text-center border-l border-border/40 flex flex-col items-center justify-center gap-1">
          <div className="text-sm font-semibold text-muted-foreground capitalize">
            {format(currentDate, 'EEEE', { locale: ptBR })}
          </div>
          <div className={`
            inline-flex w-12 h-12 items-center justify-center rounded-full text-2xl font-medium
            ${isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'}
          `}>
            {format(currentDate, 'd')}
          </div>
        </div>
      </div>

      {/* Grade de Horas */}
      <div className="flex-1 overflow-y-auto custom-scrollbar relative">
        <div className="flex min-h-[1440px]">
          {/* Coluna de Horas */}
          <div className="w-12 sm:w-16 shrink-0 border-r border-border/50 bg-background relative z-10">
            {hours.map(hour => (
              <div key={hour} className="h-[60px] flex items-start justify-end pr-2 py-1 text-xs text-muted-foreground">
                {hour === 0 ? '' : `${hour.toString().padStart(2, '0')}:00`}
              </div>
            ))}
          </div>

          {/* Coluna do Dia */}
          <div 
            className="flex-1 border-l border-border/20 relative"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e)}
          >
            {/* Linhas Horizontais de cada hora */}
            {hours.map(hour => (
              <div 
                key={hour} 
                className="h-[60px] border-b border-border/20 w-full"
                onDragOver={handleDragOver}
                onDrop={(e) => {
                  e.stopPropagation();
                  handleDrop(e, hour);
                }}
              />
            ))}

            {/* Renderizar Eventos All Day no topo */}
            <div className="absolute top-0 left-0 w-full px-2 z-20 flex flex-col gap-1 mt-1 pointer-events-none">
              {allDayEvents.map(event => (
                <div key={event.id} className="pointer-events-auto">
                  <CalendarEvent event={event} onClick={onEventClick} />
                </div>
              ))}
            </div>

            {/* Renderizar Eventos com Hora (Posicionamento Absoluto e Lado a Lado) */}
            {(() => {
              // Cálculo de layout para eventos que se sobrepõem
              const sortedTimed = [...timedEvents].sort((a, b) => parseISO(a.due_date!).getTime() - parseISO(b.due_date!).getTime());
              const layouts = sortedTimed.map(event => {
                const d = parseISO(event.due_date!);
                const startMins = d.getHours() * 60 + d.getMinutes();
                return { event, startMins, endMins: startMins + 60, col: 0, maxCol: 1 };
              });

              const groups: typeof layouts[] = [];
              let currentGroup: typeof layouts = [];

              layouts.forEach(ev => {
                if (currentGroup.length === 0) {
                  currentGroup.push(ev);
                } else {
                  const groupMaxEnd = Math.max(...currentGroup.map(e => e.endMins));
                  if (ev.startMins < groupMaxEnd) {
                    currentGroup.push(ev);
                  } else {
                    groups.push(currentGroup);
                    currentGroup = [ev];
                  }
                }
              });
              if (currentGroup.length > 0) groups.push(currentGroup);

              const layoutedEvents: typeof layouts = [];
              groups.forEach(group => {
                const cols: typeof group[] = [];
                group.forEach(ev => {
                  let placed = false;
                  for (let i = 0; i < cols.length; i++) {
                    const col = cols[i];
                    const lastEv = col[col.length - 1];
                    if (ev.startMins >= lastEv.endMins) {
                      col.push(ev);
                      ev.col = i;
                      placed = true;
                      break;
                    }
                  }
                  if (!placed) {
                    ev.col = cols.length;
                    cols.push([ev]);
                  }
                });

                const numCols = cols.length;
                group.forEach(ev => {
                  ev.maxCol = numCols;
                  layoutedEvents.push(ev);
                });
              });

              return layoutedEvents.map(({ event, startMins, col, maxCol }) => {
                const topPixels = startMins;
                const heightPixels = 60; // 1 hora
                const widthPercentage = 100 / maxCol;
                const leftPercentage = col * widthPercentage;

                return (
                  <div 
                    key={event.id}
                    className="absolute z-10 p-0.5"
                    style={{ 
                      top: `${topPixels}px`, 
                      height: `${heightPixels}px`,
                      left: `${leftPercentage}%`,
                      width: `${widthPercentage}%`
                    }}
                  >
                      <div className="w-full h-full">
                        <CalendarEvent event={event} onClick={onEventClick} />
                      </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
