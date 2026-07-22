import { useState, useEffect } from 'react';
import { CalendarDays, Plus, ChevronDown, ChevronLeft, ChevronRight, List, Calendar, CalendarRange, Clock } from 'lucide-react';
import { formatMonthYear } from '@/utils/calendar';
import { addMonths, addDays, subDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export type ViewType = 'month' | 'week' | 'day' | 'agenda';

interface PlanningHeaderProps {
  currentDate: Date;
  view: ViewType;
  onViewChange: (view: ViewType) => void;
  onDateChange?: (date: Date) => void;
  onPrev?: () => void;
  onNext?: () => void;
  onToday?: () => void;
  onNewTask?: () => void;
}

export function PlanningHeader({
  currentDate,
  view,
  onViewChange,
  onDateChange,
  onPrev,
  onNext,
  onToday,
  onNewTask
}: PlanningHeaderProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  useEffect(() => {
    setSelectedYear(currentDate.getFullYear());
  }, [currentDate]);

  const views = [
    { id: 'agenda', label: 'Agenda', icon: List },
    { id: 'month', label: 'Mês', icon: Calendar },
    { id: 'week', label: 'Semana', icon: CalendarRange },
    { id: 'day', label: 'Dia', icon: Clock }
  ];

  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  const handlePrev = () => {
    if (onPrev) {
      onPrev();
    } else if (onDateChange) {
      if (view === 'week') {
        onDateChange(subDays(currentDate, 7));
      } else if (view === 'day') {
        onDateChange(subDays(currentDate, 1));
      } else {
        onDateChange(addMonths(currentDate, -1));
      }
    }
  };

  const handleNext = () => {
    if (onNext) {
      onNext();
    } else if (onDateChange) {
      if (view === 'week') {
        onDateChange(addDays(currentDate, 7));
      } else if (view === 'day') {
        onDateChange(addDays(currentDate, 1));
      } else {
        onDateChange(addMonths(currentDate, 1));
      }
    }
  };

  const handleToday = () => {
    if (onToday) {
      onToday();
    } else {
      onDateChange?.(new Date());
    }
  };

  return (
    <header className="flex flex-col gap-4 p-4 lg:p-6 border-b border-border/50 shrink-0 bg-background/95 backdrop-blur-sm z-10">
      {/* Row 1: Header + Nav + Actions */}
      <div className="flex items-center justify-between gap-4 w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <CalendarDays size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold">Planejamento</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 border border-border rounded-xl bg-background p-1 shadow-sm">
            {/* Seta Esquerda */}
            <button
              type="button"
              onClick={handlePrev}
              title="Anterior"
              className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
            >
              <ChevronLeft size={18} />
            </button>

            {/* Custom Month/Year Picker Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsPickerOpen(!isPickerOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-background hover:bg-muted/70 rounded-lg text-sm font-semibold text-foreground capitalize transition-colors cursor-pointer select-none"
              >
                <span>{formatMonthYear(currentDate)}</span>
                <ChevronDown size={14} className={`text-muted-foreground group-hover:text-foreground transition-transform duration-200 ${isPickerOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isPickerOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsPickerOpen(false)} />
                    
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 5 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 sm:left-1/2 sm:-translate-x-1/2 top-full mt-2 z-50 w-72 bg-card border border-border shadow-2xl rounded-2xl p-4 backdrop-blur-md"
                    >
                      {/* Year Selector */}
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/50">
                        <button
                          type="button"
                          onClick={() => setSelectedYear(y => y - 1)}
                          className="p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                          <ChevronLeft size={18} />
                        </button>
                        <span className="font-bold text-base text-foreground">{selectedYear}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedYear(y => y + 1)}
                          className="p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                          <ChevronRight size={18} />
                        </button>
                      </div>

                      {/* Months Grid */}
                      <div className="grid grid-cols-4 gap-2">
                        {months.map((m, idx) => {
                          const isSelected = currentDate.getFullYear() === selectedYear && currentDate.getMonth() === idx;
                          const isCurrentRealMonth = new Date().getFullYear() === selectedYear && new Date().getMonth() === idx;

                          return (
                            <button
                              key={m}
                              type="button"
                              onClick={() => {
                                onDateChange?.(new Date(selectedYear, idx, 1));
                                setIsPickerOpen(false);
                              }}
                              className={`py-2 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20 scale-105'
                                  : isCurrentRealMonth
                                  ? 'border border-primary/50 text-primary hover:bg-primary/10'
                                  : 'hover:bg-muted/70 text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              {m}
                            </button>
                          );
                        })}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-end pt-3 mt-3 border-t border-border/50 text-xs font-medium">
                        <button
                          type="button"
                          onClick={() => {
                            const now = new Date();
                            onDateChange?.(now);
                            setSelectedYear(now.getFullYear());
                            setIsPickerOpen(false);
                          }}
                          className="text-primary hover:underline font-semibold cursor-pointer"
                        >
                          Este mês
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Botão Hoje */}
            <button
              type="button"
              onClick={handleToday}
              className="px-2.5 py-1.5 text-xs font-semibold hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
            >
              Hoje
            </button>

            {/* Seta Direita */}
            <button
              type="button"
              onClick={handleNext}
              title="Próximo"
              className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Row 2: View Toggle & Row 3: New Task */}
      <div className="flex flex-col md:flex-row md:items-center gap-2">
        <div className="flex items-center bg-muted/50 rounded-lg p-1 border border-border/50 w-full md:w-fit relative">
          {views.map(v => (
            <button
              key={v.id}
              onClick={() => onViewChange(v.id as ViewType)}
              className="relative px-4 py-1.5 text-sm font-medium rounded-md transition-all text-muted-foreground hover:text-foreground w-full md:w-auto"
            >
              {view === v.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-background shadow-sm rounded-md"
                  transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <v.icon size={16} />
                {v.label}
              </span>
            </button>
          ))}
        </div>
        {onNewTask && (
          <button 
            onClick={onNewTask}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-all shadow-sm w-full md:w-fit"
          >
            <Plus size={16} />
            <span>Nova tarefa</span>
          </button>
        )}
      </div>
    </header>
  );
}
