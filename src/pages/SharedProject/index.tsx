import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { KanbanCardType } from '@/types/kanban';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { toast } from 'sonner';
import { CardModal } from '@/components/ui/CardModal';
import { SharedProjectHeader } from '@/components/project/SharedProjectHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useSharedProjectQuery } from '@/hooks/useSharedProjectQuery';
import { useEvent } from '@/hooks/useEvent';
import { useKanbanModals } from '@/hooks/useKanbanModals';
import { useKanbanActions } from '@/hooks/useKanbanActions';

export default function SharedProject() {
  const { token } = useParams<{ token: string }>();
  const { user } = useAuth();
  const [isJoining, setIsJoining] = useState(false);

  const { data, isLoading, refetch, setOptimisticColumns, setOptimisticCards } = useSharedProjectQuery(token);
  const project = data?.project;
  const columns = data?.columns || [];
  const cards = data?.cards || [];
  const [activeCard, setActiveCard] = useState<KanbanCardType | null>(null);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
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
    projectId: project?.id,
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

  const handleJoinProject = async () => {
    if (!user) return;
    setIsJoining(true);
    try {
      const { error } = await supabase.rpc('join_project_by_token', { p_token: token });
      if (error) throw error;
      toast.success('Solicitação de acesso enviada com sucesso! Aguarde a aprovação do dono.');
      setIsJoining(false);
    } catch (error: any) {
      toast.error('Erro ao solicitar acesso: ' + error.message);
    } finally {
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex-1 h-screen flex flex-col items-center justify-center bg-background">
        <h2 className="text-xl font-bold mb-2">Projeto não encontrado</h2>
        <p className="text-muted-foreground mb-4">O link pode ter expirado ou o acesso foi revogado.</p>
        <Link to="/" className="text-primary hover:underline">Ir para a página inicial</Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen bg-muted/10 overflow-hidden">
      {/* Project Header */}
      <SharedProjectHeader
        project={project}
        columnsCount={columns.length}
        cardsCount={cards.length}
        isJoining={isJoining}
        onJoinProject={handleJoinProject}
        isAuthenticated={!!user}
      />

      {/* Kanban Area */}
      <div className="flex-1 overflow-hidden p-6 pointer-events-none">
        {/* Adicionando pointer-events-none para não permitir drag no modo de visualização. O CardClick é restaurado nos cards. */}
        <div className="h-full pointer-events-auto">
          <KanbanBoard 
            columns={columns}
            cards={cards}
            onColumnsChange={handleColumnsChange}
            onCardsChange={handleCardsChange}
            onCardClick={handleCardClick}
            onCardMove={handleCardMove}
            onAddCard={handleAddCard}
            onAddColumn={handleAddColumn}
            onUpdateColumn={handleUpdateColumn}
            onDeleteColumn={handleDeleteColumn}
            canEdit={project.share_permission === 'edit'}
          />
        </div>
      </div>

      <CardModal 
        card={activeCard} 
        isOpen={isCardModalOpen} 
        onClose={() => setIsCardModalOpen(false)} 
        onUpdate={() => refetch()}
        projectId={project?.id || ''}
        canEdit={project.share_permission === 'edit'}
      />
      
      {KanbanModals}
    </div>
  );
}
