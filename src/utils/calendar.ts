import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  format,
  parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { KanbanCardType } from '@/types/kanban';

export function getMonthDays(currentDate: Date) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  
  // start calendar from the first day of the week (Sunday)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  return eachDayOfInterval({
    start: startDate,
    end: endDate
  });
}

export function getWeekDays(currentDate: Date) {
  const startDate = startOfWeek(currentDate, { weekStartsOn: 0 });
  const endDate = endOfWeek(currentDate, { weekStartsOn: 0 });
  
  return eachDayOfInterval({
    start: startDate,
    end: endDate
  });
}

export function getEventsForDay(events: KanbanCardType[], date: Date) {
  return events.filter(event => {
    if (!event.due_date) return false;
    // Parse the date handling timezone properly
    // The due_date from DB usually comes as "YYYY-MM-DD" or ISO string
    const eventDate = parseISO(event.due_date);
    return isSameDay(eventDate, date);
  });
}

export function getUpcomingEvents(events: KanbanCardType[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return events
    .filter(event => {
      if (!event.due_date) return false;
      const eventDate = parseISO(event.due_date);
      return eventDate >= today;
    })
    .sort((a, b) => parseISO(a.due_date!).getTime() - parseISO(b.due_date!).getTime());
}

export function formatMonthYear(date: Date) {
  const str = format(date, 'MMMM yyyy', { locale: ptBR });
  return str.charAt(0).toUpperCase() + str.slice(1);
}
