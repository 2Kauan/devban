import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Calendar as CalendarIcon } from 'lucide-react';
import type { KanbanCardType } from '@/types/kanban';
import { getEventsForDay } from '@/utils/calendar';
import { CalendarEvent } from './CalendarEvent';

interface DayDrawerProps {
  isOpen: boolean;
  date: Date | null;
  onClose: () => void;
  cards: KanbanCardType[];
  onEventClick: (card: KanbanCardType) => void;
  onNewTask: (date: Date) => void;
}

export function DayDrawer({ isOpen, date, onClose, cards, onEventClick, onNewTask }: DayDrawerProps) {
  if (!date) return null;

  const dayEvents = getEventsForDay(cards, date);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop (Mobile only) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.5 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-card border-l border-border shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/50 shrink-0">
              <div className="flex items-center gap-3 text-foreground">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <span className="text-lg font-bold">{format(date, 'd')}</span>
                </div>
                <div>
                  <h3 className="font-semibold capitalize">
                    {format(date, 'EEEE', { locale: ptBR })}
                  </h3>
                  <p className="text-xs text-muted-foreground uppercase">
                    {format(date, 'MMMM, yyyy', { locale: ptBR })}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => onNewTask(date)}
                  className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus size={18} />
                </button>
                <button 
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {dayEvents.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                  <CalendarIcon className="w-12 h-12 mb-4 opacity-20" />
                  <p className="text-sm">Nenhuma tarefa neste dia</p>
                  <button 
                    onClick={() => onNewTask(date)}
                    className="mt-4 text-sm text-primary hover:underline font-medium"
                  >
                    Adicionar Tarefa
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {dayEvents.map(event => (
                    <CalendarEvent 
                      key={event.id} 
                      event={event} 
                      onClick={onEventClick} 
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
