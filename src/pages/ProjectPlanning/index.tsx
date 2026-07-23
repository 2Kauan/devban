import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProjectQuery } from '@/hooks/useProjectQuery';
import { PlanningHeader } from '@/components/planning/PlanningHeader';
import type { ViewType } from '@/components/planning/PlanningHeader';
import { Loader2, Inbox } from 'lucide-react';
import { CardModal } from '@/components/ui/CardModal';
import { MonthView } from '@/components/planning/MonthView';
import { WeekView } from '@/components/planning/WeekView';
import { DayView } from '@/components/planning/DayView';
import { AgendaView } from '@/components/planning/AgendaView';
import { DayDrawer } from '@/components/planning/DayDrawer';
import type { KanbanCardType } from '@/types/kanban';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { syncCardToGoogleCalendar, deleteGoogleCalendarEvent } from '@/services/googleCalendarService';
import { addDays, subDays } from 'date-fns';

export default function ProjectPlanning() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, refetch, setOptimisticCards } = useProjectQuery(id);
  const [highlightedCardId, setHighlightedCardId] = useState<string | null>(null);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>('month');
  
  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerDate, setDrawerDate] = useState<Date | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<KanbanCardType | null>(null);
  const [initialDate, setInitialDate] = useState<Date | undefined>(undefined);
  const [isDraggingOverNoDate, setIsDraggingOverNoDate] = useState(false);

  const handleCardSave = (cardId: string) => {
    setHighlightedCardId(cardId);
    setTimeout(() => setHighlightedCardId(null), 2000);
  };

  const handleOptimisticDelete = (cardId: string) => {
    if (!data) return;
    setOptimisticCards(data.cards.filter(c => c.id !== cardId));
    setHighlightedCardId(null);
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
      syncCardToGoogleCalendar(cardId, undefined, newDate.toISOString());
      refetch();
    } catch (err: any) {
      toast.error('Erro ao atualizar data: ' + err.message);
    }
  };

  const handleDropRemoveDate = async (e: React.DragEvent) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('text/plain');
    if (!cardId) return;

    try {
      const { error } = await supabase
        .from('cards')
        .update({ due_date: null })
        .eq('id', cardId);
        
      if (error) throw error;
      toast.success('Data removida com sucesso!');
      deleteGoogleCalendarEvent(cardId);
      refetch();
    } catch (err: any) {
      toast.error('Erro ao remover data: ' + err.message);
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

  const todayStr = new Date().toISOString();
  const noDateCards = cards.filter(c => !c.due_date);
  const upcomingCards = cards.filter(c => c.due_date && c.due_date >= todayStr).sort((a,b) => a.due_date!.localeCompare(b.due_date!));
  const pastCards = cards.filter(c => {
    if (!c.due_date) return false;
    if (c.due_date >= todayStr) return false;
    const col = columns.find(col => col.id === c.column_id);
    if (col?.is_completed) return false;
    return true;
  }).sort((a,b) => b.due_date!.localeCompare(a.due_date!));

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-background">
      <PlanningHeader
        currentDate={currentDate}
        view={view}
        onViewChange={setView}
        onDateChange={setCurrentDate}
        onNewTask={() => handleNewTask()}
      />
      
      <div className="flex-1 flex overflow-y-auto min-h-0">
        {/* Left Sidebar: Task Lists (Desktop only) */}
        <aside 
          className="w-80 border-r border-border/50 bg-card hidden xl:flex flex-col shrink-0 overflow-y-auto custom-scrollbar"
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
          }}
        >
          <div className="p-4 flex-1 flex flex-col gap-6">
            
            {/* Sem Data - Drop Zone para remover data */}
            <div 
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                setIsDraggingOverNoDate(true);
              }}
              onDragLeave={(e) => {
                // Só desativa se realmente saiu da div (não entrou num filho)
                if (!e.relatedTarget || !e.currentTarget.contains(e.relatedTarget as Node)) {
                  setIsDraggingOverNoDate(false);
                }
              }}
              onDrop={(e) => {
                setIsDraggingOverNoDate(false);
                handleDropRemoveDate(e);
              }}
              className={`border-2 rounded-xl transition-all p-2 -mx-2 ${
                isDraggingOverNoDate 
                  ? 'border-primary bg-primary/10 scale-[1.02] shadow-lg shadow-primary/10' 
                  : 'border-transparent'
              }`}
            >
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full transition-colors ${isDraggingOverNoDate ? 'bg-primary' : 'bg-muted-foreground'}`} />
                {isDraggingOverNoDate ? (
                  <>
                    <Inbox size={16} className="text-primary" />
                    Solte aqui para remover data
                  </>
                ) : (
                  `Sem Data (${noDateCards.length})`
                )}
              </h3>
              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                {noDateCards.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-3 text-center border border-dashed rounded-lg">Nenhuma tarefa sem data.</p>
                ) : (
                  noDateCards.map(c => (
                    <button 
                      key={c.id} 
                      onClick={() => handleEventClick(c)} 
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', c.id);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      className="text-left bg-background border border-border p-3 rounded-lg hover:border-primary/50 transition-colors group cursor-grab active:cursor-grabbing"
                    >
                      <div className="text-sm font-medium truncate mb-1">{c.title}</div>
                      <div className="text-xs text-muted-foreground">{columns.find(col => col.id === c.column_id)?.title}</div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Próximas Tarefas */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Próximas Tarefas ({upcomingCards.length})
              </h3>
              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                {upcomingCards.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-3 text-center border border-dashed rounded-lg">Nenhuma próxima tarefa.</p>
                ) : (
                  upcomingCards.map(c => {
                    const dateObj = new Date(c.due_date!);
                    const pad = (n: number) => n.toString().padStart(2, '0');
                    return (
                      <button 
                        key={c.id} 
                        onClick={() => handleEventClick(c)} 
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', c.id);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        className="text-left bg-background border border-border p-3 rounded-lg hover:border-primary/50 transition-colors group cursor-grab active:cursor-grabbing"
                      >
                        <div className="text-sm font-medium truncate mb-1">{c.title}</div>
                        <div className="flex justify-between items-center text-xs text-muted-foreground mt-2">
                          <span>{pad(dateObj.getDate())}/{pad(dateObj.getMonth()+1)} - {pad(dateObj.getHours())}:{pad(dateObj.getMinutes())}</span>
                          <span className="px-1.5 py-0.5 bg-muted rounded truncate max-w-[100px]">{columns.find(col => col.id === c.column_id)?.title}</span>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            {/* Passados */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-destructive" />
                Passados ({pastCards.length})
              </h3>
              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                {pastCards.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-3 text-center border border-dashed rounded-lg">Nenhuma tarefa atrasada.</p>
                ) : (
                  pastCards.map(c => {
                    const dateObj = new Date(c.due_date!);
                    const pad = (n: number) => n.toString().padStart(2, '0');
                    return (
                      <button 
                        key={c.id} 
                        onClick={() => handleEventClick(c)} 
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', c.id);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        className="text-left bg-red-500/10 border border-red-500/20 p-3 rounded-lg hover:border-red-500/40 transition-colors group cursor-grab active:cursor-grabbing"
                      >
                        <div className="text-sm font-medium truncate text-red-700 dark:text-red-400 mb-1">{c.title}</div>
                        <div className="flex justify-between items-center text-xs text-red-600/70 dark:text-red-400/70 mt-2">
                          <span>{pad(dateObj.getDate())}/{pad(dateObj.getMonth()+1)} - {pad(dateObj.getHours())}:{pad(dateObj.getMinutes())}</span>
                          <span className="px-1.5 py-0.5 bg-red-500/10 rounded truncate max-w-[100px]">{columns.find(col => col.id === c.column_id)?.title}</span>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
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
              highlightedCardId={highlightedCardId}
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
              onPrevDay={() => setCurrentDate(subDays(currentDate, 1))}
              onNextDay={() => setCurrentDate(addDays(currentDate, 1))}
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
        onOptimisticDelete={handleOptimisticDelete}
        onCardSave={handleCardSave}
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
