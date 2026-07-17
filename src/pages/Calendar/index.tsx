import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { PlanningHeader } from '@/components/planning/PlanningHeader';
import type { ViewType } from '@/components/planning/PlanningHeader';
import { addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from 'date-fns';
import { Loader2, CalendarDays } from 'lucide-react';
import { MonthView } from '@/components/planning/MonthView';
import { WeekView } from '@/components/planning/WeekView';
import { DayView } from '@/components/planning/DayView';
import { AgendaView } from '@/components/planning/AgendaView';
import { DayDrawer } from '@/components/planning/DayDrawer';
import { CardModal } from '@/components/ui/CardModal';
import type { KanbanCardType, KanbanColumnType } from '@/types/kanban';
import type { Category, Project } from '@/types/database';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderKanban } from 'lucide-react';

export default function Calendar() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>('month');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handlePrevDay = () => setCurrentDate(prev => new Date(prev.setDate(prev.getDate() - 1)));
  const handleNextDay = () => setCurrentDate(prev => new Date(prev.setDate(prev.getDate() + 1)));

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerDate, setDrawerDate] = useState<Date | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<KanbanCardType | null>(null);
  const [initialDate, setInitialDate] = useState<Date | undefined>(undefined);

  // Project picker state (for creating new tasks)
  const [isProjectPickerOpen, setIsProjectPickerOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [pendingNewTaskDate, setPendingNewTaskDate] = useState<Date | undefined>(undefined);

  // Fetch cards from ALL projects the user has access to
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['global-calendar', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      // 1. Get projects where user is owner
      const { data: ownedProjects } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', user.id);

      // 2. Get project IDs where user is a member
      const { data: memberProjects } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id);

      const projectIds = new Set<string>();
      const projectsMap = new Map<string, Project>();
      ownedProjects?.forEach(p => { projectIds.add(p.id); projectsMap.set(p.id, p); });
      memberProjects?.forEach(p => projectIds.add(p.project_id));

      if (projectIds.size === 0) {
        return { cards: [], columns: [], projectCategories: [], projects: [] as Project[] };
      }

      const ids = Array.from(projectIds);

      // Fetch full project data for member projects we don't have yet
      const missingIds = ids.filter(id => !projectsMap.has(id));
      if (missingIds.length > 0) {
        const { data: missingProjects } = await supabase
          .from('projects')
          .select('*')
          .in('id', missingIds);
        missingProjects?.forEach(p => projectsMap.set(p.id, p));
      }
      const allProjects = ids.map(id => projectsMap.get(id)!).filter(Boolean);

      // 3. Fetch all cards from those projects
      const { data: cardsData, error: cardsError } = await supabase
        .from('cards')
        .select('*')
        .in('project_id', ids)
        .order('position', { ascending: true });

      if (cardsError) throw cardsError;

      // 4. Fetch columns for context
      const { data: columnsData } = await supabase
        .from('columns')
        .select('*')
        .in('project_id', ids)
        .order('position', { ascending: true });

      // 5. Fetch categories
      const { data: catData } = await supabase
        .from('categories')
        .select('*')
        .in('project_id', ids);

      // 6. Enrich cards with categories and assignees
      let enrichedCards = cardsData || [];
      if (cardsData && cardsData.length > 0) {
        const cardIds = cardsData.map(c => c.id);

        const { data: cardCatData } = await supabase
          .from('card_categories')
          .select('*')
          .in('card_id', cardIds);

        const { data: cardAssigneesData } = await supabase
          .from('card_assignees')
          .select('card_id, profiles(*)')
          .in('card_id', cardIds);

        enrichedCards = cardsData.map(card => {
          let cardCategories: Category[] = [];
          if (cardCatData) {
            const relations = cardCatData.filter(cc => cc.card_id === card.id);
            cardCategories = relations
              .map(cc => (catData || []).find(c => c.id === cc.category_id))
              .filter(Boolean) as Category[];
          }

          let cardAssignees: any[] = [];
          if (cardAssigneesData) {
            cardAssignees = cardAssigneesData
              .filter(ca => ca.card_id === card.id && ca.profiles)
              .map(ca => ca.profiles);
          }

          return { ...card, categories: cardCategories, assignees: cardAssignees };
        });
      }

      return {
        cards: enrichedCards as KanbanCardType[],
        columns: (columnsData || []) as KanbanColumnType[],
        projectCategories: (catData || []) as Category[],
        projects: allProjects as Project[],
      };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

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

  const handleCardSave = (cardId: string) => {
    //
  };

  const handleOptimisticDelete = (cardId: string) => {
    if (!data) return;
    queryClient.setQueryData(['global-calendar', user?.id], {
        ...data,
        cards: data.cards.filter(c => c.id !== cardId)
    });
    setHighlightedCardId(null);
  };

  const handleNewTask = (date?: Date) => {
    const taskDate = date || new Date();
    if (data && data.projects.length === 1) {
      // Only one project, skip picker
      setSelectedProjectId(data.projects[0].id);
      setSelectedCard(null);
      setInitialDate(taskDate);
      setIsModalOpen(true);
    } else {
      // Multiple projects, show picker
      setPendingNewTaskDate(taskDate);
      setIsProjectPickerOpen(true);
    }
  };

  const handlePickProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setIsProjectPickerOpen(false);
    setSelectedCard(null);
    setInitialDate(pendingNewTaskDate);
    setIsModalOpen(true);
  };

  const handleEventClick = (card: KanbanCardType) => {
    setSelectedCard(card);
    setSelectedProjectId(card.project_id);
    setInitialDate(undefined);
    setIsModalOpen(true);
  };

  const handleEventDrop = async (cardId: string, newDate: Date) => {
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
      <div className="flex h-screen w-full bg-background overflow-hidden">
        <Sidebar onProjectCreated={refetch} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <TopHeader title="Calendário" onOpenSidebar={() => setIsSidebarOpen(true)} />
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </main>
      </div>
    );
  }

  const { cards, columns, projectCategories, projects } = data;

  if (cards.length === 0 && !isLoading) {
    return (
      <div className="flex h-screen w-full bg-background overflow-hidden">
        <Sidebar onProjectCreated={refetch} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <TopHeader title="Calendário" onOpenSidebar={() => setIsSidebarOpen(true)} />
          <PlanningHeader
            currentDate={currentDate}
            view={view}
            onViewChange={setView}
            onPrev={handlePrev}
            onNext={handleNext}
            onToday={handleToday}
          />
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4 min-h-[50vh]">
            <CalendarDays className="w-16 h-16 opacity-20" />
            <p className="text-lg font-medium">Nenhuma tarefa encontrada</p>
            <p className="text-sm">Crie tarefas com datas nos seus projetos para vê-las aqui.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <Sidebar onProjectCreated={refetch} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopHeader title="Calendário" onOpenSidebar={() => setIsSidebarOpen(true)} />

        <PlanningHeader
          currentDate={currentDate}
          view={view}
          onViewChange={setView}
          onPrev={handlePrev}
          onNext={handleNext}
          onToday={handleToday}
        />

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden bg-background relative">
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
                onPrevDay={handlePrevDay}
                onNextDay={handleNextDay}
              />
            )}
            {view === 'agenda' && (
              <AgendaView
                cards={cards}
                onEventClick={handleEventClick}
              />
            )}
          </div>
        </div>

        {selectedCard && (
          <CardModal
            card={selectedCard}
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onUpdate={refetch}
            onOptimisticDelete={handleOptimisticDelete}
            onCardSave={handleCardSave}
            projectId={selectedCard.project_id}
            projectCategories={projectCategories.filter(c => c.project_id === selectedCard.project_id)}
            projectMembers={[]}
            canEdit={true}
            allCards={cards.filter(c => c.project_id === selectedCard.project_id)}
            columns={columns.filter(c => c.project_id === selectedCard.project_id)}
          />
        )}

        {!selectedCard && selectedProjectId && (
          <CardModal
            card={null}
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onUpdate={refetch}
            onOptimisticDelete={handleOptimisticDelete}
            onCardSave={handleCardSave}
            projectId={selectedProjectId}
            projectCategories={projectCategories.filter(c => c.project_id === selectedProjectId)}
            projectMembers={[]}
            canEdit={true}
            allCards={cards.filter(c => c.project_id === selectedProjectId)}
            columns={columns.filter(c => c.project_id === selectedProjectId)}
            initialDate={initialDate}
          />
        )}

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

        {/* Project Picker Modal */}
        <AnimatePresence>
          {isProjectPickerOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsProjectPickerOpen(false)}
                className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed inset-0 flex items-center justify-center z-50 p-4"
              >
                <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                  <div className="p-5 border-b border-border/50">
                    <h3 className="text-lg font-semibold">Selecionar Projeto</h3>
                    <p className="text-sm text-muted-foreground mt-1">Em qual projeto deseja criar a tarefa?</p>
                  </div>
                  <div className="p-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {projects.map(project => (
                      <button
                        key={project.id}
                        onClick={() => handlePickProject(project.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted/60 transition-colors text-left"
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0"
                          style={{ backgroundColor: project.color || '#6366f1' }}
                        >
                          <FolderKanban size={16} />
                        </div>
                        <span className="text-sm font-medium truncate">{project.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
