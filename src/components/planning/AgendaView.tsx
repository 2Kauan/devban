import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { KanbanCardType } from '@/types/kanban';
import { CalendarEvent } from './CalendarEvent';
import { List } from 'lucide-react';

interface AgendaViewProps {
  cards: KanbanCardType[];
  onEventClick: (card: KanbanCardType) => void;
}

export function AgendaView({ cards, onEventClick }: AgendaViewProps) {
  const sortedEvents = useMemo(() => {
    return [...cards]
      .filter(card => card.due_date)
      .sort((a, b) => parseISO(a.due_date!).getTime() - parseISO(b.due_date!).getTime());
  }, [cards]);

  // Group events by day
  const groupedEvents = useMemo(() => {
    const groups: Record<string, KanbanCardType[]> = {};
    sortedEvents.forEach(event => {
      const dateKey = event.due_date!.split('T')[0]; // YYYY-MM-DD
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(event);
    });
    return groups;
  }, [sortedEvents]);

  if (sortedEvents.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
        <List className="w-12 h-12 mb-4 opacity-20" />
        <p>Nenhuma tarefa agendada encontrada.</p>
        <p className="text-sm mt-2 opacity-70">Adicione datas de entrega às suas tarefas no Kanban para vê-las aqui.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-8 bg-background">
      <div className="max-w-4xl mx-auto space-y-8">
        {Object.entries(groupedEvents).map(([dateStr, dayEvents]) => {
          const dateObj = parseISO(dateStr);
          return (
            <div key={dateStr} className="flex flex-col sm:flex-row gap-4 sm:gap-8">
              {/* Data lateral */}
              <div className="sm:w-32 shrink-0 flex flex-col sm:items-end">
                <span className="text-sm font-semibold text-muted-foreground capitalize">
                  {format(dateObj, 'EEEE', { locale: ptBR })}
                </span>
                <span className="text-2xl font-light text-foreground">
                  {format(dateObj, 'dd')}
                </span>
                <span className="text-xs text-muted-foreground uppercase">
                  {format(dateObj, 'MMM, yyyy', { locale: ptBR })}
                </span>
              </div>
              
              {/* Lista de eventos */}
              <div className="flex-1 space-y-2 relative before:absolute before:left-0 before:top-2 before:bottom-2 before:w-px before:bg-border/50 pl-4 sm:pl-6 before:-ml-4 sm:before:-ml-6">
                {dayEvents.map(event => (
                  <div key={event.id} className="relative">
                    <div className="absolute -left-[21px] sm:-left-[29px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-border" />
                    <CalendarEvent event={event} onClick={onEventClick} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
