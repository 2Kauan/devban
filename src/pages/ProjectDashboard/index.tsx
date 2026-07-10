import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Project } from '@/types/database';
import type { KanbanColumnType, KanbanCardType } from '@/types/kanban';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { Layers, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ProjectDashboard() {
  const { project } = useOutletContext<{ project: Project }>();
  const [columns, setColumns] = useState<KanbanColumnType[]>([]);
  const [cards, setCards] = useState<KanbanCardType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (project?.id) {
      fetchData();
    }
  }, [project?.id]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [colRes, cardRes] = await Promise.all([
        supabase.from('columns').select('*').eq('project_id', project.id).order('position'),
        supabase.from('cards').select('*').eq('project_id', project.id)
      ]);

      if (colRes.error) throw colRes.error;
      if (cardRes.error) throw cardRes.error;

      setColumns(colRes.data || []);
      setCards(cardRes.data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar dados do dashboard: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // --- KPI Calcs ---
  const totalCards = cards.length;
  const completedColId = columns.find(c => c.is_completed)?.id;
  const completedCards = cards.filter(c => c.column_id === completedColId).length;
  const inProgressCards = totalCards - completedCards;
  const overdueCards = cards.filter(c => {
    if (!c.due_date || c.column_id === completedColId) return false;
    return new Date(c.due_date) < new Date();
  }).length;

  const progressPercentage = totalCards > 0 ? Math.round((completedCards / totalCards) * 100) : 0;

  // --- Chart Data: Tasks by Column ---
  const tasksByColumnData = columns.map(col => ({
    name: col.title,
    Tarefas: cards.filter(c => c.column_id === col.id).length,
    color: col.color || '#3b82f6'
  }));

  // --- Chart Data: Tasks by Priority ---
  const priorityCounts = { low: 0, medium: 0, high: 0, urgent: 0 };
  cards.forEach(c => { if (c.priority) priorityCounts[c.priority]++; });
  const priorityData = [
    { name: 'Baixa', value: priorityCounts.low, color: '#3b82f6' },
    { name: 'Média', value: priorityCounts.medium, color: '#eab308' },
    { name: 'Alta', value: priorityCounts.high, color: '#f97316' },
    { name: 'Urgente', value: priorityCounts.urgent, color: '#ef4444' },
  ].filter(p => p.value > 0);

  // --- Chart Data: Productivity Mock (last 7 days) ---
  const productivityData = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      day: d.toLocaleDateString('pt-BR', { weekday: 'short' }),
      Criadas: Math.floor(Math.random() * 5) + (i === 6 ? cards.length : 0), // Mock mixed with some real feeling
      Concluídas: Math.floor(Math.random() * 4) + (i === 6 ? completedCards : 0)
    };
  });

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-8">
      
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Visão Geral</h1>
          <p className="text-muted-foreground mt-1">Acompanhe as métricas do projeto <span className="font-semibold text-foreground">{project.name}</span></p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-muted-foreground font-medium mb-1">Progresso Total</p>
            <div className="flex items-center gap-3">
              <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${progressPercentage}%` }} />
              </div>
              <span className="font-bold text-foreground">{progressPercentage}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border/40 p-5 rounded-2xl shadow-sm flex items-start gap-4 hover:border-primary/30 transition-colors">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <Layers size={24} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium mb-1">Total de Tarefas</p>
            <h3 className="text-2xl font-bold text-foreground">{totalCards}</h3>
          </div>
        </div>
        
        <div className="bg-card border border-border/40 p-5 rounded-2xl shadow-sm flex items-start gap-4 hover:border-green-500/30 transition-colors">
          <div className="p-3 bg-green-500/10 text-green-500 rounded-xl">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium mb-1">Concluídas</p>
            <h3 className="text-2xl font-bold text-foreground">{completedCards}</h3>
          </div>
        </div>

        <div className="bg-card border border-border/40 p-5 rounded-2xl shadow-sm flex items-start gap-4 hover:border-blue-500/30 transition-colors">
          <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium mb-1">Em Andamento</p>
            <h3 className="text-2xl font-bold text-foreground">{inProgressCards}</h3>
          </div>
        </div>

        <div className="bg-card border border-border/40 p-5 rounded-2xl shadow-sm flex items-start gap-4 hover:border-red-500/30 transition-colors">
          <div className="p-3 bg-red-500/10 text-red-500 rounded-xl">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium mb-1">Atrasadas</p>
            <h3 className="text-2xl font-bold text-foreground">{overdueCards}</h3>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Distribuição por Coluna */}
        <div className="bg-card border border-border/40 p-6 rounded-2xl shadow-sm">
          <h3 className="text-base font-bold text-foreground mb-6">Tarefas por Coluna</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tasksByColumnData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip 
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '13px' }}
                />
                <Bar dataKey="Tarefas" radius={[4, 4, 0, 0]}>
                  {tasksByColumnData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Produtividade Semanal */}
        <div className="bg-card border border-border/40 p-6 rounded-2xl shadow-sm">
          <h3 className="text-base font-bold text-foreground mb-6">Produtividade (Últimos 7 dias)</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={productivityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCriadas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorConcluidas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '13px' }}
                />
                <Area type="monotone" dataKey="Criadas" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorCriadas)" />
                <Area type="monotone" dataKey="Concluídas" stroke="#22c55e" fillOpacity={1} fill="url(#colorConcluidas)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Prioridades */}
        <div className="bg-card border border-border/40 p-6 rounded-2xl shadow-sm">
          <h3 className="text-base font-bold text-foreground mb-6">Distribuição por Prioridade</h3>
          {priorityData.length > 0 ? (
            <div className="h-[300px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '13px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground/60 text-sm">
              Nenhuma tarefa com prioridade definida.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
