import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Project } from '@/types/database';
import type { KanbanColumnType, KanbanCardType } from '@/types/kanban';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { Layers, CheckCircle2, Clock, AlertCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProjectDashboard() {
  const { project } = useOutletContext<{ project: Project }>();
  const [columns, setColumns] = useState<KanbanColumnType[]>([]);
  const [cards, setCards] = useState<KanbanCardType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<'total' | 'completed' | 'inProgress' | 'overdue' | null>(null);

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
  const completedColId = columns.find(c => c.is_completed)?.id;
  
  const completedCardsList = cards.filter(c => c.column_id === completedColId);
  const inProgressCardsList = cards.filter(c => c.column_id !== completedColId);
  const overdueCardsList = cards.filter(c => {
    if (!c.due_date || c.column_id === completedColId) return false;
    return new Date(c.due_date) < new Date();
  });

  const totalCards = cards.length;
  const completedCards = completedCardsList.length;
  const inProgressCards = inProgressCardsList.length;
  const overdueCards = overdueCardsList.length;

  const progressPercentage = totalCards > 0 ? Math.round((completedCards / totalCards) * 100) : 0;
  
  const getSelectedCards = () => {
    switch (selectedMetric) {
      case 'total': return cards;
      case 'completed': return completedCardsList;
      case 'inProgress': return inProgressCardsList;
      case 'overdue': return overdueCardsList;
      default: return [];
    }
  };
  
  const getSelectedMetricTitle = () => {
    switch (selectedMetric) {
      case 'total': return 'Todas as Tarefas';
      case 'completed': return 'Tarefas Concluídas';
      case 'inProgress': return 'Tarefas em Andamento';
      case 'overdue': return 'Tarefas Atrasadas';
      default: return '';
    }
  };

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

  // --- Chart Data: Productivity (last 7 days) ---
  const productivityData = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayStart = new Date(d.setHours(0,0,0,0));
    const dayEnd = new Date(d.setHours(23,59,59,999));
    
    const createdThatDay = cards.filter(c => {
      const cardDate = new Date(c.created_at);
      return cardDate >= dayStart && cardDate <= dayEnd;
    }).length;

    const completedThatDay = completedCardsList.filter(c => {
      const cardDate = new Date(c.updated_at || c.created_at);
      return cardDate >= dayStart && cardDate <= dayEnd;
    }).length;

    return {
      day: new Date(dayStart).toLocaleDateString('pt-BR', { weekday: 'short' }),
      Criadas: createdThatDay,
      Concluídas: completedThatDay
    };
  });

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-8 overflow-y-auto">
      
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Visão Geral</h1>
          <p className="text-muted-foreground mt-1">Acompanhe as métricas do projeto <span className="font-semibold text-foreground">{project.name}</span></p>
        </div>
        <div className="flex items-center md:justify-end gap-4 mt-2 md:mt-0">
          <div className="text-left md:text-right w-full">
            <p className="text-xs text-muted-foreground font-medium mb-1">Progresso Total</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 md:w-32 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${progressPercentage}%` }} />
              </div>
              <span className="font-bold text-foreground">{progressPercentage}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          onClick={() => setSelectedMetric('total')}
          className="bg-card border border-border/40 p-5 rounded-2xl shadow-sm flex items-start gap-4 hover:border-primary/30 transition-colors cursor-pointer group"
        >
          <div className="p-3 bg-primary/10 text-primary rounded-xl group-hover:scale-110 transition-transform">
            <Layers size={24} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium mb-1 group-hover:text-primary transition-colors">Total de Tarefas</p>
            <h3 className="text-2xl font-bold text-foreground">{totalCards}</h3>
          </div>
        </div>
        
        <div 
          onClick={() => setSelectedMetric('completed')}
          className="bg-card border border-border/40 p-5 rounded-2xl shadow-sm flex items-start gap-4 hover:border-green-500/30 transition-colors cursor-pointer group"
        >
          <div className="p-3 bg-green-500/10 text-green-500 rounded-xl group-hover:scale-110 transition-transform">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium mb-1 group-hover:text-green-500 transition-colors">Concluídas</p>
            <h3 className="text-2xl font-bold text-foreground">{completedCards}</h3>
          </div>
        </div>

        <div 
          onClick={() => setSelectedMetric('inProgress')}
          className="bg-card border border-border/40 p-5 rounded-2xl shadow-sm flex items-start gap-4 hover:border-blue-500/30 transition-colors cursor-pointer group"
        >
          <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl group-hover:scale-110 transition-transform">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium mb-1 group-hover:text-blue-500 transition-colors">Em Andamento</p>
            <h3 className="text-2xl font-bold text-foreground">{inProgressCards}</h3>
          </div>
        </div>

        <div 
          onClick={() => setSelectedMetric('overdue')}
          className="bg-card border border-border/40 p-5 rounded-2xl shadow-sm flex items-start gap-4 hover:border-red-500/30 transition-colors cursor-pointer group"
        >
          <div className="p-3 bg-red-500/10 text-red-500 rounded-xl group-hover:scale-110 transition-transform">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium mb-1 group-hover:text-red-500 transition-colors">Atrasadas</p>
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

      <AnimatePresence>
        {selectedMetric && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSelectedMetric(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-card w-full max-w-[600px] max-h-[80vh] rounded-2xl shadow-2xl border border-border/60 overflow-hidden relative z-10 flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-border/40">
                <h2 className="text-lg font-bold text-foreground">{getSelectedMetricTitle()}</h2>
                <button 
                  onClick={() => setSelectedMetric(null)}
                  className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-3">
                {getSelectedCards().length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma tarefa encontrada para esta categoria.
                  </div>
                ) : (
                  getSelectedCards().map(card => {
                    const column = columns.find(c => c.id === card.column_id);
                    return (
                      <div key={card.id} className="p-4 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors flex flex-col gap-2">
                        <div className="flex items-start justify-between gap-4">
                          <h4 className="font-semibold text-foreground">{card.title}</h4>
                          {column && (
                            <span className="text-[11px] font-medium px-2 py-1 rounded-md bg-background border border-border/50 whitespace-nowrap" style={{ color: column.color || 'inherit' }}>
                              {column.title}
                            </span>
                          )}
                        </div>
                        {card.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{card.description}</p>
                        )}
                        {card.due_date && (
                          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground mt-1">
                            <Clock size={12} />
                            {new Date(card.due_date).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
