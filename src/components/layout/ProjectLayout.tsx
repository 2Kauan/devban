import { useState, useEffect } from 'react';
import { Outlet, useParams, Link, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { ChevronRight, LayoutDashboard, Layout, Users, Activity, Settings, Menu, CalendarDays } from 'lucide-react';
import type { Project } from '@/types/database';
import { toast } from 'sonner';

export function ProjectLayout() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const location = useLocation();
  
  const [project, setProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch the current project directly by ID (works for owner AND member)
      const { data: currentProject, error: projErr } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (projErr) throw new Error('Projeto não encontrado ou sem permissão.');
      setProject(currentProject);

      // 2. Fetch all projects for sidebar (owned + member)
      const { data: ownedProjects } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', user?.id)
        .order('created_at', { ascending: false });

      const { data: memberRows } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user?.id);

      const memberIds = memberRows?.map(r => r.project_id) || [];
      let memberProjects: any[] = [];
      if (memberIds.length > 0) {
        const { data: mp } = await supabase
          .from('projects')
          .select('*')
          .in('id', memberIds);
        memberProjects = mp || [];
      }

      // Merge and deduplicate
      const allMap = new Map();
      [...(ownedProjects || []), ...memberProjects].forEach(p => allMap.set(p.id, p));
      setProjects(Array.from(allMap.values()));

    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && id) {
      fetchData();
    }
  }, [user, id]);

  const tabs = [
    { name: 'Kanban', path: `/project/${id}`, icon: Layout },
    { name: 'Planejamento', path: `/project/${id}/planning`, icon: CalendarDays },
    { name: 'Resumo', path: `/project/${id}/resumo`, icon: LayoutDashboard },
    { name: 'Equipe', path: `/project/${id}/team`, icon: Users },
    { name: 'Atividades', path: `/project/${id}/activity`, icon: Activity },
    { name: 'Configurações', path: `/project/${id}/settings`, icon: Settings },
  ];

  const currentTabName = tabs.find(t => location.pathname === t.path)?.name || 'Kanban';

  // Show loading spinner while fetching project data
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <Sidebar projects={projects} onProjectCreated={fetchData} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        {/* Top Header / Breadcrumb */}
        <header className="h-14 border-b border-border/40 flex items-center px-4 sm:px-6 bg-background/50 backdrop-blur-md shrink-0">
          <button className="md:hidden p-1.5 -ml-1.5 mr-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/50 transition-colors" onClick={() => setIsSidebarOpen(true)}>
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

        {/* Project Navigation Tabs */}
        <div className="border-b border-border/40 bg-card shrink-0">
          <div className="flex items-center gap-6 px-6 overflow-x-auto custom-scrollbar no-scrollbar-arrows">
            {tabs.map((tab) => {
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

        {/* Dynamic Content */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <Outlet context={{ project }} />
        </div>
      </main>
    </div>
  );
}
