import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { KanbanCardType } from '@/types/kanban';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { CardModal } from '@/components/ui/CardModal';
import { ShareModal } from '@/components/ui/ShareModal';
import { AccessRequestsModal } from '@/components/ui/AccessRequestsModal';
import { ProjectHeader } from '@/components/project/ProjectHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useEvent } from '@/hooks/useEvent';
import { useKanbanModals } from '@/hooks/useKanbanModals';
import { useKanbanActions } from '@/hooks/useKanbanActions';
import { useProjectQuery } from '@/hooks/useProjectQuery';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Lock, Loader2, ShieldAlert } from 'lucide-react';

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  
  // Use React Query for caching, realtime and performance
  const { data, isLoading, error, refetch, setOptimisticColumns, setOptimisticCards } = useProjectQuery(id);
  
  const [isRequestingAccess, setIsRequestingAccess] = useState(false);
  
  const project = useMemo(() => data?.project, [data?.project]);
  const columns = useMemo(() => data?.columns || [], [data?.columns]);
  const cards = useMemo(() => data?.cards || [], [data?.cards]);
  const projectCategories = useMemo(() => data?.projectCategories || [], [data?.projectCategories]);
  const userPermission = useMemo(() => data?.userPermission || 'viewer', [data?.userPermission]);
  const pendingRequestsCount = useMemo(() => data?.pendingRequestsCount || 0, [data?.pendingRequestsCount]);
  const projectMembers = useMemo(() => data?.projectMembers || [], [data?.projectMembers]);
  
  // States for modals
  const [activeCard, setActiveCard] = useState<KanbanCardType | null>(null);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isAccessRequestsOpen, setIsAccessRequestsOpen] = useState(false);
  
  // Auto-open card from URL
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const cardIdParam = searchParams.get('card');
    if (cardIdParam && cards.length > 0 && !isCardModalOpen && !activeCard) {
      const cardToOpen = cards.find((c: any) => c.id === cardIdParam);
      if (cardToOpen) {
        setActiveCard(cardToOpen);
        setIsCardModalOpen(true);
      }
    }
  }, [cards.length]);
  
  const { openPrompt, openConfirm, KanbanModals } = useKanbanModals();
  
  const {
    handleColumnsChange,
    handleCardsChange,
    handleCardMove,
    handleBulkDelete,
    handleBulkMove,
    handleAddColumn,
    handleUpdateColumn,
    handleDeleteColumn,
    handleAddCard,
    handlePriorityChange
  } = useKanbanActions({
    projectId: id,
    columns,
    cards,
    user,
    openPrompt,
    openConfirm,
    setOptimisticColumns,
    setOptimisticCards,
    refetch,
    onCardCreated: (card) => {
      setActiveCard(card);
      setIsCardModalOpen(true);
    }
  });

  const handleCardClick = useEvent((card: KanbanCardType) => {
    setActiveCard(card);
    setIsCardModalOpen(true);
  });

  if (isLoading) {
    return (
      <div className="flex-1 p-6 flex gap-6 overflow-hidden">
        {[1, 2, 3].map(i => (
          <div key={i} className="w-[300px] shrink-0 h-full flex flex-col gap-3">
            <div className="h-12 w-full bg-muted/20 rounded-xl animate-pulse" />
            <div className="h-24 w-full bg-muted/20 rounded-xl animate-pulse" />
            <div className="h-32 w-full bg-muted/20 rounded-xl animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    const isAccessDenied = error.message?.includes('Acesso negado');
    const handleRequestAccess = async () => {
      if (!user || !id) return;
      setIsRequestingAccess(true);
      try {
        const { data: projectData } = await supabase
          .from('projects')
          .select('share_token, share_enabled')
          .eq('id', id)
          .single();

        if (!projectData?.share_enabled) {
          toast.error('Este projeto não aceita novos membros no momento.');
          setIsRequestingAccess(false);
          return;
        }

        const { error: reqError } = await supabase.rpc('join_project_by_token', {
          p_token: projectData.share_token
        });
        if (reqError) throw reqError;
        toast.success('Solicitação de acesso enviada! Aguarde a aprovação do dono.');
      } catch (err: any) {
        toast.error(err.message || 'Erro ao solicitar acesso');
      } finally {
        setIsRequestingAccess(false);
      }
    };

    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldAlert size={32} className="text-destructive" />
        </div>
        <h2 className="text-xl font-bold text-foreground">
          {isAccessDenied ? 'Acesso Negado' : 'Erro ao carregar projeto'}
        </h2>
        <p className="text-muted-foreground text-center max-w-md">
          {isAccessDenied
            ? 'Você não é mais membro deste projeto. Solicite acesso ao proprietário para continuar.'
            : error.message}
        </p>
        <div className="flex gap-3">
          {isAccessDenied && (
            <button
              onClick={handleRequestAccess}
              disabled={isRequestingAccess}
              className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isRequestingAccess ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
              Solicitar Acesso
            </button>
          )}
          <Link
            to="/projects"
            className="bg-muted text-foreground px-6 py-2 rounded-lg font-medium hover:bg-muted/80 transition-colors"
          >
            Voltar aos Projetos
          </Link>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <h2 className="text-xl font-bold mb-2">Projeto não encontrado</h2>
        <Link to="/projects" className="text-primary hover:underline">Voltar aos Projetos</Link>
      </div>
    );
  }

  const handleShare = () => {
    setIsShareModalOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden min-w-0 min-h-0">
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

      <div className="flex-1 overflow-hidden p-4 sm:p-6 pb-0 flex flex-col min-h-0">
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
          onBulkDelete={handleBulkDelete}
          onBulkMove={handleBulkMove}
        />
      </div>


      <CardModal 
        card={activeCard} 
        isOpen={isCardModalOpen} 
        onClose={() => setIsCardModalOpen(false)} 
        onUpdate={() => refetch()}
        onPriorityChange={handlePriorityChange}
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

