import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { KanbanColumnType, KanbanCardType } from '@/types/kanban';
import type { Project as ProjectType, Category, ProjectPermission } from '@/types/database';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { toast } from 'sonner';
import { ArrowLeft, Share2, Search, Filter, Bell } from 'lucide-react';
import { CardModal } from '@/components/ui/CardModal';
import { PromptModal } from '@/components/ui/PromptModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ShareModal } from '@/components/ui/ShareModal';
import { AccessRequestsModal } from '@/components/ui/AccessRequestsModal';
import { useAuth } from '@/contexts/AuthContext';


export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [project, setProject] = useState<ProjectType | null>(null);
  const [columns, setColumns] = useState<KanbanColumnType[]>([]);
  const [cards, setCards] = useState<KanbanCardType[]>([]);
  const [projectCategories, setProjectCategories] = useState<Category[]>([]);
  const [userPermission, setUserPermission] = useState<ProjectPermission | null>(null);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // States for modals
  const [activeCard, setActiveCard] = useState<KanbanCardType | null>(null);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isAccessRequestsOpen, setIsAccessRequestsOpen] = useState(false);
  const [promptConfig, setPromptConfig] = useState<{
    isOpen: boolean;
    title: string;
    placeholder?: string;
    onSubmit: (val: string) => void;
  }>({
    isOpen: false,
    title: '',
    onSubmit: () => {}
  });
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  useEffect(() => {
    if (!id) return;
    
    fetchProjectData();

    // Subscribe to realtime changes
    const channel = supabase.channel(`public:project_${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cards', filter: `project_id=eq.${id}` },
        () => {
          fetchProjectData(true); // silent update
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'columns', filter: `project_id=eq.${id}` },
        () => {
          fetchProjectData(true); // silent update
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const fetchProjectData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      // Fetch project
      const { data: projectData, error: projError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();
      
      if (projError) throw projError;
      setProject(projectData);

      // Determine permission
      let perm: ProjectPermission = 'viewer';
      if (user) {
        if (projectData.owner_id === user.id) {
          perm = 'owner';
          // Check pending requests
          const { count } = await supabase
            .from('project_access_requests')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', id)
            .eq('status', 'pending');
          setPendingRequestsCount(count || 0);
        } else {
          const { data: memberData } = await supabase
            .from('project_members')
            .select('permission')
            .eq('project_id', id)
            .eq('user_id', user.id)
            .maybeSingle();
          if (memberData) {
            perm = memberData.permission;
          }
        }
      }
      setUserPermission(perm);

      // Fetch columns
      const { data: colsData, error: colsError } = await supabase
        .from('columns')
        .select('*')
        .eq('project_id', id)
        .order('position', { ascending: true });
      
      if (colsError) throw colsError;
      setColumns(colsData || []);

      // Se é projeto novo e não tem colunas, cria as padrões
      if (!colsData || colsData.length === 0) {
        await createDefaultColumns(id!);
        return; // createDefaultColumns will refetch
      }

      // Fetch cards
      const { data: cardsData, error: cardsError } = await supabase
        .from('cards')
        .select('*')
        .eq('project_id', id)
        .order('position', { ascending: true });
      
      if (cardsError) throw cardsError;

      // Fetch categories
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('*')
        .eq('project_id', id);
      
      if (catError) throw catError;
      setProjectCategories(catData || []);

      // Fetch card_categories
      let enrichedCards = cardsData || [];
      if (cardsData && cardsData.length > 0) {
        const cardIds = cardsData.map(c => c.id);
        const { data: cardCatData, error: cardCatError } = await supabase
          .from('card_categories')
          .select('*')
          .in('card_id', cardIds);
        
        if (!cardCatError && cardCatData) {
          enrichedCards = cardsData.map(card => {
            const cardCatRelations = cardCatData.filter(cc => cc.card_id === card.id);
            const cardCategories = cardCatRelations
              .map(cc => catData?.find(c => c.id === cc.category_id))
              .filter(Boolean) as Category[];
            
            return { ...card, categories: cardCategories };
          });
        }
      }

      setCards(enrichedCards);

    } catch (error: any) {
      console.error('Error fetching project:', error);
      toast.error('Erro ao carregar projeto: ' + error.message);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const createDefaultColumns = async (projectId: string) => {
    const defaultCols = [
      { project_id: projectId, title: 'Ideias', position: 1000 },
      { project_id: projectId, title: 'A Fazer', position: 2000 },
      { project_id: projectId, title: 'Fazendo', position: 3000 },
      { project_id: projectId, title: 'Revisão', position: 4000 },
      { project_id: projectId, title: 'Concluído', position: 5000 },
    ];

    try {
      const { error } = await supabase.from('columns').insert(defaultCols);
      if (error) throw error;
      fetchProjectData();
    } catch (error: any) {
      toast.error('Erro ao criar colunas padrão: ' + error.message);
    }
  };

  const handleColumnsChange = async (newColumns: KanbanColumnType[]) => {
    // Optimistic update
    const updatedColumns = newColumns.map((col, index) => ({
      ...col,
      position: (index + 1) * 1000
    }));
    setColumns(updatedColumns);

    // Save to DB
    try {
      const updates = updatedColumns.map(col => ({
        id: col.id,
        project_id: col.project_id,
        title: col.title,
        position: col.position
      }));
      
      const { error } = await supabase.from('columns').upsert(updates);
      if (error) throw error;
    } catch (error: any) {
      toast.error('Erro ao salvar nova ordem das colunas');
      fetchProjectData(); // revert on error
    }
  };

  const handleCardsChange = async (newCards: KanbanCardType[]) => {
    // Optimistic update
    const updatedCards = newCards.map((card, index) => ({
      ...card,
      position: (index + 1) * 1000
    }));
    setCards(updatedCards);

    // Save to DB
    try {
      const updates = updatedCards.map(card => ({
        id: card.id,
        project_id: card.project_id,
        column_id: card.column_id,
        title: card.title,
        position: card.position
      }));

      const { error } = await supabase.from('cards').upsert(updates);
      if (error) throw error;
    } catch (error: any) {
      toast.error('Erro ao salvar posição do cartão');
      fetchProjectData(); // revert
    }
  };

  const handleCardMove = async (cardId: string, sourceColId: string, destColId: string) => {
    if (!user) return;
    const sourceCol = columns.find(c => c.id === sourceColId);
    const destCol = columns.find(c => c.id === destColId);
    if (!sourceCol || !destCol) return;

    try {
      await supabase.from('card_activity_logs').insert({
        card_id: cardId,
        project_id: id,
        user_id: user.id,
        action: 'moved_card',
        old_value: { column_title: sourceCol.title },
        new_value: { column_title: destCol.title }
      });
    } catch (error) {
      console.error('Failed to log move:', error);
    }
  };

  const handleAddColumn = () => {
    setPromptConfig({
      isOpen: true,
      title: 'Nome da nova coluna:',
      placeholder: 'Ex: Para Fazer',
      onSubmit: async (title: string) => {
        setPromptConfig(prev => ({ ...prev, isOpen: false }));
        if (!title.trim()) return;

        const newPosition = columns.length > 0 ? columns[columns.length - 1].position + 1000 : 1000;

        try {
          const { data, error } = await supabase
            .from('columns')
            .insert({
              project_id: id,
              title: title.trim(),
              position: newPosition,
            })
            .select()
            .single();

          if (error) throw error;
          setColumns(prev => [...prev, data]);
        } catch (error: any) {
          toast.error('Erro ao criar coluna: ' + error.message);
        }
      }
    });
  };

  const handleUpdateColumn = async (columnId: string, updates: Partial<KanbanColumnType>) => {
    // Optimistic
    setColumns(columns.map(c => c.id === columnId ? { ...c, ...updates } : c));
    try {
      const { error } = await supabase.from('columns').update(updates).eq('id', columnId);
      if (error) throw error;
    } catch (error: any) {
      toast.error('Erro ao atualizar coluna');
      fetchProjectData();
    }
  };

  const handleDeleteColumn = (columnId: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Excluir Coluna',
      message: 'Tem certeza que deseja excluir esta coluna? Todas as tarefas nela serão perdidas.',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('columns')
            .delete()
            .eq('id', columnId);

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
        if (!title.trim()) return;

        const columnCards = cards.filter(c => c.column_id === columnId);
        const newPosition = columnCards.length > 0 ? columnCards[columnCards.length - 1].position + 1000 : 1000;

        try {
          const { data, error } = await supabase
            .from('cards')
            .insert({
              project_id: id,
              column_id: columnId,
              title: title.trim(),
              position: newPosition,
              priority: 'medium'
            })
            .select()
            .single();

          if (error) throw error;
          setCards(prev => [...prev, data]);
          
          // Log activity
          if (user) {
            await supabase.from('card_activity_logs').insert({
              card_id: data.id,
              project_id: id,
              user_id: user.id,
              action: 'created_card'
            });
          }
        } catch (error: any) {
          toast.error('Erro ao criar cartão: ' + error.message);
        }
      }
    });
  };

  const handleCardClick = (card: KanbanCardType) => {
    setActiveCard(card);
    setIsCardModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
    <div className="flex-1 flex flex-col h-full bg-muted/10 overflow-hidden">
      {/* Project Header */}
      <header className="bg-card border-b border-border p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground leading-tight">{project.name}</h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
              <span>{columns.length} colunas</span>
              <span className="w-1 h-1 bg-border rounded-full"></span>
              <span>{cards.length} tarefas</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {userPermission === 'owner' && (
            <button
              onClick={() => setIsAccessRequestsOpen(true)}
              className="relative p-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg transition-colors"
              title="Solicitações de Acesso"
            >
              <Bell size={20} />
              {pendingRequestsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              )}
            </button>
          )}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input 
              type="text" 
              placeholder="Pesquisar..." 
              className="w-full pl-9 pr-4 py-2 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:bg-background transition-all"
            />
          </div>
          <button className="p-2 text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent rounded-lg transition-colors" title="Filtrar">
            <Filter size={18} />
          </button>
          <div className="w-px h-6 bg-border mx-1"></div>
          <button 
            onClick={handleShare}
            className="flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground font-medium rounded-lg transition-colors text-sm"
          >
            <Share2 size={16} />
            Compartilhar
          </button>
        </div>
      </header>

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
        onUpdate={() => fetchProjectData(true)}
        projectCategories={projectCategories}
        projectId={project?.id || ''}
        canEdit={userPermission === 'owner' || userPermission === 'editor'}
      />
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        project={project}
        onUpdate={() => fetchProjectData(true)}
      />
      <AccessRequestsModal
        isOpen={isAccessRequestsOpen}
        onClose={() => {
          setIsAccessRequestsOpen(false);
          fetchProjectData(true);
        }}
        projectId={project?.id || ''}
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

