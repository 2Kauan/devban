import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { History } from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';

interface ActivityLog {
  id: string;
  action: string;
  created_at: string;
  old_value: any;
  new_value: any;
  profiles: {
    name: string;
    avatar_url: string;
  };
  cards: {
    title: string;
  };
  projects: {
    name: string;
  };
}

export default function TeamPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');

  // We need to fetch the projects the user has access to for the sidebar
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchLogs();
    }
  }, [user, selectedProjectId]);

  const fetchProjects = async () => {
    try {
      const { data: projData } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      setProjects(projData || []);
    } catch (error) {
      console.error('Error fetching projects', error);
    }
  };

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const { data: membersData } = await supabase.from('project_members').select('project_id');
      const sharedProjectIds = [...new Set(membersData?.map(m => m.project_id) || [])];

      if (sharedProjectIds.length === 0 && (!selectedProjectId || selectedProjectId === 'all')) {
        setLogs([]);
        setIsLoading(false);
        return;
      }

      let query = supabase
        .from('card_activity_logs')
        .select(`
          id, action, created_at, old_value, new_value,
          profiles (name, avatar_url),
          cards (title),
          projects (name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (selectedProjectId && selectedProjectId !== 'all') {
        query = query.eq('project_id', selectedProjectId);
      } else {
        query = query.in('project_id', sharedProjectIds);
      }

      const { data: logData, error: logError } = await query;
      if (logError) throw logError;
      
      setLogs((logData as any) || []);
    } catch (error) {
      console.error('Error fetching logs', error);
    } finally {
      setIsLoading(false);
    }
  };



  const renderActionText = (log: ActivityLog) => {
    const fullName = log.profiles?.name || 'Alguém';
    const userName = fullName.split(' ')[0]; // First name only
    const cardTitle = log.cards?.title || 'uma tarefa excluída';
    const projectName = log.projects?.name || 'projeto excluído';

    switch (log.action) {
      case 'created_card':
        return (
          <span className="leading-tight">
            <strong className="text-foreground">{userName}</strong> criou o card <strong className="text-foreground">"{cardTitle}"</strong> no projeto <span className="text-primary">"{projectName}"</span>
          </span>
        );
      case 'moved_card':
        return (
          <span className="leading-tight">
            <strong className="text-foreground">{userName}</strong> movimentou o card <strong className="text-foreground">"{cardTitle}"</strong> para a coluna <span className="text-foreground font-medium">"{log.new_value?.column_title}"</span>
          </span>
        );
      default:
        return <span className="leading-tight"><strong className="text-foreground">{userName}</strong> atualizou o card <strong className="text-foreground">"{cardTitle}"</strong></span>;
    }
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <Sidebar projects={projects} onProjectCreated={fetchProjects} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-muted/10">
        <TopHeader title="Atividades" onOpenSidebar={() => setIsSidebarOpen(true)} />

        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="border-b border-border/50 bg-background px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 font-medium text-primary">
              <History size={18} />
              Feed de Atividades
            </div>
            
            {projects.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground">Filtrar por projeto:</span>
                <select 
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="bg-background border border-border text-sm rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="all">Todos os Projetos</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto">
                {logs.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-lg font-bold">Nenhuma atividade recente</h3>
                    <p className="text-muted-foreground">Crie ou mova cartões para começar a registrar atividades.</p>
                  </div>
                ) : (
                  <div className="relative border-l-2 border-border/60 ml-4 space-y-8 pb-8">
                    {logs.map((log, idx) => (
                      <motion.div 
                        key={log.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="relative pl-6"
                      >
                        <div className="absolute -left-[17px] top-1 bg-background p-1 rounded-full border-2 border-border/60">
                          {log.profiles?.avatar_url ? (
                            <img src={log.profiles.avatar_url} alt="" className="w-6 h-6 rounded-full" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">
                              {log.profiles?.name?.charAt(0) || 'U'}
                            </div>
                          )}
                        </div>
                        <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm hover:border-border transition-colors">
                          <p className="text-sm text-muted-foreground">
                            {renderActionText(log)}
                          </p>
                          <p className="text-xs text-muted-foreground/70 mt-2 font-medium">
                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ptBR })}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
