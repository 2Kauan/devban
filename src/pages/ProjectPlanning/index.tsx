import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProjectQuery } from '@/hooks/useProjectQuery';
import { PlanningHeader } from '@/components/planning/PlanningHeader';
import type { ViewType } from '@/components/planning/PlanningHeader';
import { addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { CardModal } from '@/components/ui/CardModal';
import { MonthView } from '@/components/planning/MonthView';
import { WeekView } from '@/components/planning/WeekView';
import { DayView } from '@/components/planning/DayView';
import { AgendaView } from '@/components/planning/AgendaView';
import { DayDrawer } from '@/components/planning/DayDrawer';
import type { KanbanCardType } from '@/types/kanban';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function ProjectPlanning() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, refetch } = useProjectQuery(id);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>('month');
  
  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerDate, setDrawerDate] = useState<Date | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<KanbanCardType | null>(null);
  const [initialDate, setInitialDate] = useState<Date | undefined>(undefined);

  const handlePrev = () => {
    if (view === 'month') setCurrentDate(d => subMonths(d, 1));
    else if (view === 'week') setCurrentDate(d => subWeeks(d, 1));
    else setCurrentDate(d => subDays(d, 1));
  };

  const handleNext = () => {
    if (view === 'month') setCurrentDate(d => addMonths(d, 1));
    else if (view === 'week') setCurrentDate(d => addWeeks(d, 1));
    else setCurrentDate(d => addDays(d, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleNewTask = (date?: Date) => {
    setSelectedCard(null);
    setInitialDate(date || new Date());
    setIsModalOpen(true);
  };

  const handleEventClick = (card: KanbanCardType) => {
    setSelectedCard(card);
    setInitialDate(undefined);
    setIsModalOpen(true);
  };

  const handleEventDrop = async (cardId: string, newDate: Date) => {
    // Optimistic update would be better, but refetching is safer for now.
    try {
      const { error } = await supabase
        .from('cards')
        .update({ due_date: newDate.toISOString() })
        .eq('id', cardId);
        
      if (error) throw error;
      toast.success('Data atualizada com sucesso');
      refetch();
    } catch (err: any) {
      toast.error('Erro ao atualizar data: ' + err.message);
    }
  };

  const handleDayClick = (date: Date) => {
    setDrawerDate(date);
    setIsDrawerOpen(true);
  };

  if (isLoading || !data) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const { cards, columns, projectCategories, projectMembers, userPermission } = data;
  const canEdit = userPermission === 'owner' || userPermission === 'admin' || userPermission === 'editor';

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-background">
      <PlanningHeader
        currentDate={currentDate}
        view={view}
        onViewChange={setView}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        onNewTask={() => handleNewTask()}
      />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Mini Calendar & Next Tasks (Desktop only) */}
        <aside className="w-64 border-r border-border/50 bg-card hidden xl:flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
          <div className="p-4 border-b border-border/50">
            {/* Mini Calendar placeholder */}
            <div className="h-48 bg-muted/30 rounded-xl border border-dashed border-border flex items-center justify-center text-muted-foreground text-sm">
              Mini Calendário
            </div>
          </div>
          <div className="p-4 flex-1">
            <h3 className="text-sm font-semibold text-foreground mb-3">Próximas Tarefas</h3>
            {/* Next Tasks placeholder */}
            <div className="h-48 bg-muted/30 rounded-xl border border-dashed border-border flex items-center justify-center text-muted-foreground text-sm">
              Lista
            </div>
          </div>
        </aside>

        {/* Main Calendar View Area */}
        <main className="flex-1 flex flex-col overflow-hidden bg-background relative">
          {view === 'month' && (
            <MonthView 
              currentDate={currentDate} 
              cards={cards} 
              onEventClick={handleEventClick}
              onDayClick={handleDayClick}
              onEventDrop={handleEventDrop}
            />
          )}
          {view === 'week' && (
            <WeekView 
              currentDate={currentDate} 
              cards={cards} 
              onEventClick={handleEventClick}
              onDayClick={handleDayClick}
              onEventDrop={handleEventDrop}
            />
          )}
          {view === 'day' && (
            <DayView 
              currentDate={currentDate} 
              cards={cards} 
              onEventClick={handleEventClick}
              onEventDrop={handleEventDrop}
            />
          )}
          {view === 'agenda' && (
            <AgendaView 
              cards={cards} 
              onEventClick={handleEventClick}
            />
          )}
        </main>
      </div>

      <CardModal
        card={selectedCard}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpdate={refetch}
        projectId={id}
        projectCategories={projectCategories}
        projectMembers={projectMembers}
        canEdit={canEdit}
        allCards={cards}
        columns={columns}
        initialDate={initialDate}
      />

      <DayDrawer
        isOpen={isDrawerOpen}
        date={drawerDate}
        onClose={() => setIsDrawerOpen(false)}
        cards={cards}
        onEventClick={handleEventClick}
        onNewTask={(date) => {
          setIsDrawerOpen(false);
          handleNewTask(date);
        }}
      />
    </div>
  );
}
