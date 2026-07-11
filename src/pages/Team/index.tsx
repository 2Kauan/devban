import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Users, History } from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { ShareModal } from '@/components/ui/ShareModal';

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

interface TeamMember {
  user_id: string;
  permission: string;
  created_at: string;
  profiles: {
    name: string;
    avatar_url: string;
  };
  projects: {
    name: string;
  };
}

export default function TeamPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'activity' | 'members'>('activity');
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

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
      fetchMembers();
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

  const fetchMembers = async () => {
    try {
      const { data: memberProjectIds } = await supabase.from('project_members').select('project_id');
      const sharedProjectIds = [...new Set(memberProjectIds?.map(m => m.project_id) || [])];

      if (sharedProjectIds.length === 0 && (!selectedProjectId || selectedProjectId === 'all')) {
        setMembers([]);
        return;
      }

      let query = supabase
        .from('project_members')
        .select(`
          user_id, permission, created_at,
          profiles (name, avatar_url),
          projects (name)
        `)
        .order('created_at', { ascending: false });

      let projectsQuery = supabase
        .from('projects')
        .select(`
          id, owner_id, name, created_at,
          profiles!projects_owner_id_fkey (name, avatar_url)
        `);

      if (selectedProjectId && selectedProjectId !== 'all') {
        query = query.eq('project_id', selectedProjectId);
        projectsQuery = projectsQuery.eq('id', selectedProjectId);
      } else {
        query = query.in('project_id', sharedProjectIds);
        projectsQuery = projectsQuery.in('id', sharedProjectIds);
      }

      const [{ data: membersData, error }, { data: projectsData, error: projError }] = await Promise.all([query, projectsQuery]);
      
      if (error) throw error;
      if (projError) throw projError;

      const owners = projectsData?.map(p => ({
        user_id: p.owner_id,
        role: 'owner',
        created_at: p.created_at,
        profiles: p.profiles,
        projects: { name: p.name }
      })) || [];

      // Combine owners and invited members, then deduplicate by user_id
      const allMembers = [...owners, ...(membersData as any || [])];
      
      // Remove duplicates (e.g. if an owner is somehow in project_members)
      const uniqueMembers = Array.from(new Map(allMembers.map(m => [m.user_id, m])).values());

      // Sort by role (owner first) then created_at
      uniqueMembers.sort((a, b) => {
        if (a.role === 'owner' && b.role !== 'owner') return -1;
        if (b.role === 'owner' && a.role !== 'owner') return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setMembers(uniqueMembers);
    } catch (error) {
      console.error('Error fetching members', error);
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
            <strong className="text-foreground">{userName}</strong> criou <strong className="text-foreground">"{cardTitle}"</strong> em <span className="text-primary truncate max-w-[100px] inline-flex align-bottom">{projectName}</span>
          </span>
        );
      case 'moved_card':
        return (
          <span className="leading-tight">
            <strong className="text-foreground">{userName}</strong> moveu <strong className="text-foreground truncate max-w-[120px] inline-flex align-bottom">"{cardTitle}"</strong> para <span className="text-foreground font-medium">{log.new_value?.column_title}</span>
          </span>
        );
      default:
        return <span className="leading-tight"><strong className="text-foreground">{userName}</strong> atualizou <strong className="text-foreground">"{cardTitle}"</strong></span>;
    }
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <Sidebar projects={projects} onProjectCreated={fetchProjects} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-muted/10">
        <TopHeader title="Equipe" onOpenSidebar={() => setIsSidebarOpen(true)} />

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
            
            {projects.length > 0 && (
              <div className="py-3 mt-1 border-t border-border/30 flex items-center gap-3">
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
              <div className="max-w-3xl mx-auto">
                <div className="bg-card border border-border/60 rounded-xl p-8 text-center shadow-sm mb-6 flex flex-col items-center">
                  <h3 className="text-lg font-bold mb-2">Gerenciamento de Membros</h3>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto mb-4">
                    Selecione um projeto específico no filtro acima para convidar novos membros, ou entre diretamente no quadro Kanban e clique em Compartilhar.
                  </p>
                  {selectedProjectId !== 'all' && (
                    <button 
                      onClick={() => setIsShareModalOpen(true)}
                      className="bg-primary text-primary-foreground font-semibold px-5 py-2.5 rounded-lg hover:bg-primary-hover transition-colors shadow-sm"
                    >
                      Convidar Membro
                    </button>
                  )}
                </div>

                {members.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-lg font-bold">Nenhum membro encontrado</h3>
                    <p className="text-muted-foreground">Este projeto ainda não possui convidados.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {members.map((member, idx) => (
                      <motion.div 
                        key={`${member.user_id}-${idx}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="bg-card border border-border/60 rounded-xl p-4 shadow-sm flex items-center justify-between hover:border-border transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          {member.profiles?.avatar_url ? (
                            <img src={member.profiles.avatar_url} alt="" className="w-10 h-10 rounded-full border border-border" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold border border-primary/20">
                              {member.profiles?.name?.charAt(0) || 'U'}
                            </div>
                          )}
                          <div>
                            <h4 className="font-bold text-foreground">{member.profiles?.name || 'Usuário Desconhecido'}</h4>
                            <p className="text-xs text-muted-foreground">
                              Acesso concedido em {new Date(member.created_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                            {member.permission === 'owner' ? 'Proprietário' : member.permission === 'admin' ? 'Administrador' : member.permission === 'editor' ? 'Editor' : 'Leitor'}
                          </span>
                          <p className="text-[10px] text-muted-foreground mt-1 truncate max-w-[120px]">
                            {member.projects?.name}
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
      
      {selectedProjectId !== 'all' && (
        <ShareModal 
          isOpen={isShareModalOpen} 
          onClose={() => setIsShareModalOpen(false)} 
          project={projects.find(p => p.id === selectedProjectId)} 
          onUpdate={fetchMembers}
        />
      )}
    </div>
  );
}
