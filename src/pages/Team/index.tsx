import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Users, History } from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';
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
  const [activeTab, setActiveTab] = useState<'activity' | 'members'>('activity');
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // We need to fetch the projects the user has access to for the sidebar
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch projects for Sidebar
      const { data: projData } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      setProjects(projData || []);

      // Fetch activity logs
      // Note: RLS ensures user only sees logs for projects they have access to
      const { data: logData, error: logError } = await supabase
        .from('card_activity_logs')
        .select(`
          id, action, created_at, old_value, new_value,
          profiles (name, avatar_url),
          cards (title),
          projects (name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (logError) throw logError;
      
      // The select above returns an array where profiles, cards, and projects might be single objects
      setLogs((logData as any) || []);
    } catch (error) {
      console.error('Error fetching team data', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderActionText = (log: ActivityLog) => {
    const userName = log.profiles?.name || 'Alguém';
    const cardTitle = log.cards?.title || 'uma tarefa excluída';
    const projectName = log.projects?.name || 'um projeto excluído';

    switch (log.action) {
      case 'created_card':
        return (
          <span>
            <strong className="text-foreground">{userName}</strong> adicionou a tarefa <strong className="text-foreground">"{cardTitle}"</strong> em <span className="text-primary">{projectName}</span>
          </span>
        );
      case 'moved_card':
        return (
          <span>
            <strong className="text-foreground">{userName}</strong> moveu <strong className="text-foreground">"{cardTitle}"</strong> de <span className="text-muted-foreground">{log.old_value?.column_title}</span> para <span className="text-foreground font-medium">{log.new_value?.column_title}</span> em <span className="text-primary">{projectName}</span>
          </span>
        );
      default:
        return <span><strong className="text-foreground">{userName}</strong> atualizou <strong className="text-foreground">"{cardTitle}"</strong></span>;
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full bg-background overflow-hidden">
      <Sidebar projects={projects} onProjectCreated={fetchData} />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-muted/10">
        <header className="h-16 border-b border-border/50 flex items-center justify-between px-6 bg-background shrink-0">
          <div>
            <h1 className="text-xl font-bold">Equipe e Atividades</h1>
            <p className="text-sm text-muted-foreground">Acompanhe o que está acontecendo nos seus projetos</p>
          </div>
        </header>

        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="border-b border-border/50 bg-background px-6">
            <div className="flex gap-6">
              <button
                onClick={() => setActiveTab('activity')}
                className={`py-4 font-medium text-sm border-b-2 transition-colors ${activeTab === 'activity' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                <div className="flex items-center gap-2">
                  <History size={16} />
                  Feed de Atividades
                </div>
              </button>
              <button
                onClick={() => setActiveTab('members')}
                className={`py-4 font-medium text-sm border-b-2 transition-colors ${activeTab === 'members' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                <div className="flex items-center gap-2">
                  <Users size={16} />
                  Membros
                </div>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : activeTab === 'activity' ? (
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
            ) : (
              <div className="max-w-4xl mx-auto">
                <div className="bg-card border border-border/60 rounded-xl p-8 text-center shadow-sm">
                  <Users className="h-12 w-12 text-primary/30 mx-auto mb-4" />
                  <h3 className="text-lg font-bold mb-2">Gerenciamento de Membros</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Para convidar novas pessoas para sua equipe, entre no projeto desejado e clique em <strong>Compartilhar</strong>. Envie o link para elas entrarem na sua equipe!
                  </p>
                  <p className="text-sm text-muted-foreground/80">A listagem detalhada de permissões por usuário estará disponível em breve.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
