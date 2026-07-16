import { CalendarDays, Filter, Search, Plus, ChevronDown } from 'lucide-react';
import { formatMonthYear } from '@/utils/calendar';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export type ViewType = 'month' | 'week' | 'day' | 'agenda';

interface PlanningHeaderProps {
  currentDate: Date;
  view: ViewType;
  onViewChange: (view: ViewType) => void;
  onDateChange: (date: Date) => void;
  onNewTask?: () => void;
}

export function PlanningHeader({
  currentDate,
  view,
  onViewChange,
  onDateChange,
  onNewTask
}: PlanningHeaderProps) {
  const views = [
    { id: 'agenda', label: 'Agenda' },
    { id: 'month', label: 'Mês' },
    { id: 'week', label: 'Semana' },
    { id: 'day', label: 'Dia' }
  ];

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

        <div className="flex items-center gap-4">
          <div className="relative">
            <input
              type="month"
              value={format(currentDate, 'yyyy-MM')}
              onChange={(e) => {
                const [year, month] = e.target.value.split('-').map(Number);
                onDateChange(new Date(year, month - 1, 1));
              }}
              className="absolute inset-0 z-20 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex items-center gap-2 px-3 py-1.5 bg-background hover:bg-muted border border-border rounded-lg text-sm font-semibold text-foreground capitalize transition-colors">
              {formatMonthYear(currentDate)}
              <ChevronDown size={14} className="text-muted-foreground" />
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <button className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"><Search size={18} /></button>
            <button className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"><Filter size={18} /></button>
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
              <span className="relative z-10">{v.label}</span>
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
