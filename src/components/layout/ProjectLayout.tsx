import { useState, useEffect } from 'react';
import { Outlet, useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { ChevronRight, LayoutDashboard, Layout, Users, Activity, Settings, Menu, CalendarDays, BrainCircuit, HeartPulse } from 'lucide-react';
import { toast } from 'sonner';
import { useProjectsQuery } from '@/hooks/useProjectsQuery';
import { useSharedProjectsQuery } from '@/hooks/useSharedProjectsQuery';
import { useProjectQuery } from '@/hooks/useProjectQuery';
import { useQueryClient } from '@tanstack/react-query';
import { touchProject } from '@/utils/recentProjects';

export function ProjectLayout() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isKicked, setIsKicked] = useState(false);

  const { data: ownedProjects = [] } = useProjectsQuery();
  const { data: sharedProjects = [] } = useSharedProjectsQuery();
  const { data: projectData, isLoading: isProjectLoading } = useProjectQuery(id);

  const projects = [...ownedProjects, ...sharedProjects.filter(sp => !ownedProjects.some(op => op.id === sp.id))];
  const project = projectData?.project || projects.find(p => p.id === id) || null;
  const isLoading = isProjectLoading && !project;

  useEffect(() => {
    if (user && id) {
      touchProject(id, queryClient);
    }
  }, [user, id]);

  useEffect(() => {
    if (!project?.id || !user) return;
    
    const channel = supabase
      .channel(`project_layout_${project.id}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'projects',
          filter: `id=eq.${project.id}`,
        },
        (_payload) => {
          queryClient.invalidateQueries({ queryKey: ['project', id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_members',
          filter: `project_id=eq.${project.id}`,
        },
        async (payload) => {
          if (payload.eventType === 'DELETE' && payload.old.user_id === user.id) {
            setIsKicked(true);
            toast.error('Você foi removido deste projeto pelo proprietário.');
            setTimeout(() => {
              navigate('/projects');
            }, 3000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [project?.id, user, navigate, id, queryClient]);

  const isOwner = project?.owner_id === user?.id;

  const tabs = [
    { name: 'Kanban', path: `/project/${id}`, icon: Layout, restricted: false },
    { name: 'Planejamento', path: `/project/${id}/planning`, icon: CalendarDays, restricted: false },
    { name: 'Resumo', path: `/project/${id}/resumo`, icon: LayoutDashboard, restricted: false },
    { name: project?.is_free ? 'IA (Premium)' : 'IA', path: `/project/${id}/ai`, icon: BrainCircuit, restricted: true },
    { name: 'Equipe', path: `/project/${id}/team`, icon: Users, restricted: false },
    { name: 'Atividades', path: `/project/${id}/activity`, icon: Activity, restricted: false },
    { name: 'Saúde', path: `/project/${id}/health`, icon: HeartPulse, restricted: false },
    { name: 'Configurações', path: `/project/${id}/settings`, icon: Settings, restricted: true },
  ];

  const currentTabName = tabs.find(t => location.pathname === t.path)?.name || 'Kanban';

  if (isKicked) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mx-auto mb-4">
            <Users size={32} />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Acesso Removido</h2>
          <p className="text-muted-foreground mb-6">Você foi removido deste projeto por um administrador.</p>
          <button
            onClick={() => navigate('/projects')}
            className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Voltar para Projetos
          </button>
        </div>
      </div>
    );
  }

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
        queryClient.invalidateQueries({ queryKey: ['stock'] });
        if (id) queryClient.invalidateQueries({ queryKey: ['project', id] });
      }} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} isProjectView={true} />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        <header className="h-14 border-b border-border/40 flex items-center px-4 sm:px-6 bg-background/50 backdrop-blur-md shrink-0">
          <button className="p-2 -ml-2 mr-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/50 transition-colors" onClick={() => setIsSidebarOpen(true)}>
            <Menu size={24} />
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
                  className={`group flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-bold whitespace-nowrap transition-all duration-300 ${
                    isActive 
                      ? 'border-primary text-primary' 
                      : 'border-transparent text-muted-foreground hover:text-primary hover:border-primary/50'
                  }`}
                >
                  <Icon size={16} className="transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-0.5" />
                  <span className="transition-transform duration-300 group-hover:translate-x-0.5">{tab.name}</span>
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
