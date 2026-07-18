import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, MoreVertical, Folder, Star, Users, CheckCircle2, Trash2, FolderKanban } from 'lucide-react';
import type { Project } from '@/types/database';
import { toast } from 'sonner';
import { useFavorites } from '@/hooks/useFavorites';
import { motion, AnimatePresence } from 'framer-motion';
import { DeleteProjectModal } from '@/components/ui/DeleteProjectModal';
import { useProjectsQuery } from '@/hooks/useProjectsQuery';
import { useStockQuery } from '@/hooks/useStockQuery';
import { useProjectMemberCounts } from '@/hooks/useProjectMemberCounts';
import { useQueryClient } from '@tanstack/react-query';

function ProjectCard({ project, onDelete, onComplete, memberCount = 1 }: { project: Project, onDelete: (p: Project) => void, onComplete?: (p: Project) => void, memberCount?: number }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { favorites, toggleFavorite } = useFavorites(user?.id);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isFavorite = favorites.includes(project.id);
  const isOwner = user?.id === project.owner_id;

  const handleClickOutside = (event: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      setIsMenuOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDelete = async () => {
    setIsMenuOpen(false);
    if (!isOwner) {
      toast.error('Apenas o dono do projeto pode excluir.');
      return;
    }
    onDelete(project);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.action-btn')) return;
    navigate(`/project/${project.id}`);
  };

  return (
    <div 
      onClick={handleCardClick}
      className={`group relative cursor-pointer bg-card border border-border/40 hover:border-primary/40 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col h-[220px] ${project.is_completed ? 'opacity-50 grayscale hover:opacity-80 hover:grayscale-0' : ''}`}
    >
      <div className="flex justify-between items-start mb-4 relative z-20">
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <Folder size={22} />
        </div>
        <div className="flex gap-1 relative action-btn" ref={menuRef}>
          <button 
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(project.id); }}
            className={`p-1.5 rounded-md hover:bg-muted transition-colors ${isFavorite ? 'text-yellow-500' : 'text-muted-foreground hover:text-yellow-500'}`}
            title={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          >
            <Star size={16} fill={isFavorite ? "currentColor" : "none"} />
          </button>
          <button 
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted transition-colors"
          >
            <MoreVertical size={16} />
          </button>
          
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.1 }}
                className="absolute right-0 top-full mt-1 w-44 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-[100]"
              >
                <div className="flex flex-col py-1">
                  <button onClick={(e) => { 
                    e.preventDefault(); 
                    e.stopPropagation();
                    setIsMenuOpen(false);
                    if (!isOwner) { toast.error('Apenas o dono pode alterar o status.'); return; }
                    onComplete?.(project);
                  }} className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted/50 w-full text-left">
                    <CheckCircle2 size={14} className={project.is_completed ? "text-primary" : ""} /> 
                    {project.is_completed ? 'Reabrir Projeto' : 'Finalizar Projeto'}
                  </button>
                  <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(); }} className="flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 w-full text-left">
                    <Trash2 size={14} /> Excluir
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      <h3 className="font-bold text-lg text-foreground mb-1 truncate group-hover:text-primary transition-colors pr-2 relative z-10 pointer-events-none">{project.name}</h3>
      <p className="text-[13px] text-muted-foreground line-clamp-2 mb-4 flex-1 relative z-10 pointer-events-none">
        {project.description || 'Nenhuma descrição fornecida para este projeto.'}
      </p>

      <div className="mt-auto space-y-4 relative z-10">
        <div className="flex gap-4 text-xs font-medium text-muted-foreground pointer-events-none">
          <div className="flex items-center gap-1.5"><Users size={14} /> {memberCount}</div>
          <div className="flex items-center gap-1.5"><CheckCircle2 size={14} /> 0/0</div>
        </div>
        
        <div className="flex items-center justify-between border-t border-border/40 pt-4">
          <div className="flex items-center gap-2 text-[11px] font-bold pointer-events-none">
            <span className={`px-2 py-1 rounded-md ${project.is_free ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
              {project.is_free ? 'GRATUITO' : 'PREMIUM'}
            </span>
          </div>
          
          <Link 
            to={`/project/${project.id}`}
            className="text-[13px] font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
          >
            Abrir Projeto
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Projects() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { favorites } = useFavorites(user?.id);
  const [filter, setFilter] = useState<'all' | 'favorites'>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const { data: projects = [], isLoading } = useProjectsQuery();
  const { data: stock = 0 } = useStockQuery(projects.filter(p => !p.is_free).length);
  const projectIds = projects.map(p => p.id);
  const { data: memberCounts = {} } = useProjectMemberCounts(projectIds);

  const isFavorites = filter === 'favorites';
  const displayedProjects = isFavorites 
    ? projects.filter(p => favorites.includes(p.id))
    : projects;

  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const handleToggleComplete = async (projectToToggle: Project) => {
    try {
      const newStatus = !projectToToggle.is_completed;
      const { error } = await supabase
        .from('projects')
        .update({ is_completed: newStatus })
        .eq('id', projectToToggle.id);

      if (error) throw error;
      
      queryClient.setQueryData<Project[]>(['projects', user?.id], (old) =>
        (old || []).map(p => 
          p.id === projectToToggle.id ? { ...p, is_completed: newStatus } : p
        )
      );
      
      toast.success(newStatus ? 'Projeto finalizado com sucesso!' : 'Projeto reaberto!');
    } catch (error: any) {
      toast.error('Erro ao atualizar status do projeto: ' + error.message);
    }
  };

  const handleProjectCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    queryClient.invalidateQueries({ queryKey: ['stock'] });
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <Sidebar onProjectCreated={handleProjectCreated} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar bg-background">
        
        <TopHeader title="Meus Projetos" onOpenSidebar={() => setIsSidebarOpen(true)} />

        <div className="p-4 sm:p-8 max-w-[1400px] mx-auto w-full">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
                <FolderKanban className="text-primary" size={28} />
                Meus Projetos
              </h1>
              <p className="text-muted-foreground mt-1">
                Gerencie e acompanhe todos os seus projetos.
              </p>
            </div>
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 text-primary rounded-lg font-bold">
                Projetos em Estoque: <span className="text-xl leading-none">{stock}</span>
              </div>
              <button 
                onClick={() => document.dispatchEvent(new CustomEvent('open-create-project'))}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow active:scale-95 whitespace-nowrap w-full sm:w-auto"
              >
                <Plus size={18} />
                Novo Projeto
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mb-8 bg-muted/30 p-1 rounded-lg w-max border border-border/50">
            <button 
              onClick={() => setFilter('all')} 
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filter === 'all' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Todos
            </button>
            <button 
              onClick={() => setFilter('favorites')} 
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${filter === 'favorites' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Star size={14} className={filter === 'favorites' ? "text-yellow-500 fill-yellow-500" : ""} />
              Favoritos
            </button>
          </div>
          
          <div className="sm:hidden mb-6 flex items-center justify-center gap-2 px-4 py-3 bg-primary/10 border border-primary/20 text-primary rounded-lg font-bold">
            Projetos em Estoque: <span className="text-xl leading-none">{stock}</span>
          </div>

          {isLoading && projects.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-[220px] bg-muted/40 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : displayedProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                {isFavorites ? <Star size={32} /> : <FolderKanban size={32} />}
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                {isFavorites ? 'Nenhum favorito' : 'Nenhum projeto'}
              </h3>
              <p className="text-muted-foreground max-w-sm mb-6">
                {isFavorites 
                  ? 'Você ainda não adicionou nenhum projeto aos favoritos. Clique na estrela de um projeto para favoritá-lo.' 
                  : 'Você ainda não possui projetos. Crie seu primeiro projeto para começar.'}
              </p>
              {!isFavorites && (
                <button 
                  onClick={() => document.dispatchEvent(new CustomEvent('open-create-project'))}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Criar Primeiro Projeto
                </button>
              )}
            </div>
          ) : (
            <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
              <AnimatePresence mode="popLayout">
                {displayedProjects.map((project) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2, type: "spring", bounce: 0.3 }}
                    key={project.id}
                  >
                    <ProjectCard 
                      project={project} 
                      onDelete={setProjectToDelete}
                      onComplete={handleToggleComplete}
                      memberCount={(memberCounts[project.id] || 0) + 1}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}

        </div>
      </main>

      <DeleteProjectModal
        isOpen={!!projectToDelete}
        onClose={() => setProjectToDelete(null)}
        projectName={projectToDelete?.name || ''}
        projectId={projectToDelete?.id || ''}
        isUsed={projectToDelete?.is_used}
        isFree={projectToDelete?.is_free}
        onSuccess={handleProjectCreated}
      />
    </div>
  );
}
