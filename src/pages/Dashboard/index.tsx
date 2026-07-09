import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Bell, FolderKanban, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { UserProfileButton } from '@/components/ui/UserProfileButton';
import type { Project } from '@/types/database';
import { toast } from 'sonner';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
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

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <Sidebar projects={projects} onProjectCreated={fetchProjects} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-muted/10">
        <header className="h-16 border-b border-border/50 flex items-center justify-between px-4 sm:px-6 bg-background">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <div>
              <h1 className="text-xl font-bold">Meus Projetos</h1>
              <p className="text-sm text-muted-foreground hidden sm:block">Bem-vindo, {profile?.name || user?.email}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Buscar projetos..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-64 rounded-md border border-input bg-background px-9 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              />
            </div>
            <button className="relative p-2 text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
              <Bell className="h-5 w-5" />
            </button>
            <UserProfileButton />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          <div className="sm:hidden mb-4 flex items-center gap-2 w-full">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Buscar projetos..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-9 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              />
            </div>
            <button className="relative p-2 text-muted-foreground hover:text-foreground transition-colors shrink-0">
              <Bell className="h-5 w-5" />
            </button>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
                <FolderKanban className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold mb-2">Nenhum projeto ainda</h2>
              <p className="text-muted-foreground mb-6">Crie seu primeiro projeto para começar a organizar suas tarefas no Kanban.</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-muted-foreground">Nenhum projeto encontrado para "{searchQuery}"</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProjects.map((project, idx) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                >
                  <div 
                    onClick={() => navigate(`/project/${project.id}`)}
                    className="block h-full bg-card rounded-xl border border-border/60 p-5 shadow-sm hover:shadow-md hover:border-primary/50 transition-all group relative overflow-hidden cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-4 relative z-10">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                        <FolderKanban className="h-5 w-5" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${project.is_free ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
                          {project.is_free ? 'Grátis' : 'Premium'}
                        </span>
                      </div>
                    </div>
                    <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors line-clamp-1 relative z-10">{project.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px] relative z-10">
                      {project.description || 'Sem descrição'}
                    </p>
                    <div className="mt-4 pt-4 border-t border-border/50 text-xs text-muted-foreground flex justify-between items-center relative z-10">
                      <span>Atualizado em {new Date(project.updated_at).toLocaleDateString('pt-BR')}</span>
                      <span className="text-primary font-medium hover:underline">Abrir &rarr;</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
