import { CalendarDays, ChevronLeft, ChevronRight, Filter, Search, Plus } from 'lucide-react';
import { formatMonthYear } from '@/utils/calendar';

export type ViewType = 'month' | 'week' | 'day' | 'agenda';

interface PlanningHeaderProps {
  currentDate: Date;
  view: ViewType;
  onViewChange: (view: ViewType) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onNewTask?: () => void;
}

export function PlanningHeader({
  currentDate,
  view,
  onViewChange,
  onPrev,
  onNext,
  onToday,
  onNewTask
}: PlanningHeaderProps) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 lg:p-6 border-b border-border/50 shrink-0 bg-background/95 backdrop-blur-sm z-10">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          <CalendarDays size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            Planejamento
          </h1>
          <p className="text-sm text-muted-foreground hidden sm:block">
            Visualize as tarefas através do calendário
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
        {/* Navigation */}
        <div className="flex items-center bg-muted/50 rounded-lg p-1 border border-border/50">
          <button 
            onClick={onPrev}
            className="p-1.5 hover:bg-background rounded-md text-muted-foreground hover:text-foreground transition-all"
          >
            <ChevronLeft size={18} />
          </button>
          <button 
            onClick={onToday}
            className="px-3 py-1.5 text-sm font-medium hover:bg-background rounded-md text-muted-foreground hover:text-foreground transition-all"
          >
            Hoje
          </button>
          <button 
            onClick={onNext}
            className="p-1.5 hover:bg-background rounded-md text-muted-foreground hover:text-foreground transition-all"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="text-sm font-semibold text-foreground capitalize">
          {formatMonthYear(currentDate)}
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-muted/50 rounded-lg p-1 border border-border/50">
          {[
            { id: 'month', label: 'Mês' },
            { id: 'week', label: 'Semana' },
            { id: 'day', label: 'Dia' },
            { id: 'agenda', label: 'Agenda' }
          ].map(v => (
            <button
              key={v.id}
              onClick={() => onViewChange(v.id as ViewType)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                view === v.id 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
            <Search size={18} />
          </button>
          <button className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
            <Filter size={18} />
          </button>
          {onNewTask && (
            <button 
              onClick={onNewTask}
              className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 shadow-sm"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Nova tarefa</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
