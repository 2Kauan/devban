import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { useNavigate } from 'react-router-dom';
import { Folder, Users, CheckCircle2, UserCircle, FolderKanban } from 'lucide-react';
import type { Project } from '@/types/database';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface SharedProject extends Project {
  owner_name?: string | null;
  permission?: string;
}

function SharedProjectCard({ project }: { project: SharedProject }) {
  const navigate = useNavigate();

  return (
    <div 
      onClick={() => navigate(`/project/${project.id}`)}
      className="group relative cursor-pointer bg-card border border-border/40 hover:border-primary/40 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col h-[220px]"
    >
      <div className="flex justify-between items-start mb-4 relative z-20">
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <Folder size={22} />
        </div>
        <span className="px-2 py-1 rounded-md bg-secondary/50 text-secondary-foreground text-[11px] font-bold">
          {project.permission === 'admin' ? 'Admin' : project.permission === 'editor' ? 'Editor' : 'Leitor'}
        </span>
      </div>
      
      <h3 className="font-bold text-lg text-foreground mb-1 truncate group-hover:text-primary transition-colors pr-2 relative z-10 pointer-events-none">{project.name}</h3>
      <p className="text-[13px] text-muted-foreground line-clamp-2 mb-4 flex-1 relative z-10 pointer-events-none">
        {project.description || 'Nenhuma descrição fornecida para este projeto.'}
      </p>

      <div className="mt-auto space-y-4 relative z-10">
        <div className="flex gap-4 text-xs font-medium text-muted-foreground pointer-events-none">
          <div className="flex items-center gap-1.5"><Users size={14} /> 1</div>
          <div className="flex items-center gap-1.5"><CheckCircle2 size={14} /> 0/0</div>
        </div>
        
        <div className="flex items-center justify-between border-t border-border/40 pt-4">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pointer-events-none">
            <UserCircle size={14} />
            <span className="font-medium truncate max-w-[150px]">
              {project.owner_name || 'Desconhecido'}
            </span>
          </div>
          
          <span className="text-[13px] font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-1 pointer-events-none">
            Abrir Projeto
          </span>
        </div>
      </div>
    </div>
  );
}

export default function SharedProjects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<SharedProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSharedProjects();
    }
  }, [user]);

  const fetchSharedProjects = async () => {
    setIsLoading(true);
    try {
      const { data: memberships, error: memberError } = await supabase
        .from('project_members')
        .select('project_id, permission')
        .eq('user_id', user?.id)
        .neq('permission', 'owner');

      if (memberError) throw memberError;

      if (!memberships || memberships.length === 0) {
        setProjects([]);
        return;
      }

      const projectIds = memberships.map(m => m.project_id);
      const permissionMap = new Map(memberships.map(m => [m.project_id, m.permission]));

      const { data: projectsData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .in('id', projectIds);

      if (projectError) throw projectError;

      const ownerIds = [...new Set((projectsData || []).map(p => p.owner_id))];

      const { data: owners, error: ownerError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', ownerIds);

      if (ownerError) throw ownerError;

      const ownerMap = new Map((owners || []).map(o => [o.id, o.name]));

      const sharedProjects: SharedProject[] = (projectsData || []).map(p => ({
        ...p,
        owner_name: ownerMap.get(p.owner_id),
        permission: permissionMap.get(p.id),
      }));

      setProjects(sharedProjects);
    } catch (error: any) {
      toast.error('Erro ao buscar projetos compartilhados: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <Sidebar onProjectCreated={fetchSharedProjects} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar bg-background">
        
        <TopHeader title="Compartilhados comigo" onOpenSidebar={() => setIsSidebarOpen(true)} />

        <div className="p-4 sm:p-8 max-w-[1400px] mx-auto w-full">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
                <Users className="text-primary" size={28} />
                Compartilhados comigo
              </h1>
              <p className="text-muted-foreground mt-1">
                Projetos que outros membros compartilharam com você.
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-[220px] bg-muted/40 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                <FolderKanban size={32} />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                Nenhum projeto compartilhado
              </h3>
              <p className="text-muted-foreground max-w-sm mb-6">
                Quando alguém compartilhar um projeto com você, ele aparecerá aqui.
              </p>
            </div>
          ) : (
            <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
              <AnimatePresence mode="popLayout">
                {projects.map((project) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2, type: "spring", bounce: 0.3 }}
                    key={project.id}
                  >
                    <SharedProjectCard project={project} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}

        </div>
      </main>
    </div>
  );
}
