import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { supabase } from '@/lib/supabase';
import { Menu, BarChart3, TrendingUp, CheckSquare, Layers, Users, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { Profile } from '@/types/database';

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

type ModalType = 'projects' | 'cards' | 'activities' | 'members' | null;

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
  const [detailedActivities, setDetailedActivities] = useState<any[]>([]);
  const [detailedMembers, setDetailedMembers] = useState<Profile[]>([]);
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  useEffect(() => {
    if (user) {
      fetchReports();
    }
  }, [user]);

  const fetchReports = async () => {
    try {
      setIsLoading(true);
      // Fetch projects user owns
      const { data: ownedData } = await supabase
        .from('projects')
        .select('id, name')
        .eq('owner_id', user?.id);

      // Fetch projects user is member of
      const { data: memberData } = await supabase
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
        const { count: activitiesCount, data: recentLogs } = await supabase
          .from('card_activity_logs')
          .select('*, profiles(name, avatar_url, email), cards(title)', { count: 'exact' })
          .in('project_id', projectIds)
          .gte('created_at', thirtyDaysAgo)
          .order('created_at', { ascending: false })
          .limit(50);
          
        setDetailedActivities(recentLogs || []);
          
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

        // Fetch Detailed profiles for members
        if (memberIds.size > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('*')
            .in('id', Array.from(memberIds));
          setDetailedMembers(profilesData || []);
        } else {
          setDetailedMembers([]);
        }

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

  const statCards: { title: string; value: number; icon: any; color: string; bg: string; modalId: ModalType }[] = [
    { title: 'Projetos Ativos', value: stats.totalProjects, icon: Layers, color: 'text-blue-500', bg: 'bg-blue-500/10', modalId: 'projects' },
    { title: 'Total de Cartões', value: stats.totalCards, icon: CheckSquare, color: 'text-green-500', bg: 'bg-green-500/10', modalId: 'cards' },
    { title: 'Atividades (30 dias)', value: stats.recentActivities, icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-500/10', modalId: 'activities' },
    { title: 'Membros Envolvidos', value: stats.activeMembers, icon: Users, color: 'text-amber-500', bg: 'bg-amber-500/10', modalId: 'members' },
  ];

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <Sidebar projects={[]} onProjectCreated={fetchReports} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-muted/10">
        <TopHeader title="Relatórios" onOpenSidebar={() => setIsSidebarOpen(true)} />

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar relative">
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
                      onClick={() => setActiveModal(stat.modalId)}
                      className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
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

          {/* Interactive Modals */}
          <AnimatePresence>
            {activeModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                  onClick={() => setActiveModal(null)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="relative w-full max-w-2xl bg-card border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[85vh]"
                >
                  <div className="flex items-center justify-between p-6 border-b border-border/60 bg-muted/30">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      {activeModal === 'projects' && <><Layers className="text-blue-500" /> Projetos Ativos</>}
                      {activeModal === 'cards' && <><CheckSquare className="text-green-500" /> Distribuição de Cartões</>}
                      {activeModal === 'activities' && <><TrendingUp className="text-purple-500" /> Atividades Recentes</>}
                      {activeModal === 'members' && <><Users className="text-amber-500" /> Membros Envolvidos</>}
                    </h2>
                    <button onClick={() => setActiveModal(null)} className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors">
                      <X size={20} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    
                    {/* Projects Modal */}
                    {activeModal === 'projects' && (
                      <div className="space-y-4">
                        {projectsStats.length === 0 ? (
                          <p className="text-center text-muted-foreground">Nenhum projeto encontrado.</p>
                        ) : (
                          projectsStats.map(p => (
                            <div key={p.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50">
                              <span className="font-semibold">{p.name}</span>
                              <span className="text-sm px-3 py-1 bg-primary/10 text-primary rounded-full font-medium">{p.cardCount} cartões</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Cards Chart Modal */}
                    {activeModal === 'cards' && (
                      <div className="h-[400px] w-full">
                        {projectsStats.length === 0 ? (
                          <p className="text-center text-muted-foreground mt-20">Nenhum dado para exibir no gráfico.</p>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={projectsStats} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                              <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                              <Tooltip 
                                cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                                itemStyle={{ color: 'hsl(var(--foreground))' }}
                              />
                              <Bar dataKey="cardCount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                                {projectsStats.map((_, index) => (
                                  <Cell key={`cell-${index}`} fill={`hsl(var(--primary) / ${0.5 + (index * 0.1 % 0.5)})`} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    )}

                    {/* Activities Modal */}
                    {activeModal === 'activities' && (
                      <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border/80 before:to-transparent">
                        {detailedActivities.length === 0 ? (
                          <p className="text-center text-muted-foreground">Nenhuma atividade recente.</p>
                        ) : (
                          detailedActivities.map((log) => (
                            <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-purple-500/20 text-purple-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                                <TrendingUp size={16} />
                              </div>
                              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-border/50 bg-muted/30 shadow-sm">
                                <div className="flex items-center gap-2 mb-1">
                                  {log.profiles?.avatar_url ? (
                                    <img src={log.profiles.avatar_url} alt="" className="w-5 h-5 rounded-full" />
                                  ) : (
                                    <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">
                                      {log.profiles?.name?.charAt(0) || 'U'}
                                    </div>
                                  )}
                                  <span className="font-semibold text-sm">{log.profiles?.name || 'Usuário'}</span>
                                  <span className="text-xs text-muted-foreground ml-auto">
                                    {new Date(log.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-sm text-foreground/80">
                                  {log.action === 'moved_card' && (
                                    <>Moveu <strong>{log.cards?.title}</strong> de <span className="italic">{log.old_value?.column_title}</span> para <span className="italic">{log.new_value?.column_title}</span></>
                                  )}
                                  {log.action === 'updated_card' && (
                                    <>Atualizou o cartão <strong>{log.cards?.title}</strong></>
                                  )}
                                  {log.action === 'created_card' && (
                                    <>Criou o cartão <strong>{log.cards?.title}</strong></>
                                  )}
                                  {log.action === 'deleted_card' && (
                                    <>Apagou um cartão</>
                                  )}
                                  {log.action === 'added_member' && (
                                    <>Adicionou um membro</>
                                  )}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Members Modal */}
                    {activeModal === 'members' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {detailedMembers.length === 0 ? (
                          <p className="text-center text-muted-foreground col-span-full">Nenhum membro encontrado.</p>
                        ) : (
                          detailedMembers.map(member => (
                            <div key={member.id} className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl border border-border/50 hover:border-amber-500/30 transition-colors">
                              {member.avatar_url ? (
                                <img src={member.avatar_url} alt={member.name || ''} className="w-12 h-12 rounded-full object-cover shadow-sm" />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-600 flex items-center justify-center text-lg font-bold shadow-sm">
                                  {(member.name || member.email).charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-foreground truncate">{member.name || 'Usuário'}</h4>
                                <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
