import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { supabase } from '@/lib/supabase';
import { Menu, BarChart3, TrendingUp, CheckSquare, Layers, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';

interface ReportStats {
  totalProjects: number;
  totalCards: number;
  cardsCompleted: number;
  activeMembers: number;
  recentActivities: number;
}

interface ProjectStat {
  id: string;
  name: string;
  cardCount: number;
}

export default function Reports() {
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<ReportStats>({
    totalProjects: 0,
    totalCards: 0,
    cardsCompleted: 0,
    activeMembers: 0,
    recentActivities: 0
  });
  const [projectsStats, setProjectsStats] = useState<ProjectStat[]>([]);

  useEffect(() => {
    if (user) {
      fetchReports();
    }
  }, [user]);

  const fetchReports = async () => {
    try {
      setIsLoading(true);
      // Fetch projects user owns
      const { data: ownedData, error: ownedError } = await supabase
        .from('projects')
        .select('id, name')
        .eq('owner_id', user?.id);

      // Fetch projects user is member of
      const { data: memberData, error: memberError } = await supabase
        .from('project_members')
        .select('projects(id, name)')
        .eq('user_id', user?.id);

      const ownedProjects = ownedData || [];
      const memberProjects = (memberData || []).map(p => p.projects).filter(Boolean) as any[];

      // Merge and deduplicate
      const allProjectsMap = new Map();
      ownedProjects.forEach(p => allProjectsMap.set(p.id, p));
      memberProjects.forEach(p => allProjectsMap.set(p.id, p));

      const projects = Array.from(allProjectsMap.values());
      const projectIds = projects.map(p => p.id);

      if (projectIds.length > 0) {
        // Fetch Columns to find the last column (highest order) for each project
        const { data: columnsData } = await supabase
          .from('columns')
          .select('id, project_id, order')
          .in('project_id', projectIds);

        const columns = columnsData || [];
        
        // Map project_id to its last column's id
        const lastColumnMap = new Map<string, string>();
        projects.forEach(p => {
          const projectColumns = columns.filter(c => c.project_id === p.id);
          if (projectColumns.length > 0) {
            const lastCol = projectColumns.reduce((prev, current) => (prev.order > current.order) ? prev : current);
            lastColumnMap.set(p.id, lastCol.id);
          }
        });

        // Fetch Cards
        const { data: cardsData } = await supabase
          .from('cards')
          .select('id, project_id, column_id')
          .in('project_id', projectIds);
          
        const cards = cardsData || [];
        
        let completedCardsCount = 0;
        cards.forEach(card => {
          const lastColId = lastColumnMap.get(card.project_id);
          if (lastColId && card.column_id === lastColId) {
            completedCardsCount++;
          }
        });
        
        // Fetch Activities
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { count: activitiesCount } = await supabase
          .from('activity_logs')
          .select('id', { count: 'exact', head: true })
          .in('project_id', projectIds)
          .gte('created_at', thirtyDaysAgo);
          
        // Fetch Members (deduplicate unique user_ids)
        const { data: membersData } = await supabase
          .from('project_members')
          .select('user_id')
          .in('project_id', projectIds);
          
        const memberIds = new Set((membersData || []).map(m => m.user_id));
        // Also add the owners of these projects to the unique member count
        const { data: ownersData } = await supabase
          .from('projects')
          .select('owner_id')
          .in('id', projectIds);
        
        (ownersData || []).forEach(o => {
          if (o.owner_id) memberIds.add(o.owner_id);
        });

        // Project Breakdown
        const pStats = projects.map(p => ({
          id: p.id,
          name: p.name,
          cardCount: cards.filter(c => c.project_id === p.id).length
        })).sort((a, b) => b.cardCount - a.cardCount);

        setProjectsStats(pStats);

        setStats({
          totalProjects: projects.length,
          totalCards: cards.length,
          cardsCompleted: completedCardsCount,
          activeMembers: memberIds.size,
          recentActivities: activitiesCount || 0
        });
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    { title: 'Projetos Ativos', value: stats.totalProjects, icon: Layers, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: 'Total de Cartões', value: stats.totalCards, icon: CheckSquare, color: 'text-green-500', bg: 'bg-green-500/10' },
    { title: 'Atividades (30 dias)', value: stats.recentActivities, icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { title: 'Membros Envolvidos', value: stats.activeMembers, icon: Users, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)] md:h-screen w-full bg-background overflow-hidden">
      <Sidebar projects={[]} onProjectCreated={fetchReports} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-muted/10">
        <header className="h-16 border-b border-border/50 flex items-center justify-between px-4 sm:px-6 bg-background shrink-0">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <div>
              <h1 className="text-xl font-bold">Relatório DevBan</h1>
              <p className="text-sm text-muted-foreground hidden sm:block">Visão geral do seu desempenho e da equipe</p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="max-w-5xl mx-auto space-y-8">
              
              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat, idx) => {
                  const Icon = stat.icon;
                  return (
                    <motion.div
                      key={stat.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg}`}>
                          <Icon className={stat.color} size={24} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">{stat.title}</p>
                          <h3 className="text-2xl font-bold text-foreground">{stat.value}</h3>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>

              {/* Projects Breakdown */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-card border border-border/60 rounded-2xl shadow-sm overflow-hidden"
              >
                <div className="p-6 border-b border-border/60 flex items-center gap-3">
                  <BarChart3 className="text-primary" size={20} />
                  <h3 className="text-lg font-bold">Cartões por Projeto</h3>
                </div>
                
                {projectsStats.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    Nenhum projeto encontrado.
                  </div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {projectsStats.map(project => (
                      <div key={project.id} className="p-4 sm:p-6 flex items-center justify-between hover:bg-muted/30 transition-colors">
                        <span className="font-semibold text-foreground">{project.name}</span>
                        <div className="flex items-center gap-2">
                          <div className="h-2 rounded-full bg-primary/20 w-32 hidden sm:block overflow-hidden">
                            <div 
                              className="h-full bg-primary" 
                              style={{ width: `${Math.min((project.cardCount / (stats.totalCards || 1)) * 100, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-bold bg-primary/10 text-primary px-3 py-1 rounded-full">
                            {project.cardCount} cartões
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>

            </div>
          )}
        </div>
      </main>
    </div>
  );
}
