import { useMemo } from 'react';
import { isSameDay, parseISO } from 'date-fns';
import type { KanbanCardType } from '@/types/kanban';
import { getWeekDays, getEventsForDay } from '@/utils/calendar';
import { CalendarEvent } from './CalendarEvent';

interface WeekViewProps {
  currentDate: Date;
  cards: KanbanCardType[];
  onEventClick: (card: KanbanCardType) => void;
  onDayClick: (date: Date) => void;
  onEventDrop: (cardId: string, date: Date) => void;
}

export function WeekView({ currentDate, cards, onEventClick, onDayClick, onEventDrop }: WeekViewProps) {
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, date: Date, hour?: number) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('text/plain');
    if (cardId) {
      // Create a new date with the specific hour if dropped on a time slot
      const newDate = new Date(date);
      if (hour !== undefined) {
        newDate.setHours(hour, 0, 0, 0);
      }
      onEventDrop(cardId, newDate);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      {/* Header (Dias da Semana) */}
      <div className="flex border-b border-border/50 bg-muted/30 shrink-0 pl-12 sm:pl-16">
        {weekDays.map(day => {
          const isToday = isSameDay(day, new Date());
          return (
            <div 
              key={day.toISOString()} 
              className="flex-1 py-3 text-center border-l border-border/40"
            >
              <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][day.getDay()]}
              </div>
              <div className={`
                inline-flex w-8 h-8 items-center justify-center rounded-full text-lg font-medium
                ${isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'}
              `}>
                {day.getDate()}
              </div>
            </div>
          );
        })}
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

          {/* Colunas dos Dias */}
          <div className="flex-1 flex">
            {weekDays.map(day => {
              const dayEvents = getEventsForDay(cards, day);
              
              // Separar eventos All Day (sem hora) de eventos com hora
              const allDayEvents = dayEvents.filter(e => !e.due_date?.includes('T') || e.due_date.endsWith('T00:00:00.000Z'));
              const timedEvents = dayEvents.filter(e => e.due_date?.includes('T') && !e.due_date.endsWith('T00:00:00.000Z'));

              return (
                <div 
                  key={day.toISOString()} 
                  className="flex-1 border-l border-border/20 relative min-w-[100px]"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, day)}
                  onClick={() => onDayClick(day)}
                >
                  {/* Linhas Horizontais de cada hora */}
                  {hours.map(hour => (
                    <div 
                      key={hour} 
                      className="h-[60px] border-b border-border/20 w-full"
                      onDrop={(e) => {
                        e.stopPropagation();
                        handleDrop(e, day, hour);
                      }}
                    />
                  ))}

                  {/* Renderizar Eventos All Day no topo (fixo) */}
                  <div className="absolute top-0 left-0 w-full px-1 z-20 flex flex-col gap-1 mt-1">
                    {allDayEvents.map(event => (
                      <CalendarEvent key={event.id} event={event} onClick={onEventClick} />
                    ))}
                  </div>

                  {/* Renderizar Eventos com Hora (Posicionamento Absoluto) */}
                  {timedEvents.map(event => {
                    const eventDate = parseISO(event.due_date!);
                    const startHour = eventDate.getHours();
                    const startMinute = eventDate.getMinutes();
                    // Assumimos 1 hora de duração padrão
                    const durationMinutes = 60; 
                    
                    const topPixels = (startHour * 60) + startMinute;
                    const heightPixels = durationMinutes;

                    return (
                      <div 
                        key={event.id}
                        className="absolute left-1 right-1 z-10"
                        style={{ top: `${topPixels}px`, height: `${heightPixels}px` }}
                      >
                         <CalendarEvent event={event} onClick={onEventClick} />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
