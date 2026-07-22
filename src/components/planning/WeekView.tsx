import { useMemo, useState } from 'react';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { KanbanCardType } from '@/types/kanban';
import { getWeekDays, getEventsForDay } from '@/utils/calendar';
import { CalendarEvent } from './CalendarEvent';
import { Clock } from 'lucide-react';

interface WeekViewProps {
  currentDate: Date;
  cards: KanbanCardType[];
  onEventClick: (card: KanbanCardType) => void;
  onDayClick: (date: Date) => void;
  onEventDrop: (cardId: string, date: Date) => void;
}

export function WeekView({ currentDate, cards, onEventClick, onDayClick, onEventDrop }: WeekViewProps) {
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
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
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 bg-background">
      <div className="max-w-5xl mx-auto bg-card border border-border/40 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40">
                <th className="p-4 font-semibold text-sm text-muted-foreground w-1/3 min-w-[200px]">Dia</th>
                <th className="p-4 font-semibold text-sm text-muted-foreground w-1/6 min-w-[120px]">Horário</th>
                <th className="p-4 font-semibold text-sm text-muted-foreground min-w-[250px]">Tarefa / Evento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {weekDays.map((day) => {
                const isToday = isSameDay(day, new Date());
                const dayEvents = getEventsForDay(cards, day);
                const isHovered = hoveredDay === day.toISOString();
                
                // Sort events: All Day first, then by time
                const sortedEvents = [...dayEvents].sort((a, b) => {
                  const aIsAllDay = !a.due_date?.includes('T') || a.due_date.endsWith('T00:00:00.000Z');
                  const bIsAllDay = !b.due_date?.includes('T') || b.due_date.endsWith('T00:00:00.000Z');
                  
                  if (aIsAllDay && !bIsAllDay) return -1;
                  if (!aIsAllDay && bIsAllDay) return 1;
                  
                  const aTime = a.due_date?.includes('T') ? a.due_date.split('T')[1] : '';
                  const bTime = b.due_date?.includes('T') ? b.due_date.split('T')[1] : '';
                  return aTime.localeCompare(bTime);
                });

                if (sortedEvents.length === 0) {
                  return (
                    <tr 
                      key={day.toISOString()} 
                      className={`hover:bg-muted/10 transition-all duration-200 cursor-pointer ${isToday ? 'bg-primary/5' : ''} ${isHovered ? 'scale-[1.01] border-l-2 border-l-primary bg-muted/25 z-10 shadow-md relative' : ''}`}
                      onClick={() => onDayClick(day)}
                      onDragOver={handleDragOver}
                      onDragEnter={() => setHoveredDay(day.toISOString())}
                      onDragLeave={(e) => {
                        if (!e.relatedTarget || !e.currentTarget.contains(e.relatedTarget as Node)) {
                          setHoveredDay(null);
                        }
                      }}
                      onDrop={(e) => handleDrop(e, day)}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`
                            flex flex-col items-center justify-center w-10 h-10 rounded-lg border shrink-0
                            ${isToday ? 'bg-primary border-primary text-primary-foreground' : 'bg-muted/30 border-border/50 text-foreground'}
                          `}>
                            <span className="text-[10px] font-bold leading-none uppercase">
                              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][day.getDay()]}
                            </span>
                            <span className="text-sm font-semibold mt-0.5">
                              {format(day, 'dd')}
                            </span>
                          </div>
                          <span className={`text-sm font-medium ${isToday ? 'text-primary font-semibold' : 'text-foreground'} hidden sm:inline`}>
                            {format(day, "dd 'de' MMMM", { locale: ptBR })}
                          </span>
                          <span className={`text-sm font-medium ${isToday ? 'text-primary font-semibold' : 'text-foreground'} sm:hidden`}>
                            {format(day, "dd/MM")}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground" colSpan={2}>
                        <span className="italic text-xs text-muted-foreground/60">Nenhuma tarefa agendada para este dia</span>
                      </td>
                    </tr>
                  );
                }

                return sortedEvents.map((event, index) => {
                  let timeStr = 'Dia Todo';
                  if (event.due_date && event.due_date.includes('T')) {
                    const d = new Date(event.due_date);
                    if (!isNaN(d.getTime())) {
                      const h = d.getHours().toString().padStart(2, '0');
                      const m = d.getMinutes().toString().padStart(2, '0');
                      if (h !== '00' || m !== '00') {
                        timeStr = `${h}:${m}`;
                      }
                    }
                  }

                  return (
                    <tr 
                      key={event.id}
                      className={`hover:bg-muted/10 transition-all duration-200 cursor-pointer ${isToday ? 'bg-primary/5' : ''} ${isHovered ? 'scale-[1.01] border-l-2 border-l-primary bg-muted/25 z-10 shadow-md relative' : ''}`}
                      onDragOver={handleDragOver}
                      onDragEnter={() => setHoveredDay(day.toISOString())}
                      onDragLeave={(e) => {
                        if (!e.relatedTarget || !e.currentTarget.contains(e.relatedTarget as Node)) {
                          setHoveredDay(null);
                        }
                      }}
                      onDrop={(e) => handleDrop(e, day)}
                    >
                      {index === 0 && (
                        <td className="p-4 align-top border-r border-border/10" rowSpan={sortedEvents.length} onClick={() => onDayClick(day)}>
                          <div className="flex items-center gap-3">
                            <div className={`
                              flex flex-col items-center justify-center w-10 h-10 rounded-lg border shrink-0
                              ${isToday ? 'bg-primary border-primary text-primary-foreground' : 'bg-muted/30 border-border/50 text-foreground'}
                            `}>
                              <span className="text-[10px] font-bold leading-none uppercase">
                                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][day.getDay()]}
                              </span>
                              <span className="text-sm font-semibold mt-0.5">
                                {format(day, 'dd')}
                              </span>
                            </div>
                            <span className={`text-sm font-medium ${isToday ? 'text-primary font-semibold' : 'text-foreground'} hidden sm:inline`}>
                              {format(day, "dd 'de' MMMM", { locale: ptBR })}
                            </span>
                            <span className={`text-sm font-medium ${isToday ? 'text-primary font-semibold' : 'text-foreground'} sm:hidden`}>
                              {format(day, "dd/MM")}
                            </span>
                          </div>
                        </td>
                      )}
                      <td className="p-4 align-middle">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground/70" />
                          <span>{timeStr}</span>
                        </div>
                      </td>
                      <td className="p-4 align-middle">
                        <CalendarEvent event={event} onClick={onEventClick} />
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
