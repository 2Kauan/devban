import { format, parseISO, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { KanbanCardType } from '@/types/kanban';
import { getEventsForDay } from '@/utils/calendar';
import { CalendarEvent } from './CalendarEvent';

interface DayViewProps {
  currentDate: Date;
  cards: KanbanCardType[];
  onEventClick: (card: KanbanCardType) => void;
  onEventDrop: (cardId: string, date: Date) => void;
}

export function DayView({ currentDate, cards, onEventClick, onEventDrop }: DayViewProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const isToday = isSameDay(currentDate, new Date());

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

  const dayEvents = getEventsForDay(cards, currentDate);
  const allDayEvents = dayEvents.filter(e => !e.due_date?.includes('T') || e.due_date.endsWith('T00:00:00.000Z'));
  const timedEvents = dayEvents.filter(e => e.due_date?.includes('T') && !e.due_date.endsWith('T00:00:00.000Z'));

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      {/* Header (Dia) */}
      <div className="flex border-b border-border/50 bg-muted/30 shrink-0 pl-12 sm:pl-16">
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
                onDrop={(e) => {
                  e.stopPropagation();
                  handleDrop(e, hour);
                }}
              />
            ))}

            {/* Renderizar Eventos All Day no topo */}
            <div className="absolute top-0 left-0 w-full px-2 z-20 flex flex-col gap-1 mt-1">
              {allDayEvents.map(event => (
                <CalendarEvent key={event.id} event={event} onClick={onEventClick} />
              ))}
            </div>

            {/* Renderizar Eventos com Hora (Posicionamento Absoluto) */}
            {timedEvents.map(event => {
              const eventDate = parseISO(event.due_date!);
              const startHour = eventDate.getHours();
              const startMinute = eventDate.getMinutes();
              const durationMinutes = 60; 
              
              const topPixels = (startHour * 60) + startMinute;
              const heightPixels = durationMinutes;

              return (
                <div 
                  key={event.id}
                  className="absolute left-2 right-2 z-10"
                  style={{ top: `${topPixels}px`, height: `${heightPixels}px` }}
                >
                    <CalendarEvent event={event} onClick={onEventClick} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
