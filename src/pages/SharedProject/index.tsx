import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
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
import { Loader2 } from 'lucide-react';

export default function SharedProject() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isJoining, setIsJoining] = useState(false);
  
  // Guest Account State
  const [guestName, setGuestName] = useState('');
  const [isCreatingGuest, setIsCreatingGuest] = useState(false);

  const { data, isLoading, refetch, setOptimisticColumns, setOptimisticCards } = useSharedProjectQuery(token);
  const project = data?.project;
  const columns = data?.columns || [];
  const cards = data?.cards || [];
  const projectCategories = data?.projectCategories || [];
  const projectMembers = data?.projectMembers || [];
  
  const isMember = user && projectMembers.some(m => m.profiles.id === user.id);
  const isOwner = user && project?.owner_id === user.id;

  useEffect(() => {
    if ((isMember || isOwner) && project?.id) {
      navigate(`/project/${project.id}`);
    }
  }, [isMember, isOwner, project?.id, navigate]);
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

  const handleCreateGuestSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    
    setIsCreatingGuest(true);
    try {
      const email = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}@guest.devban.local`;
      const password = Math.random().toString(36).slice(-8) + 'A1!';
      
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) throw authError;
      
      if (authData.user) {
         // Update profile with the chosen name
         await supabase.from('profiles').update({ name: guestName.trim() }).eq('id', authData.user.id);
         
         // Use RPC to bypass RLS and add member to the project securely
         if (token) {
           const { error: joinError } = await supabase.rpc('join_project_by_token', { p_token: token });
           if (joinError) console.error('Erro ao injetar membro:', joinError);
         }
  
         toast.success(`Bem-vindo(a), ${guestName.trim()}!`);
         refetch();
      }
    } catch (err: any) {
      toast.error('Erro ao acessar: ' + err.message);
    } finally {
      setIsCreatingGuest(false);
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

  if (!user) {
    return (
      <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-card border border-border shadow-2xl rounded-2xl p-6 w-full max-w-md">
          <h2 className="text-xl font-bold mb-2">Acesso ao Projeto</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Por favor, informe seu nome para acessar este quadro. Você será listado como responsável pelas tarefas que assumir.
          </p>
          
          <form onSubmit={handleCreateGuestSession}>
            <input 
              type="text" 
              required 
              placeholder="Seu nome (ex: João Silva)" 
              className="w-full bg-background border border-border rounded-lg px-4 py-3 mb-4 focus:ring-2 focus:ring-primary focus:outline-none transition-all"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
            />
            <button 
              type="submit" 
              disabled={isCreatingGuest || !guestName.trim()}
              className="w-full bg-primary text-primary-foreground font-semibold rounded-lg py-3 flex justify-center items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isCreatingGuest ? <Loader2 className="animate-spin" size={18} /> : 'Acessar Quadro'}
            </button>
          </form>
          <div className="mt-6 text-center border-t border-border/50 pt-4">
            <Link to={`/login?redirect=/shared/${token}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Já tenho conta? Fazer login
            </Link>
          </div>
        </div>
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
        projectCategories={projectCategories}
        projectMembers={projectMembers}
        projectId={project?.id || ''}
        canEdit={project.share_permission === 'edit'}
        allCards={cards}
        columns={columns}
      />
      
      {KanbanModals}
    </div>
  );
}
