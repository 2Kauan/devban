import { useState, useEffect } from 'react';
import { Outlet, useParams, Link, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { ChevronRight, LayoutDashboard, Layout, Users, Activity, Settings, Menu, CalendarDays, BrainCircuit } from 'lucide-react';
import type { Project } from '@/types/database';
import { toast } from 'sonner';
import { useProjectsQuery } from '@/hooks/useProjectsQuery';
import { useSharedProjectsQuery } from '@/hooks/useSharedProjectsQuery';
import { useQueryClient } from '@tanstack/react-query';

export function ProjectLayout() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();
  
  const [project, setProject] = useState<Project | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { data: ownedProjects = [] } = useProjectsQuery();
  const { data: sharedProjects = [] } = useSharedProjectsQuery();

  const projects = [...ownedProjects, ...sharedProjects.filter(sp => !ownedProjects.some(op => op.id === sp.id))];

  const fetchCurrentProject = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const { data: currentProject, error: projErr } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (projErr) throw new Error('Projeto não encontrado ou sem permissão.');
      setProject(currentProject);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && id) {
      fetchCurrentProject();
    }
  }, [user, id]);

  useEffect(() => {
    if (!project?.id) return;
    
    const channel = supabase
      .channel(`project_layout_${project.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'projects',
          filter: `id=eq.${project.id}`,
        },
        (payload) => {
          setProject((prev) => {
            if (JSON.stringify(prev) === JSON.stringify({ ...prev, ...payload.new })) {
              return prev;
            }
            return { ...prev, ...payload.new } as Project;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [project?.id]);

  const isOwner = project?.owner_id === user?.id;

  const tabs = [
    { name: 'Kanban', path: `/project/${id}`, icon: Layout, restricted: false },
    { name: 'Planejamento', path: `/project/${id}/planning`, icon: CalendarDays, restricted: false },
    { name: 'Resumo', path: `/project/${id}/resumo`, icon: LayoutDashboard, restricted: false },
    { name: project?.is_free ? 'IA (Premium)' : 'IA', path: `/project/${id}/ai`, icon: BrainCircuit, restricted: true },
    { name: 'Equipe', path: `/project/${id}/team`, icon: Users, restricted: false },
    { name: 'Atividades', path: `/project/${id}/activity`, icon: Activity, restricted: false },
    { name: 'Configurações', path: `/project/${id}/settings`, icon: Settings, restricted: true },
  ];

  const currentTabName = tabs.find(t => location.pathname === t.path)?.name || 'Kanban';

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <Sidebar projects={projects} onProjectCreated={() => {
        queryClient.invalidateQueries({ queryKey: ['projects'] });
        queryClient.invalidateQueries({ queryKey: ['sharedProjects'] });
        fetchCurrentProject();
      }} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} isProjectView={true} />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        <header className="h-14 border-b border-border/40 flex items-center px-4 sm:px-6 bg-background/50 backdrop-blur-md shrink-0">
          <button className="p-1.5 -ml-1.5 mr-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/50 transition-colors" onClick={() => setIsSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          
          <nav className="flex text-sm font-medium text-muted-foreground space-x-1 sm:space-x-2 truncate">
            <Link to="/projects" className="hover:text-foreground transition-colors">Projetos</Link>
            <ChevronRight size={16} className="shrink-0" />
            <span className="text-foreground truncate max-w-[120px] sm:max-w-[200px]">{project?.name || 'Carregando...'}</span>
            <ChevronRight size={16} className="shrink-0" />
            <span className="text-primary truncate">{currentTabName}</span>
          </nav>
        </header>

        <div className="border-b border-border/40 bg-card shrink-0">
          <div className="flex items-center gap-6 px-6 overflow-x-auto custom-scrollbar no-scrollbar-arrows">
            {tabs.filter(tab => !(tab.restricted && !isOwner)).map((tab) => {
              const isActive = location.pathname === tab.path;
              const Icon = tab.icon;

              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-bold whitespace-nowrap transition-colors ${
                    isActive 
                      ? 'border-primary text-primary' 
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  <Icon size={16} />
                  {tab.name}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden relative min-h-0">
          <Outlet key={location.pathname} context={{ project }} />
        </div>
      </main>
    </div>
  );
}
