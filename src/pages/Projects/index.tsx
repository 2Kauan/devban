import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { Link } from 'react-router-dom';
import { Plus, MoreVertical, LayoutDashboard, Clock, Folder, Star, Users, CheckCircle2, Menu } from 'lucide-react';
import type { Project } from '@/types/database';
import { toast } from 'sonner';

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      toast.error('Erro ao buscar projetos: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <Sidebar projects={projects} onProjectCreated={fetchProjects} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar bg-background">
        
        {/* Mobile Header */}
        <div className="md:hidden h-14 border-b border-border/40 flex items-center px-4 bg-background/50 backdrop-blur-md shrink-0">
          <button 
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground rounded-md transition-colors" 
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>
          <span className="ml-2 font-bold">Meus Projetos</span>
        </div>

        <div className="p-4 sm:p-8 max-w-[1400px] mx-auto w-full">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight">Meus Projetos</h1>
              <p className="text-muted-foreground mt-1">Gerencie e acompanhe todos os seus projetos.</p>
            </div>
            <button 
              onClick={() => document.dispatchEvent(new CustomEvent('open-create-project'))}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow active:scale-95 whitespace-nowrap w-full sm:w-auto"
            >
              <Plus size={18} />
              Novo Projeto
            </button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-[220px] bg-muted/40 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
              {projects.map((project) => (
                <div key={project.id} className="group relative bg-card border border-border/40 hover:border-primary/40 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col h-[220px]">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <Folder size={22} />
                    </div>
                    <div className="flex gap-1">
                      <button className="text-muted-foreground hover:text-yellow-500 p-1.5 rounded-md hover:bg-muted transition-colors">
                        <Star size={16} />
                      </button>
                      <button className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted transition-colors">
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <h3 className="font-bold text-lg text-foreground mb-1 truncate group-hover:text-primary transition-colors">{project.name}</h3>
                  <p className="text-[13px] text-muted-foreground line-clamp-2 mb-4 flex-1">
                    {project.description || 'Nenhuma descrição fornecida para este projeto.'}
                  </p>

                  <div className="mt-auto space-y-4">
                    {/* Metrics Placeholder */}
                    <div className="flex gap-4 text-xs font-medium text-muted-foreground">
                      <div className="flex items-center gap-1.5"><Users size={14} /> 1</div>
                      <div className="flex items-center gap-1.5"><CheckCircle2 size={14} /> 0/0</div>
                    </div>
                    
                    <div className="flex items-center justify-between border-t border-border/40 pt-4">
                      <div className="flex items-center gap-2 text-[11px] font-bold">
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
              ))}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
