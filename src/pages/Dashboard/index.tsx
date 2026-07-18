import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useProjectsQuery } from '@/hooks/useProjectsQuery';
import { useQueryClient } from '@tanstack/react-query';

export default function Dashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  const { data: projects = [], isLoading: isProjectsLoading } = useProjectsQuery();

  const projectIds = projects.map(p => p.id);

  const { data: columns = [] } = useQuery({
    queryKey: ['dashboardColumns', user?.id],
    queryFn: async () => {
      if (projectIds.length === 0) return [];
      const { data, error } = await supabase
        .from('columns')
        .select('*')
        .in('project_id', projectIds);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && projectIds.length > 0,
    staleTime: 1000 * 60 * 2,
  });

  const { data: cards = [] } = useQuery({
    queryKey: ['dashboardCards', user?.id],
    queryFn: async () => {
      if (projectIds.length === 0) return [];
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .in('project_id', projectIds);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && projectIds.length > 0,
    staleTime: 1000 * 60 * 2,
  });

  const isLoading = isProjectsLoading;

  // --- KPI Calcs ---
  const completedColumnIds = columns.filter(c => c.is_completed).map(c => c.id);
  const completedCards = cards.filter(c => completedColumnIds.includes(c.column_id));
  
  const totalCompleted = completedCards.length;

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const projectsThisMonth = projects.filter(p => {
    const d = new Date(p.created_at);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const completedThisWeek = completedCards.filter(c => new Date(c.updated_at || c.created_at) >= oneWeekAgo).length;

  // --- Chart Data: Productivity (last 7 days) ---
  const productivityData = [...Array(7)].map((_, i) => {
    const d = new Date(); 
    d.setDate(d.getDate() - (6 - i));
    const dayStart = new Date(d.setHours(0,0,0,0));
    const dayEnd = new Date(d.setHours(23,59,59,999));
    
    const completedThatDay = completedCards.filter(c => {
      const cardDate = new Date(c.updated_at || c.created_at);
      return cardDate >= dayStart && cardDate <= dayEnd;
    }).length;
    
    return { day: new Date(dayStart).toLocaleDateString('pt-BR', { weekday: 'short' }), Tarefas: completedThatDay };
  });

  // --- Chart Data: Project Growth (last 6 months cumulative) ---
  const projectGrowthData = [...Array(6)].map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const projectsUntilMonth = projects.filter(p => new Date(p.created_at) <= monthEnd).length;
    
    return { 
      name: d.toLocaleDateString('pt-BR', { month: 'short' }), 
      Projetos: projectsUntilMonth 
    };
  });

  const completedProjects = projects.filter(p => p.is_completed).length;
  const activeProjects = projects.filter(p => !p.is_completed).length;

  const handleProjectCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    queryClient.invalidateQueries({ queryKey: ['dashboardColumns'] });
    queryClient.invalidateQueries({ queryKey: ['dashboardCards'] });
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <Sidebar onProjectCreated={handleProjectCreated} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        
        <TopHeader title="Dashboard" onOpenSidebar={() => setIsSidebarOpen(true)} />

        <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
          
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Visão Geral</h1>
              <p className="text-sm text-muted-foreground mt-1">Acompanhe o progresso dos seus projetos.</p>
            </div>
            <button 
              className="hidden sm:flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded-lg text-sm font-medium hover:bg-foreground/90 transition-all shadow-sm shadow-primary/10"
              onClick={() => document.dispatchEvent(new CustomEvent('open-create-project'))}
            >
              <Plus className="h-4 w-4" />
              Criar Novo Projeto
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm flex flex-col justify-between h-28">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total de Projetos</span>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-bold text-foreground">{isLoading ? '-' : projects.length}</span>
                <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">+{projectsThisMonth} este mês</span>
              </div>
            </div>
            <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm flex flex-col justify-between h-28">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Projetos Finalizados</span>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-bold text-foreground">{isLoading ? '-' : completedProjects}</span>
                <span className="text-xs text-blue-500 font-medium bg-blue-500/10 px-2 py-0.5 rounded-full">{activeProjects} ativos</span>
              </div>
            </div>
            <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm flex flex-col justify-between h-28">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tarefas Concluídas</span>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-bold text-foreground">{isLoading ? '-' : totalCompleted}</span>
                <span className="text-xs text-green-500 font-medium bg-green-500/10 px-2 py-0.5 rounded-full">{completedThisWeek} na última semana</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <div className="bg-card border border-border/40 p-6 rounded-2xl shadow-sm">
              <h3 className="text-base font-bold text-foreground mb-6">Produtividade Global (Últimos 7 dias)</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart 
                    data={productivityData} 
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorGlobal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '13px' }} />
                    <Area type="monotone" dataKey="Tarefas" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorGlobal)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-card border border-border/40 p-6 rounded-2xl shadow-sm">
              <h3 className="text-base font-bold text-foreground mb-6">Crescimento de Projetos</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={projectGrowthData} 
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '13px' }} />
                    <Bar dataKey="Projetos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
