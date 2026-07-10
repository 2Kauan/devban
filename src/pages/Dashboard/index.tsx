import { useState, useEffect } from 'react';
import { Search, Bell, Menu, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { UserProfileButton } from '@/components/ui/UserProfileButton';
import type { Project } from '@/types/database';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

export default function Dashboard() {
  const { user } = useAuth();
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
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <Sidebar projects={projects} onProjectCreated={fetchProjects} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        
        {/* Modern App Header */}
        <header className="h-14 border-b border-border/40 flex items-center justify-between px-4 sm:px-6 bg-background/50 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-4">
            <button className="md:hidden p-1.5 -ml-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/50 transition-colors" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-foreground">Dashboard</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="hidden sm:flex items-center gap-2 h-8 px-3 rounded-md bg-muted/30 border border-border/50 text-xs font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all group w-48 justify-between">
              <div className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5" />
                <span>Buscar...</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="font-mono text-[10px] bg-background border border-border/50 rounded px-1 group-hover:border-border transition-colors">⌘</kbd>
                <kbd className="font-mono text-[10px] bg-background border border-border/50 rounded px-1 group-hover:border-border transition-colors">K</kbd>
              </div>
            </button>
            <button className="relative p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors hidden sm:block">
              <Bell className="h-4 w-4" />
            </button>
            <UserProfileButton />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
          
          <div className="sm:hidden mb-6 flex items-center gap-2 w-full">
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

          {/* Quick Stats Widgets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm flex flex-col justify-between h-28">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total de Projetos</span>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-bold text-foreground">{isLoading ? '-' : projects.length}</span>
                <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">+2 este mês</span>
              </div>
            </div>
            <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm flex flex-col justify-between h-28">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tarefas Concluídas</span>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-bold text-foreground">124</span>
                <span className="text-xs text-green-500 font-medium bg-green-500/10 px-2 py-0.5 rounded-full">Na última semana</span>
              </div>
            </div>
          </div>
          {/* Global Dashboard Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Produtividade Semanal (Mock/Demonstração Global) */}
            <div className="bg-card border border-border/40 p-6 rounded-2xl shadow-sm">
              <h3 className="text-base font-bold text-foreground mb-6">Produtividade Global (Últimos 7 dias)</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart 
                    data={[...Array(7)].map((_, i) => {
                      const d = new Date(); d.setDate(d.getDate() - (6 - i));
                      return { day: d.toLocaleDateString('pt-BR', { weekday: 'short' }), Tarefas: Math.floor(Math.random() * 15) + 5 };
                    })} 
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

            {/* Projetos Ativos por Mês */}
            <div className="bg-card border border-border/40 p-6 rounded-2xl shadow-sm">
              <h3 className="text-base font-bold text-foreground mb-6">Crescimento de Projetos</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={[
                      { name: 'Jan', Projetos: 1 }, { name: 'Fev', Projetos: 2 }, { name: 'Mar', Projetos: 4 },
                      { name: 'Abr', Projetos: 3 }, { name: 'Mai', Projetos: 5 }, { name: 'Jun', Projetos: projects.length }
                    ]} 
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
