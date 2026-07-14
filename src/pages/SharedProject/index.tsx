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
  const [guestJobTitle, setGuestJobTitle] = useState('');
  const [isCreatingGuest, setIsCreatingGuest] = useState(false);

  const { data, isLoading, refetch, setOptimisticColumns, setOptimisticCards } = useSharedProjectQuery(token);
  const project = data?.project;
  const columns = data?.columns || [];
  const cards = data?.cards || [];
  const projectCategories = data?.projectCategories || [];
  const projectMembers = data?.projectMembers || [];
  
  const isMember = user && projectMembers.some(m => m.profiles.id === user.id && (m.permission as string) !== 'pending');
  const isOwner = user && project?.owner_id === user.id;

  useEffect(() => {
    if ((isMember || isOwner) && project?.id) {
      navigate(`/project/${project.id}`);
    }
  }, [isMember, isOwner, project?.id, navigate]);
  const [activeCard, setActiveCard] = useState<KanbanCardType | null>(null);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const { openPrompt, openConfirm, KanbanModals } = useKanbanModals();

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
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: guestName.trim(),
            job_title: guestJobTitle.trim()
          }
        }
      });
      if (authError) throw authError;
      
      if (authData.user) {
         // Use RPC to bypass RLS and add member to the project securely
         if (token) {
           const { error: joinError } = await supabase.rpc('join_project_by_token', { p_token: token });
           if (joinError) throw joinError;
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

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/shared/${token}?autoJoin=true`
        }
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error('Erro ao conectar com Google: ' + err.message);
    }
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('autoJoin') === 'true' && user && project && !isMember && !isJoining) {
       handleJoinProject();
       // Limpar a url
       window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user, project, isMember, isJoining]);

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
            Por favor, informe seu nome e cargo para acessar este quadro. Você será listado como responsável pelas tarefas que assumir.
          </p>
          
          <form onSubmit={handleCreateGuestSession}>
            <input 
              type="text" 
              required 
              placeholder="Seu nome (ex: João Silva)" 
              className="w-full bg-background border border-border rounded-lg px-4 py-3 mb-3 focus:ring-2 focus:ring-primary focus:outline-none transition-all"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
            />
            <input 
              type="text" 
              placeholder="Seu cargo (ex: Desenvolvedor, QA, Designer)" 
              className="w-full bg-background border border-border rounded-lg px-4 py-3 mb-4 focus:ring-2 focus:ring-primary focus:outline-none transition-all"
              value={guestJobTitle}
              onChange={(e) => setGuestJobTitle(e.target.value)}
            />
            <button 
              type="submit" 
              disabled={isCreatingGuest || !guestName.trim()}
              className="w-full bg-primary text-primary-foreground font-semibold rounded-lg py-3 flex justify-center items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isCreatingGuest ? <Loader2 className="animate-spin" size={18} /> : 'Acessar Quadro'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-card text-muted-foreground">ou</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={isCreatingGuest}
            className="w-full flex items-center justify-center gap-3 bg-background border border-border text-foreground hover:bg-muted/50 rounded-lg py-3 font-medium transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continuar com Google
          </button>

          <div className="mt-6 text-center border-t border-border/50 pt-4">
            <Link to={`/login?redirect=/shared/${token}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Fazer login com email e senha
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
