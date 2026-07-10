import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { KanbanCardType } from '@/types/kanban';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { CardModal } from '@/components/ui/CardModal';
import { ShareModal } from '@/components/ui/ShareModal';
import { AccessRequestsModal } from '@/components/ui/AccessRequestsModal';
import { ProjectHeader } from '@/components/project/ProjectHeader';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useEvent } from '@/hooks/useEvent';
import { useKanbanModals } from '@/hooks/useKanbanModals';
import { useKanbanActions } from '@/hooks/useKanbanActions';
import { useProjectQuery } from '@/hooks/useProjectQuery';

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  
  // Use React Query for caching, realtime and performance
  const { data, isLoading, refetch, setOptimisticColumns, setOptimisticCards } = useProjectQuery(id);
  const project = data?.project;
  const columns = data?.columns || [];
  const cards = data?.cards || [];
  const projectCategories = data?.projectCategories || [];
  const userPermission = data?.userPermission || 'viewer';
  const pendingRequestsCount = data?.pendingRequestsCount || 0;
  const projectMembers = data?.projectMembers || [];

  // States for modals
  const [activeCard, setActiveCard] = useState<KanbanCardType | null>(null);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isAccessRequestsOpen, setIsAccessRequestsOpen] = useState(false);
  
  const { openPrompt, openConfirm, KanbanModals } = useKanbanModals();
  
  const {
    handleColumnsChange,
    handleCardsChange,
    handleCardMove,
    handleAddColumn,
    handleUpdateColumn,
    handleDeleteColumn,
    handleAddCard
  } = useKanbanActions({
    projectId: id,
    columns,
    cards,
    user,
    openPrompt,
    openConfirm,
    setOptimisticColumns,
    setOptimisticCards,
    refetch
  });

  const handleCardClick = useEvent((card: KanbanCardType) => {
    setActiveCard(card);
    setIsCardModalOpen(true);
  });

  if (isLoading) {
    return (
      <div className="flex h-screen w-full bg-background overflow-hidden">
        <Sidebar projects={[]} onProjectCreated={() => {}} isOpen={false} onClose={() => {}} />
        <div className="flex-1 flex flex-col h-full bg-background min-w-0">
          <div className="h-14 border-b border-border/40 px-6 flex items-center shrink-0">
            <div className="h-6 w-48 bg-muted/40 rounded-md animate-pulse" />
          </div>
          <div className="flex-1 p-6 flex gap-6 overflow-hidden">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-[300px] shrink-0 h-full flex flex-col gap-3">
                <div className="h-12 w-full bg-muted/20 rounded-xl animate-pulse" />
                <div className="h-24 w-full bg-muted/20 rounded-xl animate-pulse" />
                <div className="h-32 w-full bg-muted/20 rounded-xl animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <h2 className="text-xl font-bold mb-2">Projeto não encontrado</h2>
        <Link to="/dashboard" className="text-primary hover:underline">Voltar ao Dashboard</Link>
      </div>
    );
  }

  const handleShare = () => {
    setIsShareModalOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-muted/10 overflow-hidden min-w-0">
        {/* Project Header */}
        <ProjectHeader 
          project={project}
          columnsCount={columns.length}
          cardsCount={cards.length}
          userPermission={userPermission}
          pendingRequestsCount={pendingRequestsCount}
          onOpenAccessRequests={() => setIsAccessRequestsOpen(true)}
          onOpenShare={handleShare}
          onOpenSidebar={() => {}}
        />

      {/* Kanban Area */}
      <div className="flex-1 overflow-hidden p-6">
        <KanbanBoard 
          columns={columns}
          cards={cards}
          onColumnsChange={handleColumnsChange}
          onCardsChange={handleCardsChange}
          onCardMove={handleCardMove}
          onCardClick={handleCardClick}
          onAddCard={handleAddCard}
          onAddColumn={handleAddColumn}
          onUpdateColumn={handleUpdateColumn}
          onDeleteColumn={handleDeleteColumn}
          canEdit={userPermission === 'owner' || userPermission === 'editor'}
        />
      </div>

      <CardModal 
        card={activeCard} 
        isOpen={isCardModalOpen} 
        onClose={() => setIsCardModalOpen(false)} 
        onUpdate={() => refetch()}
        projectCategories={projectCategories}
        projectMembers={projectMembers}
        projectId={project?.id || ''}
        canEdit={userPermission === 'owner' || userPermission === 'editor'}
        allCards={cards}
        columns={columns}
      />
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        project={project}
        onUpdate={() => refetch()}
      />
      <AccessRequestsModal
        isOpen={isAccessRequestsOpen}
        onClose={() => {
          setIsAccessRequestsOpen(false);
          refetch();
        }}
        projectId={project?.id || ''}
      />
      
      {KanbanModals}
    </div>
  );
}

