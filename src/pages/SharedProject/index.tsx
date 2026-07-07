import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { KanbanColumnType, KanbanCardType } from '@/types/kanban';
import type { Project as ProjectType } from '@/types/database';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { toast } from 'sonner';
import { ArrowLeft, UserPlus, LogIn } from 'lucide-react';
import { CardModal } from '@/components/ui/CardModal';
import { PromptModal } from '@/components/ui/PromptModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useAuth } from '@/contexts/AuthContext';

export default function SharedProject() {
  const { token } = useParams<{ token: string }>();
  const [project, setProject] = useState<ProjectType | null>(null);
  const [columns, setColumns] = useState<KanbanColumnType[]>([]);
  const [cards, setCards] = useState<KanbanCardType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const { user } = useAuth();
  const [activeCard, setActiveCard] = useState<KanbanCardType | null>(null);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [promptConfig, setPromptConfig] = useState<{
    isOpen: boolean;
    title: string;
    placeholder?: string;
    onSubmit: (val: string) => void;
  }>({ isOpen: false, title: '', onSubmit: () => {} });
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  useEffect(() => {
    if (token) {
      fetchSharedProject();
    }
  }, [token]);

  // Set up realtime after project is loaded
  useEffect(() => {
    if (!project?.id) return;
    
    const channel = supabase.channel(`public:shared_project_${project.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cards', filter: `project_id=eq.${project.id}` },
        () => {
          fetchSharedProject(true);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'columns', filter: `project_id=eq.${project.id}` },
        () => {
          fetchSharedProject(true);
        }
      )
        .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects', filter: `id=eq.${project.id}` },
        () => {
          fetchSharedProject(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [project?.id]);

  const fetchSharedProject = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      // Fetch project by share_token
      const { data: projectData, error: projError } = await supabase
        .from('projects')
        .select('*')
        .eq('share_token', token)
        .eq('share_enabled', true)
        .single();
      
      if (projError) throw projError;
      setProject(projectData);

      // Fetch columns
      const { data: colsData } = await supabase
        .from('columns')
        .select('*')
        .eq('project_id', projectData.id)
        .order('position', { ascending: true });
      
      setColumns(colsData || []);

      // Fetch cards
      const { data: cardsData } = await supabase
        .from('cards')
        .select('*')
        .eq('project_id', projectData.id)
        .order('position', { ascending: true });
      
      setCards(cardsData || []);

    } catch (error: any) {
      toast.error('Projeto não encontrado ou acesso revogado.');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const handleCardClick = (card: KanbanCardType) => {
    setActiveCard(card);
    setIsCardModalOpen(true);
  };

  const handleColumnsChange = async (newColumns: KanbanColumnType[]) => {
    const updatedColumns = newColumns.map((col, index) => ({ ...col, position: (index + 1) * 1000 }));
    setColumns(updatedColumns);
    try {
      const updates = updatedColumns.map(col => ({ id: col.id, project_id: col.project_id, title: col.title, position: col.position }));
      const { error } = await supabase.from('columns').upsert(updates);
      if (error) throw error;
    } catch (error: any) {
      toast.error('Erro ao salvar nova ordem das colunas');
      fetchSharedProject(true);
    }
  };

  const handleCardsChange = async (newCards: KanbanCardType[]) => {
    const updatedCards = newCards.map((card, index) => ({ ...card, position: (index + 1) * 1000 }));
    setCards(updatedCards);
    try {
      const updates = updatedCards.map(card => ({ id: card.id, project_id: card.project_id, column_id: card.column_id, title: card.title, position: card.position }));
      const { error } = await supabase.from('cards').upsert(updates);
      if (error) throw error;
    } catch (error: any) {
      toast.error('Erro ao salvar posição do cartão');
      fetchSharedProject(true);
    }
  };

  const handleAddColumn = () => {
    setPromptConfig({
      isOpen: true,
      title: 'Nome da nova coluna:',
      placeholder: 'Ex: Para Fazer',
      onSubmit: async (title: string) => {
        setPromptConfig(prev => ({ ...prev, isOpen: false }));
        if (!title.trim() || !project) return;
        const newPosition = columns.length > 0 ? columns[columns.length - 1].position + 1000 : 1000;
        try {
          const { data, error } = await supabase.from('columns').insert({ project_id: project.id, title: title.trim(), position: newPosition }).select().single();
          if (error) throw error;
          setColumns(prev => [...prev, data]);
        } catch (error: any) {
          toast.error('Erro ao criar coluna: ' + error.message);
        }
      }
    });
  };

  const handleUpdateColumn = async (columnId: string, updates: Partial<KanbanColumnType>) => {
    setColumns(columns.map(c => c.id === columnId ? { ...c, ...updates } : c));
    try {
      const { error } = await supabase.from('columns').update(updates).eq('id', columnId);
      if (error) throw error;
    } catch (error: any) {
      toast.error('Erro ao atualizar coluna');
      fetchSharedProject(true);
    }
  };

  const handleDeleteColumn = (columnId: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Excluir Coluna',
      message: 'Tem certeza que deseja excluir esta coluna? Todas as tarefas nela serão perdidas.',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('columns').delete().eq('id', columnId);
          if (error) throw error;
          setColumns(prev => prev.filter(c => c.id !== columnId));
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        } catch (error: any) {
          toast.error('Erro ao excluir coluna: ' + error.message);
        }
      }
    });
  };

  const handleAddCard = (columnId: string) => {
    setPromptConfig({
      isOpen: true,
      title: 'Título da tarefa:',
      placeholder: 'Ex: Desenvolver página inicial',
      onSubmit: async (title: string) => {
        setPromptConfig(prev => ({ ...prev, isOpen: false }));
        if (!title.trim() || !project) return;
        const columnCards = cards.filter(c => c.column_id === columnId);
        const newPosition = columnCards.length > 0 ? columnCards[columnCards.length - 1].position + 1000 : 1000;
        try {
          const { data, error } = await supabase.from('cards').insert({ project_id: project.id, column_id: columnId, title: title.trim(), position: newPosition, priority: 'medium' }).select().single();
          if (error) throw error;
          setCards(prev => [...prev, data]);
        } catch (error: any) {
          toast.error('Erro ao criar cartão: ' + error.message);
        }
      }
    });
  };

  const handleCardMove = async () => {}; // Viewers might not log activity if anonymous

  const handleJoinProject = async () => {
    if (!user) return;
    setIsJoining(true);
    try {
      const { data: projectId, error } = await supabase.rpc('join_project_by_token', { p_token: token });
      if (error) throw error;
      toast.success('Solicitação de acesso enviada com sucesso! Aguarde a aprovação do dono.');
      // Opcionalmente mudar o estado para 'Pendente' se tivéssemos um fetch disso, mas por enquanto:
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
      <header className="bg-card border-b border-border p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground leading-tight">{project.name}</h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
            {project.share_permission !== 'edit' && (
              <>
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-semibold uppercase">Modo Visualização Pública</span>
                <span className="w-1 h-1 bg-border rounded-full"></span>
              </>
            )}
            <span>{columns.length} colunas</span>
            <span className="w-1 h-1 bg-border rounded-full"></span>
            <span>{cards.length} tarefas</span>
          </div>
        </div>
      </div>
        
        <div className="flex items-center gap-3">
          {project.share_permission !== 'edit' && (
            user ? (
              <button
                onClick={handleJoinProject}
                disabled={isJoining}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium transition-colors shadow-sm"
              >
                <UserPlus size={18} />
                {isJoining ? 'Enviando Pedido...' : 'Solicitar Acesso à Equipe'}
              </button>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-2 px-4 py-2 bg-muted text-muted-foreground hover:bg-border rounded-lg font-medium transition-colors"
              >
                <LogIn size={18} />
                Fazer Login para Solicitar
              </Link>
            )
          )}
        </div>
      </header>

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
        onUpdate={() => fetchSharedProject(true)}
        projectId={project?.id || ''}
        canEdit={project.share_permission === 'edit'}
      />
      
      <PromptModal
        isOpen={promptConfig.isOpen}
        title={promptConfig.title}
        placeholder={promptConfig.placeholder}
        onClose={() => setPromptConfig(prev => ({ ...prev, isOpen: false }))}
        onSubmit={promptConfig.onSubmit}
      />
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
